const $ = require('jquery');
const webutil = require('bis_webutil');
const wsutil = require('wsutil');
const bisweb_filedialog = require('bisweb_filedialog');
const bisgenericio=require('bis_genericio');
const pako=require('pako');
const insecure=wsutil.insecure;

const ERROR_EVENT='server_error_evt_'+webutil.getuniqueid();
const TRANSMISSION_EVENT='transmission_evt_'+webutil.getuniqueid();


class BisWebFileServerClient { 

    constructor() {

        console.log('hello from bisweb fileserver constructor');
        this.lastCommand=null;
        this.lastOpts=null;
        this.portNumber=8081;

        //connection over which all control communication takes place
        this.socket = null;

        //connection over which uploads are exchanged
        this.dataSocket = null;

        //File tree requests display the contents of the disk on the server machine in a moda;
        webutil.runAfterAllLoaded( () => {
            // Because this involves creating webcomponents (deep down, they need to be afterAllLoaded);
            this.fileLoadDialog = new bisweb_filedialog('BisWeb File Server Connector');
            this.fileSaveDialog = new bisweb_filedialog('Choose a save location', { 'makeFavoriteButton' : false, 'modalType' : 'save', 'displayFiles' : false  });

            console.log('file load dialog', this.fileLoadDialog, 'file save dialog', this.fileSaveDialog);
        });

        //When connecting to the server, it may sometimes request that the user authenticates
        this.authenticateModal = null;
        this.authenticated = false;
        this.hostname=null;
        this.password=null;
        this.passwordid=null;
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


        console.log(this.socket);

        if (!this.socket) {
            this.socket=null;

            return;
        }
        //file tree dialog needs to be able to call some of file server's code 
        //they are separated for modularity reasons, so to enforce the hierarchical relationship between the two fileserver provides the functions and the socket
        if (this.fileLoadDialog) {
            this.fileLoadDialog.fileListFn = this.requestFileList.bind(this);
            this.fileLoadDialog.fileRequestFn = this.invokeReadFilenameCallbackFunction.bind(this);
            this.fileLoadDialog.socket = this.socket;
        }

        if (this.fileSaveDialog) {
            this.fileSaveDialog.fileListFn = this.requestFileList.bind(this);
            this.fileSaveDialog.fileRequestFn = this.invokeWriteFilenameCallbackFunction.bind(this);
            this.fileSaveDialog.socket = this.socket;
        }

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
        
        console.log('received data: ', event);
        let data;
        
        //parse stringified JSON if the transmission is text
        if (typeof (event.data) === "string") {
            data = wsutil.parseJSON(event.data);
        } else {
            console.log('received a binary transmission',event.data);
            this.handleDataReceivedFromServer(event.data,true);
            return;
        }

        
        switch (data.type)
        {
            case 'text' : {
                // this is a text file
                this.handleDataReceivedFromServer(data.payload,false);
                break;
            }
            case 'filelist':  {
                this.displayFileList(data.payload);
                break;
            }
            case 'supplementalfiles': {
                this.handleSupplementalFileRequest(data.payload);
                break;
            }
            case 'fileloadlocation': {
                this.setFileLoadLocation(data.payload);
                break;
            }
            case 'filesavelocation': {
                this.setFileSaveLocation(data.payload);
                break;
            }
            case 'error': {
                console.log('Error from client:', data.payload); 
                let errorEvent = new CustomEvent(ERROR_EVENT, { 'detail' : data.payload });
                document.dispatchEvent(errorEvent);
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
                $('#'+this.passwordid).val('');
                this.authenticateModal.header.find('.modal-title').text('Please try again');
                break;
            }
            case 'goodauth': { 
                webutil.createAlert('Login to BisWeb FileServer Successful');
                this.authenticated = true;
                if (this.authenticateModal)
                    this.authenticateModal.dialog.modal('hide');

                setTimeout( () => {
                    if (this.lastCommand) {
                        this.wrapInAuth(this.lastCommand, this.lastOpts);
                        this.lastCommand=null;
                    }
                },100);
                break;
            }
            default: {
                console.log('received a transmission with unknown type', data.type, 'cannot interpret');
            }
        }
        
    }

