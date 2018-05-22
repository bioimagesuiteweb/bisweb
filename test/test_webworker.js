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
/*global describe, it */
"use strict";


require('../config/bisweb_pathconfig.js');
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');
const assert = require("assert");
const path=require('path');
const webworker=require('webworkermoduleutil.js');
const BisWebImage=require('bisweb_image');



let inpfilename = "testdata/MNI_2mm_resliced.nii.gz";
let testfilename = "testdata/newtests/goldsmooth2sigma.nii.gz";

let images = [ new BisWebImage(),new BisWebImage()];
let imgnames = [ inpfilename,testfilename ];
let fullnames = [ '',''];
for (let i=0;i<=1;i++)
    fullnames[i]=path.resolve(__dirname, imgnames[i]);

let p=[ ];
for (let i=0;i<images.length;i++) {
    p.push(images[i].load(fullnames[i]));
}

describe('Testing web worker serialization and deserialization\n', function() {

    this.timeout(50000);
    
    it('run dummy webworker',function(done) {


        let run_command=function() {
            
            let dummyWorker=webworker.DummyWorker;
            let modulename = "smoothImage";
            let params = { "sigma" : 2.0,
                           "radiusfactor":  2.0,
                           "debug" :  true,
                           "inmm"  : true
                         };
            
            let inputs = { 'input' : images[0] };
            
            let moduledone=function(outputs) {
                let result=images[1].compareWithOther(outputs['output']);
                console.log('\n++++ Result= pass:'+result.testresult+' diff='+result.value+' metric='+result.metric);
                assert.equal(result.testresult,true);
                done();
            };

            console.log('\n-------------------------------------\nCalling inMainThreadExecutable\n');
            webworker.inMainThreadExecuteModule(dummyWorker,modulename,inputs,params,moduledone);
        };

        Promise.all(p).then( () => { 
            setTimeout( function() {
                run_command();
            },1000);
        }).catch( (e) => {
            console.log("Error",e,e.stack);
            assert.equal(false,true);
            done();
        });
    });
});

