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
const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const smoothreslice = require("bis_imagesmoothreslice.js");
const BisWebImage = require("bisweb_image.js");
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');

/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear).
 */
class MotionCorrectionModule extends BaseModule {
    constructor() {
        super();
        this.name = 'motionCorrection';
        this.JSOnly=true;
        this.useworker=true;
    }

    getDescription() {
        let des={
            "name": "Motion Correction",
            "description": "Runs motion correction",
            "author": "Michelle Lim",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "mot",
            "slicer" : true,
            "inputs": baseutils.getRegistrationInputs(),
            "outputs" : baseutils.getRegistrationOutputs(),
            "params": baseutils.getRegistrationParams()
        };

        des.params.push({
            "name": "Reference Frame Number",
            "description": "Frame number of reference image used for linear registration",
            "priority": 12,
            "advanced": false,
            "gui": "slider",
            "type": "int",
            "varname": "refno",
            "default" : 0,
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
        des.outputs[1].required=true;
        return des;
    }

    directInvokeAlgorithm(vals) {
        console.log('MotionCorrection invoking with vals', JSON.stringify(vals));
        return new Promise( (resolve, reject) => {
            let target = this.inputs['target'];
            let reference = this.inputs['reference'] || 0;
            
            if (reference===0) 
                reference=target;

            if (!reference.hasSameOrientation(target,'reference image','target image',true)) {
                reject('Failed');
                return;
            }


            biswrap.initialize().then(() => {
                //Open input file

                this.outputs['output'] = this.run_registrations(vals, reference, target, parseInt(vals.refno));
                //Run Reslicing on InputImage using matrices

                this.outputs['resliced'] = this.runReslice(target, this.outputs['output']);

                resolve();

            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

    // Get a Single Frame
    getFrame(InputImage,frame) {
        return smoothreslice.imageExtractFrame(InputImage,frame);
    }

    run_registrations(vals, ReferenceImage, InputImage, refno = 0) {

        let RefFrameImage = smoothreslice.imageExtractFrame(ReferenceImage,refno);
        let dimensions = InputImage.getDimensions();
        let numframes = dimensions[3];

        let matrices=new BisWebDataObjectCollection();

        
        for (let frame = 0; frame < numframes; frame++) {
            let debug=false;
            if (frame===1)
                debug=true;
            let InputFrame = this.getFrame(InputImage,frame);
            let xform = biswrap.runLinearRegistrationWASM(RefFrameImage, InputFrame, 0, {
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
            if (frame%25 ===0) 
                console.log('++++ Done with frame',frame,' p=('+xform.getParameterVector({scale:true}).join(" ")+')');
            
            matrices.addItem(xform, { "frame": frame});
        }
        return matrices;
    }

    runReslice(inputimage, matrices ) {
        
        let output_image = new BisWebImage();
        let dimensions = inputimage.getDimensions();
        let spacing = inputimage.getSpacing();
        let numframes=matrices.getNumberOfItems();

        output_image.cloneImage(inputimage,
                                { dimensions : dimensions,
                                  spacing : spacing,
                                });
        

        let volumesize = dimensions[0] * dimensions[1] * dimensions[2];
        let outdata = output_image.getImageData();
        
        for (let frame = 0; frame < numframes; frame++) {
            let InputFrame = this.getFrame(inputimage,frame);
            let resliceW = biswrap.resliceImageWASM(InputFrame, matrices.getItemData(frame), {
                "interpolation": 3,
                "dimensions": dimensions,
                "spacing": spacing
            }, 0);

            
            let inp_data = resliceW.getImageData();
            let offset = frame * volumesize;

            
            for (let i = 0; i < volumesize; i++)
                outdata[i + offset] = inp_data[i];
            if (frame%25 ===0) 
                console.log('++++ Resliced frame',frame);
        }
        return output_image;
    }

}

module.exports = MotionCorrectionModule;
