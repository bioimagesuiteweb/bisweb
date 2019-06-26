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
 * flips an image along any combination of the three axes
 */
class FlipImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'flipImage';
    }

    createDescription() {
        return {
            "name": "Flip",
            "description": "This algorithm performs image fliping",
            "author": "Xenios Papdemetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('input'),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Flip",
            "shortname" : "flp",
            "slicer" : true,
            "params": [
                {
                    "name": "Flip the i-axis",
                    "description": "Determines if the i-axis (x) will be flipped",
                    "priority": 1,
                    "advanced": false,
                    "gui": "check",
                    "varname": "flipi",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Flip the j-axis",
                    "description": "Determines if the j-axis (y) will be flipped",
                    "priority": 1,
                    "advanced": false,
                    "gui": "check",
                    "varname": "flipj",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Flip the k-axis",
                    "description": "Determines if the k-axis (z) will be flipped",
                    "priority": 1,
                    "advanced": false,
                    "gui": "check",
                    "varname": "flipk",
                    "type": 'boolean',
                    "default": false,
                },

                baseutils.getDebugParam(),
            ],

        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: flipImage with vals', JSON.stringify(vals));
        return new Promise( (resolve, reject) => {
            let input = this.inputs['input'];
            
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.flipImageWASM(input, {
                    "flipi": super.parseBoolean(vals.flipi),
                    "flipj": super.parseBoolean(vals.flipj),
                    "flipk": super.parseBoolean(vals.flipk),
                }, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }



}

module.exports = FlipImageModule;
