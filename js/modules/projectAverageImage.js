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
class ProjectAverageImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'projectAverageImage';
        this.JSOnly=true;
    }

    
    createDescription() {
        return {
            "name": "Project 3D->2D",
            "description": "This algorithm averages a 2D image in a mask and projects the average from a 3D image to a 2D",
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
                    'description': 'The mask used to average inside',
                    'varname': 'mask',
                    'shortname': 'm',
                    'required': true,
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
                baseutils.getDebugParam(),
            ],

        };
    }

    async directInvokeAlgorithm(vals) {

        console.log('oooo invoking: projectAverageImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        let mask=this.inputs['mask'];
        if (!input.hasSameOrientation(mask,'image','mask',true))
            return Promise.reject('Failed');

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

        try {
            await biswrap.initialize();
        } catch(e) {
            return Promise.reject(e);
        }

        try{
            this.outputs['output'] = biswrap.projectAverageImageWASM(input,mask, {
                "flip":  this.parseBoolean(vals.flip),
                "axis":  parseInt(axis),
                "lps" : lps,
            }, super.parseBoolean(vals.debug));
        } catch(e) {
            console.log(e);
            return Promise.reject(e);
        }
        
        return Promise.resolve('done');
    }
    
}




module.exports = ProjectAverageImageModule;
