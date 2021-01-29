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
 * Performs binary shiftScaleing to an image with the ability to specify both a low and a high shiftScale. 
 * The algorithm can either replace values between the shiftScales, replace values out of the shiftScales, or both.
 * The values to replace 'in' and 'out' with must be specified by the user. 
 */
class ShiftScaleImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'shiftScaleImage';
        this.lastInputRange=[0,0];
    }


    createDescription() {
        return {
            "name": "ShiftScale",
            "description": "This element will shift and scale an image and cast to desired output. E.g. out=(input+shift)*scale",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Shift+Scale",
            "shortname" : "shsc",
            "slicer" : true,
            "params": [
                {
                    "name": "Shift",
                    "description": "The Shift value to add to all voxels",
                    "priority": 1,
                    "advanced": false,
                    "low" : -10000.1,
                    "high" : 10000.1,
                    "type": "float",
                    "varname": "shift",
                    "default" : 0.000,
                    "step" : 0.01,
                },
                {
                    "name": "Scale",
                    "description": "The Scale to multiple all voxels after the shift value is applied",
                    "priority": 2,
                    "advanced": false,
                    "type": "float",
                    "low" : -10000.1,
                    "high" : 10000.1,
                    "step" : 0.01,
                    "default" : 1.0000,
                    "varname": "scale",
                },
                {
                    "name": "Output Type",
                    "description": "Output Type",
                    "priority": 3,
                    "advanced": false,
                    "type": "string",
                    "gui": "dropdown",
                    "fields" : [ "Same","UChar","Short","Int", "Float", "Double" ],
                    "restrictAnswer" : [ "Same", "UChar", "Short","Int", "Float", "Double" ],
                    "default" : "Same",
                    "varname": "outtype",
                },
                    
                baseutils.getDebugParam()
            ]
        };
    }
    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: shiftScaleImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];

        let datatype = -1;
        
        if (vals.outtype==="UChar")
            datatype="uchar";
        else if (vals.outtype === "Short")
            datatype="short";
        else if (vals.outtype === "Float")
            datatype="float";
        else if (vals.outtype === "Int")
            datatype="int32";
        else if (vals.outtype === "Double")
            datatype="double";

        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.shiftScaleImageWASM(input, {
                    "shift": parseFloat(vals.shift),
                    "scale": parseFloat(vals.scale),
                    "outvalue" : parseFloat(vals.outval),
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
            if(name === 'shift') {
                let maxv=Math.max(Math.abs(imagerange[0]),Math.abs(imagerange[1]));
                
                newDes.params[i].low = -2.0*maxv;
                newDes.params[i].high = 2.0*maxv;
                newDes.params[i].default=0.0;
                if (guiVars)
                    guiVars[name]=newDes.params[i].default;
            }
        }
        this.recreateGUI=true;
        return newDes;
    }

}

module.exports = ShiftScaleImageModule;
