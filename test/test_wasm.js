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
const libbiswasm=require('libbiswasm_wrapper');
const wrapperutil=require('bis_wrapperutils');
const wasmutil=require('bis_wasmutils');
const BisWebImage=require('bisweb_image');

describe('Testing WASM\n', function() {

    this.timeout(50000);
    let images = [ new BisWebImage(),new BisWebImage() ];
    let imgnames = [ 'thr.nii.gz',
                     'thr_sm.nii.gz',
                   ];
    
    let fullnames = [ '','','','' ];
    for (let i=0;i<=1;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    
    before(function(done){
        let p=[ libbiswasm.initialize() ];
        for (let i=0;i<images.length;i++) {
            p.push(images[i].load(fullnames[i]));
        }
        Promise.all(p).then( () => { done(); });
    });

    
    it('check wasm',function() {

        const c=5.0*0.4247;
        const paramobj={
            "sigmas" : [c,c,c],
            "inmm" : false,
            "radiusfactor" : 1.5
        };
        const debug=0;
        const jsonstring=JSON.stringify(paramobj);
        const Module=libbiswasm.get_module();
        let image1_ptr=0;
        for (let k=0;k<=22;k++) {
            console.log("Memory size=",k,'/',22,'=',Module['wasmMemory'].buffer.byteLength/(1024*1024)," MB");
            for (let j=0;j<=99;j++)
                image1_ptr=wrapperutil.serializeObject(Module,images[0],'bisImage');
       
        }
        console.log("Memory size (end) =",Module['wasmMemory'].buffer.byteLength/(1024*1024)," MB");   
        const wasm_output=Module.ccall('gaussianSmoothImageWASM','number',
                                       ['number', 'string', 'number'],
                                       [ image1_ptr, jsonstring, debug]);

        console.log("Memory size=",Module['wasmMemory'].buffer.byteLength/(1024*1024)," MB");
        const out=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',images[0]);
        wasmutil.release_memory(Module,image1_ptr);
        let error=out.maxabsdiff(images[1]);
        console.log('error=',error);
        assert.equal(true,(error<2.0));
    });

});

