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


class ProjectResliceImageModule extends BaseModule {
    constructor(md) {
        super();
        this.name = 'projectResliceImage';
        this.targetGUIInput = 'image';
        this.targetGUIViewer = 'viewer2';

        if (md==='overlay' || md==='single') {
            this.targetGUIInput = 'overlay';
            this.targetGUIViewer = 'viewer1';
        }
    }

    createDescription() {

        return {
            "name": "ProjectReslice Image",
            "description": "Project Reslices a 2D optical image via 3D to a new 2D atlas space optical image",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "shortname" : "prsl",
            "slicer" : true,
            "buttonName": "ProjectReslice",
            "inputs":   [
                {
                    'type': 'image',
                    'name': 'Image to Reslice',
                    'description': 'Load the 2D image to projectReslice',
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
                    'description' : 'Load the 3D reference image',
                    'varname' : 'reference',
                    'shortname' : 'r',
                    'required' : true,
                    'guiviewertype' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type' : 'image',
                    'name' : 'Angio Image',
                    'description' : 'Load the 3D angio image',
                    'varname' : 'angio',
                    'shortname' : 'a',
                    'required' : true,
                    'guiviewertype' : 'image',
                    'guiviewer'  : 'viewer2',
                },

                {
                    'type': 'transformation',
                    'name': '3D Transform 1',
                    'description': 'Load the transformation used to map Atlas to 3D Image of individual mouse',
                    'varname': 'xform',
                    'shortname' : 'x',
                    'required' : true,
                    'guiviewer' : 'current',
                },
                {
                    'type': 'transform',
                    'name': '3D Transformation 2',
                    'description': 'The second transformation used to map 3D Image to 3D optical image of individual mouse',
                    'varname': 'angioxform',
                    'required' : true,
                    'shortname' : 'y'
                },
                {
                    'type': 'transform',
                    'name': '2D Rotation',
                    'description': 'The mapping from projected angio to the optical image',
                    'varname': 'rotxform',
                    'required' : true,
                    'shortname' : 'z'
                }
            ],
            "outputs":[{
                'type': 'image',
                'name': 'Output Image',
                'description': 'Save the projectResliced image',
                'varname': 'output',
                'shortname' : 'o',
                'required': true,
                'extension' : '.nii.gz',
                'guiviewertype' : 'overlay',
                'guiviewer'  : 'viewer1',
                'colortype'  : 'Orange'
            },{
                'type': 'image',
                'name': 'Output 2D Atlas Image',
                'description': 'Save the projected 2D (from ref) image',
                'varname': 'ref2d',
                'shortname' : 'f',
                'required': false,
                'extension' : '.nii.gz',
                'guiviewertype' : 'overlay',
                'guiviewer'  : 'viewer2',
                'colortype'  : 'Orange'
            }],
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
                    "name": "VFlip",
                    "description": "It true flip the vertical  axis",
                    "priority": 11,
                    "advanced": true,
                    "gui": "check",
                    "varname": "flipy",
                    "type": 'boolean',
                    "default": true,
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
                    "default": 1,
                    "type": 'float',
                    "low": 0,
                    "high": 100000,
                    "step" : 0.1,
                },
                {
                    "name": "Depth",
                    "description": "Number of voxels to go below the brain surface",
                    "priority": 20,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "depth",
                    "default": 1,
                    "type": 'int',
                    "low": 1,
                    "high": 10,
                },
                baseutils.getDebugParam(),
            ]
        };

        
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: projectResliceImage with vals', JSON.stringify(vals));
        let xform = this.inputs['xform'] || null;
        let angioxform = this.inputs['angioxform'] || null;
        let rotxform = this.inputs['rotxform'] || null;
        let input = this.inputs['input'] || null;
        let angio = this.inputs['angio'] || null;
        let reference = this.inputs['reference'] || null;
        let debug=super.parseBoolean(vals.debug);
    
        if (xform === null || input===null || rotxform ===null || angioxform === null || reference ===null || angio === null) {
            return Promise.reject('Bad Inputs, one of them is null');
        }
        
        let coll=new BisWebTransformCollection();
        coll.addTransformation(xform);
        coll.addTransformation(angioxform);
        
        try {
            await biswrap.initialize();
        } catch(e) {
            return Promise.reject(e);
        }

        let axis=-1;
        let extraaxis=1;
        if (vals.axis.indexOf("z")>=0) {
            axis=2;
        } else if (vals.axis.indexOf("y")>=0) {
            axis=1;
            extraaxis=2;
        } else if (vals.axis.indexOf("x")>=0) {
            axis=0;
            extraaxis=2;
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
            

        let matrix=null;
        try {
            const obj={"flip":  this.parseBoolean(vals.flip),
                       "flipy":  this.parseBoolean(vals.flipy),
                       "axis":  parseInt(axis),
                       "depth": parseInt(vals.depth),
                       "2dheight" : angio.getDimensions()[parseInt(extraaxis)],
                       "2dspacing" : angio.getSpacing()[parseInt(extraaxis)],
                       "threshold": parseFloat(vals.threshold),
                      };
            console.log('oooo\noooo calling computeBackProjectAndProjectPointPairsWASM '+JSON.stringify(obj));
            matrix= await biswrap.computeBackProjectAndProjectPointPairsWASM(reference,
                                                                             coll,
                                                                             rotxform,
                                                                             obj,this.parseBoolean(vals.debug));
        } catch(e) {
            return Promise.reject(e);
        }

        console.log('oooo \t computed pair points=',matrix.getDescription());

        
        let temp=null;
        try {
            const obj={
                "domip": false,
                "flip":  this.parseBoolean(vals.flip),
                "axis":  parseInt(axis),
                "sigma": 1.0,
                "gradsigma": 1.0,
                "lps" : lps,
                "window": 1,
                "threshold": parseFloat(vals.threshold),
            };
            console.log('oooo calling projectImageWASM '+JSON.stringify(obj));
            temp=await biswrap.projectImageWASM(reference,0,obj,debug);
        } catch(e) {
            console.log(e);
            return Promise.reject(e);
        }

        this.outputs['ref2d']=temp;
        console.log('oooo \t computed template size=',temp.getDescription());
        
        this.outputs['output'] = new BisWebImage();

        try {
            console.log('oooo calling projectMapImageWASM ');
            this.outputs['output']=await biswrap.projectMapImageWASM(temp,input,matrix,debug);
            this.outputs['output'].copyOrientationInfo(input);
        } catch(e) {
            return Promise.reject(e);
        }

        console.log('oooo \t final output=',this.outputs['output'].getDescription());
        console.log('oooo \t final atlas=',this.outputs['ref2d'].getDescription());

        return Promise.resolve('All done');
    }
}


module.exports = ProjectResliceImageModule;

