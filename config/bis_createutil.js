const fs=require('fs');
const path=require('path');
const child_process=require('child_process');
const unzip=require('unzip');
const rimraf=require('rimraf');

const makeDir=function(f1,exit=true) {
    console.log('++++ creating directory',f1);
    try {
        fs.mkdirSync(f1);
    } catch(e) {
        if (e.code === 'EEXIST') {
            console.log('---- directory '+f1+' exists. Remove and try again.'+exit);
            if (exit)
                process.exit(0);
            else
                return;
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

const linkFileSync=function(d1,fname,d2,fname2) {
    
    let f1=path.join(d1,fname);
    let f2=path.join(d2,fname2);

    try  {
        rimraf.sync(f2);
    } catch(e) {
        console.log(e);
    }
    
    console.log('++++ symlink file  '+f1+'\n\t\t--> '+f2);
    try {
        fs.symlinkSync(f1,f2);
    } catch(e) {
        console.log('---- error',e);
        process.exit(0);
    }
};


let executeCommand=function(command,dir,force=false,dummy=false) {

    let done=false;
    
    if (force)
        console.log('++++ The next step will take a while ...');

    if (dummy) {
        console.log(command);
        return;
    }
    
    console.log('++++ ['+dir+"] "+command);

    
    return new Promise( (resolve,reject) => {

        try { 
            let proc=child_process.exec(command, { cwd : dir });
            if (force) {
                proc.stdout.pipe(process.stdout);
                proc.stderr.pipe(process.stderr);

                let sleep=function(ms) {  return new Promise(resolve => setTimeout(resolve, ms));};
                
                let fn= (async() => {
                    while (done) {
                        console.log('fn');
                        proc.stdout.write();
                        process.stdout.write();
                        await sleep(1000);
                    }
                });
                fn();
            } else {
                proc.stdout.on('data', function(data) {
                    let d=data.trim();
                    let show=true;
                    if (d.length<1)
                        show=false;
                    if (d.indexOf('inflating')>=0)
                        show=false;
                    
                    if (show)
                        console.log('____ '+d.split('\n').join('\n____ '));
                });
                proc.stderr.on('data', function(data) {
                    console.log('---- Error: '+data);
                });
            }
            
            proc.on('exit', function(code) {
                done=true;
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

const copyFileSync2=function(d1,fname,t1,t2) {

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

let initialize=function(DIR,exit=true) {

    const WASMDIR= path.normalize(path.join(DIR,path.join('..',path.join('various','wasm'))));
    
    makeDir(DIR,exit);
    makeDir(path.join(DIR,'web'),exit);
    makeDir(path.join(DIR,'wasm'),exit);
    makeDir(path.join(DIR,'dist'),exit);
    makeDir(path.join(DIR,'native'),exit);
    console.log('++++');
    
    copyFileSync2(WASMDIR,`libbiswasm_wasm.js`,DIR,`web`);
    copyFileSync2(WASMDIR,`libbiswasm_nongpl_wasm.js`,DIR,`web`);
    copyFileSync2(WASMDIR,`libbiswasm.js`,DIR,`wasm`);
    copyFileSync2(WASMDIR,`libbiswasm_nongpl.js`,DIR,`wasm`);
    copyFileSync2(WASMDIR,`libbiswasm.wasm`,DIR,`wasm`);
    copyFileSync2(WASMDIR,`libbiswasm_nongpl.wasm`,DIR,`wasm`);
    copyFileSync2(WASMDIR,`libbiswasm_wrapper.js`,DIR,`wasm`);
    copyFileSync2(WASMDIR,`biswasmdate.js`,DIR,`wasm`);
};

let unzipf=function(zipfile,outdir) {

    console.log('++++ unzipping',zipfile,'in',outdir);
    
    return new Promise( (resolve,reject) => {
        fs.createReadStream(zipfile).
            pipe(unzip.Extract({ path: outdir })).
            on('close' , () => {
                console.log('++++ done unzip ',zipfile);
                resolve();
            }).
            on('error', (e) => {
                console.log('++++ error unzip ',zipfile);
                reject(e);
            });
    });
};
              



module.exports = {
    makeDir : makeDir,
    copyFileSync : copyFileSync,
    linkFileSync : linkFileSync,
    executeCommand : executeCommand,
    unzip : unzipf,
    initialize : initialize,
};
