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
class patchReformatImage extends BaseModule {
    constructor() {
        super();
        this.name= "patchReformatImage";
    }
    
    createDescription() {
        return {
            "name": "Patch Reformat Image",
            "description": "Given 3d image reformat it to make it 4D with each timeseries mapped to a patch from the original 3D image",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "_patchref",
            "inputs": baseutils.getImageToImageInputs('The image to be processed'),
            "outputs": baseutils.getImageToImageOutputs(),
            "slicer" : true,
            "params": [
                {
                    "name": "Radius",
                    "description": "The radius of the patch to use",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": 'int',
                    "default": 1,
                    "lowbound": 1,
                    "highbound": 4,
                    "varname": "radius"
                },
                {
                    "name": "Increment",
                    "description": "The increment size for each patch. Increment > 1 --> skip voxels",
                    "priority": 10,
                    "advanced": true,
                    "gui": "slider",
                    "type": 'int',
                    "default": 1,
                    "low": 1,
                    "high": 5,
                    "varname": "increment"
                },

                baseutils.getDebugParam(),
            ]
        };
    }

    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: patchReformatImage', JSON.stringify(vals));
        
        let input = this.inputs['input'];
        let radius= parseFloat(vals.radius);
        let incr= parseFloat(vals.increment);
        return new Promise( (resolve, reject) => {
            console.log('inp=',input.getDescription());
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.createPatchReformatedImage(input, {
                    "radius": radius,
                    "increment": incr,
                    "numthreads" : 1
                },super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
}

module.exports = patchReformatImage;
