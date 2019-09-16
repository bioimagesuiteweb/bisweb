const bis_genericio = require('bis_genericio.js');
const bis_util = require('bis_util.js');

/**
 * Runs DICOM file conversion through the fileserver. 
 * 
 * @param {Object} params - Parameter object for the file conversion. 
 * @param {String} params.inputDirectory - The input directory to run file conversions in. 
 * @param {Boolean} external - if true run as an external process
 */
let runDICOMConversion = (params,external=false) => {

    /*let updateFn = (obj) => {
        console.log('update fn', obj);
    };*/

    return new Promise( (resolve, reject) => {
        let fileServerClient = bis_genericio.getFileServerObject();
        if (fileServerClient) {
            fileServerClient.runModule('dicomconversion', params, external,console.log, true)
                .then((obj) => {
                    console.log('Conversion done', obj);
                    resolve(obj);
                }).catch((e) => { reject(e); });
        } else {
            reject('No fileserver defined, cannot run DICOM conversion');
        }
    });
};

/**
 * Runs the pipeline creation module through the file server
 * @param {Object} params - Parameters for the pipeline module 
 */
let runPipelineModule = (params) => {
    let fileServerClient = bis_genericio.getFileServerObject();
    return new Promise( (resolve, reject) => {
        if (fileServerClient) {
            fileServerClient.runModule('pipeline', params, false, console.log, true)
                .then( (obj) => {
                    console.log('Pipeline module done', obj);
                    resolve(obj);
                }).catch( (e) => { reject(e); });
        } else {
            reject('No fileserver defined, cannot run pipeline');
        }
    });
};

/**
 * Makes a SHA256 checksum for a given image file. Currently only functional if a file server is specified.
 * Note that this function only works when calling from the web environment. Bisweb modules calculate their own checksums due to genericio not being directly compatible with modules.
 * 
 * @param {String} url - Filename of image to make checksum for.
 * @param {Boolean} external - if true run as an external process
 * @returns Promise that will resolve the checksum, or false if no file server client is specified.
 */
let makeFileChecksum = (url,external=false ) => {
    let fileServerClient = bis_genericio.getFileServerObject();
    if (fileServerClient) {
        return fileServerClient.runModule('makechecksum', { 'input' : url }, external );
    } else if (bis_genericio.inBrowser()) {
        console.log('Cannot perform makeFileChecksum without a file server client.');
        return false;
    } 

    return new Promise( (resolve, reject) => {
        bis_genericio.read(url, true).then( (obj) => {
            let hash = bis_util.SHA256(obj.data);
            //resolves data structure in an 'output' field for cross-compatibility with objects returned by the server
            if (hash) { resolve( { 'output' : { 'hash' : hash, 'filename' : url } } ); }

            reject(hash);
        }).catch( (e) => {
            reject(e);
        });
    });
};

let runCPMMatrixFileModule = (params) => {
    return new Promise( (resolve, reject) => {
        let fileServerClient = bis_genericio.getFileServerObject();
        if (fileServerClient) {
            fileServerClient.runModule('makeconnmatrixfile', params, false, console.log, true)
                .then( (obj) => {
                    console.log('Conn matrix module done', obj);
                    resolve(obj);
                }).catch( (e) => { reject(e); });
        } else {
            reject('No fileserver defined, cannot run pipeline');
        }
    });
};

module.exports = {
    runDICOMConversion : runDICOMConversion,
    runPipelineModule : runPipelineModule,
    makeFileChecksum : makeFileChecksum,
    runCPMMatrixFileModule : runCPMMatrixFileModule
};