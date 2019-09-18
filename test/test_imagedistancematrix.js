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
const BisWebMatrix=require('bisweb_matrix');
const path=require('path');
const os=require('os');
const libbiswasm=require('libbiswasm_wrapper');

let gold = [ new BisWebMatrix(),
             new BisWebMatrix()];
let matnames = [ 'sparse.matr',
                 'radius.matr' ];

let img=null,obj=null,indexmap=null;

describe('Testing imageDistanceMatrix stuff\n', function() {

    this.timeout(50000);
    
    before(function(done){

        for (let i=0;i<=1;i++) 
            matnames[i]=path.resolve(__dirname, 'testdata/distancematrix/'+matnames[i]);


        let p = [ libbiswasm.initialize() ,
                  gold[0].load(matnames[0]),
                  gold[1].load(matnames[1])
                ];

        img=new BisWebImage();
        img.createImage( {
            type : 'float',
            dimensions : [ 5,5,1],
            spacing : [ 2.0,2.0,2.0 ]
        });
        console.log(img.getDescription());

        let dat=img.getImageData();
        for (let i=0;i<25;i++)
            dat[i]=i;

        obj=new BisWebImage();
        obj.createImage( {
            type : 'short',
            dimensions : [ 5,5,1],
            spacing : [ 2.0,2.0,2.0 ]
        });

        indexmap=new BisWebImage();
        indexmap.cloneImage(obj);

        console.log(obj.getDescription());
        let odat=obj.getImageData();
        let idat=indexmap.getImageData();
        let index=1;
        for (let j=0;j<5;j++) {
            for (let i=0;i<5;i++) {
                if (i>=1 && i<4 && j>=1 && j<4) {
                    odat[i+j*5]=1;
                    idat[i+j*5]=index;
                    index=index+1;
                } else {
                    odat[i+j*5]=0;
                }
            }
        }
        console.log(idat);
        console.log(odat);

        
        Promise.all(p).then( () => { done(); });
    });

    it ('test distmatrix1',async function() {

        let out=await libbiswasm.computeImageIndexMapWASM(obj,true);
        console.log(out.getDescription());
        let result=out.compareWithOther(indexmap);
        console.log(result);
        assert.equal(true,result.testresult);

    });

    it ('test distmatrix2',async function() {


        let out2=await libbiswasm.computeImageDistanceMatrixWASM(img,obj,{ "useradius" : true,
                                                                           "radius" : 3.0,
                                                                           "numthreads" : 1
                                                                         },0);
        console.log(out2.getDescription());
        let result=out2.compareWithOther(gold[0]);
        console.log(result);
        assert.equal(true,result.testresult);

    });

    it ('test distmatrix3',async function() {
        let out3=await libbiswasm.computeImageDistanceMatrixWASM(img,obj,{ "useradius" : false,
                                                                           "sparsity" : 0.1,
                                                                           "numthreads" : 1
                                                                         },0);
        console.log(out3.getDescription());
        let result=out3.compareWithOther(gold[1]);
        console.log(result);
        assert.equal(true,result.testresult);
    });
});
