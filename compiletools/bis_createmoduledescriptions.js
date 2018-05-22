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
require('../config/bisweb_pathconfig.js');
const program=require('commander');
const path=require('path');

const fs=require('fs');
const modules=require('moduleindex');


var help = function() {
    console.log('\nThis program creates the python module json descriptions from the JS modules\n');
};

program.version('1.0.0')
    .option('-i, --input  <s>','module list file')
    .option('-o, --output  <s>','output python module')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);

let outputname = program.output || null;
if (program.output===null) {
    help();
    process.exit();
}

let inputname = program.input || path.join(__dirname,"../cpp/ModuleList.txt");
console.log('++++ Reading module list from',inputname,'\n++++');
let mtext = fs.readFileSync(inputname, 'utf-8').trim();
let modulelist = "";
mtext = mtext.replace(/\r/g, '');
modulelist=mtext.split('\n');



let outobj={ };

for (let i=0;i<modulelist.length;i++) {

    let modulename=modulelist[i];
    let moduleclass=modules[modulename];
    let module=new moduleclass();
    let desc = module.getDescription();
    let name = module.name;
    outobj[name]=desc;
    console.log('++++\t Processed module ',modulename,'-->' , name);
}

let a=JSON.stringify(outobj,null,4);
a = a.replace(/true/g, 'True');
a = a.replace(/false/g, 'False');

let jsonout = "descriptions = "+a+"\n";
console.log('++++\n++++ Writing descriptions in ',outputname,'\n++++');
fs.writeFileSync(outputname, jsonout);

process.exit(0);
    
