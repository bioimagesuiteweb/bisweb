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
 * Runs linear rpm registration on two surfaces. Applies only affine (linear) transformations.
 */
class LinearRegistrationModule extends  BaseModule {
    constructor() {
        super();
        this.name = 'linearPointRegistration';
        this.useworker=true;
    }

    createDescription() {
        let des={
            "name": "Linear RPM Registration",
            "description": "Computes a linear point registration between the reference point set and target point set. Returns a matrix transformation.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs" : baseutils.getSurfaceRegistrationInputs(),
            "outputs" : baseutils.getSurfaceRegistrationOutputs(),
            "buttonName": "Run",
            "shortname" : "lrpm",
            "slicer" : true,
            "params":   [
                {
                    "name": "Warp",
                    "description": "If true, also output a warped reference surface using the current transform",
                    "priority": 100,
                    "advanced": true,
                    "gui": "check",
                    "varname": "dowarp",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "NumLandmarks",
                    "description": "Maximum Number of Landmarks",
                    "priority": 10,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "numlandmarks",
                    "default": 1000,
                    "low": 100,
                    "high": 10000,
                },
                {
                    "name": "Init Temp",
                    "description": "Initial Temperature for RPM",
                    "priority": 4,
                    "advanced": false,
                    "type": "float",
                    "gui": "slider",
                    "varname": "initialtemp",
                    "default": 10.0,
                    "low":  0.1,
                    "high": 20.0,
                    "step" : 0.1,
                },
                {
                    "name": "Fin Temp",
                    "description": "Final Temperature for RPM",
                    "priority": 4,
                    "advanced": false,
                    "type": "float",
                    "gui": "slider",
                    "varname": "finaltemp",
                    "default": 3.0,
                    "low":  0.1,
                    "high": 20.0,
                    "step" : 0.1,
                },
                {
                    "name": "IterPerTemp",
                    "description": "Number of Iterations at Each Temperature",
                    "priority": 200,
                    "advanced": true,
                    "type": "int",
                    "gui": "slider",
                    "varname": "iterpertemp",
                    "default": 5,
                    "low":  1,
                    "high": 10,
                    "step" : 1,
                },
                {
                    "name": "Anneal Rate",
                    "description": "Anneal Rate",
                    "priority": 101,
                    "advanced": true,
                    "type": "float",
                    "gui": "slider",
                    "varname": "annealrate",
                    "default": 0.93,
                    "low":  0.5,
                    "high": 0.99,
                    "step" : 0.01,
                },
                {
                    "name": "MatchMode",
                    "description": "Match Mode",
                    "priority": 7,
                    "advanced": true,
                    "gui": "dropdown",
                    "type": "string",
                    "fields": ["ICP", "Mixture", "RPM"],
                    "restrictAnswer": ["ICP", "Mixture", "RPM"],
                    "varname": "matchmode",
                    "default": "RPM"
                },
                {
                    "name": "Mode",
                    "description": "Transformation Mode",
                    "priority": 8,
                    "advanced": true,
                    "gui": "dropdown",
                    "type": "string",
                    "fields": ["Rigid", "Similarity", "Affine"],
                    "restrictAnswer": ["Rigid", "Similarity", "Affine"],
                    "varname": "mode",
                    "default": "Affine"
                },
                baseutils.getDebugParam()
            ]
        };
        return des;
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: linearPointRegistration', JSON.stringify(vals),'\noooo'); 
        let target = this.inputs['target'];
        let reference = this.inputs['reference'];
        let initial = this.inputs['initial'] || 0;

        if (genericio.getenvironment()!=='node') {
            vals.dowarp=true;
        }

        let transmode=2;
        if (vals['mode']==='Rigid')
            transmode=0;
        else if (vals['mode']==='Similarity')
            transmode=1;

        let matchmode=1;
        if (vals['matchmode']==='ICP')
            matchmode=0;
        if (vals['matchmode']==='RPM')
            matchmode=2;

        console.log('Reference=',reference.getPoints().getDescription());
        console.log('Target=',target.getPoints().getDescription());
        
        return new Promise( (resolve, reject) => {
            biswrap.initialize().then( () => {
                
                let matr = biswrap.runLinearRPMRegistrationWASM(reference.getPoints(),
                                                                target.getPoints(),
                                                                initial,
                                                                reference.getPointData() || 0,
                                                                target.getPointData() || 0,
                                                                {
                    'numLandmarks' : parseInt(vals.numlandmarks),
                    'initialTemperature' : parseFloat(vals.initialtemp),
                    'finalTemperature' : parseFloat(vals.finaltemp),
                    'iterPerTemp': parseInt(vals.iterpertemp),
                    'annealRate' : parseFloat(vals.annealrate),
                    'prefSampling' : 1,
                    'transformMode' : transmode,
                    'correspondenceMode' : matchmode,
                    'useCentroids' : 1
                }, super.parseBoolean(vals.debug));
                this.outputs['output'] = matr;
                
                if (super.parseBoolean(vals.dowarp)) {
                    this.outputs['warped']=biswrap.transformSurfaceWASM(reference,this.outputs['output']);
                    console.log('Warped=',this.outputs['warped'].getDescription());
                } else {
                    this.outputs['warped']=null;
                }
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
}

module.exports = LinearRegistrationModule;
