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
const BisWebImage=require('bisweb_image');
const bisimagesmooth=require('bis_imagesmoothreslice');
const libbiswasm=require('libbiswasm_wrapper');
const path=require('path');
const numeric=require('numeric');


describe('Testing image smoothing code (from bis_imagesmoothreslice.js)\n', function() {

    this.timeout(50000);
    
    let images = [ new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage() ];
    let imgnames = [ 'thr.nii.gz',
                     'thr_sm.nii.gz',
                     'avg152T1_LR_nifti.nii.gz',
                     'avg152T1_LR_nifti_sm7mm.nii.gz',
                   ];
    
    let fullnames = [ '','','','' ];
    for (let i=0;i<=3;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    
    before(function(done){
        let p=[ libbiswasm.initialize() ];
        for (let i=0;i<images.length;i++) {
            p.push(images[i].load(fullnames[i]));
        }
        Promise.all(p).then( () => { done(); });
    });
    
    it('run smooth 1',function() {
        let c=5.0*0.4247;
        console.log('c=',c);
        let out=bisimagesmooth.smoothImage(images[0],[c,c,c],false,1.5);
        let error0=numeric.norminf(numeric.sub(out.getImageData(),images[1].getImageData()));
        let error1=numeric.norminf(numeric.sub(out.getImageData(),images[0].getImageData()));
        console.log('max difference=',error0,' vs ' , error1);
        assert.equal(true,(error0<=0.01*error1));
    });

    it('run wasm smooth 1',function() {
        let c=5.0*0.4247;
        console.log('c=',c);
        let out=libbiswasm.gaussianSmoothImageWASM(images[0],
                                                   { "sigmas" : [c,c,c],
                                                     "inmm" : false,
                                                     "radiusfactor": 1.5},1);
        let error0=numeric.norminf(numeric.sub(out.getImageData(),images[1].getImageData()));
        let error1=numeric.norminf(numeric.sub(out.getImageData(),images[0].getImageData()));
        console.log('max difference=',error0,' vs ' , error1);
        assert.equal(true,(error0<=0.01*error1));
    });


    it('run smooth 2',function() {
        let c=7.0*0.4247;
        console.log('c=',c);
        let out=bisimagesmooth.smoothImage(images[2],[c,c,c],true,1.5);
        let error0=numeric.norminf(numeric.sub(out.getImageData(),images[3].getImageData()));
        let error1=numeric.norminf(numeric.sub(out.getImageData(),images[2].getImageData()));
        console.log('max difference=',error0,' vs ', error1);
        assert.equal(true,(error0<=0.1*error1));
    });
    

    it('run smooth 2',function() {
        let c=7.0*0.4247;
        console.log('c=',c);
        let out=libbiswasm.gaussianSmoothImageWASM(images[2],{
            "sigmas" : [c,c,c],
            "inmm" : true,
            "radisfactor" : 1.5},1);
        let error0=numeric.norminf(numeric.sub(out.getImageData(),images[3].getImageData()));
        let error1=numeric.norminf(numeric.sub(out.getImageData(),images[2].getImageData()));
        console.log('max difference=',error0,' vs ', error1);
        assert.equal(true,(error0<=0.1*error1));
    });


});



