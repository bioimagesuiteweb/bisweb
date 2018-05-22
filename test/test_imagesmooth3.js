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
const bisimagesmooth=require('bis_imagesmoothreslice');
const BisWebImage=require('bisweb_image');
const path=require('path');
const libbiswasm=require('libbiswasm_wrapper');
const wrapperutil=require('bis_wrapperutils');
const wasmutil=require('bis_wasmutils');

const passthreshold=2.0;

describe('Testing image smoothing code (from bis_imagesmoothreslice.js)\n', function() {

    this.timeout(50000);
    let images = [ new BisWebImage(), new BisWebImage(),new BisWebImage() ];
    let imgnames = [ 'thr.nii.gz',
                     'thr_sm.nii.gz',
                   ];
    
    let fullnames = [ '','',''];
    for (let i=0;i<=1;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    
    before(function(done){

        let all_done=function() {
            console.log('_____ all images loaded');
            done();
        };
        
        let p=[ libbiswasm.initialize() ];
        for (let i=0;i<=1;i++)
            p.push(images[i].load(fullnames[i],false));
        Promise.all(p)
            .then(all_done)
            .catch( (e) => { console.log('Failed '+e); process.exit(1); });
    });
    
    it('run smooth',function() {
        let c=5.0*0.4247;
        let out=bisimagesmooth.smoothImage(images[0],[c,c,c],false,1.5);
        let error=out.maxabsdiff(images[1]);
        console.log('error=',error);
        assert.equal(true,(error<passthreshold));
    });

    it('run smooth wasm',function() {
        let c=5.0*0.4247;
        let out=libbiswasm.gaussianSmoothImageWASM(images[0],{
            "sigmas" : [c,c,c],
            "inmm" : false,
            "radiusfactor" : 1.5},0);
        let error=out.maxabsdiff(images[1]);
        console.log('error=',error);
        assert.equal(true,(error<passthreshold));
    });

    it('run threshold identity ',function() {

        let out2=libbiswasm.thresholdImageWASM(images[0],{
            "low" :  -1,
            "high" : 256,
            "replacein" : false,
            "replaceout" : true,
        },0);
        
        let error=out2.maxabsdiff(images[0]);
        console.log(' error=',error);
        assert.equal(true,(error<0.001));
    });

    it('run smooth wasm preserialize',function() {
        let c=5.0*0.4247;
        
        let Module=libbiswasm.get_module();
        let image1_ptr=wrapperutil.serializeObject(Module,images[0],'bisImage');
        
        let out=libbiswasm.gaussianSmoothImageWASM(image1_ptr,{
            "sigmas" : [c,c,c],
            "inmm" : false,
            "radiusfactor" : 1.5},0);
        let error=out.maxabsdiff(images[1]);
        console.log('error=',error);
        assert.equal(true,(error<passthreshold));

        Module._print_memory();
        wasmutil.release_memory(Module,image1_ptr);
        Module._print_memory();
    });



});



