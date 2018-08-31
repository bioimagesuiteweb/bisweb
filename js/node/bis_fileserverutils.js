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
const wsutil = require('wsutil');
const util = require('bis_util');
const biscmdline = require('bis_commandlineutils');
const WebSocket = require('ws');
const BisFileServerClient=require('bis_fileserverclient');
const genericio=require('bis_genericio');
const colors=require('colors/safe');
const tempfs = require('temp').track();

let terminateResolve=null;
let terminateReject=null;

/**
 * Takes a payload and a description of the payload type and formats the packet for transmission. 
 * 
 * @param {String} payloadType - A word describing the nature of the payload.
 * @param {String|Binary} data - The payload for the packet.
 * @returns A raw bytestream that can be sent over the socket.
 */
let formatPacket = function(payloadType, data) {
    let payload, opcode;
    //transmissions are either text (JSON) or a raw image 
    if (payloadType === 'binary') {
        payload = data;
        opcode = 2;
    } else {
        payload = JSON.stringify({
            'type' : payloadType,
            'payload' : data
        });
        opcode = 1;
        //console.log('Sending payload',payload.substr(0,100));
    }
    
    let controlFrame = wsutil.formatControlFrame(opcode, payload.length);
    let packetHeader = Buffer.from(controlFrame.buffer), packetBody = Buffer.from(payload);
    let packet = Buffer.concat([packetHeader, packetBody]);
    
    return packet;
};


const readFrame = function(chunk) {
        
    let controlFrame = chunk.slice(0, 14);
    let parsedControl = wsutil.parseControlFrame(controlFrame);
    //    console.log('parsed control frame', parsedControl);
    
    //drop unmasked packets
    if (!parsedControl.mask) {
        //console.log('Received a transmission with no mask from client, dropping packet.'); 
        return;
    }
    
    if (parsedControl.payloadLength<0 ||
        parsedControl.payloadLength>65536) {
        //console.log('Chunk=',chunk.byteLength);
        //        console.log('ControlFrame=',controlFrame,controlFrame.byteLength);
        //        console.log('Bad payload',parsedControl.payloadLength);
        return;
    }
    
    
    let decoded = new Uint8Array(parsedControl.payloadLength);
    
    //decode the raw data (undo the XOR)
    for (let i = 0; i < parsedControl.payloadLength; i++) {
        decoded[i] = chunk[i + parsedControl.datastart] ^ parsedControl.mask[i % 4];
    }
    
    return { 
        'parsedControl' : parsedControl,
        'decoded' : decoded
    };
};


// ------------------------------- Testing Code --------------------------------------------------

const createTestingServer=function(serverpath=null,timeout=1000) {

    serverpath=serverpath || path.join(__dirname,'../../fileserver');
    
    let servername=path.resolve(serverpath,"server.js");

    
    let infostr=[];
    let tmpDir=tempfs.mkdirSync('test_image');
    console.log(colors.blue('____ created temporary directory:'+tmpDir));
    let cmd=`node ${servername} --tmpdir ${tmpDir}`;
    
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
            let ind=message.indexOf('ss');
            let lind=message.lastIndexOf('ss');

            if (ind>=0) {
                infostr.push(message);
            }
            if (lind>=0 && lind>ind) {
                infostr.push(message);
            }
            
            if (infostr.length>1) {

                let ind1=infostr[0].indexOf('hostname:');
                let hostname=infostr[0].substr(ind1+9,50).split('\n')[0].trim();

                let ind2=infostr[1].indexOf('password:');
                let password=infostr[1].substr(ind2+9,50).split('\n')[0].trim();

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
    formatPacket : formatPacket,
    readFrame :  readFrame,
    createTestingServer :     createTestingServer,
    terminateTestingServer :     terminateTestingServer
};
