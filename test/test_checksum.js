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

/*global describe, it,before */
"use strict";

require('../config/bisweb_pathconfig.js');
const assert = require("assert");
const util = require('bis_util.js');
const genericio=require('bis_genericio');
const path=require('path');

let data=[];

describe('Testing Checksum (from js/bisweb_checksum.js)\n', function() {

    this.timeout(500000);

    before(function(done) {

        const name = path.resolve(__dirname,'./testdata/shen_lobes.csv');
        const name2 = path.resolve(__dirname,'./testdata/MNI_2mm_orig.nii.gz');
        Promise.all( [
            genericio.read(name,false),
            genericio.read(name2,true)]).then( (dat) => {
                data=dat;
                done();
            }).catch( (e) => {
                console.log(e);
                process.exit(1);
            });
    });
    
    it('checksums an empty array \n', function() {
        let empty = new Uint8Array();
        let hash = util.SHA256(empty);
        console.log('SHA-1 = ', hash);
        assert.equal(hash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('checksums an short array \n', function() {
        let ray = new Uint8Array([1,2,3,4,5]);
        let hash = util.SHA256(ray);
        console.log('SHA-1 = ', hash);
        assert.equal(hash, '74f81fe167d99b4cb41d6d0ccda82278caee9f3e2f25d5e5a3936ff3dcec60d0');
    });

    it('checksums a csv file \n', function() {
        const gold='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        let obj=data[0];
        let hash=util.SHA256(obj.data);
        console.log(`Computed hash for ${obj.filename} = ${hash}`);
        assert.equal(hash,gold);
    });
    
    it('ungzips and checksums a nifti file \n', function() {
        let obj=data[1];
        let hash=util.SHA256(obj.data);
        console.log(`Computed hash for ${obj.filename} = ${hash}`);
        assert.equal(hash, '06842bb57058243e4b9772949f9ec38e56821238be8ea40419c766d0a10975d3');
    });

});
