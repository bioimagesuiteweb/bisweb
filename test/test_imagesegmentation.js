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
const bisimagesmoothreslice=require('bis_imagesmoothreslice');
const path=require('path');
const libbiswasm=require('libbiswasm_wrapper');

describe('++++ check bias field correction\n',function() {       // jshint ignore:line

    this.timeout(50000);
    let images = [ new BisWebImage(),new BisWebImage(), new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage() ];
    
    let imgnames = [ 
        'MNI_T1_1mm_resampled_biasz_corrected.nii.gz',
        'MNI_T1_1mm_resampled_biasz.nii.gz',
        'MNI_T1_1mm_resampled_triplebias_corrected.nii.gz',
        'MNI_T1_1mm_resampled_triplebias.nii.gz',
        'MNI_2mm_orig.nii.gz',
        'histo_MNI_2mm_orig.nii.gz',
        'mrf_MNI_2mm_orig.nii.gz' ,
        'MNI_T1_1mm_resampled.nii.gz'
    ];
    
    
    let fullnames = [ '','','','','','','','' ,''];
    
    for (let i=0;i<=8;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    
    this.timeout(50000);             
    before(function(done){
        let p=[ libbiswasm.initialize() ];
        for (let i=0;i<images.length;i++) {
            p.push(images[i].load(fullnames[i]));
        }
        Promise.all(p).then( () => { done(); });
    });
    
    it('check bias field correction ',function(done) {
        
        console.log('\n\n-----------------------------------------------------------------------------------------------\n');

        let wasm_img=libbiswasm.sliceBiasFieldCorrectImageWASM(images[1],{
            "axis" : 2,
            "threshold" :0.0002,
            "returnbiasfield" :false},1);

        console.log('Out dims=', wasm_img.getDescription());

        
        console.log('\n----- Image dimensions corrupted=',images[1].getDescription(),', corrected=',images[0].getDescription());

        let CC=bisimagesmoothreslice.computeCC(images[0].getImageData(),wasm_img.getImageData());
        let CC_bis=bisimagesmoothreslice.computeCC(images[0].getImageData(),images[7].getImageData());
        let CC_wasm=bisimagesmoothreslice.computeCC(wasm_img.getImageData(),images[7].getImageData());
        
        console.log('----- CC result v bis',CC, ' bis vs orig ' , CC_bis, ' wasm v orig ', CC_wasm);


        assert.equal(true,CC>0.95 && CC_wasm>0.95);
        done();
    });


    it('check triple bias field correction ',function(done) {
        

        console.log('\n\n-----------------------------------------------------------------------------------------------\n');

        let wasm_img=libbiswasm.sliceBiasFieldCorrectImageWASM(images[3],
                                                               { "axis" : 3, // triple-slice
                                                                 "threshold" :0.0002,
                                                                 "returnbiasfield" :false},1);

        console.log('Out dims=', wasm_img.getDescription());
        let CC=bisimagesmoothreslice.computeCC(images[2].getImageData(),wasm_img.getImageData());
        let CC_bis=bisimagesmoothreslice.computeCC(images[2].getImageData(),images[7].getImageData());
        let CC_wasm=bisimagesmoothreslice.computeCC(wasm_img.getImageData(),images[7].getImageData());
        

        
        
        console.log('----- CC result v bis',CC, ' bis vs orig ' , CC_bis, ' wasm v orig ', CC_wasm);
        assert.equal(true,CC_wasm>0.85);
        done();

    });

    it('check histogram segmentation ',function(done) {
        console.log('\n\n-----------------------------------------------------------------------------------------------\n');


        let obj = {
            "numclasses" : 3 ,
            "maxsigmaratio" : 0.2,
            "smoothness" : 0.0,
            "robust"  : false,
            "smoothhisto" : false,
        };

        
        let wasm_img=libbiswasm.segmentImageWASM(images[4],obj,1);
        console.log('Out dims=', wasm_img.getDescription());
        
        let CC=bisimagesmoothreslice.computeCC(images[5].getImageData(),wasm_img.getImageData());
        
        console.log('----- CC=',CC);
        assert.equal(true,CC>0.98);
        done();

    });

    it('check mrf segmentation ',function(done) {
        console.log('\n\n-----------------------------------------------------------------------------------------------\n');

        

        let obj = {
            "numclasses" : 3 ,
            "maxsigmaratio" : 0.2,
            "smoothness" : 100.0,
            "robust"  : false,
            "smoothhisto" : false,
            "mrfiterations": 8,
            "noisesigma2" : 1000.0,
            "internaliterations" : 12,
        };

        
        let wasm_img=libbiswasm.segmentImageWASM(images[4],obj,1);
        console.log('Out dims=', wasm_img.getDescription());

        let CC_o=bisimagesmoothreslice.computeCC(images[5].getImageData(),images[6].getImageData());
        let CC_h=bisimagesmoothreslice.computeCC(images[5].getImageData(),wasm_img.getImageData());
        let CC=bisimagesmoothreslice.computeCC(images[6].getImageData(),wasm_img.getImageData());
        
        console.log('----- CC=',CC, ' vs  CC_o (bis h v mrf)=',CC_o,' vs CC_h (wasm mrf v bis h)=' ,CC_h);
        assert.equal(true,CC>0.98);
        done();

    });


});




