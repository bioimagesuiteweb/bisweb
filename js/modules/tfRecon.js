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
const util=require('bis_util');
let tfjsModule=null;



class BisWebTFJSReconModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'tensorFlowModule';
        this.modelname= '';
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
    setExternalParams(tf,modelname) {
        tfjsModule=tf;
        this.modelname=modelname;
    }

    /** if tf module is not set try to set it 
     * @returns{Boolean} -- success or failure to initialize 
     */
    initializeTFModule() {
        
        return new Promise( (resolve,reject) => {
            
            if (tfjsModule!==null) {
                resolve('Using preloaded tfjs module');
                return;
            }

            if (this.environment === 'browser' ) {

                if (window.tf) {
                    this.tfjsModule=new bistfutil.TFWrapper(window.tf);
                    resolve('Using preloaded tfjs module');
                    return;
                }
                
                let apiTag = document.createElement('script');
                let url="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@0.14.1/dist/tf.min.js";
                apiTag.src = url;
                apiTag.onload = ( () => {
                    tfjsModule=new bistfutil.TFWrapper(window.tf);
                    resolve('Module loaded from '+url);
                });
                
                apiTag.onerror=( (e) => {
                    reject("Failed to load tfjs module"+e);
                });

                document.head.appendChild(apiTag);
                
                return;
            } else if (this.environment === 'electron') {
                //                tfjsModule = new bistfutil.TFElectronWrapper();
                //tfjsModule.initialize();
                tfjsModule=new bistfutil.TFWrapper(window.BISELECTRON.tf);
                resolve('Using tfjs-node via electron module',tfjsModule);
                return;
            } else if (this.environment === 'node') {
                try {
                    let tf=require("@tensorflow/tfjs");
                    require('@tensorflow/tfjs-node');
                    resolve('Module loaded from tfjs-node');
                    tfjsModule=new bistfutil.TFWrapper(tf);
                    return;
                } catch(e) {
                    tfjsModule=null;
                    reject('Failed to load tfjs-node');
                    return;
                }
            }
        });
    }
    
    /** Adds file:// if in electron or node.js to the filename 
     * @param{String} md - the input model name
     * @returns {String} model name to be used as input in loadFrozenModel
     */
    fixModelName(md) {

        if (this.environment === 'browser')  {
            let getScope=() => {
                
                let scope=window.document.URL;
                let index=scope.indexOf(".html");
                if (index>0) {
                    index=scope.lastIndexOf("/");
                    scope=scope.substr(0,index+1);
                } else {
                    let index=scope.indexOf("#");
                    if (index>0) {
                        index=scope.lastIndexOf("/");
                        scope=scope.substr(0,index+1);
                    }
                }
                return scope;
            };
            if (md.indexOf('http')!==0)
                return getScope()+md;
            return md;
        }

        const path=bisgenericio.getpathmodule();
        
        if (this.environment==='electron') {
            if (md.indexOf('file')===0) {
                md=md.substr(8,md.length);
            }
            md=path.normalize(path.resolve(md));
            if (path.sep=='\\') {
                md=util.filenameUnixToWindows(md);
            }
            md='file://'+md;
            return md;
        }

        md=path.normalize(path.resolve(md));
        
        if (md.indexOf('file')!==0)
            return md;
        return 'file://'+md;
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
        } else if (batchsize>64) {
            batchsize=64;
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

        return new Promise( async(resolve,reject) => {

            try {
                let msg=await this.initializeTFModule();
                console.log('---------------------------------------');
                console.log('---',msg);
                console.log('--- input image dims=',input.getDimensions());
                console.log('---------------------------------------');
            } catch(e) {
                reject("No TFJS module available "+e);
            }
            
            let model=null;
            try {
                model=await bistfutil.loadAndWarmUpModel(tfjsModule,this.fixModelName(modelname),false);
            } catch(e) {
                console.log('--- Failed load model from',modelname,e);
                reject('Failed to load model');
                return;
            }

            console.log('----------------------------------------------------------');
            console.log(`--- Beginning padding=${padding}`);
            let recon=new bistfutil.BisWebTensorFlowRecon(tfjsModule,input,model,padding);
            recon.reconstruct(tfjsModule,this.fixBatchSize(batchsize)).then( (output) => {
                console.log('----------------------------------------------------------');
                console.log('--- Recon finished :',output.getDescription());
                tfjsModule.disposeVariables(model).then( (num) => {
                    console.log('--- Num Tensors=',num);
                    this.outputs['output']=output;
                    resolve('Done');
                });
            }).catch( (e) => {
                reject(e);
            });
        });
    }
}

module.exports = BisWebTFJSReconModule;
