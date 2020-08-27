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
 * Applies cluster thresholding to an image and returns the thresholded image. 
 * 
 * Cluster thresholding separates a brain image into regions of activation, i.e. it parses the brain into regions
 * activating at roughly the same strength (specified by 'Threshold'). Other parameters to consider include cluster size,
 * which controls the maximum cluster size, and whether the clustering algorithm should consider diagonally adjacent voxels
 * to be neighbors to a given voxel in addition to the 6 voxels connected by an entire side.
 */
class ClusterThresholdModule extends BaseModule {
    constructor() {
        super();
        this.name = 'clusterThreshold';
        this.lastInputRange=[0,0];
    }

    createDescription() {
        return {
            "name": "Cluster Threshold",
            "description": "This element will separate an image into clusters and apply binary thresholding. The image is first thresholded using a threshold. Then it is filtered to remove binary blobs that smaller than the cluster size selected.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0", 
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs('The output image','viewer1','overlay'),
            "buttonName": "Threshold",
            "shortname" : "thr",
            "slicer" : true,
            "params": [
                {
                    "name": "Threshold",
                    "description": "The value to threshold at (zero out voxels below threshold)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "threshold",
                    "default" : 1.0,
                },
                {
                    "name": "Cluster Size",
                    "description": "Size of clusters to form",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "size",
                    "default": 1000,
                    "low" : 2,
                    "high" : 1000000,
                },
                {
                    "name": "One Connected",
                    "description": "Whether to use 6 or 26 neighbors",
                    "priority": 3,
                    "advanced": true,
                    "gui": "check",
                    "type": "bool",
                    "varname": "oneconnected",
                    "default": true,
                },
                {
                    "name": "Keep Largest Only",
                    "description": "If true return only largest cluster",
                    "priority": 30,
                    "advanced": true,
                    "gui": "check",
                    "type": "bool",
                    "varname": "keeplargest",
                    "default": false,
                },
                {
                    "name": "Frame",
                    "description": "Which frame from the time series to cluster (fourth dimension)",
                    "priority": 4,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "frame",
                    "default": 0,
                },
                {
                    "name": "Component",
                    "description": "Which component to take a frame from (fifth dimension)",
                    "priority": 5,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "component",
                    "default": 0,
                },
                {
                    "name": "OutputClusterNo",
                    "description": "It true the output image is filled with the cluster number instead of the actual image values",
                    "priority": 20,
                    "advanced": false,
                    "gui": "check",
                    "varname": "outclustno",
                    "type": 'boolean',
                    "default" : false,
                },
                baseutils.getDebugParam()
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: clusterThresholdImage with vals', JSON.stringify(vals));
        let input = this.inputs['input'];

        console.log('\n ClusterThreshold\n--------------------\ncurrent=',input.getDescription());

        let keeplargest=super.parseBoolean(vals.keeplargest);
        let sz=parseInt(vals.size);
        if (keeplargest)
            sz=-1;
        
        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.clusterThresholdImageWASM(input, {
                    "threshold": parseFloat(vals.threshold),
                    "clustersize": sz,
                    "oneconnected" : super.parseBoolean(vals.oneconnected),
                    "outputclusterno" : super.parseBoolean(vals.outclustno),
                    "frame" : parseInt(vals.frame), 
                    "component" : parseInt(vals.component),
                    "datatype" : -1
                }, vals.debug);

                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }


    updateOnChangedInput(inputs,guiVars=null) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let current_input = inputs['input'] || null;
        if (current_input===null)
            return newDes;

        
        let dim = current_input.getDimensions();
        let imagerange = current_input.getIntensityRange();

        if (this.compareArrays(imagerange,this.lastInputRange,0,1)<1.0) {
            return;
        }
        this.lastInputRange=imagerange;

        let maxv=Math.max(Math.abs(imagerange[0]),Math.abs(imagerange[1]));
        
        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            if (name === 'threshold' || name ==='frame' || name ==='component' || name==='size') {
                if(name === 'threshold' ) {
                    newDes.params[i].low = 0.01*maxv;
                    newDes.params[i].high = maxv;
                    newDes.params[i].default = 0.5 * maxv;
                } else if (name==='frame') {
                    newDes.params[i].low = 0;
                    newDes.params[i].high = dim[3]-1;
                    newDes.params[i].default = 0;
                } else if (name === 'component') {
                    newDes.params[i].low = 0;
                    newDes.params[i].high = dim[4]-1;
                    newDes.params[i].default = 1;
                } else if (name === 'size') {
                    newDes.params[i].low=5;
                    newDes.params[i].high=Math.round(dim[0]*dim[1]*dim[2]*0.001);
                    newDes.params[i].default=100;
                }
                
                if (guiVars)
                    guiVars[name]=newDes.params[i].default;
            }
        }
        this.recreateGUI=true;
        return newDes;
    }
    
}

module.exports = ClusterThresholdModule;
