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
const numeric=require('numeric');

/**
 * Calculates the Generalized Linear Model (GLM) of an fMRI data set. Takes a regressor (independent variable), 
 * image time series (dependent variable), an optional input mask, and returns a linear model.
 */
class ComputeGLMModule extends BaseModule {
    constructor() {
        super();
        this.name = 'computeGLM';
    }

    createDescription() {
        let des= {
            "name": "Compute GLM",
            "description": "Calculates the Generalized linear model (GLM) for fMRI data sets",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "outputs":  baseutils.getImageToImageOutputs("Output beta map image"),
            "buttonName": "Calculate",
            "shortname" : "glm",
            "params": [
                {
                    "name": "Num Tasks",
                    "description": "How many of the actual columns in the regressor are actual tasks -- if 0 then all.",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "numtasks",
                    "default" : 0,
                    "low" : 0,
                    "high": 20,
                },
                baseutils.getDebugParam()
            ]
        };

        des.inputs= baseutils.getImageToImageInputs('Load the image to fit the model to');
        des.inputs.push(baseutils.getRegressorInput());
        des.inputs.push(
            {
                'type': 'image',
                'name': 'Load Mask Image',
                'description': 'Load the mask for the input',
                'varname': 'mask',
                'required' : false,
            });
        return des;

    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: computeGLM with vals', JSON.stringify(vals));
        
        return new Promise( (resolve, reject) => {
            let input = this.inputs['input'];
            
            //'0' indicates no mask
            let mask = this.inputs['mask'] || 0;

            let usemask=false;
            if (mask)
                usemask=true;
            
            let regressor = this.inputs['regressor'];

            let sz=numeric.dim(regressor);
            let numtasks=parseInt(vals.numtasks);
            if (numtasks<=0 || numtasks>=sz[1])
                numtasks=sz[1];
            
            biswrap.initialize().then( () => {
                this.outputs['output'] = biswrap.computeGLMWASM(input, mask, regressor, {
                    'numtasks' : numtasks,
                    'usemask' : usemask 
                }, vals.debug);
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
    

}

module.exports = ComputeGLMModule;
