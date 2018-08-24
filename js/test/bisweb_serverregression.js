const bisweb_fileserverclient = require('bisweb_fileserverclient.js');
const bis_genericio = require('bis_genericio.js');
const webfileutil = require('bis_webfileutil');
const webutil = require('bis_webutil.js');
const wsutil = require('wsutil.js');
const BiswebImage = require('bisweb_image.js');
const FileServer = new bisweb_fileserverclient();

let setFileMode = () => {
    return new Promise( (resolve) => {
        console.log('webfileutil', webfileutil);
        webfileutil.setMode('server');
        resolve();
    });
};

let connectToServer = () => {
    return new Promise( (resolve, reject) => {

        webutil.runAfterAllLoaded( () => {
            FileServer.connectToServer();

            console.log('Fileserver socket', FileServer.socket);
            let timeoutEvent = setTimeout( () => {
                reject('server timed out waiting for goodAuth message');
            }, 5000);

            let goodAuthListener = (event) => {
                let data = wsutil.parseJSON(event.data);
                if (data.type === 'goodauth') {
                    FileServer.socket.removeEventListener('message', goodAuthListener);
                    bis_genericio.setFileServerObject(FileServer);
                    clearTimeout(timeoutEvent);
                    resolve();
                }
            };
            
            FileServer.socket.addEventListener('message', goodAuthListener);
        });
    });
};

let uploadImage = () => {
    return new Promise((resolve, reject) => {
        let timeoutEvent = setTimeout(() => {
            reject('server timed out waiting for acknowledgment of upload');
        }, 10000);

        console.log('fileserver socket', FileServer.socket);
        bis_genericio.read('/home/zach/javascript/bisweb/js/test/regressionImages/MNI_2mm_orig.nii.gz', true).then((response) => {

            bis_genericio.write('testfile.nii.gz', response.data, true).then(() => {
                clearTimeout(timeoutEvent);
                resolve();
            }).catch((e) => {
                clearTimeout(timeoutEvent);
                reject(e);
            });
        }).catch((e) => {
            reject(e);
        });
    });
};

let downloadImage = () => {
    return new Promise( (resolve, reject) => {
        let timeoutEvent = setTimeout( () => {
            reject('server timed out waiting for acknowledgment of upload');
        }, 6000);

        console.log('fileserver socket', FileServer.socket);
        bis_genericio.read('/home/zach/javascript/bisweb/js/test/regressionImages/MNI_2mm_orig.nii.gz', true).then( () => {
            clearTimeout(timeoutEvent);
            resolve('Read completed successfully');
        }).catch( (e) => {
            clearTimeout(timeoutEvent);
            reject(e);
        });

    });    
};

let uploadAndCompare = () => {
    return new Promise( (resolve, reject) => {
        let timeoutEvent = setTimeout( () => {
            reject('server timed out waiting for acknowledgment of upload');
        }, 10000);

        //TODO: Find way to code a relative filepath
        let testImage = bis_genericio.read('/home/zach/javascript/bisweb/js/test/regressionImages/MNI_2mm_orig.nii.gz', true).then( (response) => {

            let baseData = response.data;

            console.log('response.data', baseData);
            let baseImage = new BiswebImage();
            baseImage.initialize();
            baseImage.parseNII(baseData.buffer, "RAS");

            console.log('testImage', testImage);

            bis_genericio.write('uploadtestfile.nii.gz', response.data, true).then( () => {
                let uploadedImage = new BiswebImage();
                uploadedImage.load('/home/zach/testfile.nii.gz', false).then( () => {

                    clearTimeout(timeoutEvent);
                    let comparisonResult = uploadedImage.compareWithOther(baseImage);
                    if (comparisonResult.testresult === true) {
                        resolve();
                    } else {
                        console.log('comparisonResult', comparisonResult, uploadedImage, baseImage);
                        reject('Uploaded image is not the same as base image', comparisonResult);
                    }
                });
            });

        }).catch( (e) => {
            reject(e);
        });
    });
};

let serverPretests = [
    {
        'name' : 'Set File Mode', 
        'test' : setFileMode
    },
    {
        'name' : 'Connect to Server',
        'test' : connectToServer
    }
];

let serverTests = [
    {
        'name' : 'Upload Image',
        'test' : uploadImage
    },
    {
        'name' : 'Download Image',
        'test' : downloadImage
    },
    {
        'name' : 'Upload and Compare',
        'test' : uploadAndCompare
    }
];

module.exports = {
    connectToServer : connectToServer,
    uploadImage : uploadImage,
    pretests : serverPretests,
    tests : serverTests
};