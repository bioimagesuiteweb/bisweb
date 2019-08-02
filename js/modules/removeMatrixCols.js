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
class RemoveMatrixCols extends BaseModule {
    constructor() {
        super();
        this.name = 'joinMatrices';
        this.useworker=true;
    }

    createDescription() {
        let des={
            "name": "Remove Matrix Columns",
            "description": "Takes a matrix and removes a number of rows.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs" : baseutils.getMatrixToMatrixInputs(false, 'The matrix to remove columns from'),
            "outputs" : baseutils.getMatrixToMatrixOutputs('The matrix without the chosen columns'),
            "buttonName": "Run",
            "shortname" : "jmatr",
            "params" : [
                {
                    "name": "Removed Columns",
                    "description": "The columns to remove formatted as a series of numbers separated by commas, e.g. 1,2,3. The first row should be 1, the second 2, etc.",
                    "priority": 1,
                    "advanced": false,
                    "gui": "text",
                    "type": "string",
                    "varname": "cols",
                    "required" : true
                },
            ]
        };
  
        return des;
    }

    directInvokeAlgorithm(vals) {

        return new Promise( (resolve, reject) => {
            
            try {
                console.log('oooo invoking: removeMatrixCols', JSON.stringify(vals), '\noooo');
                let inputMatr = this.inputs['input'].getNumericMatrix(), cols = vals.cols;
    
                console.log('input matr', this.inputs['input'].getDimensions(), 'cols', cols);
                
                let splitCols = cols.split(',');
                for (let i = 0; i < splitCols.length; i++) { splitCols[i] = parseInt(splitCols[i]) - 1; }
                
                if (!splitCols.every( (num) => { return num >= 0; })) {
                    reject(' Error: cannot remove column 0 or less. Please ensure that lowest column in your matrix is indexed by 1.');
                }

                for (let i = 0; i < inputMatr.length; i++) {
                    let newCol = [];
                    for (let j = 0; j < inputMatr[i].length; j++) {
                        if (!splitCols.includes(j)) {
                            newCol.push(inputMatr[i][j]);
                        }
                    }
                    inputMatr[i] = newCol;
                }
    
                let outputMatr = new BiswebMatrix(null, inputMatr);
                this.outputs['output'] = outputMatr;
            } catch(e) {
                reject(e.stack);
            }
           
            resolve();
        });
    }
}

module.exports = RemoveMatrixCols;
