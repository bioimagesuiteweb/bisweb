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
 * 3D->2D Projection in various ways
 */
class ProjectImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'projectImage';
        this.JSOnly=true;
    }

    
    createDescription() {
        return {
            "name": "Project 3D->2D",
            "description": "This algorithm performs image projection from a 3D image to a 2D image using eigher MIP or shaded projection",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs" : [
                {
                    'type': 'image',
                    'name': 'Input Image',
                    'description': 'The image to be projected',
                    'varname': 'input',
                    'shortname': 'i',
                    'required': true,
                    'guiviewerinput' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type': 'image',
                    'name': 'Mask Image',
                    'description': 'The mask used to estimate the boundary',
                    'varname': 'mask',
                    'shortname': 'm',
                    'required': false,
                    'guiviewertype' : 'overlay',
                    'guiviewer'  : 'viewer1',
                    'colortype'  : 'Red'
                }
            ],
            "outputs": baseutils.getImageToImageOutputs(null,'viewer2'),
            "buttonName": "Project",
            "shortname" : "prj",
            "params": [
                {
                    "name": "Mode",
                    "description": "Mode, mip,project,average",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "default" : "mip",
                    "type" : "string",
                    "fields" : ["mip","project","average" ],
                    "restrictAnswer" : ["mip","project","average" ],
                    "varname": "mode",
                },
                {
                    "name": "UseMask",
                    "description": "It true project use the mask (no mip in that case)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "check",
                    "varname": "usemask",
                    "type": 'boolean',
                    "default": false,
                },

                {
                    "name": "Sigma",
                    "description": "The gaussian kernel standard deviation (either in voxels or mm)",
                    "priority": 1,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 0.0,
                    "type": 'float',
                    "low": 0.0,
                    "high": 3.0
                },
                {
                    "name": "Flip",
                    "description": "It true project along the increasing axis",
                    "priority": 10,
                    "advanced": false,
                    "gui": "check",
                    "varname": "flip",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Axis",
                    "description": "Which axis to project along ('x', 'y', 'z', 'auto')",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "default" : "y",
                    "type" : "string",
                    "fields" : ["x","y","z", "auto"],
                    "restrictAnswer" : ["x","y","z", "auto" ],             
                    "varname": "axis",
                },
                {
                    "name": "Gradient Sigma",
                    "description": "The gaussian kernel standard deviation for gradient computation (in 'project' mode)",
                    "priority": 8,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "gradsigma",
                    "default": 2.0,
                    "type": 'float',
                    "low": 0.0,
                    "high": 4.0,
                    "step" : 0.5,
                },
                {
                    "name": "Threshold",
                    "description": "The intensity threshold to detect background in shaded projection",
                    "priority": 100,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "threshold",
                    "default": 1,
                    "type": 'float',
                    "low": 0,
                    "high": 100000,
                    "step" : 0.1,
                },
                {
                    "name": "Windowsize",
                    "description": "Number of voxels to average in 'average' or 'project' mode",
                    "priority": 20,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "window",
                    "default": 3,
                    "type": 'int',
                    "low": 1,
                    "high": 10,
                },
                baseutils.getDebugParam(),
            ],

        };
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: projectImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        let usemask=this.parseBoolean(vals.usemask);
        let mask=0;
        if (usemask) {
            mask=this.inputs['mask'] || 0;
            if (!input.hasSameOrientation(mask,'image','mask',true))
                return Promise.reject('Failed');
        }

        return new Promise( (resolve, reject) => {

            let axis=-1;
            if (vals.axis.indexOf("z")>=0) {
                axis=2;
            } else if (vals.axis.indexOf("y")>=0) {
                axis=1;
            } else if (vals.axis.indexOf("x")>=0) {
                axis=0;
            }

            let orient=input.getOrientationName();
            let lps=false;
            if (orient==='LPS') {
                lps=true;
                if (vals.flip)
                    vals.flip=false;
                else
                    vals.flip=true;
            }
            
            biswrap.initialize().then(() => {

                let domip= (vals.mode === 'mip');

                let gradsigma=parseFloat(vals.gradsigma);
                if (vals.mode==='average')
                    gradsigma=0.0;

                this.outputs['output'] = biswrap.projectImageWASM(input,mask, {
                    "domip": domip,
                    "flip":  this.parseBoolean(vals.flip),
                    "axis":  parseInt(axis),
                    "sigma": parseFloat(vals.sigma),
                    "gradsigma": gradsigma,
                    "lps" : lps,
                    "window": parseInt(vals.window),
                    "threshold": parseFloat(vals.threshold),
                }, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                console.log(e.stack);
                reject(e);
            });
        });
    }
    
    updateOnChangedInput(inputs) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let current_input = inputs['input'] || null;
        if (current_input===null)
            return newDes;

        let imagerange = current_input.getIntensityRange();

        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            if(name === 'threshold') { 
                newDes.params[i].low = imagerange[0];
                newDes.params[i].high = imagerange[1];
                newDes.params[i].default = 0.95 * imagerange[0] + 0.05 * imagerange[1]; 
            }
        }
        this.recreateGUI=true;
        return newDes;
    }

}




module.exports = ProjectImageModule;
