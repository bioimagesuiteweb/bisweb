const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const sysutils = require('bis_filesystemutils.js');
const bidsutils = require('bis_bidsutils.js');

class BidsModule extends BaseModule {
    constructor() {
        super();
        this.name = 'Info';
    }

    createDescription() {

        return {
            "name": "Dicom Conversion",
            "description": "This module converts raw DICOM data into NIFTI form using dcm2niix, then formats it to BIDS specifications",
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
                    "name": "Input Directory",
                    "description": "Input directory for the DICOM conversion",
                    "advanced": true,
                    "type": "string",
                    "varname": "inputDirectory",
                    "required": true,
                    "default": "Error: no input directory specified"
                },
                {
                    "name": "Output Directory",
                    "description": "Output directory for the DICOM conversion. Optional, saves in /tmp if not specified",
                    "advanced": true,
                    "required": false,
                    "type": "string",
                    "varname": "outputDirectory",
                    "default": sysutils.tempdir
                },
                baseutils.getDebugParam()
            ]
        };
    }

    async directInvokeAlgorithm(vals) {
        let msg = await bidsutils.dicom2BIDS({ 'indir': vals.inputDirectory, 'outdir': vals.outputDirectory });
        return new Promise((resolve, reject) => {
            console.log('msg', msg);
            if (msg.split(' ').length > 1) { reject('An error occured during conversion', msg); }
            else { resolve(msg); }
        });
    }


}

module.exports = BidsModule;