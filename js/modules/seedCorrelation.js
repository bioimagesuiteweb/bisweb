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
const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");

// Three Matrix to Matrix 
// Input + Regressor + Weights --> Output = Input Orthogonalized to Regressor
/**
 * Applies one time series to another to find a regression line with the option to specify weights on 
 * a frame by frame basis, i.e. orthagonalizes the two time series.
 */
class SeedCorrelationImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'seedCorrelationImage';
    }

    createDescription() {
        let des={
            "name": "Seed Correlation Image" ,
            "description": "Computes a Seed Correlation Map",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs":  baseutils.getImageToImageOutputs(),
            "buttonName": "Seed Map",
            "shortname" : "seed",
            "slicer" : true,
            "params": [
                {
                    "name": "Z-Score",
                    "description": "Convert correlations to z-score.",
                    "priority": 1,
                    "advanced": false,
                    "gui": "check",
                    "type": "boolean",
                    "varname": "zscore",
                    "default" : true,
                },
                baseutils.getDebugParam()
            ],
        };

        des.inputs.push({
            'type': 'vector',
            'name': 'Weights',
            'description': '(Optional). The framewise weight vector',
            'varname': 'weight',
            'shortname': 'w',
            'required': false,
        });
        
        des.inputs.push(baseutils.getRegressorInput());
        return des;
    }

    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: seedCorrelationImage with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let input = this.inputs['input'];
            let regressor = this.inputs['regressor'];
            let weight = this.inputs['weight'] || 0;
            
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.computeSeedCorrelationImageWASM(input, regressor, weight, {
                    "toz" : super.parseBoolean(vals.zscore),
                }, vals.debug);
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

}

module.exports = SeedCorrelationImageModule;
