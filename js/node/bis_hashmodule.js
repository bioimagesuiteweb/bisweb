
const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const bis_util = require('bis_util.js');
const fs = require('fs');
const zlib = require('zlib');
//const streamifier = require('streamifier');

class HashModule extends BaseModule {
    constructor() {
        super();
        this.name = 'Hash';
    }

    createDescription() {

        return {
            "name": "Make Hash",
            "description": "This module reads a .nii.gz file from disk and makes a SHA256 checksum from it",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs": [],
            "outputs": [
                {
                    'type': 'text',
                    'name': 'Results',
                    'description': 'log file',
                    'varname': 'logoutput',
                    'required': false,
                    'extension': '.bistext'
                },
            ],
            "buttonName": "Execute",
            "shortname": "info",
            "params": [
                {
                    "name": "Image",
                    "description": "Name of the image to read from disk",
                    "advanced": false,
                    "type": "string",
                    "varname": "url",
                    "default": "Error: no image specified"
                },
                baseutils.getDebugParam()
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        return new Promise((resolve, reject) => {
            const bufs = [];
            const readStream = fs.createReadStream(vals.url);
            const gunzip = zlib.createGunzip();

            readStream
                .pipe(gunzip)
                .on('finish', () => {
                    console.log('Done unzipping file');
                }).on('error', (e) => {
                    console.log('Stream encountered an error', e);
                    reject(e);
                });

            gunzip.on('data', (chunk) => {
                bufs.push(chunk);
            });

            gunzip.on('finish', () => {
                console.log('Done reading buffered unzipped chunks');
                let image = Buffer.concat(bufs);
                let hash = bis_util.SHA256(image);
                console.log('Calculated hash', hash);
                resolve({'hash' : hash, 'filename' : vals.url});
            });
        });

    }

//TODO: Make a 'paranoid' mode that will write a copy of the image to disk.
/*
const write = fs.createWriteStream('/home/zach/Desktop/file.nii');
const bufferReadStream = streamifier.createReadStream(image);
 
bufferReadStream
    .pipe(write)
    .on('finish', () => {
        console.log('Done writing to disk.');
        resolve({'hash' : hash});
    }).on('error', () => {
        console.log('Error writing to disk', e);
    });
    */
}

module.exports = HashModule;