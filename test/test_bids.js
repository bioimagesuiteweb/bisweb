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


const assert = require("assert");
const dicomModule = require("dicommodule");
const path=require('path');
const BisWebImage=require('bisweb_image');
const colors=require('colors/safe');

const inbase=path.resolve(__dirname,path.join('testdata','dicom'));
const indir=path.join(inbase,'source');
const odir=path.join(inbase,'bids');
const tailname=path.join('sourcedata', path.join('sub-01', path.join('anat', 'sub-01_run-01_unknown.nii.gz')));
const tailname2=path.join('sourcedata', path.join('sub-01', path.join('anat', 'sub-01_run-05_unknown.nii.gz')));

const tempfs = require('temp').track();
const tmpDirPath=tempfs.mkdirSync('bids_output_');
const tmpDirPath2=tempfs.mkdirSync('dicom_output_');

console.log(colors.cyan('++++ test_bids: Inbase='+inbase));

describe('Testing the DICOM 2 BIDS\n', function() {

    this.timeout(50000000);
    
    it('WS ...test raw dicom conversion', async function() {

        let module=new dicomModule();
        try {
            const img1=new BisWebImage();
            await img1.load(path.join(odir,tailname));
            console.log(colors.cyan('Gold read='+img1.getDescription()));


            console.log('______________________________________________________');
            let outlist=await module.execute({},{'inputDirectory' : indir,
                                                 'outputDirectory' : tmpDirPath2,
                                                 'convertbids' : false});
            console.log('outlist=',outlist.join('\n\t'));
            console.log('______________________________________________________');

            const img2=new BisWebImage();
            await img2.load(outlist[1]);
            console.log(colors.cyan('Output read='+img2.getDescription()));

            let maxd=img1.maxabsdiff(img2,100);
            console.log(colors.cyan('++++ Comparing DICOM'));
            console.log(colors.cyan('++++ Maxd='+maxd));

            if (maxd<1)
                assert.equal(true,true);
            else
                assert.equal(true,false);
            return Promise.resolve();
        } catch (e) {
            console.log('Error ',e,e.stack);
            assert.equal(true,false);
            return Promise.reject();
        }
    });

    it('WS ...test bids conversion', async function() {

        let module=new dicomModule();
        try {
            await module.execute({},{'inputDirectory' : indir,
                                  'outputDirectory' : tmpDirPath,
                                  'convertbids' : true});

            console.log('______________________________________');
            
            const img1=new BisWebImage();
            await img1.load(path.join(odir,tailname));
            console.log(colors.cyan('Gold read='+img1.getDescription()));

            const img2=new BisWebImage();
            await img2.load(path.join(tmpDirPath,tailname2));
            console.log(colors.cyan('Output read='+img2.getDescription()));

            let maxd=img1.maxabsdiff(img2,100);
            console.log(colors.cyan('++++ Comparing BIDS'));
            console.log(colors.cyan('++++ Maxd='+maxd));

            if (maxd<1)
                assert.equal(true,true);
            else
                assert.equal(true,false);
            return Promise.resolve();
        } catch (e) {
            console.log('Error ',e,e.stack);
            assert.equal(true,false);
            return Promise.reject();
        }
    });


});

