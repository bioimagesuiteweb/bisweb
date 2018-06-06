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
