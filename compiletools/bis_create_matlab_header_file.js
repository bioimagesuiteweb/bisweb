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
const program=require('commander');


var scan_files = function(onames) {
    let outtext='';
    for (let f=0;f<onames.length;f++) {
        
        let tname=onames[f];
        
        let text = fs.readFileSync(tname,'utf-8');
        const lines=text.split("\n");
        
        for (let i=0;i<lines.length;i++) {
            
            let txt=lines[i].trim();
            if (txt.indexOf("BISEXPORT")===0) {

                let ip=i;
                let found=false;
                while (found===false && ip>i-30 && i>0) {
                    if (lines[ip].indexOf('/**')>0) {
                        found=true;
                    } else {
                        ip=ip-1;
                    }
                }
                
                if (found) {
                    let cmtext='';
                    for (let k=ip;k<i;k++)
                        cmtext+=lines[k].trim()+'\n';
                    outtext+='\n// --  --  --  --  --  --  --  --  --  --  --  --  --  --  --  --  --  --  --  --  --  --  --\n'+cmtext+'\n';
                }

                
                outtext+=txt.substr(10,txt.length).trim()+'\n';
                while (txt.indexOf(";")!==txt.length-1) {
                    i=i+1;
                    txt=lines[i].trim();
                    outtext+='\t\t\t'+txt+'\n';
                }
            }
        }
    }
    return outtext;
};

var help = function() {
    console.log('\nThis program creates a matlab header file for the WebAssmebly code\n');
};

program.version('1.0.0')
    .option('-o, --output  <s>','output .h filename')
    .option('-i, --input <s>', 'Input header files to parse')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);


let headerfiles = program.input.split(",");
console.log('+++++ bis_create_matlab_header_file');
console.log('+++++\n+++++ beginnning to parse : '+headerfiles.join(' ')+'\n+++++');


let output='// Automatically generated from '+headerfiles.join(' ')+'.\n'+scan_files(headerfiles);

fs.writeFileSync(program.output,output);
console.log('+++++\n+++++ Saved output in :',program.output,'\n');
process.exit(0);
