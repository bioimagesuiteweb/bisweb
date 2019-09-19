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
const smreslice=require('bis_imagesmoothreslice');
const segmentModule=require('segmentImage');
const maskModule=require('maskImage');
/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear).
 */
class PreprocessOpticalModule extends BaseModule {
    constructor() {
        super();
        this.name = 'preprocessOptical';
        this.JSOnly=true;
        this.useworker=false;
    }

    getDescription() {
        let des={
            "name": "Preprocess Zebrafish Optical",
            "description": "Preprocesses optical images from zebrafish",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "optfixed",
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
                    "high": 8.0,
                    "step": 0.5,
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
                    "name": "Resample Factor",
                    "description": "Resample to this x z resolution",
                    "priority": 5,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "factor",
                    "default": 1.0,
                    "type": 'float',
                    "low":  1.0,
                    "high": 4.0,
                    "step": 0.5,
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
                    "priority": 6,
                    "advanced": false,
                    "gui": "check",
                    "varname": "normalize",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "Mask",
                    "description": "If true masks background",
                    "priority": 7,
                    "advanced": false,
                    "gui": "check",
                    "varname": "mask",
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

        let input = this.inputs['input'];
        let debug=vals['debug'];
        let l_output=input;
        
        let d=input.getDimensions();
        if (d[0]>512 || d[1]>512 || d[2]>512) {
            
            let spa=input.getSpacing();
            for (let i=0;i<=2;i++) {
                if (d[i]>512)
                    spa[i]=spa[i]*d[i]/512;
            }
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log('JS Resampling to go below 512 x 512 from',d.join(','));
            l_output=smreslice.resampleImage(input,spa,1);
            console.log(' \t\t output =',l_output.getDimensions().join(','));
        }
        
        let internal_fn= ( async () => {

            let current_output=l_output;
            
            if (vals['ras']) {
                console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                console.log('Image reorient first ');
                
                let mod0=new reorientModule();
                mod0.makeInternal();
                await mod0.execute( {'input' : current_output },
                                    { 'orient' : 'RAS', 'debug' : debug });
                current_output=mod0.getOutputObject('output');
            }
            
            if (vals['biascorrect']>0) {
                console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                let mod1=new biasCorrectModule();
                mod1.makeInternal();
                await mod1.execute( { 'input' : current_output },
                                    { 'axis' : 'z', 'debug' : debug });
                current_output=mod1.getOutputObject('output');
            }
            
            if (vals['sigma']>0.1) {
                console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                let mod2=new smoothModule();
                mod2.makeInternal();
                let spa=current_output.getSpacing();
                await mod2.execute( {'input' : current_output },
                                    { 'sigma' : spa[0] , 'inmm' : true ,'debug' :debug});
                current_output=mod2.getOutputObject('output');
            }
            
            
            if (vals['resample']) {
                console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                let spa=current_output.getSpacing();
                let mod25=new resampleModule();
                mod25.makeInternal();
                let s=vals['factor']*spa[2];
                await mod25.execute( {'input' : current_output },
                                     { 'xsp' : s,
                                       'ysp' : s,
                                       'zsp' : s,
                                       'debug' :debug });
                current_output=mod25.getOutputObject('output');
            } 
            
            
            if (vals['normalize']) {
                console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                let mod3=new normalizeModule();
                mod3.makeInternal();
                await mod3.execute( {'input' : current_output },
                                    {'perhigh' : 0.995,'debug' :debug });
                current_output=mod3.getOutputObject('output');
            }
            
            if (vals['mask']) {
                let mod4=new segmentModule();
                mod4.makeInternal();
                await mod4.execute({ 'input': current_output },
                                   { 'numclasses' : 3 ,
                                     'smoothness' : 0.0 ,
                                     'debug' : debug
                                   });
                let tmp=mod4.getOutputObject('output');
                
                let mod5=new maskModule();
                mod5.makeInternal();
                await mod5.execute({
                    'input': current_output,
                    'mask' : tmp
                }, {
                    'threshold' : 1.0 ,
                    'debug' : debug
                });
                current_output=mod5.getOutputObject('output');
            }
            
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            let mod4=new shiftScaleModule();
            mod4.makeInternal();
            await mod4.execute( {'input' : current_output },
                                { 'shift' : 0,
                                  'scale' : 1.0,
                                  'outtype' : 'UChar'
                                });
            current_output=mod4.getOutputObject('output');
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log('Output = ',current_output.getDescription());
            
            this.outputs['output'] = current_output;
            return Promise.resolve();
        });
        

        return new Promise( (resolve,reject) => {
            biswrap.initialize().then(() => {
                internal_fn().then( () => {
                    resolve();
                }).catch( (e) => {
                    reject(e);
                });
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
}

module.exports = PreprocessOpticalModule;
