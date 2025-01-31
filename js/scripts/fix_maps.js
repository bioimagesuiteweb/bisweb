#!/usr/bin/env node

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



// -----------------------------------------------------------------
// Header and requirements for node.js
'use strict';

// -----------------------------------------------------------------
// Create command line
// -----------------------------------------------------------------

require('../../config/bisweb_pathconfig.js');
const program=require('commander');
const BisWebImage=require('bisweb_image');

//
var fixImages = async function(fname1, fname2) {

    const image1=new BisWebImage();
    const image2=new BisWebImage();
    try {

        await image1.load(fname1);
        await image2.load(fname2);
    } catch(e) {
        return Promise.reject(e);
    }

    let r1=image1.getIntensityRange();
    let r2=image2.getIntensityRange();

    let m1=Math.max(Math.abs(r1[0]),Math.abs(r1[1]));
    let m2=Math.max(Math.abs(r2[0]),Math.abs(r2[1]));
    let m=Math.floor(Math.max(m1,m2)+1.0);
    console.log('Ranges = ',r1,r2,' Max values = ', m1,m2, 'final = ',m);
    image1.getImageData()[0]=m;
    image2.getImageData()[0]=m;

    let f1=fname1.substr(0,fname1.length-8)+'_fixed'+String(m)+'.nii.gz';
    let f2=fname2.substr(0,fname1.length-8)+'_fixed'+String(m)+'.nii.gz';
    try {
        await image1.save(f1);
        await image2.save(f2);
        console.log('Saved in ',f1,'and', f2);
    } catch(e) {
        return Promise.reject(e);
    }
        
    
    return 'all set';
};
    
    



var help = function() {
    console.log('\nThis program normalizes two contrast maps to have same range by tweaking one voxel\n');
};

program.version('1.0.0')
    .option('-i, --input <s>','filename of  image 1')
    .option('-j, --second <s>','filename of image 2')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let fname1=program.input || null;
let fname2 =program.second || null;
let mode=program.mode;

console.log('Reading ',fname1,' and ', fname2,'\n --------------\n');

fixImages(fname1,fname2).then( () => {
    console.log('done');
}).catch( (e) => {
    console.log('Error ',e);
});







