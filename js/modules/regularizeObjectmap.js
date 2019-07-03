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

// Image to Image


/**
 * Regularize Objectmap  
 */
class RegularizeObjectmapModule extends BaseModule {
    constructor() {
        super();
        this.name = 'regularizeObjectmap';
    }


    createDescription() {
        let des={
            "name": "Regularize Objectmap ",
            "description": "Performs Objectmap regularization. An objectmap is an image where the values refer to different regions. This modules uses an MRF-based algorithm to smooth the segmentation map. It is similar to a median filter for a binary mask.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs("The binary mask to be regularized","viewer1","overlay"),
            "outputs": baseutils.getImageToImageOutputs("The output mask","viewer1","overlay"),
            "buttonName": "Smooth",
            "shortname" : "reg",
            "slicer" : true,
            "params": [
                {
                    "name": "Smoothness",
                    "description": "If > 0 then apply spatial regularization MRF model with this value as the weight",
                    "priority": 6,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "smoothness",
                    "default" : 2.0,
                    "low" : 1.0,
                    "high" : 32.0,
                },
                {
                    "name": "MRF Convergence",
                    "description": "Convergence parameter for the MRF iterations",
                    "priority": 7,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "varname": "convergence",
                    "default" : 0.2,
                    "low" :0.01,
                    "high" : 0.5,
                },
                {
                    "name": "Iterations",
                    "description": "Number of MRF iterations",
                    "priority": 8,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "iterations",
                    "default" : 8,
                    "low" : 1,
                    "high": 20,
                },
                {
                    "name": "Internal Iterations",
                    "description": "Number of Internal iterations",
                    "priority": 100,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "internaliterations",
                    "default" : 4,
                    "low" : 1,
                    "high": 20,
                },
                baseutils.getDebugParam(),
            ]
        };
        return des;
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: regularizeObjectmap with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let input = this.inputs['input'];
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.regularizeObjectmapWASM(input, {
                    "smoothness" : parseFloat(vals.smoothness),
                    "convergence" : parseFloat(vals.convergence),
                    "iterations" : parseInt(vals.iterations),
                    "internaliterations" : parseInt(vals.internaliterations),
                },vals.debug);

                resolve();
            }).catch( (e) => {
                reject(e.stack);
                
            });
        });
    }




}

module.exports = RegularizeObjectmapModule;
