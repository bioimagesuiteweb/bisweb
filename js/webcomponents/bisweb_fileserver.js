const $ = require('jquery');
const webutil = require('bis_webutil.js');
const wsutil = require('../../fileserver/wsutil.js');
const bisweb_filedialog = require('bisweb_filedialog.js');
const BisImage = require('bisweb_image.js');

class FileServer extends HTMLElement {

    constructor() {
        super();
    }

    /**
     * Attaches the algorithm controller to the tree viewer and attaches the event to place the tree viewer's menu in the shared menubar once the main viewer renders.
     */
    connectedCallback() {

        //connection over which all communication takes place
        this.socket = null;

        //File tree requests display the contents of the disk on the server machine in a modal
        this.fileTreeDialog = new bisweb_filedialog('Local File System');
        this.fileSaveDialog = new bisweb_filedialog('Choose a save location', { 'makeFavoriteButton' : false, 'modalType' : 'save', 'displayFiles' : false  });

        //Save image requests pop up a modal dialog with a text entry field
        this.saveImageModal = null;

        //When connecting to the server, it may sometimes request that the user authenticates
        this.authenticateModal = null;
        this.authenticated = false;

        //server will set this value when opening a bisweb_filedialog
        this.viewer = undefined; 

        webutil.runAfterAllLoaded(() => {
            let menuBarID = this.getAttribute('bis-menubarid');
            let menuBar = document.querySelector(menuBarID);

            let algorithmControllerID = this.getAttribute('bis-algorithmcontrollerid');
            this.algorithmcontroller = document.querySelector(algorithmControllerID);

            if (menuBar) {
                menuBar = menuBar.getMenuBar();
                let serverMenu = webutil.createTopMenuBarMenu('Server', menuBar);

                webutil.createMenuItem(serverMenu, 'Connect to File Server', () => {
                    this.connectToServer();
                });

                webutil.createMenuItem(serverMenu, 'Request Files', () => {
                    let files = [
                        '/home/zach/MNI_2mm_buggy.nii.gz'
                    ];

                    this.sendFileRequest(files);
                });

                webutil.createMenuItem(serverMenu, 'Show Server Files', () => {
                    this.requestFileList();
                });

                webutil.createMenuItem(serverMenu, 'Upload File to Server', () => {
                    //REPLACED BY CREATESAVEMODAL
                    //this.createSaveImageDialog();
                });

                webutil.createMenuItem(serverMenu, 'Invoke Module on Server', () => {
                    this.sendInvocationRequest({
                        'command' : 'runmodule',
                        'params' : {
                            'modulename' : 'smoothImage',
                            'inputs' : [ '/home/zach/MNI_2mm_buggy.nii.gz' ],
                            'args' : {}
                        }
                    });
                });
            }
        });
    }

