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
 * Prepares a frame of an image for registration by smoothing, normalizing, and adjusting its resolution.
 */
class PrepareRegistrationModule extends BaseModule {
    constructor() {
        super();
        this.name = 'prepareRegistration';
    }


    createDescription() {
        return {
            "name": "Prepare Registration",
            "description": "Prepares an image for registration by extracting a frame from the image then smoothing, resampling, and normalizing it.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Execute",
            "shortname" : "prp",
            "params": [
                {
                    "name": "Number of Bins",
                    "description": "Number of bins in histogram",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "int",
                    "default" : 64,
                    "varname": "numbins",
                    "fields" : [ 16,32,64,128,256,512,1024 ],
                    "restrictAnswer" : [ 16,32,64,128,256,512,1024 ],
                },
                {
                    "name": "Normalize",
                    "description": "Perform intensity normalization using the cumulative histogram",
                    "priority": 2,
                    "gui": "check",
                    "type": "boolean",
                    "varname": "normal",
                    "default" : true,
                    "advanced": true
                },
                {
                    "name": "Resolution Factor",
                    "description": "Factor to shrink the resolution (increase the spacing) of the output image relative to the input",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "resolution",
                    "default": 2.0,
                    "low": 1.0,
                    "high": 6.0,
                    "step" : 0.25,
                },
                {
                    "name": "Smoothing",
                    "description": "Amount of smoothing to perform (values of 0 or less will perform no smoothing)",
                    "priority": 4,
                    "advanced": false,
                    "type": "float",
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 1.0,
                    "low": 0.0,
                    "high": 5.0,
                },
                {
                    "name": "Int Scale",
                    "description": "Determines the maximum value of the normalized image",
                    "priority": 5,
                    "type": "int",
                    "gui": "slider",
                    "varname": "intscale",
                    "low" : 1,
                    "high" : 4,
                    "advanced" : true,
                    "default" : 1
                },
                {
                    "name": "Frame",
                    "description": "Which frame to extract from a time series (fourth dimension)",
                    "priority": 6,
                    "type": "int",
                    "gui": "slider",
                    "varname": "frame",
                    "default" : 0,
                    "advanced" : true
                },
                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: prepareRegistration with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                let input = this.inputs['input'];
                this.outputs['output'] = biswrap.prepareImageForRegistrationWASM(input, {
                    "numbins" : parseInt(vals.numbins),
                    "normalize" : super.parseBoolean(vals.normal),
                    "resolution" : parseFloat(vals.resolution),
                    "sigma" : parseFloat(vals.sigma),
                    "intscale" : parseInt(vals.intscale),
                    "frame" : parseInt(vals.frame)
                },vals.debug);

                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }




    updateOnChangedInput(inputs,guiVars) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let current_input = inputs['input'] || null;
        if (current_input===null)
            return newDes;
        
        let imagedim = current_input.getDimensions();
        
        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;

            if(name === 'frame') {
                newDes.params[i].low = 0;
                newDes.params[i].high = imagedim[3]-1;
                newDes.params[i].default =0;

                if (guiVars)
                    guiVars[name]=newDes.params[i].default;
            }
        }
        this.recreateGUI=true;
        return newDes;
    }
}

module.exports = PrepareRegistrationModule;

