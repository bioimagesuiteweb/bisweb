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
const BisWebMatrix = require('bisweb_matrix.js');

/**
 * Computes functional Connectivity Preprocessing
 */
class functionalConnectivityPreprocessingModule extends BaseModule {
    constructor() {
        super();
        this.name = 'funcConnectivityPreprocessing';

    }

    createDescription() {
        let des={
            "name": "functional Preprocessing",
            "description": "Takes an input time series and ROI map and Nuisance Map and Motion Matrix and Filter Matrix and returns a clean time series  matrix",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Calculate",
            "shortname" : "conn",
            "inputs" : [
                {
                    'type': 'image',
                    'name': 'Input Time series Image',
                    'description': 'The image to compute on',
                    'varname': 'input',
                    'shortname': 'i',
                    'required': true,
                    'guiviewerinput' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type': 'image',
                    'name': 'Parcellation',
                    'description': 'The parcellation image',
                    'varname': 'parcellation',
                    'shortname': 'p',
                    'required': true,
                    'guiviewertype' : 'overlay',
                    'guiviewer'  : 'viewer1',
                    'colortype'  : 'Orange'
                },
                {
                    'type': 'image',
                    'name': 'Nuisance Mask',
                    'description': 'The nuisance mask',
                    'varname': 'nuisance',
                    'shortname': 'n',
                    'guiviewertype' : 'overlay',
                    'guiviewer'  : 'viewer1',
                    'colortype'  : 'Red',
                    'required': false,
                },
                {
                    'type': 'matrix',
                    'name': 'Motion',
                    'description': 'The motion regressor matrix',
                    'varname': 'motion',
                    'shortname': 'm',
                    'required': false,
                },
                {
                    'type': 'vector',
                    'name': 'Weights',
                    'description': '(Optional). The framewise weight vector',
                    'varname': 'weight',
                    'shortname': 'w',
                    'required': false,
                },
            ],
            outputs : [
                {
                    'type': 'matrix',
                    'name': 'Filtered Matrix',
                    'description': 'The final filtered timeseries matrix',
                    'varname': 'output',
                    'shortname': 'f',
                    'extension' : '.matr'
                },
            ],
            "params": [
                {
                    "name": "Low Frequency",
                    "description": "Lowpass cutoff frequency of filter (in Hertz)",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "low",
                    "low": 0.0,
                    "high": 10.0,
                    "default": 0.1,
                },
                {
                    "name": "High Frequency",
                    "description": "Highpass cutoff frequency of filter (in Hertz)",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "high",
                    "low": 0.0,
                    "high": 10.0,
                    "default": 0.01,
                },
                                {
                    "name": "Sample Rate",
                    "description": "Data time of repetition (Data TR)",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "tr",
                    "default" : 1.0,
                    "low" : 0.01,
                    "high" : 5.0
                },
                {
                    "name": "Remove Global Signal",
                    "description": "Determines whether global signal is removed",
                    "priority": 7,
                    "advanced": true,
                    "gui": "check",
                    "varname": "globalsignal",
                    "type": 'boolean',
                    "default": true,
                },

                baseutils.getDebugParam()
            ]
        };
        
        
        return des;
    }


    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: computefunctionalCOnnectivityPreprocessing with values', JSON.stringify(vals));
        
        let input = this.inputs['input'];
        let parcellation=this.inputs['parcellation'];
        let weightVector = this.inputs['weight'] || 0;
        let nuisance=this.inputs['nuisance'] || 0;
        let motion=this.inputs['motion'] || 0;
        let debug=super.parseBoolean(vals.debug);

