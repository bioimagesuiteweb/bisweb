require('../config/bisweb_pathconfig.js');

const program = require('commander');
const net = require('net');
const crypto = require('crypto');
const path=require('path');
const os = require('os');
const timers = require('timers');
const { StringDecoder } = require('string_decoder');

// One time password library
const otplib = require('otplib');
const hotp = otplib.hotp;
hotp.options  = { crypto };
const secret = otplib.authenticator.generateSecret();


// TODO:
// this extension should be used make node-like calls work on Windows
// https://github.com/prantlf/node-posix-ext


const fs = require('fs');
const wsutil = require('wsutil');
const genericio = require('bis_genericio.js');
const tcpPortUsed = require('tcp-port-used');

// In Insecure Mode (if true);
const insecure=wsutil.insecure;

//'magic' string for WebSockets
//https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
const SHAstring = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

//file transfer may occur in chunks, which requires storing the chunks as they arrive
let fileInProgress = null;

//data transfer requires switching a few variables that need to be global in scope
let timeout = undefined;


//variables related to generating one-time passwords (OTP)

let onetimePasswordCounter = 0;
let globalPortNumber=-1;
let globalDataPortNumber=-2;
let globalHostname="";

//flag denoting whether the server will accept write requests 

let readOnly;
let controlSocket = null;

// password token
// create function and global variable
let createPassword=function(abbrv=0) {
    onetimePasswordCounter+=1;
    let token = hotp.generate(secret, onetimePasswordCounter);
    if (abbrv===0) {
        console.log('++++ BioImage Suite Web FileServer Initialized');
        console.log('++++ \t I am listening for incoming connections, using the following one time info.');
        console.log(`++++ \t\t hostname: ${globalHostname}:${globalPortNumber}`);
    }  else if (abbrv===1) {
        console.log('++++\n++++ Create New Password ... try again.');
    } else {
        console.log('++++\n++++ Create New Password as this one is now used successfully.');
    }
    console.log(`++++ \t\t password: ${token}\n++++`);

};


/**
 * Creates the server instance, binds the handshake protocol to its 'connection' event, and begins listening on port 8081 (control port for the transfer).
 * Future sockets may be opened after this method has been called if the server is made to listen for the eonnection. 
 * 
 * Client and server *must* open a socket on a control port in order to communicate -- the control port will listen for commands from the server, interpret them, then serve the results.
 * Client and server may also open a transfer port in the case that the client requests to transfer data to the server. 
 * 
 * @param {String} hostname - The name of the domain that will be attempting to connect to the server, i.e. the client address. 
 * @param {Number} port - The control port for the exchanges between the client and server. 
 * @param {Function} readycb - A callback to invoke when the server emits its 'listening' event. Optional.
 * @returns The server instance.  
 */
