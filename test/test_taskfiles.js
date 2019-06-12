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
const bis_bidsutils = require('bis_bidsutils.js');
const bis_genericio = require('bis_genericio.js');
const path = require('path');
const colors = require('colors/safe');
const assert = require('assert');

const jsonPath = path.resolve('./testdata/task.json');
const tsvPath = path.resolve('./testdata/tasks/task-sample_run-01_events.tsv');
const tsvDir = path.resolve('./testdata/tasks');

let errFn = (e, done) => {
    console.log(colors.red('---- An error occured while reading', jsonPath, e)); 
    done(e);
};

describe('Convert .json to .tsv', () => {

    it('Parses .json to .tsv', (done) => {
        bis_genericio.read(tsvPath).then( (obj) => {
            bis_bidsutils.parseTaskFileToTSV(jsonPath, null, false).then( (tsvData) => {
                console.log(colors.cyan(' ++++ tsv data parsed from', jsonPath, JSON.stringify(tsvData, null, 2)));
                assert.strictEqual(obj.data, tsvData.run1);
                done();
            }).catch( (e) => {
                errFn(e, done);
            });
        }).catch( (e) => {
            errFn(e, done);
        });
    });

    it('Parses .tsv to .json', (done) => {
        bis_genericio.read(jsonPath).then( (obj) => {
            bis_bidsutils.parseTaskFileFromTSV(tsvDir, null, 2, false).then( (jsonData) => {
               
                let stringifiedData = JSON.stringify(jsonData);
                console.log(colors.cyan(' ++++ json data parsed from tsv files in', tsvDir, JSON.stringify(jsonData, null, 2)));

                //remove spaces
                stringifiedData = stringifiedData.replace(/[ \t\n]/g, ''); 
                let despacedData = obj.data.replace(/[ \t\n]/g, '');
                
                assert.strictEqual(despacedData, stringifiedData);
                done();
            }).catch( (e) => {
                errFn(e, done);
            });
        }).catch( (e) => {
            errFn(e, done);
        });
    });
});