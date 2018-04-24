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
const bisimagesmoothreslice=require('bis_imagesmoothreslice');
const BisWebImage=require('bisweb_image');
const path=require('path');
const libbiswasm=require('libbiswasm_wrapper');
const numeric=require('numeric');
const BisWebMatrix=require('bisweb_matrix');
const genericio = require('bis_genericio');



let images = [ new BisWebImage(),new BisWebImage() ];
let imgnames = [ 'glm/Test_allruns.nii.gz', 'glm/test_beta.nii.gz'];

let matname=path.resolve(__dirname, 'testdata/glm/Test_bis_glm.matr' );

let fullnames = [ '','' ];
for (let i=0;i<=1;i++) {
    fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    console.log(i+':',fullnames[i]);
}



let glm_matrix=null;



describe('Testing fMRI GLM Code\n', function() {

    this.timeout(500000);
    before(function(done){
        console.log('matname=',matname);        
        genericio.read(matname).then( (obj) => {
            let d1=obj.data;
            glm_matrix=BisWebMatrix.parseMatrFile(d1);
            console.log("GLM Matrix loaded=",numeric.dim(glm_matrix));
            for (let j=0;j<180;j+=40)
                console.log(glm_matrix[j]);
            
            let p = [ libbiswasm.initialize() ];
            for (let i=0;i<=1;i++)
                p.push( images[i].load(fullnames[i]));
            Promise.all(p).then( () => {
                done();
            });
        });
    });

    it('test GLM',function() {

        console.log('Working on ',images[1].getDescription());
        let y=6;
        let z=6;
        for (let x=2;x<=12;x+=3) {
            for (let k=0;k<=2;k++) {
                console.log('Get beta at ', [x,y,z,k],' = ',images[1].getVoxel([x,y,z,k]).toFixed(4));
            }
        }
        

        
        let out=libbiswasm.computeGLMWASM(images[0],0,new BisWebMatrix('matrix',glm_matrix),
                                          { "numtasks" :3, "usemask": false },
                                          1);
        console.log('out=',out.getDescription());
        for (let x=2;x<=12;x+=3) {
            for (let k=0;k<=2;k++) {
                console.log('Get beta at ', [x,y,z,k],' = ',out.getVoxel([x,y,z,k]).toFixed(4),',   diff=',(out.getVoxel([x,y,z,k])-images[1].getVoxel([x,y,z,k])).toFixed(6));
            }
        }

        let CC=bisimagesmoothreslice.computeCC(out.getImageData(),images[1].getImageData());
        console.log("Result of GLM CC=",CC.toFixed(3));
        assert(true, CC>0.9999);
    });





});

