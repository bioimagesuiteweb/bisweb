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
const BisWebTransformCollection = require('bisweb_transformationcollection');
const BisWebLinearTransformation = require('bisweb_lineartransformation');
const largeImageUtil=require('largeImageUtil');

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
class LargeMotionReslicingModule extends BaseModule {
    constructor() {
        super();
        this.name = 'largeMotionReslicing';
        this.JSOnly=true;
        this.useworker=true;
    }

    getDescription() {
        let des={
            "name": "Motion Reslicing",
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
                },
                {
                    'type': 'transformation',
                    'name': 'Reslice Transform (Atlas->Ref)',
                    'description': 'Load the transformation used to reslice the image',
                    'varname': 'xform',
                    'shortname' : 'x',
                    'required' : false,
                    'guiviewer' : 'current',
                },
                {
                    'type': 'transform',
                    'name': 'Transformation 2 (Ref->Conv)',
                    'description': 'The second transformation to combine with first',
                    'varname': 'xform2',
                    'required' : false,
                    'shortname' : 'y'
                },
                {
                    'type': 'transform',
                    'name': 'Transformation 3 (Conv->EPI)',
                    'description': 'The third transformation to combine with first and second',
                    'varname': 'xform3',
                    'required' : false,
                    'shortname' : 'z'
                },
                {
                    'type': 'collection',
                    'name': 'Motion Correction Collection',
                    'description': 'The output of the motion Correction',
                    'varname': 'motionparam',
                    'required' : true,
                    'shortname' : 'm'
                }
            ],
            "outputs" : [],
            "params": [
                {
                    "name": "Interpolation",
                    "description": "Which type of interpolation to use (3 = cubic, 1 = linear, 0 = nearest-neighbor)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "int",
                    "default" : "3",
                    "varname": "interpolation",
                    "fields" : [ 0,1,3 ],
                    "restrictAnswer" : [ 0,1,3],
                },
                {
                    "name": "Force Float",
                    "description": "If true force output to float",
                    "priority": 100,
                    "advanced": true,
                    "type": "boolean",
                    "default" : false,
                    "varname": "forcefloat",
                },
                {
                    "name": "Fill Value",
                    "description": "Value to use for outside the image",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "varname": "backgroundvalue",
                    "default" : 0.0,
                },
                {
                    "name": "Res factor",
                    "description": "The amount to downsample the reference by",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "res",
                    "default" : 2.0,
                    "low" : 1.0,
                    "high" : 4.0
                },
                baseutils.getDebugParam(),
            ]
        };
        
        des.params.push({
            "name": "input",
            "description": "This is the input (target) time series filename",
            "priority": 0,
            "advanced": false,
            "varname": "input",
            "shortname" : "i",
            "type": 'string',
            "default": '',
        });

        des.params.push({
            "name": "output",
            "description": "This is the output motion corrected time series filename",
            "priority": 0,
            "advanced": false,
            "varname": "output",
            "shortname" : "o",
            "type": 'string',
            "default": '',
        });

        
        
        return des;
    }

    async directInvokeAlgorithm(vals) {
        console.log('LargeMotionReslicing invoking with vals', JSON.stringify(vals));

        this.vals=vals;
        this.matrices = this.inputs['motionparam'] || null;
        if (this.matrices===null)
            return Promise.reject('No Matrices specified');
        
        let reference = this.inputs['reference'];
        let debug=super.parseBoolean(vals.debug);

        this.outputname=largeImageUtil.createOutputFilename(vals['output'],vals['input'],'motresl','.nii.gz');
        this.vals['output']=this.outputname;
        
        let inputname=vals['input'];
        let input=new BisWebImage();

        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in largemotionReslice '+inputname);
        }
        
        if (!input.hasSameOrientation(reference,'input image','reference image',true))
            return Promise.reject('Failed');

        let dims=input.getDimensions();
        this.numframes=dims[3]*dims[4];

        this.resldimensions=reference.getDimensions();
        this.reslspacing = reference.getSpacing();
        let res=parseFloat(vals.res);
        if (res<0.5)
            res=0.5;
        
        console.log('oooo Original dimensions:',this.resldimensions,' spacing:', this.reslspacing);
        for (let i=0;i<=2;i++) {
            this.resldimensions[i]=Math.round(this.resldimensions[i]/res);
	    if (this.resldimensions[i]<1)
		this.resldimensions[i]=1;
            this.reslspacing[i]=this.reslspacing[i]*res;
        }

        let xform=this.inputs['xform'] || null;
        let xform2=this.inputs['xform2'] || null;
        let xform3=this.inputs['xform3'] || null;
        
        this.combinedXform=new BisWebTransformCollection();
        
        if (xform)
            this.combinedXform.addTransformation(xform);
        if (xform2)
            this.combinedXform.addTransformation(xform2);
        if (xform3)
            this.combinedXform.addTransformation(xform3);

        // This is a placeholder for the motion
        this.combinedXform.addTransformation(new BisWebLinearTransformation());
        this.motionindex=this.combinedXform.getNumberOfTransformations()-1;

        this.dt="same";
        if (vals.forcefloat) {
            this.dt="float";
        }
        
        await biswrap.initialize();
        console.log('---------------------------',this.doreslice,inputname,this.outputname);
        await largeImageUtil.readAndProcessLargeImage(inputname,this);
        console.log('---------');
        console.log('Storing output');

    }

    async processFrame(frame,frameImage) {

        let debug=false;
        if (frame %50===0)
            debug=true;

        this.combinedXform.setTransformation(this.motionindex,this.matrices.getItemData(frame));
        
        if (debug)
            console.log(' In Frame',frame,this.combinedXform.getDescription());

        if (frame===0) {
            this.fileHandleObject={
                'fd' : null,
                'filename' : ''
            };
        }
        
        let resliceW =null;

	if (frame===0) {
	    console.log('Output dimensions=',this.resldimensions, ' spa=', this.reslspacing, ' input=', frameImage.getDescription());
	}
	
        try {
            resliceW=biswrap.resliceImageWASM(frameImage, this.combinedXform, {
                "interpolation": parseInt(this.vals.interpolation),
                "datatype" : this.dt,
                "backgroundValue" : parseFloat(this.vals.backgroundvalue),
                "dimensions": this.resldimensions,
                "spacing": this.reslspacing
            }, debug);
            
            if (frame===0) {
                this.storeCommentsInObject(resliceW,
                                           process.argv.join(" "),
                                           this.vals, baseutils.getSystemInfo(biswrap));
            }
        } catch(e) {
            console.log(e.stack);
            return false;
        }

        
        let done=await largeImageUtil.writeOutput(frame,this.numframes,this.outputname,resliceW,this.fileHandleObject,debug);
        console.log('ooooo motion resliced frame=',frame,' done=',done);
        return done;
    }
}

module.exports = LargeMotionReslicingModule;
