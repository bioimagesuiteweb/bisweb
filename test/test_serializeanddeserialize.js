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
const BisWebDataObjectCollection=require('bisweb_dataobjectcollection.js');

const genericio=require('bis_genericio.js');



const objlist = [
    {
        objtype : 'transform',
        filename : path.resolve(__dirname, 'testdata/MNI_2mm_scaled.grd'),
        testtype : 'gridtransform',
    },
    {
        objtype : 'image',
        filename : path.resolve(__dirname, 'testdata/small.nii.gz'),
        testtype : 'image',
    },
    {
        objtype : 'transform',
        filename : path.resolve(__dirname,'testdata/newtests/linear.matr'),
        testtype : 'matrixtransform',
        
    },
    {
        objtype : 'matrix',
        filename :  path.resolve(__dirname,'testdata/ButterWorthOutput.csv'),
        testtype : 'matrix',
    },
    {
        objtype : 'vector',
        filename :  path.resolve(__dirname,'testdata/newtests/drift_weights.matr'),
        testtype : 'matrix',
    },
    {
        objtype : 'vector',
        filename :  path.resolve(__dirname,'testdata/newtests/drift_weights.matr'),
        testtype : 'matrix',
    },
    {
        objtype : 'text',
        filename :  path.resolve(__dirname,'module_tests.json'),
        testtype : 'text',
    }
    
];





let compare=function(i) {
    
    let inp=objlist[i].obj;
    console.log('\n\n\n Working with object',objlist[i].filename,objlist[i].objtype);
    let text=inp.serializeToJSON();
    let out=BisWebDataObjectCollection.parseObject(text,objlist[i].objtype);
    if (out!==null) {
        let v=inp.compareWithOther(out,'maxabs',0.01);
        if (v.testresult)
            return true;
        return false;
    } else {
        return false;
    }
    
};


describe('Testing Serialize and Serialize\n', function() {

    this.timeout(50000);
    
    before(function(done){

        let p=[];
        objlist.forEach((param) => {
            p.push(BisWebDataObjectCollection.loadObject(param.filename,param.objtype));
        });
        Promise.all(p).then( (arr ) => {
            for (let i=0;i<objlist.length;i++) {
                objlist[i].obj=arr[i];
                objlist[i].obj.addComment(objlist[i].filename);
                console.log("Description:\n",i,
                            objlist[i].obj.getDescription(),
                            objlist[i].obj.getObjectType());
                console.log("Adding object to",objlist[i].objtype,objlist[i].filename,objlist[i].obj.getMemorySize());
            }
            done();
        }).catch( (e) => { console.log(e); });
    });

    it('check gridtransform serialize/deserialize',function() {
        assert.equal(true,compare(0));
    });
    
    it('check image serialize/deserialize',function() {
        assert.equal(true,compare(1));
    });

    it('check matrixtransform serialize/deserialize',function() {
        assert.equal(true,compare(2));
    });

    it('check matrix serialize/deserialize',function() {
        assert.equal(true,compare(3));
    });

    it('check vector serialize/deserialize',function() {
        assert.equal(true,compare(4));
    });


    it('check text serialize/deserialize',function() {
        assert.equal(true,compare(6));
    });

    it(' test serialize full',function() {

        let p={};
        for (let i=0;i<objlist.length;i++) {
            let name='object_'+i;
            p[name]=objlist[i].obj.serializeToJSON();
        }
        let s=(JSON.stringify(p));
        console.log('++++ Length of s=',s.length);
        assert.equal(true,(s.length>50000));
    });

    it('Testing Serialize and Serialize Collection\n', function() {

        let tb=new BisWebDataObjectCollection();

        for (let i=0;i<=6;i++)
            tb.addItem(objlist[i].obj);

        
        let txt=tb.serializeToJSON(true);
        let newtb=new BisWebDataObjectCollection();
        newtb.parseFromJSON(txt);
        
        let comp=tb.compareWithOther(newtb);
        console.log('Comparison=',comp);
        assert.equal(comp.testresult,true);
        
    });


    it('Binary 2 String and back',function() {

        let ok=true;
        let txt=objlist[2].obj.serializeToJSON();
        console.log(txt);
        let binstr=genericio.string2binary(txt,true);
        console.log('binstr length=',binstr.length,typeof binstr,'\n\n');

        let newtxt=genericio.binary2string(binstr,true);
        console.log('newtxt=',newtxt,'\t length=',newtxt.length,'\n\n');

        let newtr=BisWebDataObjectCollection.parseObject(newtxt,'transform');
        console.log(newtr.serializeToJSON());
        
        let tr=newtr.compareWithOther(objlist[2].obj,'maxabs',0.01);
        console.log('test result=',tr);
        assert.equal(ok,tr.testresult);
    });
});

