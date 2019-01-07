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
/*global describe, it, after, before */
"use strict";

require('../config/bisweb_pathconfig.js');
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');


const assert = require("assert");
const path=require('path');
const BisWebImage=require('bisweb_image');
const bisserverutil=require('bis_fileservertestutils');
const util=require('bis_util');
const colors=require('colors/safe');


let indata=path.resolve(__dirname,path.join('testdata','tfjs64'));



let tmpDir=null;
let client=null;
let filenames = [ 'sample1.nii.gz', 'sampleout.nii.gz' ];

describe('Testing TFJS recon\n', function() {
    
    this.timeout(50000);


    
    before(function(done) {
        
        bisserverutil.createTestingServer().then( (obj) => {
            client=obj.client;
            tmpDir=obj.tmpDir;
            if (path.sep==='\\')
                tmpDir=util.filenameUnixToWindows(tmpDir);
            console.log('tmpDir=',tmpDir);
            done();
        }).catch( ()=> {
            process.exit(1);
        });
    });
    
    it ('check recon',function(done) {
        
        let input=path.join(indata,filenames[0]);
        client.getServerTempFilename('nii.gz').then( (outname) => {
            
            let modeldir=indata;

            if (path.sep==='\\') {
                input=util.filenameWindowsToUnix(input);
                outname=util.filenameWindowsToUnix(outname);
                modeldir=util.filenameWindowsToUnix(modeldir);
            }
            
            client.tensorFlowReconstruction(input,outname,modeldir,12,8).then( (result) => {
                console.log('\n+++++++++++++++\n++++++++ TF result=',result.output);

                let img1=new BisWebImage();
                let img2=new BisWebImage();
                Promise.all( [
                    img1.load(path.join(indata,filenames[1])),
                    img2.load(result.output)
                ]).then( () => {
                    console.log('\n+++++ Comparing\n\t'+img1.getDescription()+ '\n\t and \n\t' + img2.getDescription());
                    let maxd=img1.maxabsdiff(img2);
                    console.log('+++++ \t\t\t maxd=',maxd);
                    if (maxd<0.01)
                        assert(true,true);
                    else
                        assert(true,false);
                    done();
                }).catch( () => {
                    assert(false,true);
                    done();
                });
            }).catch( () => {
                assert(false,true);
                done();
            });
        });
    });
    
    
    after(function(done) {
        console.log(colors.cyan('------------------------------------------------------------------------'));
        bisserverutil.terminateTestingServer(client).then( ()=> {
            done();
        }).catch( (e) => {
            console.log('---- termination error',e,e.stack);
            done();
        });
    });

});
