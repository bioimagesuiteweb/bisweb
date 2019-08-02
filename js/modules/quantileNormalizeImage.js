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
 * QuantileNormalizes an image using histogram equalization. Uses zero as the low end and a specified value as the high. 
 */
class QuantileNormalizeImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'quantileNormalizeImage';
    }

    createDescription() {
        return {
            "name": "QuantileNormalize",
            "description": "This module will perform quantile normalization on an image. Median=0, Inter-Quartile Range=1",
            "author": "Xenios Papademetris and John Onofrey",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Execute",
            "shortname" : "qnrm",
            "slicer" : true,
            "params": [
                baseutils.getDebugParam()
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: quantileNormalizeImage with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let input = this.inputs['input'];
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.medianNormalizeImageWASM(input,
                                                                          super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }




}

module.exports = QuantileNormalizeImageModule;
