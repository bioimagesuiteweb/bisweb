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
 * @file Browser/Node.js module. Contains {@link bisWasmUtils}.
 * @author Xenios Papademetris
 * @version 1.0
 */


/**
 * bisWasmUtils namespace. Utility code to convert memory for Web Assembly/C++ code.
 * @namespace bisWasmUtils
 */

const numeric=require('numeric');

// ------------------------------------------------------------
//  Utility Code
// ------------------------------------------------------------
/**
 * Nifti data codes
 * @alias bisWasmUtils.niftitypes
 *
 */
const niftitypes= {
    2 :   [ 'uchar',  Uint8Array ,1],
    4 :   [ 'sshort', Int16Array ,2],
    8 :   [ 'sint', Int32Array  , 4],
    16 :  [ 'float',Float32Array, 4 ],
    64 :  [ 'double',Float64Array, 8],
    256 : [ 'schar',Int8Array ,1 ],
    512 : [ 'ushort',Uint16Array,2 ],
    768 : [ 'uint',Uint32Array,4],
};

try {
    niftitypes['1024']= [ 'int64',BigInt64Array,8];
    niftitypes['1280']= [ 'uint64',BigUint64Array,8];
} catch (e) {
    console.log('___ In older JS engine. No BigInt support.');
}

/**
 * Name2Type mapps
 * @alias bisWasmUtils.name2type
 *
 */
const name2type= {
    "Uint8Array" : 2,
    "Int16Array" : 4, 
    "Int32Array" : 8,
    "Float32Array" : 16,
    "Float64Array" : 64,
    "Int8Array" : 256,
    "Uint16Array" : 512,
    "Uint32Array" : 768,
    "BigInt64Array"  : 1024,
    "BigUint64Array"  : 1280,
};

/** gets the code 2,4,6,8 etc from the js data dtype
 * @alias bisWasmUtils.getCodeFromType
 * @param {TypedArray} arr - the array whose type we need
 * @returns {number}  --  the nifti type for the array (e.g. Float32Array -> 16)
 */
var getCodeFromType=function(arr) {
    return name2type[arr.constructor.name];
};


/** gets the shortname e.g. float, int etc from the js data dtype
 * @alias bisWasmUtils.getNameFromType
 * @param {TypedArray} arr - the array whose type we need
 * @returns {String}  --  the short name for the array (e.g. Float32Array -> 'float')
 */
var getNameFromType=function(arr) {
    let code=getCodeFromType(arr);
    let elem=niftitypes[code];
    return elem[0];
};

/** gets the type e.g. Float32Array from the short name e.g. float
 * @alias bisWasmUtils.getNameFromType
 * @param {String} name - the name whose type we need
 * @returns {Type}  --  the constructor name (e.g. 'float' ->'Float32Array')
 */
var getTypeFromName=function(name) {

    let tp=Float32Array;
    let i=0,found=false;
    let keys=Object.keys(niftitypes);
    while (i< keys.length && found===false) {
        let elem=niftitypes[keys[i]];
        if (name===elem[0]) {
            tp=elem[1];
            found=true;
        }
        i=i+1;
    }

    return tp;
};


/** calls web assembly code to allocate memory to a pointer
 * @alias bisWasmUtils.allocate_memory
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {number} nDataBytes - the number of bytes to allocate
 * @returns {Pointer}  -- biswasm array Pointer
 */
var allocate_memory=function(Module,nDataBytes) {
    //  JS-Style: return Module._malloc(nDataBytes);
    return Module._allocate_js_array(nDataBytes);
};

/** calls web assembly code to delete pointer
 * @alias bisWasmUtils.release_memory
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {Pointer} ptr  -- biswasm array Pointer
 */
var release_memory=function(Module,ptr) {
    // JS-Style: Module._free(ptr);
    if (ptr!==0)
        Module._jsdel_array(ptr); 
};

/** Casts a Pointer to a typed Array.
 *      In C it would be roughly:
 *     return (arraytypename)(Module.HEAPU8[dataPtr])
 * @alias bisWasmUtils.get_array_view
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {string} arraytypename - the name of the array (e.g. Float32Array)
 * @param {Pointer} dataPtr  -- biswasm array Pointer that we are casting
 * @param {number} sz - the number of elements (NOT bytes)  of the output array 
 * @returns {Pointer}  -- a a pointer to the data
 */
