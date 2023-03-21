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
            "outputs": baseutils.getImageToImageOutputs(),
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
                    "name": "Frame",
                    "description": "Which frame in the time series to extract (fourth dimension)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "frame",
                    "default" : 1,
                },
                {
                    "name": "Component",
                    "description": "Which component to extract a frame from (fifth dimension)",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "component",
                    "default" : 0,
                },
                baseutils.getDebugParam()
            ],

        };
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: largeExtractFrame with vals', JSON.stringify(vals));

        let frame= parseInt(vals.frame, 10);
        let component=parseInt(vals.component, 10);
        let inputname = vals['input'];
        let input=new BisWebImage();
        let debug=this.parseBoolean(vals.debug);
        
        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in large Extract Frame '+inputname+' '+e);
        }

        let dims=input.getDimensions();

        if (dims[4]<1)
            dims[4]=1;
        
        this.frame=frame+component*dims[3];
        if (this.frame<0)
            this.frame=0;
        else if (this.frame>dims[3]*dims[4])
            this.frame=dims[3]*dims[4]-1;
        await largeImageUtil.readAndProcessLargeImage(inputname,this);
    }

    async processFrame(frame,frameImage) {

        if (frame%50===0 || frame===this.frame) 
            console.log('ooooo processing frame',frame, 'looking for ',this.frame);
        
        if (frame<this.frame)
            return false;

        if (frame===this.frame)
            this.outputs['output'] = frameImage;
        
        return true;
    }
}

module.exports = LargeExtractFrameModule;
