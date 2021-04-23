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

const BaseModule = require('basemodule.js');
const biswrap = require('libbiswasm_wrapper');
const baseutils=require("baseutils");
const BisWebTransformCollection = require('bisweb_transformationcollection');
const BisWebImage = require('bisweb_image');
const smreslice=require('bis_imagesmoothreslice');

class ResliceImageModule extends BaseModule {
    constructor(md) {
        super();
        this.name = 'resliceImage';
        this.targetGUIInput = 'image';
        this.targetGUIViewer = 'viewer2';

        if (md==='overlay' || md==='single') {
            this.targetGUIInput = 'overlay';
            this.targetGUIViewer = 'viewer1';
        }
    }

    createDescription() {

        return {
            "name": "Reslice Image",
            "description": "Reslices an existing image to match a reference and a transformation",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "shortname" : "rsl",
            "slicer" : true,
            "buttonName": "Reslice",
            "inputs":   [
                {
                    'type': 'image',
                    'name': 'Image to Reslice',
                    'description': 'Load the image to reslice',
                    'varname': 'input',
                    'shortname' : 'i',
                    'required' : true,
                    'guiviewertype' : this.targetGUIInput,
                    'guiviewer'  : this.targetGUIViewer,
                    'colortype'  : 'Orange'
                },
                {
                    'type' : 'image',
                    'name' : 'Reference Image',
                    'description' : 'Load the reference image (if not specified use input)',
                    'varname' : 'reference',
                    'shortname' : 'r',
                    'required' : false,
                    'guiviewertype' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type': 'transformation',
                    'name': 'Reslice Transform',
                    'description': 'Load the transformation used to reslice the image',
                    'varname': 'xform',
                    'shortname' : 'x',
                    'required' : true,
                    'guiviewer' : 'current',
                },
                {
                    'type': 'transform',
                    'name': 'Transformation 2',
                    'description': 'The second transformation to combine with first',
                    'varname': 'xform2',
                    'required' : false,
                    'shortname' : 'y'
                },
                {
                    'type': 'transform',
                    'name': 'Transformation 3',
                    'description': 'The third transformation to combine with first and second',
                    'varname': 'xform3',
                    'required' : false,
                    'shortname' : 'z'
                }
            ],
            "outputs":[{
                'type': 'image',
                'name': 'Output Image',
                'description': 'Save the resliced image',
                'varname': 'output',
                'shortname' : 'o',
                'required': false,
                'extension' : '.nii.gz',
                'guiviewertype' : 'overlay',
                'guiviewer'  : 'viewer1',
                'colortype'  : 'Orange'
            }],
            "params": [
                {
                    "name": "Interpolation",
                    "description": "Which type of interpolation to use (3 = cubic, 1 = linear, 0 = nearest-neighbor)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "int",
                    "default" : "1",
                    "varname": "interpolation",
                    "fields" : [ 0,1,3 ],
                    "restrictAnswer" : [ 0,1,3],
                },
                {
                    "name": "Force Float",
                    "description": "If true, force output to float",
                    "priority": 100,
                    "advanced": true,
                    "type": "boolean",
                    "default" : false,
                    "varname": "forcefloat",
                },
                {
                    "name": "Fill Value",
                    "description": "Value to use for outside the image",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "varname": "backgroundvalue",
                    "default" : 0.0,
                },
                {
                    "name": "Add Grid",
                    "description": "If true, adds a grid overlay to the image to visualize the effect of the transformation(s)",
                    "priority": 37,
                    "advanced": true,
                    "gui": "check",
                    "varname": "addgrid",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Grid Spacing",
                    "description": "If add grid is true this controls the grid spacing",
                    "priority": 38,
                    "advanced": true,
                    "gui": "slider",
                    "type": 'int',
                    "default": 8,
                    "lowbound": 4,
                    "highbound": 16,
                    "varname": "gridgap"
                },
                {
                    "name": "Grid Intensity",
                    "description": "If add grid is true this controls the intensity of the grid (as a function of the maximum image intensity)",
                    "priority": 39,
                    "advanced": true,
                    "gui": "slider",
                    "type": 'float',
                    "default": 0.5,
                    "lowbound": 0.1,
                    "highbound": 2.0,
                    "step" : 0.1,
                    "varname": "gridvalue"
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
                baseutils.getDebugParam(),
            ]
        };

        
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: resliceImage with vals', JSON.stringify(vals));
        let xform = this.inputs['xform'] || null;
        let input = this.inputs['input'];
        let reference = this.inputs['reference'] || input ;
        
        if (xform === null || input===null) {
            return Promise.reject('Either no image or no transformation specified');
        }
        
        let xform2=this.inputs['xform2'] || null;
        let xform3=this.inputs['xform3'] || null;
        
        if (xform2 || xform3) {
            let coll=new BisWebTransformCollection();
            coll.addTransformation(xform);
            if (xform2)
                coll.addTransformation(xform2);
            if (xform3)
                coll.addTransformation(xform3);
            xform=coll;
        }
        
        let spa=reference.getSpacing();
        let dim=reference.getDimensions();
        let dt="-1";
        if (vals.forcefloat) {
            dt="float";
        }

        if (super.parseBoolean(vals.usejs)) {

            console.log('+++ Using the JS Implementation of resliceImage');
            if (dt==="-1")
                dt='same';
            var output=new BisWebImage();
            let obj={ 'dimensions' : [dim[0],dim[1],dim[2]],  'spacing' : [ spa[0],spa[1],spa[2]], 'type' : dt  };
            console.log('+++ Reslice params=',JSON.stringify(obj));
            output.cloneImage(input, obj);

            smreslice.resliceImage(input,output,
                                   xform,
                                   parseInt(vals.interpolation),
                                   null,
                                   parseFloat(vals.backgroundvalue));
            this.outputs['output']=output;
            this.outputs['output'].copyOrientationInfo(reference);
            return Promise.resolve();
        }


        
        return new Promise((resolve, reject) => {
            
            biswrap.initialize().then(() => {

                
                let dogrid=this.parseBoolean(vals.addgrid);
                if (dogrid) {
                    console.log('oooo adding grid overlay first');
                    input = biswrap.addGridToImageWASM(input, {
                        "gap" : parseInt(vals.gridgap),
                        "value" : parseFloat(vals.gridvalue),
                    },vals.debug);
                }
                this.outputs['output'] = biswrap.resliceImageWASM(input, xform, {
                    "spacing" : [ spa[0],spa[1],spa[2] ],
                    "dimensions" : [ dim[0],dim[1],dim[2] ],
                    "datatype" : dt,
                    "backgroundValue" : parseFloat(vals.backgroundvalue),
                    "interpolation" : parseInt(vals.interpolation)
                },vals.debug);
                
                this.outputs['output'].copyOrientationInfo(reference);

                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }



}

module.exports = ResliceImageModule;
