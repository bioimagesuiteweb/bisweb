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
const baseLargeImage=require('baseLargeImage');
const biswrap = require('libbiswasm_wrapper');

/**
 * Extracts a single frame from a time series image, potentially with multiple components.
 */

class LargeMedianFilterModule extends BaseModule {
    constructor() {
        super();
        this.name = 'largeMedianFilter';
    }

    createDescription() {
        return {
            "name": "Median Filter Image",
            "description": "This element will perform median filtering (one frame at a time) from a time-series using a streaming algorithm.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs": [],
            "buttonName": "MedianFilt",
            "shortname" : "mdflt",
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
                    "name": "In3D",
                    "description": "If true filter in 3D (default=true)",
                    "priority": 3,
                    "advanced": false,
                    "gui": "check",
                    "varname": "do3d",
                    "type": 'boolean',
                    "default": true,
                    "jsonly" : true,
                },
                {
                    "name": "Radius",
                    "description": "This is the radius of the median filter window (2*radius+1)",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": 'int',
                    "default": 1,
                    "lowbound": 1,
                    "highbound": 20,
                    "varname": "radius"
                },
                baseutils.getDebugParam()
            ],

        };
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: extractFrame with vals', JSON.stringify(vals));

        this.radius = parseInt(vals.radius);
        this.do3d = super.parseBoolean(vals.do3d);
        this.debug=this.parseBoolean(vals.debug);
        this.outputname=vals['output'];

        
        
        let inputname = vals['input'];
        let input=new BisWebImage();

        
        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,this.debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in large Extract Frame '+inputname+' '+e);
        }

        let dims=input.getDimensions();

        console.log('Dims=',dims);
        
        if (dims[4]<1)
            dims[4]=1;

        this.numframes=dims[4]*dims[3];

        await biswrap.initialize();
        await baseLargeImage.readAndProcessLargeImage(inputname,this);
    }

    processFrame(frame,frameImage) {

        let output=null;

        if (frame % 50===0) {
            console.log('--- filtering frame ',frame);
        }
        
        try {
            output =  biswrap.medianImageFilterWASM(frameImage, {
                "radius": this.radius,
                "do3d" : this.do3d,
            }, this.debug);
        } catch(e) {
            console.log(e.stack);
            return false;
        }


        
        if (frame===0) {
            this.fileHandleObject={
                'fd' : null,
                'filename' : ''
            };
        }


        
        let done=baseLargeImage.writeOutput(frame,this.numframes,this.outputname,output,this.fileHandleObject);


        return false;
        
        
    }
}

module.exports = LargeMedianFilterModule;
