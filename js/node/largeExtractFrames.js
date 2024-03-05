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

class LargeExtractFramesModule extends BaseModule {
    constructor() {
        super();
        this.name = 'largeExtractFrames';
        this.lastInputDimensions=[0,0,0,0,0];
    }

    createDescription() {
        return {
            "name": "Large Extract Frame",
            "description": "This element will extract a range of frames from a time-series using a streaming algorithm.",
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
                    "name": "BeginFrame",
                    "description": "The first frame in the time series to extract (fourth dimension, first component only)",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "beginframe",
                    "default" : 1,
                },
                {
                    "name": "Endframe",
                    "description": "Last frame to extract (default=-1 last frame)",
                    "priority": 3,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "endframe",
                    "default" : -1,
                },
                {
                    "name": "Increment",
                    "description": "If >1 then skip frames, i.e. extract every increment frame (default=1 every frame)",
                    "priority": 4,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "increment",
                    "default" : 1,
                },
                baseutils.getDebugParam()
            ],

        };
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: largeExtractFrames with vals', JSON.stringify(vals));

        let beginframe= parseInt(vals.beginframe);
        let endframe=parseInt(vals.endframe);
        let increment=parseInt(vals.increment);

        let inputname = vals['input'];
        let input=new BisWebImage();
        let debug=this.parseBoolean(vals.debug);
        this.outputname=largeImageUtil.createOutputFilename(vals['output'],vals['input'],'frcrp','.nii.gz');
        this.vals=vals;
        this.vals['output']=this.outputname;
        
        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in large Extract Frame '+inputname+' '+e);
        }

        let dims=input.getDimensions();

        
        if (dims[4]<1)
            dims[4]=1;
        
        this.beginframe=beginframe;
        if (this.beginframe<0)
            this.beginframe=0;
        else if (this.beginframe>=dims[3])
            this.beginframe=dims[3]-1;

        this.endframe=endframe;
        if (this.endframe<-1) {
            this.endframe=dims[3]+this.endframe;
        }

        if (this.endframe<this.beginframe)
            this.endframe=this.beginframe;
        else if (this.endframe>=dims[3])
            this.endframe=dims[3]-1;

        this.increment=increment;
        if (this.increment<1)
            this.increment=1;

        this.numframes=0;
        let f=this.beginframe;
        while (f<=this.endframe) {
            this.numframes+=1;
            f+=this.increment
        }
        this.endframe=this.beginframe+(this.numframes-1)*this.increment;

        console.log('____ Extracting frames',this.beginframe,":",this.endframe,' at increment ',
                    this.increment,'of ',dims[3]);
        this.writeframe=0;
        this.done=false;
        let spa=input.getSpacing();
        this.temporalSpacing=spa[3]*this.increment;
        console.log('____ Corrected Temporal Spacing=',spa[3],' ---> ',this.temporalSpacing);
        
        let done=await largeImageUtil.readAndProcessLargeImage(inputname,this,-1,-1,spa);


        return done;
    }

    async processFrame(frame,frameImage) {

        let output=null;
        let debug=false;

        
        if (this.done)
            return false;

        if (frame<this.beginframe) {
            return false;
        }

        if (frame===this.endframe)
            this.done=true;

        let step=(frame-this.beginframe) % this.increment;
        
        if (frame===this.beginframe) {
            frameImage.internal.spacing[3]=this.temporalSpacing;
            frameImage.internal.header.struct.pixdim[4]=this.temporalSpacing;
            
            this.storeCommentsInObject(frameImage,
                                       process.argv.join(" "),
                                       this.vals, baseutils.getSystemInfo(biswrap));
        }
        
        
        if (frame>=this.beginframe && frame<=this.endframe && step === 0 ) {
            
            if (this.writeframe===0) {
                this.fileHandleObject={
                    'fd' : null,
                    'filename' : '',
                    'done' : false
                };
            }

            if (this.writeframe%50===0 || this.writeframe===this.numframes-1)
                debug=true;

            if (debug)
                console.log('ooooo processing frame',frame, 'looking for frames in ',this.beginframe,'to',this.endframe,'every',this.increment,' as ',this.writeframe)
            this.done=await largeImageUtil.writeOutput(this.writeframe,this.numframes,this.outputname,frameImage,this.fileHandleObject,debug);
            this.writeframe+=1;
            return this.done;
        } 
        return false;
    }
}

module.exports = LargeExtractFramesModule;
