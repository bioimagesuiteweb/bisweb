const $ = require('jquery');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto'), shasum = crypto.createHash('sha1');
const wsutil = require('./wsutil.js');

const SHAstring = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';


let loadMenuBarItems = () => {
    let menubar = document.getElementById('viewer_menubar');
    let tabContainer = $(menubar).find('.nav.navbar-nav');
    let createMenuBarTab = function(name, parent) {
        let tab = $("<li class='dropdown'>" +
        "<a href='#' class='dropdown-toggle'  data-toggle='dropdown' role='button' aria-expanded='false'>" + name + "<span class='caret'></span></a>" +
        "<ul class='dropdown-menu' role='menu'>" +
        "</ul>" +
        "</li>");

        $(parent).append(tab);

        //usually want the tab so you can add items to the dropdown menu, so return that
        return tab.find('.dropdown-menu');
    };

    let createMenuBarItem = function(name, tab) {
        let item = $(`<li>  <a href="#">${name}</a> </li>`)
        tab.append(item);
        return item;
    };

    let fileTab = createMenuBarTab('Files', tabContainer);
    let fileItem = createMenuBarItem('Load Local Files', fileTab);
    
    fileItem.on('click', () => {
        loadLocalFiles('hello.txt');
    });


    let viewTab = createMenuBarTab('View', tabContainer);
};

let loadLocalFiles = (filename) => {
    fs.readFile(filename, 'utf-8', (err, data) => {
        console.log('file', data);
    });
};

let startServer = () => {
    let server = net.createServer( (socket) => {
        console.log('got connection', socket);
        
        //construct the handshake response
        //https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
        let response = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ";
        
        //parse websocket key out of response
        let websocketKey;
        let handshake = (chunk) => {
            let decodedChunk = new TextDecoder('utf-8').decode(chunk);
            console.log('chunk', decodedChunk);
            let headers = decodedChunk.split('\n');
            
            for (let i = 0; i < headers.length; i++) {
                headers[i] = headers[i].split(':');
            }

            for (let header of headers) {
                if (header[0] === 'Sec-WebSocket-Key') {
                    //remove leading space from key
                    websocketKey = header[1].slice(1, -1);
                }
            }

            console.log('headers', headers);

            websocketKey = websocketKey + SHAstring;
            shasum.update(websocketKey);

            let acceptKey = shasum.digest('base64');
            console.log('acceptKey', acceptKey);

            response = response + acceptKey + '\r\n\r\n';

            console.log('response', response);

            //unbind the handshake protocol and listen for data frames
            socket.removeAllListeners();
            prepareForDataFrames(socket);

            socket.write(response, 'utf-8');
        };
        
        socket.on('data', handshake);

    });

    server.listen(8081);

    console.log('listening for incoming connections...');
};

prepareForDataFrames = (socket) => {
    socket.on('data', (chunk) => {
        console.log('type of data', typeof(chunk));
        let controlFrame = chunk.slice(0, 14);
        let parsedControl = wsutil.parseControlFrame(controlFrame);
        console.log('parsedControl', parsedControl);
        console.log('chunk', chunk);

        let decoded = new Uint8Array(parsedControl.payloadLength);
        console.log('decoded', decoded);
        //decode the raw data (undo the XOR)
        for (let i = 0; i < parsedControl.payloadLength; i++) {
            decoded[i] = chunk[i + parsedControl.datastart] ^ parsedControl.mask[i % 4];
        }
    });
}

module.exports = {
    loadMenuBarItems : loadMenuBarItems,
    loadLocalFiles : loadLocalFiles
}