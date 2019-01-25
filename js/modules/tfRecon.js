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


class BisWebTFJSReconModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'tensorFlowModule';
        this.modelname= '';
        this.tfjsModule=null;
    }

    addModelNameParameter() {
        return {
            "name": "Model name",
            "description": "Location of Model to use",
            "priority": 20,
            "advanced": true,
            "varname": 'modelname',
            "type": 'string',
            "default" : '',
        };
    }
    
    createDescription() {
        let obj= {
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
                    "name": "Force Browser",
                    "description": "If true use webgl backend",
                    "priority": 20,
                    "advanced": true,
                    "gui": "check",
                    "varname": "forcebrowser",
                    "type": 'boolean',
                    "default": false,
                },

                baseutils.getDebugParam(),
            ]
        };
        let md=this.addModelNameParameter();
        if (md) 
            obj['params'].push(md);
        return obj;
    }

    /** Allow setting of external model name and tf module
     * @param{Module} tf - the output of require('tfjs') or window.tf
     * @param{String} modelname - the base URL of the model name
     */
    setTFModule(tf) {
        this.tfjsModule=tf;
    }

    setModelName(modelname) {
        this.modelname=modelname;
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

        return new Promise( async(resolve,reject) => {

            if (this.tfjsModule===null) {
                try {
                    console.log('---------------------------------------');
                    let msg=await bistfutil.initializeTFModule(vals.forcebrowser);
                    console.log('\t initialize done');
                    console.log('---',msg);
                    console.log('--- \tinput image dims=',input.getDimensions().join(','));
                    console.log('---------------------------------------');
                    this.tfjsModule=bistfutil.getTFJSModule();
                } catch(e) {
                    reject('TFRecon Error '+e);
                    return;
                }
            } else {
                console.log("--- Using preset TFJSModule");
            }
            
            let model=null;
            try {
                model=await bistfutil.loadAndWarmUpModel(this.tfjsModule,bistfutil.fixModelName(modelname),true);
            } catch(e) {
                console.log('--- Failed load model from',modelname,e);
                reject('Failed to load model');
                return;
            }

            console.log('----------------------------------------------------------');
            let recon=new bistfutil.BisWebTensorFlowRecon(this.tfjsModule,input,model,padding,vals.debug);
            recon.reconstruct(this.tfjsModule,bistfutil.fixBatchSize(batchsize)).then( (output) => {
                console.log('----------------------------------------------------------');
                this.tfjsModule.disposeVariables(model).then( (num) => {
                    console.log('--- Cleanup num_tensors=',num);
                    this.outputs['output']=output;
                    console.log('--- Recon finished :',output.getDescription());
                    resolve('Done');
                });
            }).catch( (e) => {
                reject(e);
            });
        });
    }
}

module.exports = BisWebTFJSReconModule;
