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
const baseutils = require('baseutils.js');

/** 
 * Approximates the grid transformation required to align a displacement field to a given transformational state.
 * 
 */

class ApproximateFieldModule extends BaseModule {
    constructor() {
        super();
        this.name = 'approximateField';
        this.useworker=true;
    }


    createDescription() {
        let des = {
            "name": "Approximate Displacement Field",
            "description": "Calculates the displacement field for a given transformation for a given image.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs("Load the displacement field image to approximate"),
            "buttonName" : "Execute",
            "shortname" : "apprx",
            "params": [
                {
                    "name": "Smoothness",
                    "description": "Extra regularization smoothness term weight",
                    "priority": 12,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "lambda",
                    "default": 0.1,
                    "low": 0.0,
                    "high": 1.0,
                },
                {
                    "name": "Tolerance",
                    "description": "Fitting to tolerance",
                    "priority": 5,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "tolerance",
                    "default": 0.001,
                },
                {
                    "name": "Window Size",
                    "description": "Fitting quality",
                    "priority": 7,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "windowsize",
                    "low": 1.0,
                    "high": 2.0,
                    "default": 2.0,
                },
                {
                    "name": "Inverse",
                    "description": "if true approximate inverse displacement field",
                    "priority": 10,
                    "advanced": false,
                    "gui": "check",
                    "type": "boolean",
                    "varname": "inverse",
                    "default": false,
                },
                {
                    "name": "Spacing",
                    "description": "The control point spacing of the output grid transform",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "spacing",
                    "low": 2.0,
                    "high": 50.0,
                    "default": 25.0,
                }
            ]
        };

        des.params = des.params.concat(baseutils.getOptParams({ stepsize: 0.5, steps: 1, iterations: 20, levels: 2, resolution: 2.0 }));
        des.outputs = [{
            'type': 'transform',
            'name': 'Output Grid Transformation',
            'description': 'Stores the fitted transformation to the input displacement field',
            'varname': 'output',
            'required': true,
            'shortname': 'o'
        }];
        return des;
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: approximateField', JSON.stringify(vals));
        let inputImg = this.inputs['input'];

        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.approximateDisplacementFieldWASM2(inputImg, {
                    "spacing": parseFloat(vals.spacing),
                    "steps": parseInt(vals.steps),
                    "stepsize": parseFloat(vals.stepsize),
                    "lambda": parseFloat(vals.lambda),
                    "iterations": parseInt(vals.iterations),
                    "tolerance": parseFloat(vals.tolerance),
                    'optimization': baseutils.getOptimizationCode(vals.optimization),
                    "windowsize": parseFloat(vals.windowsize),
                    "levels": parseInt(vals.levels),
                    "resolution": parseFloat(vals.resolution),
                    "inverse": super.parseBoolean(vals.inverse),
                }, vals.debug);

                resolve();
            }).catch((e) => {
                reject(e.stack);
            });
        });
    }

}

module.exports = ApproximateFieldModule;
