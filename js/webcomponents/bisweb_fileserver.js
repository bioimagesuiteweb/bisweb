const $ = require('jquery');
const webutil = require('bis_webutil.js');
const wsutil = require('../../fileserver/wsutil.js');
const jstree = require('jstree');
const BisImage = require('bisweb_image.js');
const zlib = require('zlib');

class FileServer extends HTMLElement {

    constructor() {
        super();
    }

    /**
     * Attaches the algorithm controller to the tree viewer and attaches the event to place the tree viewer's menu in the shared menubar once the main viewer renders.
     */
    connectedCallback() {
        let socket;

        //standard event listener attached to the socket needs to be switched out sometimes so need to keep track of it
        this.clientSocketListener = undefined;

        //File tree requests display the contents of the disk on the server machine in a modal
        this.fileTreeDisplayModal = webutil.createmodal('File Tree', 'modal-lg');
        this.fileTreeDisplayModal.dialog.find('.modal-footer').remove();

        //Save image requests pop up a modal dialog with a text entry field
        this.saveImageModal = null;

        webutil.runAfterAllLoaded(() => {
            let menuBarID = this.getAttribute('bis-menubarid');
            let menuBar = document.querySelector(menuBarID).getMenuBar();

            let algorithmControllerID = this.getAttribute('bis-algorithmcontrollerid');
            this.algorithmcontroller = document.querySelector(algorithmControllerID);

            if (menuBar) {
                let serverMenu = webutil.createTopMenuBarMenu('Server', menuBar);
                webutil.createMenuItem(serverMenu, 'Connect to File Server', () => {
                    socket = this.connectToServer();
                });

                webutil.createMenuItem(serverMenu, 'Request Files', () => {
                    let files = [
                        '/home/zach/MNI_2mm_buggy.nii.gz'
                    ];

                    this.sendFileRequest(socket, {
                        'command' : 'getfile',
                        'files' : files
                    });
                });

                webutil.createMenuItem(serverMenu, 'Show Server Files', () => {
                    this.requestFileList(socket);
                });

                webutil.createMenuItem(serverMenu, 'Upload File to Server', () => {
                    this.createSaveImageDialog(socket);
                });

                webutil.createMenuItem(serverMenu, 'Invoke Module on Server', () => {
                    this.sendInvocationRequest(socket, {
                        'command' : 'runmodule',
                        'params' : {
                            'modulename' : 'smoothImage',
                            'inputs' : [ '/home/zach/MNI_2mm_buggy.nii.gz' ],
                            'args' : {}
                        }
                    });
                });
            }

            socket = this.connectToServer();
        });

    }

    /**
     * Initiates a connection to the fileserver on port 8081 and adds an event handler to socket.message to interpret transmissions from the server. 
     * Note that the handshaking protocol is handled entirely by the native Javascript WebSocket API.
     * 
     * @returns A socket representing a successful connection, null otherwise.
     */
    connectToServer() {
        let socket = new WebSocket('ws://localhost:8081');

        socket.addEventListener('error', (event) => {
            console.log('An error occured', event);
        });

        this.clientSocketListener = (event) => {
            console.log('received data', event);
            let data;

            //parse stringified JSON if the transmission is text
            if (typeof(event.data) === "string") {
                try {
                    data = JSON.parse(event.data);
                } catch(e) {
                    console.log('an error occured while parsing event.data', e);
                    return null;
                }
            } else {
                data = event.data;
            }

            switch (data.type) {
                case 'filelist' : this.displayFileList(data.payload); break;
                case 'error' : console.log('Error from client:', data.payload); break;
                default : console.log('received a binary transmission -- interpreting as an image'); this.handleImageTransmission(event.data);
            } 
        };

        socket.addEventListener('message', this.clientSocketListener);
        return socket;
    }

