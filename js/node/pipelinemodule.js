
const BaseModule = require('basemodule.js');
const bis_genericio = require('bis_genericio');
const pipelineTool = require('pipelineTool');
const BisWebTextObject = require('bisweb_textobject.js');

class PipelineModule extends BaseModule {
    constructor() {
        super();
        this.name = 'Hash';
    }

    createDescription() {

        return {
            "name": "Make Hash",
            "description": "This module reads a .nii.gz file from disk and makes a SHA256 checksum from it",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs": [
                {
                    'type': 'text',
                    'shortname' : 'o',
                    'name': 'Results',
                    'description': 'log file',
                    'varname': 'output',
                    'required': false,
                    'extension': '.txt'
                },
            ],
            "buttonName": "Execute",
            "shortname": "info",
            "params": [
                {
                    "name": "input",
                    "shortname" : "i",
                    "description": "Name of the input filename",
                    "advanced": false,
                    "type": "string",
                    "varname": "input",
                    "default": "Error: no input filename specified"
                },
                {
                    "name": "odir",
                    "shortname" : "d",
                    "description": "Output directory",
                    "advanced": false,
                    "type": "string",
                    "varname": "odir",
                    "default": ""
                },
            ]
        };
    }

    directInvokeAlgorithm(vals) {

        console.log(vals);
        
        return new Promise((resolve, reject) => {

            bis_genericio.read(vals.input).then( (obj) => {
                let dat=null;
                try { 
                    dat=JSON.parse(obj.data,vals.odir);
                } catch(e) {
                    console.log(e);
                    reject(e);
                    return;
                }
                let out=pipelineTool.makePipeline(dat,vals.odir);
                this.outputs['output']=new BisWebTextObject(out);
                this.outputs['output'].forceTextSave(); // No JSON!
                resolve();
            }).catch( (e) => {
                console.log('Error',e,e.stack);
                reject(e);
            });
        });
        
    }

}

module.exports = PipelineModule;
