const $ = require('jquery');
const webutil = require('bis_webutil');
const wsutil = require('wsutil');
const bisweb_simplefiledialog = require('bisweb_simplefiledialog');
const bisgenericio=require('bis_genericio');
const pako=require('pako');
const biswebasync=require('bisweb_asyncutils');

const insecure=wsutil.insecure;



class BisWebFileServerClient { 

    constructor() {

        this.lastCommand=null;
        this.lastOpts=null;
        this.portNumber=8081;

        //connection over which all control communication takes place
        this.socket = null;

        //connection over which uploads are exchanged
        this.dataSocket = null;

        // Because this involves creating webcomponents (deep down, they need to be afterAllLoaded);
        this.fileDialog = null;new bisweb_simplefiledialog();

        //When connecting to the server, it may sometimes request that the user authenticates
        this.authenticateModal = null;
        this.authenticated = false;
        this.authenticatingEvent= -1;
        this.hostname=null;
        this.password=null;
        this.passwordid=null;
        this.lastdirectory=null;
    }

    /**
     * Initiates a connection to the fileserver at the specified address. Note that the handshaking protocol is handled entirely by the native Javascript WebSocket API.
     * Sets this.socket internally, the structure representing the control socket between client and server.
     * 
     * @param {String} address - The hostname and port to try to connect to, e.g. 'ws://localhost:8080'. These addresses must be prefixed with 'ws://' 
     */
    connectToServer(address = 'ws://localhost:8081') {

        if (this.socket) { this.socket.close(1000, 'Restarting connection'); this.hostname=null; }

        let arr=address.split(':');
        let prt=arr[arr.length-1];
        this.portNumber=parseInt(prt);
        this.socket = new WebSocket(address);


        if (!this.socket) {
            this.socket=null;

            return;
        }
        //file tree dialog needs to be able to call some of file server's code 
        //they are separated for modularity reasons, so to enforce the hierarchical relationship between the two fileserver provides the functions and the socket
        
        //add the event listeners for the control port
        let closeEvent = this.socket.addEventListener('close', (event) => {
            console.log('Socket closing', event);
        });

        // Handle Data From Server
        let messageEvent = this.socket.addEventListener('message', (event) => {
            this.handleServerResponse(event);
        });

        let errorEvent = this.socket.addEventListener('error', (event) => {
            console.log('error event', event);
            webutil.createAlert('Failed to connect to server: '+address+'. It may not exist.',true);
            this.socket=removeEventListener('close', closeEvent);
            this.socket=removeEventListener('message', messageEvent);
            this.socket=removeEventListener('error', errorEvent);
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
            //  console.log('received text data: ', data.type,data.id,biswebasync.printEvent(id));
            this.handleDataReceivedFromServer(data.payload.data,false,id);
            return;
        }

        
        // We have handle file download events (i.e. server sending large data to us)
        // From here on it is commands
            
        
        let success=true;


        //        console.log('++++\n++++ Received message: ', data.type,id,biswebasync.printEvent(id));
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

            case 'getserverbasedirectory': {
                // Nothing to do let promise handle it
                break;
            }
            case 'getservertempdirectory': {
                // Nothing to do let promise handle it
                break;
            }
            case 'error': {
                console.log('Error from client:', data.payload); 
                success=false;
                break;
            }
            case 'datasocketready': {
                //some control phrases are handled elsewhere, so the main listener should ignore them
                break;
            }
            case 'uploadcomplete': {
                console.log('Upload to server completed successfully');
                break;
            }
            case 'authenticate': {
                this.socket.send(this.password || '');
                break;
            }
            case 'badauth':  {
                id=-1;
                if (this.authenticateModal) {
                    $('#'+this.passwordid).val('');
                    this.authenticateModal.header.find('.modal-title').text('Please try again');
                } else if (this.authenticatingEvent) {
                    id=this.authenticatingEvent.id;
                    success=false;
                }
                break;
            }

            case 'goodauth': {
                id=-1;
                webutil.createAlert('Login to BisWeb FileServer Successful');
                this.authenticated = true;
                if (this.authenticateModal)
                    this.authenticateModal.dialog.modal('hide');
                //console.log('received text data: ', biswebasync.printEvent(this.authenticatingEvent.id));
                if (this.authenticatingEvent)
                    id=this.authenticatingEvent.id;
                break;
            }

            default: {
                console.log('received a transmission with unknown type', data.type, 'cannot interpret');
                success=false;
            }
        }

        if (id>=0) {
            //            console.log("++++ Resolving in handleEvent ",biswebasync.printEvent(id),success);
            if (success)
                biswebasync.resolveServerEvent(id,data.payload);
            else
                biswebasync.rejectServerEvent(id,data.payload);
        }
    }

        // ------------------------------------------------------
    // Authentication Functionality
    //
    
