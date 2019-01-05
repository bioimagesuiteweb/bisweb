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
/*global describe, it, after, before */
"use strict";

require('../config/bisweb_pathconfig.js');
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');


const assert = require("assert");
const path=require('path');
const BisWebImage=require('bisweb_image');
const util=require('bis_util');
const colors=require('colors/safe');
const tfrecon = require('bis_tfjsnodereconstructimage');
let indata=path.resolve(__dirname,path.join('testdata','tfjs64'));


let input=new BisWebImage();
let gold=new BisWebImage();

const tf=tfrecon.load(false);

describe('Testing TFJS recon\n', function() {
    
    this.timeout(50000);

    before(function(done) {
    
        let filenames = [ 'sample1.nii.gz', 'sampleout.nii.gz' ];
        let inputname=path.join(indata,filenames[0]);
        let goldname=path.join(indata,filenames[1]);
        Promise.all([
            input.load(inputname),
            gold.load(goldname)
        ]).then( () => {
            done();
        }).catch( (e) => {
            process.exit(1);
        });
    });
          
    it ('check recon 1',function(done) {
        tfrecon.reconstruct(tf,input,indata,1,8).then( (output) => {
            console.log('\n+++++ Comparing\n\t'+gold.getDescription()+ '\n\t and \n\t' + output.getDescription());
            let maxd=output.maxabsdiff(gold);
            console.log('+++++ \t\t\t maxd=',maxd);
            if (maxd<0.01)
                assert(true,true);
            else
                assert(true,false);
            done();
        }).catch( (e) => {
            console.log(e);
            assert(false,true);
            done();
        })
    });

    it ('check recon 1',function(done) {
        tfrecon.reconstruct(tf,input,indata,12,8).then( (output) => {
            console.log('\n+++++ Comparing\n\t'+gold.getDescription()+ '\n\t and \n\t' + output.getDescription());
            let maxd=output.maxabsdiff(gold);
            console.log('+++++ \t\t\t maxd=',maxd);
            if (maxd<0.01)
                assert(true,true);
            else
                assert(true,false);
            done();
        }).catch( (e) => {
            console.log(e);
            assert(false,true);
            done();
        })
    });


});

