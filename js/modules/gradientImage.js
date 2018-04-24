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
 * computes the image gradient of an image using gaussian filters with a given sigma (kernel size and strength) and radius factor. 
 */
class GradientImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'gradientImage';
    }

    createDescription() {
        return {
            "name": "Gradient",
            "description": "This algorithm computes image gradients using a 2D/3D Gaussian kernel",
            "author": "Xenios Papdemetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('Input image'),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Gradient",
            "shortname" : "grad",
            "params": [
                {
                    "name": "Sigma",
                    "description": "The gaussian kernel standard deviation (either in voxels or mm)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 1.0,
                    "type": 'float',
                    "low": 0.0,
                    "high": 8.0
                },
                {
                    "name": "In mm?",
                    "description": "Determines whether kernel standard deviation (sigma) will be measured in millimeters or voxels",
                    "priority": 7,
                    "advanced": false,
                    "gui": "check",
                    "varname": "inmm",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "Radius Factor",
                    "description": "This affects the size of the convolution kernel which is computed as sigma*radius+1",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": 'float',
                    "default": 2.0,
                    "lowbound": 1.0,
                    "highbound": 4.0,
                    "varname": "radiusfactor"
                },
                baseutils.getDebugParam(),
            ],

        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: gradientImage with vals', JSON.stringify(vals));
        return new Promise( (resolve, reject) => {
            let input = this.inputs['input'];
            let s = parseFloat(vals.sigma);
            
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.gradientImageWASM(input, {
                    "sigmas": [s, s, s],
                    "inmm": super.parseBoolean(vals.inmm),
                    "radiusfactor": parseFloat(vals.radiusfactor)
                }, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }



}

module.exports = GradientImageModule;