    /**
     * Creates a small modal dialog to allow the user to enter the session password used to authenticate access to the local fileserver. 
     * Also displays whether authentication succeeded or failed. 
     */
    showAuthenticationDialog(title='Connect To BisWeb Server') {

        if (!this.authenticateModal) {

            let hid=webutil.getuniqueid();
            let pid=webutil.getuniqueid();
            
            let passwordEntryBox=$(`
                <div class='form-group'>
                    <label for='server'>Host:</label>
                                 <input type='text' class = 'form-control' id='${hid}' value="localhost:8081">
                </div>
                <div class='form-group'>
                    <label for='filename'>Password:</label>
                    <input type='text' class = 'form-control' id='${pid}'>
                </div>
            `);

            this.authenticateModal = webutil.createmodal('Connect To BisWeb Server', 'modal-sm');
            this.authenticateModal.dialog.find('.modal-footer').find('.btn').remove();
            this.authenticateModal.body.append(passwordEntryBox);
            
            let confirmButton = webutil.createbutton({ 'name': 'Connnect', 'type': 'btn-success' });
            let cancelButton = webutil.createbutton({ 'name': 'Cancel', 'type': 'btn-danger' });
            
            this.authenticateModal.footer.append(confirmButton);
            this.authenticateModal.footer.append(cancelButton);

            $(cancelButton).on('click', () => {
                this.authenticateModal.dialog.modal('hide');
            });

            $(confirmButton).on('click', () => {

                let hst=$('#'+hid).val();
                this.password = $('#'+pid).val();
                if (this.hostname!==hst) {
                    this.hostname = hst;
                    this.connectToServer('ws://'+this.hostname);
                } else {
                    setTimeout( () => {
                        this.socket.send(this.password);
                    },10);
                }
            });

            this.passwordid=pid;
        }

        $('#'+this.passwordid).val('');
        
        if (title!==null)
            this.authenticateModal.header.find('.modal-title').text(title);

        this.authenticateModal.dialog.modal('show');
    }

