
const net = require('net');
const crypto = require('crypto');
const path=require('path');
const timers = require('timers');
const util = require('bis_util');
const { StringDecoder } = require('string_decoder');

// TODO: IP Filtering
// TODO: Check Base Directories not / /usr (probably two levels)


const wsutil = require('bis_wsutil');
const genericio = require('bis_genericio.js');


//'magic' string for WebSockets
//https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
const SHAstring = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const globalInitialServerPort=wsutil.initialPort;


const BaseFileServer=require('bis_basefileserver');


// -----------------------------------------------------------------------------
//
// Utility Functions
//
// -----------------------------------------------------------------------------
/**
 * Takes an opcode and a payload length and makes a WebSocket control frame. 
 * @param {Number} opcode - Opcode for the data transmission (see documentation for more details)
 * @param {Number} payloadLength - Size of the payload, excluding the size of the control frame
 */
let formatControlFrame = (opcode, payloadLength) => {
    let controlFrame;
    if (payloadLength < 126) {
        controlFrame = new Uint8Array(2);
        controlFrame[1] = payloadLength;
    } else if (payloadLength < 65536) {
        controlFrame = new Uint8Array(4);
        controlFrame[1] = 126;
        controlFrame[2] = payloadLength / 256;
        controlFrame[3] = payloadLength % 256;
    } else {
        controlFrame = new Uint8Array(10);
        let remainingPayload = payloadLength;
        controlFrame[1] = 127;
        controlFrame[2] = Math.floor(remainingPayload / Math.pow(256, 7)); remainingPayload = remainingPayload - controlFrame[2] * Math.pow(256, 7);
        controlFrame[3] = Math.floor(remainingPayload / Math.pow(256, 6)); remainingPayload = remainingPayload - controlFrame[3] * Math.pow(256, 6);
        controlFrame[4] = Math.floor(remainingPayload / Math.pow(256, 5)); remainingPayload = remainingPayload - controlFrame[4] * Math.pow(256, 5);
        controlFrame[5] = Math.floor(remainingPayload / Math.pow(256, 4)); remainingPayload = remainingPayload - controlFrame[5] * Math.pow(256, 4);
        controlFrame[6] = Math.floor(remainingPayload / Math.pow(256, 3)); remainingPayload = remainingPayload - controlFrame[6] * Math.pow(256, 3);
        controlFrame[7] = Math.floor(remainingPayload / Math.pow(256, 2)); remainingPayload = remainingPayload - controlFrame[7] * Math.pow(256, 2);
        controlFrame[8] = Math.floor(remainingPayload / Math.pow(256, 1)); remainingPayload = remainingPayload - controlFrame[8] * Math.pow(256, 1);
        controlFrame[9] = remainingPayload;
    }

    //TODO: implement logic for setting fin bit
    controlFrame[0] = opcode;
    controlFrame[0] = controlFrame[0] | 0b10000000;

    return controlFrame;
};

/**
 * Takes a payload and a description of the payload type and formats the packet for transmission. 
 * 
 * @param {String} payloadType - A word describing the nature of the payload.
 * @param {String|Binary} data - The payload for the packet.
 * @returns A raw bytestream that can be sent over the socket.
 */
let formatPacket = function(payloadType, data) {
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
        //console.log('Sending payload',payload.substr(0,100));
    }
    
    let controlFrame = formatControlFrame(opcode, payload.length);
    let packetHeader = Buffer.from(controlFrame.buffer), packetBody = Buffer.from(payload);
    let packet = Buffer.concat([packetHeader, packetBody]);
    
    return packet;
};


