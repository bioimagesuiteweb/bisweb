#!/usr/bin/env node

const path=require('path');
const util=require('./bis_createutil');

let extra=process.argv[2] || 'build';

console.log("------------------------------------------------------------------------------------");
const DIR= path.normalize(path.join(__dirname,path.join('..',extra)));
console.log('++++ BioImageSuite Web\n++++ creating js build directory\n++++ \tDIR=     '+DIR+'\n++++');
util.initialize(DIR,false);
console.log("------------------------------------------------------------------------------------");