    /**
     * Authenticate
     * Initiates authentication with the server
     * @param{String} password - if not null this is used
     * @param{String} hostname - if not null this is used
     * @returns{Promise} - when this is done
     */
    authenticate(password=null,hostname=null) {

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
            
            this.authenticatingEvent=biswebasync.addServerEvent(successCB,failureCB,'authenticate');

            hostname = hostname || 'ws://localhost:8081';
            
            if (insecure) {
                this.password="";
                this.connectToServer(hostname);
            } else if (password) {
                this.password=password;
                this.connectToServer(hostname);
            } else {
                this.showAuthenticationDialog();
            }
        });
    }


    // ------------------------- File Dialog Functions ---------------------------------
    
    /**
     * Renders a file list fetched by requestFileList in the file tree modal using jstree. 
     * Called in response to a file list returned by the server (itself in response to requestFileList) or by the fileTreeDisplayModal trying to fetch more nodes.
     * 
     * @param {Object} payload - Object specifying the list of files on the server machine and which modal it corresponds to.
     *
     * // TODO: some how have a title here ... and suffix list
     */
    showFileDialog(payload) {

        this.lastOpts=this.lastOpts || {};
        
        if (payload.type === 'save') 
            this.lastOpts.mode='save';
        else
            this.lastOpts.mode='load';

        if (!this.fileDialog) {
            this.fileDialog=new bisweb_simplefiledialog();
            this.fileDialog.fileListFn = this.requestFileList.bind(this);
        }
        
        this.lastdirectory=payload.path;
        this.fileDialog.fileRequestFn = this.lastOpts.callback;
        this.fileDialog.openDialog(payload.data,
                                   payload.path,
                                   this.lastOpts);
    }

    //
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
                let serverEvent=biswebasync.addServerEvent(cb,reject,'requestFileList');
                let command = JSON.stringify({ 'command' : 'getfilelist', 'directory' : directory, 'type' : type , 'depth' : 0, 'id' : serverEvent.id}); 
                this.socket.send(command);
            });
        });
    }



    /** get the base directory of the server
     * @returns {Promise} - whose payload is the location of the directory
     */
    getServerBaseDirectory() {

        return new Promise( (resolve,reject) => {
            
            let serverEvent=biswebasync.addServerEvent(resolve,reject,'getServerBaseDir');
            let command = JSON.stringify({ 'command' : 'getserverbasedirectory', 'id' : serverEvent.id }); 
            this.socket.send(command);
        });

    }

    /** get a temporary write directory
     * @returns {Promise} - whose payload is the location of the temp directory
     */
    getServerTempDirectory() {
        
        return new Promise( (resolve,reject) => {
            let serverEvent=biswebasync.addServerEvent(resolve,reject,'getServerTempDir');
            let command = JSON.stringify({ 'command' : 'getservertempdirectory' , 'id' : serverEvent.id});
            this.socket.send(command);
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
            
            
            let serverEvent=biswebasync.addServerEvent(handledata,reject,'downloadFile');
            
            let command = JSON.stringify({ 'command' : 'readfile',
                                           'filename' : url,
                                           'id' : serverEvent.id,
                                           'isbinary' : isbinary });
            this.socket.send(command);
        });
    }

    
    



    /** This is the helper function
     * Takes raw input from the server, formats it as a proper BisImage and displays it. 
     * Note that the server transfers images in binary form to avoid wasting space converting it to UTF-8 or a similar encoding. 
     *  
     * this.callback is attached to bisweb_fileserver when a bisweb_filedialog modal is opened. 
     * Given that modals are opened one at a time and all user-driven file I/O happens through one of these, the callback should be a
     * @param {TypedArray|String} data - data transferred by the server either uint8array or text (depending on isbinary)
     * @param {Boolean} isbinary - if true data is binary
     * @param {Number} id - the id of the request or -1 if this is binary
     */
    handleDataReceivedFromServer(data,isbinary=true,id=-1) {

        if (isbinary) {
            
            let reader = new FileReader();
            reader.addEventListener('loadend', () => {
                biswebasync.resolveBinaryData(data.id,reader.result);
            });
            reader.readAsArrayBuffer(data);
        } else {
            biswebasync.resolveServerEvent(id,data);
        }
    }

    // ------------------ Upload file and helper routines -----------------------------------------------------------------

    /** upload file 
     * @param {String} url -- abstact file handle object
     * @param {Data} data -- the data to save, either a sting or a Uint8Array
     * @param {Boolean} isbinary -- is data binary
     * @returns {Promise} 
     */
    uploadFile(url, data, isbinary=false) {

        return new Promise( (resolve, reject) => {
            let promiseCb = () => {
                resolve('Upload successful');
            };
            
            let promiseEb = () => {
                reject('Upload failed');
            };
            
            this.uploadFileToServer(url, data, isbinary, promiseCb, promiseEb);
        });
    }
    


    /**
     * Sends a file from the client to the server to be saved on the server machine. Large files are sliced and transmitted in chunks. 
     * Creates its own socket to do the transfer over (doing transfer on control socket seems to make that socket unstable).
     * 
     * TODO: Extend this function to support matrices and transformations.
     * @param {String} name - What the file should be named once it is saved to the server. 
     * @param {TypedArray|String} data - Data to send to the server. TypedArray if binary and String otherwise.
     * @param {Boolean} isbinary - if true data is binary
     * @param {Function} cb - A callback for if the transfer is successful. Optional.
     * @param {Function} eb - A callback for if the transfer is a failure (errorback). Optional.
     */
    uploadFileToServer(name, data, isbinary=false, cb = () => {}, eb = () => {}) {

        // TODO: is the size of body < packetsize upload in one shot
        let body=null;
        if (!isbinary) 
            body=bisgenericio.string2binary(data);
        else
            body=new Uint8Array(data.buffer);
            
        
        const packetSize = 50000;
        let fileTransferSocket;
        
        //negotiate opening of the data port
        this.socket.addEventListener('message', (e) => {
            let message;
            try {
                message = JSON.parse(e.data);
                if (message.type === 'datasocketready') {
                    
                    let port=this.portNumber+1;
                    console.log('Second port=',port);
                    let server=`ws://localhost:${port}`;
                    fileTransferSocket = new WebSocket(server);
                    fileTransferSocket.addEventListener('open', () => {
                        doDataTransfer(body);
                    });
                } else if (message.type === 'serverreadonly') {
                    webutil.createAlert('The server is set to read-only mode and will not save files.', true);
                } else {
                    console.log('heard unexpected message', message, 'not opening data socket');
                    eb();
                }
            } catch(e) {
                console.log('failed to parse response to data socket request from server', e);
                eb();
            }
        }, { once : true });


        
        let metadata = {
            'command': 'uploadfile',
            'totalSize': body.length,
            'storageSize': body.length,
            'packetSize': packetSize,
            'filename': name,
            'isbinary' : isbinary,
        };

        
        console.log('sending metadata to server', metadata);
        this.socket.send(JSON.stringify(metadata));
        
        
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
                    fileTransferSocket.send(slice);
                    currentIndex+=(end-begin);
                } else {
                    // We are done!
                    console.log('sending close after upload');
                    fileTransferSocket.close(1000, 'Transfer completed successfully');
                    cb();
                }
            };

            fileTransferSocket.addEventListener('message', (event) => {
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch (e) {
                    console.log('an error occured while parsing event.data', e);
                    eb();
                    return null;
                }

                switch (data.type) {
                    case 'nextpacket':
                        sendDataSlice();
                        break;
                    case 'uploadcomplete':
                        console.log('closing file transfer socket', fileTransferSocket);
                        fileTransferSocket.close(1000, 'Transfer completed successfully');
                        cb();
                        break;
                    default: console.log('received unexpected message', event, 'while listening for server responses');
                }
            });

            sendDataSlice();
        }
    }

}

module.exports = BisWebFileServerClient;
