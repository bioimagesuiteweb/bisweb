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

const biswrap = require('libbiswasm_wrapper');
const baseutils=require("baseutils");
const BaseModule = require('basemodule.js');
const smoothreslice = require("bis_imagesmoothreslice.js");

/**
 * Extracts a single frame from a time series image, potentially with multiple components.
 */

class ExtractFrameModule extends BaseModule {
    constructor() {
        super();
        this.name = 'extractFrame';
        this.lastInputDimensions=[0,0,0,0,0];
    }

    createDescription() {
        return {
            "name": "Extract Frame",
            "description": "This element will extract a single frame from a time-series.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Extract",
            "shortname" : "fr",
            "slicer" : true,
            "params": [
                {
                    "name": "Frame",
                    "description": "Which frame in the time series to extract (fourth dimension)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "frame",
                    "default" : 0,
                },
                {
                    "name": "Component",
                    "description": "Which component to extract a frame from (fifth dimension)",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "component",
                    "default" : 0,
                },
                {
                    "name": "UseJS",
                    "description": "Use the pure JS implementation of the algorithm",
                    "priority": 28,
                    "advanced": true,
                    "gui": "check",
                    "varname": "usejs",
                    "type": 'boolean',
                    "default": false,
                    "jsonly" : true,
                },
                baseutils.getDebugParam()
            ],

        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: extractFrame with vals', JSON.stringify(vals));
        let input = this.inputs['input'];

        if (!super.parseBoolean(vals.usejs)) {
            return new Promise((resolve, reject) => {
                
                biswrap.initialize().then(() => {
                    this.outputs['output'] = biswrap.extractImageFrameWASM(input, {
                        "frame" : parseInt(vals.frame, 10),
                        "component" : parseInt(vals.component, 10)
                    },vals.debug);
                    
                    resolve();
                }).catch( (e) => {
                    reject(e.stack);
                });
            });
        } else {
            return new Promise((resolve,reject) => {
                if (vals.debug)
                    console.log('oooo \t using pure JS implementation\noooo');
                let dim=input.getDimensions();
                let frame=vals.frame+vals.component*dim[3];
                let out=smoothreslice.imageExtractFrame(input,frame);
                if (out!==null) {
                    this.outputs['output']=out;
                    resolve();
                }
                reject('Failed to extract frame in JS');
            });
        }
    }

    updateOnChangedInput(inputs,guiVars=null) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let img=inputs['input'] || null;
        if (img===null)
            return;

        let dim = img.getDimensions();

        if (this.compareArrays(dim,this.lastInputDimensions,3,4)<1) {
            return;
        }
        this.lastInputDimensions=dim;
        
        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            if (name==='frame' || name === 'component' ) {
                if (name==='frame') {
                    newDes.params[i].low = 0;
                    if (dim[3]>1)
                        newDes.params[i].high = dim[3]-1;
                    else
                        newDes.params[i].high = 1;
                        
                } else if (name === 'component') {
                    newDes.params[i].low = 0;
                    if (dim[4]>1) 
                        newDes.params[i].high = dim[4]-1;
                    else
                        newDes.params[i].high = 1;
                        
                }
            }
            if (guiVars)
                guiVars[name]=newDes.params[i].default;

        }
        
        this.recreateGUI=true;
        return newDes;
    }

}

module.exports = ExtractFrameModule;
