require('../../config/bisweb_pathconfig.js');

const program = require('commander');
const net = require('net');
const crypto = require('crypto');
const path=require('path');
const os = require('os');
const timers = require('timers');
const util = require('bis_util');
const { StringDecoder } = require('string_decoder');
const bisgenericio=require('bis_genericio');
const glob=bisgenericio.getglobmodule();

// One time password library
const otplib = require('otplib');
const hotp = otplib.hotp;
hotp.options  = { crypto };
const secret = otplib.authenticator.generateSecret();

const bisserverutil=require('bis_fileserverutils');
const formatPacket=bisserverutil.formatPacket;
const readFrame=bisserverutil.readFrame;


// TODO:
// this extension should be used make node-like calls work on Windows
// https://github.com/prantlf/node-posix-ext

// TODO:
// Check for base directory
// Add options for multiple base directories -- treat these as drives
// Abstract Windows separator to always be "/" and rename at each end

// TODO:
// Detect free port !!!!

const fs = require('fs');
const wsutil = require('bis_wsutil');
const genericio = require('bis_genericio.js');


//'magic' string for WebSockets
//https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
const SHAstring = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';


//variables related to generating one-time passwords (OTP)
let onetimePasswordCounter = 0;


// .................................................. This is the class ........................................

const server_fields = [
    { name : 'verbose',   value: false  },
    { name : 'baseDirectoriesList', value: null },
    { name : 'readonly', value: false },
    { name : 'insecure', value: false },
    { name : 'tempDirectory', value: '' }
];

class FileServer {

    constructor(opts={}) {

        //  .................... Per Connection .......................................................
        //file transfer may occur in chunks, which requires storing the chunks as they arrive
        this.fileInProgress = null;

        let cnf={};
        if (opts.config) {
            try {
                let dat=fs.readFileSync(opts.config);
                cnf=JSON.parse(dat);
            } catch(e) {
                console.log('Error ',e);
                process.exit(0);
            }
        }

        this.opts={};
        
        for (let i=0;i<server_fields.length;i++) {
            let name=server_fields[i].name;
            this.opts[name]=server_fields[i].value;
            if (opts[name])
                this.opts[name]=opts[name];
            else if (cnf[name])
                this.opts[name]=cnf[name];
        }

        
        if (this.opts.tempDirectory.length<1) {
            if (path.sep==='\\') {
                this.opts.tempDirectory=util.filenameWindowsToUnix(os.homedir()+'/temp');
            } else if (os.platform()==='darwin' ) {
                this.opts.tempDirectory='/'+fs.readlinkSync('/tmp');
            } else {
                this.opts.tempDirectory='/tmp';
            }
        }
                
        if (!this.opts.baseDirectoriesList) {
            if (path.sep==='/')  {
                this.opts.baseDirectoriesList=[ os.homedir() ];
            } else {
                this.opts.baseDirectoriesList=[ util.filenameWindowsToUnix(os.homedir()) ];
            }
        }

        let temp=this.opts.tempDirectory.trim();
        let i=0,found=false;

        while (i<this.opts.baseDirectoriesList.length && found===false) {
            let nm=this.opts.baseDirectoriesList[i].trim();
            if (temp.trim() === nm.trim() ||
                temp.indexOf(nm)===0) {
                found=true;
            }  else {
                i=i+1;
            }
        }
        if (!found) {
            this.opts.baseDirectoriesList.push(this.opts.tempDirectory);
        }
        
        if (opts.createconfig || this.opts.verbose) {
            console.log('\n.................................');
            console.log('..... Starting configuration:\n');
            console.log(JSON.stringify(this.opts,null,4));
            console.log('\n.................................\n');
            if (opts.createconfig)
                process.exit(0);
        }
            

        

        // Former global variables
        this.portNumber=0;
        this.hostname='localhost';
        this.datatransfer=false;
        this.netServer=null;
        // Formerly global variable
        this.timeout = undefined;
        this.terminating=false;
    }
    
    // .......................................................................................
    
