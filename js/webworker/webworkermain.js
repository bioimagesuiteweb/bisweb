/*global atob, btoa, postMessage,self */
/* jshint: validthis: true */

"use strict";

// Inject this into generic_io
let genericio=require('bis_genericio');
genericio.setWebWorkerScope( { atob : atob.bind(self),
                             btoa : btoa.bind(self),
                           });

const biswrap = require('libbiswasm_wrapper');
const wasmlib = require('../../build/web/libbiswasm_wasm.js');

let initialized=false;
let bis_webworker=require("webworkermoduleutil.js");

self.onmessage = function(e) {

    if (e.data==='initialize') {
        if (!initialized) {
            console.log('++++ Webworker Initializing Web Assembly');
            // Decompress binary
            wasmlib.binary=genericio.fromzbase64(wasmlib.binary);
            biswrap.initialize(wasmlib).then( () => {
                initialized=true;
                postMessage('initialized');
            });
        } else {
            console.log('++++ Webworker Already Initialized WASM Result =',biswrap.test_wasm());
            postMessage('initialized');
        }
        return;
    }
    
    let obj=null;
    try {
        obj=JSON.parse(e.data);
    } catch(err) {
        console.log("Unknown message received",err,err.stack,e.data);
    }
        
    if (obj.modulename) {
            //        console.log("WebWorker: Received command to execute module "+obj.modulename+' id='+obj.id);
        bis_webworker.inWorkerExecuteModule(obj,postMessage);
    }  else {
        console.log("WebWorker: Not a module command");
    }
};


console.log('++++ BIS Web Worker Created');


