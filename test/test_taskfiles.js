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


let errFn = (e, done) => {
    console.log(colors.red('---- An error occured while reading', e)); 
    done(e);
};

let cleanRow=function(line) {
    return line.trim().replace(/\t/g,' ').replace(/ +/g,' ').replace(/ /g,',').replace(/\n/g,';').replace(/\r/g,'');
};


describe('Convert .json to .tsv', () => {

    it('Parses .json to .tsv', (done) => {
        bis_genericio.read(tsvPath).then( (obj) => {
            bis_bidsutils.parseTaskFileToTSV(jsonPath, null, false).then( (tsvData) => {
                console.log(colors.cyan(' ++++ tsv data parsed from', jsonPath, JSON.stringify(tsvData, null, 2)));

                obj.data=cleanRow(obj.data);
                tsvData.run1=cleanRow(tsvData.run1);
                assert.strictEqual(obj.data, tsvData.run1);
                console.log('-------------------------------------');
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

                console.log('jsonData=',jsonData);
               
                let stringifiedData = JSON.stringify(jsonData);
                console.log(colors.cyan(' ++++ json data parsed from tsv files in', tsvDir, JSON.stringify(jsonData)));

                //remove spaces
                stringifiedData = stringifiedData.replace(/[ \t\n]/g, ''); 
                let despacedData = obj.data.replace(/[ \t\n]/g, '');
                
                assert.strictEqual(despacedData, stringifiedData);
                console.log('-------------------------------------');
                done();
            }).catch( (e) => {
                errFn(e, done);
            });
        }).catch( (e) => {
            errFn(e, done);
        });
    });

    it('Parses .tsv  x2 to .json', async () => {

        console.log('Reading',jsonPath2,tsvDir2);
        
        let obj=await bis_genericio.read(jsonPath2);
        console.log('Obj=',obj.data);
        let jsonData=await bis_bidsutils.parseTaskFileFromTSV(tsvDir2, null, 1.0, false);
               
        let stringifiedData = JSON.stringify(jsonData);
        console.log(colors.cyan(' ++++ json data parsed from tsv files in', tsvDir2, JSON.stringify(jsonData)));
        
        //remove spaces
        stringifiedData = stringifiedData.replace(/[ \t\n]/g, ''); 
        let despacedData = obj.data.replace(/[ \t\n]/g, '');
        
        assert.strictEqual(despacedData, stringifiedData);
        console.log('-------------------------------------');
        return Promise.resolve('done');
    });

    it('Parses .json to .tsv x2 ', async () => {
        
        let obj1=(await bis_genericio.read(tsvPath2_1)).data;
        let obj2=(await bis_genericio.read(tsvPath2_2)).data;

        let tsvData=await bis_bidsutils.parseTaskFileToTSV(jsonPath2, null, false);
        tsvData.run1= cleanRow(tsvData.run1);
        tsvData.run2= cleanRow(tsvData.run2);
        obj1=cleanRow(obj1);
        obj2=cleanRow(obj2);

        let eq1=(obj1 === tsvData.run1);
        let eq2=(obj2 === tsvData.run2);

        console.log('Equal1 =',eq1,' \t('+tsvData.run1+')\t('+obj1+')');
        console.log('Equal2 =',eq2,' \t('+tsvData.run2+')\t('+obj2+')');
        
        
        let equal = eq1 && eq2;
        assert.strictEqual(equal,true);
        return Promise.resolve('done');
    });


});
