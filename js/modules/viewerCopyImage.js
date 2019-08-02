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
const baseutils=require("baseutils");
const BaseModule = require('basemodule.js');

/**
 * 3D->2D Projection in various ways
 */
class ViewerCopyModule extends BaseModule {
    constructor() {
        super();
        this.name = 'advancedTransferImage';
    }

    
    createDescription() {
        return {
            "name": "Advanced Transfer Images",
            "description": "This algorithm performs image projecting to a 2D image using eigher MIP or shaded projection",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('Image to be copied'),
            "outputs": baseutils.getImageToImageOutputs(null,'viewer2'),
            "buttonName": "Transfer",
            "shortname" : "",
            params : [ ],
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: projectImage with vals', JSON.stringify(vals));
        return new Promise( (resolve, reject) => {
            try {
                this.outputs['output']= this.inputs['input'];
                resolve();
            } catch(e) {
                reject(e);
            }
        });
    }

}

module.exports = ViewerCopyModule;
