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
const BisWebImage = require('bisweb_image.js');
const BaseModule = require('basemodule.js');
const BisWebTextObject = require('bisweb_textobject.js');
/**
 * blanks an image along 
 */
class ReorientImageModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'reorientImage';
    }

    createDescription() {

        let des= {
            "name": "Reorient Image",
            "description": "This algorithm reorients an image to a fixed orientation. The letters refer to the direction towards the individual axes are increasing. RAS, for example, means an image where the first axis goes from left-to-Right, the second axis from posterior-to-Anterior and the third axis from inferior-to-Superior",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('input'),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Execute",
            "shortname" : "reornt",
            "slicer" : true,
            "params": [
                {
                    "name": "Orientation",
                    "description": "Output image orientation",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "string",
                    "fields": ["RAS", "LPS", "LAS"],
                    "restrictAnswer": ["RAS", "LPS", "LAS" ],
                    "varname": "orient",
                    "default": "RAS"
                },
                baseutils.getDebugParam(),
            ],
            
        };

        baseutils.addLogOutput(des.outputs);
        return des;
    }

    directInvokeAlgorithm(vals) {
        let input = this.inputs['input'];

        console.log('oooo invoking: reorientImage with vals', JSON.stringify(vals));

        let debug=this.parseBoolean(vals.debug);

        if (debug) {
            console.log('-- input \n', input.getDescription(),'\n');
            console.log(input.getHeader().getDescription());
        }

        
        let dat=input.serializeToNII();
        let output=new BisWebImage();
        output.initialize();
        output.debug=debug;
        output.parseNIIModular(dat.buffer,vals.orient);
        output.debug=false;
        this.outputs['output']=output;

        if (debug) {
            console.log('-- output \n', output.getDescription(),'\n');
            console.log(output.getHeader().getDescription());
        }

        this.outputs['logoutput']=new BisWebTextObject('Reoriented\n---\n\t input:'+input.getDescription()+'\n---\n\t output:'+output.getDescription());

        return Promise.resolve();
    }


}

module.exports = ReorientImageModule;
