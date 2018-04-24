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
const bisimagesmooth=require('bis_imagesmoothreslice');
const bistransforms=require('bis_transformationutil');
const path=require('path');
const numeric=require('numeric');
const libbiswasm=require('libbiswasm_wrapper');
const BisWebImage=require('bisweb_image');

describe('Testing 4D Smooth and Reslice and Compute Displacement Field\n', function() {

    this.timeout(50000);
    
    let images = [ new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage() ];
    let imgnames = [ 'dti.nii.gz','dti_resl.nii.gz','dti_smooth_8mm.nii.gz','dti_dispfield.nii.gz' ];
    let tname=path.resolve(__dirname, 'testdata/dti.matr' );
    
    let fullnames = [ '','','',''];
    for (let i=0;i<=3;i++) {
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
        console.log(i+':',fullnames[i]);
    }

    let reslice_transform=bistransforms.createLinearTransformation();

    before(function(done){
        let p=[ libbiswasm.initialize() ];
        for (let i=0;i<=3;i++)
            p.push(images[i].load(fullnames[i],false));
        p.push(reslice_transform.load(tname));
        Promise.all(p)
            .then( () => {
                console.log('\nread matrix=\n'+reslice_transform.getDescription());
                done();
            }).catch( (e) => { console.log('Failed '+e); process.exit(1); });
    });
    

    it('test smooth 4d',function() {

        let c=8.0*0.4247;
        let out=bisimagesmooth.smoothImage(images[0],[c,c,c],true);
        let CC=bisimagesmooth.computeCC(images[2].getImageData(),out.getImageData());
        console.log('+++++ 4D Smoothing =',CC.toFixed(3));
        assert.equal(true,(CC>0.9));
    });

    it('test smooth 4d wasm',function() {

        let c=8.0*0.4247;
        let out=libbiswasm.gaussianSmoothImageWASM(images[0],{
            sigmas : [c,c,c],
            inmm : true,
            radiusfactor : 1.5},1);
        let CC=bisimagesmooth.computeCC(images[2].getImageData(),out.getImageData());
        console.log('+++++ 4D Smoothing (WASM) =',CC.toFixed(3));
        assert.equal(true,(CC>0.9));
    });


    it('test displacement field for matrix',function() {

        let out=bisimagesmooth.computeDisplacementField(images[0],reslice_transform);
        let error0=numeric.norminf(numeric.sub(out.getImageData(),images[3].getImageData()));
        console.log('+++++ Displacement Field error=',error0.toFixed(4));
        assert.equal(true,(error0<0.01));
    });


    it('test matrix serialization',function() {

        let m=numeric.identity(4);
        for (let row=0;row<=3;row++) {
            for (let col=0;col<=3;col++) {
                m[row][col]=(1.0+row)*10.0+col*col*5.0;
            }
        }

        let xform=bistransforms.createLinearTransformation();
        xform.setMatrix(m);
        console.log('First print to check ...\n',xform.getDescription());
        
        //      Module._set_debug_memory_mode(2);
        let wasm_output=libbiswasm.test_matrix4x4(xform,1);
        console.log('\t From JS to C++, diff=',wasm_output);

        let xform2=bistransforms.createLinearTransformation();
        console.log('Last check ...\n',xform2.getDescription());

        let sum2=0.0;
        let intm=xform2.getMatrix();
        for (let row=0;row<=3;row++) {
            for (let col=0;col<=3;col++) {
                sum2+=Math.abs(m[row][col]-(intm[row][col]-2));
            }
        }
        console.log('\t Roundtrip + 1 Final sum=',sum2);
        assert(true,wasm_output<0.01 && sum2<0.01);
    });

    it('test image reslice 4d',function() {

        this.timeout(50000);
        this.slow(10);
        let ref_image=images[0], targ_image=images[1];
        let resliced=new BisWebImage(); resliced.cloneImage(ref_image);

        
        bisimagesmooth.resliceImage(targ_image,resliced,reslice_transform,3);
        let CC3=bisimagesmooth.computeCC(ref_image.getImageData(),resliced.getImageData());
        bisimagesmooth.resliceImage(targ_image,resliced,reslice_transform,1);
        let CC1=bisimagesmooth.computeCC(ref_image.getImageData(),resliced.getImageData());
        bisimagesmooth.resliceImage(targ_image,resliced,reslice_transform,0);
        let CC0=bisimagesmooth.computeCC(ref_image.getImageData(),resliced.getImageData());
        
        let CC_old=bisimagesmooth.computeCC(ref_image.getImageData(),targ_image.getImageData());
        console.log('++++ 4D Reslicing [NN,1,3]=',[ CC0.toFixed(3),CC1.toFixed(3),CC3.toFixed(3) ], ' noreslice =',CC_old.toFixed(3));
        assert.equal(true,(CC1>0.9 && CC0>0.9 && CC3>0.9));
    });

    it('test image reslice 4d wasm',function() {

        this.timeout(50000);
        this.slow(10);
        let ref_image=images[0], targ_image=images[1];


        
        console.time('.... WASM 4D Reslice');

        let dimensions= ref_image.getDimensions();
        let spacing=ref_image.getSpacing();
        
        let resliced=libbiswasm.resliceImageWASM(targ_image,reslice_transform,{ "interpolation" : 1,
                                                                                "dimensions" : dimensions,
                                                                                "spacing": spacing});
        
        console.timeEnd('.... WASM 4D Reslice');

        let CC1=bisimagesmooth.computeCC(ref_image.getImageData(),resliced.getImageData());

        let reslicedJS=new BisWebImage(); reslicedJS.cloneImage(ref_image);
        console.time('.... JS 4D Reslice');
        bisimagesmooth.resliceImage(targ_image,reslicedJS,reslice_transform,3);
        console.timeEnd('.... JS 4D Reslice');
        let CC2=bisimagesmooth.computeCC(reslicedJS.getImageData(),resliced.getImageData());
        
        dimensions= resliced.getDimensions();
        spacing=resliced.getSpacing();

        
        libbiswasm.resliceImageWASM(targ_image,reslice_transform,{ "interpolation" : 0,
                                                                   "dimensions" : dimensions,
                                                                   "spacing": spacing});
        let CC0=bisimagesmooth.computeCC(ref_image.getImageData(),resliced.getImageData());
        
        libbiswasm.resliceImageWASM(targ_image,reslice_transform,{ "interpolation" : 3,
                                                                   "dimensions" : dimensions,
                                                                   "spacing": spacing});

        let CC3=bisimagesmooth.computeCC(ref_image.getImageData(),resliced.getImageData());

        let CC_old=bisimagesmooth.computeCC(ref_image.getImageData(),targ_image.getImageData());
        console.log('++++ Wasm 4D Reslicing [NN,1,3]=',[ CC0.toFixed(3),CC1.toFixed(3),CC3.toFixed(3) ], ' JS vs WASM=', CC2.toFixed(3), ' noreslice =',CC_old.toFixed(3));
        assert.equal(true,(CC1>0.9 && CC0>0.9 && CC2 > 0.99));
    });



});
