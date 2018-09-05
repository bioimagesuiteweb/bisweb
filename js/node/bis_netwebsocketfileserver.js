
const net = require('net');
const crypto = require('crypto');
const path=require('path');
const timers = require('timers');
const util = require('bis_util');
const { StringDecoder } = require('string_decoder');

const bisserverutil=require('bis_fileserverutils');
const formatPacket=bisserverutil.formatPacket;
const readFrame=bisserverutil.readFrame;


// TODO: IP Filtering
// TODO: Check Base Directories not / /usr (probably two levels)


const wsutil = require('bis_wsutil');
const genericio = require('bis_genericio.js');


//'magic' string for WebSockets
//https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
const SHAstring = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const globalInitialServerPort=wsutil.initialPort;


const BaseFileServer=require('bis_basefileserver');


// .................................................. This is the class ........................................

class BisNetWebSocketFileServer extends BaseFileServer {

    constructor(opts={}) {

        super(opts);
    }

    


    // -----------------------------------------------------------------------------------
    // Socket Wrappers
    // -----------------------------------------------------------------------------------
    
    /**
     * send JSON data
     * @param{Socket} socket - the socket to use
     * @param{String} type - either binary or the name of the package
     * @param{Object} obj - the dictionary to send
     * @returns {Promise} 
     */
    sendCommand(socket,type,obj) {

        
        return new Promise( (resolve,reject) => {
            try {
                if (obj==='utf-8') {
                    socket.write(type,'utf-8', ( (m) => { 
                        resolve(m);
                    }));
                } else {
                    socket.write(formatPacket(type, obj), ((m) => {
                        resolve(m);
                    }));
                }
            } catch(e) {
                reject(e);
            }
        });
    }
    

    /** Attach Socket Event 
     *
     * @param{Socket} socket - the socket to use
     * @param{String} eventname - the name of the event
     * @param{Function} fn - the event handler
     */
    attachSocketEvent(socket,eventname,fn) {
        console.log('..... \t\t attaching socket event='+eventname+' to '+socket.localPort);
        socket.on(eventname, fn);
    }

    /** Remove Socket Event 
     *
     * @param{Socket} socket - the socket to use
     * @param{String} eventname - the name of the event
     * @param{Function} fn - the event handler
     */
    removeSocketEvent(socket,eventname,fn) {
        socket.removeListener(eventname, fn);
    }

    /** Get Socket Info 
     * @param{Socket} socket - the socket to use
     * @return{Object} - the socket info object
     */
    getSocketInfo(socket) {
        return socket._sockname;
    }

    /** Get Socket Port 
     * @param{Socket} socket - the socket to use
     * @return{Number} - the socket port
     */
    getSocketPort(socket) {
        return socket.localPort;
    }

    /** Attach Socket Event 
     *
     * @param{Socket} socket - the socket to use
     * @param{String} eventname - the name of the event
     * @param{Function} fn - the event handler
     */
    attachSocketEventOnce(socket,eventname,fn) {
        socket.once(eventname, fn);
    }

    /** Close Socket Event
     * @param{Socket} socket - the socket to close
     * @param{Boolean} destroy - if true call socket.destroy() in addition
     */
    closeSocket(socket,destroy=false) {
        socket.end();
        if (destroy)
            socket.destroy();
    }

    
    
    // End of Socket Wrapper
    // -----------------------------------------------------------------------------------
    //
    // Begin Server Wrapper
    /** Stop Server
     * @param{Server} server - the server to stop
     */
    stopServer(server) {
        server.close();
    }

    /**  decodes text from socket
     * @param{Blob} text - the string to decode
     * @param{Number} length - the length of the string
     * @returns {String} - the decoded string
     */
    decodeUTF8(text,length) {
        return wsutil.decodeUTF8(text, length);
    }
    // --------------------------------------------------------------------------


    // End of Server Wrapper
    // -----------------------------------------------------------------------------------
    
