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
const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const smoothreslice = require("bis_imagesmoothreslice.js");
const BisWebImage = require("bisweb_image.js");
const BisWebTransformCollection = require('bisweb_transformationcollection');
const BisWebLinearTransformation = require('bisweb_lineartransformation');

/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear).
 */
class MotionResliceModule extends BaseModule {
    constructor() {
        super();
        this.name = 'motionReslice';
        this.JSOnly=true;
        this.useworker=true;
    }

    getDescription() {
        return {
            "name": "Motion Reslices data",
            "description": "Reslices following motion correction",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "slicer" : true,
            "shortname" : "motresl",
            "inputs": [
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
                    'name': 'Reslice Transform (Atlas->Ref)',
                    'description': 'Load the transformation used to reslice the image',
                    'varname': 'xform',
                    'shortname' : 'x',
                    'required' : false,
                    'guiviewer' : 'current',
                },
                {
                    'type': 'transform',
                    'name': 'Transformation 2 (Ref->Conv)',
                    'description': 'The second transformation to combine with first',
                    'varname': 'xform2',
                    'required' : false,
                    'shortname' : 'y'
                },
                {
                    'type': 'transform',
                    'name': 'Transformation 3 (Conv->EPI)',
                    'description': 'The third transformation to combine with first and second',
                    'varname': 'xform3',
                    'required' : false,
                    'shortname' : 'z'
                },
                {
                    'type': 'collection',
                    'name': 'Motion Correction Collection',
                    'description': 'The output of the motion Correction',
                    'varname': 'motionparam',
                    'required' : true,
                    'shortname' : 'm'
                }
            ],
            "outputs":[{
                'type': 'image',
                'name': 'Output Image',
                'description': 'Save the motion resliced image',
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
                    "default" : "3",
                    "varname": "interpolation",
                    "fields" : [ 0,1,3 ],
                    "restrictAnswer" : [ 0,1,3],
                },
                {
                    "name": "Force Float",
                    "description": "If true force output to float",
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
                    "name": "Res factor",
                    "description": "The amount to downsample the reference by",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "res",
                    "default" : 2.0,
                    "low" : 1.0,
                    "high" : 4.0
                },
                baseutils.getDebugParam(),
            ]
        };

    }

    directInvokeAlgorithm(vals) {
        console.log('oooo MotionReslice invoking with vals', JSON.stringify(vals));
        return new Promise( (resolve, reject) => {
            let input_image = this.inputs['input'] || null;
            let reference = this.inputs['reference'] || input_image;
            let matrices = this.inputs['motionparam'] || null;

            if (!reference.hasSameOrientation(input_image,'reference image','input image',true)) {
                reject('Failed');
                return;
            }
            
            
            if (!input_image || !matrices ) {
                reject("Either input or motion params is not specified");
                return;
            }

            let numframes=matrices.getNumberOfItems();
            
            if (input_image.getDimensions()[3]!==numframes) {
                reject("Either input has different number of frames than motion parameters");
                return;
            }

            console.log('oooo Motion Parameters=',matrices.getDescription());

            let output_image = new BisWebImage();

            let dt="same";
            if (vals.forcefloat) {
                dt="float";
            }

            
            let dimensions=reference.getDimensions();
            let spacing = reference.getSpacing();
            let res=parseFloat(vals.res);
            if (res<0.5)
                res=0.5;
            
            console.log('oooo Original dimensions:',dimensions,' spacing:', spacing);
            for (let i=0;i<=2;i++) {
                dimensions[i]=Math.round(dimensions[i]/res);
                spacing[i]=spacing[i]*res;
            }

            console.log('oooo Scaled (',res,') dimensions:',dimensions,' spacing:', spacing);

            
            output_image.cloneImage(input_image,
                                    { dimensions : dimensions,
                                      spacing : spacing,
                                      numframes : numframes,
                                      type : dt,
                                    });

            // Different signalling for WASM
            if (dt!=="float")
                dt=-1;

            let volumesize = dimensions[0] * dimensions[1] * dimensions[2];
            let outdata = output_image.getImageData();

            let xform=this.inputs['xform'] || null;
            let xform2=this.inputs['xform2'] || null;
            let xform3=this.inputs['xform3'] || null;

            let combinedXform=new BisWebTransformCollection();

            if (xform)
                combinedXform.addTransformation(xform);
            if (xform2)
                combinedXform.addTransformation(xform2);
            if (xform3)
                combinedXform.addTransformation(xform3);

            // This is a placeholder for the motion
            combinedXform.addTransformation(new BisWebLinearTransformation());
            let motionindex=combinedXform.getNumberOfTransformations()-1;

            console.log('oooo Using ', combinedXform.getNumberOfTransformations(), ' transformations to reslice');

            biswrap.initialize().then(() => {
                
                for (let frame = 0; frame < numframes; frame++) {
                    
                    let debug=false;
                    if (vals.debug && frame===1)
                        debug=true;
                    
                    let InputFrame = smoothreslice.imageExtractFrame(input_image,frame);
                    
                    combinedXform.setTransformation(motionindex,matrices.getItemData(frame));
                    if (debug)
                        console.log(' In Frame',frame,combinedXform.getDescription());
                    
                    let resliceW = biswrap.resliceImageWASM(InputFrame, combinedXform, {
                        "interpolation": parseInt(vals.interpolation),
                        "datatype" : dt,
                        "backgroundValue" : parseFloat(vals.backgroundvalue),
                        "dimensions": dimensions,
                        "spacing": spacing
                    }, debug);

                    if (debug)
                        console.log(' Resliced Frame',frame,resliceW.getDescription());
                    
                    let inp_data = resliceW.getImageData();
                    let offset = frame * volumesize;
                    
                    for (let i = 0; i < volumesize; i++)
                        outdata[i + offset] = inp_data[i];
                    if (frame%25 ===0 && vals.debug) 
                        console.log('++++ Resliced frame',frame);
                }
                
                this.outputs['output']=output_image;
                resolve();
            }).catch( (e) => {
                console.log(e.stack);
                reject(e);
            });
        });
    }
}

module.exports = MotionResliceModule;
