/*global atob, btoa, postMessage,self */
/* jshint: validthis: true */

"use strict";

console.log('wwww  I n    W e b    W o r k e r\n\n');
// Inject this into generic_io
let genericio=require('bis_genericio');
genericio.setWebWorkerScope( { atob : atob.bind(self),
                             btoa : btoa.bind(self),
                           });

const biswrap = require('libbiswasm_wrapper');
const wasmlib = require('../../build/web/libbiswasm_wasm.js');


let binary=genericio.fromzbase64(wasmlib);
biswrap.initialize(binary).then( () => { console.log('++++ Webworker WASM Result =',biswrap.test_wasm());});

let bis_webworker=require("webworkermoduleutil.js");

self.onmessage = function(e) {

    let obj=null;
    try {
        obj=JSON.parse(e.data);
    } catch(err) {
        console.log("Unknown message received",err,err.stack,e.data);
    }
        
    console.log('Keys=',Object.keys(obj));
    if (obj.modulename) {
        console.log("WebWorker: Received command to execute module "+obj.modulename+' id='+obj.id);
        bis_webworker.inWorkerExecuteModule(obj,postMessage);
    }  else {
        console.log("WebWorker: Not a module command");
    }
};

console.log('++++ BIS Web Worker Initialized');