let startServer = (hostname, port, newport = true, readycb = () => {}) => {

    let newServer = net.createServer(handleConnectionRequest);
    newServer.listen(port, hostname, readycb);
    
    if (newport) {
        globalPortNumber=port;
        globalDataPortNumber=port+1;
        globalHostname=hostname;
        createPassword();
    } else {
        console.log('____ Starting transfer data server on ',port);
    }

    
    //handleConnectionRequest is called when a connection is successfuly made between the client and the server and a socket is prepared
    //it performs the WebSocket handshake (see https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#The_WebSocket_Handshake)
    //as well it attaches protocols to handle when the socket is ended or closed
    function handleConnectionRequest(socket) {
    
        //construct the handshake response
        //https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
        let response = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ";
    
        //parse websocket key out of response
        let websocketKey;
        
        let handshake = (chunk) => {
            let decodedChunk = new StringDecoder('utf-8').write(chunk);
            let headers = decodedChunk.split('\n');
    
            for (let i = 0; i < headers.length; i++) {
                headers[i] = headers[i].split(':');
            }
    
            for (let header of headers) {
                if (header[0] === 'Sec-WebSocket-Key') {
                    //remove leading space from key
                    websocketKey = header[1].slice(1, -1);
                }
            }
    
            //create Sec-WebSocket-Accept hash (see documentation)
            let shasum = crypto.createHash('sha1');
            websocketKey = websocketKey + SHAstring;
            shasum.update(websocketKey);
            let acceptKey = shasum.digest('base64');
            response = response + acceptKey + '\r\n\r\n';
    
            let port = socket.localPort;
            socket.write(response, 'utf-8', () => {
                //connectors on globalPortNumber are negotiating a control port, connectors on globalDataPortNumber are negotiating a transfer port
                console.log('We are ready to respond',port,globalPortNumber,globalDataPortNumber);
                switch (port) {
                    case globalPortNumber:
                        authenticate(socket);
                        break;
                    case globalDataPortNumber:
                        prepareForDataFrames(socket);
                        break;
                    default:
                        console.log('---- Client attempting to connect on unexpected port', socket.localPort, 'rejecting connection.');
                        return;
                } 
            });    
        };
    
        socket.once('data', handshake);

        //server should close when all sockets are fully closed
        //note that the socket does not listen for 'end' because WebSockets do not cause those events to emit.
        socket.on('close', () => {
            newServer.getConnections( (err, count) => {
                if (err) { 
                    console.log('---- Server encountered an error getting its active connections, shutting down server'); 
                    newServer.close(); 
                    return; 
                }
    
                if (count === 0) { 
                    //console.log('all connections done, shutting down server');
                    newServer.close();

                    //start the server listening for new connections if it's on the control port
                    if (port === globalPortNumber) {
                        newServer.listen(globalPortNumber, 'localhost');
                        createPassword();
                    }
                }
            });
        });
    }
};


// ------------------------------------------------------------------------------------
    
let readFrame = (chunk) => {
    let controlFrame = chunk.slice(0, 14);
    let parsedControl = wsutil.parseControlFrame(controlFrame);
    console.log('parsed control frame', parsedControl);

    //drop unmasked packets
    if (!parsedControl.mask) {
        //console.log('Received a transmission with no mask from client, dropping packet.'); 
        return;
    }

    let decoded = new Uint8Array(parsedControl.payloadLength);

    //decode the raw data (undo the XOR)
    for (let i = 0; i < parsedControl.payloadLength; i++) {
        decoded[i] = chunk[i + parsedControl.datastart] ^ parsedControl.mask[i % 4];
    }

    return { 
        'parsedControl' : parsedControl,
        'decoded' : decoded
    };
};

let authenticate = (socket) => {
    let readOTP = (chunk) => {
        let frame = readFrame(chunk);
        let decoded = frame.decoded;
        let password = wsutil.decodeUTF8(decoded, frame.parsedControl);

        console.log('---- entered password');
        console.log('---- sent by client:', password);

        if (hotp.check(parseInt(password), secret, onetimePasswordCounter) || (insecure && password.length<1)) {
            console.log('++++ Starting helper server');
            socket.removeListener('data', readOTP);

            prepareForControlFrames(socket);
            socket.write(formatPacket('goodauth', ''));
            createPassword(2);
            console.log('++++ Authenticated OK');
        } else {
            console.log('---- The token you entered is incorrect.');
            createPassword(1);
            socket.write(formatPacket('badauth', ''));
        }
    };

    socket.on('data', readOTP);
    socket.write(formatPacket('authenticate', ''));
};


/**
 * Prepares the control socket to receive chunks of data from the client. 
 * This involves XORing the payload and decoding it to UTF-8, then performing file I/O based on the contents.
 * 
 * @param {Socket} socket - Node.js net socket between the client and server for the transmission.
 */
let prepareForControlFrames = (socket) => {
    //add an error listener for the transmission
    controlSocket = socket;

    socket.on('error', (error) => {
        console.log('---- an error occured', error);
    });

    //socket listener is stored here because it gets replaced during file transfer
    socket.on('data', (chunk) => {
        let frame = readFrame(chunk);
        let parsedControl = frame.parsedControl, decoded = frame.decoded;
        switch (parsedControl.opcode)
        {
            case 1:  {
                handleTextRequest(decoded, parsedControl, socket);
                break;
            }
            case 2:  {
                handleFileFromClient(decoded, parsedControl, socket);
                break;
            }
            case 8: { 
                handleCloseFromClient(decoded, parsedControl, socket);
                break;
            }
        }
    });

};


