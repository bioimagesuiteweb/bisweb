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
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');
const assert = require("assert");
const bisbruker=require('bis_readbruker');
const path=require('path');
const BisWebImage=require('bisweb_image');
const os=require('os');
const colors=require('colors/safe');
const tempfs = require('temp').track();

console.log('tmp=',os.tmpdir());


let indata=path.resolve(__dirname,path.join('testdata','bruker_exp'));

let tmpDir=tempfs.mkdirSync('test_image');

let tmpname=[
    path.resolve(tmpDir,'test'),
    path.resolve(tmpDir,'testras')
];

describe('Testing BisImage (from bis_readbruker.js) a class that imports Bruker Paravision images\n', function() {
    
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
        let origimages=[ 0,0];
        let origimagenames=['',''];
        for (let j=0;j<=1;j++)
            origimagenames[j]=path.join(indata,filenames[j][1]);
        let outimagenames=["",""];
        let flag=[false,false],falseflag=[false,false];
        
        before(function(done) {

            let importimage = function() {

                let newload = function( outimages ) {
                    for (let i=0;i<outimages.length;i++) {
                        outimages[i].debug=true;
                        console.log('+++++ Comparing '+outimages[i].getFilename()+ ' and ' + origimages[i].getFilename());
                        let maxd=outimages[i].maxabsdiff(origimages[i],gold_loc);
                        if (maxd<0.01)
                            flag[i]=true;
                        
                        console.log('+++++ False Comparing '+outimages[i].getFilename()+ ' and ' + origimages[1-i].getFilename());
                        let falsemaxd=outimages[i].maxabsdiff(origimages[1-i],gold_loc);

                        if (falsemaxd>0.01)
                            falseflag[i]=true;
                    }
                    console.log('Falseflags='+falseflag);

                    done();
                };
                

                let forceorient="None";
                for (let count=0;count<=1;count++) {
                    if (count===1)
                        forceorient="RAS";
                    
                    let infilename=path.join(indata,'pdata/1/2dseq');
                    console.log(colors.cyan('\n+++++ Importing bruker data from '+infilename+' forceorient='+forceorient+'\n-------- --------'));

                    let data=bisbruker.readFile(infilename,tmpname[count],forceorient,false);
                    outimagenames[count]=data.partnames[0];
                }
                
                let p=[];
                let outimages=[];
                for (let i=0;i<outimagenames.length;i++) {
                    let img=new BisWebImage();
                    outimages.push(img);
                    p.push(img.load(outimagenames[i]));
                }
                Promise.all(p).then( () => { newload(outimages); });
            };
            
            let origload = function( inp_images ) {
                for (let i=0;i<inp_images.length;i++)
                    origimages[i]=inp_images[i];
                importimage();
            };


            let p2=[];
            let outimages2=[];
            for (let i=0;i<origimagenames.length;i++) {
                let img=new BisWebImage();
                outimages2.push(img);
                p2.push(img.load(origimagenames[i]));
            }
            Promise.all(p2).then( () => { origload(outimages2); });
        });

        
        it('check if orig import is correct',function() {
            assert.equal(true,flag[0]);
        });

        it('check if ras import is correct',function() {
            assert.equal(true,flag[1]);
        });

        it('check if ras and non ras are not same',function() {
            assert.equal(true,(falseflag[0] && falseflag[1]));
        });
    });

});
