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
const BisWebImage = require('bisweb_image.js');
const largeImageUtil=require('largeImageUtil');
/**
 * Extracts a single frame from a time series image, potentially with multiple components.
 */

class LargeExtractFrameModule extends BaseModule {
    constructor() {
        super();
        this.name = 'largeExtractFrame';
        this.lastInputDimensions=[0,0,0,0,0];
    }

    createDescription() {
        return {
            "name": "Large Extract Frame",
            "description": "This element will extract a single frame from a time-series using a streaming algorithm.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs": [],
            "buttonName": "Extract",
            "shortname" : "fr",
            "slicer" : true,
            "params": [
                {
                    "name": "input",
                    "description": "This is the input filename",
                    "priority": 0,
                    "advanced": false,
                    "varname": "input",
                    "shortname" : "i",
                    "type": 'string',
                    "default": '',
                },
                {
                    "name": "output",
                    "description": "This is the output filename",
                    "priority": 1,
                    "advanced": false,
                    "varname": "output",
                    "shortname" : "o",
                    "type": 'string',
                    "default": '',
                },
                {
                    "name": "Frame",
                    "description": "Which frame (or first frame) in the time series to extract (fourth dimension, first component only)",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "frame",
                    "default" : 1,
                },
                {
                    "name": "Endframe",
                    "description": "Last frame to extract (default=0 single frame)",
                    "priority": 3,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "endframe",
                    "default" : 0,
                },
                baseutils.getDebugParam()
            ],

        };
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: largeExtractFrame with vals', JSON.stringify(vals));

        let frame= parseInt(vals.frame, 0);
        let endframe=parseInt(vals.endframe ,0);
        console.log('vals.endframe=',vals.endframe,endframe);

        
        let inputname = vals['input'];
        let input=new BisWebImage();
        let debug=this.parseBoolean(vals.debug);
        this.outputname=largeImageUtil.createOutputFilename(vals['output'],vals['input'],'frcrp','.nii.gz');
        
        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in large Extract Frame '+inputname+' '+e);
        }

        let dims=input.getDimensions();
        this.numframes=dims[3]*dims[4];
        
        if (dims[4]<1)
            dims[4]=1;
        
        this.frame=frame;
        if (this.frame<0)
            this.frame=0;
        else if (this.frame>=dims[3])
            this.frame=dims[3]-1;

        this.endframe=endframe;
        if (this.endframe<this.frame)
            this.endframe=this.frame;
        else if (this.endframe>=dims[3])
            this.endframe=dims[3]-1;

        console.log('____ Extracting frames',this.frame,":",this.endframe,' of ',dims[3]);
        await largeImageUtil.readAndProcessLargeImage(inputname,this);
    }

    async processFrame(frame,frameImage) {

        let output=null;
        let debug=false;

        if (frame===0) {
            this.fileHandleObject={
                'fd' : null,
                'filename' : ''
            };
        }

        if (frame%50===0 || frame===this.frame)
            console.log('ooooo processing frame',frame, 'looking for ',this.frame,this.endframe);
        
        if (frame<this.frame) {
            return false;
        }


        
        if (frame>=this.frame && frame<=this.endframe) {
            return await largeImageUtil.writeOutput(frame-this.frame,this.endframe-this.frame+1,this.outputname,frameImage,this.fileHandleObject,debug);
        }

        return true;
    }
}

module.exports = LargeExtractFrameModule;
