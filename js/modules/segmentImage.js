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
const baseutils=require("baseutils");

// Image to Image
// Map intensity image to classes 0,1,2,3,4

/**
 * Segments an image using either histogram methods (based on image intensity) or Markov Random Fields (MRF).
 */
class SegmentImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'segmentImage';
    }


    createDescription() {
        let des={
            "name": "Segment Image",
            "description": "Performs image segmentation using a histogram-based method if smoothness = 0.0 or using plus mrf segmentation if smoothness > 0.0",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Segment",
            "shortname" : "sgm",
            "slicer" : true,
            "params": [
                {
                    "name": "Num Classes",
                    "description": "Number of classes to segment image into",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "numclasses",
                    "default" : 3,
                    "low" : 2,
                    "high" : 8,
                },
                {
                    "name": "Maximum Sigma Ratio",
                    "description": "Enforced ratio between minimum and maximum standard deviation between class parameters",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "varname": "maxsigmaratio",
                    "default" : 0.2,
                    "low" : 0.0,
                    "high" : 1.0,
                },
                {
                    "name": "Robust",
                    "description": "Use robust range algorithm to eliminate outliers prior to segmentation",
                    "priority": 3,
                    "advanced": true,
                    "gui": "check",
                    "type": "boolean",
                    "varname": "robust",
                    "default" : false,
                },
                {
                    "name": "Number of Bins",
                    "description": "Number of bins in the histogram",
                    "priority": 4,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "numbins",
                    "low" : 32,
                    "high": 1024,
                    "default" : 256,
                },
                {
                    "name": "Smooth Histogram",
                    "description": "Whether or not to apply smoothing to the histogram",
                    "priority": 5,
                    "advanced": true,
                    "gui": "check",
                    "type": "boolean",
                    "varname": "smoothhisto",
                    "default" : true,
                },
                {
                    "name": "Smoothness",
                    "description": "If > 0 then apply spatial regularization MRF model with this value as the weight",
                    "priority": 6,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "smoothness",
                    "default" : 0.0,
                    "low" : 0.0,
                    "high" : 100.0,
                },
                {
                    "name": "MRF Convergence",
                    "description": "Convergence parameter for the MRF iterations",
                    "priority": 7,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "varname": "mrfconvergence",
                    "default" : 0.2,
                    "low" :0.01,
                    "high" : 0.5,
                },
                {
                    "name": "MRF Iterations",
                    "description": "Number of MRF iterations",
                    "priority": 8,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "mrfiterations",
                    "default" : 8,
                    "low" : 1,
                    "high": 20,
                },
                {
                    "name": "Internal Iterations",
                    "description": "Number of internal iterations",
                    "priority": 100,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "internaliterations",
                    "default" : 4,
                    "low" : 1,
                    "high": 20,
                },
                {
                    "name": "Noise Sigma",
                    "description": "Estimate of the standard deviation of noise in the image. This is used to add robustness to the algorithm",
                    "priority": 9,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "varname": "noisesigma2",
                    "default" : 0.0,
                    "low" : 0.0,
                    "high" : 1000,
                },
                baseutils.getDebugParam(),
            ]
        };
        des.outputs[0]['guiviewertype']='overlay';
        return des;
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: segmentImage with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let input = this.inputs['input'];
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.segmentImageWASM(input, {
                    "frame" : 0,
                    "component" : 0,
                    "numclasses" : parseInt(vals.numclasses),
                    "numbins" : parseInt(vals.numbins),
                    "maxsigmaratio" : parseFloat(vals.maxsigmaratio),
                    "robust" : super.parseBoolean(vals.robust),
                    "smoothhisto" : super.parseBoolean(vals.smoothhisto),
                    "smoothness" : parseFloat(vals.smoothness),
                    "mrfconvergence" : parseFloat(vals.mrfconvergence),
                    "mrfiterations" : parseInt(vals.mrfiterations),
                    "internaliterations" : parseInt(vals.internaliterations),
                    "noisesigma2" : parseFloat(vals.noisesigma2)
                },vals.debug);

                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }




}

module.exports = SegmentImageModule;