var get_array_view=function(Module,arraytypename,dataPtr,sz) {
    return new arraytypename(Module.HEAPU8.buffer,dataPtr,sz);
};


/** Converts a TypedArray that contains a c-style string to a JS string
 *      In C it would be roughly:
 *     return (const char*)(s);
 * @alias bisWasmUtils.map_array_to_string
 * @param {arr} -- the typed array
 * @returns {String} */
var map_array_to_string=function(arr) {
    return String.fromCharCode.apply(null, arr);
};
// ------------------------------------------------------------
//  Get Magic Codes
// ------------------------------------------------------------
/**
 * @alias bisWasmUtils.get_vector_magic_code
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @returns {number} the Bis WebAssembly Magic Code for a vector
 */
var get_vector_magic_code=function(Module) { return Module._getVectorMagicCode(); };

/**
 * @alias bisWasmUtils.get_matrix_magic_code
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @returns {number} the Bis WebAssembly Magic Code for a matrix
 */
var get_matrix_magic_code=function(Module) { return Module._getMatrixMagicCode(); };

/**
 * @alias bisWasmUtils.get_image_magic_code
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @returns {number} the Bis WebAssembly Magic Code for a image
 */
var get_image_magic_code=function(Module) { return Module._getImageMagicCode(); };

/**
 * @alias bisWasmUtils.get_grid_magic_code
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @returns {number} the Bis WebAssembly Magic Code for a grid transform
 */
var get_grid_magic_code=function(Module) { return Module._getGridTransformMagicCode(); };

/**
 * @alias bisWasmUtils.get_combo_magic_code
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @returns {number} the Bis WebAssembly Magic Code for a combo transform
 */
var get_combo_magic_code=function(Module) { return Module._getComboTransformMagicCode(); };


/**
 * @alias bisWasmUtils.get_collection_magic_code
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @returns {number} the Bis WebAssembly Magic Code for a collection
 */
var get_collection_magic_code=function(Module) { return Module._getCollectionMagicCode(); };

/**
 * @alias bisWasmUtils.get_surface_magic_code
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @returns {number} the Bis WebAssembly Magic Code for a collection
 */
var get_surface_magic_code=function(Module) { return Module._getSurfaceMagicCode(); };


// ------------------------------------------------------------
//  Heavy Code
// ------------------------------------------------------------


/** creates a pointer for data to come and writes the header in
 * @alias bisWasmUtils.createPointer
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {TypedArray} header_array  - the header array,
 * @param {number} data_size_bytes - the size of the data array in bytes 
 * @param {number} data_type - the type of the data (e.g. for float = 16)
 * @param {number} magic_type - the actual magic_magic_code,
 * @returns {Pointer}  -- pointer to  array with header and no data 
 */
var createPointer = function(Module,
                             header_array,
                             data_bytes_size,
                             data_type,
                             magic_type) {

    let headersize=0;
    if (header_array!==0)
        headersize=header_array.byteLength;

    let nDataBytes = data_bytes_size + headersize+16;
    let dataPtr=allocate_memory(Module,nDataBytes);
    
    let intheader = get_array_view(Module,Int32Array,dataPtr,4);
    intheader[0]=magic_type;
    intheader[1]=data_type;
    intheader[2]=headersize;
    intheader[3]=data_bytes_size;

    if (headersize>0) {
        let headerView=get_array_view(Module,Uint8Array,dataPtr+16,header_array.byteLength);
        let inputView=new Uint8Array(header_array.buffer);
        headerView.set(inputView);
    }
    return dataPtr;
};

/** packs a raw  data set
 * @alias bisWasmUtils.packRawStructureInPlace
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {Pointer} dataPtr - place result here
 * @param {TypedArray} header_array  - the header array,
 * @param {TypedArray} data_array - the raw data (e.g. values)
 * @param {number} magic_type - the actual magic_magic_code,
 * @returns {number}  -- returns number of data bytes  placed at DataPtr
 */
