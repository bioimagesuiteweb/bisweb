/*  LICENSE
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
 
 BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
 
 - you may not use this software except in compliance with the License.
 - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
 
 __Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.__
 
 ENDLICENSE */

'use strict';

const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");
const bistfutil = require('bis_tfutil.js');
const bisgenericio = require('bis_genericio');

/**
 * tf recon module
 */
class TFJSModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'tensorFlowModule';
        this.modelname= '';
        this.tf=null;
        this.environment=bisgenericio.getmode();
    }

    createDescription() {
        return {
            "name": "Apply Model",
            "description": "Applies TensorFlow Models on an image to get an output",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('The Input Image'),
            "outputs": baseutils.getImageToImageOutputs(),
            "params": [
                {
                    "name": "Padding",
                    "description": "Padding to apply when doing patch-based reconstruction",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "int",
                    "default" : "4",
                    "varname": "padding",
                    "fields" : [ 0,2,4,8,12,16,32 ],
                    "restrictAnswer" : [ 0,2,4,8,12,16,32 ],
                },
                {
                    "name": "Batch Size",
                    "description": "Size of batch to reconstruct (in browser set this to 1 or 2)",
                    "priority": 10,
                    "advanced": false,
                    "gui": "slider",
                    "varname": 'batchsize',
                    "type": 'int',
                    "default" : 1,
                    "low" :  1,
                    "high" : 32,
                },
                {
                    "name": "Model name",
                    "description": "Location of Model to use",
                    "priority": 20,
                    "advanced": true,
                    "varname": 'modelname',
                    "type": 'string',
                    "default" : '',
                },
                baseutils.getDebugParam(),
            ]
        };
    }

    /** Allow setting of external model name and tf module
     * @param{Module} tf - the output of require('tfjs') or window.tf
     * @param{String} modelname - the base URL of the model name
     */
    setExternalParms(tf,modelname) {
        this.tf=tf;
        this.modelname=modelname;
    }

    /** if tf module is not set try to set it 
     * @returns{Boolean} -- success or failure to initialize 
     */
    initializeTFModule() {

        if (this.tf!==null)
            return true;


        if (this.environment==='browser') {
            this.tf = Window.tf || null;
        } else if (this.environment === 'electron') {
            this.tf = window.BISELECTRON.tf;
        } else if (this.environment === 'node') {
            // node.js
            try {
                this.tf=require('@tensorflow/tfjs');
            } catch(e) {
                console.log('**** Failed to get tfjs');
                this.tf=null;
                return false;
            }
            
            try {
                let a=require('@tensorflow/tfjs-node-gpu');
                console.log('**** Using tfjs-node-gpu',a.version);
                return true;
            } catch(e) {
                console.log('**** Failed to get tfjs-node-gpu, trying CPU version');
            }
            
            try {
                let a=require('@tensorflow/tfjs-node');
                console.log('**** Using tfjs-node',a.version);
                return true;
            } catch(e) {
                console.log('**** Failed to get tfjs-node. Exiting.');
                this.tf=null;
            }
        }
        
        if (this.tf)
            return true;
        return false;
    }
    
    /** Adds file:// if in electron or node.js to the filename 
     * @param{String} md - the input model name
     * @returns {String} model name to be used as input in tf.loadFrozenModel
     */
    fixModelName(md) {

        if (this.environment=== 'broswer') 
            return md;
        
        let path=bisgenericio.getpathmodule();
        return 'file://'+path.normalize(path.resolve(md));
    }

    /** Restricts batch size based on hardware and batch size
        * @param{Number} batchsize - the use specified number
        * @returns{Number} - clamped to be below a certain size
        */
    fixBatchSize(batchsize) {


        if (batchsize<1)
            batchsize=1;
        
        if (this.environment=== 'broswer') {
            if (batchsize>2)
                batchsize=2;
        } else if (batchsize>16) {
            batchsize=16;
        }

        return batchsize;
    }

    /** Invoke the algorithm with parameters */
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: tfReconModule with vals', JSON.stringify(vals));

        let input = this.inputs['input'];
        let padding=vals.padding;
        let batchsize=vals.batchsize;
        let modelname = vals.modelname;
        if (modelname.length<2)
            modelname=this.modelname;

        if (!this.initializeTFModule())
            return Promise.reject("No TFJS module available.");
        
        return new Promise( async(resolve,reject) => {
        
            let model=null;
            try {
                model=await bistfutil.loadAndWarmUpModel(this.tf,this.fixModelName(modelname));
            } catch(e) {
                console.log('--- Failed load model from',modelname,e);
                reject('Failed to load model');
            }

            console.log('--- numTensors (post load): ' + this.tf.memory().numTensors);
            console.log('----------------------------------------------------------');
            console.log(`--- Beginning padding=${padding}`);
            let recon=new bistfutil.BisWebTensorFlowRecon(input,model,padding);
            let output=recon.reconstructImage(this.tf,this.fixBatchSize(batchsize));
            console.log('----------------------------------------------------------');
            console.log('--- Recon finished :',output.getDescription());
            this.tf.disposeVariables();
            console.log('--- Num Tensors=',this.tf.memory().numTensors);
            this.outputs['output']=output;
            resolve('Done');
        });
    }
}

module.exports = TFJSModule;
