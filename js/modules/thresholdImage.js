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

/**
 * Performs binary thresholding to an image with the ability to specify both a low and a high threshold. 
 * The algorithm can either replace values between the thresholds, replace values out of the thresholds, or both.
 * The values to replace 'in' and 'out' with must be specified by the user. 
 */
class ThresholdImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'thresholdImage';
        this.lastInputRange=[0,0];
    }


    createDescription() {
        console.log('Hello THR2');
        
        return {
            "name": "Threshold",
            "description": "This element will threshold an image -- values between the thresholds will be considered 'input' and values outside will be considered 'out'",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Threshold",
            "shortname" : "thr",
            "slicer" : true,
            "params": [
                {
                    "name": "Low Threshold",
                    "description": "The threshold below which values will be classified as 'out'",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "low",
                    "default" : 1,
                },
                {
                    "name": "High Threshold",
                    "description": "The value above which values will be classified as 'out'",
                    "priority": 2,
                    "advanced": false,
                    "type": "float",
                    "gui": "slider",
                    "default" : 2,
                    "varname": "high",
                },
                {
                    "name": "Replace 'in'",
                    "description": "If true, values classified as 'in' will be replaced by 'in value'",
                    "priority": 3,
                    "advanced": true,
                    "gui": "check",
                    "type": "boolean",
                    "default" : false,
                    "varname": "replacein"
                },
                {
                    "name": "Replace 'out'",
                    "description": "If true, values classified as 'out' will be replaced by 'out value'",
                    "priority": 4,
                    "advanced": true,
                    "gui": "check",
                    "default": true,
                    "type": "boolean",
                    "varname": "replaceout"
                },
                {
                    "name": "'in' Value",
                    "description": "Value to replace 'in' values with, -1 is mapped to the maximum value in the image",
                    "priority": 5,
                    "gui": "dropdown",
                    "advanced": true,
                    "default" : 1,
                    "type": "int",
                    "varname": "inval",
                    "fields" : [ 0,1,100,-1 ],
                    "restrictAnswer" : [ 0,1,100,-1 ],
                    
                },
                {
                    "name": "'out' Value",
                    "description": "Value to replace 'out' values with, -1 is mapped to the minimum value in the image",
                    "priority": 6,
                    "advanced": true,
                    "type": "int",
                    "gui": "dropdown",
                    "fields" : [ 0,1,100,-1 ],
                    "restrictAnswer" : [ 0,1,100,-1 ],
                    "default" : 0,
                    "varname": "outval",
                },
                {
                    "name": "Output Type",
                    "description": "Output Type",
                    "priority": 10,
                    "advanced": true,
                    "type": "string",
                    "gui": "dropdown",
                    "fields" : [ "Same","UChar","Short" ],
                    "restrictAnswer" : [ "Same", "UChar", "Short" ],
                    "default" : "Same",
                    "varname": "outtype",
                },
                    
                baseutils.getDebugParam()
            ]
        };
    }
    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: thresholdImage with vals', JSON.stringify(vals));
        const input = this.inputs['input'];

        let datatype = -1;
        if (vals.outtype==="UChar")
            datatype="uchar";
        else if (vals.outtype === "Short")
            datatype="short";

        let inval=parseFloat(vals.inval);
        let outval=parseFloat(vals.outval);

        if (inval<0 || outval<0) {
            const range = input.getIntensityRange();
            if (inval<0)
                inval=range[1];
            if (outval<0)
                outval=range[0];
        }

        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.thresholdImageWASM(input, {
                    "low": parseFloat(vals.low),
                    "high": parseFloat(vals.high),
                    "replacein" : super.parseBoolean(vals.replacein),
                    "replaceout" : super.parseBoolean(vals.replaceout),
                    "invalue" : inval, 
                    "outvalue" : outval,
                    "datatype" : datatype,
                },vals.debug);

                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }


    updateOnChangedInput(inputs,guiVars) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let current_input = inputs['input'] || null;
        if (current_input===null)
            return newDes;

        let imagerange = current_input.getIntensityRange();
        if (this.compareArrays(imagerange,this.lastInputRange,0,1)<1.0) {
            return;
        }
        this.lastInputRange=imagerange;

        
        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            if(name === 'low' || name === 'high' ) {
                newDes.params[i].low = imagerange[0];
                newDes.params[i].high = imagerange[1];
                
                if (name === 'low') {
                    newDes.params[i].default = 0.9 * imagerange[0] + 0.1 * imagerange[1]; 
                } else if (name === 'high') {
                    newDes.params[i].default = imagerange[1];
                }
                if (guiVars)
                    guiVars[name]=newDes.params[i].default;
            }
        }
        this.recreateGUI=true;
        return newDes;
    }

}

module.exports = ThresholdImageModule;