/**
 * Parses a textual request from the client and serves accordingly. 
 * 
 * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
 * @param {Object} control - Parsed WebSocket header for the file request.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place.
 */
let handleTextRequest = (rawText, control, socket) => {
    let parsedText = parseClientJSON(rawText);
    console.log('____ text request', JSON.stringify(parsedText));
    switch (parsedText.command)
    {
        //get file list
        case 'getfilelist': {
            serveFileList(socket, parsedText.directory, parsedText.type, parsedText.depth);
            break;
        }
        case 'readfile': {
            readFileAndSendToClient(parsedText, control, socket);
            break;
        }
        case 'uploadfile' : {
            getFileFromClientAndSave(parsedText, control, socket);
            break;
        }
        default: {
            console.log('---- Cannot interpret request with unknown command', parsedText.command);
        }
    }
};

// ------------------------------------------------------------------------------------------------------------------------------------
// ----------------------------------------- Receive File From Client -----------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------

/**
 * Prepares the transfer socket to receive from the client. 
 * Client and server engage in chunked transfer, meaning that the client will send a chunk of data, the server will acknowledge, and then the client will transfer the next chunk.
 * They will exchange messages in this way until the transfer is complete, or an unrecoverable error occurs.
 * 
 * @param {Socket} socket - Node.js net socket between the client and the server for transmission.
 */
let prepareForDataFrames = (socket) => {

    //server can send mangled packets during transfer that may parse as commands that shouldn't occur at that time, 
    //e.g. a mangled packet that parses to have an opcode of 8, closing the connection. so unbind the default listener and replace it after transmission.
    socket.on('data', (chunk) => {

        let controlFrame = chunk.slice(0, 14);
        let parsedControl = wsutil.parseControlFrame(controlFrame);
        //console.log('parsed control frame', parsedControl);

        if (!parsedControl.mask) {
            console.log('---- Received a transmission with no mask from client, dropping packet.');
            return;
        }

        let decoded = new Uint8Array(parsedControl.payloadLength);
        //decode the raw data (undo the XOR)
        for (let i = 0; i < parsedControl.payloadLength; i++) {
            decoded[i] = chunk[i + parsedControl.datastart] ^ parsedControl.mask[i % 4];
        }

        switch (parsedControl.opcode) {
            case 2: 
                addToCurrentTransfer(decoded, parsedControl, socket);
                if (timeout) {
                    timers.clearTimeout(timeout);
                    timeout = null;
                }
                break;
            case 8: 
                console.log('---- received close from client, ending connection.');
                socket.end();
                break;
            default: 
                console.log('---- dropping packet with control', parsedControl);
                if (!timeout) {
                    timeout = setSocketTimeout( () => {
                        console.log('---- timed out waiting for client');
                        socket.end();
                    });
                }
        }
    });

    function addToCurrentTransfer(upload, control, socket) {

        //        console.log('upload=',upload.buffer,typeof upload);
        fileInProgress.data.set(upload,fileInProgress.offset);
        fileInProgress.offset+=upload.length;

        //check to see if what we've received is complete 
        if (fileInProgress.offset >= fileInProgress.totalSize) {
            let baseDirectory = os.homedir();

            if (!fileInProgress.isbinary) {
                fileInProgress.data=genericio.binary2string(fileInProgress.data);
            }
            //save serialized NIFTI image
            let writeLocation = path.join(baseDirectory,fileInProgress.name);
            console.log('____ writing to file', writeLocation,'size=',fileInProgress.data.length);
            
            genericio.write(writeLocation, fileInProgress.data, fileInProgress.isbinary).then( () => {
                socket.write(formatPacket('uploadcomplete', ''), () => {
                    fileInProgress.data=null;
                    console.log('____ message sent -- file saved in ',writeLocation,' binary=',fileInProgress.isbinary);
                });

                controlSocket.write(formatPacket('uploadcomplete', ''));
                socket.end(); //if for some reason the client doesn't send a FIN we know the socket should close here anyway.
            }).catch( (e) => {
                console.log('---- an error occured', e);
                socket.write(formatPacket('error', e));
                socket.end();
            });
        } else {
            //console.log('____ received chunk,', fileInProgress.receivedFile.length, 'received so far.');
            socket.write(formatPacket('nextpacket', ''));
        }
    }  
};


