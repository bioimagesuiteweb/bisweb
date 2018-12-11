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

require('../config/bis_checknodeversion');


const fs=require('fs');
const path=require('path');
const program=require('commander');


var help = function() {
    console.log('\nThis program fixes the manifest file.\n');
};

program.version('1.0.0')
    .option('-i, --input <s>', 'The directory containing the manifest.json and link.txt files')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);


let input= program.input || process.cwd();
input=path.resolve(input);

let mname=path.join(input,'manifest.json');
let lname=path.join(input,'link.txt');

console.log('++++ Using input directory =',input);

let manifest=null,link=null;

try {
    link=fs.readFileSync(lname,'utf-8').trim();
} catch(e) {
    console.log('---- Error opening file ',lname);
    process.exit(1);
}

try{
    manifest=fs.readFileSync(mname,'utf-8').trim();
} catch(e) {
    console.log('---- Error opening files ',mname);
    process.exit(1);
}
                

console.log('++++ Read link from',lname,' as',link);

try {
    let obj=JSON.parse(manifest);
    
    console.log('++++ Read manifest from ',mname,'\n\t [',Object.keys(obj).join(' '),']');
    let oldscope=obj.scope;
    
    obj.scope=link;
    let txt=JSON.stringify(obj,null,4)+"\n";
    console.log('++++ Scope updated ', oldscope,'-->',obj.scope);
    
    fs.writeFileSync(mname,txt);
    console.log('++++ Manifest file updated in',mname);
    process.exit(0);
} catch(e) {
    console.log('---- Failed to parse manifest file ',mname,' as JSON');
    process.exit(1);
}
