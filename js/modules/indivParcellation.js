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
class IndivParcellationModule extends BaseModule {
    constructor() {
        super();
        this.name = 'computeGLM';
    }

    createDescription() {
        let des= {
            "name": "Compute Individualized parcellation",
            "description": "Calculates the Individualized parcellation starting from a group parcellation",
            "author": "Mehraveh Salehi",
            "version": "1.0",
            "outputs":  baseutils.getImageToImageOutputs("Output the individualized parcellation"),
            "buttonName": "Individualize!",
            "shortname" : "indiv",
            "params": [
                {
                    "name": "Number of Exemplars",
                    "description": "The number of exemplars in the group parcellation",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "numexemplars",
                    "default" : 268,
                    "low" : 1,
                    "high": 5000,
                },
                {
                    "name": "Smoothing Kernel BW",
                    "description": "Kernel size [mm] of FWHM filter size",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "smooth",
                    "default" : 4,
                    "low" : 0,
                    "high": 20,
                },
                baseutils.getDebugParam()
            ]
        };

        des.inputs = []; 
        des.inputs.push(
            {
                'type': 'image',
                'name': 'Load fMRI Image',
                'description': 'Load the fMRI for the input',
                'varname': 'fmri',
                'required' : true,
            });

        des.inputs.push(
            {
                'type': 'image',
                'name': 'Load group parcellation Image',
                'description': 'Load the group parcellation for the input',
                'varname': 'group',
                'required' : true,
            });
        return des;
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: computeGLM with vals', JSON.stringify(vals));



        return new Promise((resolve, reject) => {
            let fmri = this.inputs['fmri'];

            let fmriDim = fmri.getDimensions(), groupDim = group.getDimensions();
            if (fmriDim[0] !== groupDim[0] || fmriDim[1] !== groupDim[1] || fmriDim[2] !== groupDim[2]) {
                console.log('++++ \t Group parcellation being resliced to match the fMRI image dimension...');
                let resl_paramobj = {
                    "interpolation": 0,
                    "dimensions": fmri.dimensions,
                    "spacing": fmri.spacing,
                    "datatype": "short",
                    "backgroundValue": 0.0,
                };

                let matr = numeric.identity(4);
                biswrap.initialize().then(() => {
                    group = libbiswasm.resliceImageWASM(group, matr, resl_paramobj, 2);
                });
            }

            console.log('++++ \t Group parcellation dims=', group_resliced.dimensions);

            if (smooth !== 0) {
                console.log('++++ \t Smoothing fMRI image...');
                let c = smooth * 0.4247;
                let smooth_paramobj = {
                    "sigmas": [c, c, c],
                    "inmm": True,
                    "radiusfactor": 1.5,
                }
                let debug = 2;
                fmri = libbiswasm.gaussianSmoothImageWASM(fmri, smooth_paramobj, debug);
            }



            out_img = libbiswasm.individualizeParcellationWASM(fmri, group, paramobj, 2);

            
            //'0' indicates no mask
            /*let mask = this.inputs['mask'] || 0;

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
            });*/
        });
    }
    

}

module.exports = IndivParcellationModule;
