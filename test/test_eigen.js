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
const bistransforms=require('bis_transformationutil');
const path=require('path');
const numeric=require('numeric');
const BisWebMatrix=require('bisweb_matrix');
const genericio = require('bis_genericio');
const libbiswasm=require('libbiswasm_wrapper');

numeric.precision=3;

let reslice_matr = [ [  0.866,  -0.525  , 0.000,  68.758 ],
                     [  0.500,   0.909 ,  0.000 ,  9.793 ],
                     [ 0.000,   0.000 ,  1.000 ,  2.250 ],
                     [ 0.000,   0.000,   0.000 ,  1.000  ]];

let reslice_transform=bistransforms.createLinearTransformation();
reslice_transform.setMatrix(reslice_matr);

let orig_c=null;

describe('Testing eigen numerical library and matlab parsing\n', function() {

    this.timeout(500000);
    before(function(done){
        
        BisWebMatrix.loadNumericMatrix(path.resolve(__dirname, 'testdata/matrix.csv')).then( (obj)=> {
            orig_c=obj.data;
            libbiswasm.initialize().then( () => { done();});
        });

    });

    it('read matr',function(done) {
        const filename=path.resolve(__dirname, 'testdata/Test_bis_glm.matr');
        genericio.read(filename).then( (obj) => {

            let d1=obj.data;
            let lines=d1.split("\n");
            
            let out=BisWebMatrix.parseMatrFile(d1);

            //left in so matrix serialization gets tested but removed assignment
            BisWebMatrix.serializeMatrFile(out);
            let out2=BisWebMatrix.parseMatrFile(d1);
            
            console.log('String inp=',lines[10].trim().split(" "));
            console.log('Parse =',out[5]);
            console.log('Parse, serialize and reparse=',out2[5]);
            
            let error0=numeric.norminf(numeric.sub(out,out2));
            
            console.log('serialize deserialize error=',error0);
            
            assert.equal(true,error0<0.01);
            done();
        });
    });
    

    it('wasm eigen matrix utilities',function() {
        
        let m=numeric.identity(4);
        for (let row=0;row<=3;row++) {
            for (let col=0;col<=3;col++) {
                m[row][col]=(1.0+row)*10.0+col*col*5.0;
            }
        }

        let xform=bistransforms.createLinearTransformation();
        xform.setMatrix(m);
        console.log('First print to check ...\n',xform.legacySerialize());

        let f_m=new BisWebMatrix('vector',[1,2,3,5,7,11]);
        
        let numfailed=libbiswasm.test_eigenUtils(xform,f_m,1);
        console.log('\t From JS to C++, numfailed=',numfailed);

        libbiswasm.get_module()._print_memory();

        assert.equal(0,numfailed);
        
    });


    it('wasm eigen matlab2',function(done) {


        let orig_a= [ [  1.0000,    2.0000,    3.0000 ],
                      [ 0.1000,    0.2000,    0.3000 ],
                      [ 10.1000,   10.2000,   10.4000 ] ];

        console.log('Orig=',numeric.prettyPrint(orig_a),'\n');
        
        const filename=path.resolve(__dirname, 'testdata/small.mat');
        genericio.read(filename,true).then( (obj) => {
            let d1 = obj.data;
            let arr=new Uint8Array(d1);

            const matr=libbiswasm.parseMatlabV6WASM(arr,{ name : 'a'},1).getNumericMatrix();
            console.log('Output=',numeric.prettyPrint(matr));
            
            let error0=numeric.norminf(numeric.sub(matr,orig_a));
            console.log('error=',error0);
            
            assert.equal(true,error0<0.01);
            done();
        });
    });
    
    it('wasm eigen matlab3',function(done) {
        
        let orig_c= [ [ 10.0026, 9.0015, 8.0085, 7.0024, 1.0090, 2.0037, 3.0010, 4.0023 ],
                      [ 0.2180, 0.4014, 0.2062, 0.3012, 0.1094, 0.4011, 0.2013, 0.3035 ],
                      [ 1.0043, 2.0087, 3.0035, 0.4118, 1.0049, 2.0078, 3.0094, 4.4082 ],
                      [ 0.1091, 0.4058, 0.2051, 0.3024, 0.1049, 0.4039, 0.2096,   -1.9998 ],
                      [  1.0018, 2.0055, 3.0040, 4.0042, 1.0034, 2.0024, 3.0058, 4.0004 ],
                      [  0.1026, 0.4014, 0.2008, 0.3005, 0.1090, 0.4040, 0.2006,  -1.0983 ]];

        console.log('Orig=',numeric.prettyPrint(orig_c),'\n');
        
        const filename=path.resolve(__dirname, 'testdata/small.mat');
        genericio.read(filename,true).then( (obj) => {
            let d1=obj.data;
            let arr=new Uint8Array(d1);
            
            const matr=libbiswasm.parseMatlabV6WASM(arr,{ "name" : "c"},1).getNumericMatrix();
            console.log('Output=',numeric.prettyPrint(matr),'\n');
            
            console.log('\n Diff=',numeric.prettyPrint(numeric.sub(matr,orig_c)));
            
            let error0=numeric.norminf(numeric.sub(matr,orig_c));
            console.log('\nerror=',error0);
            
            assert.equal(true,error0<0.1);
            done();
        });
    });


    it('wasm eigen matlab4',function(done) {
        

        console.log('Orig=',numeric.prettyPrint(orig_c),'\n');
        
        const filename=path.resolve(__dirname, 'testdata/small.mat');
        genericio.read(filename,true).then( (obj) => {
            let d1=obj.data;
            
            let arr=new Uint8Array(d1);
            
            let name="c";
            let debug=0;
            let wasm_out=libbiswasm.test_matlabParse(arr,new BisWebMatrix('matrix',orig_c),name,debug);
            
            assert.equal(true,wasm_out<0.1);
            done();
        });
    });

    it('wasm ptz conversions',function() {
        let numfailed=libbiswasm.test_PTZConversions(1);
        assert.equal(numfailed,0);
    });


    it('wasm eigen util operations',function() {

        let numfailed=libbiswasm.test_eigenUtilOperations(0);
        assert.equal(numfailed,0);
    });

    it('test wasm call',function() {
        const yale=libbiswasm.test_wasm(1);
        console.log('Yale was founded in ',yale);
        assert.equal(yale,1701);
    });

    it('write matr',function() {
        let matrix=new BisWebMatrix('matrix',reslice_matr);
        console.log(matrix.getDescription(), matrix.data[10]);
        let s=libbiswasm.createMatrixTextFileWASM(matrix,'myname',0,0);
        console.log("Exported \ns=",s);
        let error0=0;
        
        assert.equal(true,error0<0.01);
    });

    it('write matr 2',function(done) {

        let matrix=new BisWebMatrix();
        matrix.load(path.resolve(__dirname, 'testdata/Test_bis_glm.matr')).then( () => {
            console.log(matrix.getDescription());
            let s=libbiswasm.createMatrixTextFileWASM(matrix,'myname',0,0);
            let tt=BisWebMatrix.parseMatrFile(s);
            console.log('Parsed = ',numeric.dim(tt));
            console.log(tt[0],tt[1],tt[2]);
            let newmat=new BisWebMatrix('matrix',tt);
            let comp=matrix.compareWithOther(newmat);
            console.log("Test done",JSON.stringify(comp));
            assert.equal(true,comp.testresult);
            done();
        }).catch( (e) => {
            console.log(e);
            assert.equal(true,false);
            done(false);
        });
    });

});
