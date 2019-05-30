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
 * Takes an input time series and object map detailing regions of interest (ROIs) and returns the mean activation for the region.
 */
class ComputeROIModule extends BaseModule {
    constructor() {
        super();
        this.name = 'computeROI';

    }

    createDescription() {
        let des={
            "name": "Compute ROI",
            "description": "Takes an input time series and ROI map and returns the mean intensity in the roi as a matrix of frames(rows)*roiindex(columns)",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('Load the image (time series) to be averaged into regions'),
            "outputs":  baseutils.getMatrixToMatrixOutputs(),
            "buttonName": "Calculate",
            "shortname" : "roi",
            "params": [
                {
                    "name": "Store Centroids?",
                    "description": "If true store the centroid of each roi as last three columns",
                    "priority": 7,
                    "advanced": false,
                    "gui": "check",
                    "varname": "storecentroids",
                    "type": 'boolean',
                    "default": false,
                },
                baseutils.getDebugParam()
            ]
        };
        des.inputs.push({
            'type': 'image',
            'name': 'Load Regions of Interest',
            'description': 'parcellation/regions of interest to compute signal averages for',
            'varname': 'roi',
            'shortname' : 'r'
        });
        
        return des;
    }


    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: computeROI with values', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let input = this.inputs['input'];
            biswrap.initialize().then(() => {
                let store=super.parseBoolean(vals.storecentroids);
                
                this.outputs['output'] = biswrap.computeROIWASM(input, this.inputs['roi'],
                                                                { 'storecentroids' : store },
                                                                super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
}

module.exports = ComputeROIModule;