    /**
     * Sends a request for a list of the files on the server machine and prepares the display modal for the server's reply. 
     * Once the list of files arrives it is rendered using jstree. The user may request individual files from the server using this list. 
     * 
     * requestFileList doesn't expand the contents of the entire server file system; just the first four levels of directories. 
     * When the user clicks on an unexpanded node the node will request four levels of directories below it. 
     * This will eventually end up calling this.handleServerRequest (via nested callbacks)
     * 
     * @param {String} type - Which type of modal is requesting the list. One of either 'load' or 'save'. // TODO: add directory as type
     * @param {String} directory - The directory to expand the files under. Optional -- if unspecified the server will return the directories under ~/.
     */
    requestFileList(type, directory = null) {
        let command = JSON.stringify({ 'command' : 'getfilelist', 'directory' : directory, 'type' : type , 'depth' : 0}); 
        this.socket.send(command);

        // When this replies we will end up in this.handleServerRequest
    }

    /**
     * The file dialog will request additional files from the server if the user selects a folder that the dialog does not have the children for. 
     * This function adds the new files sent by the server to the existing file tree in the appropriate place.
     * 
     * @param {Object} payload - The full data package from the server.
     * @param {String} payload.path - The file path at which the new files should be added. 
     * @param {Array} payload.list - The supplemental files retrieved by the server. 
     * @param {String} payload.modalType - The type of modal that the data should be appended to. Either 'load' or 'save'. 
     */
    handleSupplementalFileRequest(payload) {

        //file tree dialog keeps track of the data stored within it -- however the since the file server retrieves the new data it is responsible for adding it
        let requestingDialog = (payload.modalType === 'load') ? this.fileLoadDialog : this.fileSaveDialog;

        //first two entries in split paths will be '' 'home' and '[user]' and since the file tree starts below those we can safely remove them.
        let splitPaths = payload.path.split('/');
        splitPaths.splice(0,3);
        let formattedPath = splitPaths.join('/');
        console.log('splitPaths', splitPaths);

        let entry = requestingDialog.searchTree(formattedPath);
        if (entry) {
            entry.children = payload.list;
            entry.expand = false;
            requestingDialog.createFileList(payload.list, { 'path': formattedPath, 'list': entry.children });
        } else {
            console.log('could not find', payload.path, 'in the list of files');
        }
    }

    /**
     * Renders a file list fetched by requestFileList in the file tree modal using jstree. 
     * Called in response to a file list returned by the server (itself in response to requestFileList) or by the fileTreeDisplayModal trying to fetch more nodes.
     * 
     * @param {Object} response - Object specifying the list of files on the server machine and which modal it corresponds to.
     *
     * // TODO: some how have a title here ... and suffix list
     */
    displayFileList(response) {
        if (response.type === 'load') {
            this.fileLoadDialog.createFileList(response.data,null,this.lastOpts);
            this.fileLoadDialog.showDialog();
        } else if (response.type === 'save') {
            this.fileSaveDialog.createFileList(response.data,null,this.lastOpts);
            this.fileSaveDialog.showDialog();
        }
    }

    getFileLoadLocation() {
        let command = JSON.stringify({ 'command' : 'getimageloadlocation' }); 
        this.socket.send(command);

    }

    getFileSaveLocation() {
        let command = JSON.stringify({ 'command' : 'getimagesavelocation' });
        this.socket.send(command);
    }

    /**
     * Sets the default load location for the server, i.e. the top level path that requests for files should go to if no path is specified by the user. 
     * Typically this is used during regression testing when many loads and saves will be performed without user interaction.
     * 
     * @param {Object} data - Object containing the server's default file load location.
     */
    setFileLoadLocation(data) {
        console.log('data', data);
        
        let path = data.path ? data.path : data;
        console.log('setting file load location to', path);

        this.fileLoadLocation = path;
    }

    /**
     * Sets the default save location for the server, i.e. the top level path that save requests should write to if no path is specified by the user. 
     * Typically this is used during regression testing when many loads and saves will be performed without user interaction.
     * 
     * @param {Object} data - Object containing the server's default file load location.
     */
    setFileSaveLocation(data) {
        console.log('data', data);
        
        let path = data.path ? data.path : data;
        console.log('setting file save location to', path);

        this.fileLoadLocation = path;
    }

