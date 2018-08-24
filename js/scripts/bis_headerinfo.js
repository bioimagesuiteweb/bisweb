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
    .option('-i, --input <s>','filename of the file to print header for')
    .option('-f, --force <s>','force orientation to RAS or LPS or LAS or None')
    .option('-d, --debug <n>','debug on')
    .option('-s, --save <n>','save on')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let inpfilename=program.input || null;
let debug=program.debug || 0;

if (parseInt(debug) !==0)
    debug=true;
else
    debug=false;
let slist;

if (inpfilename)
    slist=[ inpfilename ].concat(program.args);
else
    slist=program.args;

let force=program.force || "None";
let save= parseInt(program.save || 0);

if (save!==1)
    save=0;

if (slist.length<1) {
    console.log('No input filename specified');
    process.exit(1);
}



let img=new Array(slist.length);
let p=[];

for (let i=0;i<slist.length;i++) {
    img[i]=new BisWebImage();
    img[i].debug=debug;
    p.push(img[i].load(slist[i],force));
}

Promise.all(p).then( () => {
    for (let i=0;i<slist.length;i++) {
	console.log('----------------------------------------------------');
	console.log('\n', img[i].getDescription(),'\n');
	console.log(img[i].getHeader().getDescription());
        if (force !== "None" && save!==0) {
            let index=slist[i].lastIndexOf(".nii");
            let outname=slist[i].substr(0,index)+"_"+force.toLowerCase()+".nii.gz"
            img[i].save(outname).then( (e) => {
                console.log(e);

            });
        } 
    }
    console.log('----------------------------------------------------');
}).catch( (e) => {
    console.log(e.stack);
    process.exit(1);
});




