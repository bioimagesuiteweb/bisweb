
const wsutil = require('wsutil');
const bisgenericio=require('bis_genericio');
const pako=require('pako');
const bisasyncutil=require('bis_asyncutils');
const util = require('bis_util');
const BisBaseServerClient= require('bis_baseserverclient');
// Debug Mode
const verbose=0;
let uploadcount=0;

class BisFileServerClient extends BisBaseServerClient { 

    constructor(nodesocket=null) {

        super();
        this.lastOpts=null;
        this.portNumber=8081;
        
        //connection over which all control communication takes place
        this.socket = null;

        //connection over which uploads are exchanged
        this.dataSocket = null;
        
        //When connecting to the server, it may sometimes request that the user authenticates
        this.authenticatingEvent= -1;
        this.hostname=null;
        this.password=null;
        this.lastCommand="";
        this.NodeWebSocket=nodesocket;
        this.terminating=false;
    }

    sendCommand(command) {
        
        let js=JSON.stringify(command)+' ';
        if (verbose) {
            console.log('____ \t\t Sending ',js,' length=',js.length);
        }
        this.socket.send(js);
        // id here = command.id
        this.lastCommand=command;
        if (command.command==='terminate') {
            this.terminating=true;
        }
        
        let id=command.id;
        let timeout=command.timeout || 10000;

        bisasyncutil.addEventTimeout(id,timeout);
    }

    sendRawText(text) {
        // Password only really
        // id is this.authenticatingEvent.id;
        this.socket.send(text);
        let id=this.authenticatingEvent.id;
        bisasyncutil.addEventTimeout(id);
    }
        

    closeConnection() {
        if (this.socket) {
            console.log('---- closing connection');
            this.socket.close(1000, ' Restarting connection ');
            this.hostname=null;
        }
    }


    /**
     * Initiates a connection to the fileserver at the specified address. Note that the handshaking protocol is handled entirely by the native Javascript WebSocket API.
     * Sets this.socket internally, the structure representing the control socket between client and server.
     * 
     * @param {String} address - The hostname and port to try to connect to, e.g. 'ws://localhost:8080'. These addresses must be prefixed with 'ws://' 
     */
    connectToServer(address = 'ws://localhost:8081') {

        if (this.socket) {
            this.closeConnection();
        }

        let arr=address.split(':');
        let prt=arr[arr.length-1];
        this.portNumber=parseInt(prt);
        if (!this.NodeWebSocket)
            this.socket = new WebSocket(address);
        else
            this.socket = new this.NodeWebSocket(address);

        if (!this.socket) {
            this.socket=null;

            return;
        }
        
        //add the event listeners for the control port
        let closeEvent = this.socket.addEventListener('close', () => {
            console.log('---- Socket closing');
            if (this.terminating)
                return;
            this.authenticated=false;
            this.alertEvent('Connection to fileserver at '+this.hostname+' closed',true);
            if (this.authenticatingEvent) {
                let id=this.authenticatingEvent.id;
                bisasyncutil.rejectServerEvent(id,'failure to authenticate');
            }
        });

        // Handle Data From Server
        let messageEvent = this.socket.addEventListener('message', (event) => {
            this.handleServerResponse(event);
            this.hostname=address;
        });

        let errorEvent = this.socket.addEventListener('error', () => {
            this.alertEvent('Failed to connect to server: '+address+'. It may not exist.',true);
            this.socket.removeEventListener('close', closeEvent);
            this.socket.removeEventListener('message', messageEvent);
            this.socket.removeEventListener('error', errorEvent);
            this.socket=null;
        });

    }

