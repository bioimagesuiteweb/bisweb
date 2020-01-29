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
const baseutils=require("baseutils");
const BaseModule = require('basemodule.js');

/**
 * Calculates the displacement field resulting from applying a transformation to an input displacement field.
 */

class JacobianImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'jacobianImage';
    }

    createDescription() {
        let des= {
            "name": "Jacobian Image",
            "description": "Calculates the determinant of the jacobian of the transformation for the volume specified by the given image.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "outputs":  baseutils.getImageToImageOutputs("Output jacobian image"),
            "inputs":  baseutils.getImageToImageInputs("Image that defines the input space"),
            "buttonName": "Calculate",
            "shortname" : "jcb",
            "params": [
                {
                    "name": "NonLinear Only?",
                    "description": "If true removes the average jacobian from the output",
                    "priority": 7,
                    "advanced": false,
                    "gui": "check",
                    "varname": "nonlinearonly",
                    "type": 'boolean',
                    "default": false,
                },

                baseutils.getDebugParam()
            ]
        };
        
        des.inputs.push({
            'type': 'transform',
            'name': 'Transformation',
            'description': 'Load the transformation to compute the jacobian for',
            'varname': 'xform',
            'required' : true,
            'shortname' : 'x'
        });
        
        return des;
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: jacobianImage', JSON.stringify(vals));

        let image = this.inputs['input'] || null;
        let dimension = image.getDimensions();
        let spacing = image.getSpacing();
        
        let xform=this.inputs['xform'] || null;
        
        if (xform === null || image===null) {
            return Promise.reject('Either no image or no transformation specified');
        }
                
        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                
                
                this.outputs['output'] = biswrap.computeJacobianImageWASM(xform, {
                    "dimensions" : [ dimension[0], dimension[1], dimension[2] ],
                    "spacing" : [ spacing[0], spacing[1], spacing[2] ],
                    "nonlinearonly": super.parseBoolean(vals.nonlinearonly),
                }, super.parseBoolean(vals.debug));

                resolve(); 
            }).catch( (e) => {
                console.log(e);
                reject(e.stack);
            });
        });
    }

}

module.exports = JacobianImageModule;
