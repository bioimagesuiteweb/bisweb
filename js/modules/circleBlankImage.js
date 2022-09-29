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


const baseutils=require("baseutils");
const BaseModule = require('basemodule.js');
const BisWebImage = require('bisweb_image.js');
/**
 * blanks an image along 
 */


class circleBlankImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'circleBlankImage';
        this.lastInputDimensions=[0,0,0];
    }

    createDescription() {

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
                {
                    "name": "Center-I",
                    "description": `The ith coordinate of the center of the circular region to keep`,
                    "priority": 0,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "centeri",
                    "type": 'float',
                    "default" : 128,
                },
                {
                    "name": "Center-J",
                    "description": `The jth coordinate of the center of the circular region to keep`,
                    "priority": 0,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "centerj",
                    "type": 'float',
                    "default" : 128,
                },
                {
                    "name": "Radius",
                    "description": `The radius of the center of the circular region to keep`,
                    "priority": 0,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "radius",
                    "type": 'float',
                    "default" : 128,
                },
                {
                    "name": "Minvalue",
                    "description": "If true the masked output image regions will have value equal to the minimum intensity of the image, instead of zero",
                    "priority": 3,
                    "advanced": false,
                    "gui": "check",
                    "varname": "minvalue",
                    "type": 'boolean',
                    "default": true,
                },
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
        const radius=parseFloat(vals['radius']);

        const output=new BisWebImage();
        output.cloneImage(input);

        const odata=output.getImageData();
        const idata=input.getImageData();

        const minvalue=super.parseBoolean(vals.minvalue);
        let replace=0;
        if (minvalue) {
            const imagerange = input.getIntensityRange();
            replace=imagerange[0];
        }

        const d2=radius*radius;
        const slicesize=dim[0]*dim[1];
        const volumesize=slicesize*dim[2];
        console.log('Beginning circle blank at ('+[cx,cy]+') radius='+radius+' replace=',replace);
        for (let j=0;j<dim[1];j++) {
            for (let i=0;i<dim[0];i++) {
                let index=j*dim[0]+i;
                let dist=Math.pow(i-cx,2.0)+Math.pow(j-cy,2.0);
                if (dist<=d2) {
                    for (let f=0;f<dim[3]*dim[4];f++) {
                        for (let k=0;k<dim[2];k++) {
                            odata[index]=idata[index];
                            index+=slicesize;
                        }
                        index+=volumesize;
                    }
                } else {
                    for (let f=0;f<dim[3]*dim[4];f++) {
                        for (let k=0;k<dim[2];k++) {
                            odata[index]=replace;
                            index+=slicesize;
                        }
                        index+=volumesize;
                    }
                }
                ++index;
            }
        }
        this.outputs['output']=output;
        return Promise.resolve('done');
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
        
        for (let i = 0; i <= 2; i++) {
            let name = newDes.params[i].varname;
            if (i>=0) {
                let value=0.0;
                if (i<2) {
                    value=dim[i]-1;
                } else {
                    value=Math.sqrt(dim[0]*dim[0]+dim[1]*dim[1]);
                }
                newDes.params[i].low = 0;
                newDes.params[i].high = value;
                newDes.params[i].default=0.5*value;
                if (guiVars)
                    guiVars[name]=newDes.params[i].default;                                
            }
        }
        this.recreateGUI=true;
        return newDes;
    }

}

module.exports = circleBlankImageModule;
