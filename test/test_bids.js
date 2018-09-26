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
/*global describe, it,before,after */
"use strict";


require('../config/bisweb_pathconfig.js');


const assert = require("assert");
const bidsutils=require('bis_bidsutils');

let indir="/mnt/e/dicom/final";
let outdir="/mnt/e/dicom/tmp";

let client=null;

describe('Testing the DICOM 2 BIDS\n', function() {

    this.timeout(50000);
    
    it('WS ...test bids conversion',function(done) {


        console.log('Working on BIDS\n------------------------------------\n');
        bidsutils.dicom2BIDS(
            {
                indir : indir,
                outdir : outdir
            }).then( (m) => {
                console.log('All set ',m);
                assert.equal(true,true);
                done();
            }).catch( (e) => {
                console.log('Error ',e,e.stack);
                assert.equal(true,false);
                done();
            });
    });
});

