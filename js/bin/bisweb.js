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
 * This is the main command line tool for all modules. Uses functionality in commandline.
 */

console.log('++++++++++++++++++++++++++++++++++++++++++++++++');

global.bioimagesuiteweblib=false;
let bisweb=require('./bioimagesuiteweblib');

let args=[];
for (let i=0;i<process.argv.length;i++) {
    if (i!==2 && i!==1)
        args.push(process.argv[i]);
    else if (i===1)
        args.push(process.argv[i]+" "+process.argv[i+1]);
}

let toolname=process.argv[2] || '';



bisweb.loadUserPreferences().then( () => {
    console.log('++++++++++++++++++++++++++++++++++++++++++++++++');
    console.log('++++ Executing module '+toolname);
    console.log('++++++++++++++++++++++++++++++++++++++++++++++++');
    bisweb.loadParse(args, toolname).then( () => {
        console.log('++++++++++++++++++++++++++++++++++++++++++++++++');
        process.exit(0);
    }).catch((e) => { 
        console.log(e); 
        process.exit(1);
    });
}).catch( (e) => {
    console.log(e); 
    process.exit(1);
});