    // password token
    // create function and global variable
        createPassword(abbrv=0) {
        onetimePasswordCounter+=1;
        let token = hotp.generate(secret, onetimePasswordCounter);
        if (abbrv===0) {
            console.log('..... BioImage Suite Web FileServer datatransfer=',this.datatransfer,' Initialized\n.....');
            console.log('..... \t The websocket server is listening for incoming connections,\n..... \t using the following one time info.\n.....');
            console.log(`..ss. \t\t hostname: ws://${this.hostname}:${this.portNumber}`);
        }  else if (abbrv===1) {
            console.log('.....\n..... Create New Password ... try again.');
        } else {
            console.log('.....\n..... Create New Password as this one is now used successfully.');
        }
        console.log(`..ss. \t\t password: ${token}\n.....`);
    }



    
    /**
     * Creates the server instance, binds the handshake protocol to its 'connection' event, and begins listening on port 8081 (control port for the transfer).
     * Future sockets may be opened after this method has been called if the server is made to listen for the eonnection. 
     * 
     * Client and server *must* open a socket on a control port in order to communicate -- the control port will listen for commands from the server, interpret them, then serve the results.
     * Client and server may also open a transfer port in the case that the client requests to transfer data to the server. 
     * 
     * @param {String} hostname - The name of the domain that will be attempting to connect to the server, i.e. the client address. 
     * @param {Number} port - The control port for the exchanges between the client and server. 
     * @param {Boolean} datatransfer - if true this is a data transfer server
     * @returns A Promise
     */
    startServer(hostname='localhost', port=8081, datatransfer = true) {

        const self=this;
        this.netServer = net.createServer(handleConnectionRequest);
        
        return new Promise( (resolve,reject) => {

            this.netServer.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    if (self.verbose)
                        console.log(".... Port",port,"is in use");
                    port=port+1;
                    if (port<32767) {
                        this.netServer.listen(port,hostname);
                    } else {
                        reject('Can not find port');
                    }
                }
            });

