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
const bisasyncbruker=require('bis_asyncreadbruker');
const path=require('path');
const BisWebImage=require('bisweb_image');
const genericio=require('bis_genericio');
const bisserverutil=require('bis_fileservertestutils');
const util=require('bis_util');
const colors=require('colors/safe');


let indata=path.resolve(__dirname,path.join('testdata','bruker_exp'));


let tmpname=null;
let tmpDir=null;



describe('Testing BisImage (from bis_asyncreadbruker.js) a class that imports Bruker Paravision images\n', function() {
    
    this.timeout(50000);

    let filenames = [ [ 'paravisionconvert.json',
                        'bruker_exp_1_MSME.nii.gz',
                        'bruker_exp_1_MSME.txt' ],
                      [ 'paravisionconvert_ras.json',
                        'bruker_exp_1_MSME_ras.nii.gz',
                        'bruker_exp_1_MSME_ras.txt' ]];
    
    describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n\n check importing bruker data\n', function() {

        console.log('+++++ importing from data dir '+ indata+ 'twice');
        
        let gold_loc = [ 64,60,12];
        let origimages=[ new BisWebImage(), new BisWebImage()];
        let origimagenames=['',''];
        for (let j=0;j<=1;j++)
            origimagenames[j]=path.join(indata,filenames[j][1]);
        let outimagenames=["",""];
        let flag=[false,false],falseflag=[false,false];

        let client=null;
        
        before(function(done) {
            
            let initializeServer = function() {

                return new Promise( (resolve,reject) => {
                    console.log("Creating Server");
                    bisserverutil.createTestingServer().then( (obj) => {
                        client=obj.client;
                        tmpDir=obj.tmpDir;

                        if (path.sep==='\\')
                            tmpDir=util.filenameUnixToWindows(tmpDir);
                        
                        tmpname = [ 
                            path.resolve(tmpDir,'test'),
                            path.resolve(tmpDir,'testras')
                        ];
                        resolve();
                    }).catch( (e)=>
                              {
                                  console.log("Failed Server");
                                  reject(e);
                              }
                            );
                });
            };

            let newload = function( outimages ) {
            
                for (let i=0;i<outimages.length;i++) {
                        outimages[i].debug=false;
                    console.log('\n+++++ Comparing\n\t'+outimages[i].getDescription()+ '\n\t and \n\t' + origimages[i].getDescription());
                    let maxd=outimages[i].maxabsdiff(origimages[i],gold_loc);
                    if (maxd<0.01)
                        flag[i]=true;
                    console.log('+++++ \t\t\t maxd=',maxd);
                    
                    console.log('\n+++++ False Comparing '+outimages[i].getDescription()+'\n\t and \n\t' + origimages[1-i].getDescription());
                    let falsemaxd=outimages[i].maxabsdiff(origimages[1-i],gold_loc);
                    console.log('+++++ \t\t\t falsemaxd=',falsemaxd);
                    if (falsemaxd>0.01)
                        falseflag[i]=true;
                    console.log(colors.cyan('------------------------------------------------------------------------'));
                }
            };

            
            let importimage = async function() {
                

                let forceorient="None";
                for (let count=0;count<=1;count++) {
                    if (count===1)
                        forceorient="RAS";
                    
                    let infilename=path.join(indata,'pdata/1/2dseq');
                    console.log(colors.cyan('------------------------------------------------------------------------'));
                    console.log('\n+++++ Importing bruker data from '+infilename+' forceorient='+forceorient);
                    
                    let data=await bisasyncbruker.readFile(infilename,tmpname[count],forceorient,false);
                    outimagenames[count]=data.partnames[0];
                                
                }
                console.log(colors.cyan('------------------------------------------------------------------------'));
                console.log('_____ done',outimagenames.join('\n\t and'));
                console.log(colors.cyan('------------------------------------------------------------------------'));
                genericio.setFileServerObject(null);


                let outimages=[];
                for (let i=0;i<outimagenames.length;i++) {
                    let img=new BisWebImage();
                    outimages.push(img);
                    await img.load(outimagenames[i]);
                }
                console.log(colors.cyan('------------------------------------------------------------------------'));
                newload(outimages);
                return;
                
            };
            
            Promise.all([
                origimages[0].load(origimagenames[0]),
                origimages[1].load(origimagenames[1]),
            ]).then( () => {

                console.log('Finished loading');
                console.log(colors.cyan('------------------------------------------------------------------------'));
                initializeServer().then( () => {
                    console.log("server initialized",tmpname);
                    importimage().then( () => {
                        done();
                    });
                });
            });
        });

        
        
        it('check if orig import is correct',function() {
            console.log("Looking at ",flag[1]);
            assert.equal(true,flag[0]);
        });

        it('check if ras import is correct',function() {
            console.log("Looking at ",flag[1]);
            assert.equal(true,flag[1]);
        });

        it('check if ras and non ras are not same',function() {
            console.log("Looking at ",falseflag[0],' and ',falseflag[1]);
            assert.equal(true,(falseflag[0] && falseflag[1]));
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

});