    /** Handles response from server
     * @param {Object} event - an object containing info from server
     */
    handleServerResponse(event) {
        

        // ---------------------
        // Is this binary ?
        // ---------------------
        if (typeof (event.data) !== "string") {
            //            console.log('received a binary transmission',event.data);
            this.handleDataReceivedFromServer(event.data,true,-1);
            return;
        }

        // ---------------------
        // Text from here on out
        // ---------------------
        let data = wsutil.parseJSON(event.data);
        let id=data.payload.id || -1;
        
        if (data.type==='text') {
            //  console.log('received text data: ', data.type,data.id,bisasyncutil.printEvent(id));
            this.handleDataReceivedFromServer(data.payload.data,false,id);
            return;
        }

        
        // We have handle file download events (i.e. server sending large data to us)
        // From here on it is commands
        
        
        let success=true;

        if (verbose)
            console.log('____\n____ Received message: ', data.type,id,bisasyncutil.printEvent(id));
        switch (data.type)
        {
            case 'checksum' : {
                //console.log('Checksum =', data.payload.checksum);
                // Nothing to do let promise handle it;
                break;
            }
            
            case 'filelist':  {
                // Nothing to do let promise handle it
                break;
            }

            case 'serverbasedirectory': {
                // Nothing to do let promise handle it
                break;
            }
            case 'servertempdirectory': {
                // Nothing to do let promise handle it
                break;
            }
            case 'error': {
                console.log('Error from client:', data.payload); 
                success=false;
                break;
            }
            case 'uploadmessage': {
                // Nothing to do let promise handle it
                break;
            }
            case 'authenticate': {
                this.sendRawText(this.password || '');
                break;
            }
            case 'badauth':  {
                id=-1;
                if (this.hasGUI) {
                    this.retryAuthenticationDialog();
                } else if (this.authenticatingEvent) {
                    id=this.authenticatingEvent.id;
                    success=false;
                }
                break;
            }

            case 'goodauth': {
                id=-1;
                this.alertEvent('Login to BisWeb FileServer Successful'); //webutil.createAlert
                this.authenticated = true;
                this.hideAuthenticationDialog();

                //console.log('received text data: ', bisasyncutil.printEvent(this.authenticatingEvent.id));
                if (this.authenticatingEvent)
                    id=this.authenticatingEvent.id;
                break;
            }

            case 'filesystemoperations': {
                // Handled by promise
                break;
            }

            case 'tryagain' : {
                id=-1;
                console.log('\n___________\n---------------------- \t\t Failed retrying',this.lastCommand,'\n__________________');
                this.lastCommand.taketwo="              ";
                this.sendCommand(this.lastCommand);
                break;
            }

            case 'nogood' : {
                id=-1;
                let a=this.lastCommand;
                this.sendCommand({ 'command' : 'restart'});
                this.lastCommand=a;
                break;
            }


            
            default: {
                console.log('received a transmission with unknown type', data.type, 'cannot interpret');
                success=false;
            }
        }

        if (id>=0) {
            //            console.log("____ Resolving in handleEvent ",bisasyncutil.printEvent(id),success);
            if (success)
                bisasyncutil.resolveServerEvent(id,data.payload);
            else
                bisasyncutil.rejectServerEvent(id,data.payload);
        }
    }

    // ------------------------------------------------------
    // Authentication Functionality
    //
    

    /**
     * Authenticate
     * Initiates authentication with the server
     * @param{String} password - if not null this is used
     * @param{String} hostname - if not null this is used
     * @returns{Promise} - when this is done
     */
    authenticate(password='',hostname=null) {
        
        this.password = password || '';
        hostname = hostname || 'ws://localhost:8081';
        
        if (this.authenticated)
            return Promise.resolve();

        return new Promise( (resolve,reject) => {

            let successCB = (() => {
                this.authenticatingEvent=null;
                resolve();
            });
            let failureCB= ( () => {
                this.authenticatingEvent=null;
                reject();
            });
            
            this.authenticatingEvent=bisasyncutil.addServerEvent(successCB,failureCB,'authenticate');

            if (password.length>0 || this.hasGUI===false) {
                this.connectToServer(hostname);
            } else {
                // Useless if no GUI
                this.showAuthenticationDialog();
            }
        });
    }

    // ------------------------- External Functions ---------------------------------
    // 
    
    /**
     * Sends a request for a list of the files on the server machine and prepares the display modal for the server's reply. 
     * Once the list of files arrives it is rendered using jstree. The user may request individual files from the server using this list. 
     * It calls authenticate first ...
     * requestFileList doesn't expand the contents of the entire server file system; just the first four levels of directories. 

     * This will eventually end up calling this.handleServerRequest (via nested callbacks)
     * 
     * @param {String} type - Which type of modal is requesting the list. One of either 'load' or 'save'. // TODO: add directory as type
     * @param {String} directory - The directory to expand the files under. Optional -- if unspecified the server will return the directories under ~/.
     * @param {Boolean} showdialog - if true popup a gui dialog else just text
     * @param {Objects} opts - the options object
     * @param {Function} opts.callback - A callback function propagated from bis_webfileutil that will handle the non-AWS I/O for the retrieved data, , and a list of acceptable file suffixes.
     * @param {String} opts.title - The title to display on the load/save modal
     * @param {String} opts.initialname - The initial filename

     * @returns {Promise} with payload is the event
     */
    requestFileList(type, directory = null, showdialog=true,opts=null) {

        
        if (opts)
            this.lastOpts=opts;

        return new Promise ((resolve,reject) => {

            let cb=( (payload) => {
                if (showdialog)
                    this.showFileDialog(payload);
                resolve(payload);
            });

            this.authenticate().then( () => {
                let serverEvent=bisasyncutil.addServerEvent(cb,reject,'requestFileList');
                this.sendCommand({ 'command' : 'getfilelist',
                                   'directory' : directory,
                                   'type' : type ,
                                   'id' : serverEvent.id}); 
            });
        });
    }



