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
const tfRecon=require('tfRecon');
const numeric=require('numeric');

/**
 * Performs skull strip of  an image with the ability to specify both a low and a high deface. 
 * The algorithm can either replace values between the defaces, replace values out of the defaces, or both.
 * The values to replace 'in' and 'out' with must be specified by the user. 
 */
class SkullStripImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'defaceImage';
        this.JSOnly=true;
    }


    createDescription() {

        return {
            "name": "SkullStrip",
            "description": "This module uses data from the openfmri project to deface an image by first affinely registering it to a template",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(null,'viewer1','overlay'),
            "buttonName": "SkullStrip",
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
                    "advanced": true,
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
                    "name": "Register to MNI",
                    "description": "If true register to MNI",
                    "priority": 5,
                    "advanced": false,
                    "gui": "check",
                    "varname": "register",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "Median Normalize",
                    "description": "If true perform median normalization",
                    "priority": 10,
                    "advanced": true,
                    "gui": "check",
                    "varname": "mednorm",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "Output Mask",
                    "description": "If true output the mask",
                    "priority": 5,
                    "advanced": false,
                    "gui": "check",
                    "varname": "outputmask",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "MNI Mask",
                    "description": "If true initialize by masking close to MNI brain",
                    "priority": 35,
                    "advanced": true,
                    "gui": "check",
                    "varname": "mnimask",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Use TF",
                    "description": "If true use the deep learning model",
                    "priority": 35,
                    "advanced": true,
                    "gui": "check",
                    "varname": "usetf",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "Num Erosions",
                    "description": "Number of erosions/dilations (2)",
                    "priority": 22,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "erosions",
                    "low": 0,
                    "high": 4,
                    "step" : 1,
                    "default": 2,
                },
                {
                    "name": "Model name",
                    "description": "Location of Model to use",
                    "priority": 20,
                    "advanced": true,
                    "varname": 'modelname',
                    "type": 'string',
                    "default" : '',
                },
                baseutils.getDebugParam()
            ]
        };
    }


    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: skullStrip with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        
        let matr=null;
        let reslicedInput=input;
        let debug=vals['debug'];
        if (!this.parseBoolean(vals.usetf)) {
            vals['register']=true;
        }

        console.log("This far",debug,input.getDescription());
        return new Promise( (resolve,reject) => {
            biswrap.initialize().then( async () => {

                console.log('Here');
                
                if (this.parseBoolean(vals['register'])) {

                    console.log('oooo Registering to MNI and optionally masking');
                    
                    let images = [ new BisWebImage(), new BisWebImage() ];
                    let imagepath=genericio.getimagepath();
                    let p=[
                        images[0].load(`${imagepath}/MNI_T1_1mm_ras.nii.gz`),
                        images[1].load(`${imagepath}/MNI_T1_1mm_mask.nii.gz`),
                    ];

                    try {
                        await Promise.all(p);
                    } catch(e) {
                        reject(e);
                        return;
                    }
                    
                    
                    let initial=0;
                    let o1=input.getOrientationName();
                    let o2=images[0].getOrientationName();
                    let centeronrefonly=false;
                    
                    if (o1!==o2) {
                        centeronrefonly=true;
                        initial=xformutil.computeHeaderTransformation(input,images[0],false);
                    }
                    
                    
                    matr = biswrap.runLinearRegistrationWASM(images[0],input, initial, {
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
                    
                    reslicedInput=baseutils.resliceRegistrationOutput(biswrap,images[0],input,matr,1,0);
                    
                    if (this.parseBoolean(vals.mnimask)) {
                        console.log("Resliced = ",reslicedInput.getDescription());
                        console.log("Mask = ",images[1].getDescription());
                        console.log('oooo Masking close to  MNI');
                        let rdat=reslicedInput.getImageData();
                        let mdat=images[1].getImageData();
                        let l=rdat.length;
                        for (let i=0;i<l;i++) {
                            if (mdat[i]<1)
                                rdat[i]=0;
                        }
                    } else {
                        console.log('---- Not Masking');
                    }
                } else {
                    console.log('---- Not Registering');
                }

                let tfOutput=reslicedInput;
                if (this.parseBoolean(vals.usetf)) {
                    // Step 2
                    let normalized=null;
                    if (this.parseBoolean(vals.mednorm)) {
                        console.log('oooo median Normalize Image');
                        normalized=biswrap.medianNormalizeImageWASM(reslicedInput,1);
                    } else {
                        console.log('---- Not median Normalize Image');
                        normalized=reslicedInput;
                    }
                    
                    // Step 3 TF
                    console.log('oooo deep Learning Now');
                    let modelname = vals.modelname;
                    if (modelname.length<2)
                        modelname='http://bisweb.yale.edu/models/abcd_leave_out_site01_tfjs/';

                    let mod0=new tfRecon();
                    mod0.makeInternal();
                    await mod0.execute( {'input' : normalized },
                                        {'modelname' : modelname,
                                         'debug' : debug
                                        });
                    tfOutput=mod0.getOutputObject('output');
                    normalized=null;
                }

                let nume=parseInt(vals.erosions);
                let morphOutput=tfOutput; 
                if (nume>0) {
                    console.log('oooo Erosions and Dilations');
                    let temp=tfOutput; tfOutput=null;

                    // Step 4 Erode/Dilate

                    for (let i=0;i<nume;i++) {
                        console.log('oooo Erode ',i+1,'/',nume);
                        temp= biswrap.morphologyOperationWASM(temp, {     "operation" : "erode",
                                                                          "radius" : 1,
                                                                          "do3d" : true }, debug);
                    }
                    for (let i=0;i<2*nume;i++) {
                        console.log('oooo Dilate ',i+1,'/',nume*2);
                        temp= biswrap.morphologyOperationWASM(temp, {     "operation" : "dilate",
                                                                          "radius" : 1,
                                                                          "do3d" : true }, debug);
                    }
                    for (let i=0;i<nume;i++) {
                        console.log('oooo Erode ',i+1,'/',nume);
                        temp= biswrap.morphologyOperationWASM(temp, {     "operation" : "erode",
                                                                          "radius" : 1,
                                                                          "do3d" : true }, debug);
                    }
                    morphOutput=temp; temp=null;
                }


                if (matr!==null) {
                    console.log('oooo inverse Reslice Back to Native Space');
                    let mat=matr.getMatrix();
                    console.log('oooo Forward mat',mat);
                    let imat=numeric.inv(mat);
                    console.log('oooo Inverse mat',imat);
                    matr.setMatrix(imat);
                    morphOutput=baseutils.resliceRegistrationOutput(biswrap,input,morphOutput,matr,0,0);
                }
                
                if (!this.parseBoolean(vals.outputmask)) {
                    // Make this short !!!!
                    console.log('oooo Masking Input ');
                    let output = new BisWebImage();
                    output.cloneImage(input);
                    let odat=output.getImageData();
                    let tdat=morphOutput.getImageData();
                    let idat=input.getImageData();
                    let l=tdat.length;
                    for (let i=0;i<l;i++) {
                        if (tdat[i]<1)
                            odat[i]=0;
                        else
                            odat[i]=idat[i];
                    }
                    this.outputs['output']=output;
                } else {
                    console.log('oooo Outputing Binary Mask');
                    this.outputs['output']=morphOutput;
                }
                resolve();
            }).catch( (e) => {
                console.log(e,e.stack);
                reject(e);
            });
        });
    }


}

module.exports = SkullStripImageModule;
