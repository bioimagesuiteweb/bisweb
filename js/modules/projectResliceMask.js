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

const numeric=require('numeric');
const BisWebLinearTransformation = require('bisweb_lineartransformation.js');

class ProjectResliceMaskModule extends BaseModule {
    constructor(md) {
        super();
        this.name = 'projectResliceMask';
        this.targetGUIInput = 'image';
        this.targetGUIViewer = 'viewer2';

        if (md==='overlay' || md==='single') {
            this.targetGUIInput = 'overlay';
            this.targetGUIViewer = 'viewer1';
        }
    }

    createDescription() {

        return {
            "name": "ProjectReslice Mask",
            "description": "Reslices and projects a 3D mask to a 2d optical image",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "shortname" : "prsl",
            "slicer" : true,
            "buttonName": "ProjectReslice",
            "inputs":   [
                {
                    'type': 'image',
                    'name': 'reference',
                    'description': 'The 2D optical image to project mask to',
                    'varname': 'reference',
                    'shortname' : 'r',
                    'required' : true,
                    'guiviewertype' : this.targetGUIInput,
                    'guiviewer'  : this.targetGUIViewer,
                    'colortype'  : 'Orange'
                },
                {
                    'type' : 'image',
                    'name' : 'Mask',
                    'description' : 'The 3D image or mask (thresholded at 1)',
                    'varname' : 'mask',
                    'shortname' : 'm',
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
                    'type': 'transform',
                    'name': '3D Transformation 2',
                    'description': 'Thetransformation used to map 3D Image to 3D optical image of individual mouse',
                    'varname': 'angioxform',
                    'required' : true,
                    'shortname' : 'x'
                },
                {
                    'type': 'transform',
                    'name': '2D Rotation',
                    'description': 'The mapping from projected angio to the optical image',
                    'varname': 'rotxform',
                    'required' : true,
                    'shortname' : 'y'
                }
            ],
            "outputs":[{
                'type': 'image',
                'name': 'Output mask',
                'description': 'Save the projectResliced mask',
                'varname': 'output',
                'shortname' : 'o',
                'required': true,
                'extension' : '.nii.gz',
                'guiviewertype' : 'overlay',
                'guiviewer'  : 'viewer1',
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
                    "name": "Objectmap",
                    "description": "If set treat image as object map and do not interpolate",
                    "priority": 101,
                    "advanced": true,
                    "gui": "check",
                    "varname": "isobjectmap",
                    "type": 'boolean',
                    "default": false,
                },
                baseutils.getDebugParam(),
            ]
        };

        
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: projectResliceMask with vals', JSON.stringify(vals));
        let angioxform = this.inputs['angioxform'] || null;
        let rotxform = this.inputs['rotxform'] || null;
        let referenceimage = this.inputs['reference'] || null;
        let angioimage = this.inputs['angio'] || null;
        let maskimage = this.inputs['mask'] || null;
        let debug=super.parseBoolean(vals.debug);
        let isobjectmap=super.parseBoolean(vals.isobjectmap);
        let interp=1;
        if (isobjectmap)
            interp=0;

        if (angioxform===null || rotxform ===null) {
            return Promise.reject('Bad Transformations, one of them is null');
        }

        if (referenceimage == null || maskimage ===null || angioimage === null) {
            return Promise.reject('Bad images, one of them is null');
        }

        if (angioxform.getMatrix === undefined ||
            rotxform.getMatrix === undefined ) {
            return Promise.reject('Only linear transformations are allowed');
        }

        try {
            await biswrap.initialize();
        } catch(e) {
            return Promise.reject(e);
        }

        // Process parameters
        // ------------------------------------------------------------------
        let axis=-1;
        if (vals.axis.indexOf("z")>=0) {
            axis=2;
        } else if (vals.axis.indexOf("y")>=0) {
            axis=1;
        } else if (vals.axis.indexOf("x")>=0) {
            axis=0;
        }
        
        let orient=maskimage.getOrientationName();
        let lps=false;
        if (orient==='LPS') {
            lps=true;
            if (vals.flip)
                vals.flip=false;
            else
                vals.flip=true;
        }
            

        
        // 1. Invert matrix transformations
        // ------------------------------------------------------------------
        const a1=numeric.inv(angioxform.getMatrix());
        const angioxforminv= new BisWebLinearTransformation();
        angioxforminv.setMatrix(a1);

        const a2=numeric.inv(rotxform.getMatrix());
        const rotxforminv= new BisWebLinearTransformation();
        rotxforminv.setMatrix(a2);

        // 3 steps
        // 1 reslice mask
        // 2 project mask to optical
        // 3 rotate mask
        

        // 1. Mask resliced to angio
        // ------------------------------------------------------------------
        let temp_angio_mask = null;

        try {
            let spa=angioimage.getSpacing();
            let dim=angioimage.getDimensions();

            temp_angio_mask=await biswrap.resliceImageWASM(maskimage, angioxforminv, {
                "spacing" : [ spa[0],spa[1],spa[2] ],
                "dimensions" : [ dim[0],dim[1],dim[2] ],
                "backgroundValue" : 0.0,
                "interpolation" : interp
            },vals.debug);
        } catch(e) {
            return Promise.reject('Failed to reslice mask to angio space '+e);
        }

        // 2. Project mask to 2d space
        // ------------------------------------------------------------------
        let temp_projected_mask=null;
        let window=1,sigma=1.0,gradsigma=1.0,domip=true;
        if (isobjectmap) {
            window=0;
            sigma=-1.0;
            gradsigma=-1.0;
            domip=false;
        }
        try {
            const obj={
                "domip": domip,
                "flip":  this.parseBoolean(vals.flip),
                "axis":  parseInt(axis),
                "sigma": sigma,
                "gradsigma": gradsigma,
                "lps" : lps,
                "window": window,
                "threshold": parseFloat(vals.threshold),
            };
            console.log('oooo calling projectImageWASM '+JSON.stringify(obj));
            temp_projected_mask=await biswrap.projectImageWASM(temp_angio_mask,0,obj,debug);
        } catch(e) {
            console.log(e);
            return Promise.reject(e);
        }

        // 3. Finally reslice to optical
        // ------------------------------------------------------------------

        try {
            const spa=referenceimage.getSpacing();
            const dim=referenceimage.getDimensions();

            let temp_image = await biswrap.resliceImageWASM(temp_projected_mask,rotxforminv, {
                "spacing" : [ spa[0],spa[1],spa[2] ],
                "dimensions" : [ dim[0],dim[1],dim[2] ],
                "backgroundValue" : 0.0,
                "interpolation" : interp
            },vals.debug);

            let range=temp_image.getIntensityRange();

            if (!isobjectmap) {
                this.outputs['output']= biswrap.thresholdImageWASM(temp_image, {
                    "low": 0.1,
                    "high": range[1]+1,
                    "replacein" : true,
                    "replaceout" : true,
                    "invalue" : 1,
                    "outvalue" : 0,
                    "datatype" : 'uchar'
                },vals.debug);
            } else {
                this.outputs['output']= biswrap.thresholdImageWASM(temp_image, {
                    "low": 1,
                    "high": range[1]+1,
                    "replacein" : false,
                    "replaceout" : true,
                    "invalue" : 1,
                    "outvalue" : 0,
                    "datatype" : 'short'
                },vals.debug);
            }
            
        } catch(e) {
            return Promise.reject('Failed to reslice mask to angio space '+e);
        }

        return Promise.resolve('All done');
    }
}

module.exports = ProjectResliceMaskModule;

