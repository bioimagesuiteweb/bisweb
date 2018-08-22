const bisweb_fileserverclient = require('bisweb_fileserverclient.js');
const bis_genericio = require('bis_genericio.js');
const webutil = require('bis_webutil.js');
const wsutil = require('wsutil.js');

const FileServer = new bisweb_fileserverclient();
bis_genericio.setFileServerObject(FileServer);

let connectToServer = () => {
    return new Promise( (resolve, reject) => {

        webutil.runAfterAllLoaded( () => {
            FileServer.connectToServer();

            console.log('Fileserver socket', FileServer.socket);
            let timeoutEvent = setTimeout( () => {
                reject('server timed out waiting for goodAuth message');
            }, 5000);

            let goodAuthListener = FileServer.socket.addEventListener('message', (event) => {
                let data = wsutil.parseJSON(event.data);
                if (data.type === 'goodauth') {
                    FileServer.socket.removeEventListener('message', goodAuthListener);
                    clearTimeout(timeoutEvent);
                    resolve();
                }
            });
        });
    });
};

let uploadImage = () => {
    return new Promise( (resolve, reject) => {

    });
};

module.exports = {
    connectToServer : connectToServer,
    uploadImage : uploadImage
};