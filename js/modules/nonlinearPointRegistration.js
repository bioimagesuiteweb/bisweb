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
class nonLinearRegistrationModule extends  BaseModule {
    constructor() {
        super();
        this.name = 'nonLinearPointRegistration';
        this.useworker=true;
    }

    createDescription() {
        let des={
            "name": "nonLinear RPM Registration",
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
                    "name": "Init cps",
                    "description": "Initial control point spacing",
                    "priority": 8,
                    "advanced": false,
                    "type": "float",
                    "gui": "slider",
                    "varname": "initialcps",
                    "default": 40.0,
                    "low":  1.0,
                    "high": 80.0,
                    "step" : 1.0,
                },
                {
                    "name": "Final cps",
                    "description": "Final control point spacing",
                    "priority": 9,
                    "advanced": false,
                    "type": "float",
                    "gui": "slider",
                    "varname": "finalcps",
                    "default": 20.0,
                    "low":  0.5,
                    "high": 80.0,
                    "step" : 0.5,
                },
                {
                    "name": "Init smoothness",
                    "description": "Initial Smoothness",
                    "priority": 10,
                    "advanced": false,
                    "type": "float",
                    "gui": "slider",
                    "varname": "initialsmoothness",
                    "default": 1.0,
                    "low":  0.01,
                    "high":  5.0,
                    "step" : 0.01,
                },
                {
                    "name": "Final smoothness",
                    "description": "Final Smoothness",
                    "priority": 11,
                    "advanced": false,
                    "type": "float",
                    "gui": "slider",
                    "varname": "finalsmoothness",
                    "default": 0.1,
                    "low":  0.01,
                    "high": 5.0,
                    "step" : 0.01,
                },
                {
                    "name": "LinMode",
                    "description": "Linear Mode",
                    "priority": 0,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "string",
                    "fields": [ "None", "Rigid", "Similarity", "Affine"],
                    "restrictAnswer": [ "None", "Rigid", "Similarity", "Affine"],
                    "varname": "linmode",
                    "default": "Affine"
                },
                baseutils.getDebugParam()
            ]
        };
        return des;
    }

    async directInvokeAlgorithm(vals) {

        console.log('oooo invoking: nonLinearPointRegistration', JSON.stringify(vals),'\noooo'); 
        let target = this.inputs['target'];
        let reference = this.inputs['reference'];
        let initial = this.inputs['initial'] || 0;

        if (genericio.getenvironment()!=='node') {
            vals.dowarp=true;
            vals.debug=true;
        }

        let linmode=-1;
        if (vals['linmode']==='Rigid')
            linmode=0;
        else if (vals['linmode']==='Similarity')
            linmode=1;
        else if (vals['linmode']!=='None')
            linmode=2;

        let matchmode=1;
        if (vals['matchmode']==='ICP')
            matchmode=0;
        if (vals['matchmode']==='RPM')
            matchmode=2;

        console.log('Reference=',reference.getPoints().getDescription());
        console.log('Target=',target.getPoints().getDescription());

        try {
            await biswrap.initialize();
        } catch(e) {
            return Promise.reject(e);
        }

        let linear=0;
        if (linmode >=0 ) {
            linear = biswrap.runLinearRPMRegistrationWASM(reference.getPoints(),
                                                          target.getPoints(),
                                                          initial,
                                                          reference.getPointData() || 0,
                                                          target.getPointData() || 0,
                                                          {
                                                              'numLandmarks' : Math.round(parseInt(vals.numlandmarks)*0.5),
                                                              'initialTemperature' : parseFloat(vals.initialtemp)*2.0,
                                                              'finalTemperature' : parseFloat(vals.finaltemp)*2.0,
                                                              'iterPerTemp': parseInt(vals.iterpertemp),
                                                              'annealRate' : parseFloat(vals.annealrate),
                                                              'prefSampling' : 1,
                                                              'transformMode' : linmode,
                                                              'correspondenceMode' : matchmode,
                                                              'useCentroids' : 1
                                                               }, super.parseBoolean(vals.debug));
        }

        this.outputs['output'] = biswrap.runNonLinearRPMRegistrationWASM(reference.getPoints(),
                                                                         target.getPoints(),
                                                                         linear,
                                                                         reference.getPointData() || 0,
                                                                         target.getPointData() || 0,
                                                                         {
                                                                             'numLandmarks' : parseInt(vals.numlandmarks),
                                                                             'initialTemperature' : parseFloat(vals.initialtemp),
                                                                             'finalTemperature' : parseFloat(vals.finaltemp),
                                                                             'iterPerTemp': parseInt(vals.iterpertemp),
                                                                             'annealRate' : parseFloat(vals.annealrate),
                                                                             'prefSampling' : 1,
                                                                             'correspondenceMode' : matchmode,
                                                                             'cpsbegin': parseFloat(vals.initialcps),
                                                                             'cpsend': parseFloat(vals.finalcps),
                                                                             'smoothnessbegin': parseFloat(vals.initialsmoothness),
                                                                             'smoothnessend': parseFloat(vals.finalsmoothness)
                                                                         }, super.parseBoolean(vals.debug));
        
                
        if (super.parseBoolean(vals.dowarp)) {
            this.outputs['warped']=biswrap.transformSurfaceWASM(reference,this.outputs['output']);
            console.log('Warped=',this.outputs['warped'].getDescription());
        } else {
            this.outputs['warped']=null;
        }

        return Promise.resolve('Done with nonlinear point registration');
    }

}

module.exports = nonLinearRegistrationModule;
