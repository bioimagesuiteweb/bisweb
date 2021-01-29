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

const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");
const BisWebImage = require('bisweb_image.js');
/**
 * Combines images
 */
class CombineImageModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'combineImages';
    }


    createDescription() {
        return {
            "name": "Combine Images",
            "description": "Combines two images in different ways. This can be either arithmetic combination (add, subtract, multiply, divide) or combine them by appending one after the other.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs":  [ {
                'type': 'image',
                'name': 'Input 1',
                'description': 'The first input image',
                'varname': 'input',
                'shortname': 'i',
                'required': true,
                'guiviewerinput' : 'image',
                'guiviewer'  : 'viewer1',

            },
            {
                'type': 'image',
                'name': 'Input 2',
                'description': 'The second input image',
                'varname': 'second',
                'shortname': 's',
                'required': true,
                'guiviewerinput' : 'image',
                'guiviewer'  : 'viewer2',
            }],
            "outputs": baseutils.getImageToImageOutputs("The combined image","viewer2","overlay"),
            "buttonName": "Execute",
            "shortname" : "comb",
            "params": [
                {
                    "name": "Operation",
                    "description": "Operation to perform, i.e. how to combine the images.",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "default" : "add",
                    "type" : "string",
                    "fields" : ["add","subtract","multiply", "divide","append","scaledappend"],
                    "restrictAnswer" : ["add","subtract","multiply", "divide", "append","scaledappend" ],
                    "varname": "mode",
                },
                {
                    "name": "Weight 1",
                    "description": "Scalar to multiply image 1 by before operation",
                    "priority": 10,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "weight1",
                    "default": 1.0,
                    "type": 'int',
                    "low": -100,
                    "high": 100,
                    "step" : 0.1,
                },
                {
                    "name": "Weight 2",
                    "description": "Scalar to multiply image 2 by before operation",
                    "priority": 10,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "weight2",
                    "default": 1.0,
                    "type": 'int',
                    "low": -100,
                    "high": 100,
                    "step" : 0.1,
                },
                {
                    "name": "Output Type",
                    "description": "Output Type",
                    "priority": 3,
                    "advanced": false,
                    "type": "string",
                    "gui": "dropdown",
                    "fields" : [ "UChar","Short", "Float", "Double" ],
                    "restrictAnswer" : [  "UChar", "Short", "Float", "Double" ],
                    "default" : "Float",
                    "varname": "outtype",
                },
                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: combineImages with vals', JSON.stringify(vals));

        let first = this.inputs['input'];
        let second = this.inputs['second'];

        let mode=vals.mode;
        let fdata=first.getImageData();
        let sdata=second.getImageData();
        
        let w1=parseFloat(vals.weight1);
        let w2=parseFloat(vals.weight2);

        let datatype='float';
        if (vals.outtype==="UChar")
            datatype="uchar";
        else if (vals.outtype === "Short")
            datatype="short";
        else if (vals.outtype === "Float")
            datatype="float";
        else if (vals.outtype === "Double")
            datatype="double";

        console.log('oooo mode=',mode,' datatype=',datatype);
        
        if (mode !== "append" && mode!=="scaledappend") {
        
            if (!first.hasSameSizeAndOrientation(second,0.01))
                return Promise.reject("Images have different sizes or orientations.");


            let output=new BisWebImage();
            output.cloneImage(first, { "type" : datatype });
            
            let odata=output.getImageData();
            
            
            for (let i=0;i<fdata.length;i++) {
                
                let v1=w1*fdata[i];
                let v2=w2*sdata[i];
                
                if (mode==="add")
                    odata[i]=v1+v2;
                else if (mode=="subtract")
                    odata[i]=v1-v2;
                else if (mode==="multiply")
                    odata[i]=v1*v2;
                else if (Math.abs(v2)>0.001) 
                    odata[i]=v1/v2;
                else
                    odata[i]=0.0;
            }
            this.outputs['output']=output;
        } else {
            
            if (!first.hasSameSizeAndOrientation(second,0.01,true))
                return Promise.reject("Images have different sizes");

            let dim=first.getDimensions();
            let dim2=second.getDimensions();
            let numframes=dim[3]*dim[4]+dim2[3]*dim2[4];
            
            let output=new BisWebImage();
            output.cloneImage(first, { "type" : datatype,
                                       "numframes" : numframes
                                     });
            
            let odata=output.getImageData();
            if (mode!=="scaledappend") {
                odata.set(fdata,0);
                odata.set(sdata,fdata.length);
            } else {
                for (let i=0;i<fdata.length;i++)
                    odata[i]=fdata[i]*w1;
                for (let i=0;i<sdata.length;i++)
                    odata[i+fdata.length]=sdata[i]*w2;
            }
            this.outputs['output']=output;
        }
        return Promise.resolve();
    }
}

module.exports = CombineImageModule;
