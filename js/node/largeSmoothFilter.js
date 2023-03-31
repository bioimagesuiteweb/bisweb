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

class LargeSmoothFilterModule extends BaseModule {
    constructor() {
        super();
        this.name = 'largeSmoothFilter';
    }

    createDescription() {
        return {
            "name": "Large Smooth Filter Image",
            "description": "This algorithm performs image smoothing using a 2D/3D Gaussian kernel  (one frame at a time) from a time-series using a streaming algorithm.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs": [],
            "buttonName": "SmoothFilt",
            "shortname" : "sm",
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
                    "name": "Sigma",
                    "description": "The gaussian kernel standard deviation (either in voxels or mm)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 1.0,
                    "type": 'float',
                    "low":  0.0,
                    "high": 8.0
                },
                {
                    "name": "In mm?",
                    "description": "Determines whether kernel standard deviation (sigma) will be measured in millimeters or voxels",
                    "priority": 7,
                    "advanced": false,
                    "gui": "check",
                    "varname": "inmm",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "FWHMAX?",
                    "description": "If true treat kernel in units of full-width-at-half max (FWHM) (not as the actual value of the sigma in the gaussian filter.)",
                    "priority": 8,
                    "advanced": false,
                    "gui": "check",
                    "varname": "fwhmax",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "vtkboundary",
                    "description": "If true mimic how VTK handles boundary conditions for smoothing (instead of tiling default)",
                    "priority": 10,
                    "advanced": true,
                    "gui": "check",
                    "varname": "vtkboundary",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Radius Factor",
                    "description": "This affects the size of the convolution kernel which is computed as sigma*radius+1",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": 'float',
                    "default": 2.0,
                    "lowbound": 1.0,
                    "highbound": 4.0,
                    "varname": "radiusfactor"
                },



                baseutils.getDebugParam()
            ],

        };
    }

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: largeSmoothFilter with vals', JSON.stringify(vals));

        let s = parseFloat(vals.sigma);
        if (super.parseBoolean(vals.fwhmax)) {
            s=s*0.4247;
        }

        
        
        
        this.algoparameters={
            "sigmas": [s, s, s],
            "inmm": super.parseBoolean(vals.inmm),
            "radiusfactor": parseFloat(vals.radiusfactor),
            "vtkboundary" : super.parseBoolean(vals.vtkboundary)
        }
        this.debug=super.parseBoolean(vals.debug);        

        this.outputname=largeImageUtil.createOutputFilename(vals['output'],vals['input'],'sm','.nii.gz');
        this.vals=vals;
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

        if (dims[4]<1)
            dims[4]=1;

        this.numframes=dims[4]*dims[3];

        await biswrap.initialize();
        await largeImageUtil.readAndProcessLargeImage(inputname,this);
    }

    async processFrame(frame,frameImage) {

        let output=null;
        let debug=false;
        if (frame % 50===0 || frame < 2 || frame==this.numframes-1) {
            debug=true;
        }

        try {
            output =  biswrap.gaussianSmoothImageWASM(frameImage, this.algoparameters,this.debug);
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

module.exports = LargeSmoothFilterModule;
