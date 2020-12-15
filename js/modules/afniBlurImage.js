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
 * Applies Gaussian smoothing to an image using a given sigma using AFNI Code
 */
class AfniBlurModule extends BaseModule {
    constructor() {
        super();
        this.name = 'afniBlurImage';
    }

    createDescription() {
        return {
            "name": "AFNI Blur Image",
            "usesafni" : true,
            "description": "This algorithm performs image smoothing using AFNI's blurImage code",
            "author": "John Lee, Steph Noble, Box Cox and Xenios Papademetris",
            "version": "1.0",
            "inputs": [
                {
                    'type': 'image',
                    'name': 'Input Image',
                    'description': 'The image to smooth',
                    'varname': 'input',
                    'shortname': 'i',
                    'required': true,
                    'guiviewerinput' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type': 'image',
                    'name': 'Mask Image',
                    'description': 'An optional mask image',
                    'varname': 'mask',
                    'shortname': 'm',
                    'required': false,
                    'guiviewertype' : 'overlay',
                    'guiviewer'  : 'viewer1',
                    'colortype'  : 'Orange'
                }
            ],
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "AFNI Blur",
            "shortname" : "sm",
            "slicer" : true,
            "params": [
                {
                    "name": "Sigma",
                    "description": "The gaussian kernel standard deviation fwhm mm",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 1.0,
                    "type": 'float',
                    "low":  0.0,
                    "high": 16.0
                },
                {
                    "name": "Use Mask",
                    "description": "If true only mask within a region",
                    "priority": 7,
                    "advanced": false,
                    "gui": "check",
                    "varname": "usemask",
                    "type": 'boolean',
                    "default": false,
                },
                baseutils.getDebugParam(),
            ],
        };
    }
    
    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: afniBlurImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        let mask  = this.inputs['mask'] || 0;
        let s = parseFloat(vals.sigma);
        let usem=super.parseBoolean(vals.usemask);

        try {
            await biswrap.initialize();
        } catch(e) {
            return Promise.reject(e);
        }

        this.outputs['output'] = biswrap.afniBlurImageWASM(input, mask, {
            "sigma": s,
            "usemask" : usem,
        }, super.parseBoolean(vals.debug));
        
        return Promise.resolve('done');
    }
}

module.exports = AfniBlurModule;
