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
const program=require('commander');
require('../config/bis_checknodeversion');
const fs=require('fs');


var help = function() {
    console.log('\nThis program creates the bisdate.js file\n');
};

program.version('1.0.0')
    .option('-o, --output  <s>','output js date file')
    .on('--help',function() {
            help();
    })
    .parse(process.argv);

if (program.output===null) {
    help();
    process.exit();
}


let date = new Date();
let year = date.getFullYear();
let month = date.getMonth() + 1;
month = (month < 10 ? "0" : "") + month;
let day  = date.getDate();
day = (day < 10 ? "0" : "") + day;
let dt=month+"/"+day+"/"+year;

let output_text=`module.exports = { date : "${dt}"};\n`;
console.log(`+++++ Writing to ${program.output} : ${dt}`);
fs.writeFileSync(program.output,output_text);

process.exit(0);
    
