2/*  LICENSE
 
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
const BisWebImage = require("bisweb_image.js");
const largeImageUtil=require('largeImageUtil');



/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear).
 */
class LargeMaskImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'largeMaskImage';
        this.JSOnly=true;
        this.useworker=false;
    }

    getDescription() {
        let des={
            "name": "Mask Image",
            "description": "Mask Large Image Time Series",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "msked",
            "slicer" : true,
            "inputs": [
                {
                    'type': 'image',
                    'name': 'Mask',
                    'description': 'The image frame to mask with',
                    'varname': 'mask',
                    'shortname': 'm',
                    'required': true,
                }
            ],
            "outputs" : [],
            "params": [
                {
                    "name": "Dilation",
                    "description": "The amount (in voxels) to dilate the mask by",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "dilation",
                    "default" : 0,
                    "low" : 0,
                    "high" : 5
                },
                baseutils.getDebugParam(),
                {   
                    "name": "input",
                    "description": "This is the input time series filename to be masked",
                    "priority": 0,
                    "advanced": false,
                    "varname": "input",
                    "shortname" : "i",
                    "type": 'string',
                    "default": '',
                },
                {
                    "name": "output",
                    "description": "This is the output masked time series filename",
                    "priority": 0,
                    "advanced": false,
                    "varname": "output",
                    "shortname" : "o",
                    "type": 'string',
                    "default": '',
                }
            ]
        };
        
        
        return des;
    }

    async directInvokeAlgorithm(vals) {
        console.log('Large Mask Image invoking with vals', JSON.stringify(vals));

        this.vals=vals;
        
        this.mask = this.inputs['mask'];
        let debug=super.parseBoolean(vals.debug);

        this.outputname=largeImageUtil.createOutputFilename(vals['output'],vals['input'],'msked','.nii.gz');
        this.vals['output']=this.outputname;
        
        let inputname=vals['input'];
        let input=new BisWebImage();

        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in largemotionReslice '+inputname);
        }
        
        if (!input.hasSameSizeAndOrientation(this.mask,'input image','reference image',true)) {
            console.log('Mask does not have the same size or orientation as the input');
            console.log('Mask=',this.mask.getDescription());
            console.log('Input=',input.getDescription());
            return Promise.reject('Failed');
        }

        let dims=input.getDimensions();
        this.numframes=dims[3]*dims[4];

        await biswrap.initialize();

        this.dilated=this.mask;
        let dilation=parseInt(vals.dilation)
    
        if (dilation>0) {
            let do3d=true;
            if (dims[2]<2) {
                do3d=false;
            }
            
            console.log('+++++ Dilating mask by',dilation)
            this.dilated=biswrap.morphologyOperationWASM(this.mask, {
                "operation" : 'dilate',
                "radius" : dilation,
                "do3d" : do3d,
            },this.parseBoolean(vals.debug));
        }

        this.resldimensions=this.mask.getDimensions();
        this.reslspacing = this.mask.getSpacing();

        await largeImageUtil.readAndProcessLargeImage(inputname,this);
        console.log('---------');
        console.log('Storing output');

    }

    async processFrame(frame,frameImage) {

        let debug=false;
        if (frame %100===0)
            debug=true;

        
        if (debug)
            console.log(' In Frame',frame);

        if (frame===0) {
            this.fileHandleObject={
                'fd' : null,
                'filename' : ''
            };
        }
        
        
	    if (frame===0) {
	        console.log('.... Output dimensions=',this.resldimensions, ' spa=', this.reslspacing, ' input=', frameImage.getDescription());
	    }
	
        try {
            let fdata=frameImage.getImageData();
            let mdata=this.dilated.getImageData();
            let np=fdata.length;
            for (let i=0;i<np;i++) {
                if (mdata[i]<1) {
                    fdata[i]=0;
                }
            }

            
            if (frame===0) {
                this.storeCommentsInObject(frameImage,
                                           process.argv.join(" "),
                                           this.vals, baseutils.getSystemInfo(biswrap));
            }
        } catch(e) {
            console.log(e.stack);
            return false;
        }

        
        let done=await largeImageUtil.writeOutput(frame,this.numframes,this.outputname,frameImage,
                this.fileHandleObject,debug);
        if (debug || done)
            console.log('ooooo masked frame=',frame,' done=',done);
        return done;
    }
}

module.exports = LargeMaskImageModule;
