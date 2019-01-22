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

/**
 * @file Browser/Node.js module. Contains {@link BisWasmWrapperUtils}.
 * @author Xenios Papademetris
 * @version 1.0
 */



/**
 * BisWasmWrapperUtils namespace. Utility code to call Web Assembly C++ code.
 * @namespace BisWasmWrapperUtils
 */

const libbiswasm_raw=require('libbiswasm'); // Ignored in Webpack for Web, used just for node.js
const BisWebImage=require('bisweb_image');
const BisWebMatrix=require('bisweb_matrix');
const bistransforms=require('bis_transformationutil');
const wasmutil=require('bis_wasmutils');
const genericio=require('bis_genericio.js');

// --------------------------------------------------------------------------------------------------
/** Initialize Wasm library
 * @param{Object} obj - used in webworker setup
 * @returns{Promise} with Module as payload
 */
var initialize_wasm=function(obj=null) {

    if (genericio.getmode() === "node") 
        return initialize_wasm_node();

    return new Promise( (resolve,reject) => {
        
        if (obj!==null) {
            
            if (!obj.binary)
                reject('No binary in obj');
            
            let done=function(m) {
                m.bisdate=obj.date;
                resolve(m);
            };

            obj.initialize(done,obj.filename,obj.binary);
            return;
        }

        let done=function(m) {
            m.bisdate=window.bioimagesuitewasmpack.date;
            resolve(m);
        };
        let clb=function() {
            let dname=window.bioimagesuitewasmpack.filename;
            let binary=genericio.fromzbase64(window.bioimagesuitewasmpack.binary);
            window.bioimagesuitewasmpack.initialize(done,dname,binary);
        };
        
        if (document.readyState == 'complete') {
            clb();
        } else {
            if (window.attachEvent) {
                window.attachEvent('onload', clb);
            } else {
                if (window.onload) {
                    let currentOnLoad = window.onload;
                    let newOnload = (event) => {
                        currentOnLoad(event);
                        clb();
                    };
                    window.onload = newOnload;
                } else {
                    window.onload = clb;
                }
            }
        }
    });
};
                      
/** Initialize Wasm library in node.js
 * @returns{Promise} with Module as payload
 */
var initialize_wasm_node=function() {

    // Node.js, read .wasm file directly here
    const fs=genericio.getfsmodule();
    const path=genericio.getpathmodule();

    return new Promise( (resolve,reject) => {    
        let dname=path.normalize(path.resolve(__dirname, 'libbiswasm.wasm'));
        if (!fs.existsSync(dname)) {
            dname=path.normalize(path.resolve(__dirname, '../lib/libbiswasm.wasm'));
        }
        
        if (!fs.existsSync(dname)) {
            dname=path.normalize(path.resolve(__dirname, '../libbiswasm.wasm'));
        }
        
        if (!fs.existsSync(dname)) {
            dname=path.normalize(path.resolve(__dirname, '../../build/wasm/libbiswasm.wasm'));
        }
        if (!fs.existsSync(dname)) {
            reject('Can not find libbiswasm.wasm in '+dname);
        } 
        
        let binary=null;

        try {
            console.log('.... Reading wasm binary from dname=',dname);
            let d1=fs.readFileSync(dname);
            binary=new Uint8Array(d1);
        } catch(e)  {
            reject(e);
        }
        
        if (binary===null) {
            reject('no wasm library specified');
        }
        
        // Load WASM and initialize libbiswasm_wrapper module
        // ------------------------------------------------------------
        libbiswasm_raw(resolve,dname,binary);
    });
};
// -------------------------------------------------------------------------------------------

var serializeObject=function(Module,obj,datatype) {

    if (obj.constructor.name === "Number") {
        //  console.log('Not serializing object is already a WASM array');
        return obj;
    }
    
    if (datatype!=='Matrix' && datatype!=='Vector')
        return obj.serializeWasm(Module);

    if (obj.constructor.name==='BisWebMatrix')
        return obj.serializeWasm(Module);
    
    if (datatype==='Vector') {
        let name=obj.constructor.name;
        if (name==="Array") {
            let v=new Float32Array(obj.length);
            for (let i=0;i<obj.length;i++) {
                v[i]=obj[i];
            }
            return wasmutil.packStructure(Module,v,[ v.length]);
        }
    }
    
    return wasmutil.packStructure(Module,obj,[ obj.length]);
};


var deserializeAndDeleteObject=function(Module,ptr,datatype,first_input=0) {

    if (ptr===0) {
        throw new Error("<p>Bad output from calling WebAssembly function. Perhaps this function is not available.</p><HR>");
    }
    
    first_input=first_input || 0;
    
    if (datatype==='Matrix' || datatype==='Vector') {
        let output=new BisWebMatrix();
        output.deserializeWasmAndDelete(Module,ptr);
        return output;
    }
    
    if (datatype==='bisImage' || datatype==='image' || datatype==='Image') {

        let output=new BisWebImage();
        if (first_input!==0 && first_input.constructor.name !== "Number") 
            output.deserializeWasmAndDelete(Module,ptr,first_input);
        else
            output.deserializeWasmAndDelete(Module,ptr);
        return output;
    }
    
    if (datatype==='bisComboTransformation') {
        const output=bistransforms.createComboTransformation();
        output.deserializeWasmAndDelete(Module,ptr);
        return output;
    }
    
    if (datatype==='bisGridTransformation') {
        const output=bistransforms.createGridTransformation();
        output.deserializeWasmAndDelete(Module,ptr);
        return output;
    }
    
    if (datatype==='bisLinearTransformation') {
        const output=bistransforms.createLinearTransformation(2);
        output.deserializeWasmAndDelete(Module,ptr);
        return output;
    }

    if (datatype=='String') {
        const wasmobj=wasmutil.unpackStructure(Module,ptr);
        wasmutil.release_memory(Module,ptr);
        return wasmutil.map_array_to_string(wasmobj.data_array);
    }

    return 0;
};


// ----------------------------------------------------------------------------------
// Output Object
// ----------------------------------------------------------------------------------

module.exports = {
    serializeObject : serializeObject,
    deserializeAndDeleteObject : deserializeAndDeleteObject,
    initialize_wasm : initialize_wasm, 
};

// One day ES6
//export default outputobject;