var packRawStructureInPlace = function(Module,dataPtr,
                                       header_array,data_array,
                                       magic_type) {

    let headersize=0;
    if (header_array!==0)
        headersize=header_array.byteLength;
    const datatype=getCodeFromType(data_array);
    let nDataBytes = data_array.byteLength + headersize+16;

    let intheader = get_array_view(Module,Int32Array,dataPtr,4);
    intheader[0]=magic_type;
    intheader[1]=datatype;
    intheader[2]=headersize;
    intheader[3]=data_array.byteLength;

    //  console.log('intheader=',intheader);

    if (headersize>0) {
        // Copy Header
        let headerView=get_array_view(Module,Uint8Array,dataPtr+16,header_array.byteLength);
        let inputView=new Uint8Array(header_array.buffer);
        headerView.set(inputView);
    }

    // Copy Data
    let dataView=get_array_view(Module,Uint8Array,dataPtr+headersize+16,data_array.byteLength);
    let bisoffset=data_array.bisbyteoffset || 0;
    let inp=new Uint8Array(data_array.buffer,bisoffset,dataView.length);
    dataView.set(inp);
    return nDataBytes;
};


/** packs a raw  data set
 * @alias bisWasmUtils.packRawStructure
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {TypedArray} header_array  - the header array,
 * @param {TypedArray} data_array - the raw data (e.g. values)
 * @param {number} magic_type - the actual magic_magic_code,
 * @returns {Pointer}  -- Pointer to biswasm serialized array 
 */
var packRawStructure = function(Module,
                                header_array,data_array,
                                magic_type) {

    let headersize=0;
    if (header_array!==0)
        headersize=header_array.byteLength;
    //const datatype=getCodeFromType(data_array);
    let nDataBytes = data_array.byteLength + headersize+16;

    let dataPtr=allocate_memory(Module,nDataBytes);
    packRawStructureInPlace(Module,dataPtr,header_array,data_array,magic_type);
    
    return dataPtr;
};

/** utility function to pack a vector, an image or a matrix to bis-WASM serialized format
 * @alias bisWasmUtils.getpackStructurePieces
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {TypedArray} data_array - the raw data to pack (i.e intensities)
 * @param {array} - dimensions, an array up to size 5. 1=vector,2=matrix=5=image. 
 * @param {spacing} - spacing, an array up to size 5. 
 * @returns {obj}  -- { header_array : hd , data_array: dt,magic_type : mt }
 */

var getPackStructurePieces = function(Module,data_array,dimensions=[],spacing=[]) {

    let vect_magic_code=get_vector_magic_code(Module);
    let matr_magic_code=get_matrix_magic_code(Module);
    let image_magic_code=get_image_magic_code(Module);
    
    let magic_type=vect_magic_code;
    let headersize=0;
    if (dimensions.length===2) {
        magic_type=matr_magic_code;
        headersize=8;
    } else if (dimensions.length>2 ) {
        magic_type=image_magic_code;
        headersize=40;
    }

    let header_array=0;
    if (headersize>0) {
        header_array=new Uint8Array(headersize);
        if (magic_type===matr_magic_code) {
            let dim = new Int32Array(header_array.buffer,0,2);
            dim[0]=dimensions[0];
            dim[1]=dimensions[1];
        } else if (magic_type==image_magic_code) {
            let dim = new Int32Array(header_array.buffer,0,5);
            let spa = new Float32Array(header_array.buffer,20,5);
            for (let k=0;k<5;k++) {
                if (k<dimensions.length) {
                    dim[k]=dimensions[k];
                    if (k<spacing.length)
                        spa[k]=spacing[k];
                    else
                        spa[k]=1.0;
                } else {
                    dim[k]=1;
                    spa[k]=1.0;
                }
            }
        }
    }

    return {
        'header_array': header_array,
        'data_array' : data_array,
        'magic_type' : magic_type
    };
};

/** packs a vector, an image or a matrix to bis-WASM serialized format
 * @alias bisWasmUtils.packStructure
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {TypedArray} data_array - the raw data to pack (i.e intensities)
 * @param {array} - dimensions, an array up to size 5. 1=vector,2=matrix=5=image. 
 * @param {spacing} - spacing, an array up to size 5. 
 * @returns {TypedArray}  -- biswasm serialized array
 */
