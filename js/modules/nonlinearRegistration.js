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
const genericio = require('bis_genericio.js');
const xformutil=require('bis_transformationutil.js');

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
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs" : baseutils.getRegistrationInputs(),
            "outputs" : baseutils.getRegistrationOutputs(),
            "buttonName": "Run",
            "shortname" : "nlr",
            "slicer" : true,
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
            "step" : 0.25
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

        des.params.push({
            "name": "Header Orient",
            "description": "use header orientation for initial matrix",
            "priority": 10,
            "advanced": false,
            "type": "boolean",
            "default": true,
            "varname": "useheader"
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

        if (genericio.getenvironment()!=='node') {
            vals.doreslice=true;
            vals.debug=true;
        }

        return new Promise( (resolve, reject) => {
            biswrap.initialize().then( () => {

                let initial=transform;

                let useheader=this.parseBoolean(vals.useheader);
                let centeronrefonly=false;
                if (xformutil.isTransformIdentityOrNULL(initial)) {
                    if (useheader) {
                        let o1=reference.getOrientationName();
                        let o2=target.getOrientationName();
                        if (o1!==o2) {
                            centeronrefonly=true;
                            console.log("oooo Creating orientation mapping transformation to initialize either linear or nonlinear mapping");
                            initial=xformutil.computeHeaderTransformation(reference,target,false);
                        }
                    }
                } else if (linearmode>=0) {
                    centeronrefonly=true;
                    console.log('oooo an actual initial transformation is specified, assume centeronrefonly=',centeronrefonly);
                }
                
                
                if (linearmode>=0) {

                    initial = biswrap.runLinearRegistrationWASM(reference, target, initial,{
                        'intscale' : parseInt(vals.intscale),
                        'numbins' : parseInt(vals.numbins),
                        'levels' : parseInt(vals.levels),
                        'centeronrefonly' : this.parseBoolean(centeronrefonly),
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
                        'return_vector' : false
                    },this.parseBoolean(vals.debug));
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
                
                if (vals.doreslice)  {
                    console.log('Reslicing');
                    this.outputs['resliced']=baseutils.resliceRegistrationOutput(biswrap,reference,target,this.outputs['output']);
                } else {
                    this.outputs['resliced']=null;
                }
                
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

}

module.exports = NonLinearRegistrationModule;
