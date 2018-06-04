const $ = require('jquery');
const webutil = require('bis_webutil.js');
const wsutil = require('../../fileserver/wsutil.js');

class FileServer extends HTMLElement {

    constructor() {
        super();
    }

    /**
     * Attaches the algorithm controller to the tree viewer and attaches the event to place the tree viewer's menu in the shared menubar once the main viewer renders.
     */
    connectedCallback() {
        let socket;

        webutil.runAfterAllLoaded(() => {
            let menuBarID = this.getAttribute('bis-menubarid');
            let menuBar = document.querySelector(menuBarID).getMenuBar();

            let algorithmControllerID = this.getAttribute('bis-algorithmcontrollerid');
            this.algorithmcontroller = document.querySelector(algorithmControllerID);

            if (menuBar) {
                let serverMenu = webutil.createTopMenuBarMenu('Server', menuBar);
                webutil.createMenuItem(serverMenu, 'Connect to File Server', () => {
                    socket = this.connectToServer();

                    socket.addEventListener('message', (event) => {
                        console.log('received data', event);
                        
                        switch (event.data.type) {
                            case 'image' : this.handleImageTransmission(event.data.data); break;
                            default : console.log('Received transmission with unknown type', event.data.type);
                        }
                        
                    });
                });

                webutil.createMenuItem(serverMenu, 'Request Files', () => {
                    let files = {
                        files: [
                            'javascript/bisweb/data/notmine.txt'
                        ]
                    };
                    this.sendFileRequest(socket, files);
                });
            }
        });

    }

    connectToServer() {
        let socket = new WebSocket('ws://localhost:8081');

        socket.addEventListener('error', (event) => {
            console.log('An error occured', event);
        });

        return socket;
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
