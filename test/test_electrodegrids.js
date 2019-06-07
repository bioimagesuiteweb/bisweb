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
"use strict";

require('../config/bisweb_pathconfig.js');
const assert = require("assert");
const path = require("path");
const tempfs = require('temp').track();
const tmpDirPath=tempfs.mkdirSync('test_image');


const bis_genericio = require("bis_genericio");
const BisWebElectrodeMultiGrid=require('bisweb_electrodemultigrid');


const MGRIDNAME = path.join(__dirname,'testdata',path.join('grids','sample.mgrid'));
const JSONNAME = path.join(__dirname,'testdata',path.join('grids','sample.mgrid.json'));


console.log('');
console.log('------- starting -------------');
console.log('');

describe('Testing the Electrode Grids class (from bisweb_electrodemultigrid.js) \n', function() {

    this.timeout(50000);
    
    it('read json save mgrid file', async () => {
        console.log('----------------------------');
        let grid=new BisWebElectrodeMultiGrid();
        await grid.load(JSONNAME);

        let tmpname=path.join(tmpDirPath,'sample.mgrid');
        await grid.save(tmpname);
        


        let grid2=new BisWebElectrodeMultiGrid();
        await grid2.load(tmpname);

        let result=grid.compareWithOther(grid2);
        console.log('++++ Result = ',JSON.stringify(result));
        
        assert.equal(result.testresult,true);
        
        return Promise.resolve();
    });

    it('read mgrid save json file', async () => {
        console.log('----------------------------');
        let grid=new BisWebElectrodeMultiGrid();
        await grid.load(MGRIDNAME);

        let tmpname=path.join(tmpDirPath,'sample.json');
        await grid.save(tmpname);
        

        
        let grid2=new BisWebElectrodeMultiGrid();
        await grid2.load(tmpname);

        let result=grid.compareWithOther(grid2);
        console.log('++++ Result = ',JSON.stringify(result));
        
        assert.equal(result.testresult,true);
        return Promise.resolve();
    });

    it('read and write mgrid file', async () => {
        console.log('----------------------------');
        let grid=new BisWebElectrodeMultiGrid();
        await grid.load(MGRIDNAME);

        let tmpname=path.join(tmpDirPath,'sample2.mgrid');
        await grid.save(tmpname);
        


        let obj1=(await bis_genericio.read(tmpname)).data.split('\n');
        let obj2=(await bis_genericio.read(MGRIDNAME)).data.split('\n');

        
        let same=true;
                                                        
        for (let i=0;i<obj1.length;i++) {
            obj1[i]=obj1[i].trim();
            obj2[i]=obj2[i].trim();
            if (obj1[i]!==obj2[i]) {
                console.log('---- Bad line',i,' ('+obj1[i]+') vs ('+obj2[i]+')');
                same=false;
            } else if (i%(17*16) === 0) {
                console.log('\t ++++ Same line',i,'('+obj1[i]+') vs ('+obj2[i]+')');
            }
        }
        
        assert.equal(same,true);
        return Promise.resolve();
    });


});
