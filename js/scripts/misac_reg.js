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
const misac=require('misac_util');

var help = function() {
    console.log('\nThis program computes a hash code for a file (read as a binary array)');
};

program.version('1.0.0')
    .option('-i, --input <s>','filename of the file to compute hash for')
    .option('-m, --mode <s>','the mode one of "anatomical", "motion" ')
    .option('-o, --output <s>','filename to store the hash in (if specified)')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let inpfilename=program.input || null;
let outfilename =program.output || null;
let opmode= program.mode || 'anatomical';


if (!inpfilename || !outfilename) {
    console.log('need to set at least input and output filenames');
    process.exit(1);
}


let internal=function(objlist,outname,z,p) {
    
    p.push( new Promise( (resolve,reject) => {
        objlist[z].save(outname[z]).then( (f) => {
            console.log('saved in '+f);
            resolve();
        }).catch( (e) => {
            console.log(e.trace);
            reject(e);
        });
    }));
};

misac.mainFunction(inpfilename,outfilename,opmode).then( (results) => {

    let objlist=results.objlist;
    let outname=results.outnamelist;
    let p=[];
    process.exit(1);
    for (let k=0;k<=2;k++) {
        internal(objlist,outname,k,p);
    }
    Promise.all(p).then( () => {
        process.exit(0);
    }).catch( (e) => {
        console.log(e.stack);
        process.exit(1);
    });
}).catch( (e) => {
    console.log(e.stack);
    console.log(e);
    process.exit(1);
});
