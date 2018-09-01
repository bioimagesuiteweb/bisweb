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

const wsutil = require('bis_wsutil');

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


// ------------------------------- Exporting -----------------------------------------------------

module.exports = {
    formatPacket : formatPacket,
    readFrame :  readFrame,
};
