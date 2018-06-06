const $ = require('jquery');
const webutil = require('bis_webutil.js');
const wsutil = require('../../fileserver/wsutil.js');
const jstree = require('jstree');

class FileServer extends HTMLElement {

    constructor() {
        super();
    }

    /**
     * Attaches the algorithm controller to the tree viewer and attaches the event to place the tree viewer's menu in the shared menubar once the main viewer renders.
     */
    connectedCallback() {
        let socket;

        //File tree requests display the contents of the disk on the server machine in a modal
        this.fileTreeDisplayModal = webutil.createmodal('File Tree', 'modal-lg');
        this.fileTreeDisplayModal.dialog.find('.modal-footer').remove();
        this.treeModalConfigured = false;

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
                        'javascript/bisweb/data/a1.nii.gz'
                    ];

                    this.sendFileRequest(socket, {
                        command : 'getfile',
                        files : files
                    });
                });

                webutil.createMenuItem(serverMenu, 'Show Server Files', () => {
                    this.requestFileList(socket);
                });
            }

            socket = this.connectToServer();
        });

    }

    connectToServer() {
        let socket = new WebSocket('ws://localhost:8081');

        socket.addEventListener('error', (event) => {
            console.log('An error occured', event);
        });

        socket.addEventListener('message', (event) => {
            console.log('received data', event);
            let data;

            //parse stringified JSON if the transmission is text
            if (typeof(event.data) === "string") {
                try {
                    data = JSON.parse(event.data);
                } catch(e) {
                    console.log('an error occured while parsing event.data', e);
                    return;
                }
            } else {
                data = event.data;
            }

            switch (data.type) {
                case 'filelist' : this.displayFileList(data.payload); break;
                case 'error' : console.log('Error from client:', data.payload); break;
                default : console.log('received a binary transmission -- interpreting as an image'); this.handleImageTransmission(event.data);
            }    
        });

        return socket;
    }

    requestFileList(socket) {
        let command = JSON.stringify({ 'command' : 'show' }); 
        socket.send(command);

        let loadMessage = $('<div>Loading files from server...</div>')
        this.fileTreeDisplayModal.body.append(loadMessage);
        this.fileTreeDisplayModal.dialog.modal('show');

        //configure modal jstree events, if they have not been configured already
        if (!this.treeModalConfigured) {
            $(this.fileTreeDisplayModal.body).on('open_node.jstree', (event, data) => {
                data.instance.set_icon(data.node, 'glyphicon glyphicon-folder-open');
            });

            $(this.fileTreeDisplayModal.body).on('close_node.jstree', (event, data) => {
                data.instance.set_icon(data.node, 'glyphicon glyphicon-folder-close');
            });

            $(this.fileTreeDisplayModal.dialog).on('hidden.bs.modal', () => {
                this.fileTreeDisplayModal.body.remove();
                
                let newBody = $('<div class="modal-body"</div>');
                console.log('fileTreeDisplayModal', this.fileTreeDisplayModal);
                this.fileTreeDisplayModal.dialog.find('.modal-content').append(newBody);
                this.fileTreeDisplayModal.body = newBody;
            });

            this.treeModalConfigured = true;
        }
    }

    displayFileList(list) {
        this.fileTreeDisplayModal.body.empty();

        console.log('list', list);
        this.fileTreeDisplayModal.body.jstree({
            'core' : {
                'data' : list
            },
            'types' : {
                'default' : {
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

    sendFileRequest(socket, files = null) {
        let filesdata = JSON.stringify(files);
        socket.send(filesdata);
    }

    handleImageTransmission(data) {
        let reader = new FileReader();
        reader.addEventListener('loadend', () => {
            let rawData = new Uint8Array(reader.result);
            this.algorithmcontroller.sendImageToViewer(rawData, { viewername: this.defaultViewer });
        });

        reader.readAsArrayBuffer(data);
    }
}

webutil.defineElement('bisweb-fileserver', FileServer);
