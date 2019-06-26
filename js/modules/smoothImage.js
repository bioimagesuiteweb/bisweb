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
const smreslice=require('bis_imagesmoothreslice');
/**
 * Applies Gaussian smoothing to an image using a given sigma (kernel size and strength) and radius factor. 
 */
class SmoothImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'smoothImage';
    }

    createDescription() {
        return {
            "name": "Smooth",
            "description": "This algorithm performs image smoothing using a 2D/3D Gaussian kernel",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('input'),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Smooth",
            "shortname" : "sm",
            "slicer" : true,
            "params": [
                {
                    "name": "Sigma",
                    "description": "The gaussian kernel standard deviation (either in voxels or mm)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 1.0,
                    "type": 'float',
                    "low":  0.0,
                    "high": 8.0
                },
                {
                    "name": "In mm?",
                    "description": "Determines whether kernel standard deviation (sigma) will be measured in millimeters or voxels",
                    "priority": 7,
                    "advanced": false,
                    "gui": "check",
                    "varname": "inmm",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "FWHMAX?",
                    "description": "If true treat kernel in units of full-width-at-half max (FWHM) (not as the actual value of the sigma in the gaussian filter.)",
                    "priority": 8,
                    "advanced": false,
                    "gui": "check",
                    "varname": "fwhmax",
                    "type": 'boolean',
                    "default": false,
                },
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
                {
                    "name": "vtkboundary",
                    "description": "If true mimic how VTK handles boundary conditions for smoothing (instead of tiling default)",
                    "priority": 10,
                    "advanced": true,
                    "gui": "check",
                    "varname": "vtkboundary",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Radius Factor",
                    "description": "This affects the size of the convolution kernel which is computed as sigma*radius+1",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": 'float',
                    "default": 2.0,
                    "lowbound": 1.0,
                    "highbound": 4.0,
                    "varname": "radiusfactor"
                },
                baseutils.getDebugParam(),
            ],

        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: smoothImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        let s = parseFloat(vals.sigma);
        if (super.parseBoolean(vals.fwhmax)) {
            s=s*0.4247;
        }
        
        if (super.parseBoolean(vals.usejs)) {
            let outdata={};
            console.log('+++ Using the JS Implementation of smoothImage');
            this.outputs['output']=smreslice.smoothImage(input, [s,s,s],
                                                         super.parseBoolean(vals.inmm),
                                                         parseFloat(vals.radiusfactor),
                                                         outdata,
                                                         super.parseBoolean(vals.vtkboundary));
            if (super.parseBoolean(vals.debug)) {
                console.log('+++ actualsigmas=',outdata);
            }
            return Promise.resolve();
        }

        return new Promise( (resolve, reject) => {
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.gaussianSmoothImageWASM(input, {
                    "sigmas": [s, s, s],
                    "inmm": super.parseBoolean(vals.inmm),
                    "radiusfactor": parseFloat(vals.radiusfactor),
                    "vtkboundary" : super.parseBoolean(vals.vtkboundary)
                }, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }



}

module.exports = SmoothImageModule;
