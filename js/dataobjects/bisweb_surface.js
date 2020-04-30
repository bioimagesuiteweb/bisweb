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


const util = require('bis_util');
const biswasm = require('bis_wasmutils');
const BisWebDataObject=require('bisweb_dataobject');
const BisWebMatrix=require('bisweb_matrix');
const BisWebGridTransformation=require("bisweb_gridtransformation");


/** A class to model a combo transfomration which is a linear transformations and a list of grid transformations. */

class BisWebSurface extends BisWebDataObject {

    constructor() {
        
        super();
        this.jsonformatname='BisSurface';
        this.initialize();
            
        this.legacyextension="vtk";
        
    }

    /** Return list of structures */
    getInternalList() {
        return [ this.internal.points,
                 internal.triangles,
                 internal.pointData,
                 internal.triangleData ]
    }

    /** Return list of structure names */
    getInternalNames() {
        return [ "Points", "Triangles", "PointData", "TriangleData" ];
    }
        
    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription(pretty=false) {
        let s="Combo:\n";
        let t="  ";
        if (pretty) {
            s="";
            t="";
        }
        let lst=this.getInternalList();
        let nms=this.getInternalNames();

        for (let i=0;i<=3;i++) {
            s+=t+nms[i]+":"+lst[i].getDescription(pretty)+"\n";
        }
        return s;
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        let s='';
        let lst=this.getInternalList();
        for (let i=0;i<=3;i++) 
            s += lst[i].computeHash();
        return s;
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        let sz=0;
        let lst=this.getInternalList();
        for (let i=0;i<=3;i++) 
            sz += lst[i].getMemorySize();
        return sz;
    }
    
    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {

        let obj= super.serializeToDictionary();
        let lst=this.getInternalList();
        let nms=this.getInternalNames();
        
        for (let i = 0; i < lst.length; i++) 
            obj[nms[i]]=lst[i];
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} b -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {

        let lst=this.getInternalList();
        let nms=this.getInternalNames();
        for (let i = 0; i < lst.length; i++) 
            lst[i].parseFromDictionary(b[nms[i]]);
        super.parseFromDictionary(b);
        return true;
    }


    // ---- Interface to Web Assembly Code ----------------------------------------------------
    

    /** deserializes an object from WASM array (with an optional second input to help with header stuff)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} dataptr - the unsined char wasm object
     * @param {BisWebDataObject} extra - the extra ``information'' or ``reference'' image (optional)
     */
    deserializeWasm(Module,dataptr,extra=0) {

        let intheader = biswasm.get_array_view(Module, Int32Array, dataptr, 8);
        const magic_type = intheader[0];
        if (magic_type !== biswasm.get_surface_magic_code(Module)) {
            console.log('Bad wasmobj, can not deserialize surface',extra);
            return 0;
        }

        let lst=this.getInternalList();
        let nms=this.getInternalNames();
        let offset=32;
        
        for (let i=0;i<=3;i++) {
            let num=intheader[4+i];
            if (num>0) {
                lst[i].deserializeWasm(Module, dataptr + offset);
                offset += lst[i].getWASMNumberOfBytes();
            } else {
                lst[i].zero(0,0);
            }
        }
        return 1;
    }

        /** returns number of bytes needed for WASM serialization
     * @returns {number}  -- number of bytes for serialized array
     */
    getWASMNumberOfBytes() {

        let numbytes = 0;
        let lst=this.getInternalList();
        
        for (let i = 0; i < lst.length;i++) {
            if (lst[i].getDimensions()[0] > 0) {
                numbytes += lst[i].getWASMNumberOfBytes();
            }
        }
        return 32 + numbytes;
    }

    // ---- Interface to Web Assembly Code ----------------------------------------------------
    /** serializes an object to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @returns {Pointer}  -- pointer biswasm serialized array
     */
    serializeWasmInPlace(Module,inDataPtr) {

        let totalbytes = this.getWASMNumberOfBytes();
        let header = biswasm.get_array_view(Module,Int32Array,inDataPtr,8);
        header[0]=biswasm.get_surface_magic_code(Module);
        header[1]=16; 
        header[2]=4;
        header[3]=totalbytes-32;

        let offset = 32;
        let lst=this.getInternalList();
        for (let i = 0; i < lst.length;i++) {
            if (lst[i].getDimensions()[0] > 0) {
                offset += lst[i].serializeWasmInPlace(Module, inDataPtr + offset);
                if (i<2)
                    header[4+i]=lst[i].getDimensions()[0];
                else
                    header[4+i]=lst[i].getDimensions()[1];
            } else {
                header[4+i]=0;
            }
        }
        
        return totalbytes;
    }

    // ---- Testing utility ----------------------------------------------------
    /** compares an image with a peer object of the same class and returns true if similar or false if different 
     * @param{BisWebDataObject} other - the other object
     * @param{String} method - the comparison method one of maxabs,ssd,cc etc.
     * @param{Number} threshold - the threshold to use for comparison
     * @returns{Object} - { testresult: true or false, value: comparison value, metric: metric name } 
     */
    compareWithOther(other,method="maxabs",threshold=0.01) {

        let out = {
            testresult : false,
            value : null,
            metric : "maxabs"
        };

        if (other.constructor.name !== this.constructor.name) 
            return out;

        let lst=this.getInternalList();
        let olist=other.getInternalList();
        
        for (let i = 0; i < list.length; i++) {
            let mat= lst[i].compareWithOther(list[i],method,threshold);
            out.value=out.value+mat.value;
            out.metric=mat.metric;
        }

        if (out.value < threshold) 
            out.testresult=true;
        
        return out;
    }

    /** This is to reinitialize the surface to all nulls   */
    initialize() { 
        this.internal = {
            points : new BisWebMatrix(),
            triangles : new BisWebMatrix(),
            pointData : new BisWebMatrix(),
            triangleData : new BisWebMatrix(),
        };

    }

}

module.exports = BisWebSurface;




