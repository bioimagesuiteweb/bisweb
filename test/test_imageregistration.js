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
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');
const assert = require("assert");
const BisWebImage=require('bisweb_image');
const path=require('path');
const numeric=require('numeric');
numeric.precision = 3;
const bistransforms=require('bis_transformationutil');
const bisimagesmoothreslice=require('bis_imagesmoothreslice');
const libbiswasm=require('libbiswasm_wrapper');


describe('Testing Image Registration (from bis_imageregistration.js)\n', function() {
    
    this.timeout(50000);
    let images = [ new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage() ];
    
    let imgnames = [ 'MNI_2mm_orig.nii.gz', 'MNI_2mm_resliced.nii.gz' ,
                     'MNI_T1_1mm_resampled.nii.gz','MNI_T1_1mm_resampled_MNI_T1_1mm_resampled_shifted15_5_0.nii.gz' ];

    let gold_matrix = [[     0.965,     0.228,  -5.61e-4,     -30.9],
                       [    -0.238,     0.917,    0.0793,        25],
                       [    0.0195,   -0.0719,         1,      5.79],
                       [         0,         0,         0,         1]];

    
    let fullnames = [ '','','',''   ];
    for (let i=0;i<=3;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    
    before(function(done){

        let p=[         libbiswasm.initialize() ];
        for (let i=0;i<=3;i++) {
            p.push(images[i].load(fullnames[i]));
        }
        Promise.all(p).then( () => { done(); });
    });
    
    it('test registration wasm 1',function() {
        this.timeout(50000);


        let reslice_transform=bistransforms.createLinearTransformation();
        reslice_transform.setMatrix(gold_matrix);       

        let resliceW=new BisWebImage(); resliceW.cloneImage(images[0]);
        bisimagesmoothreslice.resliceImage(images[0],resliceW,reslice_transform,1);
        
        let p=libbiswasm.runLinearRegistrationWASM(resliceW,images[0],0, { intscale :2,
                                                                           numbins : 64,
                                                                           levels : 3,
                                                                           smoothing :-1.0,
                                                                           optimization: 2,
                                                                           stepsize:0.5,
                                                                           metric: 3,
                                                                           steps:1,
                                                                           iterations:20,
                                                                           mode: 3,
                                                                           resolution : 1.1,
                                                                         },1);
        
        console.log('Computed Matrix = ',numeric.prettyPrint(p.getMatrix()));
        console.log('Gold Matrix = ',gold_matrix);

        let m=numeric.inv(p.getMatrix());
        let z=numeric.sub(numeric.dot(gold_matrix,m),numeric.identity(4));
        console.log(' Combined =',numeric.prettyPrint(z));
        
        let error0=numeric.norminf(z);
        console.log('Matrix error = ',error0);
        assert.equal(true,error0<0.82);
    });


});