            this.netServer.on('close', () => {
                if (datatransfer) {
                    console.log('._._._._._._- Stopping transfer data server on port='+this.portNumber);
                } else {
                    console.log('..... Stopping server on port='+this.portNumber);
                }
            });

        
            this.netServer.listen(port, hostname, () => {
                if (datatransfer) {
                    this.datatransfer=true;
                    this.portNumber=port;
                    console.log('._._._._._._- \tStarting transfer data server on ',port);
                } else {
                    this.datatransfer=false;
                    this.portNumber=port;
                    this.hostname=hostname;
                    this.createPassword();
                    if (this.opts.insecure) {
                        console.log(".....\t IN INSECURE MODE");
                    }
                    if (this.opts.nolocalhost) 
                        console.log(".....\t Allowing remote connections");
                    else
                        console.log(".....\t Allowing only local connections");
                    if (this.opts.readonly)
                        console.log(".....\t Running in 'read-only' mode");
                    
                    console.log('.....\t Providing access to:',this.opts.baseDirectoriesList.join(', '));
                    console.log('.....\t\t  The temp directory is set to:',this.opts.tempDirectory);
                    
                    console.log('..................................................................................');
                }
                resolve(this.portNumber);
            });
        });
            
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
                self.portNumber=port;
                socket.write(response, 'utf-8', () => {
                    if (!datatransfer) {
                        console.log('..... We are ready to respond on port='+port);
                        self.authenticate(socket);
                    } else {
                        console.log('._._._._._._- \t Data Transfer is ON: We are ready to respond',port,' datatransfer=',self.datatransfer);
                        self.prepareForDataFrames(socket);
                    }
                });    
            };
            
            socket.once('data', handshake);
            
            //server should close when all sockets are fully closed
            //note that the socket does not listen for 'end' because WebSockets do not cause those events to emit.
            socket.on('close', () => {
                self.netServer.getConnections( (err, count) => {
                    if (err) { 
                        console.log('..... Server encountered an error getting its active connections, shutting down server'); 
                        self.netServer.close();
                        return; 
                    }
                    
                    if (count === 0) {
                        if (self.terminating) {
                            console.log('..... Terminating');
                        } else  if (!self.datatransfer) {
                            console.log('.....\n..... Restarting server as connections went down to zero');
                            self.netServer.listen(self.portNumber, self.hostname);
                            self.createPassword();
                        }
                    }
                });
            });
        }
    }
    

    authenticate(socket) {

        let readOTP = (chunk) => {
            let frame = readFrame(chunk);
            let decoded = frame.decoded;
            let password = wsutil.decodeUTF8(decoded, frame.parsedControl);
            
            console.log('..... password sent by client=('+password+')');
            
            if (hotp.check(parseInt(password), secret, onetimePasswordCounter) || (insecure && password.length<1)) {
                console.log('..... \tStarting helper server');
                socket.removeListener('data', readOTP);
                
                this.prepareForControlFrames(socket);
                socket.write(formatPacket('goodauth', ''));
                this.createPassword(2);
                console.log('..... Authenticated OK\n.....');
            } else {
                console.log('..... The token you entered is incorrect.');
                this.createPassword(1);
                socket.write(formatPacket('badauth', ''));
            }
        };
        
        socket.on('data', readOTP);
        socket.write(formatPacket('authenticate', ''));
    }


    /**
     * Prepares the control socket to receive chunks of data from the client. 
     * This involves XORing the payload and decoding it to UTF-8, then performing file I/O based on the contents.
     * 
     * @param {Net.Socket} socket - Node.js net socket between the client and server for the transmission.
     */
    prepareForControlFrames(socket) {

        socket.on('error', (error) => {
            console.log('..... an error occured', error);
        });
        
        //socket listener is stored here because it gets replaced during file transfer
        socket.on('data', (chunk) => {
            let frame = readFrame(chunk);
            if (!frame) {
                console.log('..... Bad Frame',socket._sockname);
                console.log('..... Received bad frame, sending nogood');
                socket.write(formatPacket('nogood', 'badframe'));
                return;
            }
            let parsedControl = frame.parsedControl, decoded = frame.decoded;
            switch (parsedControl.opcode)
            {
                case 1:  {
                    this.handleTextRequest(decoded, parsedControl, socket);
                    break;
                }
                /*case 2:  {
                  handleFileFromClient(decoded, parsedControl, socket);
                  break;
                  }*/
                case 8: { 
                    this.handleCloseFromClient(decoded, parsedControl, socket);
                    break;
                }
            }
        });
        
    }
    
    
    /**
     * Parses a textual request from the client and serves accordingly. 
     * 
     * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
     * @param {Object} control - Parsed WebSocket header for the file request.
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place.
     */
    handleTextRequest(rawText, control, socket)  {
        let parsedText = this.parseClientJSON(rawText);
        parsedText=parsedText || -1;
        if (this.opts.verbose)
            console.log('..... text request', JSON.stringify(parsedText));
        switch (parsedText.command)
        {
            //get file list
            case 'getfilelist': {
                this.serveFileList(socket, parsedText.directory, parsedText.type,parsedText.id);
                break;
            }
            case 'readfile': {
                this.readFileAndSendToClient(parsedText, control, socket);
                break;
            }
            case 'uploadfile' : {
                console.log('._._._._._._-\n._._._._._._- beginning upload event');
                this.getFileFromClientAndSave(parsedText, control, socket);
                break;
            }
            case 'getserverbasedirectory' : {
                this.serveServerBaseDirectory(socket,parsedText.id);
                break;
            }
            
            case 'restart' : {
                console.log('..... Received restart, sending tryagain');
                socket.write(formatPacket('tryagain', ''));
                break;
            }
            
            case 'getservertempdirectory' : {
                this.serveServerTempDirectory(socket,parsedText.id);
                break;
            }
            case 'filesystemoperation' : {
                this.fileSystemOperations(socket,parsedText.operation,parsedText.url,parsedText.id);
                break;
            }

            case 'ignore':  {
                console.log('.....','Received ignore, ignoring');
                break;
            }
            
            case 'terminate': {
                console.log('..... received terminate from client');
                socket.end();
                socket.destroy();
                this.netServer.close();
                this.terminating=true;
                setTimeout( () => { process.exit(0);},500);
                break;
            }
            
            default: {
                console.log('..... Cannot interpret request with unknown command', parsedText.command);
            }
        }
    }

    // .....................................................................................................................................................................
    // .................................................. Receive File From Client ................................................................................
    // .....................................................................................................................................................................
    
    /**
     * Prepares the transfer socket to receive from the client. 
     * Client and server engage in chunked transfer, meaning that the client will send a chunk of data, the server will acknowledge, and then the client will transfer the next chunk.
     * They will exchange messages in this way until the transfer is complete, or an unrecoverable error occurs.
     * 
     * @param {Net.Socket} socket - Node.js net socket between the client and the server for transmission.
     */
    prepareForDataFrames(socket) {
        
        //server can send mangled packets during transfer that may parse as commands that shouldn't occur at that time, 
        //e.g. a mangled packet that parses to have an opcode of 8, closing the connection. so unbind the default listener and replace it after transmission.
        
        console.log('._._._._._._- \t receiving data on socket=',socket._sockname);
        const self=this;
        
        socket.on('data', (chunk) => {
            
            let controlFrame = chunk.slice(0, 14);
            let parsedControl = wsutil.parseControlFrame(controlFrame);
            //        console.log('.....','parsed control frame', parsedControl);
            
            if (!parsedControl.mask) {
                console.log('..... Received a transmission with no mask from client, dropping packet.');
                return;
            }
            
            let decoded = new Uint8Array(parsedControl.payloadLength);
            //decode the raw data (undo the XOR)
            for (let i = 0; i < parsedControl.payloadLength; i++) {
                decoded[i] = chunk[i + parsedControl.datastart] ^ parsedControl.mask[i % 4];
            }
            
            switch (parsedControl.opcode) {
            case 2:
                if (this.opts.verbose)
                    console.log('..... adding packet with control', JSON.stringify(parsedControl));
                try {
                    addToCurrentTransfer(decoded, parsedControl, socket);
                } catch(e) {
                    console.log('.....',"Addition error",e);
                }
                if (this.timeout) {
                    timers.clearTimeout(this.timeout);
                    this.timeout = null;
                }
                break;
            case 8:
                socket.end();
                socket.destroy();
                if (self.datatransfer) {
                    console.log('._._._._._._-\n._._._._._._- received close from client, ending data connection on port',self.portNumber,' data=',self.datatransfer,'\n._._._._._._-');
                    this.netServer.close();
                }  else {
                    console.log('.....\n..... received close from client, ending data connection on port',self.portNumber,' data=',self.datatransfer,'\n.....');
                }
                break;
            default: 
                console.log('..... dropping packet with control', JSON.stringify(parsedControl));
                if (!this.timeout) {
                    this.timeout = self.setSocketTimeout( () => {
                        console.log('..... timed out waiting for client');
                        socket.end();
                    });
                }
            }
        });
        
        
        let getWriteLocation=function(name,dataInProgress) {
            
            let i=0;
            while (i<self.opts.baseDirectoriesList.length) {
                if (name.indexOf(self.opts.baseDirectoriesList[i])===0) {
                    return name;
                }
                i=i+1;
            }
            
            if (name.indexOf("/")===0) {
                let f=name.lastIndexOf("/");
                name=name.substr(f+1,name.length);
            }
            
            name=path.join(self.opts.baseDirectoriesList[0],dataInProgress.name);
            return name;
        };
        
        function addToCurrentTransfer(upload, control, socket) {
            
            let dataInProgress=self.fileInProgress;

            if (self.opts.verbose)
                console.log('._._._._._._- \t\t offset=',dataInProgress.offset,'Lengths: total=',dataInProgress.data.length,
                            'piecel=',upload.length);
            
            if ( (upload.length!==dataInProgress.packetSize) &&
                 (dataInProgress.offset+upload.length!== dataInProgress.totalSize)) {
                console.log('._._._._._._-','\t bad packet size', upload.length, ' should be =', dataInProgress.packetSize, ' or ', dataInProgress.totalSize-dataInProgress.offset);
                return;
            }
            
            
            //        for (let i=0;i<upload.length;i++)
            //  dataInProgress.data[i+dataInProgress.offset]=upload[i];
            dataInProgress.data.set(upload,dataInProgress.offset);
            dataInProgress.offset+=upload.length;

            //check to see if what we've received is complete 
            if (dataInProgress.offset >= dataInProgress.totalSize) {


                let checksum=util.SHA256(new Uint8Array(dataInProgress.data));
                if (checksum!== dataInProgress.checksum) {
                    console.log('._._._._._._-','Bad Checksum', checksum, ' vs' ,dataInProgress.checksum);
                    socket.write(formatPacket('uploadfailed',`${checksum}`));
                    dataInProgress=null;
                    return;
                }
                
                if (!dataInProgress.isbinary) {
                    dataInProgress.data=genericio.binary2string(dataInProgress.data);
                }

                let writeLocation = getWriteLocation(dataInProgress.name,dataInProgress);
                if (path.sep==='\\')
                    writeLocation=util.filenameUnixToWindows(writeLocation);
                console.log('._._._._._._- \t writing to file', writeLocation,'\n._._._._._._- \t\t size=',dataInProgress.data.length,'\n._._._._._._- \t\t checksum matched=',checksum);
                
                genericio.write(writeLocation, dataInProgress.data, dataInProgress.isbinary).then( () => {
                    socket.write(formatPacket('uploadcomplete', ''), () => {
                        dataInProgress.data=null;
                        //socket.end(); //if for some reason the client doesn't send a FIN we know the socket should close here anyway.
                        console.log('._._._._._._- \t message sent -- file saved in ',writeLocation,' binary=',dataInProgress.isbinary);
                    });


                }).catch( (e) => {
                    console.log('._._._._._._- an error occured', e);
                    socket.write(formatPacket('error', e));
                    socket.destroy();
                });
            } else {
                //console.log('._._._._._._- received chunk,', dataInProgress.receivedFile.length, 'received so far.');
                try {
                    socket.write(formatPacket('nextpacket', ''));
                } catch(e) {
                    console.log('._._._._._._-','\n\n\n\n\n ._._._._._._-................................... \n\n\n\n\n Error Caught =');
                    socket.destroy();
                }
            }
        }  
    }

    
    createFileInProgress(upload) {

        this.fileInProgress = {
            'totalSize': upload.totalSize,
            'packetSize': upload.packetSize,
            'isbinary' : upload.isbinary,
            'name': upload.filename,
            'storageSize' : upload.storageSize,
            'checksum' : upload.checksum,
            'offset' : 0,
            'uploadCount' : upload.uploadCount,
        };
        this.fileInProgress.data = new Uint8Array(upload.storageSize);
        console.log('._._._._._._-\n._._._._._._- \t fileinProgress data created=',this.fileInProgress.totalSize,
                    'count=',this.fileInProgress.uploadCount,
                    'name=',upload.filename);
    }
    
    /**
     * Handles an file upload from the client and saves the file to the server machine once the transfer is complete. File transfer occurs in chunks to avoid overloading the network.
     * The first transmission will indicate the total size of the transmission and what size the packets are so the server machine will know when transfer is complete. 
     * 
     * Client transmissions are handled by prepareForDataFrames.
     * 
     * @param {Object|Uint8Array} upload - Either the first transmission initiating the transfer loop or a chunk.
     * @param {Object} control - Parsed WebSocket header for the file request. 
     * @param {Net.Socket} socket - The control socket that will negotiate the opening of the data socket and send various communications about the transfer. 
     */
    getFileFromClientAndSave(upload, control, socket) {

        if (this.opts.readonly) {
            console.log('.....','Server is in read-only mode and will not accept writes.');
            socket.write(formatPacket('uploadmessage', {
                'name' : 'serverreadonly',
                'id' : upload.id
            }));
            return;
        }

        

        //spawn a new server to handle the data transfer
        console.log('.... .... Beginning data transfer', this.portNumber+1);
        
        let tserver=new FileServer({ verbose : this.opts.verbose,
                                     readonly : false,
                                     baseDirectoriesList: this.opts.baseDirectoriesList,
                                     tempDiretory : this.opts.tempDirectory,
                                   });

        tserver.startServer(this.hostname, this.portNumber+1,true).then( (p) => {
            tserver.createFileInProgress(upload);
            let cmd={
                'name' : 'datasocketready',
                'port' : p,
                'id' : upload.id
            };
            console.log('._._._._._._- \t Sending back',JSON.stringify(cmd));
            socket.write(formatPacket('uploadmessage', cmd));
        });
    }


    // .................................................................................................................................................................
    // ............................................. Send File To Client ...............................................................................................
    // .................................................................................................................................................................

    /**
     * Takes a request from the client and returns the requested file or series of files. 
     * 
     * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
     * @param {Object} control - Parsed WebSocket header for the file request.
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     */
    readFileAndSendToClient(parsedText, control, socket) {
        let filename = parsedText.filename;
        let isbinary = parsedText.isbinary;
        let id=parsedText.id;
        
        /*let pkgformat='binary';
          if (!isbinary)
          pkgformat='text';*/

        if (path.sep==='\\')
            filename=util.filenameUnixToWindows(filename);

        if (isbinary) {
            fs.readFile(filename,  (err, d1) => {
                if (err) {
                    this.handleBadRequestFromClient(socket, err,parsedText.id);
                } else {
                    console.log('.....',`load binary file ${filename} successful, writing to socket.`);
                    let checksum=`${util.SHA256(new Uint8Array(d1))}`;
                    if (this.opts.verbose)
                        console.log('..... Sending checksum=',checksum, 'id=',id);
                    socket.write(formatPacket('checksum', {
                        'checksum' : checksum,
                        'id' : id
                    }));
                    socket.write(formatPacket('binary',d1));
                }
            });
        } else {
            //        console.log('.....','filename', filename);
            fs.readFile(filename, 'utf-8', (err, d1) => {
                if (err) {
                    this.handleBadRequestFromClient(socket, err);
                } else {
                    console.log(`..... load text file ${filename} successful, writing to socket`);
                    socket.write(formatPacket('text', { 'data' :  d1,
                                                        'id' : id}));
                }
            });
        }        
    }


    // .....................................................................................................................................................................
    //  .......... Directory and File List Operations
    // .....................................................................................................................................................................    

    /**
     * Sends the list of available files to the user, hiding files above the ~/ directory.
     * 
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {String} basedir - Directory on the server machine to display files starting from, null indicates '~/'. Writes different responses to the socket if basedir is null or not ('filelist' vs 'supplementalfiles').
     * @param {String} type - The type of modal that will be served the file list. Either 'load' or 'save'. 
     * @param {Number} id - the request id
     * @returns A file tree rooted at basedir.
     */
    serveFileList(socket, basedir, type,id=-1)  {

        const debug=this.debug;

        if (basedir) {
            let found=false,i=0;
            while(i<this.opts.baseDirectoriesList.length && !found) {
                if (basedir.indexOf(this.opts.baseDirectoriesList[i])===0) {
                    found=true;
                } else  {
                    i=i+1;
                }
            }
            if (found===false)
                basedir=this.opts.baseDirectoriesList[0];
        }
            
        let getmatchedfiles=function(basedir) {

            if (debug)
                console.log('..... Reading directory=',basedir);
            
            let pathname=basedir;
            if (path.sep==='\\') 
                pathname=util.filenameUnixToWindows(basedir);
            
            let p=path.join(pathname,'*');
            
            return new Promise( (resolve,reject) => {
                glob(p, function(er,files) {
                    if (er) 
                        reject(er);
                    resolve({
                        pathname : pathname,
                        files : files});
                });
            });
        };

        let getstats=function(fname) {

            return new Promise( (resolve,reject) => {

                fs.lstat(fname,(err,result) => {
                    if (err)
                        reject(err);

                    resolve(result);
                });
            });
        };
        
        let createTree=async function(files) {

            let treelist=[];
            for (let f=0;f<files.length;f++) {
                
                let fname=files[f];
                let basename=path.basename(fname);
                if (fname.indexOf(".")!==0 && basename.indexOf("#")!==0) {
                    
                    let treeEntry = { };
                    treeEntry.text=basename;
                    
                    //let stats=fs.lstatSync(fname);
                    let stats;
                    try{
                        stats=await getstats(fname);
                    } catch(e) {
                        return null;
                    }
                    if (!stats.isSymbolicLink()) {
                        if (stats.isDirectory()) {
                            treeEntry.type = 'directory';
                            treeEntry.size = 0;
                        } else {
                            let extension = path.parse(fname).ext;
                            switch (extension)
                            {
                                case 'gz' : {
                                    treeEntry.type = 'picture'; break;
                                }
                                default : {
                                    treeEntry.type = 'file';
                                }
                            }
                            treeEntry.size = stats["size"];
                            }
                    }
                    let f2=util.filenameWindowsToUnix(path.resolve(path.normalize(fname)));

                    if (treeEntry.type === 'directory') {
                        if (f2.lastIndexOf('/')===f2.length-1)
                            f2=f2.substr(0,f2.length-1);
                    }
                    treeEntry.path = f2;
                    treelist.push(treeEntry);
                }
            }

            return treelist;
        };

        if (basedir || this.opts.baseDirectoriesList.length<2) {

            basedir = basedir || this.opts.baseDirectoriesList[0];
            getmatchedfiles(basedir).then( (obj) => {

                let pathname=obj.pathname;
                if (path.sep==='\\')
                    pathname=util.filenameWindowsToUnix(pathname);
                
                createTree(obj.files).then( (treelist) => {
                    socket.write(formatPacket('filelist', { 'path' : pathname,'type' : type, 'data' : treelist, 'modalType' : type, 'id' : id }));
                });
            }).catch( (e) => {
                console.log('.....',e,e.stack);
            });
        } else {
            let lst=this.opts.baseDirectoriesList;
            if (path.sep==='\\') {
                lst=[];
                for (let i=0;i<this.opts.baseDirectoriesList.length;i++) {
                    lst.push(util.filenameUnixToWindows(this.opts.baseDirectoriesList[i]));
                }
            }
            
            createTree(lst).then( (treelist) => {
                socket.write(formatPacket('filelist', { 'path' : "/",'type' : type, 'data' : treelist, 'modalType' : type, 'id' : id }));
            }).catch( (e) => {
                console.log('.....',e,e.stack);
            });
        }
    }

    /**
     * Sends the default location for the client to load images from. Typically used during regression testing, when many files will be loaded without user interaction.
     *  
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place.  
     * @param {Number} id - the request id
     */
    serveServerBaseDirectory(socket,id=0)  {
        socket.write(formatPacket('serverbasedirectory', { 'path' : this.opts.baseDirectoriesList,  'id' : id }));
    }

    /**
     * Sends the default location for the client to save images to. Typically used during regression testing, when many files will be loaded without user interaction.
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {Number} id - the request id
     */
    serveServerTempDirectory(socket,id=0) {
        socket.write(formatPacket('servertempdirectory', { 'path' : this.opts.tempDirectory, 'id' : id }));
    }


    /**
     * Performs file operations (isDirectory etc.)
     * @param {String} - operation name
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {Number} id - the request id
     */
    fileSystemOperations(socket,opname,url,id=0)  {

        let prom=null;

        if (path.sep==='\\')
            url=util.filenameUnixToWindows(url);

        switch (opname)
        {
            case 'getFileSize' : {
                prom=bisgenericio.getFileSize(url);
                break;
            }
            case 'isDirectory' : {
                prom=bisgenericio.isDirectory(url);
                break;
            }
            case 'getMatchingFiles' : {
                prom=bisgenericio.getMatchingFiles(url);
                break;
            }
            case 'makeDirectory' : {
                if (!this.opts.readonly) 
                    prom=bisgenericio.makeDirectory(url);
                else
                    prom=Promise.reject('In Read Only Mode');
                break;
            }
            case 'deleteDirectory' : {
                if (!this.opts.readonly) 
                    prom=bisgenericio.deleteDirectory(url);
                else
                    prom=Promise.reject('In Read Only Mode');
                break;
            }
        }

        if (prom===null)
            return;
        
        prom.then( (m) => {
            if (opname==='getMatchingFiles' && path.sep==='\\') {
                let s=[];
                for (let i=0;i<m.length;i++)
                    s.push(util.filenameWindowsToUnix(m[i]));
                m=s;
            }
                
                
            console.log('..... File system success=',opname,url,m,'\n.....');
            socket.write(formatPacket('filesystemoperations', { 'result' : m,
                                                                'url' : url,
                                                                'operation' : opname,
                                                                'id' : id }));
        }).catch( (e) => {
            console.log('.....','File system fail',opname,url,e);
            socket.write(formatPacket('error', { 'result' : e,
                                                 'operation' : opname,
                                                 'url' : url,
                                                 'id' : id }));
        });
    }


    /**
     * Sends a message to the client describing the server error that occured during their request. 
     * 
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {String} reason - Text describing the error.
     * @param {Number} id - the request id
     */
    handleBadRequestFromClient(socket, reason,id=-1) {
        let error = "An error occured while handling your request. ";
        error = error.concat(reason);

        socket.write(formatPacket('error', { 'text' : error, 'id': id}), () => { console.log('..... request returned an error', reason, '\nsent error to client'); });
    }

    /**
     * Closes the server side of the socket gracefully. Meant to be called upon receipt of a 'connection close' packet from the client, i.e. a packet with opcode 8.
     * 
     * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
     * @param {Object} control - Parsed WebSocket header for the file request.
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     */
    handleCloseFromClient(rawText, control, socket) {
        let text = wsutil.decodeUTF8(rawText, control);
        console.log('..... received CLOSE frame from client',text);

        //TODO: send a close frame in response
        socket.end();

        console.log('..... closed connection');
    }


    // ......................... Filename Validation Code (not used) .............................................

    /**
     * Takes a path specifying a file to load on the server machine and determines whether the path is clean, i.e. specifies a file that exists, does not contain symbolic links.
     * Recursively checks every file and directory on the path.
     * 
     * @param {String} filepath - Path to check.
     */
    checkValidPath(filepath) {
        return new Promise( (resolve, reject) => {
            let pathCheck = (pathname) => {
                if (pathname === '') { resolve(); return; }

                //console.log('..... checking path', pathname);
                fs.lstat(pathname, (err, stats) => {
                    if (err) { console.log('..... err', err); reject('An error occured while statting filepath. Is there something on the path that would cause issues?'); return; }
                    if (stats.isSymbolicLink()) { reject('Symbolic link in path of file request.'); return; }

                    //look one directory up
                    let newPath = pathname.split('/');
                    newPath.splice(newPath.length - 1, 1);
                    pathCheck(newPath.join('/'));
                });
            };

            pathCheck(filepath);
        });

    }

    /**
     * Sets a function to execute after a given delay. Uses Node Timers class.
     * 
     * @param {Function} fn - Function to call at the end of the timer period. 
     * @param {Number} delay - Approximate amount of time before end of timeout period (see reference for Node Timers class).
     */
    setSocketTimeout(fn, delay = 2000) {
        let timer = timers.setTimeout(fn, delay);
        return timer;
    }



    /**
     * Parses JSON sent by the client from a raw bytestream to a JavaScript Object.
     * 
     * @param {Uint8Array} rawText - The bytestream sent by the client.
     * @returns The JSON object corresponding to the raw bytestream.
     */
    parseClientJSON(rawText) {
        let text = wsutil.decodeUTF8(rawText, rawText.length);

        let parsedText;
        try {
            parsedText = JSON.parse(text);
        } catch (e) {
            console.log('..... an error occured while parsing the data from the client', e);
        }

        return parsedText;
    }

}

