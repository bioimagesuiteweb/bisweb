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
const BisWebLinearTransformation = require('bisweb_lineartransformation.js');
const approximateField=require('approximateField');
const displacementField=require('displacementField');
const numeric=require('numeric');
/**
 * Calculates the displacement field resulting from applying a transformation to an input displacement field.
 */

class InvertTransformationModule extends BaseModule {
    constructor() {
        super();
        this.name = 'displacementField';
    }

    createDescription() {
        let des= {
            "name": "Invert Transformation",
            "description": "Calculates the inverse transformatio for a given transformation",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Calculate",
            "shortname" : "inv",
            "params": [
                {
                    "name": "Smoothness",
                    "description": "Extra regularization smoothness term weight",
                    "priority": 12,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "lambda",
                    "default": 0.1,
                    "low": 0.0,
                    "high": 1.0,
                },
                {
                    "name": "Tolerance",
                    "description": "Fitting to tolerance",
                    "priority": 5,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "tolerance",
                    "default": 0.001,
                },
                {
                    "name": "Window Size",
                    "description": "Fitting quality",
                    "priority": 7,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "windowsize",
                    "low": 1.0,
                    "high": 2.0,
                    "default": 2.0,
                },
                {
                    "name": "Spacing",
                    "description": "The control point spacing of the output grid transform",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "spacing",
                    "low": 2.0,
                    "high": 50.0,
                    "default": 25.0,
                },
                baseutils.getDebugParam()
            ],
            inputs : [
                {
                    'type': 'transform',
                    'name': 'Transformation',
                    'description': 'Load the transformation to invert',
                    'varname': 'input',
                    'required' : true,
                    'shortname' : 'i'
                },{
                    'type': 'image',
                    'name': 'Ref Image',
                    'description': 'The Reference image (defines the coordinate space)',
                    'varname': 'ref',
                    'shortname': 'r',
                    'required': false,
                    'guiviewerinput' : 'image',
                    'guiviewer'  : 'viewer1',
                }
            ],
            outputs : [
                {
                    'type': 'output',
                    'name': 'Output Transformation',
                    'description': 'The output (inverse transformation)',
                    'varname': 'output',
                    'required': true,
                    'shortname': 'o'
                }
            ]
        };
            
        
        return des;
    }
        
    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: displacementField', JSON.stringify(vals));

        let ref = this.inputs['reference'] || null;
        let xform=this.inputs['input'] || null;        

        return new Promise((resolve, reject) => {
            console.log('Name = ',xform.constructor.name);
            
            if (xform.constructor.name==="BisWebLinearTransformation") {
                
                this.outputs['output']=new BisWebLinearTransformation();
                let minv=numeric.inv(xform.getMatrix());
                this.outputs['output'].setMatrix(minv);
                resolve();
                return;
            }
            
            if (ref===null) {
                reject('Must specify ref image');
                return;
            }
            
            let dispF=new displacementField();
            dispF.execute({
                xform :  xform,
                input : ref,
            },{
                debug : vals['debug']
            }).then( () => {
                
                let approx=new approximateField();
                approx.execute({
                    'input' : dispF.getOutputObject('output')
                }, {
                    spacing : vals['spacing'],
                    lambda : vals['lambda'],
                    tolerance : vals['tolerance'],
                    windowsize : vals['windowsize'],
                    "inverse": true,
                    debug : vals['debug']
                }).then( () => {
                    this.outputs['output'] = approx.getOutputObject('output');
                    resolve('');
                }).catch( (e) => {
                    reject(e.stack);
                });
            }).catch( (e) => {        reject(e.stack);              });
        }).catch( (e) => {        reject(e.stack);              });
    }
}
    

module.exports = InvertTransformationModule;
