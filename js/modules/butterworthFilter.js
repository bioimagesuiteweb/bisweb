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
 * Applies a Butterworth low/high pass filter to a matrix 
 * 
 * Takes cutoff frequency and sample rate as parameters (specified in Hz). Note that sample rate applies
 * to the sample rate of the device that acquired the matrix(?)
 */
class ButterworthFilterModule extends BaseModule {
    constructor() {
        super();
        this.name = 'butterworthFilter';
    }

    createDescription() {
        return {
            "name": "Butterworth Filter",
            "description": "This element will apply a Butterworth Filter to an input matrix",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs":  baseutils.getMatrixToMatrixInputs(),
            "outputs":  baseutils.getMatrixToMatrixOutputs(),
            "buttonName": "Filter",
            "shortname" : "bwf",
            "params": [
                {
                    "name": "Type",
                    "description": "What type of filter to apply (low, band, or high)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "string",
                    "varname": "type",
                    "fields": ["low", "band", "high"],
                    "restrictAnswer": ["low", "band", "high"],
                    "default": "band"
                },
                {
                    "name": "Low Frequency",
                    "description": "Lowpass cutoff frequency of filter (in Hertz)",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "low",
                    "low": 0.0,
                    "high": 10.0,
                    "default": 0.1,
                },
                {
                    "name": "High Frequency",
                    "description": "Highpass cutoff frequency of filter (in Hertz)",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "high",
                    "low": 0.0,
                    "high": 10.0,
                    "default": 0.01,
                },
                {
                    "name": "Sample Rate",
                    "description": "Data time of repetition (Data TR)",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "tr",
                    "default" : 1.0,
                    "low" : 0.01,
                    "high" : 5.0
                },
                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: butterworthFilter with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        
        return new Promise( (resolve, reject) => {
            biswrap.initialize().then(() => {

                let inp = input;
                let out = null;
                if (vals.type === "low" || vals.type === "band") {
                    out = biswrap.butterworthFilterWASM(input, {
                        "type": "low",
                        "cutoff": parseFloat(vals.high),
                        "samplerate": parseFloat(vals.tr)
                    }, super.parseBoolean(vals.debug));

                    if (vals.type === "low") {
                        this.outputs['output'] = out;
                        resolve();
                        return;
                    }
                    inp = out;
                }

                this.outputs['output'] = biswrap.butterworthFilterWASM(inp, {
                    "type": "high",
                    "cutoff": parseFloat(vals.low),
                    "samplerate": parseFloat(vals.tr)
                }, vals.debug);
                resolve();
            }).catch((e) => {
                reject(e.stack);
            });
        });
    }
}

module.exports = ButterworthFilterModule;
