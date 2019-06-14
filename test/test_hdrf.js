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

/* jshint node:true */
/*global describe, it */

require('../config/bisweb_pathconfig.js');

const path = require('path');
const colors = require('colors/safe');
const assert = require('assert');

const bisweb_taskutils = require('bisweb_taskutils.js');
const bisweb_matrixutils = require('bisweb_matrixutils.js');

const BiswebMatrix = require('bisweb_matrix.js');
let glmDescriptionFilename = path.resolve('./testdata/hdrf/glm_description.json');
let glmMatrixNoHDRFFilename = path.resolve('./testdata/hdrf/glm_matr_no_HDRF.bismatr');
let glmMatrixHDRFFilename = path.resolve('./testdata/hdrf/glm_matr_HDRF.matr');


//Formats stringify to print arrays in a single line
let replacer = (k, v) => { 
    if (Array.isArray(v)) { return JSON.stringify(v); }
    return v;
};

describe('Parse .json file to HDRF matrix', () => {
    it ('Reads .json', (done) => {
        bisweb_taskutils.parseFile(glmDescriptionFilename).then( (data) => {
            console.log(colors.cyan(' +++ Parsed glm', JSON.stringify(data.runs, replacer, 2)));
            done();
        }).catch( (e) => { done(e); });
    });

    it ('Parses matrix', (done) => {
        bisweb_taskutils.parseFile(glmDescriptionFilename).then( (data) => {
            let matrixObj = bisweb_matrixutils.parseTaskMatrix(data.runs, data.taskNames);
            let sampleMatr = new BiswebMatrix();
            sampleMatr.load(glmMatrixNoHDRFFilename).then( () => {
                let result = matrixObj.matrix.compareWithOther(sampleMatr);
                assert.equal(result.testresult, true);
                done();
            });
        }).catch( (e) => { done(e); });
    });

    it ('Parses HDRF matrix', (done) => {
        bisweb_taskutils.parseFile(glmDescriptionFilename).then( (data) => {
            let tasks = data.formattedTasks, tr = data.tr, runs = data.runs, taskNames = data.taskNames;
            let taskMatrixInfo = bisweb_matrixutils.parseTaskMatrix(runs, taskNames);
            let stackedWaveform = bisweb_matrixutils.createStackedWaveform(taskMatrixInfo.matrix, tasks.length, tr, 2);
            let sampleMatr = new BiswebMatrix();

            sampleMatr.load(glmMatrixHDRFFilename).then( () => {
                let result = stackedWaveform.compareWithOther(sampleMatr);
                assert.equal(result.testresult, false);
                done();
            });
        }).catch( (e) => { done(e); });
    });
});