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
 * Process4D a 4D Images
 */
class timeseriesNormalizeImage extends BaseModule {
    constructor() {
        super();
        this.name= "timeSeriesNormalizeImage";
    }
    
    createDescription() {
        return {
            "name": "Timeseries normalize image",
            "description": "Given 4d image normalize it so that each voxel timeseries has mean 0 and sigma=1",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "_norm4d",
            "inputs": baseutils.getImageToImageInputs('The image to be processed'),
            "outputs": baseutils.getImageToImageOutputs(),
            "slicer" : true,
            "params": [
                baseutils.getDebugParam(),
            ]
        };
    }
    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: timeseriesNormalizeImage', JSON.stringify(vals));
        
        let input = this.inputs['input'];
        return new Promise( (resolve, reject) => {
            console.log('inp=',input.getDescription());
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.timeSeriesNormalizeImageWASM(input, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
}

module.exports = timeseriesNormalizeImage;
