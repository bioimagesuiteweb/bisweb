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


const BisWebImage=require('bisweb_image');
const BisWebMatrix=require('bisweb_matrix');
const bistransforms=require('bis_transformationutil');
const wasmutil=require('bis_wasmutils');
const libbiswasm_raw=require('libbiswasm'); // Ignored in Webpack for Web
const genericio=require('bis_genericio.js');

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


var initialize_wasm=function(obj=null) {

    let dname="external js_module (libbiswasm_wasm.js)";

    return new Promise( (resolve,reject) => {

        console.log('Here ',obj);

        if (obj!==null) {
            // Web worker for now ...
            if (!obj.binary)
                reject('No binary in obj');
            let done=function(m) {
                m.bisdate=obj.date;
                resolve(m);
            };

            dname="internal js module (webworker)";
            libbiswasm_raw(done,dname,obj.binary);
            return;
        }
        
        
        if (typeof window !== 'undefined') {
            let binary=genericio.fromzbase64(window.biswebpack.binary);

            let done=function(m) {
                m.bisdate=window.biswebpack.date;
                resolve(m);
            };


            
            let clb=function() {
                window.biswebpack.initialize(done,dname,binary);
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
                        //window invokes attachViewers so have to bind algorithm controller explicitly
                        window.onload = clb;
                    }
                }
            }
            return;
        }

        // Node.js, read .wasm file directly here
        const fs=genericio.getfsmodule();
        const path=genericio.getpathmodule();
        
        dname=path.normalize(path.resolve(__dirname, 'libbiswasm.wasm'));
        if (!fs.existsSync(dname)) {
            //                console.log('Can not find libbiswasm.wasm in',dname);
            dname=path.normalize(path.resolve(__dirname, '../lib/libbiswasm.wasm'));
        }
        
        if (!fs.existsSync(dname)) {
            //                console.log('Can not find libbiswasm.wasm in',dname);
            dname=path.normalize(path.resolve(__dirname, '../libbiswasm.wasm'));
        }
        
        if (!fs.existsSync(dname)) {
            //console.log('Can not find libbiswasm.wasm in',dname);
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
        
        // Make String Binary
        // ------------------------------------------------------------
        if (binary===null) {
            reject('no wasm library specified');
        }
        
        // Load WASM and initialize libbiswasm_wrapper module
        // ------------------------------------------------------------
        // console.log('Initializing wasm library :', binary.length);
        
        libbiswasm_raw(resolve,dname,binary);
    });
    
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



