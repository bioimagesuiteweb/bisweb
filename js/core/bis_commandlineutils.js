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

"use strict";

const genericio=require('bis_genericio');
const colors=genericio.getcolorsmodule(),
      child_process = genericio.getchildprocessmodule();

let inelectron=false;
if (genericio.getmode() === 'electron' )
    inelectron=true;

let getTime=function() {
    //    http://stackoverflow.com/questions/7357734/how-do-i-get-the-time-of-day-in-javascript-node-js

    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    return  "[" + hour + ":" + min + ":" + sec +"]";
};

let executeCommand=function(command,dir,done=0,printfn=null) {
    if (inelectron)
        printfn = printfn || console.log;
    else
        dir = dir || __dirname;
    console.log(getTime()+" "+colors.green(dir+">")+colors.red(command+'\n'));

    
    //    if (printfn) {
    //        printfn('Initializing output from '+command,0);
    //  }
    
    if (done===0) {
        let out="";
        try {
            out=child_process.execSync(command, { cwd : dir });
        } catch(e) {
            out='error '+e;
        }
        return out;
    }
    
    try { 
        let proc=child_process.exec(command, { cwd : dir });
        proc.stdout.on('data', function(data) {
            if (printfn)  {
                let ok=printfn(data.trim(),0);
                if (!ok)
                    printfn=false;
            }
            if (!inelectron) 
                process.stdout.write(colors.yellow(data.trim()+'\n')); 
        });
        proc.stderr.on('data', function(data) {
            if (printfn) {
                printfn(data,1);
            }
            if (!inelectron)
                process.stdout.write(colors.red(data+'\n'));
            
        });
        proc.on('exit', function(code) { done(true,code);});
    } catch(e) {
        console.log(' error '+e);
        done(false,1);
    }
};


let executeCommandAndLog=function(command,dir,printfn=0) {

    if (inelectron)
        printfn = printfn || console.log;
    else
        dir = dir || __dirname;
    
    if (!inelectron)
        console.log(getTime()+" "+colors.green(dir+">")+colors.red(command+'\n'));
    else
        console.log(getTime()+" "+dir+">"+command+'\n');
    let log='';
    
    return new Promise( (resolve,reject) => {

        try {
            let proc=child_process.exec(command, { cwd : dir });
            proc.stdout.on('data', function(data) {
                if (printfn)
                    printfn(data);
                if (!inelectron)
                    process.stdout.write(colors.yellow(data));
                log+=data;

            });

            proc.stderr.on('data', function(data) {
                if (printfn)
                    printfn(data);
                if (!inelectron)
                    process.stdout.write(colors.red(data));
                log+=data;
            });
            
            proc.on('exit', function(code) {
                resolve(log+'\n exit code ='+code);
            });
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = {
    getTime : getTime,
    executeCommand: executeCommand,
    executeCommandAndLog :  executeCommandAndLog,
};
