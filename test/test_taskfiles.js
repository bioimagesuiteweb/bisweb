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
const fs = require('fs');
const path = require('path');
const colors = require('colors/safe');
const assert = require('assert');

const jsonPath = path.normalize('./testdata/tasks.json');
const tsvPath = path.normalize('./testdata/task_events.tsv');

let errFn = (e) => {
    console.log(colors.red('---- An error occured while reading', jsonPath, err)); 
    assert.equal(true, false);
};

describe('Convert .json to .tsv', () => {

    it('Parses .json to .tsv', (done) => {
        fs.readFile(jsonPath, (err, data) => {
            if (err) { errFn(e); }

            bis_bidsutils.parseTaskFileToTSV(jsonPath, null, false);
            
        });
    });
});