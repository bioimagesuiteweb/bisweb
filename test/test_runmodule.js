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
const assert = require("assert");
const path=require('path');
const BisWebImage=require('bisweb_image.js');
const SmoothImage=require("smoothImage.js");



let filename = path.resolve(__dirname, 'testdata/small.nii.gz');
let input=new BisWebImage();



describe('Testing Serialize and Serialize\n', function() {

    this.timeout(50000);
    
    before(function(done){
        input.load(filename).
            then( () => { done(); }).
            catch( (e) => { console.log(e); process.exit(1); });
    });

    it('check execute module',function(done) {

        let smooth=new SmoothImage();
        smooth.execute({ 'input' : input },
                       { 'sigma' : 3.0 ,
                         'debug' : true }).then( () => {
                             assert.equal(true,true);
                             done();
                         }).catch( (e) => {
                             console.log('Test Failed',e);
                             assert.equal(true,false);
                             done();
                         });
        
        
    });

});

