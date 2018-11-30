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

const ThresholdImageModule = require('thresholdImage.js');
const baseutils=require("baseutils");

/**
 * Performs binary thresholding to an image with the ability to specify both a low and a high threshold. 
 * The algorithm can either replace values between the thresholds, replace values out of the thresholds, or both.
 * The values to replace 'in' and 'out' with must be specified by the user. 
 */
class BinaryThresholdImageModule extends ThresholdImageModule {
    constructor() {
        super();
        this.name = 'binaryThresholdImage';
        this.JSOnly=true;
    }


    createDescription() {
        return {
            "name": "Create Mask",
            "description": "This element will threshold an image and force to binary",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs("The output mask","viewer1","overlay"),
            "buttonName": "Create",
            "shortname" : "bthr",
            "params": [
                {
                    "name": "Low Threshold",
                    "description": "The threshold below which values will be zeroed",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "low",
                    "default" : 1,
                },
                {
                    "name": "High Threshold",
                    "description": "The value above which values will be zeroed",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "default" : 1000,
                    "varname": "high",
                },
                baseutils.getDebugParam()
            ]
        };
    }
    
    directInvokeAlgorithm(vals) {

        vals['replacein']=true;
        vals['replaceout']=true;
        vals['inval']=1;
        vals['outval']=0;
        vals['outtype']='UChar';
        return super.directInvokeAlgorithm(vals);
    }

}

module.exports = BinaryThresholdImageModule;
