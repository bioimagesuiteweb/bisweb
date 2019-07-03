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
/**
 * Extracts a single slice along a major plane (Sagittal, Coronal, Axial) from a time series image that potentially 
 * contains many components. 
 */
class ExtractSliceModule extends BaseModule {
    constructor() {
        super();
        this.name = 'extractSlice';
        this.lastInputDimensions=[0,0,0];
    }

    //0 = Sagittal, 1 = Coronal, 2 = Axial
    createDescription() {
        return {
            "name": "Extract Slice",
            "description": "This element will extract a slice from a single frame of a time-series.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Extract",
            "shortname" : "sl",
            "slicer" : true,
            "params": [
                {
                    "name": "Plane",
                    "description": "Which plane to extract from the image (0 = Sagittal, 1 = Coronal, 2 = Axial)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "plane",
                    "type": "int",
                    "default" : 2,
                    "restrictAnswer": [ 0,1,2],
                    "low" : 0,
                    "high" : 2,
                },
                {
                    "name": "Slice",
                    "description": "Which slice in the given plane to extract",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "default" : -1,
                    "varname": "slice",
                },
                {
                    "name": "Frame",
                    "description": "Which frame in the input image to extract (fourth dimension)",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "default" : 0,
                    "varname": "frame"
                },
                {
                    "name": "Component",
                    "description": "Which component to extract a frame from (fifth dimension)",
                    "priority": 4,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "default" : 0,
                    "varname": "component"
                },
                baseutils.getDebugParam()
            ],

        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: extractSlice with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let input = this.inputs['input'];
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.extractImageSliceWASM(input, {
                    "frame" : parseInt(vals.frame, 10),
                    "component" : parseInt(vals.component, 10),
                    "slice" : parseInt(vals.slice), 
                    "plane" : parseInt(vals.plane)
                },vals.debug);

                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }


    updateOnChangedInput(inputs,guiVars=null) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let img=inputs['input'] || null;
        
        if (img===null)
            return newDes;

        let dim = img.getDimensions();
        if (this.compareArrays(dim,this.lastInputDimensions,0,2)<1) {
            return;
        }
        this.lastInputDimensions=dim;

        
        let maxd=Math.max( dim[0],dim[1],dim[2])-1;

        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            if (name==='slice' || name==='frame' || name === 'component' ) {
                if (name==='slice') {
                    newDes.params[i].low = 0;
                    newDes.params[i].high = maxd;
                    newDes.params[i].default=Math.round(maxd/2);
                } else if (name==='frame') {
                    newDes.params[i].low = 0;
                    newDes.params[i].high = dim[3]-1;
                } else if (name === 'component') {
                    newDes.params[i].low = 0;
                    newDes.params[i].high = dim[4]-1; 
                }
                if (guiVars)
                    guiVars[name]=newDes.params[i].default;

            }
        }
        this.recreateGUI=true;
        return newDes;
    }

}

module.exports = ExtractSliceModule;
