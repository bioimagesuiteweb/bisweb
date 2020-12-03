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
const libbiswasm=require('libbiswasm_wrapper');
const tempfs = require('temp').track();

const tmpDirPath=tempfs.mkdirSync('test_image');
const tmpFname1=path.resolve(tmpDirPath,'matrix1.binmatr');
const tmpFname2=path.resolve(tmpDirPath,'matrix2.binmatr');

let gold = [ new BisWebMatrix(),
             new BisWebMatrix(),
             new BisWebMatrix()];
let matnames = [ 'sparse.matr',
                 'radius.matr' ,
                 'radius2.matr' ];

let img=null,obj=null,indexmap=null;

describe('Testing imageDistanceMatrix stuff\n', function() {

    this.timeout(50000);
    
    before(function(done){

        for (let i=0;i<=2;i++) 
            matnames[i]=path.resolve(__dirname, 'testdata/distancematrix/'+matnames[i]);


        let p = [ libbiswasm.initialize() ,
                  gold[0].load(matnames[0]),
                  gold[1].load(matnames[1]),
                  gold[2].load(matnames[2])
                ];

        img=new BisWebImage();
        img.createImage( {
            type : 'float',
            dimensions : [ 5,5,1],
            spacing : [ 2.0,2.0,2.0 ]
        });
        console.log('....',img.getDescription());

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

        console.log('....',obj.getDescription());
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
        console.log('____',idat);
        console.log('____',odat);

        
        Promise.all(p).then( () => {

            console.log('\n\n---------------------------------------------------\n\n');
            done();
        });
    });

   it ('test distmatrix1',function() {

       return new Promise( (resolve) => {
           let out=libbiswasm.computeImageIndexMapWASM(obj,true);
           let result=out.compareWithOther(indexmap);
           console.log('....',result);
           assert.equal(true,result.testresult);
           resolve();
       });
    });

    it ('test distmatrix2',function() {

        return new Promise( (resolve) => {

            let out2=libbiswasm.computeImageDistanceMatrixWASM(img,obj,
                                                      { "useradius" : true,
                                                        "radius" : 3.0,
                                                        "numthreads" : 1
                                                      },0);
            let result=out2.compareWithOther(gold[0]);
            console.log('....',result);
            assert.equal(true,result.testresult);
            resolve();
        });
        
    });

    it ('test distmatrix3',function() {
        return new Promise( (resolve) => {
            let out3=libbiswasm.computeImageDistanceMatrixWASM(img,obj,{ "useradius" : false,
                                                                         "sparsity" : 0.1,
                                                                         "numthreads" : 1
                                                                       },1);

            let result=out3.compareWithOther(gold[2]);
            console.log('....',result,' type=',out3.data.constructor.name,out3.datatype);
            assert.equal(true,result.testresult);
            resolve();
        });
    });

    it ('test load and save',function() {
        return new Promise( (resolve) => {
            gold[1].save(tmpFname1).then( () => {
                let sample =  new BisWebMatrix();
                //            gold[1].save('sample.binmatr').then( () => {
                sample.load(path.resolve(__dirname, 'testdata/distancematrix/sample.binmatr')).then( () => {
                    
                    let newmatr=new BisWebMatrix();
                    newmatr.load(tmpFname1).then( () => {
                        let result=newmatr.compareWithOther(gold[1]);
                        let result2=sample.compareWithOther(gold[1]);
                        console.log('....',result,result2);
                        let ok=false;
                        if (result.testresult && result2.testresult)
                            ok=true;
                        assert.equal(true,ok);
                        resolve();
                    });
                });
            });
        });
    });

    it ('test load and save double', function() {
        return new Promise( (resolve) => {
            let sample =  new BisWebMatrix();
            sample.load(path.resolve(__dirname, 'testdata/distancematrix/double.binmatr')).then( () => {
                sample.save(tmpFname2).then( () => {
                    let newmatr=new BisWebMatrix();
                    newmatr.load(tmpFname2).then( () => {
                        let result=newmatr.compareWithOther(sample);
                        let result2=sample.compareWithOther(gold[1]);
                        console.log('....',result,result2);
                        let ok=false;
                        if (result.testresult && result2.testresult)
                            ok=true;
                        assert.equal(true,ok);
                        resolve();
                    });
                });
            });
        });
    });

});