var packStructure = function(Module,data_array,
                             dimensions=[],spacing=[]) {

    let dat=getPackStructurePieces(Module,data_array,dimensions,spacing);
    return packRawStructure(Module,dat['header_array'],dat['data_array'],dat['magic_type']);
};

/** packs a vector, an image or a matrix to bis-WASM serialized format
 * @alias bisWasmUtils.packStructureInPlace
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {Pointer} dataPtr - place result here
 * @param {TypedArray} data_array - the raw data to pack (i.e intensities)
 * @param {array} - dimensions, an array up to size 5. 1=vector,2=matrix=5=image. 
 * @param {spacing} - spacing, an array up to size 5. 
 * @returns {TypedArray}  -- biswasm serialized array
 */
var packStructureInPlace = function(Module,dataPtr,data_array,dimensions=[],spacing=[]) {

    let dat=getPackStructurePieces(Module,data_array,dimensions,spacing);
    let headersize=dat['header_array'].byteLength;
    let nDataBytes = dat['data_array'].byteLength + headersize+16;
    packRawStructureInPlace(Module,dataPtr,dat['header_array'],dat['data_array'],dat['magic_type']);
    return nDataBytes;
};
// ---------------------------------------------------------------------------------------------------

/** unpacks an object from a webassembly generated pointer
 * @alias bisWasmUtils.unpackStructure
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {Pointer} dataptr - the raw data to parse
 * @param {bool} image_mode - if true only do partial deserialization and hand back to bis_image
 * @param {number} force_data_type - if >0 force data type (cast) to specific number
 * @returns {object}  -- with various elements containing information 
 *  { magic_type, data_array, header_array } and optionally dimensions,spacing and numvox
 */
var unpackStructure=function(Module,
                             dataptr,
                             image_mode=false,
                             force_data_type=-1) {

    let vect_magic_code=get_vector_magic_code(Module);
    let matr_magic_code=get_matrix_magic_code(Module);
    let image_magic_code=get_image_magic_code(Module);

    
    var out_obj = { magic_type :  0,  data_array : 0, header_array: 0 };
    
    let in_dataptr=dataptr;
    
    let intheader = get_array_view(Module,Int32Array,in_dataptr,4);
    
    const magic_type=intheader[0];
    
    if (image_mode && magic_type!=image_magic_code) {
        return out_obj;
    } else if (magic_type < vect_magic_code || magic_type>vect_magic_code+100) {
        return out_obj;
    }

    const datatype=intheader[1];
    if (force_data_type>0 && force_data_type!=datatype) {
        console.log('bad data type=',datatype);
        return out_obj;
    }

    out_obj.magic_type=magic_type;
    const headersize=intheader[2];
    const data_size=intheader[3];
    
    if (magic_type==matr_magic_code) {
        let dim = get_array_view(Module,Int32Array,in_dataptr+16,2);
        out_obj.dimensions = [ dim[0], dim[1] ];
    } else if (magic_type==image_magic_code) {
        let dim = get_array_view(Module,Int32Array,in_dataptr+16,5);
        let spa = get_array_view(Module,Float32Array,in_dataptr+36,5);
        out_obj.dimensions = [ dim[0], dim[1] ,dim[2],dim[3],dim[4] ];
        out_obj.spacing = [ spa[0], spa[1] ,spa[2],spa[3],spa[4] ];
    } else if (headersize>0) {
        out_obj.header_array=new Uint8Array(headersize);
        let inheader= get_array_view(Module,Uint8Array,in_dataptr+16,headersize);
        for(let k=0;k<headersize;k++) {
            out_obj.header_array[k]=inheader[k];
        }
    }

    // Finally the data
    out_obj.datatype=datatype;
    var elem=niftitypes[datatype];
    var sz=elem[2];
    var arr_name=elem[1];

    if (data_size<1)
        throw(' Bad WASM Array. Zero Size Data');
    
    var numvox=Math.floor(data_size/sz);

    
    if (image_mode) {
        out_obj.dataptr=in_dataptr+headersize+16;
        out_obj.numvox=numvox;
        out_obj.dataptr=in_dataptr;
    } else {
        out_obj.data_array=new arr_name(numvox);
        let indata= get_array_view(Module,arr_name,in_dataptr+headersize+16,numvox);
        for(let k=0;k<numvox;k++) {
            out_obj.data_array[k]=indata[k];
        }
    }
    return out_obj;
};



