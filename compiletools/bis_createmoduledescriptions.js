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
const modules=require('nodemoduleindex');


var help = function() {
    console.log('\nThis program creates the python module json descriptions from the JS modules\n');
};

program.version('1.0.0')
    .option('-i, --input  <s>','module list file')
    .option('--afni  <s>','second module list file')
    .option('-o, --output  <s>','output python module')
    .option('-m, --modulelist  <s>','output python module list')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);

let outputname = program.output || null;
let modulelistname = program.modulelist || null;

if (program.output===null ) {
    help();
    process.exit();
}

let inputname = program.input || path.join(__dirname,"../cpp/ModuleList.txt");
let secondname = program.afni || null;

if (secondname === "None")
    secondname=null;


console.log('++++ Reading module list from',inputname);
let mtext = fs.readFileSync(inputname, 'utf-8').trim();
let modulelist = "";
mtext = mtext.replace(/\r/g, '');
modulelist=mtext.split('\n');

if (secondname!==null) {
    let mtext2 = fs.readFileSync(secondname, 'utf-8').trim();
    let modulelist2 = "";
    mtext2 = mtext2.replace(/\r/g, '');
    modulelist2=mtext2.split('\n');
    console.log("++++ Reading second module list from",secondname,'\n++++');
    modulelist=modulelist.concat(modulelist2);
} else {
    console.log("---- Not including second module list");
}

console.log('++++');

let outobj={ };
let lst=[];
for (let i=0;i<modulelist.length;i++) {

    let modulename=modulelist[i];
    let module=modules.getModule(modulename) || { JSOnly : true };


    if (! module.JSOnly) {
        let desc = module.getDescription();
        delete desc['buttonName'];
        delete desc['shortname'];

        if (desc['inputs']) {
            desc['inputs'].forEach( (inp) => {
                delete inp['guiviewer'];
                delete inp['guiviewertype'];
            });
        }
        if (desc['outputs']) {
            desc['outputs'].forEach( (out) => {
                delete out['guiviewer'];
                delete out['guiviewertype'];
            });
        }

        if (desc['params']) {
            for (let i=desc['params'].length-1;i>=0;i=i-1) {
                let param=desc['params'][i];
                delete param['gui'];
                delete param['priority'];
                delete param['advanced'];
                let js=param.jsonly || false;
                if (js) {
                    // Remove jsonly parameter
                    desc['params'].splice(i,1);
                }
            }
        }
            
        let name = module.name;
        outobj[name]=desc;
        console.log('++++\t Processed module ',modulename,'-->' , name);
        lst.push(modulelist[i]);
    } else {
        console.log('----\t Skipping module ',modulename, ' (JSOnly='+module.JSOnly+')');
    }
}

let a=JSON.stringify(outobj,null,4);
a = a.replace(/true/g, 'True');
a = a.replace(/false/g, 'False');
    
let jsonout = "descriptions = "+a+"\n";
console.log('++++\n++++ Writing descriptions in ',outputname,'\n++++');
fs.writeFileSync(outputname, jsonout);

if (modulelistname) {
    console.log('++++\n++++ Writing modulelist in ',modulelistname,'\n++++');    
    fs.writeFileSync(modulelistname, lst.join('\n'));
}
    
process.exit(0);
    
