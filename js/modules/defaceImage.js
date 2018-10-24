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
const baseutils=require("baseutils");
const BisWebImage = require('bisweb_image.js');
const genericio= require('bis_genericio');
const xformutil=require('bis_transformationutil.js');




/**
 * Performs binary defaceing to an image with the ability to specify both a low and a high deface. 
 * The algorithm can either replace values between the defaces, replace values out of the defaces, or both.
 * The values to replace 'in' and 'out' with must be specified by the user. 
 */
class DefaceImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'defaceImage';
        this.outputmask=false;
        this.JSOnly=true;
    }


    createDescription() {

        let m=this.outputmask;
        return {
            "name": "Deface",
            "description": "This module uses data from the openfmri project to deface an image by first affinely registering it to a template",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(null,'viewer1','overlay'),
            "buttonName": "Deface",
            "shortname" : "defaced",
            "params": [
                {
                    "name": "Resolution",
                    "description": "Factor to reduce the resolution prior to registration",
                    "priority": 1,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "varname": "resolution",
                    "default": 3.0,
                    "low": 1.0,
                    "high": 5.0,
                },
                {
                    "name": "Iterations",
                    "description": "Number of iterations (per level)",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "iterations",
                    "low": 1,
                    "high": 32,
                    "step" : 1,
                    "default": 5,
                },
                {
                    "name": "Levels",
                    "description": "Number of levels in multiresolution optimization",
                    "priority": 3,
                    "advanced": false,
                    "default": 2,
                    "type": "int",
                    "gui": "slider",
                    "varname": "levels",
                    "low": 1,
                    "high": 4,
                    "step" : 1,
                },
                {
                    "name": "Smoothing",
                    "description": "Amount of image smoothing to perform",
                    "priority": 4,
                    "advanced": true,
                    "type": "float",
                    "gui": "slider",
                    "varname": "imagesmoothing",
                    "default": 2.0,
                    "low":  0.0,
                    "high": 4.0,
                    "step" : 0.5,
                },
                {
                    "name": "Output Mask",
                    "description": "If true output the mask",
                    "priority": 5,
                    "advanced": true,
                    "gui": "check",
                    "varname": "outputmask",
                    "type": 'boolean',
                    "default": m,
                },
                baseutils.getDebugParam()
            ]
        };
    }
    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: defaceImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];

        let images = [ new BisWebImage(), new BisWebImage() ];

        let imagepath=genericio.getimagepath();
        
        return new Promise((resolve, reject) => {
            Promise.all( [
                images[0].load(`${imagepath}/mean_reg2mean.nii.gz`),
                images[1].load(`${imagepath}/facemask_char.nii.gz`),
                biswrap.initialize()
            ]).then( () => {

                let initial=0;
                let o1=input.getOrientationName();
                let o2=images[0].getOrientationName();
                let centeronrefonly=false;
                
                if (o1!==o2) {
                    centeronrefonly=true;
                    initial=xformutil.computeHeaderTransformation(input,images[0],false);
                }

                
                let matr = biswrap.runLinearRegistrationWASM(input, images[0], initial, {
                    'intscale' : 1,
                    'numbins' : 64,
                    'levels' : parseInt(vals.levels),
                    'centeronrefonly' : this.parseBoolean(centeronrefonly),
                    'smoothing' : parseFloat(vals.imagesmoothing),
                    'optimization' : 2,
                    'stepsize' : 1.0,
                    'metric' : 3,
                    'steps' : 1,
                    'iterations' : parseInt(vals.iterations),
                    'mode' : 3,
                    'resolution' : parseFloat(vals.resolution),
                    'normalize' : true,
                    'debug' : true,
                    'return_vector' : false}, this.parseBoolean(vals.debug));

                let temp=baseutils.resliceRegistrationOutput(biswrap,input,images[1],matr,1,0);

                if (this.parseBoolean(vals.outputmask)) {
                    // Make this short !!!!
                    let output = new BisWebImage();
                    output.cloneImage(temp, {
                        "type" : "uchar"
                    });
                    let odat=output.getImageData();
                    let tdat=temp.getImageData();
                    let l=tdat.length;
                    for (let i=0;i<l;i++) {
                        if (tdat[i]<50)
                            odat[i]=0;
                        else
                            odat[i]=1;
                    }
                    this.outputs['output']=output;
                } else {
                    let output=new BisWebImage();
                    output.cloneImage(input);
                    
                    let idat=input.getImageData();
                    let odat=output.getImageData();
                    let tdat=temp.getImageData();
                    
                    let dm=output.getDimensions();
                    let volumesize=dm[0]*dm[1]*dm[2];
                    let numframes=dm[3]*dm[4];
                    
                    
                    
                    let count=0;
                    
                    for (let i=0;i<volumesize;i++) {
                        let v=tdat[i];
                        if (v<50) {
                            count=count+1;
                            for (let f=0;f<numframes;f++) {
                                odat[f*volumesize+i]=0;
                            }
                        } else {
                            for (let f=0;f<numframes;f++) {
                                odat[f*volumesize+i]=idat[f*volumesize+i];
                            }
                        }
                    }
                    
                    console.log('Done masked=',count,'/',volumesize,' voxels');
                    this.outputs['output']=output;
                }
                resolve();

            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }



}

module.exports = DefaceImageModule;
