const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const sysutils = require('bis_filesystemutils.js');
const bidsutils = require('bis_bidsutils.js');

class BidsModule extends BaseModule {
    constructor() {
        super();
        this.name = 'BidsModule';
    }

    createDescription() {

        return {
            "name": "BIDS Conversion",
            "description": "This module converts raw DICOM data into NIFTI form using dcm2niix, then formats it to BIDS specifications",
            "author": "Zach Saltzman and Xenios Papademetris",
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
                    "name": "Input Directory",
                    "description": "Input directory for the DICOM conversion",
                    "advanced": true,
                    "type": "string",
                    "varname": "inputdirectory",
                    "required": true,
                    "default": ""
                },
                {
                    "name": "Output Directory",
                    "description": "Output directory for the DICOM conversion. Optional, saves in /tmp if not specified",
                    "advanced": true,
                    "required": false,
                    "type": "string",
                    "varname": "outputdirectory",
                    "default": sysutils.tempdir
                },
                baseutils.getDebugParam()
            ]
        };
    }

    directInvokeAlgorithm(vals) {

        if (vals.inputdirectory.length<2) { 
            return Promise.reject('Must specify input directory.');
        }


        return new Promise( (resolve,reject) => {
            bidsutils.dicom2BIDS({ 'indir': vals.inputdirectory, 'outdir': vals.outputdirectory, 'dcm2nii' : vals.dcm2nii }).then( (msg) => {
                if (msg.split(' ').length > 1) {
                    reject('An error occured during conversion', msg);
                }  else {
                    resolve(msg);
                }
            });
        });
    }


}

module.exports = BidsModule;
