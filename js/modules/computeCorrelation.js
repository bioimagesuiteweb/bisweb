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
 * Calculates the correlation matrix for a dataset given a Z-score for the underlying data. 
 * Weights for individual data points may be specified as well .
 */
class ComputeCorrelationModule extends BaseModule {
    constructor() {
        super();
        this.name = 'computeCorrelation';
    }

    
    createDescription() {
        return {
            "name": "Compute Correlation",
            "description": "Computes the correlation matrix for an input matrix (pairwise) with weights",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs": baseutils.getMatrixToMatrixInputs(true),
            "outputs":  baseutils.getMatrixToMatrixOutputs(),
            "buttonName": "Calculate",
            "shortname" : "cor",
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
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: computeCorrelation with vals', JSON.stringify(vals));
        //0 indicates even weighting
        let weightMatrix = this.inputs['weight'] || 0;
        let input = this.inputs['input'];

        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.computeCorrelationMatrixWASM(input, weightMatrix, {
                    "zscore" : super.parseBoolean(vals.zscore)
                }, vals.debug);

                resolve(); 
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

}

module.exports = ComputeCorrelationModule;
