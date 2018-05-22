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
const userprefs=require('bisweb_userpreferences.js');
const assert = require("assert");
const BisWebImage=require('bisweb_image');
const header   =require('bis_header');
const path=require('path');
const os=require('os');
const tempfs = require('temp').track();

console.log('tmp=',os.tmpdir());




userprefs.setImageOrientationOnLoad('None');

const tmpDirPath=tempfs.mkdirSync('test_image');
const tmpFname=path.resolve(tmpDirPath,'save2.nii.gz');


describe('Testing BisImage (from bisimage.js) a class that describes a 3D image with NIFTI I/O capabilities\n', function() {

    this.timeout(50000);

    let gold_fname=path.resolve(__dirname, 'testdata/small.nii.gz');
    let gold_fname2=path.resolve(__dirname, 'testdata/crop_small_float.nii.gz');
    let gold_dim=[ 46,55,46,1 ];
    let gold_dim2=[ 23,55,46,1 ];
    let gold_loc= [ 23,33,2];
    let gold_loc2= [ 11,27,23];
    let gold_loc3= [ 0,0,gold_loc[2]];
    for (let i=0;i<=1;i++)
        gold_loc3[i]=gold_dim[i]-gold_loc[i]-1;
    

    let gold_intensity=99;
    let gold_intensity2=304;

    let shortimage=new BisWebImage();
    let floatimage=new BisWebImage();
    let shortimage_ras=new BisWebImage();
    let shortimage_loaded=new BisWebImage();
    
    
    // -----------------------------
    // First ASYNC LOAD part
    // -----------------------------

    describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n\n check loading of ('+gold_fname+')', function() {    // jshint ignore:line
        
        
        before(function(done){
            userprefs.setImageOrientationOnLoad('None');
            shortimage.load(gold_fname).then( ()=> { done();});
        });
        
        it('check it has correct dimensions '+gold_dim,function() {
            let dim=shortimage.getDimensions();
            console.log('dim=',dim);
            let dim_error=0;
            for (let i=0;i<=3;i++) {
                dim_error+=Math.abs(gold_dim[i]-dim[i]);
            }
            console.log('_____ actual dim=',dim,' dim_error=',dim_error);
            
            
            assert.equal(0,dim_error);
        });


        it('check if it read correct intensities at '+gold_loc+' = '+ gold_intensity,function() {
            let imgdata=shortimage.getImageData();
            let dim=shortimage.getDimensions();
            let act_intensity=imgdata[gold_loc[0] + gold_loc[1]*dim[0]+ gold_loc[2]*dim[0]*dim[1]];
            console.log('_____ actual intensity=',act_intensity);
            assert.equal(0,act_intensity-gold_intensity);
        });


    });

    describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n\n check loading of float ('+gold_fname2+')',  function() {     // jshint ignore:line
        
        before(function(done){
            userprefs.setImageOrientationOnLoad('None');
            floatimage.load(gold_fname2).then( () => { done() ;});
        });
        
        it('check it has correct dimensions '+gold_dim2,function() {
            let dim=floatimage.getDimensions();
            let dim_error=0;
            for (let i=0;i<=3;i++) {
                dim_error+=Math.abs(gold_dim2[i]-dim[i]);
            }
            console.log('_____ actual dim=',dim,' dim_error=',dim_error);
            

            assert.equal(0,dim_error);
        });


        it('check if floatimage was read with correct intensities at '+gold_loc2+' = '+ gold_intensity2,function() {
            let imgdata=floatimage.getImageData();
            let dim=floatimage.getDimensions();
            let act_intensity=imgdata[gold_loc2[0] + gold_loc2[1]*dim[0]+ gold_loc2[2]*dim[0]*dim[1]];
            console.log('_____ actual intensity=',act_intensity);
            assert.equal(0,act_intensity-gold_intensity2);
        });

        it('check  addoffset',function() {
            let offset=4.0;
            console.log('..... clone and add '+offset);
            let newimage=new BisWebImage();
            newimage.cloneImage(floatimage,{ type : 'float'});
            console.log(newimage.printinfo('cloned output'));
            newimage.addoffset(floatimage,4.0,gold_loc2);
            let imgdata=newimage.getImageData();
            let dim=newimage.getDimensions();
            let act_intensity=imgdata[gold_loc2[0] + gold_loc2[1]*dim[0]+ gold_loc2[2]*dim[0]*dim[1]];
            let maxd=floatimage.maxabsdiff(newimage,gold_loc2);
            console.log('_____ actual intensity=',act_intensity,' maxabsd=',maxd);

            assert.equal(0,act_intensity-(gold_intensity2+offset));     
            assert.equal(maxd,offset);
        });

    });


    describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n\n check loading of FORCE RAS ('+gold_fname+')\n', function() {    // jshint ignore:line

        before(function(done){
            shortimage_ras.load(gold_fname,"RAS").then( () =>  {
                console.log('Going to save\n');
                console.log('Dimensions='+shortimage_ras.getDimensions());
                shortimage_ras.save(tmpFname).then( () => {
                    shortimage_loaded.load(tmpFname).then( () => {
                        done();
                    });
                });
            });
        });
        

        it('check it has correct dimensions '+gold_dim,function() {
            let dim=shortimage_ras.getDimensions();
            let dim_error=0;
            for (let i=0;i<=3;i++) {
                dim_error+=Math.abs(gold_dim[i]-dim[i]);
            }
            console.log('_____ actual dim=',dim,' dim_error=',dim_error);
            

            assert.equal(0,dim_error);
        });


        it('check if shortimage_ras was read with correct intensities at '+gold_loc+' = '+ gold_intensity,function() {
            let imgdata=shortimage_ras.getImageData();
            let dim=shortimage_ras.getDimensions();
            let act_intensity=imgdata[gold_loc3[0] + gold_loc3[1]*dim[0]+ gold_loc3[2]*dim[0]*dim[1]];
            console.log('_____ actual intensity=',act_intensity);
            assert.equal(0,act_intensity-gold_intensity);
        });

        it('check that reading without forcing ras (since it was saved as RAS gives same answer as loading original and forcing RAS)',function() {
            let maxd=shortimage_loaded.maxabsdiff(shortimage_ras,gold_loc);
            console.log(shortimage_loaded.printinfo('short image loaded'));
            console.log('_____ maxabsd post save and load=',maxd);
            assert.equal(0,maxd);
        });
        
    });


    describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n\n check loading and FORCE RAS of coronal and Sagittal',  function() {    // jshint ignore:line

        let images = [ new BisWebImage(),new BisWebImage(), new BisWebImage(),new BisWebImage()];
        let imgnames = [ 'ras_avg152T1_LR_nifti.nii.gz',
                         'avg152T1_LR_nifti.nii.gz',
                         'cor_avg152T1_LR_nifti.nii.gz',
                         'sag_avg152T1_LR_nifti.nii.gz'];
        let fullnames = [ '','','','' ];
        for (let i=0;i<=3;i++)
            fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
        console.log('fullnames=',fullnames);

        before(function(done){
            let p=[];
            for (let i=0;i<=3;i++)
                p.push( images[i].load(fullnames[i],"RAS"));
            Promise.all(p).then( () => { done(); });
        });



        it('check images loaded and all have same dimensions' ,function() {
            let maxd=0;
            let d0=images[0].getDimensions();
            for (let i=0;i<=3;i++) {
                let d1=images[i].getDimensions();
                for (let j=0;j<=2;j++) {
                    let d=Math.abs(d1[j]-d0[j]);
                    if (d>maxd)
                        maxd=d;
                }
            }
            assert.equal(0,maxd);
        });

        it('check of on-the-fly resampling  comparing '+imgnames[0]+' to ' + imgnames[1],function() {
            let maxd=images[0].maxabsdiff(images[1],gold_loc);
            console.log('_____ maxabsd post resample of '+imgnames[1]+' = ',maxd);
            assert.equal(0,maxd);
        });

        it('check of on-the-fly resampling  comparing '+imgnames[0]+' to ' + imgnames[2],function() {
            let maxd=images[0].maxabsdiff(images[2],gold_loc);
            console.log('_____ maxabsd post resample of '+imgnames[2]+' = ',maxd);
            assert.equal(0,maxd);
        });

        it('check of on-the-fly resampling  comparing '+imgnames[0]+' to ' + imgnames[3],function() {
            let maxd=images[0].maxabsdiff(images[3],gold_loc);
            console.log('_____ maxabsd post resample of '+imgnames[3]+' = ',maxd);
            assert.equal(0,maxd);
        });

        // Let's add a failed test to be sure
        it('check of on-the-fly resampling  comparing '+imgnames[0]+' to shifted (+1 -> 255 due to char)' + imgnames[3],function() {
            let newimage3=new BisWebImage();
            newimage3.cloneImage(images[3]);
            console.log(newimage3.printinfo('newimage3 type=4'));
            newimage3.addoffset(images[3],1);

            let maxd=images[0].maxabsdiff(newimage3,gold_loc);
            console.log('_____ maxabsd post resample of '+imgnames[3]+' = ',maxd);
            assert.equal(255,maxd);
        });
    });


    describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n\n check header codes',  function() {    // jshint ignore:line

        it('check header code translation',function() {
            let hd=new header();
            let a=hd.getniftitype(4);
            let b=hd.getniftitype('short');
            let c=hd.getniftitype('sshort');
            console.log('getting a=',a[0],' b=',b[0],'c=',c[0]);
            assert.equal(a,b);
            assert.equal(a,c);

            let d=hd.getniftitype('float');
            let e=hd.getniftitype(16);
            console.log('getting d=',d[0],' e=',e[0]);
            assert.equal(d,e);
        });

    });
});





