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
const path=require('path');
const numeric = require('numeric');
const libbiswasm=require('libbiswasm_wrapper');
const BisWebImage=require('bisweb_image');

describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n      ++++ check loading and slicing\n',
         function() {       // jshint ignore:line
             this.timeout(50000);            
             let images = [ new BisWebImage(),new BisWebImage(), new BisWebImage(),new BisWebImage(),new BisWebImage(), new BisWebImage(),new BisWebImage()];
             
             let imgnames = [ 'ras_avg152T1_LR_nifti.nii.gz',
                              'ras152_slicek18.nii.gz',
                              'ras152_slicej54.nii.gz',
                              'ras152_slicei56.nii.gz' ];
             
             
             
             let fullnames = [ '','','','',''];
             let slicepairs = [ [1,2,18],[2,1,54], [ 3,0,56 ]];
             
             
             for (let i=0;i<=3;i++)
                 fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
             
             
             before(function(done){
                 let all_done=function() {   done(); };
                 let p=[ libbiswasm.initialize() ];
                 for (let i=0;i<=3;i++)
                     p.push(images[i].load(fullnames[i],false));
                 Promise.all(p)
                     .then(all_done)
                     .catch( (e) => { console.log('Failed '+e); process.exit(1); });
             });
             
             let compimages=function(index,plane,slice) {
                 
                 console.log('\n\n-----------------------------------------------------------------------------------------------\n');
                 console.log('----- Slice compare index=',index,' slice=',slice,' plane=',plane);
                 
                 let slice_img=libbiswasm.extractImageSliceWASM(images[0],
                                                                { plane : plane,
                                                                  slice : slice,
                                                                  frame : 0,
                                                                  component : 0},1);
                 
                 console.log('\n----- Image dimensions=',images[0].getDimensions(),', slice=',images[index].getDimensions(),' indim=',images[index].getDimensions());
                 console.log('\n----- Sliced dimensions=',slice_img.getDimensions());

                 let error0=numeric.norm2(numeric.sub(slice_img.getImageData(),images[index].getImageData()));
                 console.log('----- error_norm=',error0);
                 return error0;
             };
             
             it('check if slice '+slicepairs[0]+' is correct ',function() {
                 let error=compimages(slicepairs[0][0],slicepairs[0][1],slicepairs[0][2],true);
                 assert.equal(0,error);
             });
             
             it('check if slice '+slicepairs[1]+' is correct ',function() {
                 let error=compimages(slicepairs[1][0],slicepairs[1][1],slicepairs[1][2],true);
                 assert.equal(0,error);
                 
             });

             
             it('check if slice '+slicepairs[2]+' is correct ',function() {
                 let error=compimages(slicepairs[2][0],slicepairs[2][1],slicepairs[2][2],true);
                 assert.equal(0,error);
             });
             
         });