    /** get the base directory of the server
     * @returns {Promise} - whose payload is the location of the directory
     */
    getServerBaseDirectory() {

        return new Promise( (resolve,reject) => {

            let res=((obj) => { resolve(obj.path); });
            let serverEvent=bisasyncutil.addServerEvent(res,reject,'getServerBaseDir');
            this.sendCommand({ 'command' : 'getserverbasedirectory', 'id' : serverEvent.id }); 
        });

    }

    /** get a temporary write directory
     * @returns {Promise} - whose payload is the location of the temp directory
     */
    getServerTempDirectory() {
        
        return new Promise( (resolve,reject) => {
            let res=((obj) => { resolve(obj.path); });
            let serverEvent=bisasyncutil.addServerEvent(res,reject,'getServerTempDir');
            this.sendCommand({ 'command' : 'getservertempdirectory' , 'id' : serverEvent.id});
        });
    }


    // ------------------ Download file and helper routines -----------------------------------------------------------------
    /**
     * downloads a file from the server 
     * @param{String} url - the filename
     * @param{Boolean} isbinary - if true file is binary
     * @returns a Promise with payload { obj.name obj.data } much like bis_genericio.read (from where it will be called indirectly)
     */
    downloadFile(url,isbinary) {
        return new Promise( (resolve, reject) => {

            if (url.indexOf('\\')>=0)
                url=util.filenameWindowsToUnix(url);

            
            let handledata = ( (raw_data) => { 

                if (!isbinary) {
                    resolve({
                        'data' : raw_data,
                        'filename' : url,
                    });
                } else {
                    let dat = new Uint8Array(raw_data);
                    let comp=bisgenericio.iscompressed(url);
                    if (!comp) {
                        resolve({
                            'data' : dat,
                            'filename' : url
                        });
                    } else {
                        let a = pako.ungzip(dat);
                        resolve({
                            'data' : a,
                            'filename' : url
                        });
                        a=null;
                    }
                    dat=null;
                }
            });
            
            
            let serverEvent=bisasyncutil.addServerEvent(handledata,reject,'downloadFile');
            
            this.sendCommand({ 'command' : 'readfile',
                               'filename' : url,
                               'timeout' : 999999,
                               'id' : serverEvent.id,
                               'isbinary' : isbinary });
        });
    }

    
    



    /** This is the helper function
     * Given that modals are opened one at a time and all user-driven file I/O happens through one of these, the callback should be a
     * @param {TypedArray|String} data - data transferred by the server either uint8array or text (depending on isbinary)
     * @param {Boolean} isbinary - if true data is binary
     * @param {Number} id - the id of the request or -1 if this is binary
     */
    handleDataReceivedFromServer(data,isbinary=true,id=-1) {

        if (isbinary) {
            if (bisgenericio.getenvironment()!=='node') {
                let reader = new FileReader();
                reader.addEventListener('loadend', () => {
                    bisasyncutil.resolveBinaryData(reader.result);
                });
                reader.readAsArrayBuffer(data);
            } else {
                bisasyncutil.resolveBinaryData(data);
            }
        } else {
            bisasyncutil.resolveServerEvent(id,data);
        }
    }

    // ------------------ Upload file and helper routines -----------------------------------------------------------------


    /** uploadFile Helper
     * createFileTransferSocket
     * @param{Object) metadata - the upload metadata
     * @returns{Promise} whose payload is the Transfer Socket
     */

    initiateDataUploadHandshakeAndGetPort(command) {

        return new Promise( (resolve,reject) => {

            let res=( (msg) => {
                let m=msg.name;

                if (m==='datasocketready') {
                    resolve(msg.port);
                } else if (m === 'serverreadonly') {
                    this.alertEvent('The server is set to read-only mode and will not save files.', true);
                    reject('Failed');
                } else {
                    console.log('heard unexpected message', m, 'not opening data socket');
                    reject('Failed');
                }
            });
            
            let serverEvent=bisasyncutil.addServerEvent(res,reject,'initiateTransfer');
            command.id=serverEvent.id;
            this.sendCommand(command);
        });
    }
                            
    
    /** upload file 
     * @param {String} url -- abstact file handle object
     * @param {Data} data -- the data to save, either a sting or a Uint8Array
     * @param {Boolean} isbinary -- is data binary
     * @returns {Promise} 
     */
    uploadFile(url, data, isbinary=false) {


        if (url.indexOf('\\')>=0)
            url=util.filenameWindowsToUnix(url);

        
        // TODO: is the size of body < packetsize upload in one shot
        let body=null;
        if (!isbinary) 
            body=bisgenericio.string2binary(data);
        else
            body=new Uint8Array(data.buffer);


        let checksum=util.SHA256(body);
        let packetSize=32768/4;
        return new Promise((resolve,reject) => {

            let success=(m) => {
                resolve(m);
            };

            let tryagain=(m) => {
                if (m!=='tryagain' || packetSize<1000)
                    reject(m);
                packetSize=Math.round(packetSize/2);
                if (packetSize<16384)
                    console.log('++++ Trying again',packetSize);
                this.uploadFileHelper(url,body,isbinary,checksum,success,tryagain,packetSize);
            };
            tryagain("tryagain");
        });
    }
        

