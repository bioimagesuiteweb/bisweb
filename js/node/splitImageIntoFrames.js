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

const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");
const BisWebImage = require('bisweb_image.js');
/**
 * Stacks images
 */
class SplitImageIntoFramesModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'stackImages';
    }


    createDescription() {
        return {
            "name": "Split Image Into Frames",
            "description": "Splits a Single 4D Image into frames",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs" : baseutils.getImageToImageInputs('input'),
            "outputs": [],
            "buttonName": "Execute",
            "shortname" : "stack",
            "params" : [
                {
                    "name": "outputstem",
                    "shortname" : "o",
                    "description": "Output filename stem",
                    "advanced": false,
                    "type": "string",
                    "varname": "outputstem",
                    "default": ""
                },
                baseutils.getDebugParam()
            ]
        };
    }

    getFrameString(f,numframes) {
        if (numframes<10)
            return `${f}`;

        if (numframes<100) {
            if (f<10)
                return `0${f}`;
            else
                return `${f}`;
        }

        if (numframes<1000) {
            if (f<10)
                return `00${f}`;
            else if (f<100)
                return `0${f}`;
        }
        return `${f}`;
    }
    
    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: combineImages with vals', JSON.stringify(vals));

        let input = this.inputs['input'];
        let outname=vals.outputstem || '';
        
        if (outname.length < 1) {
            let fn=input.getFilename();
            if (fn.length>1) {
                let ext = fn.split('.').pop();
                if (ext==="gz") {
                    fn=fn.substr(0,fn.length-3);
                    ext = fn.split('.').pop();
                }
                fn=fn.substr(0,fn.length-(ext.length+1));
            }
            if (fn.length<1)
                return Promise.reject('No Output File Name Stem specified');
            outname=fn;
        }

        const output=new BisWebImage();
        output.cloneImage(input, { numframes : 1 ,
                                   numcomponents : 1});
        
        const dim=input.getDimensions();
        const volsize=dim[0]*dim[1]*dim[2];
        const input_data= input.getImageData();
        const numframes=dim[3]*dim[4];
        
        for (let frame=0;frame<numframes;frame++) {
            let offset=frame*volsize;
            let output_data = output.getImageData();
            for (let i=0;i<volsize;i++)
                output_data[i]=input_data[i+offset];

            let framename=outname+'_'+this.getFrameString(frame+1,numframes)+'.nii.gz';
            console.log('+++ Saving frame ',frame+1,' in ',framename);
            try {
                await output.save(framename);
            } catch(e) {
                return Promise.reject(e);
            }
        }
        return 'done';
    }
}

module.exports = SplitImageIntoFramesModule;