    /**
     * Sends a request for a list of the files on the server machine and prepares the display modal for the server's reply. 
     * Once the list of files arrives it is rendered using jstree. The user may request individual files from the server using this list. 
     * 
     * @param {Socket} socket - A socket representing the connection between client and server (see connectToServer).
     */
    requestFileList(socket) {
        let command = JSON.stringify({ 'command' : 'show' }); 
        socket.send(command);

        let loadMessage = $('<div>Loading files from server...</div>')
        this.fileTreeDisplayModal.body.append(loadMessage);
        this.fileTreeDisplayModal.dialog.modal('show');

        //set up file tree events while data is loading
        $(this.fileTreeDisplayModal.body).on('open_node.jstree', (event, data) => {
            data.instance.set_icon(data.node, 'glyphicon glyphicon-folder-open');
        });

        $(this.fileTreeDisplayModal.body).on('close_node.jstree', (event, data) => {
            data.instance.set_icon(data.node, 'glyphicon glyphicon-folder-close');
        });

        $(this.fileTreeDisplayModal.body).on('select_node.jstree', (event, data) => {
            console.log('data', data);
            if (data.node.type === 'file') {
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

    /**
     * Renders a file list fetched by requestFileList in the file tree modal using jstree.
     * 
     * @param {Object} list - List of files on the server machine.
     */
    displayFileList(list) {
        this.fileTreeDisplayModal.body.empty();
        console.log('list', list);
        this.fileTreeDisplayModal.body.jstree({
            'core' : {
                'data' : list,
                'dblclick_toggle' : false
            },
            'types' : {
                'default' : {
                    'icon' : 'glyphicon glyphicon-file'
                },
                'file' : {
                    'icon' : 'glyphicon glyphicon-file'
                },
                'root' : {
                    'icon' : 'glyphicon glyphicon-home'
                },
                'directory' : {
                    'icon' : 'glyphicon glyphicon-folder-close'
                }
            },
            'plugins' : ["types"]
        });
    }

    /**
     * Sends a list of files for the server to upload to the client machine. 
     * 
     * @param {Socket} socket - A socket representing the connection between client and server (see connectToServer).
     * @param {Array} filelist - An array of files to fetch from the server. 
     */
    sendFileRequest(socket, filelist = null) {
        let filesdata = JSON.stringify(filelist);
        socket.send(filesdata);
    }

    sendInvocationRequest(socket, parameters) {
        let params = JSON.stringify(parameters);
        socket.send(params);
    }

    /**
     * Sends a file from the client to the server to be saved on the server machine. Large files are sliced and transmitted in chunks. 
     * 
     * @param {Socket} socket - A socket representing the connection between client and server (see connectToServer).
     * @param {BisImage|BisMatrix|BisTransform} file - The file to save to the server. 
     * @param {String} name - What the filed should be named once it is saved to the server. 
     */
    uploadFileToServer(socket, file, name) {
        let packetSize = 50000;
        let clientSocketListener = this.clientSocketListener;

        //serialize the BisImage to a purely binary format
        let serializedImage = file.serializeToNII();
        console.log('serializedImage', serializedImage);

        switch (file.jsonformatname) {
            case 'BisImage' : 
                socket.send(JSON.stringify({
                    'command' : 'uploadimage', 
                    'totalSize' : serializedImage.length, 
                    'packetSize' : packetSize,
                    'storageSize' : file.internal.imgdata.BYTES_PER_ELEMENT,
                    'header' : file.header,
                    'filename' : name
                }));

                doImageTransfer(file.internal.imgdata); 
                break;
            default : console.log('unrecognized jsonformatname', file.jsonformatname, 'cannot send');
        }

        //transfer image in 100KB chunks, wait for acknowledge from server
        function doImageTransfer(image) {
            let remainingTransfer = serializedImage, currentTransferIndex = 0;
            let transferListener = (event) => {
                let data;
                if (typeof (event.data) === "string") {
                    try {
                        data = JSON.parse(event.data);
                    } catch (e) {
                        console.log('an error occured while parsing event.data', e);
                        return null;
                    }
                } else {
                    data = event.data;
                }

                console.log('data', data);
                switch (data.type) {
                    case 'nextpacket' : 
                        let slice = (currentTransferIndex + packetSize >= remainingTransfer.size) ? 
                                    remainingTransfer.slice(currentTransferIndex) :
                                    remainingTransfer.slice(currentTransferIndex, currentTransferIndex + packetSize);
                        socket.send(slice);
                        currentTransferIndex = currentTransferIndex + slice.length;
                        break;
                    case 'uploadcomplete' :
                        socket.removeEventListener('message', transferListener);
                        socket.addEventListener('message', clientSocketListener);
                        break;
                    default : console.log('received unexpected message', event, 'while listening for server responses');
                }
            };

            socket.removeEventListener('message', clientSocketListener);
            socket.addEventListener('message', transferListener);
        }
    }

    /**
     * Takes raw input from the server, formats it as a proper BisImage and displays it. 
     * Note that the server transfers images in binary form to avoid wasting space converting it to UTF-8 or a similar encoding. 
     *  
     * @param {Uint8Array} data - Image transferred by the server. 
     */
    handleImageTransmission(data) {

        let reader = new FileReader();

        //image is sent compressed for portability reasons, then decompressed here
        reader.addEventListener('loadend', () => {
            let unzippedFile = wsutil.unzipFile(reader.result);

            let loadedImg = new BisImage();
            loadedImg.initialize();
            loadedImg.parseNII(unzippedFile.buffer, true);

            this.algorithmcontroller.sendImageToViewer(loadedImg, { viewername: this.defaultViewer });
        });

        reader.readAsArrayBuffer(data);
    }

    createSaveImageDialog(socket) {
        let saveDialog = $(`<p>Please enter a name for the current image on the viewer. Do not include a file extension.</p>`);
        let nameEntryBox = $(`
                <div class='form-group'>
                    <label for='filename'>Filename:</label>
                    <input type='text' class = 'form-control'>
                </div>
            `);

        if (!this.saveImageModal) {
            this.saveImageModal = webutil.createmodal('Save Current Image?', 'modal-sm');
            this.saveImageModal.dialog.find('.modal-footer').find('.btn').remove();

            let confirmButton = webutil.createbutton({ 'name': 'Confirm', 'type': 'btn-success' });
            let cancelButton = webutil.createbutton({ 'name': 'Cancel', 'type': 'btn-danger' });

            this.saveImageModal.footer.append(confirmButton);
            this.saveImageModal.footer.append(cancelButton);

            $(confirmButton).on('click', () => {
                let image = this.algorithmcontroller.getImage('viewer', 'image');
                let name = nameEntryBox.find('.form-control')[0].value;
                this.uploadFileToServer(socket, image, name);

                let imageSavingDialog = $(`<p>Uploading image to file server...</p>`);
                this.saveImageModal.body.empty();
                this.saveImageModal.body.append(imageSavingDialog);

                //listen for end of transmission
                let endOfTransmissionListener = (e) => {
                    let message = wsutil.parseJSON(e.data);
                    if (message.type === 'uploadcomplete') {
                        socket.removeEventListener(socket, endOfTransmissionListener);
                        let transmissionCompleteMessage = $(`<p>Upload completed successfully.</p>`);
                        this.saveImageModal.body.empty();
                        this.saveImageModal.body.append(transmissionCompleteMessage);
                        setTimeout(() => { this.saveImageModal.dialog.modal('hide'); }, 1500);
                    }
                }
                socket.addEventListener('message', endOfTransmissionListener);
            });

            $(cancelButton).on('click', () => {
                this.saveImageModal.dialog.modal('hide');
            });

            //clear name entry input when modal is closed
            $(this.saveImageModal.dialog).on('hidden.bs.modal', () => {
                this.saveImageModal.body.empty();
            });
        }

        this.saveImageModal.body.append(saveDialog);
        this.saveImageModal.body.append(nameEntryBox);

        this.saveImageModal.dialog.modal('show');
    }
}

webutil.defineElement('bisweb-fileserver', FileServer);
