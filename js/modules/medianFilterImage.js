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
const smreslice=require('bis_imagesmoothreslice');
/**
 * Applies median smoothing to an image using a given sigma (kernel size and strength) and radius factor. 
 */
class MedianImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'smoothImage';
    }

    createDescription() {
        return {
            "name": "Median",
            "description": "This algorithm performs median image filtering using a 2D/3D kernel",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('input'),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Median",
            "shortname" : "med",
            "slicer" : true,
            "params": [
                {
                    "name": "In3D",
                    "description": "If true filter in 3D (default=true)",
                    "priority": 2,
                    "advanced": false,
                    "gui": "check",
                    "varname": "do3d",
                    "type": 'boolean',
                    "default": true,
                    "jsonly" : true,
                },
                {
                    "name": "Radius",
                    "description": "This is the radius of the median filter window (2*radius+1)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": 'int',
                    "default": 3,
                    "lowbound": 1,
                    "highbound": 20,
                    "varname": "radius"
                },
                baseutils.getDebugParam(),
            ],

        };
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: medianFilterImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        let radius = parseInt(vals.radius);
        let do3d = super.parseBoolean(vals.do3d);

        if (super.parseBoolean(vals.debug)) {
            console.log('+++ using radius=',radius,' do3d=',do3d);
        }

        await biswrap.initialize();
        try {
            this.outputs['output'] = await biswrap.medianImageFilterWASM(input, {
                "radius": radius,
                "do3d" : do3d,
            }, super.parseBoolean(vals.debug));
        } catch(e) {
            return Promise.reject(e.stack);
        }

        return Promise.resolve('Done');
    }
}

module.exports = MedianImageModule;
