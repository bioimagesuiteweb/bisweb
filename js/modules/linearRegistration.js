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

/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear). 
 */
class LinearRegistrationModule extends  BaseModule {
    constructor() {
        super();
        this.name = 'linearRegistration';
        this.useworker=true;
    }

    createDescription() {
        let des={
            "name": "Linear Registration",
            "description": "Computes a linear registration between the reference image and target image. Returns a matrix transformation.",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs" : baseutils.getRegistrationInputs(),
            "outputs" : baseutils.getRegistrationOutputs(),
            "buttonName": "Run",
            "shortname" : "lrg",
            "params": baseutils.getRegistrationParams(),
        };

        des.params.push(baseutils.getLinearMode("mode"));
        return des;
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: linearRegistration', JSON.stringify(vals)); 
        let target = this.inputs['target'];
        let reference = this.inputs['reference'];
        let transform = this.inputs['initial'] || 0;

        if (genericio.getenvironment()!=='node') {
            vals.doreslice=true;
            vals.debug=true;
        }
        
        return new Promise( (resolve, reject) => {
            biswrap.initialize().then( () => {
                let matr = biswrap.runLinearRegistrationWASM(reference, target, transform, {
                    'intscale' : parseInt(vals.intscale),
                    'numbins' : parseInt(vals.numbins),
                    'levels' : parseInt(vals.levels),
                    'smoothing' : parseFloat(vals.extrasmoothing),
                    'optimization' : baseutils.getOptimizationCode(vals.optimization),
                    'stepsize' : parseFloat(vals.stepsize),
                    'metric' : baseutils.getMetricCode(vals.metric),
                    'steps' : parseInt(vals.steps),
                    'iterations' : parseInt(vals.iterations),
                    'mode' : baseutils.getLinearModeCode(vals.mode), 
                    'resolution' : parseFloat(vals.resolution),
                    'normalize' : this.parseBoolean(vals.norm),
                    'debug' : this.parseBoolean(vals.debug),
                    'return_vector' : true}, this.parseBoolean(vals.debug));
                
                this.outputs['output'] = matr;
                
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

module.exports = LinearRegistrationModule;
