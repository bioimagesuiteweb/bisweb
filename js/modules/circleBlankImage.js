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

const defaultMin=0;
const defaultMax=500;

class circleBlankImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'blankImage';
        this.lastInputDimensions=[0,0,0];
    }

    createDescription() {
        
        let createParam=function(name,shortname,value,p,adv=false) {

            return {
                "name": name,
                "description": `The ${name} of the circular region to keep`,
                "priority": p,
                "advanced": adv,
                "gui": "slider",
                "varname": shortname,
                "type": 'float',
                "default" : value,
            };
        };
        

        return {
            "name": "Circle Blank Image",
            "description": "This algorithm performs image blanking, i.e. zeros values outside the specified circular region.",
            "author": "Xenios Papdemetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Execute",
            "shortname" : "cblk",
            "params": [
                createParam('centeri','Center-I','i0',128,1);
                createParam('centerj','Center-J','i1',128,2),
                createParam('radius','Radius','j0',128,3),
                {
                    "name": "Minvalue",
                    "description": "If true the masked output image regions will have value equal to the minimum intensity of the image, instead of zero",
                    "priority": 3,
                    "advanced": false,
                    "gui": "check",
                    "varname": "minvalue",
                    "type": 'boolean',
                    "default": false,
                }
                baseutils.getDebugParam(),
            ],
            
        };
    }

    directInvokeAlgorithm(vals) {
        let input = this.inputs['input'];
        
        let dim=input.getDimensions();
        console.log('oooo invoking: blankImage with vals', JSON.stringify(vals));
        
        const cx=parseFloat(vals['centeri']);
        const cy=parseFloat(vals['centerj']);
        const r=parseFloat(vals['radius']);

        let output=new BisWebImage();
        output.cloneImage( input);

        let odata=output.getImageData();

        for (let i=0;i<dim[0];i++) {
            for (let j=0;j<dim[1];j++) {
                
        
        for (let ia=0;ia<=2;ia++) {
            let n0=names[2*ia];
            let n1=names[2*ia+1];
            let v0=parseInt(vals[n0]);
            let v1=parseInt(vals[n1]);
            if (v0===-defaultMin)
                vals[n0]=0;
            if (v1===defaultMax)
                vals[n1]=dim[ia]-1;
        }
        console.log('oooo \t parameters fixed=', JSON.stringify(vals));
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

    updateOnChangedInput(inputs,guiVars) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let img=inputs['input'] || null;
        if (img===null)
            return newDes;

        let dim = img.getDimensions();
        if (this.compareArrays(dim,this.lastInputDimensions,0,2)<1) {
            return;
        }
        this.lastInputDimensions=dim;
        
        for (let i = 0; i < =2; i++) {
            let name = newDes.params[i].varname;
            if (index>=0) {
                let axis=Math.floor(index/2);
                let value=0.0;
                if (i<2) {
                    value=dim[i]-1;
                } else {
                    value=Math.sqrt(dim[0]*dim[0]+dim[1]*dim[1]);
                }
                newDes.params[index].low = 0;
                newDes.params[index].high = value;
                newDes.params[index].default=0.5*value;
                if (guiVars)
                    guiVars[name]=newDes.params[i].default;                                
            }
        }
        this.recreateGUI=true;
        return newDes;
    }

}

module.exports = circleBlankImageModule;
