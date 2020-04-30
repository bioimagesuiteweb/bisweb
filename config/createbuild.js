#!/usr/bin/env node

const path=require('path');
const util=require('./bis_createutil');
const rimraf=require('rimraf');

let pythonexec= process.env.PYTHON || 'python';

console.log('Using Python=',pythonexec);


/*if (path.sep==='\\') {
    console.log('++++ BioImageSuite Web create developer environment \n++++');
    console.log('---- This file will only run on a UNIX OS (Mac or Linux)');
    process.exit(1);
}*/

let bextra='build';
let inwindows=false;
if (path.sep ==='\\') {
    inwindows=true;
    bextra='build';
}
    

let extra=process.argv[2] || bextra;

let advanced=false;

if (extra === 'advanced') {
    advanced=true;
    extra=bextra;
}

console.log('Process=',process.argv);



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

    //util.initialize(DIR,doexit);
    util.makeDir(DIR,doexit);
    
    console.log("++++");
    console.log("++++ Creating scripts");
    console.log("++++");
    if (!inwindows) {
        util.copyFileSync(DIR,'../config/setpaths_build.sh',DIR,'setpaths.sh');
        util.copyFileSync(DIR,'../compiletools/cmake.sh',DIR,'cmake.sh');
        util.copyFileSync(DIR,'../compiletools/ccmake.sh',DIR,'ccmake.sh');
        util.copyFileSync(DIR,'../compiletools/cmake_native.sh',DIR,'cmake_native.sh');
        util.copyFileSync(DIR,'../compiletools/ccmake_native.sh',DIR,'ccmake_native.sh');
        util.linkFileSync(DIR,'../compiletools/fullbuild.sh',DIR,'fullbuild.sh');
        util.linkFileSync(DIR,'../compiletools/wasmbuild.sh',DIR,'wasmbuild.sh');
        util.linkFileSync(DIR,'../compiletools/webbuild.sh',DIR,'webbuild.sh');
        util.linkFileSync(DIR,'../compiletools/nativebuild.sh',DIR,'nativebuild.sh');
        util.linkFileSync(DIR,'../compiletools/testbuild.sh',DIR,'testbuild.sh');


        console.log("++++");
        await util.executeCommand('chmod +x *make*.sh',DIR);
    }
    
    if (!advanced) {
        console.log("++++");
        console.log("++++ Installing Eigen3");
        console.log("++++");
        util.makeDir(path.join(DIR,'eigen3'));
        let eig=path.normalize(`${DIR}/../various/download/Eigen.zip`);
        await util.unzip(eig, `${DIR}/eigen3`);
        
        console.log("++++");
        console.log("++++ Installing IGL");
        console.log("++++");
        util.makeDir(path.join(DIR,'igl'));
        let ig=path.normalize(`${DIR}/../various/download/igl.zip`);
        await util.unzip(ig, DIR);
        
        console.log("++++");
        console.log("++++ Installing Emscripten");
        console.log("++++");
        let f=path.normalize(`${DIR}/../various/download/emsdk-portable.zip`);
        await util.unzip(f, DIR);
        
        let cmd=pythonexec+' '+path.normalize(path.join(DIR,'emsdk_portable/emsdk.py'));
        console.log('++++ python emsdk:',cmd);
        
        await util.executeCommand(`${cmd} update`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`${cmd} install  1.39.7`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`${cmd} activate 1.39.7`,`${DIR}/emsdk_portable`,true);
        await util.executeCommand(`${cmd} list`);
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