/**
 * Handles an file upload from the client and saves the file to the server machine once the transfer is complete. File transfer occurs in chunks to avoid overloading the network.
 * The first transmission will indicate the total size of the transmission and what size the packets are so the server machine will know when transfer is complete. 
 * 
 * Client transmissions are handled by prepareForDataFrames.
 * 
 * @param {Object|Uint8Array} upload - Either the first transmission initiating the transfer loop or a chunk.
 * @param {Object} control - Parsed WebSocket header for the file request. 
 * @param {Socket} socket - The control socket that will negotiate the opening of the data socket and send various communications about the transfer. 
 */
let getFileFromClientAndSave = (upload, control, socket) => {

    if (readOnly) {
        console.log('Server is in read-only mode and will not accept writes.');
        socket.write(formatPacket('serverreadonly', ''));
        return;
    }

    fileInProgress = {
        'totalSize': upload.totalSize,
        'packetSize': upload.packetSize,
        'isbinary' : upload.isbinary,
        'name': upload.filename,
        'storageSize' : upload.storageSize,
        'offset' : 0,
    };

    fileInProgress.data = new Uint8Array(upload.storageSize);
    console.log('fileInProgress data created=',fileInProgress.data.length,fileInProgress.data.buffer);

    //spawn a new server to handle the data transfer
    startServer('localhost', globalDataPortNumber,false, () => { socket.write(formatPacket('datasocketready', '')); });
};


// ---------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------ Send File To Client ------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------
    
/**
 * Takes a request from the client and returns the requested file or series of files. 
 * 
 * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
 * @param {Object} control - Parsed WebSocket header for the file request.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 */
let readFileAndSendToClient = (parsedText, control, socket) => {
    let filename = parsedText.filename;
    let isbinary = parsedText.isbinary;

    /*let pkgformat='binary';
    if (!isbinary)
        pkgformat='text';*/

    if (isbinary) {
        fs.readFile(filename,  (err, d1) => {
            if (err) {
                handleBadRequestFromClient(socket, err);
            } else {
                console.log(`____ load binary file ${filename} successful, writing to socket.`);
                socket.write(formatPacket('binary',d1), () => {

                });
            }
        });
    } else {
    	console.log('filename', filename);
        fs.readFile(filename, 'utf-8', (err, d1) => {
            if (err) {
                handleBadRequestFromClient(socket, err);
            } else {
                console.log(`____ load text file ${filename} successful, writing to socket.`);
                socket.write(formatPacket('text',d1), () => {

                });
            }
        });
    }        
};


// ------------------------------------------------------------------------------------------------------------------------------------
//  ---------- Directory and File List Operations
// ------------------------------------------------------------------------------------------------------------------------------------    

/**
 * Sends the list of available files to the user, hiding files above the ~/ directory.
 * 
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 * @param {String} basedir - Directory on the server machine to display files starting from, null indicates '~/'. Writes different responses to the socket if basedir is null or not ('filelist' vs 'supplementalfiles').
 * @param {String} type - The type of modal that will be served the file list. Either 'load' or 'save'. 
 * @param {Number} depth - Number of directories under basedir to expand. Optional, depth will be 2 if not specified.
 * @returns A file tree rooted at basedir.
 */