    /**
     * downloads a file from the server 
     * @param{String} url - the filename
     * @param{Boolean} isbinary - if true file is binary
     * @returns a Promise with payload { obj.name obj.data } much like bis_genericio.read (from where it will be called indirectly)
     */
    downloadFile(url,isbinary) {
        return new Promise( (resolve, reject) => {
            let command = JSON.stringify({ 'command' : 'readfile',
                                           'filename' : url,
                                           'isbinary' : isbinary });
            
            var cblistener = document.addEventListener(TRANSMISSION_EVENT , (e) => { 
                document.removeEventListener(ERROR_EVENT, eblistener);

                if (!isbinary) {
                    resolve({
                        'data' : e.detail,
                        'filename' : url,
                    });
                } else {
                    let dat = new Uint8Array(e.detail);
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
            }, { 'once' : true });
            
            var eblistener = document.addEventListener(ERROR_EVENT, () => { 
                document.removeEventListener(TRANSMISSION_EVENT, cblistener);
                reject('An error occured during transmission'); 
            }, { 'once' : true });
            
            this.socket.send(command);
        });
    }

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
     * Packages the relevant parameters and functionality for downloading data from the local filesystem into an object that can be invoked by bis_genericio.
     * 
     * @param {Object} params - Parameters object containing the following
     */
    invokeReadFilenameCallbackFunction(params) {
        this.callback(params.paths[0]);
    }

    /**
     * Packages the relevant parameters and functionality for uploading data to the local filesystem into an object that can be invoked by bis_genericio.
     * 
     * @param {Object} params - Parameters object c
     */
    invokeWriteFilenameCallbackFunction(params) {
        console.log('callback in invokeWriteFilename', this.callback);
        this.callback(params.name);
    }

    /**
     * Sends a list of files for the server to send to the client machine. 
     * 
     * @param {String} filelist - The name of a file to fetch from the server. 
     */
    sendFileRequest(file, cb, eb) {
        let command = { 'command' : 'readfile', 'filename' : file };
        let filesdata = JSON.stringify(command);

        let cblistener = document.addEventListener(TRANSMISSION_EVENT , () => { 
            document.removeEventListener('errorevent', eblistener);
            cb(); 
        }, { 'once' : true });

        let eblistener = document.addEventListener(ERROR_EVENT, () => { 
            document.removeEventListener(TRANSMISSION_EVENT, cblistener); 
            eb(); 
        }, { 'once' : true });

        this.socket.send(filesdata);
    }

    /**
     * Sends a request to the server to run a given module on a given input.
     * Sends the name of a module and the module's parameters to the server.
     * 
     * TODO: Implement this function!
     * @param parameters - The list of parameters for the module, including the module's name. See module documentation for more details. 
     */
    sendInvocationRequest(parameters) {
        let params = JSON.stringify(parameters);
        this.socket.send(params);
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

    /**
     * Takes raw input from the server, formats it as a proper BisImage and displays it. 
     * Note that the server transfers images in binary form to avoid wasting space converting it to UTF-8 or a similar encoding. 
     *  
     * this.callback is attached to bisweb_fileserver when a bisweb_filedialog modal is opened. 
     * Given that modals are opened one at a time and all user-driven file I/O happens through one of these, the callback should be a
     * @param {TypedArray|String} data - data transferred by the server either uint8array or text (depending on isbinary)
     * @param {Boolean} isbinary - if true data is binary
     */
    handleDataReceivedFromServer(data,isbinary=true) {

        if (isbinary) {

            console.log('Data is binary blob');
            
            let reader = new FileReader();
            
            //filedialog does actions when an image is loaded (dismisses loading messages, etc.)
            //so notify once the data is loaded
            reader.addEventListener('loadend', () => {
                //notify the Promise created by invokeReadFilenameCallbackFunction 
                let dataLoadEvent = new CustomEvent(TRANSMISSION_EVENT, { detail : reader.result });
                document.dispatchEvent(dataLoadEvent);
            });
            reader.readAsArrayBuffer(data);
        } else {
            let dataLoadEvent = new CustomEvent(TRANSMISSION_EVENT, { detail : data });
            document.dispatchEvent(dataLoadEvent);
        }
    }

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
     * Checks whether the user has authenticated with the fileserver. Performs the command if they have, otherwise prompts the user to login.
     * 
     * //TODO: Add dialog title in gui:
     * //TODO: Add list of allowed suffixes:
     *
     * @param {String} command - A string indicating the command to execute. 
     * @param {Object} opts - An options object
     * @param {Function} opts.callback - A callback function propagated from bis_webfileutil that will handle the non-AWS I/O for the retrieved data, , and a list of acceptable file suffixes.
     * @param {String} opts.title - The title to display on the load/save modal
     */
    wrapInAuth(command, opts) {

        this.lastCommand=command;
        this.lastOpts=opts;
        
        if (this.authenticated) {
            if (command==='showfiles') {
                this.requestFileList('load', null); 
                this.callback = opts.callback; 
            } else if (command==='uploadfile') {
                this.requestFileList('save', null); 
                this.callback = opts.callback; 
            } else {
                console.log('unrecognized command', command);
            }
        } else if (insecure) {
            this.password="";
            this.connectToServer('ws://localhost:8081');
        } else {
            this.showAuthenticationDialog();
            // make this call us back ...
        }
    }
}

module.exports = BisWebFileServerClient;