    uploadFileHelper(url,body,isbinary=false,checksum,successCB,failureCB,packetSize=400000) {

        let fileTransferSocket=null;
        uploadcount=uploadcount+1;
        
        let metadata = {
            'command': 'uploadfile',
            'totalSize': body.length,
            'storageSize': body.length,
            'packetSize': packetSize,
            'filename': url,
            'isbinary' : isbinary,
            'checksum' : checksum,
            'timeout' : 999999,
            'uploadCount' : uploadcount,
        };

        console.log('\n\t \n\t \nBeginnning uploadFileHelper',metadata.command,'size=',metadata.totalSize,' packetSize=',metadata.packetSize,' count=',metadata.uploadCount);
        
        if (verbose)
            console.log((metadata));

        this.initiateDataUploadHandshakeAndGetPort(metadata).then( (port) => {

            console.log("looking to connect to port",port);
            
            let server=this.hostname || null;
            if (server) {
                let ind=server.lastIndexOf(":");
                server=server.substr(0,ind)+`:${port}`;
            } else {
                server=`ws://localhost:${port}`;
            }
            
            if (verbose)
                console.log("Connecting to data server ",server);
            
            if (!this.NodeWebSocket)
                fileTransferSocket = new WebSocket(server);
            else
                fileTransferSocket = new this.NodeWebSocket(server);
            
            fileTransferSocket.addEventListener('open', () => {
                doDataTransfer(body);
            });
        }).catch( (e) => {
            failureCB('error -- failed to connect '+e);
        });
            
            
        //transfer file in 50KB chunks, wait for acknowledge from server
        function doDataTransfer(data) {
            
            let currentIndex = 0;
            let done=false;
            
            //send data in chunks
            let sendDataSlice = () => {
                
                if (done===false) {
                    let begin=currentIndex;
                    let end=currentIndex+packetSize;
                    if (end>data.length) {
                        end=data.length;
                        done=true;
                    }
                    
                    
                    let slice=new Uint8Array(data.buffer,begin,end-begin);
                    if (verbose>1)
                        console.log('\t\t Sending ',begin,end-1,' Total=',data.length,' slice=',slice.length);
                    
                    fileTransferSocket.send(slice);
                    currentIndex+=(end-begin);
                } else {
                    if (verbose>1)
                        console.log('We are done ignoring');
                }
            };
            
            fileTransferSocket.addEventListener('message', (event) => {
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch (e) {
                    failureCB('error -- an error occured while parsing event.data', e);
                    return null;
                }
                
                if (verbose>1)
                    console.log('____ In Transfer ',data.type);
                
                switch (data.type)
                {
                    case 'nextpacket':
                    {
                        sendDataSlice();
                        break;
                    }
                    case 'uploadcomplete':
                    {
                        // We are done!
                        if (verbose)
                            console.log('Received uploadcomplete, closing');
                        console.log('++++ Closing transfer socket success');
                        fileTransferSocket.close(1000, 'Transfer completed successfully ');
                        successCB(metadata);
                        break;
                    }
                    case 'uploadfailed':
                    {
                        console.log('Update failed');
                        failureCB('tryagain');
                        break;
                    }
                    default:
                    {
                        console.log('received unexpected message', event, 'while listening for server responses');
                    }
                }
            });
            sendDataSlice();
        }
    }

    /** performs a file system operation
     * @param{String} operation -- the operation
     * @param{String} url -- the filename
     * @returns {Promise} payload is the result
     */
    fileSystemOperation(name,url) {

        if (url.indexOf('\\')>=0)
            url=util.filenameWindowsToUnix(url);

        return new Promise( (resolve,reject) => {
            
            let res=((obj) => { resolve(obj.result); });
            let serverEvent=bisasyncutil.addServerEvent(res,reject,'fileSystemOperation');
            this.sendCommand({ 'command' : 'filesystemoperation',
                               'operation' : name,
                               'url' : url,
                               'id' : serverEvent.id }); 
        });
    }

    sendCommandPromise(command) {
        
        return new Promise( (resolve,reject) => {
            let serverEvent=bisasyncutil.addServerEvent(resolve,reject,'direct');
            command.id=serverEvent.id;
            this.sendCommand(command);
        });

    }

}

module.exports = BisFileServerClient;
