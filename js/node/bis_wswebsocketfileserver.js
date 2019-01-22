const path=require('path');
const timers = require('timers');
const util = require('bis_util');
const fs = require('fs');
const WebSocket=require('ws');
const StreamingWebSocket=require('websocket-stream');
const genericio = require('bis_genericio.js');
const coregenericio = require('bis_coregenericio.js');
const wsutil = require('bis_wsutil');
const globalInitialServerPort = require('bis_wsutil').initialPort;
const BaseFileServer = require('bis_basefileserver');
const bis_filesystemutils = require('bis_filesystemutils.js');
const net = require('net'); // needed to find a free port

const portsInUse=[];
// .................................................. This is the class ........................................

class BisWSWebSocketFileServer extends BaseFileServer {

    constructor(opts={}) {
        super(opts);
        this.indent='.....';
        this.hostname = null;
        this.portNumber = null;
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

            let res=(m) => {
                resolve(m);
            };
           
            try {
                if (type!=='binary') {
                    let payload =JSON.stringify({
                        'type' : type,
                        'payload' : obj,
                    });
                    socket.send(payload, { binary : false },res);
                } else {
                    socket.send(obj, { binary: true},res);
                }
            } catch(e) {
                reject(e);
            }
        });
    }
    

    /** Attach Socket Event 
     *
     * @param {Socket} socket - the socket to use
     * @param {String} eventname - the name of the event
     * @param {Function} fn - the event handler
     */
    attachSocketEvent(socket,eventname,fn) {
        console.log(this.indent+' \t\t attaching socket event='+eventname+' to socket');
        socket.on(eventname, fn);
    }

    /** Remove Socket Event 
     *
     * @param{Socket} socket - the socket to use
     * @param{String} eventname - the name of the event
     * @param{Function} fn - the event handler
     */
    removeSocketEvent(socket,eventname,fn) {
        socket.removeEventListener(eventname, fn);
    }


    /** Close Socket Event
     * @param{Socket} socket - the socket to close
     * @param{Boolean} destroy - if true call socket.destroy() in addition
     */
    closeSocket(socket,destroy=false) {
        socket.close();
        if (destroy)
            socket.terminate();
    }

    releasePort(port) {
        let ind=portsInUse.indexOf(port);
        if (ind>=0)
            portsInUse.splice(ind);
        if (this.opts.verbose)
            console.log('----------- Closing ',port,' List=',portsInUse,'old index=',ind);
    }
    
    // End of Socket Wrapper
    // -----------------------------------------------------------------------------------
    //
    // Begin Server Wrapper
    /** Stop Server
     * @param{Server} server - the server to stop
     */
    stopServer(server) {
        this.releasePort(this.portNumber);
        server.close();
    }

    /**  decodes text from socket
     * @param{Blob} text - the string to decode
        ssocket.addEventListener('open', () => {
            ssocket.send('ready');
        });

     * @returns {String} - the decoded string
     */
    decodeUTF8(text) {
        return text;
    }

    getSocketInfo(socket) {

        try {
            return socket.Server._connectionKey;
        } catch ( e ) {
            return "()";
        }
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
    startServer(hostname='localhost', externalport=globalInitialServerPort, datatransfer = true, callback=null) {


        if (callback)
            this.callback=callback;
        
        return new Promise ( (resolve,reject) => {
            
            let internalStartServer = ( (port) => {

                while (portsInUse.indexOf(port)>=0)
                    port+=1;

                portsInUse.push(port);
                
                this.netServer = new WebSocket.Server({
                    'host' : hostname,
                    'port' : port,
                    'maxPayload' : wsutil.maxPayloadSize,
                }, () => {
                    this.portNumber=port;
                    this.attachServerEvents(hostname,port,datatransfer);
                    setTimeout( () => {
                        resolve(port);
                    },100);
                });
                
                this.netServer.on('error', () => {
                    let newport=port+1;
                    this.netServer.close();
                    this.netServer=null;
                    if (port<=wsutil.finalPort) {
                        internalStartServer(newport);
                    } else {
                        reject(this.indent+' Can not find free port');
                    }
                });
            });

            internalStartServer(externalport);
        });
    }

    // ---------------------------------------------------------------------------
    attachServerEvents(hostname,port,datatransfer=false) {
        
        this.datatransfer=datatransfer;

        const self=this;
        
        this.netServer.on('connection', (socket) => {
                        
            console.log(this.indent+' Connected WS server=',this.netServer._server._connectionKey);
            
            this.attachSocketEvent(socket,'close', () => {
                
                if (this.terminating) {
                    console.log(this.indent+' Terminating');
                } else  if (!self.datatransfer) {
                    console.log(this.indent+' \n'+this.indent+' Restarting server as connections went down to zero');
                    self.createPassword();
                }
            });
            
            if (this.datatransfer) {
                console.log(',_._._._._._ \t Data Transfer is ON: We are ready to respond',port,' datatransfer=',self.datatransfer);
                self.prepareForDataFrames(socket);
            } else {
                console.log(this.indent+' We are ready to respond on port='+port);
                setTimeout( () => {
                    self.authenticate(socket);
                },500);
            }
        });
        
        this.netServer.on('listening', () => {
            let sz=wsutil.maxPayloadSize/(1024*1024);
            let szn='maximum packet size='+sz+' MB';
            if (this.datatransfer) {

                console.log(',_._._._._._ \tStarting transfer data server on ',this.portNumber,',', szn);
            } else {
                this.portNumber=port;
                this.hostname=hostname;
                this.createPassword();
                if (this.opts.insecure) {
                    console.log(".....\t IN INSECURE MODE");
                }
                if (this.opts.nolocalhost) 
                    console.log(this.indent+"\t Allowing remote connections");
                else
                    console.log(this.indent+"\t Allowing only local connections");
                if (this.opts.readonly)
                    console.log(this.indent+"\t Running in 'read-only' mode");
                
                console.log(this.indent+'\t Providing access to:',this.opts.baseDirectoriesList.join(', '));
                console.log(this.indent+'\t\t  The temp directory is set to:',this.opts.tempDirectory);
                console.log(this.indent+'\t\t  The '+szn);
                
                console.log('................................................................................,,');
            }
        });
        
        this.netServer.on('error', (m) => {
            console.log(this.indent+' server error',m);
        });
        
    }

    // ---------------------------------------------------------------------------
    
    authenticate(socket) {

        let readOTP = (msg) => {

            let password=msg;
            console.log(this.indent+' password sent by client=('+password+')');

            if ( this.checkPassword(password) || (this.opts.insecure && password.length<1)) {
                this.prepareForControlFrames(socket);
                this.removeSocketEvent(socket,'messsage', readOTP);
                this.sendCommand(socket,'goodauth', '');
                this.createPassword(2);
                socket.removeEventListener('message',readOTP);
                console.log(this.indent+' Authenticated OK\n'+this.indent);
            } else {
                console.log(this.indent+' The token you entered is incorrect.');
                this.createPassword(1);
                this.sendCommand(socket,'badauth', '');
            }
        };


        socket.on('message',readOTP);
        this.sendCommand(socket,'authenticate', 'wss').then( () => {
            console.log(this.indent+"  authenticate message sent");
        });
    }


    /**
     * Prepares the control socket to receive chunks of data from the client. 
     * This involves XORing the payload and decoding it to UTF-8, then performing file I/O based on the contents.
     * 
     * @param {Net.Socket} socket - Node.js net socket between the client and server for the transmission.
     */
    prepareForControlFrames(socket) {

        socket.on('error', (error) => {
            console.log(this.indent+' an error occured', error);
        });
        
        //socket listener is stored here because it gets replaced during file transfer
        let handleMessage= ((message) => {
            if (!message) {
                console.log(this.indent+' Bad Frame ',this.getSocketInfo(socket));
                console.log(this.indent+' Received bad frame, sending nogood');
                this.sendCommand(socket,'nogood', 'badframe');
                return;
            }
            this.handleTextRequest(message, socket);
        });

        socket.on('message',  handleMessage);
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
        

        const self=this;
        
        let parseBinary= ( (chunk) => {
            //            console.log(',_._._._._._ \t receiving data on socket inside');
            
            let decoded = new Uint8Array(chunk);

            //if (this.opts.verbose)
            //console.log(this.indent+' adding packet with control', decoded.length);
            try {
                addToCurrentTransfer(decoded, socket);
            } catch(e) {
                console.log(self.indent+"Addition error",e);
            }
            if (this.timeout) {
                timers.clearTimeout(this.timeout);
                this.timeout = null;
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
                console.log(',_._._._._._ \t\t offset=',dataInProgress.offset,'Lengths: total=',dataInProgress.data.length,
                            'piecel=',upload.length);
            
            if ( (upload.length!==dataInProgress.packetSize) &&
                 (dataInProgress.offset+upload.length!== dataInProgress.totalSize)) {
                console.log(',_._._._._._','\t bad packet size', upload.length, ' should be =', dataInProgress.packetSize, ' or ', dataInProgress.totalSize-dataInProgress.offset);
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
                    console.log(',_._._._._._','Bad Checksum', checksum, ' vs' ,dataInProgress.checksum);
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
                console.log(',_._._._._._ \t writing to file', writeLocation,'\n,_._._._._._ \t\t size=',dataInProgress.data.length,'\n,_._._._._._ \t\t checksum matched=',checksum);

                // Writing -- old fashioned write
                let completefn= (() => {
                    self.sendCommand(socket,'uploadcomplete', 'file saved in '+writeLocation+' (isbinary='+dataInProgress.isbinary+')').then( () => {
                        dataInProgress.data=null;
                        console.log(',_._._._._._ \t message sent -- file saved in ',writeLocation,' binary=',dataInProgress.isbinary);
                    });
                });

                let errorfn= ( (e) => {
                    console.log(',_._._._._._ an error occured', e);
                    self.sendCommand(socket,'error', e);
                    self.closeSocket(socket,true);

                });
                
                if (dataInProgress.isbinary) {
                    coregenericio.writebinarydatanode(writeLocation,dataInProgress.data,completefn,errorfn,true);
                } else {
                    coregenericio.writetextdatanode(writeLocation,dataInProgress.data,completefn,errorfn);
                }
                return;
            } else {
                //console.log(',_._._._._._ received chunk,', dataInProgress.receivedFile.length, 'received so far.');
                try {
                    //console.log('Sending next packet');
                    self.sendCommand(socket,'nextpacket', '');
                } catch(e) {
                    console.log(',_._._._._._','\n\n\n\n\n ,_._._._._._................................... \n\n\n\n\n Error Caught =');
                    self.closeSocket(socket,true);
                }
            }
        }

        
        socket.on('close', () => {
            console.log(self.indent+' closing data transfer server\n'+this.indent+' ');
            self.stopServer(self.netServer,);
        });

        console.log(',_._._._._._ \t receiving data on socket',this.getSocketInfo(socket),socket.protocol);
        socket.on('message',parseBinary);

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
            console.log(this.indent+' Server is in read-only mode and will not accept writes.');
            this.sendCommand(socket,'uploadmessage', {
                'name' : 'serverreadonly',
                'id' : upload.id
            });
            return;
        }

        //spawn a new server to handle the data transfer
        console.log('.... \tBeginning data transfer', this.portNumber+1,'upload=',upload.filename);

        if (!bis_filesystemutils.validateFilename(upload.filename)) {
            this.sendCommand(socket,'uploadmessage', {
                name : 'badfilename',
                payload : 'filename '+upload.filename+' is not valid',
                id : upload.id,
            });
            return;
        }
        
        let tserver=new BisWSWebSocketFileServer({ 'verbose' : this.opts.verbose,
                                                   'readonly' : false,
                                                   'baseDirectoriesList': this.opts.baseDirectoriesList,
                                                   'tempDiretory' : this.opts.tempDirectory,
                                                 });
        tserver.startServer(this.hostname, this.portNumber+1,true).then( (p) => {

            tserver.createFileInProgress(upload);
            let cmd={
                'name' : 'datasocketready',
                'port' : p,
                'id' : upload.id
            };
            console.log(',_._._._._._ \t Sending back',JSON.stringify(cmd),tserver.portNumber);
            this.sendCommand(socket,'uploadmessage', cmd);
        });
    }

    /**
     * Creates a stream between the client and server in order to transfer large files. Spins up a new file server on a different port to handle the transfer.
     * @param {Number} id - the request id
     * @param {WebSocket} socket - The control socket already negotiated between the client and the server.
     * @param {String} filename - The full path of the file to stream to the client.
     */
    streamFileToClient(id,socket, filename) {

        return new Promise( (resolve, reject) => {
            //find a free port and create the streaming server
            this.findFreePort(this.portNumber+5).then( (port) => {

                let connected = false;
                console.log(this.indent,'Creating streaming download server on port',port);
                let sserver = new StreamingWebSocket.Server({
                    'host' : this.hostname,
                    'port' : port,
                    'perMessageDeflate' : false  //Authors recommend disabling this https://www.npmjs.com/package/websocket-stream
                }, (stream) => {
                    connected = true;
                    console.log(this.indent,'\t Beginning stream on port',port,filename);
                    
                    let fileReadStream = fs.createReadStream(filename);
                    fileReadStream.on('end', () => {
                        this.releasePort(port);
                        //console.log('stream done, ending stream');
                        stream.write('');
                        stream.end();
                        sserver.close();
                        resolve();
                    });

                    fileReadStream.pipe(stream);
                });

                sserver.on('listening', () => {
                    fs.stat(filename, (err, stats) => {
                        if (err) { reject(err); sserver.close(); }
                        
                        //                        console.log('Initiating command',port);
                        this.sendCommand(socket, 'initiatefilestream', {
                            'host' : this.hostname,
                            'port' : port,
                            'id' :   id,
                            'size' : stats.size
                        });

                        //port should close itself if server is non-responsive (i.e. has not connected)
                        let timeout = timers.setTimeout( () => {
                            if (!connected) { 
                                console.log('Client nonresponse, closing server on port', port);
                                sserver.close(); 
                                reject();
                            }
                            timers.clearTimeout(timeout);
                        }, 15000);
                    });
                    
                });

                sserver.on('error', (e) => {
                    console.log('Stream server encountered an error and is closing', e);
                    sserver.close();
                    reject(e);
                });

            }).catch( (e) => {
                reject(e);
            });
        });
    }

        /**
     * Iteratively scans for a free port on the user's system.
     * 
     * @param {Number} port - The port to start scanning from, typically the number of the control socket. Increments each time the function finds an in-use port.
     * @returns A promise that will resolve a free port, or reject with an error.
     */
    findFreePort(port) {
        return new Promise( (resolve, reject) => {
            let currentPort = port;
            let testServer = new net.Server();

            let searchPort = () => {
                currentPort+=1;
                while (portsInUse.includes(currentPort))
                    currentPort+=1;
                if (currentPort > port + 2000) {
                    reject('---- timed out scanning ports');
                }
                try {
                    portsInUse.push(currentPort);
                    //                    console.log('Ports in Use=',portsInUse);
                    testServer.listen(currentPort, 'localhost');
                    
                    testServer.on('error', (e) => {
                        if (e.code === 'EADDRINUSE') {
                            portsInUse.push(currentPort);
                            testServer.close();
                            searchPort();
                        } else {
                            reject(e);
                        }
                    });

                    testServer.on('listening', () => {   testServer.close(); });
                    testServer.on('close', () => {
                        //console.log('Found port',currentPort);
                        resolve(currentPort);
                    });
                } catch(e) {
                    console.log('catch', e);
                }
            };
            
            searchPort();

        });
    }

}

module.exports=BisWSWebSocketFileServer;
