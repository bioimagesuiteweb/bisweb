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
const bisimagesmoothreslice=require('bis_imagesmoothreslice');
const BisWebImage=require('bisweb_image');
const bistransforms=require('bis_transformationutil');
const path=require('path');
const libbiswasm=require('libbiswasm_wrapper');


const images = [ new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage() ];
const imgnames = [ 'MNI_2mm_orig.nii.gz', 
                   'MNI_2mm_scaled.nii.gz',
                   'MNI_6mm.nii.gz',
                   'MNI_6mm_scaleddispfield.nii.gz'
                 ];

const tname=path.resolve(__dirname, 'testdata/MNI_2mm_scaled.grd' );

const fullnames = [ '','','','','' ];
for (let i=0;i<=3;i++) {
    fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    console.log(i+':',fullnames[i]);
}

let bsplinecombo_inp=bistransforms.createComboTransformation();


describe('Testing New Style Bspline Grid Code\n', function() {

    this.timeout(50000);
    
    before(function(done){
        let p=[libbiswasm.initialize() ];
        for (let i=0;i<images.length;i++) {
            p.push(images[i].load(fullnames[i]));
        }
        p.push( bsplinecombo_inp.load(tname));
        Promise.all(p).then( () => { done(); });
    });



    it('fit displacement field with bspline and compare',function() {
        console.log('\n\n\n\n');
        
        let dispfield=images[3];

        let outgrid=libbiswasm.approximateDisplacementFieldWASM2(dispfield,
                                                                 { spacing : 30.0,
                                                                   stepsize : 0.5,
                                                                   steps : 1,
                                                                   lambda : 0.1, 
                                                                   iterations : 20,
                                                                   tolerance : 0.0001,
                                                                   optimization :2,
                                                                   windowsize : 2.0,
                                                                   levels : 2,
                                                                   resolution : 2.0,
                                                                   inverse : false,
                                                                 },true);
        

        let wasm_field=libbiswasm.computeDisplacementFieldWASM(outgrid,
                                                               {
                                                                   "dimensions" : dispfield.getDimensions(),
                                                                   "spacing" : dispfield.getSpacing()
                                                               },1);
        
        
        let new_grid=bisimagesmoothreslice.computeDisplacementField(dispfield,outgrid);
        let error0=bisimagesmoothreslice.computeImageSSD(new_grid,dispfield);
        let error1=bisimagesmoothreslice.computeImageSSD(wasm_field,dispfield);
        console.log('+++++ Displacement Field average sqrt(SSD) WASM v GOLD=',error0.toFixed(4),error1.toFixed(4));

        assert.equal(true,(error0<0.52 && error1<0.25));
    });

});

