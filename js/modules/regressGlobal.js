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


//DualMatrixToMatrix (first Matrix=average signal matrix, second is weight, output is matrix orthogonalized to average signal)
/**
 * Regresses a global signal out of a time series matrix with the option to specify weights for each point.
 * 
 */
class WeightedRegressGlobalModule extends BaseModule {
    constructor() {
        super();
        this.name = 'regressGlobal';
    }

    createDescription() {
        return {
            "name": "Regress Global Signal",
            "description": "Regresses the global signal (average) from a time series with the option to specify a weight matrix",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs":  baseutils.getMatrixToMatrixInputs(true),
            "outputs":  baseutils.getMatrixToMatrixOutputs(),
            "buttonName": "Regress",
            "shortname" : "glb",
            "params": [
                baseutils.getDebugParam()
            ]
        };

    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: regresGlobal with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let regress = this.inputs['input'];
            let weight = this.inputs['weight'] || 0;
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.weightedRegressGlobalSignalWASM(regress, weight, vals.debug);
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }


}

module.exports = WeightedRegressGlobalModule;
