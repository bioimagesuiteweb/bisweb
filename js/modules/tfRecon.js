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
const biswrap = require('libbiswasm_wrapper');
const util=require('bis_util');

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
            "advanced": false,
            "varname": 'modelname',
            "type": 'filename',
            "gui" : 'directory',
            "default" : '',
        };
    }
    
    createDescription() {
        let obj= {
            "name": "Apply TF Model",
            "description": "Applies TensorFlow Models on an image to get an output",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('The Input Image'),
            "outputs": baseutils.getImageToImageOutputs(),
            "slicer" : true,
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
                    "name": "Quantile Normalize",
                    "description": "If true perform median normalization",
                    "priority": 10,
                    "advanced": true,
                    "gui": "check",
                    "varname": "norm",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Transpose",
                    "description": "If true (default) transpose tensors to match Python",
                    "priority": 12,
                    "advanced": true,
                    "gui": "check",
                    "varname": "transpose",
                    "type": 'boolean',
                    "default": true,
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
    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: tfReconModule with vals', JSON.stringify(vals));

        let input = this.inputs['input'];
        let padding=vals.padding;
        let batchsize=vals.batchsize;
        let modelname = vals.modelname;
        if (modelname.length<2)
            modelname=this.modelname;

        let transpose=(this.parseBoolean(vals.transpose));
        
        if (this.parseBoolean(vals.norm)) {
            console.log('oooo\noooo Quantile Normalize Image\noooo');
            try {
                await biswrap.initialize();
            } catch(e) {
                return Promise.reject(e);
            }
            let out=biswrap.medianNormalizeImageWASM(input,1);
            input=out;
        }
        
        if (this.tfjsModule===null) {
            try {
                console.log('---------------------------------------');
                let msg=await bistfutil.initializeTFModule(vals.forcebrowser,transpose);
                console.log('\t initialize done');
                console.log('---',msg);
                console.log('--- \tinput image dims=',input.getDimensions().join(','));
                console.log('---------------------------------------');
                this.tfjsModule=bistfutil.getTFJSModule();
            } catch(e) {
                return Promise.reject('TFRecon Error '+e);
            }
        } else {
            console.log("--- Using preset TFJSModule");
        }
            
        let model=null;
        try {
            model=await bistfutil.loadAndWarmUpModel(this.tfjsModule,bistfutil.fixModelName(modelname),true);
        } catch(e) {
            console.log('--- Failed load model from',modelname,e);
            return Promise.reject('Failed to load model');
        }

        console.log('----------------------------------------------------------');
        let recon=new bistfutil.BisWebTensorFlowRecon(this.tfjsModule,input,model,padding,vals.debug);
        let output=null;


        let viewerlist=null;
        try {
            viewerlist=document.querySelectorAll("bisweb-orthogonalviewer");
            if (viewerlist.length<1)
                viewerlist=null;
            else
                console.log('Viewer0=',viewerlist);
        } catch(e) {
            console.log('+++ In node.js: no viewer to disable');
        }

        if (viewerlist) {
            console.log('Disabling render loop',viewerlist[0]);
            viewerlist[0].disable_renderloop('Starting Deep Learning Job -- Rendering Disabled');
            viewerlist[0].style.display='none';
            await util.sleep(200);
        }

        
        
        try {
            output=await recon.reconstruct(this.tfjsModule,bistfutil.fixBatchSize(batchsize));
        } catch(e) {
            if (viewerlist) {
                viewerlist[0].enable_renderloop();
                viewerlist[0].renderloop();
            }
            return Promise.reject(e);
        }

        console.log('----------------------------------------------------------');
        if (viewerlist) {
            viewerlist[0].enable_renderloop();
            viewerlist[0].renderloop();
        }

        
        let num=0;
        try {
            num=await this.tfjsModule.disposeVariables(model);
        }  catch(e) {
            return Promise.reject(e);
        }
        console.log('--- Cleanup num_tensors=',num);
        this.outputs['output']=output;
        console.log('--- Recon finished :',output.getDescription());
        return Promise.resolve('Done');
    }
}

module.exports = BisWebTFJSReconModule;
