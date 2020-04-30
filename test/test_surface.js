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
const BisWebSurface=require('bisweb_surface');
const genericio=require('bis_genericio');
const path=require('path');
const os=require('os');
const libbiswasm=require('libbiswasm_wrapper');
//const tempfs = require('temp').track();
console.log('tmp=',os.tmpdir());


//const tmpDirPath=tempfs.mkdirSync('test_image');
//const tmpFname=path.resolve(tmpDirPath,'save2.nii.gz');


describe('Testing BisWebSurface (from bisweb_surface.js) a class that reads Surfaces\n', function() {

    this.timeout(50000);

    let surfacename=path.resolve(__dirname, 'testdata/rpm/brain_pure.json');
    let surface=new BisWebSurface();

    before( async () => { 
        await libbiswasm.initialize();
        let obj=await genericio.read(surfacename);
        let tempobj={};
        tempobj.points=JSON.parse(obj.data)['points'];
        tempobj.triangles=JSON.parse(obj.data)['triangles'];
        console.log('Read from surfacename',tempobj.points.length,tempobj.triangles.length);
        
        surface.setFromRawArrays(tempobj.points,tempobj.triangles);        
    });

    it('test surface proper', () => { 
        console.log('Sur=',surface.getDescription());
        console.log('Hash=',surface.computeHash());
        console.log('Mem=',surface.getMemorySize());
        console.log('Bytes=',surface.getWASMNumberOfBytes());
        assert.equal(0,0);
    });

    it('test surface WASM', () => {
        let Module=libbiswasm.get_module(); 
        let sur2=new BisWebSurface();
        let wasmarr=surface.serializeWasm(Module);
        sur2.deserializeWasmAndDelete(Module,wasmarr);
        console.log('new sur=',sur2.getDescription());
        let tst=surface.compareWithOther(sur2);
        assert.equal(true,tst.testresult);
    });

    it('test surface JSON', () => {
        let sur2=new BisWebSurface();
        let txt=surface.serializeToJSON();
        let ok=sur2.parseFromJSON(txt);
        console.log('new sur=',sur2.getDescription(),ok);
        let tst=surface.compareWithOther(sur2);
        assert.equal(true,tst.testresult);
    });

});




