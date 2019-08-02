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
const BisWebMatrix = require('bisweb_matrix.js');
const baseutils=require("baseutils");

// Three Matrix to Matrix 
// Input + + Weights --> Output = Input Drift Corrected


class DriftCorrectImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'driftCorrectImage';
    }

    createDescription() {
        let des={
            "name": "Drift Correct Image" ,
            "description": "Drift Corrects an Image by fitting and removing a polynomial to each voxel time series separately.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs":  baseutils.getImageToImageOutputs(),
            "buttonName": "Drift Correct",
            "shortname" : "drift",
            "slicer" : true,
            "params": [
                {
                    "name": "Order",
                    "description": "Which type of drift correction to use (3 = cubic, 2=quadratic, 1 = linear, 0 = remove-mean)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "order",
                    "type": "int",
                    "default" : 3,
                    "low" : 0,
                    "high" : 3
                },
                baseutils.getDebugParam()
            ],
        };

        des.inputs.push({
            'type': 'vector',
            'name': 'Weights',
            'description': '(Optional). The framewise weight vector',
            'varname': 'weight',
            'shortname': 'w',
            'required': false,
        });
        
        return des;
    }

    polynomial(t,power) {

        if (power<0)
            power=0;
        else if (power>6)
            power=6;
        
        if (power===0) 
            return 1.0;


        if (power===1)
            return t;

        if (power===2)
            return 1.5*t*t-0.5;

        //case 3: // P_3(x) =0.5*(5x^3-3x)
        return 2.5*t*t*t-1.5*t;
    }

    computeTime(col, numframes) {
        if ((numframes-1)<0.00001)
            return (col)-(numframes-1)*0.5;

        return ((col)-(numframes-1)*0.5)/((numframes-1)*0.5);
    }

    
    createRegressor(image,order) {

        let numframes=image.getDimensions()[3];
        let mat=new BisWebMatrix();
        console.log('oooo Create Drift Correction Regressor Order=',order,'num columns=',order+1);
        mat.zero(numframes,order+1);
        for (let i=0;i<numframes;i++) {
            let t=this.computeTime(i,numframes);
            for (let j=0;j<=order;j++) {
                mat.setElement(i,j,this.polynomial(t,j));
            }
        }
        return mat;
    }

        
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: driftCorrectImage with vals', JSON.stringify(vals));
        return new Promise((resolve, reject) => {
            let input = this.inputs['input'];
            vals.order=parseInt(vals.order);
            let regressor = this.createRegressor(input,vals.order);
            let weight = this.inputs['weight'] || 0;
            
            biswrap.initialize().then(() => {
                this.outputs['output'] = biswrap.weightedRegressOutImageWASM(input, regressor, weight, super.parseBoolean(vals.debug));
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

}

module.exports = DriftCorrectImageModule;
