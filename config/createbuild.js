#!/bin/bash

const path=require('path');
const fs=require('fs');
const child_process=require('child_process');

if (path.sep==='\\') {
    console.log('++++ BioImageSuite Web create developer environment \n++++');
    console.log('---- This file will only run on a UNIX OS (Mac or Linux)');
    process.exit(1);
}



let extra=process.argv[2] || 'build';
let do_execute=true;

const makeDir=function(f1) {
    console.log('++++ creating directory',f1);
    try {
        fs.mkdirSync(f1);
    } catch(e) {
        if (e.code === 'EEXIST') {
            console.log('---- directory '+f1+' exists. Remove and try again.');
            process.exit(0);
        }
        console.log('---- error=',JSON.stringify(e));
        process.exit(0);
    }
};

const copyFileSync=function(d1,fname,d2,fname2) {
    
    let f1=path.join(d1,fname);
    let f2=path.join(d2,fname2);
    
    console.log('++++ copying file  '+f1+'\n\t\t--> '+f2);
    try {
        fs.copyFileSync(f1,f2);
    } catch(e) {
        console.log('---- error',e);
        process.exit(0);
    }
};


let executeCommandSync=function(command,dir) {
    
    console.log('++++ '+dir+">"+command);

    let out="";
    try {
        out=child_process.execSync(command, { cwd : dir });
    } catch(e) {
        out='error '+e;
    }
};

let executeCommand=function(command,dir) {

    console.log('++++ '+dir+">"+command);
    if (!do_execute)
        return Promise.resolve();
    
    return new Promise( (resolve,reject) => {

        try { 
            let proc=child_process.exec(command, { cwd : dir });
            proc.stdout.on('data', function(data) {
                //console.log(data);
            });
            proc.stderr.on('data', function(data) {
                console.log(data);
            });
            proc.on('exit', function(code) {
                if (code===0)
                    resolve();
                else
                    reject();
            });
            
        } catch(e) {
            console.log(' error '+e);
            reject(e);
        }
    });
};

const main=async function() {

    console.log("------------------------------------------------------------------------------------");
    
    const DIR= path.normalize(path.join(__dirname,path.join('..',extra)));
    const WASMDIR= path.normalize(path.join(DIR,path.join('..',path.join('various','wasm'))));
    
    console.log('++++ BioImageSuite Web\n++++ creating full build directory\n++++ \tDIR=     '+DIR+'\n++++ \tWASMDIR= '+WASMDIR);


    console.log('++++');
    makeDir(DIR);
    makeDir(path.join(DIR,'web'));
    makeDir(path.join(DIR,'wasm'));
    makeDir(path.join(DIR,'dist'));
    makeDir(path.join(DIR,'native'));
    console.log('++++');



    console.log("++++");
    console.log("++++ Installing Eigen3");
    console.log("++++");
    makeDir(path.join(DIR,'eigen3'));
    let eig=path.normalize(`${DIR}/../various/download/Eigen.zip`);
    await executeCommand(`unzip ${eig}`, `${DIR}/eigen3`);


    console.log("++++");
    console.log("++++ Installing IGL");
    console.log("++++");
    makeDir(path.join(DIR,'igl'));
    let ig=path.normalize(`${DIR}/../various/download/igl.zip`);
    await executeCommand(`unzip ${ig}`, DIR);

    console.log("++++");
    console.log("++++ Installing Emscripten");
    console.log("++++");
    let f=path.normalize(`${DIR}/../various/download/emsdk-portable.tar.gz`);

    do_execute=false;
    
    await executeCommand(`tar xvfz ${f}`, DIR);
    await executeCommand(`python ${DIR}/emsdk_portable/emsdk update`,`${DIR}/emsdk_portable`);
    await executeCommand(`python3 ${DIR}/emsdk_portable/emsdk install latest`,`${DIR}/emsdk_portable`);
    await executeCommand(`python3 ${DIR}/emsdk_portable/emsdk activate latest`,`${DIR}/emsdk_portable`);

    do_execute=true;
    
    console.log("++++");
    console.log("++++ Creating scripts");
    console.log("++++");

    copyFileSync(DIR,'../config/setpaths_build.sh',DIR,'setpaths.sh');
    copyFileSync(DIR,'../compiletools/cmake.sh',DIR,'cmake.sh');
    copyFileSync(DIR,'../compiletools/ccmake.sh',DIR,'ccmake.sh');
    copyFileSync(DIR,'../compiletools/cmake_native.sh',DIR,'cmake_native.sh');
    copyFileSync(DIR,'../compiletools/ccmake_native.sh',DIR,'ccmake_native.sh');
    console.log("++++");
    await executeCommand('chmod +x *make*.sh',DIR);
    console.log("++++");
};

main().then( () => {
    console.log('++++\n++++ done\n++++');
    process.exit(0);
}).catch( (e) => {
    console.log('----\n---- error '+e+'\n----');
    process.exit(1);
});