const readFrame = function(chunk) {
        
    let controlFrame = chunk.slice(0, 14);
    let parsedControl = parseControlFrame(controlFrame);
    //    console.log('parsed control frame', parsedControl);
    
    //drop unmasked packets
    if (!parsedControl.mask) {
        //console.log('Received a transmission with no mask from client, dropping packet.'); 
        return;
    }
    
    if (parsedControl.payloadLength<0 ||
        parsedControl.payloadLength>65536) {
        //console.log('Chunk=',chunk.byteLength);
        //        console.log('ControlFrame=',controlFrame,controlFrame.byteLength);
        //        console.log('Bad payload',parsedControl.payloadLength);
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

/**
 * Parses the first 112 bits of a WebSocket dataframe, i.e. the control portion of the frame.
 * https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Exchanging_Data_frames
 * @param {Uint8Array} frame 
 * @return An dictionary of separated control frame values
 */
let parseControlFrame = (frame) => {
    let fin = frame[0] >> 7;
    let opcode = frame[0] % 16;
    let maskbit = frame[1] >> 7;
    let payload = frame[1] % 128;
    let maskkey = maskbit ? frame.slice(2, 6) : null;
    let datastart = maskbit ? 6 : 2;

    if (payload === 126) {
        payload = frame[2] * 256 + frame[3];
        maskkey = maskbit ? frame.slice(4, 8) : null;
        datastart = maskbit ? 8 : 4;
    }

    if (payload === 127) {
        payload = frame[2] * Math.pow(256, 7) + frame[3] * Math.pow(256, 6) + frame[4] * Math.pow(256, 5) + frame[5] * Math.pow(256, 4)
            + frame[6] * Math.pow(256, 3) + frame[7] * Math.pow(256, 2) + frame[8] * Math.pow(256, 1) + frame[9] * Math.pow(256, 0);
        maskkey = maskbit ? frame.slice(10, 14) : null;
        datastart = maskbit ? 14 : 10;
    }

    return {
        'fin': fin,
        'opcode': opcode,
        'maskbit': maskbit,
        'payloadLength': payload,
        'mask': maskkey,
        'datastart': datastart
    };
};


/**
 * Decodes series of raw UTF-8 characters, i.e. numbers, into something human readable.
 * 
 * @param {Uint8Array} rawText - Series of raw UTF-8 characters
 * @param {Object|Number} control - Parsed control frame (see parseControlFrame), or length of payload.
 * @return Decoded string
 */
let decodeUTF8 = (rawText, control) => {
    let payloadLength = typeof (control) === 'object' ? control.payloadLength : control;
    let text = "";
    //decode from raw UTF-8 values to characters
    for (let i = 0; i < payloadLength; i++) {
        text = text + String.fromCharCode(rawText[i]);
    }

    return text;
};


// .................................................. This is the class ........................................

class BisNetWebSocketFileServer extends BaseFileServer {

    constructor(opts={}) {

        super(opts);
        this.indent='=====';
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
        console.log(this.indent,'\t\t attaching socket event='+eventname+' to '+socket.localPort);
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
        return decodeUTF8(text, length);
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
                        console.log(this.indent," Port",port,"is in use");
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
                    console.log('.=.=.=.=.=.=. Stopping transfer data server on port='+this.portNumber);
                } else {
                    console.log(this.indent,'Stopping server on port='+this.portNumber);
                }
            });

            this.netServer.listen(port, hostname, () => {
                if (datatransfer) {
                    this.datatransfer=true;
                    this.portNumber=port;
                    console.log('.=.=.=.=.=.=. \tStarting transfer data server on ',port);
                } else {
                    this.datatransfer=false;
                    this.portNumber=port;
                    this.hostname=hostname;
                    this.createPassword();
                    if (this.opts.insecure) {
                        console.log(this.indent,"\t IN INSECURE MODE");
                    }
                    if (this.opts.nolocalhost) 
                        console.log(this.indent+"\t Allowing remote connections");
                    else
                        console.log(this.indent+"\t Allowing only local connections");
                    if (this.opts.readonly)
                        console.log(this.indent+"\t Running in 'read-only' mode");
                    
                    console.log(this.indent+'\t Providing access to:',this.opts.baseDirectoriesList.join(', '));
                    console.log(this.indent+'\t\t  The temp directory is set to:',this.opts.tempDirectory);
                    
                    console.log('============================================================================================');
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
                        console.log(self.indent+' We are ready to respond on port='+port);
                        self.authenticate(socket);
                    } else {
                        console.log('.=.=.=.=.=.=. \t Data Transfer is ON: We are ready to respond',port,' datatransfer=',self.datatransfer);
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
                        console.log(self.indent+' Server encountered an error getting its active connections, shutting down server'); 
                        self.stopServer(self.netServer);
                        return; 
                    }
                    
                    if (count === 0) {
                        if (self.terminating) {
                            console.log(self.indent+' Terminating');
                        } else  if (!self.datatransfer) {
                            console.log(self.indent+'\n'+this.indent+' Restarting server as connections went down to zero');
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
            let password = decodeUTF8(decoded, frame.parsedControl);
            
            console.log(this.indent+' password sent by client=('+password+')');

            if ( this.checkPassword(password) || (this.opts.insecure && password.length<1)) {
                //console.log(this.indent+' \tStarting helper server');
                this.removeSocketEvent(socket,'data', readOTP);
                this.prepareForControlFrames(socket);
                this.sendCommand(socket,'goodauth', '');
                this.createPassword(2);
                console.log(this.indent+' Authenticated OK\n'+this.indent);
            } else {
                console.log(this.indent+' The token you entered is incorrect.');
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
            console.log(this.indent+' an error occured', error);
        });
        
        //socket listener is stored here because it gets replaced during file transfer
        this.attachSocketEvent(socket,'data', (chunk) => {
            let frame = readFrame(chunk);
            if (!frame) {
                console.log(this.indent+' Bad Frame ',this.getSocketInfo(socket));
                console.log(this.indent+' Received bad frame, sending nogood');
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
        
        console.log('.=.=.=.=.=.=. \t receiving data on socket=',this.getSocketInfo(socket));
        const self=this;
        
        this.attachSocketEvent(socket,'data', (chunk) => {
            
            let controlFrame = chunk.slice(0, 14);
            let parsedControl = parseControlFrame(controlFrame);
            //        console.log(this.indent+'','parsed control frame', parsedControl);
            
            if (!parsedControl.mask) {
                console.log(this.indent+' Received a transmission with no mask from client, dropping packet.');
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
                    console.log(this.indent+' adding packet with control', JSON.stringify(parsedControl));
                try {
                    addToCurrentTransfer(decoded, socket, parsedControl);
                } catch(e) {
                    console.log(this.indent+'',"Addition error",e);
                }
                if (this.timeout) {
                    timers.clearTimeout(this.timeout);
                    this.timeout = null;
                }
                break;
            case 8:
                this.closeSocket(socket,true);

                if (self.datatransfer) {
                    console.log('.=.=.=.=.=.=.\n.=.=.=.=.=.=. received close from client, ending data connection on port',self.portNumber,' data=',self.datatransfer,'\n.=.=.=.=.=.=.');
                    self.stopServer(self.netServer);
                }  else {
                    console.log(this.indent+'\n'+this.indent+' received close from client, ending data connection on port',self.portNumber,' data=',self.datatransfer,'\n'+this.indent);
                }
                break;
            default: 
                console.log(this.indent+' dropping packet with control', JSON.stringify(parsedControl));
                if (!this.timeout) {
                    this.timeout = self.setSocketTimeout( () => {
                        console.log(this.indent+' timed out waiting for client');
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
        
        function addToCurrentTransfer(upload, socket) {
            
            let dataInProgress=self.fileInProgress;

            if (self.opts.verbose)
                console.log('.=.=.=.=.=.=. \t\t offset=',dataInProgress.offset,'Lengths: total=',dataInProgress.data.length,
                            'piecel=',upload.length);
            
            if ( (upload.length!==dataInProgress.packetSize) &&
                 (dataInProgress.offset+upload.length!== dataInProgress.totalSize)) {
                console.log('.=.=.=.=.=.=.','\t bad packet size', upload.length, ' should be =', dataInProgress.packetSize, ' or ', dataInProgress.totalSize-dataInProgress.offset);
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
                    console.log('.=.=.=.=.=.=.','Bad Checksum', checksum, ' vs' ,dataInProgress.checksum);
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
                console.log('.=.=.=.=.=.=. \t writing to file', writeLocation,'\n.=.=.=.=.=.=. \t\t size=',dataInProgress.data.length,'\n.=.=.=.=.=.=. \t\t checksum matched=',checksum);
                
                genericio.write(writeLocation, dataInProgress.data, dataInProgress.isbinary).then( () => {
                    self.sendCommand(socket,'uploadcomplete', 'file saved in '+writeLocation+' (isbinary='+dataInProgress.isbinary+')').then( () => {
                        dataInProgress.data=null;
                        console.log('.=.=.=.=.=.=. \t message sent -- file saved in ',writeLocation,' binary=',dataInProgress.isbinary);
                    });


                }).catch( (e) => {
                    console.log('.=.=.=.=.=.=. an error occured', e);
                    self.sendCommand(socket,'error', e);
                    self.closeSocket(socket,true);
                });
            } else {
                //console.log('.=.=.=.=.=.=. received chunk,', dataInProgress.receivedFile.length, 'received so far.');
                try {
                    self.sendCommand(socket,'nextpacket', '');
                } catch(e) {
                    console.log('.=.=.=.=.=.=.','\n\n\n\n\n .=.=.=.=.=.=.................................... \n\n\n\n\n Error Caught =');
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
     */
    getFileFromClientAndSave(upload, socket) {
        
        if (this.opts.readonly) {
            console.log(this.indent+'','Server is in read-only mode and will not accept writes.');
            this.sendCommand(socket,'uploadmessage', {
                'name' : 'serverreadonly',
                'id' : upload.id
            });
            return;
        }

        //spawn a new server to handle the data transfer
        console.log(this.indent+' '+this.indent+' Beginning data transfer', this.portNumber+1,'upload=',upload.filename);

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
            console.log('.=.=.=.=.=.=. \t Sending back',JSON.stringify(cmd));
            this.sendCommand(socket,'uploadmessage', cmd);
        });
    }
}


module.exports=BisNetWebSocketFileServer;
