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
const numeric=require('numeric');
const libbiswasm=require('libbiswasm_wrapper');

numeric.precision=3;

let reslice_matr = [ [  0.866,  -0.525  , 0.000,  68.758 ],
                     [  0.500,   0.909 ,  0.000 ,  9.793 ],
                     [ 0.000,   0.000 ,  1.000 ,  2.250 ],
                     [ 0.000,   0.000,   0.000 ,  1.000  ]];

let reslice_transform=bistransforms.createLinearTransformation();
reslice_transform.setMatrix(reslice_matr);


describe('Testing linear transformation (bis_transformationutil.js) and image resampling/reslicing (bis_imagesmoothresample.js)\n', function() {

    this.timeout(50000);
    let images = [ new BisWebImage(),new BisWebImage(),new BisWebImage() ];
    let imgnames = [ 'avg152T1_LR_nifti.nii.gz', // 0
                     'avg152T1_LR_nifti_resampled.nii.gz', //1
                     'avg152T1_LR_nifti_resampled_resliced.nii.gz', //2
                   ];
    
    let fullnames = [ '','',''];
    for (let i=0;i<=2;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    

    before(function(done){
        let p=[ libbiswasm.initialize() ];
        for (let i=0;i<=2;i++) {
            p.push(images[i].load(fullnames[i]));
        }
        Promise.all(p).then( () => { done(); });
    });

    
    it('test image reslice linear js v wasm',function() {
        console.log('\n\n');
        this.slow(10);
        let ref_image=images[1], targ_image=images[0], true_image=images[2];
        let resliced=new BisWebImage(); resliced.cloneImage(ref_image, { type : 'float' });
        
        bisimagesmoothreslice.resliceImage(targ_image,resliced,reslice_transform,1);

        let dimensions= ref_image.getDimensions();
        let spacing=ref_image.getSpacing();

        let resliceW=libbiswasm.resliceImageWASM(targ_image,reslice_transform,{ "interpolation" : 1,
                                                                                "dimensions" : dimensions,
                                                                                "spacing": spacing},2);
        console.log('resliceW=',resliceW.getDescription());
        console.log('resliced=',resliced.getDescription());

        console.log('\n');
        let CC=bisimagesmoothreslice.computeCC(true_image.getImageData(),resliced.getImageData());
        let CCWJ=bisimagesmoothreslice.computeCC(resliceW.getImageData(),resliced.getImageData());
        let CCW=bisimagesmoothreslice.computeCC(true_image.getImageData(),resliceW.getImageData());
        assert.equal(true,(CC>0.999 && CCWJ>0.999));

        console.log('++++ Correlation (linear interpolation) JS=',CC.toFixed(4),' WASM=',CCW.toFixed(4),", ( JS vs Wasm = ", CCWJ.toFixed(4),  ")\n");
    });



});
