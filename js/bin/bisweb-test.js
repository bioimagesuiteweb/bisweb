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

'use strict';

/**
 * Runs modules in test mode
 */

global.bioimagesuiteweblib=false;

const bioimagesuiteweblib=require('./bioimagesuiteweblib');
const program = bioimagesuiteweblib.commander;
const tmp = bioimagesuiteweblib.tmp;
const rimraf=bioimagesuiteweblib.rimraf;
const commandline=bioimagesuiteweblib.commandline;


let tmpDirectory = tmp.dirSync();
console.log('.... created tmp directory',tmpDirectory.name);
console.log('.... -------------------------------------------------------');

let cleanupAndExit=function(code=0) {
    console.log('.... -------------------------------------------------------');
    console.log('.... removing tmp directory',tmpDirectory.name);
    rimraf.sync(tmpDirectory.name);
    process.exit(code);
};

let args=process.argv;
let len=args.length;
let toolname=args[2] || '';

if (len<=3 || toolname ==='-h' || toolname ==='--help') {
    console.log('\n Specify the module to test...');
    console.log(' See functions folder for potential options (\'node bisweb.js module_name --help\' for more information)');
    tmpDirectory.removeCallback();
    cleanupAndExit(0);
}

//attach test specific options
program
    .option('--test_target [s]', '\'Gold-standard\' image to compare module output to')
    .option('--test_threshold [n]', 'Acceptable deviation from input, measured as maximum absolute difference between values',parseFloat)
    .option('--test_type [s]', 'Type of output one of image, matrix, matrixtransform,gridtransform')
    .option('--test_comparison [s]', 'Comparison maxabs, cc, ssd')
    .option('--test_base_directory [s]', 'Base Directory for files');


let bisModule = args[2];

let basedirectory='';
for (let i=0;i<args.length;i++) {
    if (args[i]==="--test_base_directory")
        basedirectory=args[i+1];
}
if (basedirectory.length>0) 
    console.log('++++ Base Directory=',basedirectory);

let dirname = tmpDirectory.name;

let test_type="image";
for (let i=0;i<args.length;i++) {
    if (args[i]==="--test_type")
        test_type=args[i+1];
}

let tempName="";
if (test_type==="image" || test_type==="tfjs")
    tempName= dirname+ '/out.nii.gz';
else if (test_type==="matrix" || test_type==="matrixtransform")
    tempName= dirname+ '/out.jmatr';
else if (test_type==="gridtransform")
    tempName=dirname+'/out.grd';
else if (test_type==="registration")
    tempName=dirname+'/out.json';
args.push('--output', tempName);

if (test_type==="registration") {
    tempName=dirname+"/out_resl.nii.gz";
    args.push("--doreslice", true);
    args.push("--resliced", tempName);
    test_type="image";
}


if (test_type==="tfjs") {
    test_type="image";
    for (let i=0;i<args.length;i++) {
        if (args[i]==='--modelname') {
            // Add basedirectory to modelname as it is really a file path
            args[i+1]=basedirectory+args[i+1];
        }
    }
}


// Disable auto reorient on load -- not needed any more
//console.log('++++ Disabling auto-reorient of images on load.\n+++++');
//userPreferences.setImageOrientationOnLoad('None');

console.log('.... Testing module '+toolname);
console.log('................................................');

commandline.loadParse(args, bisModule, basedirectory).then(() => {
    console.log('.... -------------------------------------------------------');
    commandline.processTestResult(toolname,tempName,
                                  basedirectory+program.test_target,
                                  test_type,
                                  program.test_threshold,
                                  program.test_comparison,
                                  cleanupAndExit);
}).catch((e) => {
    console.log(e);
    cleanupAndExit(1);
});
