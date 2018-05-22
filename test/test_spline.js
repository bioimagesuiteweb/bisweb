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
const assert = require("assert"),
      numeric=require('numeric'),
      Spline=require('bis_spline');



describe('Testing b-spline (from spline.js) class that describes a closed cubic b-spline curve\n', function(){

    this.timeout(50000);
    
    // Some gold standard data
    const gold_nodepoints=[ [ 60, 2 ], [ 57.071, 5.535 ], [ 50, 7 ], [ 42.928, 5.535 ], [ 40, 2.0 ], [ 42.929, -1.535 ], [ 50, -3 ], [ 57.071, -1.535 ] ];
    const gold_curve=[[ 60, 2], [ 53.1, 6.75], [ 41.9, 4.94], [ 41.9, -0.939], [ 53.1, -2.75]];
    const gold_circum=48.44;
    const gold_epsilon=0.01;
    const gold_der= [ 0, 3.918058124456122 ];
    

    // First set of Operations
    const spl=new Spline(8,10.0,5.0,0.0,2.0);//,0.0,0.0);
    const len=spl.length(0.01);
    const der=spl.derivative(0.0);
    const derivative_error=numeric.norm2(numeric.sub(der,gold_der));
    const points_error=numeric.norm2(numeric.sub(spl.getnodepoints(),gold_nodepoints));
    const sample_error=numeric.norm2(numeric.sub(spl.createcurve(0.2),gold_curve));


    // Resampling Spline and second set of operations
    const refit=spl.createcurve(1.0/16.0);
    const spl2=new Spline();
    spl2.initialize(refit);
    const refit_error=numeric.norm2(numeric.sub(spl2.createcurve(0.2),gold_curve));
    spl.resample(16);
    const resample_error=numeric.norm2(numeric.sub(spl2.getnodepoints(),spl.getnodepoints()));

    // Now test results and add to mocha

    describe('Create spline n=8',function() {
        it ('(should pass) test node points err='+points_error,function() { 
            assert.equal(true,(points_error<gold_epsilon));
        });
    });

    describe('Test circmference',function() {
        it ('(should pass) (len='+len+', theoretical='+gold_circum+')',function() { 
            assert.equal(true,((len-gold_circum)<gold_epsilon));
        });
    });

    describe('Create curve ds=0.2',function() {
        it ('(should pass) sampling err='+sample_error,function() { 
            assert.equal(true,(sample_error<gold_epsilon));
        });
    });

    describe('Test derivative at s=0.0',function() {
        it ('(should pass) sampling err='+derivative_error,function() {  
            assert.equal(true,(derivative_error<gold_epsilon));
        });
    });

    describe('Test spline incl matrix inverse',function() {
        it ('(should pass)',function() {  
            assert.equal(true,spl.test(true));
        });
    });

    
    describe('Create spline n=16',function() {
        it ('(should pass)',function() { 
            assert.equal(16,spl2.getnumpoints());
        });
    });


    describe('Use resampled spline (n=16) to create curve ds=0.2',function() {
        it ('(should pass) err='+refit_error,function() { 
            assert.equal(true,(refit_error<gold_epsilon));
        });
    });

    describe('Direct test of resample function (n=16) ',function() {
        it ('(should pass) err='+resample_error,function() {  
            assert.equal(true,(resample_error<gold_epsilon));
        });
    });

    
});