/** unpacks an object from a webassembly generated pointer. Calls unpackStructure and then deletes
 * the pointer from memory
 * @alias bisWasmUtils.unpackStructureAndDelete
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {Pointer} dataptr - the raw data to parse
 * @param {bool} image_mode - if true only do partial deserialization and hand back to bis_image
 * @returns {object}  -- with various elements containing information 
 *  { magic_type, data_array, header_array } and optionally dimensions,spacing and numvox
 */
var unpackStructureAndDelete=function(Module,dataptr,
                                      image_mode=false) {
    let ret_obj=unpackStructure(Module,dataptr,image_mode);
    release_memory(Module,dataptr);
    return ret_obj;
};


/** serializes a numericjs matrix 
 * @alias bisWasmUtils.serializeMatrix
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {Matrix} input - a numericjs style 2d array matrix
 * @returns {Pointer}  -- biswasm serialized array
 */
var serializeMatrix=function(Module,input) {

    let sz_inp=[];
    
    try { 
        sz_inp=numeric.dim(input);
    } catch(e) {
        throw new Error("Bad Input to serializeMatrix");
    }
    
    
    if (sz_inp.length<2) {
        throw new Error('Bad weight size for global Signal Regression. Mush be a 2D Matrix of dimenion ',sz_inp[0],'*',1);
    }

    let len=sz_inp[0]*sz_inp[1];
    let arr=new Float32Array(len);
    let index=0;
    for (let row=0;row<sz_inp[0];row++) {
        for (let col=0;col<sz_inp[1];col++) {
            arr[index]=input[row][col];
            index=index+1;
        }
    }

    return packStructure(Module,arr, sz_inp);
};

/** unpacks a numericjs matrix  and deletes
 * @alias bisWasmUtils.unpackMatrixAndDelete
 * @param {EmscriptenModule} Module - the emscripten Module object
 * @param {Pointer} dataptr - the raw data to parse
 * @returns {Matrix}  -- the numericjs matrix output
 */
var unpackMatrixAndDelete=function(Module,wasmarr) {
    const wasmobj=unpackStructureAndDelete(Module,wasmarr);

    if (wasmobj.magic_type!==get_matrix_magic_code(Module)) {
        console.log('failed to unpack Matrix');
        return 0;
    }

    var out=numeric.rep([wasmobj.dimensions[0],wasmobj.dimensions[1]],0.0);
    for (let i=0;i<wasmobj.dimensions[0];i++) {
        for (let j=0;j<wasmobj.dimensions[1];j++) {
            out[i][j]=wasmobj.data_array[i*wasmobj.dimensions[1]+j];
        }
    }
    
    return out;
};



let outputobject = {
    getNameFromType : getNameFromType,
    getTypeFromName : getTypeFromName,
    allocate_memory : allocate_memory,
    release_memory : release_memory,
    release_memory_cpp : release_memory,
    map_array_to_string :  map_array_to_string,
    get_array_view : get_array_view,
    get_vector_magic_code :     get_vector_magic_code ,
    get_matrix_magic_code :     get_matrix_magic_code ,
    get_image_magic_code :      get_image_magic_code ,
    get_grid_magic_code :       get_grid_magic_code ,
    get_combo_magic_code :      get_combo_magic_code ,
    get_collection_magic_code : get_collection_magic_code,
    get_surface_magic_code :      get_surface_magic_code ,
    createPointer: createPointer,
    packStructure : packStructure,
    packStructureInPlace : packStructureInPlace,
    packRawStructureInPlace : packRawStructureInPlace,
    packRawStructure : packRawStructure,
    unpackStructure: unpackStructure,
    unpackStructureAndDelete: unpackStructureAndDelete,
    serializeMatrix : serializeMatrix,
    unpackMatrixAndDelete : unpackMatrixAndDelete,
};


module.exports=outputobject;
// One day ES6
//export default outputobject;
