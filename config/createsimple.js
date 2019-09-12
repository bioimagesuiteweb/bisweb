#!/usr/bin/env node

const path=require('path');
const util=require('./bis_createutil');
const rimraf=require('rimraf');

let pythonexec='python';

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
    const DIR= path.normalize(path.join(__dirname,path.join('..','build')));
    util.linkFileSync(DIR,'../compiletools/fullbuild.sh',DIR,'fullbuild.sh');
    util.linkFileSync(DIR,'../compiletools/wasmbuild.sh',DIR,'wasmbuild.sh');
    util.linkFileSync(DIR,'../compiletools/webbuild.sh',DIR,'webbuild.sh');
    util.linkFileSync(DIR,'../compiletools/nativebuild.sh',DIR,'nativebuild.sh');
    util.linkFileSync(DIR,'../compiletools/testbuild.sh',DIR,'testbuild.sh');

};
  
main().then( () => {
    console.log('++++\n++++ done\n++++');
    process.exit(0);
}).catch( (e) => {
    console.log('----\n---- error '+e+'\n----');
    process.exit(1);
});



