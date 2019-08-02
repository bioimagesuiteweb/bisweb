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
 * Normalizes an image using histogram equalization. Uses zero as the low end and a specified value as the high. 
 */
class NormalizeImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'normalizeImage';
    }

    createDescription() {
        return {
            "name": "Normalize",
            "description": "This element will normalize an image by setting the value below the low threshold to zero and setting the value about the high threshold to the max value.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Execute",
            "shortname" : "nrm",
            "slicer" : true,
            "params": [
                {
                    "name": "Low",
                    "description": "The percentage of the cumulative histogram to threshold below",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "perlow",
                    "default" : 0.02,
                    "low": 0.0,
                    "high": 0.7,

                },
                {
                    "name": "High",
                    "description": "The percentage of the cumulative histogram to saturate above",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "perhigh",
                    "default" : 0.98,
                    "low": 0.75,
                    "high": 1.0,
                },
                {
                    "name": "Max Value",
                    "description": "Maximum value for the normalized image",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "maxval",
                    "default" : 255,
                    "low" : 16,
                    "high": 255,
                },
                baseutils.getDebugParam()
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: normalizeImage with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let input = this.inputs['input'];
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.normalizeImageWASM(input, {
                    "perlow": parseFloat(vals.perlow, 10),
                    "perhigh": parseFloat(vals.perhigh, 10),
                    "outmaxvalue": parseInt(vals.maxval, 10)
                }, super.parseBoolean(vals.debug));

                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }




}

module.exports = NormalizeImageModule;
