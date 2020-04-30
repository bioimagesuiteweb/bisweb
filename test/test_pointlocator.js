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
const genericio=require('bis_genericio');
const BisWebMatrix=require('bisweb_matrix');
const path=require('path');
const numeric=require('numeric');
const libbiswasm=require('libbiswasm_wrapper');

numeric.precision=3;

//https://stackoverflow.com/questions/3730510/javascript-sort-array-and-return-an-array-of-indicies-that-indicates-the-positi
const sort_indices=function(test) {

    let len = test.length;
    let indices = new Array(len);
    for (let  i = 0; i < len; ++i)
        indices[i] = i;
    indices.sort(function (a, b) { return test[a] < test[b] ? -1 : test[a] > test[b] ? 1 : 0; });
    return indices;
};

const sort_indices_mat=function(test) {

    let len = test.length;
    let indices = new Array(len);
    for (let  i = 0; i < len; ++i)
        indices[i] = i;
    indices.sort(function (a, b) { return test[a][3] < test[b][3] ? -1 : test[a][3] > test[b][3] ? 1 : 0; });
    return indices;
};

describe('Testing point locator\n', function() {

    this.timeout(50000);    
    let surfacename=path.resolve(__dirname, 'testdata/pointlocator/brain.json');
    let source_pts=new BisWebMatrix();
    let resultnames = [
        path.resolve(__dirname, 'testdata/pointlocator/result.json'),
        path.resolve(__dirname, 'testdata/pointlocator/result2.json'),
        path.resolve(__dirname, 'testdata/pointlocator/result3.json')
    ];
    let all_results=[0,0,0];
    
    before( async function() {

        await libbiswasm.initialize();

        let obj=await genericio.read(surfacename);
        let points=JSON.parse(obj.data)['points'];
        let nt=points.length;
        let np=Math.round(nt/3);
        console.log('Number of points=',np,np*3,nt, np*3-nt);

        source_pts.zero(np,3);
        let arr=source_pts.getDataArray();
        for (let i=0;i<nt;i++)
            arr[i]=points[i];

        for (let i=0;i<=2;i++) {
            let obj=await genericio.read(resultnames[i]);
            all_results[i]=JSON.parse(obj.data);
            if (i<2)
                console.log(JSON.stringify(all_results[i]));
        }
        
        return Promise.resolve('done');
    });

    

    it('wasm test Nearest Point',function() {
        
        let results=all_results[0];
        let passed=0;
        let tested=0;
        let numtestpoints=results['points'].length;
        for (let i=0;i<numtestpoints;i++) { 
            console.log('____________________________________________________');
            console.log('\n');
            console.log('Point '+(i+1)+' (location) = ', results['points'][i]['location']);
            console.log('\t (nearest) ', results['points'][i]['nearest']);


            let x=results['points'][i]['location'][0];
            let y=results['points'][i]['location'][1];
            let z=results['points'][i]['location'][2];
            let out = libbiswasm.testPointLocatorWASM(source_pts,    {
                "mode" : 0,
                "x" : x,
                "y" : y,
                "z" : z,
                "length" : 0.2
            },1).getDataArray();
            
            let gold = results['points'][i]['nearest'];
            let sum=0.0;
            for (let ia=0;ia<=2;ia++) 
                sum=sum+Math.abs(gold[ia]-out[ia]);
            
            console.log('\t output=',out,' gold=',gold,' diff=',sum);
            tested=tested+1;
            
            if (sum<0.01) {
                passed=passed+1;
                console.log('_____ P A S S E D ____\n');
            } else {
                console.log('_____ F A I L E D ____\n');
            }
        }
        console.log('__________________________________________________________');
        assert.equal(passed,tested);

        
    });

    it('wasm test Threshold Nearest Points',function() {

        let passed=0;
        let tested=0;

        let maxjob=all_results.length;
        for (let job=0;job<maxjob;job++) {
            let results=all_results[job];
            let numtestpoints=results['points'].length;

            for (let i=0;i<numtestpoints;i++) { 
                console.log('____________________________________________________');
                console.log('\n');
                console.log('Point '+(i+1)+' (location) = ', results['points'][i]['location']);
                console.log('\t (nearest) ', results['points'][i]['nearest']);
                console.log('\t (numneighbors) ', results['points'][i]['numneighbors']);
                console.log('\t (neighbors) ', results['points'][i]['neighbors']);

                let x=results['points'][i]['location'][0];
                let y=results['points'][i]['location'][1];
                let z=results['points'][i]['location'][2];
                let outpoints = libbiswasm.testPointLocatorWASM(source_pts,    {
                    "mode" : 1,
                    "x" : x,
                    "y" : y,
                    "z" : z,
                    "length" : 0.2,
                    "threshold" : results['threshold']
                },0).getDataArray();

                let outindices = libbiswasm.testPointLocatorWASM(source_pts,    {
                    "mode" : 2,
                    "x" : x,
                    "y" : y,
                    "z" : z,
                    "length" : 0.2,
                    "threshold" : results['threshold']
                },0).getDataArray();

                let gold = results['points'][i]['neighbors'];
                
                const gold_sorted=sort_indices_mat(gold);
                const output_sorted=sort_indices(outindices);
                
                tested=tested+1;
                if (results['points'][i]['numneighbors']>0) {
                    let l=outindices.length;
                    let maxd=0.0;
                    for (let i=0;i<l;i++) {
                        let gold_row=gold_sorted[i];
                        let out_row=output_sorted[i];
                        
                        let x=[0,0,0,0];
                        let y=[0,0,0,0];
                        for (let ia=0;ia<=3;ia++) {
                            if (ia<=2) 
                                x[ia]=outpoints[out_row*3+ia];
                            else
                                x[3]=outindices[out_row];
                            y[ia]=gold[gold_row][ia];
                            let v=Math.abs(x[ia]-y[ia]);
                            if (v>maxd)
                                maxd=v;
                        }
                        console.log(' Point '+i+' gold=',y,' computed=',x);
                    }
                    console.log('Difference',maxd);
                    if (maxd<0.001) {
                        console.log('_____ P A S S E D ____\n');
                        passed=passed+1;
                    } else {
                        console.log('_____ F A I L E D ____\n');
                    }
                } else {
                    if (outindices[0]==-1) {
                        passed=passed+1;
                        console.log('No Neighbors found',outindices);
                        console.log('_____ P A S S E D ____\n');
                    } else {
                        console.log('_____ F A I L E D ____\n');
                    }
                }
            }
        }
        console.log('__________________________________________________________');
        assert.equal(passed,tested);
        

    });

});
