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

/**
 * Aligns a set of images to a reference image using nonlinear registration and returns the set of transformations
 * calculated to perform the alignment. May apply non-affine transformations to achieve alignment.
 */

class NonLinearRegistrationModule extends BaseModule {
    constructor() {
        super();
        this.name = 'nonlinearRegistration';
        this.useworker=true;
    }

    createDescription() {

        let des= {
            "name": "Non-Linear Registration",
            "description": "Runs non-linear registration using a reference image, target image, and a transformation specified as a transformation. Returns a transformation.",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs" : baseutils.getRegistrationInputs(),
            "outputs" : baseutils.getRegistrationOutputs(),
            "buttonName": "Run",
            "shortname" : "nlr",
            "params": baseutils.getRegistrationParams(),
        };

        des.params.push(baseutils.getLinearMode("linearmode","","Affine"));

        des.params.push({
            "name": "CP Spacing",
            "description": "Control Point spacing of the underlying Bspline-FFD Registration",
            "priority": 10,
            "advanced": false,
            "gui": "slider",
            "type": "float",
            "varname": "cps",
            "default" : 20.0,
            "low": 1.0,
            "high": 60.0,
        });

        des.params.push({
            "name": "Append Mode",
            "description": "If true (default), grids are chained",
            "priority": 10,
            "advanced": false,
            "gui": "check",
            "varname": "append",
            "type": 'boolean',
            "default": true,
        });
 
        
        des.params.push({
            "name": "CPS Rate",
            "description": "Control Point spacing rate of the underlying Bspline-FFD Registration",
            "priority": 100,
            "advanced": true,
            "gui": "slider",
            "type": "float",
            "varname": "cpsrate",
            "default" : 2.0,
            "low": 1.0,
            "high": 3.0,
        });

        des.params.push({
            "name": "Smoothness",
            "description": "Extra regularization smoothness term weight",
            "priority": 12,
            "advanced": false,
            "gui": "slider",
            "type": "float",
            "varname": "lambda",
            "default": 0.001,
            "low" : 0.0,
            "high" : 1.0,
        });

        baseutils.setParamDefaultValue(des.params,'debug',true);
        
        return des;
    }


    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: nonLinearRegistration', JSON.stringify(vals));
        let target = this.inputs['target'];
        this.inputs['target']=target;
        let reference = this.inputs['reference'];
        let transform = this.inputs['initial'] || 0;
        let linearmode = baseutils.getLinearModeCode(vals.linearmode);
        
        return new Promise( (resolve, reject) => {
            biswrap.initialize().then( () => {

                let initial=transform;
                
                if (linearmode>=0) {

                    initial = biswrap.runLinearRegistrationWASM(reference, target, transform,{
                        'intscale' : parseInt(vals.intscale),
                        'numbins' : parseInt(vals.numbins),
                        'levels' : parseInt(vals.levels),
                        'steps' : parseInt(vals.steps),
                        'stepsize' : parseFloat(vals.stepsize),
                        'smoothing' : parseFloat(vals.imagesmoothing),
                        'optimization' : baseutils.getOptimizationCode(vals.optimization),
                        'metric' : baseutils.getMetricCode(vals.metric),
                        'iterations' : parseInt(vals.iterations),
                        'normalize' : this.parseBoolean(vals.norm),
                        'mode' : linearmode,
                        'resolution' : parseFloat(vals.resolution),
                        'debug' : this.parseBoolean(vals.debug),
                        'return_vector' : false},
                                                                this.parseBoolean(vals.debug));
                }

                this.outputs['output'] = biswrap.runNonLinearRegistrationWASM(reference, target, initial,{
                    'cps' : parseFloat(vals.cps),
                    'appendmode': this.parseBoolean(vals.append),
                    'cpsrate' : parseFloat(vals.cpsrate),
                    'lambda' : parseFloat(vals.lambda),
                    'intscale' : parseInt(vals.intscale),
                    'numbins' : parseInt(vals.numbins),
                    'levels' : parseInt(vals.levels),
                    'steps' : parseInt(vals.steps),
                    'stepsize' : parseFloat(vals.stepsize),
                    'smoothing' : parseFloat(vals.imagesmoothing),
                    'optimization' : baseutils.getOptimizationCode(vals.optimization),
                    'normalize' : this.parseBoolean(vals.norm),
                    'metric' : baseutils.getMetricCode(vals.metric),
                    'iterations' : parseInt(vals.iterations),
                    'resolution' : parseFloat(vals.resolution),
                    'debug' : this.parseBoolean(vals.debug),
                },this.parseBoolean(vals.debug));
                
                if (vals.doreslice) 
                    this.outputs['resliced']=baseutils.resliceRegistrationOutput(biswrap,reference,target,this.outputs['output']);
                else
                    this.outputs['resliced']=null;
                
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

}

module.exports = NonLinearRegistrationModule;