// .........................................................................................................
// This is the main function
// .........................................................................................................
program
    .option('-v, --verbose', 'Whether or not to display messages written by the server')
    .option('-p, --port <n>', 'Which port to start the server on')
    .option('--readonly', 'Whether or not the server should accept requests to write files')
    .option('--insecure', 'USE WITH EXTREME CARE -- if true no password')
    .option('--verbose', ' print extra statements')
    .option('--nolocalhost', ' allow remote connections')
    .option('--tmpdir <s>', ' specify temporary directory')
    .option('--config <s>', ' read config file')
    .option('--createconfig', ' print sample config file and exit')
    .parse(process.argv);



let portno=8081;
if (program.port)
    portno=parseInt(program.port);


let readonlyflag = program.readonly ? program.readonly : false;
let insecure = program.insecure ? program.insecure : false;
let verbose = program.verbose ? program.verbose : false;
let nolocalhost = program.nolocalhost ? program.nolocalhost : false;
let config = program.config || null;
let createconfig = program.createconfig || null;
let tmpdir= program.tmpdir || null;

if (nolocalhost)
    insecure=false;

let server=new FileServer(
    {
        "verbose" : verbose,
        "insecure" : insecure,
        "readonly" : readonlyflag,
        "nolocalhost" : nolocalhost,
        "config" : config,
        "createconfig" : createconfig,
        "tempDirectory" : tmpdir,
    }
);

require('dns').lookup(require('os').hostname(), function (err, add) {

    let ipaddr='localhost';
    if (nolocalhost)
        ipaddr=`${add}`;
    console.log('..................................................................................');
    console.log('.... running on',os.platform());
    server.startServer(ipaddr, portno, false).catch( (e) => {
        console.log(e);
        process.exit(0);
    });

});




