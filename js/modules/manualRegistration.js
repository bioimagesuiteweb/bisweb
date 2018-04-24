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
const BisWebLinearTransformation = require('bisweb_lineartransformation.js');

/**
 * Applies Gaussian projecting to an image using a given sigma (kernel size and strength) and radius factor. 
 */
class ManualRegistrationModule extends BaseModule {
    constructor() {
        super();
        this.name = 'manualRegistration';
    }
    
    createDescription() {
        return {
            "name": "Manual Registration",
            "description": "This algorithm performes manual image registration",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs" : baseutils.getRegistrationInputs(false),
            "outputs" : baseutils.getRegistrationOutputs(),
            "buttonName": "Apply",
            "shortname" : "mrg",
            "params": [
                {
                    "name": "Shift I (vx)",
                    "description": "I - translation (voxels)",
                    "priority": 10,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "shifti",
                    "default": 0.0,
                    "type": 'float',
                    "low": -90.0,
                    "high": 90.0,
                    "step" : 0.1,
                },
                {
                    "name": "Shift J (vx)",
                    "description": "J - translation (voxels)",
                    "priority": 11,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "shiftj",
                    "default": 0.0,
                    "type": 'float',
                    "low": -90.0,
                    "high": 90.0,
                    "step" : 0.1,
                },
                {
                    "name": "Shift K (vx)",
                    "description": "K - translation (voxels)",
                    "priority": 12,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "shiftk",
                    "default": 0.0,
                    "type": 'float',
                    "low": -90.0,
                    "high": 90.0,
                    "step" : 0.1,
                },
                {
                    "name": "Rotate I",
                    "description": "I - rotation",
                    "priority": 13,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "rotatei",
                    "default": 0.0,
                    "type": 'float',
                    "low": -90.0,
                    "high": 90.0,
                    "step" : 0.1,
                },
                {
                    "name": "Rotate J",
                    "description": "J - rotation",
                    "priority": 14,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "rotatej",
                    "default": 0.0,
                    "type": 'float',
                    "low": -90.0,
                    "high": 90.0,
                    "step" : 0.1,
                },
                {
                    "name": "Rotate K",
                    "description": "K - rotation",
                    "priority": 15,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "rotatek",
                    "default": 0.0,
                    "type": 'float',
                    "low": -90.0,
                    "high": 90.0,
                    "step" : 0.1,
                },
                {
                    "name": "Scale",
                    "description": "Scale Factor",
                    "priority": 16,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "scale",
                    "default": 100.0,
                    "type": 'float',
                    "low": 66.0,
                    "high": 133.0,
                    "step" : 1.0,
                },
                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: manualRegistration with vals', JSON.stringify(vals));

        let target = this.inputs['target'];
        let reference = this.inputs['reference'];

        let dim=reference.getDimensions();
        let spa=reference.getSpacing();

        let tx=parseFloat(vals.shifti)*spa[0];
        let ty=parseFloat(vals.shiftj)*spa[1];
        let tz=parseFloat(vals.shiftk)*spa[2];
        let rx=parseFloat(vals.rotatei);
        let ry=parseFloat(vals.rotatej);
        let rz=parseFloat(vals.rotatek);
        let sc=parseFloat(vals.scale);
        
        let linear=new BisWebLinearTransformation(1); 
        let input=this.outputs['output'];
        let dim2=target.getDimensions();
        let spa2=target.getSpacing();
        
        linear.setShifts(dim,spa,dim2,spa2);
        linear.setParameterVector( [ tx,ty,tz,rx,ry,rz,sc], { scale:true, rigidOnly:false });
        console.log('oooo Reslicing ');
        this.outputs['output']=linear;

        return new Promise( (resolve, reject) => {
            biswrap.initialize().then(() => {
                this.outputs['resliced']=baseutils.resliceRegistrationOutput(biswrap,reference,target,linear);
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }


}

module.exports = ManualRegistrationModule;
