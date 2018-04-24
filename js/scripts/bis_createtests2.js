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


let a = [ [  10, 12, 14, 15, 17, 22, 29 ], [ 12, 14, 18, 22, 44, 41, 23 ] ];
let r=  [ [  17,              6.531972647, 29, 10, 325.5714286 ],
          [  24.85714286,     12.70732822, 44, 12, 756.285714 ]];


let img=new BisWebImage(); img.createImage({ "dimensions" : [ 1,1,2] ,
                                             "numframes" : 7,
                                             "type": 'float' });
let mean=new BisWebImage(); mean.createImage({ "dimensions" : [ 1,1,2 ] , "type": 'float' });
let meansigma=new BisWebImage(); meansigma.createImage({ "dimensions" : [ 1,1,2 ] ,
                                                         "numframes"  :  2,
                                                         "type": 'float' });
let rms= new BisWebImage();  rms.createImage({ "dimensions" : [ 1,1,2 ] , "type": 'float' });
let maxi=new BisWebImage(); maxi.createImage({ "dimensions" : [ 1,1,2 ] , "type": 'float' });
let mini=new BisWebImage(); mini.createImage({ "dimensions" : [ 1,1,2 ] , "type": 'float' });

for (let i=0;i<=1;i++) {
    for (let j=0;j<=6;j++) {
        img.getImageData()[j*2+i]=a[i][j];
    }
    mean.getImageData()[i]=r[i][0];
    meansigma.getImageData()[i]=r[i][0];
    meansigma.getImageData()[i+2]=r[i][1];
    rms.getImageData()[i]=Math.sqrt(r[i][4]);
    maxi.getImageData()[i]=r[i][2];
    mini.getImageData()[i]=r[i][3];
}

Promise.all( [
    img.save(outstem+"_inp.nii.gz"),
    mean.save(outstem+"_mean.nii.gz"),
    meansigma.save(outstem+"_meansigma.nii.gz"),
    rms.save(outstem+"_rms.nii.gz"),
    maxi.save(outstem+"_max.nii.gz"),
    mini.save(outstem+"_min.nii.gz"),
]).then( () => {
    console.log('done');
    process.exit(0);
});


