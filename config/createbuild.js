#!/bin/bash

const path=require('path');
const util=require('./bis_createutil');

if (path.sep==='\\') {
    console.log('++++ BioImageSuite Web create developer environment \n++++');
    console.log('---- This file will only run on a UNIX OS (Mac or Linux)');
    process.exit(1);
}

let extra=process.argv[2] || 'build';

const main=async function() {

    console.log("------------------------------------------------------------------------------------");
    const DIR= path.normalize(path.join(__dirname,path.join('..',extra)));
    console.log('++++ BioImageSuite Web\n++++ creating full build directory\n++++ \tDIR=     '+DIR+'\n++++');
    util.initialize(DIR);
    
    console.log("++++");
    console.log("++++ Creating scripts");
    console.log("++++");
    util.copyFileSync(DIR,'../config/setpaths_build.sh',DIR,'setpaths.sh');
    util.copyFileSync(DIR,'../compiletools/cmake.sh',DIR,'cmake.sh');
    util.copyFileSync(DIR,'../compiletools/ccmake.sh',DIR,'ccmake.sh');
    util.copyFileSync(DIR,'../compiletools/cmake_native.sh',DIR,'cmake_native.sh');
    util.copyFileSync(DIR,'../compiletools/ccmake_native.sh',DIR,'ccmake_native.sh');
    util.copyFileSync(DIR,'../compiletools/fullbuild.sh',DIR,'fullbuild.sh');
    console.log("++++");
    await util.executeCommand('chmod +x *make*.sh',DIR);

    console.log("++++");
    console.log("++++ Installing Eigen3");
    console.log("++++");
    util.makeDir(path.join(DIR,'eigen3'));
    let eig=path.normalize(`${DIR}/../various/download/Eigen.zip`);
    await util.executeCommand(`unzip ${eig}`, `${DIR}/eigen3`);

    console.log("++++");
    console.log("++++ Installing IGL");
    console.log("++++");
    util.makeDir(path.join(DIR,'igl'));
    let ig=path.normalize(`${DIR}/../various/download/igl.zip`);
    await util.executeCommand(`unzip ${ig}`, DIR);

    console.log("++++");
    console.log("++++ Installing Emscripten");
    console.log("++++");
    let f=path.normalize(`${DIR}/../various/download/emsdk-portable.tar.gz`);
    await util.executeCommand(`tar xvfz ${f}`, DIR);
    await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk update`,`${DIR}/emsdk_portable`,true);
    await util.executeCommand(`python3 ${DIR}/emsdk_portable/emsdk install latest`,`${DIR}/emsdk_portable`,true);
    await util.executeCommand(`python3 ${DIR}/emsdk_portable/emsdk activate latest`,`${DIR}/emsdk_portable`);
    console.log('++++');
};

main().then( () => {
    console.log('++++\n++++ done\n++++');
    process.exit(0);
}).catch( (e) => {
    console.log('----\n---- error '+e+'\n----');
    process.exit(1);
});



