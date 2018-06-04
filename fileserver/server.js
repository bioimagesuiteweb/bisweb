require('../config/bisweb_pathconfig.js');

const $ = require('jquery');
const net = require('net');
const crypto = require('crypto');
const zlib = require('zlib');
const os = require('os');

//node extension to make node-like calls work on Windows
//https://github.com/prantlf/node-posix-ext
const posixext = require('posix-ext'),
fs = posixext.fs, process = posixext.process;

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
let prepareForDataFrames = (socket) => {
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

        switch (parsedControl.opcode) {
            case 1 : handleTextRequest(decoded, parsedControl, socket); break;
            case 8 : handleCloseFromClient(decoded, parsedControl, socket);
        }

    });
}

/**
 * Parses a textual request from the client and serves accordingly. 
 * 
 * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
 * @param {Object} control - Parsed WebSocket header for the file request.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place.
 */ 
let handleTextRequest = (rawText, control, socket) => {
    let parsedText = parseClientJSON(rawText);
    
    switch (parsedText.command) {
        case 'show':
        case 'showfiles' : serveFileList(socket); break;
        case 'getfile':
        case 'getfiles':
        case 'file': 
        case 'files': serveFileRequest(rawText, control, socket); break;
        default : console.log('Cannot interpret request with unknown command', parsedText.command);
    }
};

/**
 * Takes a request from the client and returns the requested file or series of files. 
 * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
 * @param {Object} control - Parsed WebSocket header for the file request.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 */
let serveFileRequest = (rawText, control, socket) => {
    let parsedText = parseClientJSON(rawText);

    //TODO: Make this less grossly memory inefficient
    //https://nodejs.org/api/buffer.html#buffer_buffers_and_typedarray
    let files = parsedText.files;
    for (let file of files) {

        file = os.homedir() + '/' + file;

        //check whether filepath contains symlinks before trying anything with the file
        checkValidPath(file).then( () => {

            //disallow requests for files that don't belong to the current user (owner of the current process)
            fs.lstat(file, (err, stat) => {
                let currentUser = process.getuid();
                console.log('current user', currentUser, 'file owner', stat.uid);
                if (stat.uid !== currentUser) { handleBadRequestFromClient(socket, "Cannot download a file that does not belong to the current user. Have you tried changing ownership of the requested file?"); return; } 

                fs.readFile(file, (err, result) => {
                    //compress data before sending? doesn't seem to reduce size by very much
                    //zlib.gzip(data, (err, result) => {

                        let controlFrame = wsutil.formatControlFrame(2, result.length);
                        let packetHeader = Buffer.from(controlFrame.buffer);
                        let packet = Buffer.concat([packetHeader, result]);
        
                        console.log('sending control frame', wsutil.parseControlFrame(packetHeader), 'raw frame', packetHeader);
                        console.log('packet', packet);

                        socket.write(packet, () => { console.log('write done.'); });
                    
                });
            });
            
        }).catch( (error) => {
            console.log('Error in file request', error);
            handleBadRequestFromClient(socket, error);
        });
    }
};

/**
 * Sends the list of available files to the user, hiding files above the ~/ directory.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 */
let serveFileList = (socket) => {

};

/**
 * Sends a message to the client describing the server error that occured during their request. 
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 * @param {String} reason - Text describing the error.
 */
let handleBadRequestFromClient = (socket, reason) => {
    let error = "An error occured while handling your request. "
    error = error.concat(reason);

    let payload = wsutil.formatPayload('error', error);

    let controlFrame = wsutil.formatControlFrame(1, payload.length);
    let packetHeader = Buffer.from(controlFrame.buffer);
    let packet = Buffer.concat([packetHeader, payload]);
    socket.write(packet, () => { console.log('request returned an error', reason, '\nsent error to client'); });
};

/**
 * Closes the server side of the socket gracefully. Meant to be called upon receipt of a 'connection close' packet from the client, i.e. a packet with opcode 8.
 * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
 * @param {Object} control - Parsed WebSocket header for the file request.
 * @param {Socket} socket - WebSocket over which the communication is currently taking place. 
 */
let handleCloseFromClient = (rawText, control, socket) => {
    let text = wsutil.decodeUTF8(rawText, control);
    console.log('received CLOSE frame from client');
    console.log('reason:', text);

    //TODO: send a close frame in response
    socket.end();
    console.log('closed connection');
}

/**
 * Takes a path specifying a file to load on the server machine and determines whether the path is clean, i.e. specifies a file that exists, does not contain symbolic links.
 * Recursively checks every file and directory on the path.
 * @param {String} filepath - Path to check.
 */
let checkValidPath = (filepath) => {
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

let parseClientJSON = (unparsedJSON) => {
    let text = wsutil.decodeUTF8(rawText, control);
    console.log('text', text);

    let parsedText;
    try {
        parsedText = JSON.parse(text);
    } catch(e) {
        console.log('an error occured while parsing the data from the client', e);
    }

    return parsedText;
};


module.exports = {
    loadMenuBarItems : loadMenuBarItems,
    loadLocalFiles : loadLocalFiles
}