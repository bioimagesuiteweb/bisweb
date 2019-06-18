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
const genericio = require('bis_genericio.js');

/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear). 
 */
class MakeConnMatrixFileModule extends  BaseModule {
    constructor() {
        super();
        this.name = 'linearRegistration';
        this.useworker=true;
    }

    createDescription() {
        let des={
            "name": "Make Connectivity Matrix File",
            "description": "Reads a set of parameter files and connectivity matrices from a given directory, then combines them into a single file.",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs" : [],
            "outputs" : [],
            "buttonName": "Run",
            "shortname" : "mcmf",
            "params": [{
                "name": "Input directory",
                "description": "Directory containing all the relevant files",
                "priority": 1,
                "advanced": false,
                "gui": "text",
                "varname": "indir",
                "type": "string"
            }],
        };

        return des;
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: Make Connectivity Matrix File', JSON.stringify(vals),'\noooo'); 
        let indir = vals.indir;

        return new Promise( (resolve, reject) => {

        }).catch((e) => {
            reject(e.stack);
        });
    }

}

module.exports = MakeConnMatrixFileModule;