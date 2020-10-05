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
        this.name = 'invertTransformation';
    }

    createDescription() {
        let des= {
            "name": "Invert Transformation",
            "description": "Calculates the inverse transformatio for a given transformation",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Invert",
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
                    "low": 1.0,
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
                }, {
                    'type': 'transform',
                    'name': 'Transformation 2',
                    'description': 'The second transformation to combine with first',
                    'varname': 'xform2',
                    'required' : false,
                    'shortname' : 'y'
                },{
                    'type': 'transform',
                    'name': 'Transformation 3',
                    'description': 'The third transformation to combine with first and second',
                    'varname': 'xform3',
                    'required' : false,
                    'shortname' : 'z'
                },
                {
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
            
        des.params = des.params.concat(baseutils.getOptParams({ stepsize: 0.5, steps: 1, iterations: 20, levels: 2, resolution: 2.0 }));        
        return des;
    }
        
    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: displacementField', JSON.stringify(vals));

        let ref = this.inputs['ref'] || null;
        let xform=this.inputs['input'] || null;        

        return new Promise((resolve, reject) => {
            console.log('Name = ',xform.constructor.name);

            let xform2=this.inputs['xform2'] || null;
            let xform3=this.inputs['xform3'] || null;

            let coll=[ xform];
            if (xform2!==null)
                coll.push(xform2);
            if (xform3!==null)
                coll.push(xform2);

            let score=0;
            for (let i=0;i<coll.length;i++) {
                if (coll[i].getMatrix !== undefined)
                    score++;
            }

            if (score===coll.length) {
                console.log('All linear numxforms=',coll.length,'score=',score);

                let out=coll[0].getMatrix();
                if (coll.length>1)  {
                    out=numeric.dot(coll[1].getMatrix(),coll[0].getMatrix());

                    
                    if (coll.length>2) {
                        let tmp=out;
                        out=numeric.dot(coll[2].getMatrix(),tmp);
                    }
                }
                
                this.outputs['output']=new BisWebLinearTransformation();
                let minv=numeric.inv(out);
                this.outputs['output'].setMatrix(minv);
                resolve();
                return;
            }
            
            if (ref===null) {
                reject('Must specify ref image');
                return;
            }

            let linear=null;
            if (xform !== null && xform2 === null && xform3 === null) {
                console.log("Single xform");
                console.log('ot=',xform.constructor.name);
                if (xform.constructor.name === 'BisWebComboTransformation') {
                    linear=xform.getLinearTransformation();
                    xform.setLinearTransformation(new BisWebLinearTransformation());
                    console.log('Added new linear');
                }
            }
            
            let dispF=new displacementField();
            dispF.makeInternal();
            dispF.execute({
                xform :  xform,
                xform2: xform2,
                xform3: xform3,
                input : ref,
            },{
                debug : vals['debug']
            }).then( () => {
                
                let approx=new approximateField();
                approx.makeInternal();
                approx.execute({
                    'input' : dispF.getOutputObject('output')
                }, {
                    spacing : vals['spacing'],
                    lambda : vals['lambda'],
                    tolerance : vals['tolerance'],
                    windowsize : vals['windowsize'],
                    "inverse": true,
                    "stepsize": vals['stepsize'],
                    'steps' : vals['steps'],
                    'levels' : vals['levels'],
                    'iterations' : vals['iterations'],
                    'resolution' : vals['resolution'],
                    debug : vals['debug']
                }).then( () => {
                    this.outputs['output'] = approx.getOutputObject('output');
                    resolve('');
                }).catch( (e) => {
                    reject(e.stack);
                });
            }).catch( (e) => {        reject(e.stack);              });
        });
    }
}
    

module.exports = InvertTransformationModule;
