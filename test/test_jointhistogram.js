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
/*global describe, it,before */
"use strict";

require('../config/bisweb_pathconfig.js');

const path=require('path');
const assert = require("assert");
const BisWebImage=require('bisweb_image');
const numeric=require('numeric');

const libbiswasm=require('libbiswasm_wrapper');

numeric.precision = 2;


let showvalueswasm = function(name,v) {

    console.log('WASM Results '+name+':\n\t SSD=',v[0].toFixed(3),' CC=',v[1].toFixed(3),' NMI=',v[2].toFixed(3),' MI=',v[3].toFixed(3));
    console.log('\tPartials: e1=',v[4].toFixed(3),' e2=',v[5].toFixed(3),' joint=',v[6].toFixed(3));
};

let create_image=function(imgdata) {

    if (imgdata===0)
        return 0;
    
    let image=new BisWebImage();
    image.createImage({dimensions : [ 10,10,1 ], type: 'short' });
    let im=image.getImageData();
    
    for (let i=0;i<100;i++) {
        im[i]=imgdata[i];
    }

    return image;
};


let internal_computeJointHistogramWASM=function(image1,image2,weight1,weight2,
                                                binsx,binsy,intscale,returnmatrix,debug) {

    let numweights=0;
    if (weight1!==0) {
        numweights=1;
        if (weight2!==0)
            numweights=2;
    }

    console.log('Return Matrix=',returnmatrix);
    
    let m=libbiswasm.test_compute_histo_metric(image1,image2,
                                               weight1 || 0 ,
                                               weight2 || 0,
                                               numweights || 0,
                                               {
                                                   numbinsx : binsx || 10,
                                                   numbinsy : binsy || 10,
                                                   intscale : intscale ||1,
                                               },
                                               returnmatrix || 0,
                                               debug || 0).getNumericMatrix();


    if (returnmatrix) {
        console.log('Output Matrix=',m);
        return m;
    }
    console.log('Output Vector=',m[0]);
    return m[0];
};


let computeWASMHistogram=function(imagedata1,imagedata2,weightdata1,weightdata2,
                                  binsx,binsy,intscale,returnmatrix,debug) {

    let image1=create_image(imagedata1);
    let image2=create_image(imagedata2);
    let weight1=create_image(weightdata1);
    let weight2=create_image(weightdata2);

    returnmatrix = returnmatrix || 0;
    debug=debug || 0;
    console.log('debug=',debug);

    return internal_computeJointHistogramWASM(image1,image2,weight1,weight2,
                                              binsx,binsy,intscale,returnmatrix,debug);
};


describe('Testing BisJointHistogram (from bis_jointhistogram.js) - a class that computes joint histograms and related metrics\n', function(){


    this.timeout(50000);
    let gold_nmivalues  = [ 1.000, 0.940, 1.000, 0.943, 0.380 ];
    
    let imagedata= new Uint8Array(100);
    let imagedata2= new Uint8Array(100);
    let wgt1= new Uint8Array(100);
    let wgt2= new Uint8Array(100);

    let dt =  [ 0,1,2,3,4,5,6,7,8,9 ];
    let dt2 = [ 0,1,3,4,5,6,7,8,9,0 ];
    
    for (let i=0;i<=99;i++) {

        let ind=Math.floor(i/10);
        imagedata[i]=dt[ind];
        imagedata2[i]=dt2[ind];
        if (i<20)
            wgt1[i]=1.0;
        else
            wgt1[i]=0.0;

        if (i<50)
            wgt2[i]=2.0;
        else
            wgt2[i]=1.0;
        
    }

    let images = [ new BisWebImage(),new BisWebImage() ];
    let imgnames = [ 'MNI_T1_1mm_resampled.nii.gz','MNI_T1_1mm_resampled_MNI_T1_1mm_resampled_shifted15_5_0.nii.gz' ];
    let fullnames = [ '','','',''   ];
    for (let i=0;i<=1;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);

    before(function(done){
        let p=[ images[0].load(fullnames[0]),
                images[1].load(fullnames[1]),
                libbiswasm.initialize()  ];
        Promise.all(p).then( () => { done(); });
    });
    

    it ('histogram identity unweighted',function() {

        let wasm_v=computeWASMHistogram(imagedata,imagedata,0,0,10,10,1);
        let error=Math.abs(wasm_v[2]-gold_nmivalues[0]);

        console.log('---- WASM error=', error.toFixed(4));
        
        assert.equal(true, error<0.001);
    });

    it ('histogram not-identity unweighted',function() {
        let wasm_v=computeWASMHistogram(imagedata,imagedata2,0,0,10,10,1);
        showvalueswasm('diff-wasm',wasm_v);
        let error=Math.abs(wasm_v[2]-gold_nmivalues[1]);

        console.log('---- WASM error=', error.toFixed(4));
        
        assert.equal(true, (error)<0.01);
    });

    it ('histogram weighted to make it look like identity',function() {

        let wasm_v=computeWASMHistogram(imagedata,imagedata2,wgt1,0,10,10,1);
        showvalueswasm('w-diff-wasm ',wasm_v);

        let error=Math.abs(wasm_v[2]-gold_nmivalues[2]);
        console.log('---- WASM error=', error.toFixed(4));
        assert.equal(true, (error)<0.01);
    });

    it ('histogram weighted',function() {

        let wasm_v=computeWASMHistogram(imagedata,imagedata2,wgt2,0,10,10,1);
        showvalueswasm('w-diff2-wasm ',wasm_v);
        
        let error=Math.abs(wasm_v[2]-gold_nmivalues[3]);
        console.log('---- WASM error=', error.toFixed(4));
        assert.equal(true, (error)<0.01);
    });

    it ('histogram weighted and intensity scaled',function() {


        let wasm_v=computeWASMHistogram(imagedata,imagedata2,wgt2,0,6,6,2);
        showvalueswasm('w-diff3-wasm ',wasm_v);

        let error=Math.abs(wasm_v[2]-gold_nmivalues[4]);
        console.log('---- WASM error=', error.toFixed(4));
        assert.equal(true, (error)<0.01);
        
        //      assert.equal(true,Math.abs(hist5.computeNMI() - gold_nmivalues[4])<0.001);
    });

    
    it ('histogram weighted and intensity scaled',function() {

        let wasm_v=computeWASMHistogram(imagedata,imagedata2,wgt2,wgt1,6,8,2);
        showvalueswasm('dual_weight-wasm ',wasm_v);
        let error1=Math.abs(0.375-wasm_v[2]);
        let error2=Math.abs(2.372-wasm_v[6]);
        console.log('---- JS vs WASM NMI error=', error1.toFixed(4), '  JntE error=', error2.toFixed(4));
        assert.equal(true, (error1+error2)<0.1);
        

    });

});

