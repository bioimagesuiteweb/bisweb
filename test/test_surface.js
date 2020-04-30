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
const libbiswasm=require('libbiswasm_wrapper');


//const tmpDirPath=tempfs.mkdirSync('test_image');
//const tmpFname=path.resolve(tmpDirPath,'save2.nii.gz');


const obj = {
    'points' : [ 10,11,12,13,14,15,16,17,18,19,20,21,101,102,103 ],
    'triangles' : [ 0,1,2,3,4,5,6,7,8,24,22,11 ],
};
    

describe('Testing BisWebSurface (from bisweb_surface.js) a class that reads Surfaces\n', function() {

    this.timeout(50000);

    let surface=new BisWebSurface();

    before( async () => { 
        await libbiswasm.initialize();
        surface.setFromRawArrays(obj.points,obj.triangles);        
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

    it('testWASM', () => {        
        let output=libbiswasm.test_shiftSurfaceWASM(surface,{
            'shiftpoints' : 1.5,
            'shiftindices' : 2
        },0);

        let dimp=surface.getPoints().getDimensions();
        let dimt=surface.getTriangles().getDimensions();
        let pts1=surface.getPoints().getDataArray();
        let tri1=surface.getTriangles().getDataArray();
        let pts2=output.getPoints().getDataArray();
        let tri2=output.getTriangles().getDataArray();

        let v1= [ 1.5,2.5,3.5 ];
        let v2= [ 2,3,4 ];

        let out=' Points\n';
        let maxp=0.0,maxt=0;
        for (let i=0;i<dimp[0];i++) {
            out=out+'Point '+i+': ';
            let index=i*3;
            for (let ia=0;ia<=2;ia++) {
                out+=' '+(pts2[ia+index])+' vs '+pts1[ia+index]+', ';
                maxp=Math.max(maxp,Math.abs(pts2[ia+index]-pts1[ia+index]-v1[ia]));
            }
            out+='\n';
        }

        out+=' Indices\n';
        
        for (let i=0;i<dimt[0];i++) {
            let index=i*3;
            out=out+'Triangle '+i+': ';
            for (let ia=0;ia<=2;ia++) {
                out+=' '+(tri2[ia+index])+' vs '+tri1[ia+index]+', ';
                maxt=Math.max(maxt,Math.abs(tri2[ia+index]-tri1[ia+index]-v2[ia]));
            }
            out+='\n';
        }
        console.log('Differences=',out);

        console.log('maxt=',maxt,' maxp=',maxp);

        let ok=false;
        if (maxt<0.01 && maxp<0.01)
            ok=true;
        assert.equal(true,ok);

    });

});




