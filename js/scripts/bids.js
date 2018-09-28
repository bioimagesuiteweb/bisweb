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

"use strict";


require('../../config/bisweb_pathconfig.js');
const program=require('commander');

const bidsutils=require('bis_bidsutils');

/* jshint node:true */
var help = function() {
    console.log('\nThis program prints the header for a set of images');
};

program.version('1.0.0')
    .option('-i, --input <s>','directory of dicom data')
    .option('-o, --output <s>','bids output directory')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let idir=program.input || null;
let odir=program.output || null;


bidsutils.dicom2BIDS(
    {
        indir : idir,
        outdir : odir
    }).then( (m) => {
        console.log('All set ',m);
        process.exit(0);
    });
