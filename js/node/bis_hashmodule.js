
const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const bis_util = require('bis_util.js');
const fs = require('fs');
const zlib = require('zlib');
const BisWebTextObject = require('bisweb_textobject.js');
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
                    'shortname' : 'o',
                    'extension': '.bistext'
                },
            ],
            "buttonName": "Execute",
            "shortname": "info",
            "params": [
                {
                    "name": "input",
                    "description": "Name of the file to read from disk",
                    "advanced": false,
                    "type": "string",
                    "varname": "input",
                    "required" : true,
                    "shortname" :  "i",
                    "default": ""
                },
                baseutils.getDebugParam()
            ]
        };
    }

    directInvokeAlgorithm(vals) {

        if (vals.input==="") {
            return Promise.reject(': No input filename specified');
        }
        
        return new Promise((resolve, reject) => {
            const bufs = [];
            const readStream = fs.createReadStream(vals.input);
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
                console.log('Done reading buffered unzipped chunks', bufs.length);
                let image = Buffer.concat(bufs);
                let hash = bis_util.SHA256(image);
                console.log('Calculated hash', hash);
                let obj={'hash' : hash, 'filename' : vals.input};
                let txt=JSON.stringify(obj);
                this.outputs['logoutput']=new BisWebTextObject(txt);
                resolve(obj);

            });
        });

    }


}

module.exports = HashModule;
