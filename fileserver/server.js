require('../config/bisweb_pathconfig.js');

const $ = require('jquery');
const net = require('net');
const crypto = require('crypto');
const zlib = require('zlib');
const os = require('os');
const timers = require('timers');
const { StringDecoder } = require('string_decoder');
const otplib = require('otplib');
const hotp = otplib.hotp;
hotp.options  = { crypto };
const authenticator = otplib.authenticator;

const BisWebImage = require('bisweb_image.js');
const modules = require('moduleindex.js');

//node extension to make node-like calls work on Windows
//https://github.com/prantlf/node-posix-ext
const posixext = require('posix-ext'),
    fs = posixext.fs, process = posixext.process;

const wsutil = require('./wsutil.js');
const genericio = require('bis_genericio.js');

//'magic' string for WebSockets
//https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
const SHAstring = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

//file transfer may occur in chunks, which requires storing the chunks as they arrive
let fileInProgress = null;

//image transfer requires switching a few variables that need to be global in scope
let timeout = undefined;


//variables related to generating one-time passwords (OTP)
const secret = authenticator.generateSecret();
let hotpCounter = 0;

let loadMenuBarItems = () => {
    let menubar = document.getElementById('viewer_menubar');
    let tabContainer = $(menubar).find('.nav.navbar-nav');
    let createMenuBarTab = function (name, parent) {
        let tab = $("<li class='dropdown'>" +
            "<a href='#' class='dropdown-toggle' data-toggle='dropdown' role='button' aria-expanded='false'>" + name + "<span class='caret'></span></a>" +
            "<ul class='dropdown-menu' role='menu'>" +
            "</ul>" +
            "</li>");

        $(parent).append(tab);

        //usually want the tab so you can add items to the dropdown menu, so return that
        return tab.find('.dropdown-menu');
    };

    let createMenuBarItem = function (name, tab) {
        let item = $(`<li>  <a href="#">${name}</a> </li>`)
        tab.append(item);
        return item;
    };

    let fileTab = createMenuBarTab('Files', tabContainer);
    let fileItem = createMenuBarItem('Load Local Files', fileTab);

    fileItem.on('click', () => {
        loadLocalFiles('hello.txt');
    });


    let viewTab = createMenuBarTab('View', tabContainer);
};

let loadLocalFiles = (filename) => {
    fs.readFile(filename, 'utf-8', (err, data) => {
        console.log('file', data);
    });
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
let startServer = (hostname, port, readycb = () => {}) => {
    let newServer = net.createServer(handleConnectionRequest);
    newServer.listen(port, hostname, readycb);

    console.log('listening for incoming connections from host', hostname, 'on port', port, '...\n\n');

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
                //connectors on 8081 are negotiating a control port, connectors on 8082 are negotiating a transfer port
                switch (port) {
                    case 8081:
                        authenticate(socket);
                        break;
                    case 8082:
                        prepareForDataFrames(socket);
                        break;
                    default:
                        console.log('Client attempting to connect on unexpected port', socket.localPort, 'rejecting connection.');
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
                    console.log('Server encountered an error getting its active connections, shutting down server'); 
                    newServer.close(); 
                    return; 
                }
    
                if (count === 0) { 
                    //console.log('all connections done, shutting down server');
                    newServer.close();

                    //start the server listening for new connections if it's on the control port
                    if (port === 8081) {
                        newServer.listen(8081, 'localhost');
                        console.log('listening for new connectors on port 8081');
                    }
                }
            });
        });
    }
};

let readFrame = (chunk) => {
    let controlFrame = chunk.slice(0, 14);
    let parsedControl = wsutil.parseControlFrame(controlFrame);
    //console.log('parsed control frame', parsedControl);

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
    }
};

