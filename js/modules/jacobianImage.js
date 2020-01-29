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
    constructor(md) {
        super();
        this.name = 'jacobianImage';

        this.outputGUIInput = 'image';
        this.outputGUIViewer = 'viewer2';

        if (md==='overlay' || md==='single') {
            this.outputGUIInput = 'overlay';
            this.outputGUIViewer = 'viewer1';
        }

    }

    createDescription() {
        let des= {
            "name": "Jacobian Image",
            "description": "Calculates the determinant of the jacobian of the transformation for the volume specified by the given image.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Calculate",
            "shortname" : "jcb",
            "outputs": [
                {
                    'type': 'image',
                    'name': 'Output Image',
                    'description': 'Jacobian Output Image',
                    'varname': 'output',
                    'shortname' : 'o',
                    'required': false,
                    'extension' : '.nii.gz',
                    'guiviewertype' : this.outputGUIInput,
                    'guiviewer'     : this.outputGUIViewer,
                    'colortype'  : 'Orange'
                }
            ],
            "inputs":  [
                {
                    'type': 'transformation',
                    'name': 'Input Transform',
                    'description': 'The transformation used to compute the Jacobian Image',
                    'varname': 'xform',
                    'shortname' : 'x',
                    'required' : true,
                    'guiviewer' : 'current',
                },
                {
                    'type': 'image',
                    'name': 'Base Image ',
                    'description': 'Image that defines the size of the Jacobian Image',
                    'varname': 'input',
                    'shortname' : 'i',
                    'required' : true,
                    'guiviewertype' : 'image',
                    'guiviewer'  : 'viewer1',
                }
                
            ],
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
        
        return des;
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: jacobianImage', JSON.stringify(vals));

        let image = this.inputs['input'] || null;
        let xform=this.inputs['xform'] || null;
        
        if (xform === null || image===null) {
            return Promise.reject('Either no image or no transformation specified');
        }
                
        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                console.log('Input=',image.getDescription(),xform.getDescription());
                
                this.outputs['output'] = biswrap.computeJacobianImageWASM(image,xform, {
                    "nonlinearonly": super.parseBoolean(vals.nonlinearonly),
                }, super.parseBoolean(vals.debug));
                

                console.log('Output=',this.outputs['output'].getDescription());
                resolve(); 
            }).catch( (e) => {
                console.log(e);
                reject(e.stack);
            });
        });
    }

}

module.exports = JacobianImageModule;
