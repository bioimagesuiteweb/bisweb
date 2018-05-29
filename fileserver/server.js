require('../config/bisweb_pathconfig.js');

const $ = require('jquery');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto');
const zlib = require('zlib');
const os = require('os');
const wsutil = require('./wsutil.js');
const genericio = require('bis_genericio.js');

//'magic' string for WebSockets
//https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
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

            //console.log('headers', headers);

            //create Sec-WebSocket-Accept hash (see documentation)
            let shasum = crypto.createHash('sha1');
            websocketKey = websocketKey + SHAstring;
            shasum.update(websocketKey);
            let acceptKey = shasum.digest('base64');
            response = response + acceptKey + '\r\n\r\n';

            //unbind the handshake protocol and listen for data frames
            socket.removeListener('data', handshake);
            prepareForDataFrames(socket);

            socket.write(response, 'utf-8');
        };
        
        socket.on('data', handshake);
        socket.on('close', (e) => { console.log('connection terminated', e); });

    });

    server.listen(8081, 'localhost');

    console.log('listening for incoming connections...');
};

/**
 * Prepares the socket to receive chunks of data from the client. 
 * This involves XORing the payload and decoding it to UTF-8, then performing file I/O based on the contents.
 * @param {Socket} socket - Node.js net socket between the client and server for the transmission.
 */
prepareForDataFrames = (socket) => {
    //add an error listener for the transmission
    socket.on('error', (error) => {
        console.log('an error occured', error);
    });

    socket.on('data', (chunk) => {
        let controlFrame = chunk.slice(0, 14);
        let parsedControl = wsutil.parseControlFrame(controlFrame);
        console.log('parsed control frame', parsedControl, 'raw control frame', controlFrame);

        let decoded = new Uint8Array(parsedControl.payloadLength);
        console.log('decoded', decoded);

        //decode the raw data (undo the XOR)
        for (let i = 0; i < parsedControl.payloadLength; i++) {
            decoded[i] = chunk[i + parsedControl.datastart] ^ parsedControl.mask[i % 4];
        }

        //text from the server means a file request
        switch (parsedControl.opcode) {
            case 1 : handleFileRequestFromClient(decoded, parsedControl, socket); break;
            case 8 : handleCloseFromClient(decoded, parsedControl, socket);
        }

    });
}

handleFileRequestFromClient = (rawText, control, socket) => {
    let text = wsutil.decodeUTF8(rawText, control);
    console.log('text', text);

    let parsedText;
    try {
        parsedText = JSON.parse(text);
    } catch(e) {
        console.log('an error occured while parsing the data from the client', e);
    }

    //TODO: Make this less grossly memory inefficient
    //https://nodejs.org/api/buffer.html#buffer_buffers_and_typedarray
    let files = parsedText.files;
    for (let file of files) {

        file = os.homedir() + '/' + file;

        //check whether file is valid before trying to read it
        checkValidPath(file).then( () => {
            fs.readdir(file, (err, result) => {
                console.log('contents of "file"', result);
            });

            fs.readFile(file, (err, result) => {
                //zlib.gzip(data, (err, result) => {
                    let controlFrame = wsutil.formatControlFrame(2, result.length);
                    let packetHeader = Buffer.from(controlFrame.buffer);
                    let packet = Buffer.concat([packetHeader, result]);
    
                    console.log('sending control frame', wsutil.parseControlFrame(packetHeader), 'raw frame', packetHeader);
                    console.log('packet', packet);
                    socket.write(packet, () => { console.log('write done.'); });
                //});
            });
        }).catch( (error) => {
            console.log('Error in file request', error);
            handleBadRequestFromClient(error, socket);
        });
    }
}

handleBadRequestFromClient = (reason, socket) => {
    let payload = "An error occured while handling your request. "
    payload = Buffer.from(payload.concat(reason));

    let controlFrame = wsutil.formatControlFrame(1, payload.length);
    let packetHeader = Buffer.from(controlFrame.buffer);
    let packet = Buffer.concat([packetHeader, payload]);
    socket.write(packet, () => { console.log('request returned an error', reason, '\nsent error to client'); });
};

handleCloseFromClient = (rawText, control, socket) => {
    let text = wsutil.decodeUTF8(rawText, control);
    console.log('received CLOSE frame from client');
    console.log('reason:', text);

    //TODO: send a close frame in response
    socket.end();
    console.log('closed connection');
}

checkValidPath = (filepath) => {
    return new Promise( (resolve, reject) => {
        let pathCheck = (path) => {
            if (path === '') { resolve(); return; }
            
            //console.log('checking path', path);
            fs.lstat(path, (err, stats) => {
                if (err) { console.log('err', err); reject('An error occured while statting filepath. Is there something on the path that would cause issues?'); return; }
                if (stats.isSymbolicLink()) { reject('Symbolic link in path of file request.'); return; }

                //look one directory up
                let newPath = path.split('/');
                newPath.splice(newPath.length - 1, 1);
                pathCheck(newPath.join('/'));
            });
        }
        
        pathCheck(filepath);
    });

};

module.exports = {
    loadMenuBarItems : loadMenuBarItems,
    loadLocalFiles : loadLocalFiles
}