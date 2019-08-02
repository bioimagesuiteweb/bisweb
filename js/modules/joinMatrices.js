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

 const BaseModule = require('basemodule.js');
 const baseutils = require('baseutils.js');
 const BiswebMatrix = require('bisweb_matrix.js');

 /**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear). 
 */
class JoinMatricesModule extends BaseModule {
    constructor() {
        super();
        this.name = 'joinMatrices';
        this.useworker=true;
    }

    createDescription() {
        let des={
            "name": "Join Matrices",
            "description": "Takes two matrices and adds them either by row or columns.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs" : [
                {
                    'type': 'matrix',
                    'name': 'Matrix one',
                    'description': 'The first matrix',
                    'varname': 'matr1',
                    'shortname': 'm1',
                    'required': true,
                },
                {
                    'type': 'matrix',
                    'name': 'Matrix two',
                    'description': 'The second matrix',
                    'varname': 'matr2',
                    'shortname': 'm2',
                    'required': true,
                }
            ],
            "outputs" : baseutils.getMatrixToMatrixOutputs('The concatenated matrix'),
            "buttonName": "Run",
            "shortname" : "jmatr",
            "params" : [
                {
                    "name": "Addition Dimension",
                    "description": "Which dimension to add matrices in, either row or col, i.e. whether to increase the number of rows or the number of columns",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "string",
                    "varname": "dim",
                    "fields" : ["row", "col"],
                    "restrictAnswer" : ["row", "col", "rows", "cols", "none"],
                    "required" : false,
                    "default" : "none"
                },
            ]
        };
  
        return des;
    }

    directInvokeAlgorithm(vals) {

    return new Promise( (resolve, reject) => {
            
        console.log('oooo invoking: join matrices', JSON.stringify(vals),'\noooo'); 

        let matr1 = this.inputs['matr1'], matr2 = this.inputs['matr2'], outmatr; 
        let numericmatr1 = matr1.getNumericMatrix(),  numericmatr2 = matr2.getNumericMatrix(); 

        if (numericmatr1.length === 0 || numericmatr2.length === 0) {
            console.log('---- Error: One or more arrays specified are empty. Please double-check your inputs.');
            reject();
        }

        console.log('numeric matr 1', numericmatr1.length, numericmatr1[0].length, 'numeric matr 2', numericmatr2.length, numericmatr2[0].length);

        //Perform operation with user-defined dimension if possible, otherwise try to infer which operation to perform by array dimensions
        if (vals.dim === 'row' || vals.dim === 'rows') {
            if (numericmatr1[0].length === numericmatr2[0].length) {
                outmatr = addRows(numericmatr1, numericmatr2);
            } else {
                console.log('---- Error : matr1 and matr2 do not have the same number of columns, matr1 has', numericmatr1[0].length, 'matr2 has', numericmatr2[0].length);
                reject();
            }
        } else if (vals.dim === 'col' || vals.dim === 'cols') {
            if (numericmatr1.length === numericmatr2.length) {
                outmatr = addCols(numericmatr1, numericmatr2);
            } else {
                console.log('---- Error : matr1 and matr2 do not have the same number of rows, matr1 has', numericmatr1.length, 'matr2 has', numericmatr2.length);
                reject();
            }
        } else {
            if (numericmatr1[0].length === numericmatr2[0].length) {
                outmatr = addRows(numericmatr1, numericmatr2);
            } else if (numericmatr1.length === numericmatr2.length) {
                outmatr = addCols(numericmatr1, numericmatr2);
            } else {
                console.log('---- Error: Arrays have different numbers of both rows and columns, cannot join across any dimension, matr1 =', matr1.getDimensions(), 'matr2 =', matr2.getDimensions());
                reject();
            }
        }

        this.outputs['output'] = new BiswebMatrix('matrix', outmatr);
        resolve();
    });

    function addRows(m1, m2) {
        let concatMatrix = m1; 
        for (let i = 0; i < m2.length; i++) {
            concatMatrix.push(m2[i]);
        }

        return concatMatrix;
    }

    function addCols(m1, m2) {
        let concatMatrix = m1;

        for (let i = 0; i < m2.length; i++) {
            concatMatrix[i] = concatMatrix[i].concat(m2[i]);
        }

        return concatMatrix;
    }
}}

module.exports = JoinMatricesModule;