let serveFileList = (socket, basedir, type, depth = 2) => {
    let fileTree = [];
    if (basedir === null) { basedir = os.homedir(); }

    //path = full filepath
    //fileTreeIndex = the the children of the current tree entry
    //directoriesExpanded = the number of file tree entries expanded so far
    let expandDirectory = (pathname, fileTreeIndex, directoriesExpanded) => {
        return new Promise( (resolve, reject) => {
            fs.readdir(pathname, (err, files) => {
                if (err) { reject(err); }

                //remove hidden files/folders from results
                let validFiles = files.filter( (unfilteredFile) => { return unfilteredFile.charAt(0) !== '.'; });
                let expandInnerDirectory = (pathname, treeEntry) => {
                    return new Promise((resolve, reject) => {
                        //if file is a directory, expand it and add its children to fileTree recursively
                        //otherwise just add the entry and resolve
                        fs.lstat(pathname, (err, stat) => {
                            if (err) { reject(err); }

                            fileTreeIndex.push(treeEntry);

                            if (stat.isDirectory()) {
                                treeEntry.children = [];
                                treeEntry.type = 'directory';
                                
                                if (!directoriesExpanded < depth) {
                                    expandDirectory(pathname, treeEntry.children, directoriesExpanded + 1).then( () => { resolve(fileTreeIndex); });
                                } else {
                                    treeEntry.expand = true;
                                    resolve(fileTreeIndex);
                                }
                            } else {
                                //if not a directory determine the filetype 
                                //get the file extension by taking the file at the end of the pathname and looking after the last '.'
                                let extension = path.parse(pathname).ext;
                                switch (extension)
                                {
                                    case 'gz' : {
                                        treeEntry.type = 'picture'; break;
                                    }
                                    case 'html' : {
                                        treeEntry.type = 'html'; break;
                                    }
                                    case 'js' : {
                                        treeEntry.type = 'js'; break;
                                    }
                                    default : {
                                        treeEntry.type = 'file';
                                    }
                                }
                                resolve(fileTreeIndex);
                            }

                            treeEntry.path = pathname;
                        });
                    });
                };

                //expand a directory inside the current directory -- resolve promise when all contents examined.
                let promisesInsideDirectory = [];
                for (let file of validFiles) {
                    let newTreeEntry = { 'text': file };
                    let newPathname = pathname + '/' + file;
                    promisesInsideDirectory.push(expandInnerDirectory(newPathname, newTreeEntry));
                }

                Promise.all(promisesInsideDirectory).then(() => { resolve(fileTreeIndex); });
            });
        });
    };

    console.log('type', type);
    expandDirectory(basedir, fileTree, 0).then( (tree) => {

        //bisweb_fileserver handles the base file request differently than the supplemental ones, so we want to ship them to different endpoints
        if (basedir === os.homedir()) {
            socket.write(formatPacket('filelist', { 'type' : type, 'data' : tree, 'modalType' : type }));
        } else {
            socket.write(formatPacket('supplementalfiles',  { 'path' : basedir, 'list' : tree, 'modalType' : type }));
        }
    });
};



/*let serveModuleInvocationRequest = (parsedText, control, socket) => {
    let args = parsedText.params.args, modulename = parsedText.params.modulename;

    let inputName = parsedText.params.inputs[0];
    let img = new BisWebImage();
    img.load(inputName).then( () => {
        let module = modules.getModule(modulename);
        console.log('invoking module', module, 'with args', args, 'and input', data);

        console.log('img', img.getDescription());

        module.execute({ 'input' : img }, args).then( () => {
            console.log('module', module);
        });
    }).catch( (e) => { console.log('could not read image', inputName, e); })
};*/

/**
 * Sends a message to the client describing the server error that occured during their request. 
 * 
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 * @param {String} reason - Text describing the error.
 */
let handleBadRequestFromClient = (socket, reason) => {
    let error = "An error occured while handling your request. ";
    error = error.concat(reason);

    socket.write(formatPacket('error', error), () => { console.log('---- request returned an error', reason, '\nsent error to client'); });
};

/**
 * Closes the server side of the socket gracefully. Meant to be called upon receipt of a 'connection close' packet from the client, i.e. a packet with opcode 8.
 * 
 * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
 * @param {Object} control - Parsed WebSocket header for the file request.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 */
