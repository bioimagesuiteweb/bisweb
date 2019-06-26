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
const rimraf=require('rimraf');
const slicerxml = require('bis_slicerxml');

// -----------------------------------------------------------------


var help = function() {
    console.log('\nThis program creates the python module json descriptions from the JS modules\n');
};

program.version('1.0.0')
    .option('-o, --output  <s>','output module list directory')
    .option('-m, --mode  <n>','mode 1=windows, 0=unix')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);

let outdir = program.output || null;
let mode = parseInt(program.mode || 0);
if (program.output===null ) {
    help();
    process.exit();
}


const scriptdir=path.normalize(outdir);

console.log('++++\n++++ Creating Module Scripts\n++++ \tRemoving scripts directory', scriptdir);
try {
    rimraf.sync(scriptdir);
} catch(e) {
    console.log(e);
}

// -----------------------------------------------------------------
//
// 
//  
// -----------------------------------------------------------------


fs.mkdirSync(scriptdir);


console.log('++++ \t Creating directory: '+scriptdir+'\n++++');


const l=modulelist.length;
let lst=[];

for (let i=0;i<l;i++) {
    
    let item=modulelist[i];

    let outfile='';
    let outtext='';
    
    if (mode === 0) {
        outfile=path.normalize(path.join(scriptdir,'bw_'+item+'.sh'));
        outtext='#!/bin/bash\nDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"\nnode ${DIR}/../lib/bisweb.js '+item+' $@\n';
    } else {
        outfile=path.normalize(path.join(scriptdir,'bw_'+item+'.bat'));
        outtext='@echo off\nSET DIRNAME=%~dp0\nnode.exe %DIRNAME%..\\lib\\bisweb.js '+item+' %*\n';
    }

    fs.writeFileSync(outfile,outtext);
    lst.push(outfile);
    //console.log('++++ \t Created '+outfile);


    let mod = modules.getModule(item);
    let desc=mod.getDescription();

    let xmlname=path.normalize(path.join(scriptdir,'bw_'+item+'.xml'));
    let xmlstring='';
    if (desc.slicer) {
        xmlstring=slicerxml.createXMLDescription(mod);
    }
    fs.writeFileSync(xmlname,xmlstring);
}

let oname=path.join(scriptdir,'ModuleList.txt');
fs.writeFileSync(oname,lst.join('\n'));
console.log('++++\n++++ List in '+oname+'\n++++');

process.exit(0);
    
