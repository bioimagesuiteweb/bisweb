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
 * blanks an image along 
 */
class BlankImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'blankImage';
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
            };
        };
        

        return {
            "name": "Blank Image",
            "description": "This algorithm performes image blanking",
            "author": "Xenios Papdemetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('Load the image to be blanked'),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Execute",
            "shortname" : "blk",
            "params": [
                createParam('i','Start','i0',-10000,1),
                createParam('i','End','i1',10000,2),
                createParam('j','Start','j0',-10000,4),
                createParam('j','End','j1',10000,5),
                createParam('k','Start','k0',-10000,7),
                createParam('k','End','k1',10000,8),
                baseutils.getDebugParam(),
            ],
            
        };
    }

    directInvokeAlgorithm(vals) {
        let input = this.inputs['input'];
        let dim=input.getDimensions();
        console.log(vals);
        let names = ['i0','i1','j0','j1','k0','k1' ];
        for (let ia=0;ia<=2;ia++) {
            let n0=names[2*ia];
            let n1=names[2*ia+1];
            let v0=parseInt(vals[n0]);
            let v1=parseInt(vals[n1]);
            console.log([n0,v0,n1,v1]);
            if (v0===-10000)
                vals[n0]=0;
            if (v1===10000)
                vals[n1]=dim[ia]-1;
        }
        console.log('oooo invoking: blankImage with vals', JSON.stringify(vals));
        return new Promise( (resolve, reject) => {

            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.blankImageWASM(input, {
                    "i0": parseInt(vals.i0),
                    "i1": parseInt(vals.i1),
                    "j0": parseInt(vals.j0),
                    "j1": parseInt(vals.j1),
                    "k0": parseInt(vals.k0),
                    "k1": parseInt(vals.k1),
                }, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

    updateOnChangedInput(inputs,controllers=null,guiVars=null) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let img=inputs['input'] || null;
        if (img===null)
            return newDes;

        let dim = img.getDimensions();
        let bounds = [ 'i0','i1', 'j0','j1', 'k0','k1' ];


        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            let index=bounds.indexOf(name);
            if (index>=0) {
                let axis=Math.floor(index/2);
                let high=index-2*axis;

                newDes.params[i].low = 0;
                newDes.params[i].high = dim[axis]-1;

                if (high>0) {
                    newDes.params[i].default=dim[axis]-1;
                } else {
                    newDes.params[i].default=0;
                }
                
                if (controllers!==null) 
                    this.updateSingleGUIElement(newDes.params[i],controllers[name],guiVars,name);
            }
        }
        return newDes;
    }

}

module.exports = BlankImageModule;
