/*  license
    
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

const path=require('path');
const util = require('bis_util');
const biscmdline = require('bis_commandlineutils');
const BisFileServerClient=require('bis_fileserverclient');
const genericio=require('bis_genericio');
const colors=require('colors/safe');
const tempfs = require('temp').track();
const WebSocket = require('ws');

let terminateResolve=null;
let terminateReject=null;



// ------------------------------- Testing Code --------------------------------------------------

const createTestingServer=function(timeout=500) {

    const serverpath= path.join(__dirname,'../bin');
    
    let servername=path.resolve(serverpath,"bisweb.js");

    
    let infostr=[];
    let tmpDir=tempfs.mkdirSync('test_image');
    console.log(colors.blue('____ created temporary directory:'+tmpDir));
    let cmd=`node ${servername} bisserver --tmpdir ${tmpDir}`;

    return new Promise( (resolve,reject) => {

        let fn=function() {
            console.log(colors.blue('______________________________\n____ Authenticating'));
            console.log(colors.blue('____ \t connecting to',infostr.join(' and '),'\n____'));

            let client=new BisFileServerClient(WebSocket);
            client.authenticate(infostr[1],infostr[0]).then( () => {
                console.log(colors.blue('____ Done authenticating\n______________________________'));

                if (path.sep==='\\')
                    tmpDir=util.filenameWindowsToUnix(tmpDir);
                
                genericio.setFileServerObject(client);
                resolve({  client: client, tmpDir : tmpDir});
            }).catch( (e) => {
                console.log(colors.red('\n____ Failed to authenticate',e));
                reject(e);
            });
        };
        
        let done=function(status,code) {
            if (status===false) {
                console.log(colors.red('---- server failed '+code));
                reject('---- server failed '+code);
                terminateReject(code);
            } else {
                console.log(colors.blue('____ server exited succesfully.\n______________________________'));
                terminateResolve(code);
            }
        };

        let listen=function(message) {

            let ind=message.indexOf('.ss');
            let lind=message.lastIndexOf('.ss');

            if (ind>=0) {
                infostr.push(message);
            }
            if (lind>=0 && lind>ind) {
                infostr.push(message);
            }
            
            if (infostr.length>1) {
                
                let ind1=infostr[0].indexOf('hostname:');
                let hostname=infostr[0].substr(ind1+9,50).split('\n')[0].trim();
                console.log(colors.blue('____ Hostname=',hostname));

                let ind2=infostr[1].indexOf('password:');
                let password=infostr[1].substr(ind2+9,50).split('\n')[0].trim();
                console.log(colors.blue('____ Password=',password));
                infostr=[ hostname,password];
                // Wait 1 second and then authenticate
                setTimeout(fn,timeout);
                return false;
            }
            return true;
        };
        
        biscmdline.executeCommand(cmd,__dirname,done,listen);

    });
};

const terminateTestingServer = function(client) {

    return new Promise( (resolve,reject) => {
        try {
            console.log(colors.blue('______________________________\n____ Cleanup time'));
            client.sendCommand({'command' :'terminate'});
            genericio.setFileServerObject(null);
        } catch(e) {
            console.log("There is an error",e);
            reject(e);
        }

        terminateReject=reject;
        terminateResolve=resolve;
    });
};

// ------------------------------- Exporting -----------------------------------------------------

module.exports = {
    createTestingServer :     createTestingServer,
    terminateTestingServer :     terminateTestingServer
};
