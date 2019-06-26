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
 * 2D->3D Back Projection in various ways
 */
class BackProjectImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'backProjectImage';
        this.JSOnly=true;
    }

    
    createDescription() {
        return {
            "name": "BackProject 2D->3D",
            "description": "This algorithm performs back projection from 2D to 3D. This is meant for mapping 2D optical images to 3D MRI images",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "BackProject",
            "shortname" : "bprj",

            "inputs":  [
                {
                    'type': 'image',
                    'name': 'Input 2D',
                    'description': 'The image to be back-projected',
                    'varname': 'input',
                    'shortname': 'i',
                    'required': true,
                    'guiviewertype' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type': 'image',
                    'name': 'Target 3D',
                    'description': 'The image to backproject to',
                    'varname': 'target',
                    'shortname': 't',
                    'required': true,
                    'guiviewertype' : 'image',
                    'guiviewer'  : 'viewer2',
                },
                {
                    'type': 'transformation',
                    'name': 'Reslice Transform',
                    'description': 'The transformation to reslice the 2d image before backprojecting',
                    'varname': 'xform',
                    'shortname' : 'x',
                    'required' : false,
                    'guiviewer' : 'identity',
                },

            ],
            "outputs": baseutils.getImageToImageOutputs(null,'viewer2','overlay'),
            "params": [
                {
                    "name": "Flip",
                    "description": "It true project along the increasing axis",
                    "priority": 10,
                    "advanced": true,
                    "gui": "check",
                    "varname": "flip",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "VFlip",
                    "description": "It true flip the vertical  axis",
                    "priority": 11,
                    "advanced": true,
                    "gui": "check",
                    "varname": "flipy",
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
                    "name": "Threshold",
                    "description": "The intensity threshold to detect background in shaded projection",
                    "priority": 100,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "threshold",
                    "default": 0.5,
                    "type": 'float',
                    "low": 0,
                    "high": 1000,
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
                    "high": 40,
                },
                {
                    "name": "reduce",
                    "description": "Factor to reduce the resolution of the 2D image by",
                    "priority": 5,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "reduce",
                    "default": 2,
                    "type": 'int',
                    "low": 1,
                    "high": 8,
                },
                {
                    "name": "Interpolation",
                    "description": "Which type of interpolation to use (3 = cubic, 1 = linear, 0 = nearest-neighbor) when reducing",
                    "priority": 6,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "int",
                    "default" : "1",
                    "varname": "interpolation",
                    "fields" : [ 0,1,3 ],
                    "restrictAnswer" : [ 0,1,3],
                },

                baseutils.getDebugParam(),
            ],

        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: backProjectImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        let threed= this.inputs['target'];
        
        if (!input.hasSameOrientation(threed,'image1','image2',true))
            return Promise.reject('Failed');

        return new Promise( (resolve, reject) => {

            
            console.log('des=',input.getDescription(),threed.getDescription());

            let axis=-1;
            let plane=0;
            if (vals.axis.indexOf("z")>=0) {
                axis=2;
                plane=2;
            } else if (vals.axis.indexOf("y")>=0) {
                axis=1;
                plane=1;
            } else if (vals.axis.indexOf("x")>=0) {
                axis=0;
                plane=0;
            }

            biswrap.initialize().then(() => {


                let xform=this.inputs['xform'];
                if (xform) {

                    console.log('oooo reslicing with transformation first');
                    let ref2d = biswrap.extractImageSliceWASM(threed, {
                        "frame" : 0,
                        "component" : 0,
                        "slice" : 0,
                        "plane" : plane,
                    },vals.debug);


                    console.log('ref2d=',ref2d.getDescription());
                    
                    let spa=ref2d.getSpacing();
                    let dim=ref2d.getDimensions();
                    let dt="float";

                    input= biswrap.resliceImageWASM(input, xform, {
                        "spacing" : [ spa[0],spa[1],spa[2] ],
                        "dimensions" : [ dim[0],dim[1],dim[2] ],
                        "datatype" : dt,
                        "backgroundValue" : 0.0,
                        "interpolation" : parseInt(vals.interpolation)
                    },vals.debug);

                    console.log('Input=',input.getDescription());
                }
                
                let reduce=parseInt(vals.reduce);
                if (reduce>1) {
                    console.log('oooo reducing resolution by a factor of ',reduce);
                    let spa=threed.getSpacing();
                    for (let i=0;i<=2;i++)
                        spa[i]=spa[i]*reduce;
                    
                    threed = biswrap.resampleImageWASM(threed, {
                        "spacing" : [ spa[0],spa[1],spa[2] ],
                        "interpolation" : parseInt(vals.interpolation),
                        "backgroundValue" : 0.0
                    },vals.debug);

                    let spa2d=input.getSpacing();
                    for (let i=0;i<=1;i++)
                        spa2d[i]=spa2d[i]*reduce;

                    
                    input= biswrap.resampleImageWASM(input, {
                        "spacing" : [ spa2d[0],spa2d[1],spa2d[2] ],
                        "interpolation" : parseInt(vals.interpolation),
                        "backgroundValue" : 0.0
                    },vals.debug);

                }

                
                this.outputs['output'] = biswrap.backProjectImageWASM(threed,input, {
                    "flip":  this.parseBoolean(vals.flip),
                    "flipy":  this.parseBoolean(vals.flipy),
                    "axis":  parseInt(axis),
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




module.exports = BackProjectImageModule;