let authenticate = (socket) => {
    let token = hotp.generate(secret, hotpCounter);
    console.log('Your session code is', token, '\nPlease enter this code from the client.');

    let readOTP = (chunk) => {
        let frame = readFrame(chunk);
        let decoded = frame.decoded, password;
        password = wsutil.decodeUTF8(decoded, frame.parsedControl);

        hotpCounter++;
        if (hotp.check(parseInt(password), secret, hotpCounter - 1)) {
            console.log('Starting server');
            socket.removeListener('data', readOTP);

            prepareForControlFrames(socket);
            socket.write(formatPacket('goodauth', ''))
        } else {
            console.log('The token you entered is incorrect. Please enter the new token\n' + hotp.generate(secret, hotpCounter));
            socket.write(formatPacket('badauth', ''));
        }
    }

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
    socket.on('error', (error) => {
        console.log('an error occured', error);
    });

    //socket listener is stored here because it gets replaced during file transfer
    socket.on('data', (chunk) => {
        let frame = readFrame(chunk);
        let parsedControl = frame.parsedControl, decoded = frame.decoded;

        switch (parsedControl.opcode) {
            case 1: handleTextRequest(decoded, parsedControl, socket); break;
            case 2: handleImageFromClient(decoded, parsedControl, socket); break;
            case 8: handleCloseFromClient(decoded, parsedControl, socket); break;
        }
    });

};


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
            console.log('Received a transmission with no mask from client, dropping packet.');
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
                console.log('received close from client, ending connection.');
                socket.end();
                break;
            default: 
                console.log('dropping packet with control', parsedControl);
                if (!timeout) {
                    timeout = setSocketTimeout( () => {
                        console.log('timed out waiting for client');
                        socket.end();
                    });
                }
        }
    });

    function addToCurrentTransfer(upload, control, socket) {
        //add the transfer in progress to what we've received so far.
        //note that serialized NIFTI images are always transmitted byte-wise, i.e. they can be read as elements of a Uint8Array
        let newChunk = new Uint8Array(upload.length + fileInProgress.receivedFile.length);
        newChunk.set(fileInProgress.receivedFile);
        newChunk.set(upload, fileInProgress.receivedFile.length);
        fileInProgress.receivedFile = newChunk;

        //check to see if what we've received is complete 
        if (newChunk.length >= fileInProgress.totalSize) {
            let baseDirectory = os.homedir();

            //save serialized NIFTI image
            let writeLocation = baseDirectory + '/' + fileInProgress.name + '.nii.gz';
            console.log('writing to directory', writeLocation);

            genericio.write(writeLocation, fileInProgress.receivedFile, true).then( () => {
                socket.write(formatPacket('uploadcomplete', ''), () => { console.log('message sent'); });
                socket.end(); //if for some reason the client doesn't send a FIN we know the socket should close here anyway.
            }).catch( (e) => {
                console.log('an error occured', e);
                socket.write(formatPacket('error', e));
                socket.end();
            });

        } else {
            //console.log('received chunk,', fileInProgress.receivedFile.length, 'received so far.');
            socket.write(formatPacket('nextpacket', ''));
        }
    }  
}

/**
 * Parses a textual request from the client and serves accordingly. 
 * 
 * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
 * @param {Object} control - Parsed WebSocket header for the file request.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place.
 */
let handleTextRequest = (rawText, control, socket) => {
    let parsedText = parseClientJSON(rawText);
    console.log('text request', parsedText);
    switch (parsedText.command) {
        //get file list
        case 'show':
        case 'showfiles': serveFileList(socket, parsedText.directory, parsedText.type, 4); break;
        //get a file from the server
        case 'getfile':
        case 'getfiles': serveFileRequest(parsedText, control, socket); break;
        case 'uploadimage' : handleImageFromClient(parsedText, control, socket); break;
        case 'run':
        case 'runmodule': serveModuleInvocationRequest(parsedText, control, socket); break;
        default: console.log('Cannot interpret request with unknown command', parsedText.command);
    }
};

/**
 * Handles an image upload from the client and saves the file to the server machine once the transfer is complete. Image transfer occurs in chunks to avoid overloading the network.
 * The first transmission will indicate the total size of the transmission and what size the packets are so the server machine will know when transfer is complete. 
 * 
 * Client transmissions are handled by prepareForDataFrames.
 * 
 * @param {Object|Uint8Array} upload - Either the first transmission initiating the transfer loop or a chunk.
 * @param {Object} control - Parsed WebSocket header for the file request. 
 * @param {Socket} socket - The control socket that will negotiate the opening of the data socket and send various communications about the transfer. 
 */