    /**
     * Initiates a connection to the fileserver at the specified address. Note that the handshaking protocol is handled entirely by the native Javascript WebSocket API.
     * Sets this.socket internally, the structure representing the control socket between client and server.
     * 
     * @param {String} address - The hostname and port to try to connect to, e.g. 'ws://localhost:8080'. These addresses must be prefixed with 'ws://' 
     */
    connectToServer(address = 'ws://localhost:8081') {
        if (this.socket) { this.socket.close(1000, 'Restarting connection'); }

        this.socket = new WebSocket(address);

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

        this.socket.addEventListener('message', (event) => {
            console.log('received data', event);
            let data;

            //parse stringified JSON if the transmission is text
            if (typeof (event.data) === "string") {
                data = wsutil.parseJSON(event.data);
            } else {
                console.log('received a binary transmission -- interpreting as an image');
                this.handleImageTransmission(event.data);
                return;
            }

            switch (data.type) {
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
        });
    }

    makeRequest(params, cb, eb) {
        let command = params.command;
        let files = this.algorithmcontroller.getImage(this.viewer, 'image');

        switch (params.command) {
            case 'getfile' : 
            case 'getfiles' :  this.sendFileRequest([params.name], cb, eb); break;
            case 'uploadfile' : 
            case 'uploadfiles' : this.uploadFileToServer(params.name, cb, eb); break;
            default : console.log('Cannot execute unknown command', command);
        }
    }

    /**
     * Sends a request for a list of the files on the server machine and prepares the display modal for the server's reply. 
     * Once the list of files arrives it is rendered using jstree. The user may request individual files from the server using this list. 
     * 
     * requestFileList doesn't expand the contents of the entire server file system; just the first four levels of directories. 
     * When the user clicks on an unexpanded node the node will request four levels of directories below it. 
     * 
     * @param {String} type - Which type of modal is requesting the list. One of either 'load' or 'save'.
     * @param {String} directory - The directory to expand the files under. Optional -- if unspecified the server will return the directories under ~/.
     */
    requestFileList(type, directory = null) {
        let command = JSON.stringify({ 'command' : 'show', 'directory' : directory, 'type' : type }); 
        this.socket.send(command);
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
     * Packages the relevant parameters and functionality for downloading an image from the cloud into an object to be invoked by bis_genericio.
     * 
     * @param {Object} params - Parameters object containing the following
     * @param {String} params.command - String name for the command to execute. One of 'getfiles' or 'uploadfiles' as of 7-23-18.
     * @param {String} params.name - Name of the file to fetch from the server, or what to name the file being saved to the server.
     * @param {Function} cb - Callback on success.
     * @param {Function} eb - Callback on failure.
     */
    createFileDownloadRequest(params, cb, eb) {
        let obj = {
            name: params.name,
            params: params,
            responseFunction: () => {
                return new Promise( (resolve, reject) => {
                    let command = { 'command' : 'getfile', 'files' : params.files };
                    let filesdata = JSON.stringify(command);

                    let cblistener = document.addEventListener('imagetransmission' , (e) => { 
                        document.removeEventListener('errorevent', eblistener);
                        cb(); 
                        resolve({
                            'data' : e.detail,
                            'filename' : params.name
                        });

                    }, { 'once' : true });

                    let eblistener = document.addEventListener('servererror', () => { 
                        document.removeEventListener('imagetransmission', cblistener);
                        reject('An error occured during transmission') 
                        eb(); 
                    }, { 'once' : true });

                    this.socket.send(filesdata);
                });
            }
        };
        //this.callback is set when a modal is opened.
        this.callback(obj);
    }

    createFileUploadRequest(params, cb, eb) {
        let obj = {
            name: params.name,
            params: params,
            responseFunction: () => {
                return new Promise( (resolve, reject) => {
                    let command = { 'command' : 'getfile', 'files' : filelist };
                    let filesdata = JSON.stringify(command);

                    let cblistener = document.addEventListener('imagetransmission' , (e) => { 
                        document.removeEventListener('errorevent', eblistener);
                        cb(); 
                        resolve({
                            'data' : e.detail,
                            'filename' : params.name
                        });

                    }, { 'once' : true });

                    let eblistener = document.addEventListener('servererror', () => { 
                        document.removeEventListener('imagetransmission', cblistener);
                        reject('An error occured during transmission') 
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
     * Sends a list of files for the server to send to the client machine. 
     * 
     * @param {Array} filelist - An array of files to fetch from the server. 
     */
    sendFileRequest(filelist, cb, eb) {
        let command = { 'command' : 'getfile', 'files' : filelist };
        let filesdata = JSON.stringify(command);

        let cblistener = document.addEventListener('imagetransmission' , () => { 
            document.removeEventListener('errorevent', eblistener);
            cb(); 
        }, { 'once' : true });

        let eblistener = document.addEventListener('servererror', () => { 
            document.removeEventListener('imagetransmission', cblistener); 
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
     * @param {String} name - What the filed should be named once it is saved to the server. 
     * @param {Function} cb - A callback for if the transfer is successful. Optional.
     * @param {Function} eb - A callback for if the transfer is a failure (errorback). Optional.
     */
    uploadFileToServer(name, cb = () => {}, eb = () => {}) {

        console.log('cb', cb, 'eb', eb);

        let file = this.algorithmcontroller.getImage(this.viewer, 'image');
        let serializedImage = file.serializeToNII();
        let packetSize = 50000;
        let fileTransferSocket;

        //negotiate opening of the data port
        this.socket.addEventListener('message', (e) => {
            let message;
            try {
                message = JSON.parse(e.data);
                if (message.type === 'datasocketready') {

                    fileTransferSocket = new WebSocket('ws://localhost:8082');
                    fileTransferSocket.addEventListener('open', () => {
                        console.log('serializedImage', serializedImage);
                        doImageTransfer(serializedImage);
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


        this.socket.send(JSON.stringify({
            'command': 'uploadimage',
            'totalSize': serializedImage.length,
            'packetSize': packetSize,
            'storageSize': file.internal.imgdata.BYTES_PER_ELEMENT,
            'header': file.header,
            'filename': name
        }));


        //transfer image in 50KB chunks, wait for acknowledge from server
        function doImageTransfer(image) {
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
     * @param {Uint8Array} data - Image transferred by the server. 
     */
    handleImageTransmission(data) {

        let reader = new FileReader();

        //filedialog does actions when an image is loaded (dismisses loading messages, etc.)
        //so notify once the image is loaded


        //image is sent compressed for portability reasons, then decompressed here
        reader.addEventListener('loadend', () => {
            let unzippedFile = wsutil.unzipFile(reader.result);

            //notify the Promise created by createFileDownloadRequest 
            let imageLoadEvent = new CustomEvent('imagetransmission', { detail : unzippedFile });
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
     * @param {String} command - A word representing the command to execute on the server. 
     * @param {Function} callback - A function that will invoke the file upload/download function created by createFileDownloadRequest and createFileUploadRequest.
     */
    wrapInAuth(command, callback) {
        if (this.authenticated) {
            this.viewer = viewer;
            switch(command) {
                case 'showfiles' : 
                    this.requestFileList('load'); 
                    this.callback = callback; 
                    break;
                case 'uploadfile' : 
                    this.requestFileList('save'); 
                    this.callback = callback; 
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

//Moving away from JSTree, but code left here because it might be useful
/*
    requestFileList(socket, directory = null) {
        let command = JSON.stringify({ 'command' : 'show', 'directory' : directory }); 
        socket.send(command);

        let loadMessage = $('<div>Loading files from server...</div>')
        this.fileTreeDisplayModal.body.append(loadMessage);
        this.fileTreeDisplayModal.dialog.modal('show');

        //set up file tree events while data is loading
        $(this.fileTreeDisplayModal.body).on('open_node.jstree', (event, data) => {
            data.instance.set_icon(data.node, 'glyphicon glyphicon-folder-open');
            console.log('data', data);
        });

        $(this.fileTreeDisplayModal.body).on('close_node.jstree', (event, data) => {
            data.instance.set_icon(data.node, 'glyphicon glyphicon-folder-close');
        });

        $(this.fileTreeDisplayModal.body).on('select_node.jstree', (event, data) => {
            console.log('data', data);

            //check whether node should expand directories beneath it.
            if (data.node.original.expand) {
                this.requestFileList(socket, data.node.original.path);
            } else if (data.node.type === 'file') {
                this.sendFileRequest(socket, { 'command' : 'getfile', 'files' : [data.node.original.path] });
            }
        });

        $(this.fileTreeDisplayModal.dialog).on('hidden.bs.modal', () => {
            this.fileTreeDisplayModal.body.remove();

            //jstree changes structure of modal-body after it runs, so modal-body needs to be replaced before reloading the file tree
            let newBody = $('<div class="modal-body"></div>');
            this.fileTreeDisplayModal.dialog.find('.modal-content').append(newBody);
            this.fileTreeDisplayModal.body = newBody;
        });

        //nodes open on double click by default, but you can set them to open on single-click
        //https://github.com/vakata/jstree/issues/953
        $(this.fileTreeDisplayModal.body).on('click', '.jstree-anchor', (e) => {
            $(this.fileTreeDisplayModal.body).jstree(true).toggle_node(e.target);
        });
    }
    */