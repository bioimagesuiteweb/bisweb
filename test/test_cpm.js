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


numeric.precision = 2;

const truedim = [ [ 5,3 ],[ 5,1]];// [ [ 50, (268*267)/2 ], [ 50 , 1 ]];

let printmatrix=function(mat) {

    let dim=mat.getDimensions();
    let dat=mat.data;
    let out='\t\n';

    for (let row=0;row<dim[0];row++) {
        out+='\t[ ';
        for (let col=0;col<dim[1];col++) {
            out+=dat[row*dim[1]+col];
            if (col<(dim[1]-1))
                out+='\t';
        }
        out+=' ]\n';
    }
    return out;
};

describe('Testing CPM Code', () => {


    let matrices = [ new BisWebMatrix(),new BisWebMatrix(),new BisWebMatrix(),
                     new BisWebMatrix(),new BisWebMatrix(),new BisWebMatrix(),
                   ];
    let names = [ 'connectome.txt','phenotype.txt', 'result.csv' ,
                  'connectome2.csv','phenotype2.csv', 'result2.csv' ,
                ];
    let fullnames = [ '','','','' ,'','',''  ];
    for (let i=0;i<=5;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/cpm/'+names[i]);

    before( async () => {

        await libbiswasm.initialize();
        for (let i=0;i<=5;i++) 
            await matrices[i].load(fullnames[i]);

        console.log('Small Conenctome=',printmatrix(matrices[0]));
        console.log('Small Phenotype=',printmatrix(matrices[1]));
        console.log('Small Expected Result=',printmatrix(matrices[2]));
        return Promise.resolve('done');
    });
    

    it ('check loading',() => {
        let diff=0;
        
        for (let i=0;i<=1;i++) {
            let s=matrices[i].getDimensions();
            console.log('Testing dimensions of ',fullnames[i],' ' ,matrices[i].getDescription(),' should be=',truedim[i]);
            diff+=Math.abs(truedim[i][0]-s[0])+Math.abs(truedim[i][1]-s[1]);
        }
        assert.equal(diff, 0);
    });


    it ('check cpm',() => {
        console.log('___________________________________');
        console.log('        Invoking CPM C++ Code      ');
        console.log('___________________________________');

        let pred=libbiswasm.computeCPMWASM(matrices[0],matrices[1],
                                        {
                                            "numnodes" : 3,
                                            "numtasks" : 0,
                                        } , 0);
        console.log('___________________________________');
        console.log('         CPM Done');
        console.log('___________________________________');
        console.log('Prediced Result=',printmatrix(pred));
        let res=pred.compareWithOther(matrices[2],"maxabs",0.05);
        console.log('Test result=', JSON.stringify(res,null,2));
        assert.equal(res.testresult,true);
    });

    it ('check cpm large',() => {
        console.log('___________________________________');
        console.log('        Invoking CPM C++ Code      ');
        console.log('___________________________________');
        
        let pred=libbiswasm.computeCPMWASM(matrices[3],matrices[4],
                                           {
                                               "numnodes" : 268,
                                               "numtasks" : 0,
                                               "kfold" : 3,
                                           } , 0);
        console.log('___________________________________');
        console.log('         CPM Done');
        console.log('___________________________________');
        console.log('Prediced Result=',printmatrix(pred));
        let res=pred.compareWithOther(matrices[5],"maxabs",0.05);
        console.log('Test result=', JSON.stringify(res,null,2));
        assert.equal(res.testresult,true);
    });

});

