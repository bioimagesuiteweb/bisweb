#!/usr/bin/env node

const path=require('path');
const fs=require('fs');

let extra=process.argv[2] || 'build';


const makeDir=function(f1) {
    console.log('++++ creating directory',f1);
    try {
        fs.mkdirSync(f1);
    } catch(e) {
        if (e.code !== 'EEXIST')
           console.log('---- error=',JSON.stringify(e));
    }
};
    
const copyFileSync=function(d1,fname,t1,t2) {

    let f1=path.join(d1,fname);
    let f2=path.join(t1,path.join(t2,fname));
    
    console.log('++++ copying file  '+f1+'\n\t\t--> '+f2);
    try {
        fs.copyFileSync(f1,f2);
    } catch(e) {
        console.log('---- error',e);
        process.exit(0);
    }
};

console.log("------------------------------------------------------------------------------------");

const DIR= path.normalize(path.join(__dirname,path.join('..',extra)));
const WASMDIR= path.normalize(path.join(DIR,path.join('..',path.join('various','wasm'))));

console.log('++++ BioImageSuite Web\n++++ creating js build directory\n++++ \tDIR=     '+DIR+'\n++++ \tWASMDIR= '+WASMDIR);


console.log('++++');
makeDir(DIR);
makeDir(path.join(DIR,'web'));
makeDir(path.join(DIR,'wasm'));
makeDir(path.join(DIR,'dist'));
console.log('++++');
copyFileSync(WASMDIR,`libbiswasm_wasm.js`,DIR,`web`);
copyFileSync(WASMDIR,`libbiswasm_nongpl_wasm.js`,DIR,`web`);
copyFileSync(WASMDIR,`libbiswasm.js`,DIR,`wasm`);
copyFileSync(WASMDIR,`libbiswasm_nongpl.js`,DIR,`wasm`);
copyFileSync(WASMDIR,`libbiswasm.wasm`,DIR,`wasm`);
copyFileSync(WASMDIR,`libbiswasm_nongpl.wasm`,DIR,`wasm`);
copyFileSync(WASMDIR,`libbiswasm_wrapper.js`,DIR,`wasm`);
console.log("------------------------------------------------------------------------------------");



