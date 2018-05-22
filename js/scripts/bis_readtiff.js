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
let bisweb_image=require('bisweb_image');

var help = function() {
    console.log('\nThis program computes a hash code for a file (read as a binary array)');
};

program.version('1.0.0')
    .option('-i, --input <s>','filename of the file to compute hash for')
    .option('-o, --output <s>','filename to store the hash in (if specified)')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);


let inpfilename=program.input || null;
let outfilename =program.output || 'test.nii.gz';

let img=new bisweb_image();

img.load(inpfilename).then(
    () => {
        img.save(outfilename).then( () => {
            console.log('Saved image in ',outfilename);
            process.exit(0);
        });
    }).catch( (e) => {
        console.log(e);
        process.exit(1);
    });