let handleImageFromClient = (upload, control, socket) => {

    fileInProgress = {
        'totalSize': upload.totalSize,
        'packetSize': upload.packetSize,
        'name': upload.filename
    };

    fileInProgress.receivedFile = new Uint8Array(0);

    //spawn a new server to handle the data transfer
    startServer('localhost', 8082, () => { socket.write(formatPacket('datasocketready', '')); });
};

/**
 * Takes a request from the client and returns the requested file or series of files. 
 * 
 * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
 * @param {Object} control - Parsed WebSocket header for the file request.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 */
let serveFileRequest = (parsedText, control, socket) => {
    let files = parsedText.files;
    for (let file of files) {
        readFileFromDisk(file).then( (data) => {
            socket.write(formatPacket('image', data), () => { console.log('upload successful'); });
        }).catch( (error) => {
            handleBadRequestFromClient(socket, error);
        });
    }
};

/**
 * Sends the list of available files to the user, hiding files above the ~/ directory.
 * 
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 * @param {String} basedir - Directory on the server machine to display files starting from, null indicates '~/'. Writes different responses to the socket if basedir is null or not ('filelist' vs 'supplementalfiles').
 * @param {String} type - The type of modal that will be served the file list. Either 'load' or 'save'. 
 * @param {Number} depth - Number of directories under basedir to expand. Optional, depth will be infinite if not specified.
 * @returns A file tree rooted at basedir.
 */
let serveFileList = (socket, basedir, type, depth = null) => {
    let fileTree = [];
    if (basedir === null) { basedir = os.homedir(); }

    //path = full filepath
    //fileTreeIndex = the the children of the current tree entry
    //directoriesExpanded = the number of file tree entries expanded so far
    let expandDirectory = (path, fileTreeIndex, directoriesExpanded) => {
        return new Promise( (resolve, reject) => {
            fs.readdir(path, (err, files) => {
                if (err) { reject(err); }

                //remove hidden files/folders from results
                let validFiles = files.filter((unfilteredFile) => { return unfilteredFile.charAt(0) !== '.'; });

                let expandInnerDirectory = (path, treeEntry) => {
                    return new Promise((resolve, reject) => {
                        //if file is a directory, expand it and add its children to fileTree recursively
                        //otherwise just add the entry and resolve
                        fs.lstat(path, (err, stat) => {
                            if (err) { reject(err); }
                            fileTreeIndex.push(treeEntry);

                            if (stat.isDirectory()) {
                                treeEntry.children = [];
                                treeEntry.type = 'directory';

                                if (!depth || directoriesExpanded < depth) {
                                    expandDirectory(path, treeEntry.children, directoriesExpanded + 1).then( () => { resolve(fileTreeIndex); });
                                } else {
                                    treeEntry.expand = true;
                                    resolve(fileTreeIndex);
                                }
                            } else {
                                //if not a directory determine the filetype 
                                //get the file extension by taking the file at the end of the path and looking after the last '.'
                                let endFile = path.split('/');
                                let splitEndFile = endFile[endFile.length-1].split('.');
                                let filetype = splitEndFile[splitEndFile.length - 1];

                                //console.log('endFile', endFile, 'filetype', filetype);
                                switch (filetype) {
                                    case 'gz' : treeEntry.type = 'picture'; break;
                                    case 'css' : 
                                    case 'html' : treeEntry.type = 'html'; break;
                                    case 'js' : treeEntry.type = 'js'; break;
                                    case 'txt':
                                    case 'md' : treeEntry.type = 'text'; break;
                                    case 'mp4' :
                                    case 'avi' :
                                    case 'mkv' : treeEntry.type = 'video'; break;
                                    case 'mp3' :
                                    case 'flac' :
                                    case 'FLAC' :
                                    case 'wav' : 
                                    case 'WAV' : treeEntry.type = 'audio'; break;
                                    default : treeEntry.type = 'file'; 
                                }
                                resolve(fileTreeIndex);
                            }

                            treeEntry.path = path;
                        });
                    });
                };

                //expand a directory inside the current directory -- resolve promise when all contents examined.
                let promisesInsideDirectory = [];
                for (let file of validFiles) {
                    let newTreeEntry = { 'text': file };
                    let newPath = path + '/' + file;
                    promisesInsideDirectory.push(expandInnerDirectory(newPath, newTreeEntry));
                }

                Promise.all(promisesInsideDirectory).then(() => { resolve(fileTreeIndex); });
            });
        });
    };

    expandDirectory(basedir, fileTree, 0).then( (tree) => {

        //bisweb_fileserver handles the base file request differently than the supplemental ones, so we want to ship them to different endpoints
        if (basedir === os.homedir()) {
            socket.write(formatPacket('filelist', { 'type' : type, 'data' : tree }));
        } else {
            socket.write(formatPacket('supplementalfiles',  { 'path' : basedir, 'list' : tree }));
        }
    });
};

