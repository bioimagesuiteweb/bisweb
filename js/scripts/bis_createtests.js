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

      
var help = function() {
    console.log('\nThis program prints the header for a set of images');
};

program.version('1.0.0')
    .option('-o, --output <s>','filename of the output filename core')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let outstem=program.output || 'out';

if (outstem===null) {
    console.log('No output file stem specified');
    process.exit(1);
}


let a = [ [ 1, 2, 3 ], [ 4, 5, 6 ] ];


let img1=new BisWebImage(); img1.createImage({ "dimensions" : [ 3,1,1,1,1 ] , "type": 'float' });
let img2=new BisWebImage(); img2.createImage({ "dimensions" : [ 3,1,1,1,1 ] , "type": 'float' });
let add=new BisWebImage(); add.createImage({ "dimensions" : [ 3,1,1,1,1 ] , "type": 'float' });
let add23=new BisWebImage(); add23.createImage({ "dimensions" : [ 3,1,1,1,1 ] , "type": 'float' });
let subtract=new BisWebImage(); subtract.createImage({ "dimensions" : [ 3,1,1,1,1 ] , "type": 'float' });
let multiply=new BisWebImage(); multiply.createImage({ "dimensions" : [ 3,1,1,1,1 ] , "type": 'float' });
let divide=new BisWebImage(); divide.createImage({ "dimensions" : [ 3,1,1,1,1 ] , "type": 'float' });
let divide42=new BisWebImage(); divide42.createImage({ "dimensions" : [ 3,1,1,1,1 ] , "type": 'float' });

for (let j=0;j<=2;j++) {
    img1.getImageData()[j]=a[0][j];
    img2.getImageData()[j]=a[1][j];
    add.getImageData()[j]=a[0][j]+a[1][j];
    add23.getImageData()[j]=2*a[0][j]+3*a[1][j];
    subtract.getImageData()[j]=a[0][j]-a[1][j];
    multiply.getImageData()[j]=a[0][j]*a[1][j];
    divide.getImageData()[j]=a[0][j]/a[1][j];
    divide42.getImageData()[j]=4.0*a[0][j]/(2.0*a[1][j]);
}

Promise.all( [
    img1.save(outstem+"_1.nii.gz"),
    img2.save(outstem+"_2.nii.gz"),
    add.save(outstem+"_add.nii.gz"),
    add23.save(outstem+"_add23.nii.gz"),
    subtract.save(outstem+"_subtract.nii.gz"),
    multiply.save(outstem+"_multiply.nii.gz"),
    divide.save(outstem+"_divide.nii.gz"),
    divide42.save(outstem+"_divide42.nii.gz")
]).then( () => {
    console.log('done');
    process.exit(0);
});


