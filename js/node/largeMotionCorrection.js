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
const smoothreslice = require("bis_imagesmoothreslice.js");
const BisWebImage = require("bisweb_image.js");
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const baseLargeImage=require('baseLargeImage');

/*
  const zlib = require("zlib");
  const fs = require('fs');


  const rimraf=require('rimraf');
  const tmpDir=require('tmp');



// Including zlib and fs module

let cleanupAndExit=function(code=0) {
    console.log('.... -------------------------------------------------------');
    console.log('.... removing tmp directory',tmpDirectory.name);
    rimraf.sync(tmpDirectory.name);
    process.exit(code);
};

  
// Creating readable Stream
const inp = fs.createReadStream('input.txt');
  
// Creating writable stream
const out = fs.createWriteStream('input.txt.gz');
  
// Calling createGzip method
const gzip = zlib.createGzip();
  
// Piping
inp.pipe(gzip).pipe(out);
console.log("Gzip created!");
*/


/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear).
 */
class LargeMotionCorrectionModule extends BaseModule {
    constructor() {
        super();
        this.name = 'largeMotionCorrection';
        this.JSOnly=true;
        this.useworker=true;
    }

    getDescription() {
        let des={
            "name": "Motion Correction",
            "description": "Runs motion correction",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "mot",
            "slicer" : true,
            "inputs": [
                {
                    'type': 'image',
                    'name': 'Reference Image',
                    'description': 'The image frame to register to',
                    'varname': 'reference',
                    'shortname': 'r',
                    'required': true,
                }
            ],
            "outputs" : [
                {
                    'type': 'transformation',
                    'name': 'Output Transformation',
                    'description': 'The output transformation',
                    'varname': 'output',
                    'shortname': 'o',
                    'required': true,
                    'extension' : '.json',
                }
            ],
            "params": baseutils.getRegistrationParams()
        };

        des.params.push({
            "name": "input",
            "description": "This is the input (target) time series filename",
            "priority": 0,
            "advanced": false,
            "varname": "target",
            "shortname" : "t",
            "type": 'string',
            "default": '',
        });

        des.params.push({
            "name": "resliced",
            "description": "This is the output motion corrected time series filename",
            "priority": 0,
            "advanced": false,
            "varname": "resliced",
            "type": 'string',
            "default": '',
        });

        
        baseutils.setParamDefaultValue(des.params,'metric','CC');
        baseutils.setParamDefaultValue(des.params,'numbins',1024);
        baseutils.setParamDefaultValue(des.params,'steps',4);
        baseutils.setParamDefaultValue(des.params,'resolution',1.01);
        baseutils.setParamDefaultValue(des.params,'iterations',32);
        baseutils.setParamDefaultValue(des.params,'levels',3);
        baseutils.setParamDefaultValue(des.params,'stepsize',0.125);
        baseutils.setParamDefaultValue(des.params,'optimization',"HillClimb");
        des.outputs[0].type="collection";
        return des;
    }

    async directInvokeAlgorithm(vals) {
        console.log('LargeMotionCorrection invoking with vals', JSON.stringify(vals));

        this.vals=vals;
        
        let reference = this.inputs['reference'];
        let debug=super.parseBoolean(vals.debug);

        this.reslicename=vals['resliced'];
        this.doreslice=super.parseBoolean(vals['doreslice']);
        if (this.reslicename.length<2)
            this.doreslice=false;
        
        let inputname=vals['target'];
        let input=new BisWebImage();

        this.matrices=new BisWebDataObjectCollection();
        
        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in largeMotionCorrection '+inputname);
        }
        
        if (!input.hasSameOrientation(reference,'input image','reference image',true))
            return Promise.reject('Failed');

        let dims=input.getDimensions();
        this.numframes=dims[3]*dims[4];

        
        this.RefFrameImage = smoothreslice.imageExtractFrame(reference,vals['refno']);
        await biswrap.initialize();
        console.log('---------------------------',this.doreslice,inputname,this.reslicename);
        await baseLargeImage.readAndProcessLargeImage(inputname,this);
        console.log('---------');
        console.log('Storing output');
        this.outputs['output'] = this.matrices;
    }

    async processFrame(frame,frameImage) {
        
        let debug=false;
        let vals=this.vals;

        
        let xform = biswrap.runLinearRegistrationWASM(this.RefFrameImage, frameImage, 0, {
            'intscale' : parseInt(vals.intscale),
            'numbins' : parseInt(vals.numbins),
            'levels' : parseInt(vals.levels),
            'smoothing' : parseFloat(vals.imagesmoothing),
            'optimization' : baseutils.getOptimizationCode(vals.optimization),
            'stepsize' : parseFloat(vals.stepsize),
            'metric' : baseutils.getMetricCode(vals.metric),
            'normalize' : this.parseBoolean(vals.norm),
            'steps' : parseInt(vals.steps),
            'iterations' : parseInt(vals.iterations),
            'mode' : baseutils.getLinearModeCode(vals.mode), 
            'resolution' : parseFloat(vals.resolution),
            'return_vector' : "true",
            'debug' : debug,
        }, debug);
        //        if (frame%25 ===0) 
        console.log('++++ Done with frame',frame,' p=('+xform.getParameterVector({scale:true}).join(" ")+')');
        
        this.matrices.addItem(xform, { "frame": frame});

        if (!this.doreslice) {
            return false;
        }
        
        if (frame===0) {
            this.fileHandleObject={
                'fd' : null,
                'filename' : ''
            };
            this.resldimensions=this.RefFrameImage.getDimensions();
            this.reslspacing=this.RefFrameImage.getSpacing();
        }

        
            
        let resliceW = biswrap.resliceImageWASM(frameImage, xform, {
            "interpolation": 3,
            "dimensions": this.resldimensions,
            "spacing": this.reslspacing
        }, true);

        debug=true;
        let done=await baseLargeImage.writeOutput(frame,this.numframes,this.reslicename,resliceW,this.fileHandleObject,debug);
        console.log('ooooo motion resliced frame=',frame,' done=',done);


        return done;
    }
}

module.exports = LargeMotionCorrectionModule;
