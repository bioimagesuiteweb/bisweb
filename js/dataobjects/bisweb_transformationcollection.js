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
const BisWebBaseTransformation=require('bisweb_basetransformation');
const bistransforms = require('bis_transformationutil.js');

/** A class to model a combination of transformations */


class BisWebTransformationCollection extends BisWebBaseTransformation {

    constructor() {
        
        super();
        this.jsonformatname='BisTransformationCollection';
        this.transformationList=[];
    }
    // ---- Get Object Information -------------------------------------------------
    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription() {
        let s="TransformationCollection\n";
        s+="\tNum Transformations="+this.transformationList.length+"\n";
        for (let i = 0; i < this.transformationList.length; i++) {
            s += "\t"+this.transformationList[i].getDescription()+"\n";
        }
        return s;
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        let s="TC";
        for (let i = 0; i < this.transformationList.length; i++) {
            s += this.transformationList[i].computeHash();
        }
        return s;
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        let sz=20;
        for (let i = 0; i < this.transformationList.length; i++) {
            sz += this.transformationList[i].getMemorySize();
        }
        return sz;
    }



    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {

        let obj= super.serializeToDictionary();
        
        let objlist = [];
        for (let i = 0; i < this.transformationList.length; i++)
            objlist.push(this.transformationList[i].serializeToDictionary());
        
        obj.numtransformations=this.transformationList.length;
        obj.transformations=objlist;
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} b -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {

        let numtransformations = b.numtransformations;
        let objlist = b.transformations;
        for (let i = 0; i < numtransformations; i++) {
            let ng=bistransforms.parseTransformationFromJSON(objlist[i]);            
            this.transformationList.push(ng);
        }
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

        let intheader = biswasm.get_array_view(Module, Int32Array, dataptr, 5);
        const magic_type = intheader[0];
        if (magic_type !== biswasm.get_collection_magic_code(Module)) {
            console.log('Bad wasmobj, can not deserialize Collection Transformation',extra);
            return 0;
        }
        const num_transformations = intheader[4];

        this.identity();

        let offset = 20;
        for (let xform = 0; xform < num_transformations; xform++) {
            let intheader = biswasm.get_array_view(Module,Int32Array,dataptr+offset,4);
            let magiccode=intheader[0];

            let newxform=null;
            
            if (magiccode===biswasm.get_matrix_magic_code(Module) ||
                magiccode===biswasm.get_matrix_magic_code(Module)) {
                newxform=bistransforms.createLinearTransformation(3);
            } else if (magiccode=== biswasm.get_grid_magic_code(Module)) {
                newxform=bistransforms.createGridTransformation([4, 4, 4], [2, 2, 2], [0, 0, 0], true);
            } else if (magiccode=== biswasm.get_combo_magic_code(Module)) {
                newxform=bistransforms.createComboTransformation();
            } else {
                throw new Error('bad transformation magic code'+magiccode+' can not deserializeWasm');
            }
            newxform.deserializeWasm(Module, dataptr + offset);
            this.transformationList.push(newxform);
            offset += newxform.getWASMNumberOfBytes();
        }
        return 1;
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

        let o=other.getNumberOfTransformations();
        let m=this.getNumberOfTransformations();
        
        if (o!==m)
            return out;
        console.log('....\t comparing combo transformations:',m,o);
        
        
        for (let i = 0; i < this.transformationList.length; i++) {
            let outxform= this.transformationList[i].compareWithOther(other.getTransformation(i),method,threshold);
            out.value=out.value+outxform.value;
            out.metric=outxform.metric;
        }
        
        if (out.value < threshold) 
            out.testresult=true;
        
        return out;
    }

    // ---------- BisWebBaseTransformation Functions -------------------------------------------
    /** This is to set the current transformation to identity.
     */
    identity() { 
        this.transformationList = [];
    }

    /** transforms input point in mm to a voxel coordinate 
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in voxel space for target image
     * @param {array} spa - 3 vector of image spacing of target image
     */
    transformPointToVoxel(X, TX, spa) {

        this.transformPoint(X,TX);
        for (let i=0;i<=2;i++) {
            TX[i]=TX[i]/spa[i];
        }
    }

    /** transforms input point in mm to a mm coordinate 
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in mm
     */
    transformPoint(X, TX) {

        if (this.transformationList.length<1) {
            for (let i=0;i<=2;i++)
                TX[i]=X[i];
            return;
        }
        
        let tmp = [X[0], X[1], X[2]];
        for (let i = 0; i<this.transformationList.length;i++) {
            this.transformationList[i].transformPoint(tmp, TX);
            tmp[0] = TX[0];
            tmp[1] = TX[1];
            tmp[2] = TX[2];
        }
        
    }

    // ------------------------------------------
    // Other Code
    // ------------------------------------------
    /** Get the Transformation 
     * @param{number} index -- index of transformations
     * @returns {BisWebBaseTransformation} - the transformation with index=index
     */
    getTransformation(index) {
        index = util.range(index || 0, 0, this.transformationList.length - 1);
        return this.transformationList[index];
    }

    /** Add a Transformation 
     * @param {BisWebBaseTransformation} tr - the transformation to add
     */
    addTransformation(tr) {
        this.transformationList.push(tr);
    }


    /** Set the Transformation 
     * @param{number} index -- index of transformation
     * @param {BisWebBaseTransformation} tr - the transformation to set
     */
    setTransformation(index,tr) {
        if (this.transformationList.length<1)
            return this.addTransformation(tr);
        index = util.range(index || 0, 0, this.transformationList.length - 1);
        this.transformationList[index]=tr;
    }


    /** Get Number of Transformations
     */
    getNumberOfTransformations() {
        return this.transformationList.length;
    }

    /** returns number of bytes needed for WASM serialization
     * @returns {number}  -- number of bytes for serialized array
     */
    getWASMNumberOfBytes() {

        let numbytes = 0;
        for (let i = 0; i < this.transformationList.length; i++) {
            numbytes += this.transformationList[i].getWASMNumberOfBytes();
        }
    
        // One more integer to set list length
        return 16 + 4 + numbytes;
    }

    // ---- Interface to Web Assembly Code ----------------------------------------------------
    /** serializes an object to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @returns {Pointer}  -- pointer biswasm serialized array
     */
    serializeWasmInPlace(Module,inDataPtr) {

        let totalbytes = this.getWASMNumberOfBytes();
        let header = biswasm.get_array_view(Module,Int32Array,inDataPtr,5);
        header[0]=biswasm.get_collection_magic_code(Module);
        header[1]=16; 
        header[2]=4;
        header[3]=totalbytes;
        header[4] = this.transformationList.length;

        
        let offset = 20;
        for (let i = 0; i < this.transformationList.length; i++) {
            offset += this.transformationList[i].serializeWasmInPlace(Module, inDataPtr + offset);
        }
        
        return totalbytes;
    }

}

module.exports = BisWebTransformationCollection;




