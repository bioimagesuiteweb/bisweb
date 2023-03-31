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
const largeImageUtil=require('largeImageUtil');
const biswrap = require('libbiswasm_wrapper');

/**
 * Extracts a single frame from a time series image, potentially with multiple components.
 */

class LargeResampleImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'largeResampleImage';
    }

    createDescription() {
        return {
            "name": "Large Resample Image",
            "description": "This element will resample images (one frame at a time) from a time-series using a streaming algorithm.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs": [],
            "buttonName": "Resample",
            "shortname" : "rsp",
            "slicer" : true,
            "params": [
                {
                    "name": "XSpacing",
                    "description": "Desired voxel spacing in X direction",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "xsp",
                    "default" : -1.0,
                },
                {
                    "name": "Y Spacing", 
                    "description": "Desired voxel spacing in Y direction",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "ysp",
                    "default" : -1.0,
                },
                {
                    "name": "Z Spacing", 
                    "description": "Desired voxel spacing in Z direction",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "zsp",
                    "default" : -1.0,
                },
                {
                    "name": "Interpolation",
                    "description": "Type of interpolation to use (0 = nearest-neighbor, 1 = linear, 3 = cubic)",
                    "priority": 4,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "int",
                    "varname": "interpolation",
                    "fields": [ 0,1,3 ],
                    "restrictAnswer": [ 0,1,3],
                    "default" : 1,
                },
                {
                    "name": "Background Value", 
                    "description": "value to use for outside the region covered by the original image (at the boundaries)",
                    "priority": 100,
                    "advanced": true,
                    "gui": "entrywidget",
                    "type": "float",
                    "varname": "backgroundvalue",
                    "default" : 0.0,
                },
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
                baseutils.getDebugParam()
            ],

        };
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: largeResampleImage with vals', JSON.stringify(vals));

        this.algoparams= {
            "xsp": parseFloat(vals.xsp),
            "ysp": parseFloat(vals.ysp),
            "zsp": parseFloat(vals.zsp),
            "interpolation" : parseInt(vals.interpolation),
            "backgroundvalue" : parseFloat(vals.backgroundvalue),
            "debug" : this.parseBoolean(vals.debug)
        };

        this.vals=vals;
        this.outputname=largeImageUtil.createOutputFilename(vals['output'],vals['input'],'rsp','.nii.gz');
        this.vals['output']=this.outputname;
        
        let inputname = vals['input'];
        let input=new BisWebImage();
        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,this.debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in large Extract Frame '+inputname+' '+e);
        }

        let dims=input.getDimensions();
        let spa=input.getSpacing();
        if (this.algoparams.xsp < 0) {
            this.algoparams.xsp=spa[0];
            this.vals['xsp']=spa[0];
        }
        if (this.algoparams.ysp < 0) {
            this.algoparams.ysp=spa[1];
            this.vals['ysp']=spa[1];
        }
        
        if (this.algoparams.zsp < 0) {
            this.algoparams.zsp=spa[2];
            this.vals['zsp']=spa[2];
        }

        if (dims[4]<1)
            dims[4]=1;

        this.numframes=dims[4]*dims[3];

        await biswrap.initialize();
        await largeImageUtil.readAndProcessLargeImage(inputname,this);
    }

    async processFrame(frame,frameImage) {

        let output=null;
        let debug=false;
        if (frame % 200===0 || frame < 2) {
            debug=true;
        }
        
        try {
            const p={
                "spacing" : [ this.algoparams.xsp, this.algoparams.ysp, this.algoparams.zsp],
                "interpolation" : this.algoparams.interpolation,
                "backgroundValue" : this.algoparams.backgroundvalue
            };

            output = biswrap.resampleImageWASM(frameImage, p,this.algoparams.debug);
            if (frame===0) {
                this.storeCommentsInObject(output,
                                           process.argv.join(" "),
                                           this.vals, baseutils.getSystemInfo(biswrap));
            }

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


        let done=await largeImageUtil.writeOutput(frame,this.numframes,this.outputname,output,this.fileHandleObject,debug);
        return done;
    }
}

module.exports = LargeResampleImageModule;
