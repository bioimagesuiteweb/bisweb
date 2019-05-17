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


 //node invocation: node --max-old-space-size=8192 bisweb.js indivparcellation --fmri ~/Desktop/mehraveh_data/pa0430_S004_bis_matrix_new_1_preprocessed_output.nii.gz  --group ~/Desktop/mehraveh_data/pa0430_S004_bis_matrix_new_1_voi.nii.gz --numexemplars 268 --smooth 0 --debug true
 //python invocation: python3 indivParc.py  ~/Desktop/mehraveh_data/pa0430_S004_bis_matrix_new_1_preprocessed_output.nii.gz  ~/Desktop/mehraveh_data/pa0430_S004_bis_matrix_new_1_voi.nii.gz   268 0 ~/Desktop/out.nii.gz
'use strict';

const biswrap = require('libbiswasm_wrapper');
const baseutils=require("baseutils");
const BaseModule = require('basemodule.js');
const BisWebLinearTransformation = require('bisweb_lineartransformation.js');

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
            "outputs":  baseutils.getImageToImageOutputs("Output the individualized parcellation",'viewer1','overlay'),
            "buttonName": "Individualize!",
            "shortname" : "indiv",
            "params": [
                {
                    "name": "Num Regions",
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
                    "name": "Smoothing",
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
                'name': 'fMRI Image',
                'description': 'The fMRI image to parcellate',
                'varname': 'fmri',
                'required' : true,
                'guiviewer' : 'viewer1',
                'guiviewertype'  : 'image',
            });

        des.inputs.push(
            {
                'type': 'image',
                'name': 'Input Parcellation',
                'description': 'The original (group) parcellation to individualize',
                'varname': 'group',
                'required' : true,
                'guiviewer' : 'viewer1',
                'guiviewertype'  : 'overlay',

            });
        return des;
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: individual parcellation with vals', JSON.stringify(vals));

        let fmri = this.inputs['fmri'];
        let group = this.inputs['group'];

        let fmriDim = fmri.getDimensions(), groupDim = group.getDimensions();

        return new Promise( async (resolve, reject) => {

            // Initialize C++ / WASM Library
            try {
                await biswrap.initialize();
            } catch(e) {
                reject(e);
                return;
            }

            // Reslice Group Parcellation if needed
            if (fmriDim[0] !== groupDim[0] || fmriDim[1] !== groupDim[1] || fmriDim[2] !== groupDim[2]) {
                console.log('++++ \t Group parcellation being resliced to match the fMRI image dimension...');
                let resl_paramobj = {
                    "interpolation": 0,
                    "dimensions": fmri.dimensions,
                    "spacing": fmri.spacing,
                    "datatype": "short",
                    "backgroundValue": 0.0,
                };

                try {
                    let linear=new BisWebLinearTransformation(0);
                    linear.identity();
                    group = await biswrap.resliceImageWASM(group, linear, resl_paramobj, vals.debug);
                } catch(e) {
                    reject('Resliced failed'+e);
                    return;
                }
            }

            console.log('++++ \t Group parcellation dims=', group.getDimensions());

            // Smooth fMRI  if needed
            let smooth=vals.smooth;
            if (smooth > 0.001 ) {
                console.log('++++ \t Smoothing fMRI image...');
                let c = smooth * 0.4247;
                let smooth_paramobj = {
                    "sigmas": [c, c, c],
                    "inmm": true,
                    "radiusfactor": 1.5,
                };
                try { 
                    fmri = await biswrap.gaussianSmoothImageWASM(fmri, smooth_paramobj, vals.debug);
                } catch(e) {
                    reject(e);
                    return;
                }
            }

            // Run Individualized Parcellation Code
            try {
                let paramobj= { 'numberofexemplars' : vals.numexemplars, "usefloat" : true };
                this.outputs['output']= await biswrap.individualizeParcellationWASM(fmri, group, paramobj, vals.debug);
                resolve();
            } catch(e) {
                reject(e);
                return;
            }
        });
    }
    

}

module.exports = IndivParcellationModule;
