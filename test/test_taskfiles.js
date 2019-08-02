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

const jsonPath = path.normalize(path.resolve('./testdata/tasks/task.json'));
const tsvPath = path.normalize(path.resolve('./testdata/tasks/task-sample_run-01_events.tsv'));
const tsvDir = path.normalize(path.resolve('./testdata/tasks'));

const jsonPath2 = path.normalize(path.resolve('./testdata/tasks2/dualtask.json'));
const tsvDir2 = path.normalize(path.resolve('./testdata/tasks2'));

const tsvPath2_1 = path.normalize(path.resolve('./testdata/tasks2/task-sample_run-01_events.tsv'));
const tsvPath2_2 = path.normalize(path.resolve('./testdata/tasks2/task-sample_run-02_events.tsv'));

/** Comments

   JSON File 10-11 means
   
   if seconds 10, durations=1.0
   if frames  10-0.5TR, 11+0.5*TR
*/

let errFn = (e) => {
    console.log(colors.red('---- An error occured while reading', e)); 
};

let cleanRow=function(line) {
    return line.trim().replace(/\t/g,'').replace(/ +/g,'').replace(/ /g,'').replace(/\n/g,'').replace(/\r/g,'').replace(/\[/g,'').replace(/\]/g,'');
};


describe('Convert .json to .tsv', () => {

    it('Parses .json to .tsv', async () => {
        try {
            let sampleTsvData = await bis_genericio.read(tsvPath);
            let parsedTsvData = await bis_bidsutils.convertTASKFileToTSV(jsonPath, null, false);

            console.log(colors.cyan(' ++++ tsv data parsed from', jsonPath, JSON.stringify(parsedTsvData, null, 2)));
    
            sampleTsvData = cleanRow(sampleTsvData.data);
            parsedTsvData = cleanRow(parsedTsvData.run1);
            assert.strictEqual(parsedTsvData, sampleTsvData);
            console.log('-------------------------------------');
            return Promise.resolve();
        } catch(e) {
            errFn(e);
            return Promise.reject(e);
        }
       
    });

    it('Parses .tsv to .json', async () => {
        try {
            let sampleJsonData = await bis_genericio.read(jsonPath);
            let parsedJsonData = await bis_bidsutils.parseTaskFileFromTSV(tsvDir, null, false);

            console.log(colors.cyan(' ++++ json data parsed from', tsvDir, JSON.stringify(parsedJsonData, null, 2)));

            //remove spaces and brackets (data on disk may have brackets that parsed data won't)
            parsedJsonData = cleanRow(JSON.stringify(parsedJsonData));
            sampleJsonData = cleanRow(sampleJsonData.data);

            assert.strictEqual(parsedJsonData, sampleJsonData);
            console.log('-------------------------------------');
            return Promise.resolve();
        } catch (e) {
            errFn(e);
            return Promise.reject(e);
        }

    });

    it('Parses .tsv  x2 to .json', async () => {
        try {
            let sampleJsonData = await bis_genericio.read(jsonPath2);
            let parsedJsonData = await bis_bidsutils.parseTaskFileFromTSV(tsvDir2, null, false);
                
            console.log(colors.cyan(' ++++ json data parsed from', tsvDir2, JSON.stringify(parsedJsonData, null, 2)));
            
            parsedJsonData = cleanRow(JSON.stringify(parsedJsonData));
            sampleJsonData = cleanRow(sampleJsonData.data);
            
            assert.strictEqual(parsedJsonData, sampleJsonData);
            console.log('-------------------------------------');
            return Promise.resolve();
        } catch(e) {
            errFn(e);
            return Promise.reject(e);
        }
        
    });

    it('Parses .json to .tsv x2 ', async () => {
        try {
            let sampleTsvData1 = (await bis_genericio.read(tsvPath2_1)).data;
            let sampleTsvData2 = (await bis_genericio.read(tsvPath2_2)).data;
    
            let parsedTsvData = await bis_bidsutils.convertTASKFileToTSV(jsonPath2, null, false);
    
            console.log(colors.cyan(' ++++ json data parsed from', tsvPath2_1, 'and', tsvPath2_2, JSON.stringify(parsedTsvData, null, 2)));
            parsedTsvData.run1 = cleanRow(parsedTsvData.run1);
            parsedTsvData.run2 = cleanRow(parsedTsvData.run2);
            sampleTsvData1 = cleanRow(sampleTsvData1);
            sampleTsvData2 = cleanRow(sampleTsvData2);
    
            let eq1 = (sampleTsvData1 === parsedTsvData.run1);
            let eq2 = (sampleTsvData2 === parsedTsvData.run2);
    
            let equal = eq1 && eq2;
            assert.strictEqual(equal,true);
            return Promise.resolve();
        } catch(e) {
            errFn(e);
            return Promise.reject();
        }
    });
});