let handleCloseFromClient = (rawText, control, socket) => {
    let text = wsutil.decodeUTF8(rawText, control);
    console.log('____ received CLOSE frame from client',text);

    //TODO: send a close frame in response
    socket.end();

    controlSocket = null;
    console.log('____ closed connection');
};


/**
 * Takes a path specifying a file to load on the server machine and determines whether the path is clean, i.e. specifies a file that exists, does not contain symbolic links.
 * Recursively checks every file and directory on the path.
 * 
 * @param {String} filepath - Path to check.
 */
let checkValidPath = (filepath) => {
    return new Promise( (resolve, reject) => {
        let pathCheck = (pathname) => {
            if (pathname === '') { resolve(); return; }

            //console.log('____ checking path', pathname);
            fs.lstat(pathname, (err, stats) => {
                if (err) { console.log('---- err', err); reject('An error occured while statting filepath. Is there something on the path that would cause issues?'); return; }
                if (stats.isSymbolicLink()) { reject('Symbolic link in path of file request.'); return; }

                //look one directory up
                let newPath = pathname.split('/');
                newPath.splice(newPath.length - 1, 1);
                pathCheck(newPath.join('/'));
            });
        };

        pathCheck(filepath);
    });

};

/**
 * Sets a function to execute after a given delay. Uses Node Timers class.
 * 
 * @param {Function} fn - Function to call at the end of the timer period. 
 * @param {Number} delay - Approximate amount of time before end of timeout period (see reference for Node Timers class).
 */
let setSocketTimeout = (fn, delay = 2000) => {
    let timer = timers.setTimeout(fn, delay);
    return timer;
};


/**
 * Takes a payload and a description of the payload type and formats the packet for transmission. 
 * 
 * @param {String} payloadType - A word describing the nature of the payload.
 * @param {String|Binary} data - The payload for the packet.
 * @returns A raw bytestream that can be sent over the socket.
 */
let formatPacket = (payloadType, data) => {
    let payload, opcode;
    //transmissions are either text (JSON) or a raw image 
    if (payloadType === 'binary') {
        payload = data;
        opcode = 2;
    } else {
        payload = JSON.stringify({
            'type' : payloadType,
            'payload' : data
        });
        opcode = 1;
    }

    let controlFrame = wsutil.formatControlFrame(opcode, payload.length);
    let packetHeader = Buffer.from(controlFrame.buffer), packetBody = Buffer.from(payload);
    let packet = Buffer.concat([packetHeader, packetBody]);

    return packet;
};

/**
 * Parses JSON sent by the client from a raw bytestream to a JavaScript Object.
 * 
 * @param {Uint8Array} rawText - The bytestream sent by the client.
 * @returns The JSON object corresponding to the raw bytestream.
 */
let parseClientJSON = (rawText) => {
    let text = wsutil.decodeUTF8(rawText, rawText.length);

    let parsedText;
    try {
        parsedText = JSON.parse(text);
    } catch (e) {
        console.log('---- an error occured while parsing the data from the client', e);
    }

    return parsedText;
};

/**
 * Finds a free port on the user's computer.
 */
let findFreePort = () => {
    let base = 8081;
    checkInUse(base);

    function checkInUse(port) {
        tcpPortUsed.check(port, '127.0.0.1').then( (used) => {
            if (used) {
                base = base + 2;
                checkInUse(base);
            } else {
                return port;
            }
        });
    }
};

// ------------------------------------------------------------------------------------
// This is the main function
// ------------------------------------------------------------------------------------
program
    .option('-v, --verbose', 'Whether or not to display messages written by the server')
    .option('-p, --port <n>', 'Which port to start the server on')
    .option('--read-only', 'Whether or not the server should accept requests to write files')
    .parse(process.argv);



let portno=8081;
if (program.port)
    portno=parseInt(program.port)

readOnly = program.readOnly ? program.readOnly : false;

startServer('localhost', portno, true, () => {
    console.log('Server started ',portno)
})



