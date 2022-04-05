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
const xformutil=require('bis_transformationutil.js');
/**
 * Applies Gaussian projecting to an image using a given sigma (kernel size and strength) and radius factor. 
 */
class ManualRegistrationModule extends BaseModule {
    constructor() {
        super();
        this.name = 'manualRegistration';
        this.JSOnly=true;
    }
    
    createDescription() {
        return {
            "name": "Manual Registration",
            "description": "This algorithm performs manual image registration, where the user specifies the parameters directly",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs" : baseutils.getRegistrationInputs(false),
            "outputs" : baseutils.getRegistrationOutputs(),
            "buttonName": "Apply",
            "shortname" : "mrg",
            "params": [ 
		        {
                    "name": "Rotate First",
                    "description": "rotate first",
                    "priority": 5,
                    "advanced": false,
                    "type": "boolean",
                    "default": false,
                    "varname": "rotatefirst"
                },
                {
                    "name": "Shiftx10",
                    "description": "If true then multiply shifts by a factor of 10 (for large images)",
                    "priority": 50,
                    "advanced": true,
                    "type": "boolean",
                    "default": false,
                    "varname": "shiftxten"
                },            
                {
                    "name": "Shift I (vx)",
                    "description": "I - translation (voxels)",
                    "priority": 10,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "shifti",
                    "default": 0.0,
                    "type": 'float',
                    "low": -256.0,
                    "high": 256.0,
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
                    "low": -256.0,
                    "high": 256.0,
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
                    "low": -256.0,
                    "high": 256.0,
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
                    "low": -179.0,
                    "high": 179.0,
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
                    "low": -179.0,
                    "high": 179.0,
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
                    "low": -179.0,
                    "high": 179.0,
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
                {
                    "name": "Header Orient",
                    "description": "use header orientation for initial rotation matrix",
                    "priority": 9,
                    "advanced": true,
                    "type": "boolean",
                    "default": true,
                    "varname": "useheader"
                },
                {
                    "name": "Header Trans",
                    "description": "use header to compute initial matrix (incl translation)",
                    "priority": 10,
                    "advanced": true,
                    "type": "boolean",
                    "default": false,
                    "varname": "usefullheader"
                },
                {
                    "name": "No Header Tz",
                    "description": "use header to compute initial matrix (incl xy-translation but not z-translation)",
                    "priority": 10,
                    "advanced": true,
                    "type": "boolean",
                    "default": false,
                    "varname": "usefullheaderxy"
                },
		        {
                    "name": "Do Reslice",
                    "description": "dummy option ignored",
                    "priority": 100,
                    "advanced": true,
                    "type": "boolean",
                    "default": true,
                    "varname": "doreslice"
                },
                {
                    "name": "Interpolation",
                    "description": "Which type of interpolation to use (3 = cubic, 1 = linear, 0 = nearest-neighbor)",
                    "priority": 12,
                    "advanced": true,
                    "gui": "dropdown",
                    "type": "int",
                    "default" : "1",
                    "varname": "interpolation",
                    "fields" : [ 0,1,3 ],
                    "restrictAnswer" : [ 0,1,3],
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

        let shift10=this.parseBoolean(vals.shiftxten);
        let scalet=1.0;
        if (shift10)
            scalet=10.0;
        
        let tx=parseFloat(vals.shifti*scalet)*spa[0];
        let ty=parseFloat(vals.shiftj*scalet)*spa[1];
        let tz=parseFloat(vals.shiftk*scalet)*spa[2];
        let rx=parseFloat(vals.rotatei);
        let ry=parseFloat(vals.rotatej);
        let rz=parseFloat(vals.rotatek);
        let sc=parseFloat(vals.scale);
        
        let linear=new BisWebLinearTransformation(1); 
        let dim2=target.getDimensions();
        let spa2=target.getSpacing();
        
        let interp=parseInt(vals.interpolation);
        
        let rotatefirst=this.parseBoolean(vals.rotatefirst);
        let useheader=this.parseBoolean(vals.useheader);
        let usefullheader=this.parseBoolean(vals.usefullheader);
        let usefullheaderxy=this.parseBoolean(vals.usefullheaderxy);
        let o1=reference.getOrientationName();
        let o2=target.getOrientationName();
        let headertransform=null;
        let mode=0;
        if (!usefullheader && !usefullheaderxy) {
            if (o1!==o2 && useheader) {
                mode=1;
            }
        } else {
            mode=2;
        }
        
        if (mode>0) {
            let usetranslation=false;
            if (mode>1)
                usetranslation=true;
            console.log('Creating manual transformation uset=',usetranslation,!usefullheaderxy); 
            headertransform=xformutil.computeHeaderTransformation(reference,target,usetranslation,!usefullheaderxy);
            
            // Center about resliced version of image not original
            dim2=dim;
            spa2=spa;
            console.log('Header=',headertransform.getMatrix());
        } 
        
        linear.setShifts(dim,spa,dim2,spa2);
        
        
        
        if (!rotatefirst) {
            //            console.log('Not rotate first');
            linear.setParameterVector( [ tx,ty,tz,rx,ry,rz,sc], { scale:true, rigidOnly:false });
            if (mode>0) {
                //  console.log('Linear=',linear.legacySerialize("\n"));
                this.outputs['output']=xformutil.computeCombinedTransformation(linear,headertransform);
                linear=this.outputs['output'];
            }  else {
                this.outputs['output']=linear;
            }
        } else {
            //console.log('Rotate first');
            linear.setParameterVector( [ 0,0,0,rx,ry,rz,sc], { scale:true, rigidOnly:false });
            //console.log('Linear=',linear.legacySerialize("\n"));
            let linear2=new BisWebLinearTransformation(1); 
            linear2.setShifts(dim,spa,dim2,spa2);
            linear2.setParameterVector( [ tx,ty,tz,0,0,0], { scale:false, rigidOnly:true });
            
            if (mode>0) {
                let l=xformutil.computeCombinedTransformation(linear2,linear);
                
                //console.log('Linear2 =',linear2.legacySerialize("\n"));
                this.outputs['output']=xformutil.computeCombinedTransformation(l,headertransform);
                linear=this.outputs['output'];
            }  else {
                this.outputs['output']=xformutil.computeCombinedTransformation(linear2,linear);
                linear=this.outputs['output'];
            }
            
        }

        //console.log('Output=',linear.legacySerialize("\n"));
        
        return new Promise( (resolve, reject) => {
            biswrap.initialize().then(() => {
                //                console.log('Reference=',reference.getDescription(),reference.getHeader().getDescription());
                //                console.log('Target=',target.getDescription(),target.getHeader().getDescription());
                this.outputs['resliced']=baseutils.resliceRegistrationOutput(biswrap,reference,target,linear,interp);

                //                let out=this.outputs['resliced'];
                //                console.log('Out=',out.getDescription(),out.getHeader().getDescription());
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }


}

module.exports = ManualRegistrationModule;
