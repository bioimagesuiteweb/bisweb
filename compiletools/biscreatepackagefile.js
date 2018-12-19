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

global.bioimagesuiteweblib=true;

require('../config/bis_checknodeversion');
const fs=require('fs');
const path=require('path');
const program=require('commander');
require('../config/bisweb_pathconfig.js');

const bisdate=require('bisdate.js');

var help = function() {
    console.log('\nThis program fixes the manifest file.\n');
};

program.version('1.0.0')
    .option('-o, --output <s>', 'The output directory for the package.json file')
    .option('--testing', 'if  set create test options')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);



let output = program.output || null;
let testing = program.testing || false;

if (output === null) {
    console.log('--- must specify an output file using -o flag');
    process.exit(0);
}

let version=bisdate.version;
let ind= version.indexOf('a');
if (ind<0)
    ind= version.indexOf('b');

if (ind>0)
    version=version.substr(0,ind);

console.log('++++ Testing=',testing, program.testing);


let obj = { 
    "private": true,
    "name": "biswebnode",
    "version": version,
    "description": "A node.js only implementation of BioImage Suite in Javascript and WebAssembly",
    "homepage": "www.bioimagesuite.org",
    "main" : "lib/bioimagesuiteweblib.js",
    "author": "Xenios Papademetris",
    "license": "GPL V2 (most source code is Apache V2)",
    "bin" : "lib/bisweb.js",
    "repository": {
        "type" : "git",
        "url" : "https://github.com/bioimagesuiteweb/bisweb"
    },
};

if (testing) {
    obj["devDependencies"] = {
        "mocha": "3.5.3",
    };
    obj["scripts"]= {
        "test": "mocha test/test_module.js"
    };
}


let txt=JSON.stringify(obj,null,4)+"\n";

console.log('++++ Output = \n'+txt+'++++');


output=path.resolve(path.join(output,"package.json"));

fs.writeFileSync(output,txt);
console.log('++++');
console.log('++++ Package.json file updated in',output);
console.log('++++ Once you "make install", run "npm pack" to create the package');
console.log('++++');
process.exit(0);
