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
 * Masks an Image with another 
 */
class maskModule extends BaseModule {
    constructor() {
        super();
        this.name = 'maskImage';
        this.JSOnly=true;
        this.lastInputRange=[0,0];
    }
    
    createDescription() {
        return {
            "name": "Mask Image",
            "description": "This algorithm masks an image using an image mask. In regions where the mask is below a threshold, the image values are set to zero, else they maintain their original values",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Mask",
            "shortname" : "msk",
            "slicer" : true,
            "inputs" : [
                {
                    'type': 'image',
                    'name': 'Input Image',
                    'description': 'The image to mask',
                    'varname': 'input',
                    'shortname': 'i',
                    'required': true,
                    'guiviewerinput' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type': 'image',
                    'name': 'Mask Image',
                    'description': 'The mask',
                    'varname': 'mask',
                    'shortname': 'm',
                    'required': true,
                    'guiviewertype' : 'overlay',
                    'guiviewer'  : 'viewer1',
                    'colortype'  : 'Orange'
                }
            ],
            "outputs": baseutils.getImageToImageOutputs(),
            "params": [
                {
                    "name": "Threshold",
                    "description": "The threshold (applied to the mask image) below which values in the input image will be masked out",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "threshold",
                    "default" : 1,
                },
                {
                    "name": "Inverse",
                    "description": "If true, mask the image where the mask is not zero",
                    "priority": 2,
                    "advanced": false,
                    "gui": "check",
                    "varname": "inverse",
                    "type": 'boolean',
                    "default": false,
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
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: maskImage', JSON.stringify(vals));

        const input = this.inputs['input'];
        const mask = this.inputs['mask'];

        if (!input.hasSameSizeAndOrientation(mask,0.01,true))
            return Promise.reject("Images have different sizes");

        const inverse=super.parseBoolean(vals.inverse);
        const minvalue=super.parseBoolean(vals.minvalue);
        let replace=0;
        if (minvalue) {
            const imagerange = input.getIntensityRange();
            replace=imagerange[0];
        }
        

        
        const dim=input.getDimensions();
        const numvoxels=dim[0]*dim[1]*dim[2];
        const numframes=dim[3]*dim[4];

        const output=new BisWebImage();
        output.cloneImage(input);
        
        const idata=input.getImageData();
        const mdata=mask.getImageData();
        let odata=output.getImageData();
        const thr=parseFloat(vals.threshold);

        console.log('oooo Beginning ',numvoxels,' thr=',thr, 'inverse=',inverse);
        console.log('oooo using replace=',replace);

        if (!inverse) {
            console.log('oooo starting mdata >=',thr);
            for (let i=0;i<numvoxels;i++) {
                if (mdata[i]>=thr) {
                    for (let f=0;f<numframes;f++) {
                        odata[i+f*numvoxels]=idata[i+f*numvoxels];
                    }
                } else {
                    for (let f=0;f<numframes;f++) {
                        odata[i+f*numvoxels]=replace;
                    }
                }
            }
        } else {
            console.log('oooo starting mdata < ',thr);           
           for (let i=0;i<numvoxels;i++) {
                if (mdata[i]<thr) {
                    for (let f=0;f<numframes;f++) {
                        odata[i+f*numvoxels]=idata[i+f*numvoxels];
                    }
                } else {
                    for (let f=0;f<numframes;f++) {
                        odata[i+f*numvoxels]=replace;
                    }
                }
            }
        }
        this.outputs['output']=output;
        return Promise.resolve();
    }

    
    updateOnChangedInput(inputs,guiVars) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let current_input = inputs['mask'] || null;
        if (current_input===null)
            return newDes;

        let imagerange = current_input.getIntensityRange();

        if (this.compareArrays(imagerange,this.lastInputRange,0,1)<1.0) {
            return;
        }
        this.lastInputRange=imagerange;

        

        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            if(name === 'threshold') {
                newDes.params[i].low = imagerange[0];
                newDes.params[i].high = imagerange[1];
                newDes.params[i].default = 0.99 * imagerange[0] + 0.01 * imagerange[1]; 
            }
            if (guiVars)
                guiVars[name]=newDes.params[i].default;
        }
        this.recreateGUI=true;
        return newDes;
    }




}

module.exports = maskModule;
