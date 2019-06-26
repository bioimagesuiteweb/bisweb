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
const fmrimatrix   =require('bis_fmrimatrixconnectivity');
const BisWebMatrix   =require('bisweb_matrix');

// Three Matrix to Matrix 
// Input + Regressor + Weights --> Output = Input Orthogonalized to Regressor
/**
 * Applies one time series to another to find a regression line with the option to specify weights on 
 * a frame by frame basis, i.e. orthagonalizes the two time series.
 */
class WeightedRegressOutModule extends BaseModule {
    constructor() {
        super();
        this.name = 'regressOut';
    }

    createDescription() {
        let des={
            "name": "Weighted Regress Out",
            "description": "Regresses one time signal from another with the option to specify a weight matrix",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getMatrixToMatrixInputs(true),
            "outputs":  baseutils.getMatrixToMatrixOutputs(),
            "buttonName": "Regress",
            "shortname" : "rgr",
            "params": [
                {
                    "name": "UseJS",
                    "description": "Use the pure JS implementation of the algorithm",
                    "priority": 28,
                    "advanced": true,
                    "gui": "check",
                    "varname": "usejs",
                    "type": 'boolean',
                    "default": false,
                    "jsonly" : true,
                },
                baseutils.getDebugParam()
            ],
        };

        des.inputs.push(baseutils.getRegressorInput());
        return des;
    }

    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: regressOut with vals', JSON.stringify(vals));

        let input = this.inputs['input'];
        let regressor = this.inputs['regressor'] || 0;
        let weight = this.inputs['weight'] || 0;
        
        if (super.parseBoolean(vals.usejs)) {
            console.log('____ Using the JS Implementation of regressOut');
            if (weight)
                weight=weight.getNumericMatrix();
            else
                weight= null; // js code needs null not 0

            let out=fmrimatrix.weightedregressout(input.getNumericMatrix(),regressor.getNumericMatrix(),weight);
            
            this.outputs['output']=new BisWebMatrix();
            try {
                this.outputs['output'].setFromNumericMatrix(out);
            } catch(e) {
                console.log(e);
            }
            return Promise.resolve('done');
        }
        
        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.weightedRegressOutWASM(input, regressor, weight, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

}

module.exports = WeightedRegressOutModule;
