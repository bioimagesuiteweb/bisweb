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
const modules = require('nodemoduleindex.js');
const fs=require('fs');
const path=require('path');
const modulelist = modules.getModuleNames();
const testlist = require('../test/module_tests.json')['testlist'];

console.log('Full path=',path.normalize('../test/module_tests.json'));

// -----------------------------------------------------------------

var help = function() {
    console.log('\nThis program creates the list of JS modules to test\n');
};

program.version('1.0.0')
    .option('-o, --output  <s>','output module list file')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);

let outfile = program.output || null;
if (program.output===null ) {
    help();
    process.exit();
}

let goodmodulelist=[];

for (let i=0;i<testlist.length;i++) {
    let tname=testlist[i].command.split(" ")[0].toLowerCase();
    if (goodmodulelist.indexOf(tname)<0) {
        goodmodulelist.push(tname);
    }
}


const outfilename=path.normalize(outfile);
console.log('++++\n++++ Creating Module List in ',outfilename);
console.log('++++ Input modules = ',modulelist.length, ' -- to test --> ', goodmodulelist.length);
let output=goodmodulelist.join('\n');
fs.writeFileSync(outfilename,output);
process.exit(0);
console.log('++++\n++++ Created module list in '+outfilename+'\n++++');

process.exit(0);
    