        return new Promise((resolve, reject) => {
            
            // Check ranges etc
            if (!input.hasSameSizeAndOrientation(parcellation,0.01,true)) 
                reject('Parcellation and Image have different dimensions');
            
            if (nuisance!==0) {
                if (!input.hasSameSizeAndOrientation(nuisance,0.01,true)) 
                    reject('Nuisance parcellation and Image have different dimensions');
            }

            let numframes=input.getDimensions()[3];
            
                if (weightVector!==0) {
                    let r=weightVector.getDimensions()[0];
                    if (r!==numframes) {
                        reject('Weight vector does not have the same number of rows as timeseries frames');
                    }
                }

                if (motion!==0) {
                    let r=motion.getDimensions()[0];
                    if (r!==numframes) {
                        reject('Motion matrix does not have the same number of rows as timeseries frames');
                    }
                }
            
            biswrap.initialize().then(() => {

                let original = { };

                // -------------------------- ROI Analyses ------------------------------------------------
                
                console.log('oooo ROI analysis on parcellation');
                original.signal = biswrap.computeROIWASM(input, parcellation, debug);

                if (vals.globalsignal) {
                    console.log('oooo Thresholding to create gray matter mask');
                    let graymatter= biswrap.thresholdImageWASM(input, {
                        "low": 1,
                        "high": 10000,
                        "replacein" : true,
                        "replaceout" : true,
                        "invalue" : 1,
                        "outvalue" : 0,
                    },debug);
                    
                    console.log('oooo ROI analysis on gray matter (global signal)');
                    original.global = biswrap.computeROIWASM(input, graymatter, debug);
                }
                
                if (nuisance) {
                    console.log('oooo ROI analysis on nuisance mask (e.g. white/csf)');
                    original.badsignal = biswrap.computeROIWASM(input, nuisance, debug);
                }


                // -------------------------- Butterworth Filtering ------------------------------------------------
                
                if (motion)
                    original.motion = motion;

                let filtered={};
                let keys=Object.keys(original);
                for (let i=0;i<keys.length;i++) {
                    let name=keys[i];
                    console.log('oooo Butterworth Filtering ',name);
                    let lowpasstmp = biswrap.butterworthFilterWASM(original[name], {
                        "type": "low",
                        "cutoff": parseFloat(vals.low),
                        "samplerate": parseFloat(vals.tr)
                    }, debug);

                    filtered[name] = biswrap.butterworthFilterWASM(lowpasstmp, {
                        "type": "high",
                        "cutoff": parseFloat(vals.high),
                        "samplerate": parseFloat(vals.tr)
                    }, debug);
                }

                // ------------------- Next combine nuisance matrices and regress all ----------------------------
                let regressor=this.combineMatrices(filtered,numframes,'signal');
                this.outputs['output'] = biswrap.weightedRegressOutWASM(filtered['signal'], regressor, weightVector, debug);

                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

    combineMatrices(filtered,numframes,exclude='signal') {

        let keys=Object.keys(filtered);
        console.log('Combining regressor matrices');
        let dimensions=[numframes,0];
        
        for (let i=0;i<keys.length;i++) {
            let name=keys[i];
            if (name!==exclude) {
                let d=filtered[name].getDimensions();
                console.log('oooo combining, filtered matrix', name,' = ',d.join(','));
                dimensions[1]=dimensions[1]+d[1];
            }
        }

        let cols=dimensions[1];
        
        console.log('oooo combined dimensions=', name,' = ',dimensions.join(','));
        let regressor=new BisWebMatrix();
        regressor.allocate(dimensions[0],dimensions[1],0.0);
        let data=regressor.getDataArray();
        let begincol=0;
                
        for (let i=0;i<keys.length;i++) {
            let name=keys[i];
            if (name!=="signal") {
                let numcols=filtered[name].getDimensions()[1];
                let partdata=filtered[name].getDataArray();
                console.log('oooo combining, filtered matrix', name,', numcols=',cols, ' beginning at',begincol);
                for (let row=0;row<numframes;row++) {
                    let offset=row*dimensions[1];
                    for (let col=0;col<numcols;col++) {
                        data[offset+col+begincol]=partdata[offset+col];
                    }
                }
                begincol=begincol+numcols;
            }
        }
        return regressor;
    }
}

module.exports = functionalConnectivityPreprocessingModule;
