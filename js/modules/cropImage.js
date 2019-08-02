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
/**
 * crops an image along 
 */
class CropImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'cropImage';
        this.lastInputDimensions=[0,0,0,0,0];
    }

    createDescription() {
        
        let createParam=function(axis,name,shortname,value,p,adv=false) {
            return {
                "name": `${axis.toUpperCase()}-${name}`,
                "description": `The ${name} along the ${axis} axis.`,
                "priority": p,
                "advanced": adv,
                "gui": "slider",
                "varname": shortname,
                "type": 'int',
                "default" : value,
                "low" :  -10,
                "high" : 200,
            };
        };
        

        return {
            "name": "Crop",
            "description": "This algorithm performs image cropping in 4 dimensions. Step refers to the sample rate, e.g. step=2 means every second voxel.",
            "author": "Xenios Papdemetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Crop",
            "shortname" : "crp",
            "slicer" : true,
            "params": [
                createParam('i','Start','i0',0,1),
                createParam('i','End','i1',10,2),
                createParam('i','Step','di',1,20,true),
                createParam('j','Start','j0',0,4),
                createParam('j','End','j1',10,5),
                createParam('j','Step','dj',1,21,true),
                createParam('k','Start','k0',0,7),
                createParam('k','End','k1',10,8),
                createParam('k','Step','dk',1,22,true),
                createParam('t','Start','t0',0,10,true),
                createParam('t','End','t1',10,11,true),
                createParam('t','Step','dt',1,23,true),
                baseutils.getDebugParam(),
            ],
            
        };
    }

    directInvokeAlgorithm(vals) {
        let input = this.inputs['input'];
        console.log('oooo invoking: cropImage with vals', JSON.stringify(vals));
        return new Promise( (resolve, reject) => {

            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.cropImageWASM(input, {
                    "i0": parseInt(vals.i0),
                    "i1": parseInt(vals.i1),
                    "di": parseInt(vals.di),
                    "j0": parseInt(vals.j0),
                    "j1": parseInt(vals.j1),
                    "dj": parseInt(vals.dj),
                    "k0": parseInt(vals.k0),
                    "k1": parseInt(vals.k1),
                    "dk": parseInt(vals.dk),
                    "t0": parseInt(vals.t0),
                    "t1": parseInt(vals.t1),
                    "dt": parseInt(vals.dt),
                }, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

    updateOnChangedInput(inputs,guiVars=null) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let img=inputs['input'] || null;
        if (img===null)
            return newDes;

        let dim = img.getDimensions();
        if (this.compareArrays(dim,this.lastInputDimensions)<1) {
            return;
        }
        this.lastInputDimensions=dim;
        
        let extra = [ 0,0,0,dim[3]];
        for (let i=0;i<=2;i++) {
            extra[i] = Math.round(dim[i]/5);
        }
        
        let bounds = [ 'i0','i1', 'j0','j1', 'k0','k1', 't0', 't1'];
        let incrs = [ 'di','dj','dk', 'dt' ];

        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            let index=bounds.indexOf(name);
            if (index>=0) {
                let axis=Math.floor(index/2);
                let high=index-2*axis;

                if (axis<=2) {
                    if (high>0) {
                        newDes.params[i].low = 0;
                        newDes.params[i].high = dim[axis]+extra[axis]-1;
                        newDes.params[i].default=dim[axis]-1;
                    } else {
                        newDes.params[i].low = -extra[axis];
                        newDes.params[i].high = dim[axis]-1;
                        newDes.params[i].default=0;
                    }
                } else {
                    let highv=dim[3]-1;
                    //                                  if (dim[3]<2)
                    //                                          highv=1.01;
                    newDes.params[i].default=0;
                    newDes.params[i].low = 0;
                    newDes.params[i].high = highv;
                    
                    if (high>0 && dim[3]>1)  {
                        newDes.params[i].default=dim[3]-1;
                    } else {
                        newDes.params[i].default=0;
                    }
                    newDes.params[i].step=1;
                }
            } else {
                index=incrs.indexOf(name);
                if (index>=0) {
                    let axis=Math.floor(index);
                    newDes.params[i].low = 1;
                    newDes.params[i].high = extra[axis];
                    newDes.params[i].default=1;
                }
            }

            if (guiVars)
                guiVars[name]=newDes.params[i].default;
        }
        this.recreateGUI=true;
        return newDes;
    }

}

module.exports = CropImageModule;
