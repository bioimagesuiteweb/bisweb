const $ = require('jquery');
const webutil = require('bis_webutil.js');
const wsutil = require('../../fileserver/wsutil.js');
const bisweb_filedialog = require('bisweb_filedialog.js');

class FileServer extends HTMLElement {

    constructor() {
        super();
    }

    /**
     * Attaches the event to place the tree viewer's menu in the shared menubar once the main viewer renders.
     */
    connectedCallback() {

        //connection over which all communication takes place
        this.socket = null;

        //File tree requests display the contents of the disk on the server machine in a modal
        this.fileTreeDialog = new bisweb_filedialog('Local File System');
        this.fileSaveDialog = new bisweb_filedialog('Choose a save location', { 'makeFavoriteButton' : false, 'modalType' : 'save', 'displayFiles' : false  });

        //When connecting to the server, it may sometimes request that the user authenticates
        this.authenticateModal = null;
        this.authenticated = false;
    }

    /**
     * Initiates a connection to the fileserver at the specified address. Note that the handshaking protocol is handled entirely by the native Javascript WebSocket API.
     * Sets this.socket internally, the structure representing the control socket between client and server.
     * 
     * @param {String} address - The hostname and port to try to connect to, e.g. 'ws://localhost:8080'. These addresses must be prefixed with 'ws://' 
     */
    connectToServer(address = 'ws://localhost:8081') {
        if (this.socket) { this.socket.close(1000, 'Restarting connection'); }

        try {
            this.socket = new WebSocket(address);
        } catch(e) {
            console.log('error', e);
        }

        console.log('socket', this.socket);
        //file tree dialog needs to be able to call some of file server's code 
        //they are separated for modularity reasons, so to enforce the hierarchical relationship between the two fileserver provides the functions and the socket
        this.fileTreeDialog.fileListFn = this.requestFileList;
        this.fileTreeDialog.fileRequestFn = this.createFileDownloadRequest.bind(this);
        this.fileTreeDialog.socket = this.socket;

        this.fileSaveDialog.fileRequestFn = this.createFileUploadRequest.bind(this);
        this.fileSaveDialog.socket = this.socket;

        //add the event listeners for the control port
        this.socket.addEventListener('close', (event) => {
            console.log('Socket closing', event);
        });

        this.socket.addEventListener('error', (event) => {
            console.log('error event', event);
            webutil.createAlert('An error occured trying to communicate with the server. Please ensure that the process is running, refresh the browser, and retry the connection.', true);
        });


        // Handle Data From Server
        this.socket.addEventListener('message', (event) => {
            this.handleServerResponse(event);
        });
    }

