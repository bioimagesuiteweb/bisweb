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
    .option('-m, --manifest <s>', 'The input manifest file')
    .option('-e, --extra <s>', 'The modifier manifest file')
    .option('-o, --output <s>', 'The output manifest file')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);


let mdir = path.resolve(path.join(__dirname,"../build/web/manifest.json"));
let mname = program.manifest || mdir;

let edir= program.input || process.cwd();
let lname = program.extra || path.join(edir,'bisweb.json');
let output = program.output || path.join(edir,'manifest.json');


let extraobj=null,obj=null;

console.log('++++ Reading Manifest File from ',mname);
try{
    let manifest=fs.readFileSync(mname,'utf-8');
    obj=JSON.parse(manifest);
    console.log('++++ \t [',Object.keys(obj).join(' '),']');
} catch(e) {
    console.log('---- Error opening or parsing ',mname);
    process.exit(1);
}
console.log('++++');
console.log('++++ Reading Extra File from ',lname);
try {
    let link=fs.readFileSync(lname,'utf-8');
    extraobj=JSON.parse(link);
    extraobj.scope = extraobj.scope || "https://bioimagesuiteweb.github.io/webapp/";
    console.log('++++ \t Extra info ='+JSON.stringify(extraobj));
} catch(e) {
    console.log('---- Error opening or parsing ',lname);
    process.exit(1);
}

                


console.log('++++');

let keys=Object.keys(extraobj);
for (let i=0;i<keys.length;i++) {
    console.log(`++++ \t setting "${keys[i]}" to "${extraobj[keys[i]]}" (was "${obj[keys[i]]}")`);
    obj[keys[i]]=extraobj[keys[i]];
}

if (obj.start_url.indexOf("http")!==0) {
    let old=obj.start_url;
    obj.start_url=obj.scope+obj.start_url;
    console.log(`++++ \t setting "start_url" to "${obj.start_url}" (was "${old}")`);
    let arr=obj.icons;
    for (let i=0;i<arr.length;i++) {
        if (arr[i].src.indexOf("http")!==0) {
            let old=arr[i].src;
            arr[i].src=obj.scope+arr[i].src;
            console.log(`++++ \t\t setting "icon/${arr[i].sizes}" to "${arr[i].src}" (was "${old}")`);
        }
    }
}



let txt=JSON.stringify(obj,null,4)+"\n";


fs.writeFileSync(output,txt);
console.log('++++');
console.log('++++ Manifest file updated in',output);
console.log('++++');
process.exit(0);
