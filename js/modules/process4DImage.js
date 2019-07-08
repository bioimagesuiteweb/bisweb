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
 * Process4D a 4D Images
 */
class process4DImageModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;        
        this.name = 'process4DImage';
    }
    
    createDescription() {
        return {
            "name": "Processs a 4D Image",
            "description": "This algorithm computes voxel wise time statistics from a 4D image.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "comb4d",
            "inputs": baseutils.getImageToImageInputs('The image to be processed'),
            "outputs": baseutils.getImageToImageOutputs(),
            "slicer" : true,
            "params": [
                {
                    "name": "Operation",
                    "description": "The operation to perform",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "default" : "mean",
                    "type" : "string",
                    "fields" : ["mean","meansigma", "rms", "max","min", ],
                    "restrictAnswer" : ["mean", "meansigma", "rms", "max","min"],
                    "varname": "operation",
                },

                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: process4DImage', JSON.stringify(vals));

        let input = this.inputs['input'];
     
        
        let dim=input.getDimensions();
        let numvoxels=dim[0]*dim[1]*dim[2];
        let numframes=dim[3]*dim[4];

        let output=new BisWebImage();
        let operation=vals['operation'];
        let numf=1;
        if (operation==='meansigma')
            numf=2;
        
        output.cloneImage(input, { numframes : numf, numcomponents :1 });
        
        let idata=input.getImageData();
        let odata=output.getImageData();

        let correction=1.0;
        if (numframes>1)
            correction=Math.sqrt(numframes)/Math.sqrt(numframes-1);
        
        if (operation === 'mean' || operation === 'rms' || operation==='meansigma' ) {
            for (let i=0;i<numvoxels;i++) {
                let sum=0.0,sum2=0.0;
                for (let f=0;f<numframes;f++) {
                    let v=idata[i+f*numvoxels];
                    sum+=v;
                    sum2+=v*v;
                }
                if (operation==='mean' || operation==='meansigma') {
                    odata[i]=sum/numframes;
                    if (operation==='meansigma') {
                        odata[i+numvoxels]=Math.sqrt(sum2/numframes-odata[i]*odata[i])*correction;
                    }
                } else {
                    odata[i]=Math.sqrt(sum2/numframes);
                }
                    
            }
        } else if (operation === 'max' || operation === 'min') {
            for (let i=0;i<numvoxels;i++) {
                let val=idata[i];
                for (let f=1;f<numframes;f++) {
                    if (operation === 'max')
                        val=Math.max(idata[i+f*numvoxels],val);
                    else
                        val=Math.min(idata[i+f*numvoxels],val);
                }
                odata[i]=val;
            }
        }
        this.outputs['output']=output;
        return Promise.resolve();
    }
}

module.exports = process4DImageModule;
