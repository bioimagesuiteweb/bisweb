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
const fmrimatrix   =require('bis_fmrimatrixconnectivity');
const BisWebMatrix   =require('bisweb_matrix');

/**
 * Takes an input time series and object map detailing regions of interest (ROIs) and returns the mean activation for the region.
 */
class ComputeROIModule extends BaseModule {
    constructor() {
        super();
        this.name = 'computeROI';

    }

    createDescription() {
        let des={
            "name": "Compute ROI",
            "description": "Takes an input time series and ROI map and returns the mean intensity in the roi as a matrix of frames(rows)*roiindex(columns)",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('Load the image (time series) to be averaged into regions'),
            "outputs":  baseutils.getMatrixToMatrixOutputs(),
            "buttonName": "Calculate",
            "shortname" : "roi",
            "params": [
                {
                    "name": "Store Centroids?",
                    "description": "If true store the centroid of each roi as last three columns",
                    "priority": 7,
                    "advanced": false,
                    "gui": "check",
                    "varname": "storecentroids",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Output Volumes instead",
                    "description": "If true output the volumes of the vois instead of the mean value",
                    "priority": 8,
                    "advanced": false,
                    "gui": "check",
                    "varname": "storevolume",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "UseJS",
                    "description": "Use the pure JS implementation of the algorithm",
                    "priority": 28,
                    "advanced": true,
                    "gui": "check",
                    "varname": "usejs",
                    "type": 'boolean',
                    "default": false,
                    "jsonly" : true,
                },
                baseutils.getDebugParam()
            ]
        };
        des.inputs.push({
            'type': 'image',
            'name': 'Load Regions of Interest',
            'description': 'parcellation/regions of interest to compute signal averages for',
            'varname': 'roi',
            'shortname' : 'r'
        });
        
        return des;
    }


    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: computeROI with values', JSON.stringify(vals));

        let input = this.inputs['input'];
        
        if (!input.hasSameOrientation(this.inputs['roi'],'input image','roi image',true))
            return Promise.reject('Failed');

        const storevolume=super.parseBoolean(vals.storevolume);
        console.log('Store volume=',storevolume);

        if (super.parseBoolean(vals.usejs) || storevolume) {
            console.log('____ Using the JS Implementation of computeROI');
            let out=fmrimatrix.roimean(input,this.inputs['roi']);

            this.outputs['output']=new BisWebMatrix();
            try {
                if (storevolume)
                    this.outputs['output'].setFromNumericMatrix(out['numvoxels']);
                else
                    this.outputs['output'].setFromNumericMatrix(out['means']);
            } catch(e) {
                console.log(e);
            }
            return Promise.resolve('done');
        }
        
        return new Promise((resolve, reject) => {

            biswrap.initialize().then(() => {
                let store=super.parseBoolean(vals.storecentroids);

                try {
                    this.outputs['output'] = biswrap.computeROIWASM(input, this.inputs['roi'],
                                                                    { 'storecentroids' : store },
                                                                    super.parseBoolean(vals.debug));
                } catch(e) {
                    reject(e);
                    return;
                }
                
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }
}

module.exports = ComputeROIModule;
