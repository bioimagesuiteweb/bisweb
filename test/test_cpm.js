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
const numeric=require('numeric');
const libbiswasm=require('libbiswasm_wrapper');
const BisWebMatrix=require('bisweb_matrix');
const util=require('bis_util');

numeric.precision = 2;

const truedim = [ [ 5,3 ],[ 5,1]];// [ [ 50, (268*267)/2 ], [ 50 , 1 ]];

let printmatrix=function(mat) {

    let dim=mat.getDimensions();
    let dat=mat.data;
    let out='';

    for (let row=0;row<dim[0];row++) {
        out+='[ ';
        for (let col=0;col<dim[1];col++) {
            out+=dat[row*dim[1]+col];
            if (col<(dim[1]-1))
                out+='\t';
        }
        out+=']\n';
    }
    return out;
}

describe('Testing CPM Code', function() {


    let matrices = [ new BisWebMatrix(),new BisWebMatrix() ];
    let names = [ 'connectome.txt','phenotype.txt' ];
    let fullnames = [ '','','',''   ];
    for (let i=0;i<=1;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/cpm/'+names[i]);

    before(function(done){
        let p=[ matrices[0].load(fullnames[0]),
                matrices[1].load(fullnames[1]),
                libbiswasm.initialize()  ];
        Promise.all(p).then( () => {

            console.log('Mat 0=',printmatrix(matrices[0]));
            console.log('Mat 1=',printmatrix(matrices[1]));
            done();
        });
    });
    

    it ('check loading',function() {


        
        let diff=0;
        
        for (let i=0;i<=1;i++) {
            let s=matrices[i].getDimensions();
            console.log('Loaded ',fullnames[0],' ' ,matrices[i].getDescription(),' should be=',truedim[i]);
            diff+=Math.abs(truedim[i][0]-s[0])+Math.abs(truedim[i][1]-s[1]);
        }
        assert.equal(diff, 0);
    });


    it ('check cpm',function() {
        let v=libbiswasm.computeCPMWASM(matrices[0],matrices[1], { "numnodes" : 3 } , 1);
        console.log('Result=',v.getDescription());
        console.log('Inp v Predicted');
        let d=v.getDimensions();
        console.log('D=',d);
        for (let i=0;i<d[0];i++) {
            console.log('i=',i,d[0]);
            console.log(i,' ',matrices[1].data[i],' vs', v.data[i]);
        }
    });
        
});

