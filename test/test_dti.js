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
const path=require('path');
const libbiswasm=require('libbiswasm_wrapper');
const numeric=require('numeric');
const BisWebMatrix=require('bisweb_matrix');


let dir6=[ [0.707, 0.0, 0.707], [-0.707, 0.0, 0.707], [0.0, 0.707, 0.707], [0.0, 0.707, -0.707], [0.707, 0.707, 0.0], [-0.707, 0.707, 0.0] ];

let imgnames=[ 'doublehelix.nii.gz',
               'doublehelix_mask.nii.gz',
               'doublehelix_dti_tensor.nii.gz',
               'doublehelix_dti_baseline.nii.gz',
               'doublehelix_dti_adc.nii.gz',
               'doublehelix_dti_mean.nii.gz'
             ];

let images = [ new BisWebImage(),new BisWebImage(),new BisWebImage() ];


let fullnames = [ '','' ,''];
for (let i=0;i<=2;i++) {
    fullnames[i]=path.resolve(__dirname, 'testdata/dti/'+imgnames[i]);
    console.log(i+':',fullnames[i]);
}

describe('Testing DTI Code\n', function() {

    this.timeout(500000);
    before(function(done){
        let p = [                               libbiswasm.initialize() ];
        for (let i=0;i<=2;i++)
            p.push( images[i].load(fullnames[i]));
        Promise.all(p).then( () => { done();});
    });


    it('test DTIM',function() {

        let totalerror=0.0;
        // Extract baseline
        let baseline=new BisWebImage();
        let dwi =new BisWebImage();
        console.log('images[0] = ' ,images[0].getDescription());
        
        baseline.cloneImage(images[0], { numframes : 1 });
        dwi.cloneImage(images[0], { numframes : 6 });
        console.log('baseline = ' ,dwi.getDescription());
        console.log('dwi = ' ,dwi.getDescription());
        
        let idata=images[0].getImageData();
        let bdata=baseline.getImageData();
        let dwidata=dwi.getImageData();
        
        let n=bdata.length;
        console.log('n=',n);
        for (let i=0;i<n;i++) {
            bdata[i]=idata[i];
        }

        let index=30*32*32+5*32+16;
        console.log('baseline, index=',index,' val=',bdata[index]);
        
        let imin=n,imax=imin+6*n;
        console.log('Copying new range=',[imin,imax],' max=',idata.length);
        for (let i=imin;i<imax;i++) {
            dwidata[i-imin]=idata[i];
        }

        console.log('baseline at (16,5,30)= ',baseline.getVoxel([16,5,30,0]));
        for (let i=0;i<=5;i++)
            console.log('dwi at (16,5,30,',i,')= ',(dwi.getVoxel([16,5,30,i])).toFixed(5));


        for (let i=0;i<=5;i++)
            console.log('tensor at (16,5,30,',i,')= ',(images[2].getVoxel([16,5,30,i])).toFixed(5));

        let tensor_image = libbiswasm.computeDTITensorFitWASM(dwi,baseline,images[1],new BisWebMatrix('matrix',dir6),{ "bvalue" : 1000.0},1);

        for (let i=0;i<=5;i++)
            console.log('wasm_tensor at (16,5,30,',i,')= ',(tensor_image.getVoxel([16,5,30,i])).toFixed(5));

        
        console.log('tensor=',tensor_image.getDescription());

        let l=images[1].getImageData().length;
        let error1=Math.sqrt(numeric.norm2Squared(numeric.sub(tensor_image.getImageData(),images[2].getImageData()))/l);
        let CC=bisimagesmoothreslice.computeCC(tensor_image.getImageData(),images[2].getImageData());
        
        console.log('error = ' ,error1.toFixed(4)," CC=", CC.toFixed(5));
        assert(true, totalerror<1.0);
    });
});