let serveModuleInvocationRequest = (parsedText, control, socket) => {
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
};

/**
 * Sends a message to the client describing the server error that occured during their request. 
 * 
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 * @param {String} reason - Text describing the error.
 */
let handleBadRequestFromClient = (socket, reason) => {
    let error = "An error occured while handling your request. "
    error = error.concat(reason);

    socket.write(formatPacket('error', error), () => { console.log('request returned an error', reason, '\nsent error to client'); });
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
    console.log('received CLOSE frame from client');

    //TODO: send a close frame in response
    socket.end();
    console.log('closed connection');
}

/**
 * Takes a path specifying a file to load on the server machine and determines whether the path is clean, i.e. specifies a file that exists, does not contain symbolic links.
 * Recursively checks every file and directory on the path.
 * 
 * @param {String} filepath - Path to check.
 */
let checkValidPath = (filepath) => {
    return new Promise( (resolve, reject) => {
        let pathCheck = (path) => {
            if (path === '') { resolve(); return; }

            //console.log('checking path', path);
            fs.lstat(path, (err, stats) => {
                if (err) { console.log('err', err); reject('An error occured while statting filepath. Is there something on the path that would cause issues?'); return; }
                if (stats.isSymbolicLink()) { reject('Symbolic link in path of file request.'); return; }

                //look one directory up
                let newPath = path.split('/');
                newPath.splice(newPath.length - 1, 1);
                pathCheck(newPath.join('/'));
            });
        }

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
 * Reads a file on the server machine's hard drive. Will not allow requests for files that either contain symbolic links or files that the owner of the server process does not have access to. 
 *
 * @param {String} file - The name of the file.
 * @returns A Promise resolving a buffer containing the data of the specified file, or rejecting with an error message.
 */
let readFileFromDisk = (file) => {
    //check whether filepath contains symlinks before trying anything with the file
    return new Promise((resolve, reject) => {
        checkValidPath(file).then(() => {

            //disallow requests for files that don't belong to the current user (owner of the current process)
            fs.lstat(file, (err, stat) => {
                let currentUser = process.getuid();
                //console.log('current user', currentUser, 'file owner', stat.uid);
                if (stat.uid !== currentUser) { reject("Cannot download a file that does not belong to the current user. Have you tried changing ownership of the requested file?"); return; }

                fs.readFile(file, (err, data) => {
                    resolve(data);
                });
            });

        }).catch((error) => {
            reject(error);
        });
    });

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
    if (payloadType !== 'image') {
        payload = JSON.stringify({
            'type' : payloadType,
            'payload' : data
        });
        opcode = 1;
    } else {
        payload = data;
        opcode = 2;
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
        console.log('an error occured while parsing the data from the client', e);
    }

    return parsedText;
};

module.exports = {
    startServer: startServer,
    loadMenuBarItems: loadMenuBarItems,
    loadLocalFiles: loadLocalFiles
}