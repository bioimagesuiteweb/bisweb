#!/usr/bin/env node

const path=require('path');
const util=require('./bis_createutil');
const rimraf=require('rimraf');

if (path.sep==='\\') {
    console.log('++++ BioImageSuite Web create developer environment \n++++');
    console.log('---- This file will only run on a UNIX OS (Mac or Linux)');
    process.exit(1);
}

let extra=process.argv[2] || 'build';

let advanced=false;

if (extra === 'advanced') {
    advanced=true;
    extra='build';
}

const main=async function() {

    console.log("------------------------------------------------------------------------------------");
    const DIR= path.normalize(path.join(__dirname,path.join('..',extra)));
    console.log('++++ BioImageSuite Web\n++++ creating full build directory\n++++ \tDIR=     '+DIR+' advanced='+advanced+'\n++++');
    let doexit=true;
    if (advanced) {
        doexit=false;
        try {
            rimraf.sync(path.join(DIR,'wasm'));
            rimraf.sync(path.join(DIR,'web'));
            rimraf.sync(path.join(DIR,'wasm'));
            rimraf.sync(path.join(DIR,'native'));
        } catch(e) {
            console.log(e);
        }
    }

    util.initialize(DIR,doexit);

    
    console.log("++++");
    console.log("++++ Creating scripts");
    console.log("++++");
    util.copyFileSync(DIR,'../config/setpaths_build.sh',DIR,'setpaths.sh');
    util.copyFileSync(DIR,'../compiletools/cmake.sh',DIR,'cmake.sh');
    util.copyFileSync(DIR,'../compiletools/ccmake.sh',DIR,'ccmake.sh');
    util.copyFileSync(DIR,'../compiletools/cmake_native.sh',DIR,'cmake_native.sh');
    util.copyFileSync(DIR,'../compiletools/ccmake_native.sh',DIR,'ccmake_native.sh');
    util.copyFileSync(DIR,'../docker/fullbuild.sh',DIR,'fullbuild.sh');
    util.copyFileSync(DIR,'../docker/wasmbuild.sh',DIR,'wasmbuild.sh');
    util.copyFileSync(DIR,'../docker/webbuild.sh',DIR,'webbuild.sh');
    util.copyFileSync(DIR,'../docker/nativebuild.sh',DIR,'nativebuild.sh');
    util.copyFileSync(DIR,'../docker/testbuild.sh',DIR,'testbuild.sh');


    console.log("++++");
    await util.executeCommand('chmod +x *make*.sh',DIR);

    if (!advanced) {
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
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk install clang-e1.38.31-64bit`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk activate clang-e1.38.31-64bit`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk install node-8.9.1-64bit`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk activate node-8.9.1-64bit`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk install  emscripten-1.38.31`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk activate emscripten-1.38.31`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk install sdk-1.38.31-64bit`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk activate sdk-1.38.31-64bit`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`python ${DIR}/emsdk_portable/emsdk list`);
    }
    console.log('++++');
};

main().then( () => {
    console.log('++++\n++++ done\n++++');
    process.exit(0);
}).catch( (e) => {
    console.log('----\n---- error '+e+'\n----');
    process.exit(1);
});