    /** Handles response from server
     * @param {Object} event - an object containing info from server
     */
    handleServerResponse(event) {
        
        console.log('received data', event);
        let data;
        
        //parse stringified JSON if the transmission is text
        if (typeof (event.data) === "string") {
            data = wsutil.parseJSON(event.data);
        } else {
            console.log('received a binary transmission');
            this.handleDataTransmission(event.data);
            return;
        }
        
        switch (data.type)
        {
            case 'authenticate': this.createAuthenticationDialog(); break;
            case 'filelist': this.displayFileList(data.payload); break;
            case 'supplementalfiles': this.handleSupplementalFileRequest(data.payload.path, data.payload.list); break;
            case 'error': {
                console.log('Error from client:', data.payload); 
                let errorEvent = new CustomEvent('servererror', { 'detail' : data.payload });
                document.dispatchEvent(errorEvent);
                break;
            }
            case 'datasocketready': //some control phrases are handled elsewhere, so the main listener should ignore them
            case 'goodauth':
            case 'badauth': break;
            default: console.log('received a transmission with unknown type', data.type, 'cannot interpret');
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
        let command = JSON.stringify({ 'command' : 'show', 'directory' : directory, 'type' : type }); 
        this.socket.send(command);
        // When this replies we will end up in this.handleServerRequest
    }

    /**
     * The file dialog will request additional files from the server if the user selects a folder that the dialog does not have the children for. 
     * This function adds the new files sent by the server to the existing file tree in the appropriate place.
     * 
     * @param {String} path - The file path at which the new files should be added. 
     * @param {Array} list - The children of the file specified by path, including their children to a depth of the server's discretion.
     */
    handleSupplementalFileRequest(path, list) {

        //file tree dialog keeps track of the data stored within it -- however the since the file server retrieves the new data it is responsible for adding it
        console.log('file tree list', this.fileTreeDialog.fileList);

        //first two entries in split paths will be '' 'home' and '[user]' and since the file tree starts below those we can safely remove them.

        let splitPaths = path.split('/');
        splitPaths.splice(0,3);
        let formattedPath = splitPaths.join('/');
        console.log('splitPaths', splitPaths);

        let entry = wsutil.searchTree(formattedPath, this.fileTreeDialog.fileList);
        if (entry) {
            entry.children = list;
            entry.expand = false;
            this.fileTreeDialog.createFileList(list, { 'path': formattedPath, 'list': entry.children });
        } else {
            console.log('could not find', path, 'in the list of files');
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
        console.log('response', response);
        if (response.type === 'load') {
            this.fileTreeDialog.createFileList(response.data);
            this.fileTreeDialog.showDialog();
        } else if (response.type === 'save') {
            this.fileSaveDialog.createFileList(response.data);
            this.fileSaveDialog.showDialog();
        }
    }

    /**
     * Packages the relevant parameters and functionality for downloading data from the local filesystem into an object that can be invoked by bis_genericio.
     * 
     * @param {Object} params - Parameters object containing the following
     * @param {Array} params.files - List of filenames
     * @param {String} params.name - Name of the file to fetch from the server, or what to name the file being saved to the server.
     * @param {Function} cb - Callback on success.
     * @param {Function} eb - Callback on failure.
     */
    createFileDownloadRequest(params, cb, eb) {
        let obj = {
            filename: params.name,
            params: params,
            responseFunction: () => { //TODO: strictly speaking this should have signature (url,isbinary=false)
                return new Promise( (resolve, reject) => {
                    let command = { 'command' : 'getfile', 'files' : params.paths };
                    let filesdata = JSON.stringify(command);

                    let cblistener = document.addEventListener('bisweb_fileserver_transmission' , (e) => { 
                        document.removeEventListener('errorevent', eblistener);
                        cb(); 
                        resolve({
                            'data' : e.detail,
                            'filename' : params.name
                        });

                    }, { 'once' : true });

                    let eblistener = document.addEventListener('servererror', () => { 
                        document.removeEventListener('bisweb_fileserver_transmission', cblistener);
                        reject('An error occured during transmission'); 
                        eb(); 
                    }, { 'once' : true });

                    this.socket.send(filesdata);
                });
            }
        };
        //this.callback is set when a modal is opened.
        this.callback(obj);
    }

    /**
     * Packages the relevant parameters and functionality for uploading data to the local filesystem into an object that can be invoked by bis_genericio.
     * 
     * @param {Object} params - Parameters object containing the following
     * @param {Array} params.files - List of filenames
     * @param {String} params.name - Name of the file to fetch from the server, or what to name the file being saved to the server.
     * @param {Function} cb - Callback on success.
     * @param {Function} eb - Callback on failure.
     * @param {Object} callback.url - The object passed to the callback initially (in this case the object created by createFileUploadRequest). Unused in this function.
     * @param {Uint8Array} callback.body - The data to save
     */
    createFileUploadRequest(params, cb, eb) {
        let obj = {
            filename: params.name,
            params: params,
            responseFunction: (url, body) => { //TODO : isbinary too
                return new Promise( (resolve, reject) => {
                    let promiseCb = () => {
                        cb();
                        resolve('Upload successful');
                    };

                    let promiseEb = () => {
                        eb();
                        reject('Upload failed');
                    };

                    this.uploadFileToServer(obj.filename, body, promiseCb, promiseEb);
                });
            }
        };

        //this.callback is set when a modal is opened.
        this.callback(obj);
    }

    /**
     * Sends a list of files for the server to send to the client machine. 
     * 
     * @param {Array} filelist - An array of files to fetch from the server. 
     */
    sendFileRequest(filelist, cb, eb) {
        let command = { 'command' : 'getfile', 'files' : filelist };
        let filesdata = JSON.stringify(command);

        let cblistener = document.addEventListener('bisweb_fileserver_transmission' , () => { 
            document.removeEventListener('errorevent', eblistener);
            cb(); 
        }, { 'once' : true });

        let eblistener = document.addEventListener('servererror', () => { 
            document.removeEventListener('bisweb_fileserver_transmission', cblistener); 
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
     * @param {TypedArray} body - 
     * @param {Function} cb - A callback for if the transfer is successful. Optional.
     * @param {Function} eb - A callback for if the transfer is a failure (errorback). Optional.
     */
    uploadFileToServer(name, body, cb = () => {}, eb = () => {}) {

        // TODO: is the size of body < packetsize upload in one shot
        
        console.log('cb', cb, 'eb', eb);
        const packetSize = 50000;
        let fileTransferSocket;

        //negotiate opening of the data port
        this.socket.addEventListener('message', (e) => {
            let message;
            try {
                message = JSON.parse(e.data);
                if (message.type === 'datasocketready') {

                    fileTransferSocket = new WebSocket('ws://localhost:8082');
                    fileTransferSocket.addEventListener('open', () => {
                        doDataTransfer(body);
                    });

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
            'command': 'uploadimage',
            'totalSize': body.length,
            'packetSize': packetSize,
            'storageSize': body.byteLength,
            'filename': name
        };

        console.log('sending metadata to server', metadata);
        this.socket.send(JSON.stringify(metadata));


        //transfer image in 50KB chunks, wait for acknowledge from server
        function doDataTransfer(image) {
            let remainingTransfer = image, currentTransferIndex = 0;
           
            //send data in chunks
            let sendDataSlice = () => {
                let slice = (currentTransferIndex + packetSize >= remainingTransfer.size) ?
                    remainingTransfer.slice(currentTransferIndex) :
                    remainingTransfer.slice(currentTransferIndex, currentTransferIndex + packetSize);
                fileTransferSocket.send(slice);
                currentTransferIndex = currentTransferIndex + slice.length;
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
                        fileTransferSocket.close();
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
     * @param {Uint8Array} data - data transferred by the server. 
     */
    handleDataTransmission(data) {

        let reader = new FileReader();

        //filedialog does actions when an image is loaded (dismisses loading messages, etc.)
        //so notify once the image is loaded


        //image is sent compressed for portability reasons, then decompressed here
        reader.addEventListener('loadend', () => {
            let unzippedFile = wsutil.unzipFile(reader.result);

            //notify the Promise created by createFileDownloadRequest 
            let imageLoadEvent = new CustomEvent('bisweb_fileserver_transmission', { detail : unzippedFile });
            document.dispatchEvent(imageLoadEvent);
        });

        reader.readAsArrayBuffer(data);
    }

    /**
     * Creates a small modal dialog to allow the user to enter the session password used to authenticate access to the local fileserver. 
     * Also displays whether authentication succeeded or failed. 
     */
    createAuthenticationDialog() {
        let saveDialog = $(`<p>Please enter the password printed to the console window.</p>`);
        let passwordEntryBox = $(`
                <div class='form-group'>
                    <label for='filename'>Password:</label>
                    <input type='text' class = 'form-control'>
                </div>
            `);

        let authListener = (message) => {
            let data = wsutil.parseJSON(message.data);
            
            switch(data.type) {
                case 'badauth': {
                    let errorMessage = $(`<p>The server rejected the password. Please enter the new password in the server window</p>`);
                    this.authenticateModal.body.find('p').remove();
                    this.authenticateModal.body.prepend(errorMessage);
                    break;
                }
                case 'goodauth': { 
                    let successMessage = $(`<p>Login successful!</p>`);
                    this.authenticateModal.body.find('p').remove();
                    this.authenticateModal.body.prepend(successMessage);
                    setTimeout(() => { this.authenticateModal.dialog.modal('hide'); }, 1500);
                    this.socket.removeEventListener('message', authListener);
                    this.authenticated = true;
                    break;
                }
                default:  
                    console.log('heard unknown data type', data.type);
            }
        };

        if (!this.authenticateModal) {
            this.authenticateModal = webutil.createmodal('Enter the Session Password', 'modal-sm');
            this.authenticateModal.dialog.find('.modal-footer').find('.btn').remove();

            let confirmButton = webutil.createbutton({ 'name': 'Confirm', 'type': 'btn-success' });
            let cancelButton = webutil.createbutton({ 'name': 'Cancel', 'type': 'btn-danger' });

            this.authenticateModal.footer.append(confirmButton);
            this.authenticateModal.footer.append(cancelButton);

            $(confirmButton).on('click', () => {
                let password = this.authenticateModal.body.find('.form-control')[0].value;
                this.socket.send(password);
            });

            $(cancelButton).on('click', () => {
                this.authenticateModal.dialog.modal('hide');
            });

            //clear name entry input when modal is closed
            $(this.authenticateModal.dialog).on('hidden.bs.modal', () => {
                this.authenticateModal.body.empty();
            });
        }

        this.socket.addEventListener('message', authListener);

        this.authenticateModal.body.append(saveDialog);
        this.authenticateModal.body.append(passwordEntryBox);

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
        if (this.authenticated) {
            switch(command) {
                case 'showfiles' : 
                    this.requestFileList('load'); 
                    this.callback = opts.callback; 
                    break;
                case 'uploadfile' : 
                    this.requestFileList('save'); 
                    this.callback = opts.callback; 
                    break;
                default : console.log('unrecognized command', command);
            }
        } else {
            this.connectToServer();
        }
    }
}

module.exports = FileServer;
webutil.defineElement('bisweb-fileserver', FileServer);