    /**
     * Creates the server instance, binds the handshake protocol to its 'connection' event, and begins listening on port 24000 (control port for the transfer).
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
    startServer(hostname='localhost', port=globalInitialServerPort, datatransfer = true) {

        const self=this;
        this.netServer = net.createServer(handleConnectionRequest);
        
        return new Promise( (resolve,reject) => {

            this.netServer.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    if (self.verbose)
                        console.log(".... Port",port,"is in use");
                    port=port+1;
                    if (port<=wsutil.finalPort) {
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

                let port = self.getSocketPort(socket);
                self.portNumber=port;
                self.sendCommand(socket,response, 'utf-8').then( () => {
                    if (!datatransfer) {
                        console.log('..... We are ready to respond on port='+port);
                        self.authenticate(socket);
                    } else {
                        console.log('._._._._._._- \t Data Transfer is ON: We are ready to respond',port,' datatransfer=',self.datatransfer);
                        self.prepareForDataFrames(socket);
                    }
                });
            };
            
            self.attachSocketEventOnce(socket,'data', handshake);
            
            //server should close when all sockets are fully closed
            //note that the socket does not listen for 'end' because WebSockets do not cause those events to emit.
            self.attachSocketEvent(socket,'close', () => {
                self.netServer.getConnections( (err, count) => {
                    if (err) { 
                        console.log('..... Server encountered an error getting its active connections, shutting down server'); 
                        self.stopServer(self.netServer);
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

            if ( this.checkPassword(password) || (this.opts.insecure && password.length<1)) {
                //console.log('..... \tStarting helper server');
                this.removeSocketEvent(socket,'data', readOTP);
                this.prepareForControlFrames(socket);
                this.sendCommand(socket,'goodauth', '');
                this.createPassword(2);
                console.log('..... Authenticated OK\n.....');
            } else {
                console.log('..... The token you entered is incorrect.');
                this.createPassword(1);
                this.sendCommand(socket,'badauth', '');
            }
        };
        
        this.attachSocketEvent(socket,'data', readOTP);
        this.sendCommand(socket,'authenticate', '');
    }


    /**
     * Prepares the control socket to receive chunks of data from the client. 
     * This involves XORing the payload and decoding it to UTF-8, then performing file I/O based on the contents.
     * 
     * @param {Net.Socket} socket - Node.js net socket between the client and server for the transmission.
     */
    prepareForControlFrames(socket) {

        this.attachSocketEvent(socket,'error', (error) => {
            console.log('..... an error occured', error);
        });
        
        //socket listener is stored here because it gets replaced during file transfer
        this.attachSocketEvent(socket,'data', (chunk) => {
            let frame = readFrame(chunk);
            if (!frame) {
                console.log('..... Bad Frame ',this.getSocketInfo(socket));
                console.log('..... Received bad frame, sending nogood');
                this.sendCommand(socket,'nogood', 'badframe');
                return;
            }
            let parsedControl = frame.parsedControl, decoded = frame.decoded;
            switch (parsedControl.opcode)
            {
                case 1:  {
                    this.handleTextRequest(decoded, socket, parsedControl);
                    break;
                }
                case 8: { 
                    this.handleCloseFromClient(decoded, socket, parsedControl);
                    break;
                }
            }
        });
        
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
        
        console.log('._._._._._._- \t receiving data on socket=',this.getSocketInfo(socket));
        const self=this;
        
        this.attachSocketEvent(socket,'data', (chunk) => {
            
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
                    addToCurrentTransfer(decoded, socket, parsedControl);
                } catch(e) {
                    console.log('.....',"Addition error",e);
                }
                if (this.timeout) {
                    timers.clearTimeout(this.timeout);
                    this.timeout = null;
                }
                break;
            case 8:
                this.closeSocket(socket,true);

                if (self.datatransfer) {
                    console.log('._._._._._._-\n._._._._._._- received close from client, ending data connection on port',self.portNumber,' data=',self.datatransfer,'\n._._._._._._-');
                    self.stopServer(self.netServer);
                }  else {
                    console.log('.....\n..... received close from client, ending data connection on port',self.portNumber,' data=',self.datatransfer,'\n.....');
                }
                break;
            default: 
                console.log('..... dropping packet with control', JSON.stringify(parsedControl));
                if (!this.timeout) {
                    this.timeout = self.setSocketTimeout( () => {
                        console.log('..... timed out waiting for client');
                        this.closeSocket(socket,false);
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
        
        function addToCurrentTransfer(upload, socket, control) {
            
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
                    self.sendCommand(socket,'uploadfailed',`${checksum}`);
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
                    self.sendCommand(socket,'uploadcomplete', 'file saved in '+writeLocation+' (isbinary='+dataInProgress.isbinary+')').then( () => {
                        dataInProgress.data=null;
                        console.log('._._._._._._- \t message sent -- file saved in ',writeLocation,' binary=',dataInProgress.isbinary);
                    });


                }).catch( (e) => {
                    console.log('._._._._._._- an error occured', e);
                    self.sendCommand(socket,'error', e);
                    self.closeSocket(socket,true);
                });
            } else {
                //console.log('._._._._._._- received chunk,', dataInProgress.receivedFile.length, 'received so far.');
                try {
                    self.sendCommand(socket,'nextpacket', '');
                } catch(e) {
                    console.log('._._._._._._-','\n\n\n\n\n ._._._._._._-................................... \n\n\n\n\n Error Caught =');
                    self.closeSocket(socket,true);
                }
            }
        }  
    }

    
    /**
     * Handles an file upload from the client and saves the file to the server machine once the transfer is complete. File transfer occurs in chunks to avoid overloading the network.
     * The first transmission will indicate the total size of the transmission and what size the packets are so the server machine will know when transfer is complete. 
     * 
     * Client transmissions are handled by prepareForDataFrames.
     * 
     * @param {Object|Uint8Array} upload - Either the first transmission initiating the transfer loop or a chunk.
     * @param {Net.Socket} socket - The control socket that will negotiate the opening of the data socket and send various communications about the transfer. 
     * @param {Object} control - Parsed WebSocket header for the file request. 
     */
    getFileFromClientAndSave(upload, socket, control) {

        if (this.opts.readonly) {
            console.log('.....','Server is in read-only mode and will not accept writes.');
            this.sendCommand(socket,'uploadmessage', {
                'name' : 'serverreadonly',
                'id' : upload.id
            });
            return;
        }

        //spawn a new server to handle the data transfer
        console.log('.... .... Beginning data transfer', this.portNumber+1,'upload=',upload.filename);

        if (!this.validateFilename(upload.filename)) {
            this.sendCommand(socket,'uploadmessage', {
                name : 'badfilename',
                payload : 'filename '+upload.filename+' is not valid',
                id : upload.id,
            });
            return;
        }
        
        let tserver=new BisNetWebSocketFileServer({ verbose : this.opts.verbose,
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
            this.sendCommand(socket,'uploadmessage', cmd);
        });
    }
}


module.exports=BisNetWebSocketFileServer;
