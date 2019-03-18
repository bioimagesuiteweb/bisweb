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
const smoothModule = require("smoothImage");
const reorientModule = require("reorientImage");
const resampleModule = require("resampleImage");
const biasCorrectModule = require("sliceBiasFieldCorrect");
const normalizeModule= require('normalizeImage');
const shiftScaleModule=require('shiftScaleImage');


/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear).
 */
class PreprocessOpticalModule extends BaseModule {
    constructor() {
        super();
        this.name = 'preprocessOptical';
        this.JSOnly=true;
        this.useworker=true;
    }

    getDescription() {
        let des={
            "name": "Preprocess Optical",
            "description": "Preprocess optical images from zebrafish",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "mot",
            "inputs": baseutils.getImageToImageInputs('Load the image to be fixed'),
            "outputs": baseutils.getImageToImageOutputs(),
            "params": [
                {
                    "name": "Smooth Sigma",
                    "description": "The gaussian kernel standard deviation (either in voxels)",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 1.0,
                    "type": 'float',
                    "low":  0.0,
                    "high": 8.0
                },
                {
                    "name": "BiasCorrect",
                    "description": "If true correct for z-stack attenuation",
                    "priority": 2,
                    "advanced": false,
                    "gui": "check",
                    "varname": "biascorrect",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "Resample",
                    "description": "If true resamples to have isotropic resolution",
                    "priority": 4,
                    "advanced": false,
                    "gui": "check",
                    "varname": "resample",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "RAS",
                    "description": "If true reorient the image to RAS",
                    "priority": 1,
                    "advanced": false,
                    "gui": "check",
                    "varname": "ras",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "Normalize",
                    "description": "If true normalize intensities",
                    "priority": 5,
                    "advanced": false,
                    "gui": "check",
                    "varname": "normalize",
                    "type": 'boolean',
                    "default": true,
                },
                baseutils.getDebugParam(),
            ],

        };
        return des;
    }

    directInvokeAlgorithm(vals) {
        console.log('PreprocessOptical invoking with vals', JSON.stringify(vals));
        return new Promise( (resolve, reject) => {
            let input = this.inputs['input'];
            let debug=vals['debug'];
            biswrap.initialize().then( async () => {

                console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                console.log('Image Loaded beginning processing ');

                let mod0=new reorientModule();
                await mod0.execute( {'input' : input },
                                    { 'orient' : 'RAS', 'debug' : debug });
                let output=mod0.getOutputObject('output');
    
                if (vals['biascorrect']>0) {
                    console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                    let mod1=new biasCorrectModule();
                    await mod1.execute( { 'input' : output },
                                        { 'axis' : 'z', 'debug' : debug });
                    output=mod1.getOutputObject('output');
                }

                if (vals['sigma']>0.1) {
                    console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                    let mod2=new smoothModule();
                    let spa=output.getSpacing();
                    await mod2.execute( {'input' : output },
                                        { 'sigma' : spa[0] , 'inmm' : true ,'debug' :debug});
                    output=mod2.getOutputObject('output');
                }

                
                if (vals['resample']) {
                    console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                    let spa=output.getSpacing();
                    let mod25=new resampleModule();
                    await mod25.execute( {'input' : output },
                                         { 'xsp' : spa[2],
                                           'ysp' : spa[2],
                                           'zsp' : spa[2], 'debug' :debug });
                    output=mod25.getOutputObject('output');
                } 
                

                if (vals['normalize']) {
                    console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                    let mod3=new normalizeModule();
                    await mod3.execute( {'input' : output },
                                        {'perhigh' : 0.99,'debug' :debug });
                    output=mod3.getOutputObject('output');
                }
                
                console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                let mod4=new shiftScaleModule();
                await mod4.execute( {'input' : output },
                                    { 'shift' : 0,
                                      'scale' : 1.0,
                                      'outtype' : 'UChar'
                                    });
                output=mod4.getOutputObject('output');
                
                
                this.outputs['output'] = output;
                resolve();
                
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
}

module.exports = PreprocessOpticalModule;
