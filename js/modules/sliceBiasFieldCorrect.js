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
const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");

/**
 * Corrects inhomogeneity among slices along a single axis of an image. Takes a threshold value to control the region of the image that is used.
 */
class SliceBiasCorrectModule extends BaseModule {
    constructor() {
        super();
        this.name = 'sliceBiasCorrect';
    }


    createDescription() {
        return {
            "name": "Bias Field Correct",
            "description": "Performs slice-based intensity inhomogeneity (bias field) correction on an image to correct for acquisition artifacts. This includes B1 inhomogeneity correction for MRI, or attenuation issues in microscopy.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Execute",
            "shortname" : "slb",
            "slicer" : true,
            "params": [
                {
                    "name": "Axis",
                    "description": "Which axis to correct along ('x', 'y', 'z', 'triple')",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "default" : "z",
                    "type" : "string",
                    "fields" : ["x","y","z", "triple"],
                    "restrictAnswer" : ["x","y","z", "triple" ],             
                    "varname": "axis",
                },
                {
                    "name": "Threshold",
                    "description": "This sets the threshold (percentage of max intensity), below which the image is masked",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "low" : 0.0,
                    "high" : 0.5,
                    "default" : 0.05,
                    "step" : 0.01,
                    "varname": "threshold",
                },
                {
                    "name": "Return Bias Field",
                    "description": "If false (default), this returns the the corrected image. Otherwise (true) it returns the estimated bias field.",
                    "priority": 3,
                    "advanced": true,
                    "gui": "check",
                    "type": "boolean",
                    "varname": "returnbiasfield",
                    "default" : false,
                },
                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: sliceBiasCorrect with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        let mode=vals.axis;
        let axis=3;
        if (mode==="x")
            axis=0;
        else if (mode==="y")
            axis=1;
        else if (mode==="z")
            axis=2;
        
        
        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                
                this.outputs['output'] = biswrap.sliceBiasFieldCorrectImageWASM(input, {
                    "axis" : axis,
                    "threshold" : parseFloat(vals.threshold),
                    "returnbiasfield" : super.parseBoolean(vals.returnbiasfield)
                },vals.debug);
                
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
    



}

module.exports = SliceBiasCorrectModule;
