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
/*global describe, it, before */

"use strict";

require('../config/bisweb_pathconfig.js');

const path=require('path');
const assert = require("assert");
const BisWebImage=require('bisweb_image');
const bisimageutils=require('bis_imageutils');
const numeric=require('numeric');

const goldimage=new BisWebImage();
const inpname=path.join(__dirname,'testdata/simple4dtest.nii.gz');
const goldname=path.join(__dirname,'testdata/simple4dtest_frame3.nii.gz');

describe('Testing image utils code (from bis_imageutils.js)\n', function() {

    
    before(function(done){

        goldimage.load(goldname).then( () => {
            done();
        });
    });
    
    it('run extract frame',function(done) {
        bisimageutils.readImageAsArray(inpname,true).then( (arr) => {
            let img=arr[3];
            console.log('____ Image Frame 3=',img.getDescription());
            let error=numeric.norminf(numeric.sub(goldimage.getImageData(),arr[3].getImageData()));
            console.log("\t\t Difference=",error);
            assert.equal(true,(error<0.011));
            done();
        });
    });
});



