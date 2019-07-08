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
const BisWebLinearTransformation=require("bisweb_lineartransformation");
const BisWebGridTransformation=require("bisweb_gridtransformation");


/** A class to model a combo transfomration which is a linear transformations and a list of grid transformations. */

class BisWebComboTransformation extends BisWebBaseTransformation {

    constructor(ii_linear) {
        
        super();
        this.jsonformatname='BisComboTransformation';
        this.internal = {
            linearTransformation: new BisWebLinearTransformation(0),
            gridTransformationList: [],
        };
        this.initialize(ii_linear);
        this.legacyextension="grd";
        
    }
    // ---- Get Object Information -------------------------------------------------
    
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
        s+=t+"Linear="+this.internal.linearTransformation.getDescription()+"\n";
        s+=t+"Num Grids="+this.internal.gridTransformationList.length+"\n";
        for (let i = 0; i < this.internal.gridTransformationList.length; i++) {
            s +=t+this.internal.gridTransformationList[i].getDescription(pretty)+"\n";
        }
        return s;
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        let s=this.internal.linearTransformation.computeHash();
        for (let i = 0; i < this.internal.gridTransformationList.length; i++) {
            s += this.internal.gridTransformationList[i].computeHash();
        }
        return s;
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        let sz=this.internal.linearTransformation.getMemorySize();
        for (let i = 0; i < this.internal.gridTransformationList.length; i++) {
            sz += this.internal.gridTransformationList[i].getMemorySize();
        }
        return sz;
    }



    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {

        let obj= super.serializeToDictionary();
        
        let objlist = [];
        for (let i = 0; i < this.internal.gridTransformationList.length; i++)
            objlist.push(this.internal.gridTransformationList[i].serializeToDictionary());
        
        obj.linear=this.internal.linearTransformation.serializeToDictionary();
        obj.numgrids=this.internal.gridTransformationList.length;
        obj.grids=objlist;
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} b -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {

        let linear = new BisWebLinearTransformation(0);
        linear.parseFromDictionary(b.linear);
        this.internal.linearTransformation.copy(linear);
        let numgrids = b.numgrids;
        let objlist = b.grids;
        for (let i = 0; i < numgrids; i++) {
            var ng = new BisWebGridTransformation([4, 4, 4], [2, 2, 2], [0, 0, 0], true);
            ng.parseFromDictionary(objlist[i]);
            this.internal.gridTransformationList.push(ng);
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
        if (magic_type !== biswasm.get_combo_magic_code(Module)) {
            console.log('Bad wasmobj, can not deserialize combo Transformation',extra);
            return 0;
        }
        //              const data_byte_size=intheader[3];
        const num_grids = intheader[4];

        this.identity();

        let offset = 20;
        this.internal.linearTransformation.deserializeWasm(Module, dataptr + offset);
        offset += this.internal.linearTransformation.getWASMNumberOfBytes();
        for (let grid = 0; grid < num_grids; grid++) {
            var ng = new BisWebGridTransformation([4, 4, 4], [2, 2, 2], [0, 0, 0], true);
            ng.deserializeWasm(Module, dataptr + offset);
            this.internal.gridTransformationList.push(ng);
            offset += ng.getWASMNumberOfBytes();
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

        let o=other.getNumberOfGridTransformations();
        let m=this.getNumberOfGridTransformations();
        
        if (o!==m)
            return out;
        console.log('....\t comparing combo transformations:',m,o);
        
        let outlin=this.internal.linearTransformation.compareWithOther(other.getLinearTransformation(),method,threshold);
        out.value=out.value+outlin.value;
        for (let i = 0; i < this.internal.gridTransformationList.length; i++) {
            let outgrid= this.internal.gridTransformationList[i].compareWithOther(other.getGridTransformation(i),method,threshold);
            out.value=out.value+outgrid.value;
            out.metric=outgrid.metric;
        }

        if (out.value < threshold) 
            out.testresult=true;
        
        return out;
    }

    // ---------- BisWebBaseTransformation Functions -------------------------------------------
    /** This is to set the current transformation to identity.
     */
    identity() { 
        this.internal.gridTransformationList = [];
        this.internal.linearTransformation.identity();
    }

    /** transforms input point in mm to a voxel coordinate using the bspline grid and the linear transformation
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in voxel space for target image
     * @param {array} spa - 3 vector of image spacing of target image
     */
    transformPointToVoxel(X, TX, spa) {
        let tmp = [X[0], X[1], X[2]];
        //console.log('tmp=',tmp);
        for (let i = this.internal.gridTransformationList.length - 1; i >= 0; i = i - 1) {
            this.internal.gridTransformationList[i].transformPoint(tmp, TX);
            tmp[0] = TX[0];
            tmp[1] = TX[1];
            tmp[2] = TX[2];
        }
        this.internal.linearTransformation.transformPointToVoxel(tmp, TX, spa);
        //        console.log('tmp=',tmp,TX);
    }

    /** transforms input point in mm to a mm coordinate using the bspline grid and the linear transformation
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in mm
     */
    transformPoint(X, TX) {
        let tmp = [X[0], X[1], X[2]];
        for (let i = this.internal.gridTransformationList.length - 1; i >= 0; i = i - 1) {
            this.internal.gridTransformationList[i].transformPoint(tmp, TX);
            tmp[0] = TX[0];
            tmp[1] = TX[1];
            tmp[2] = TX[2];
        }
        this.internal.linearTransformation.transformPoint(tmp, TX);
    }

    // ------------------------------------------
    // Other Code
    // ------------------------------------------
    /**
     * This reinitializes the transformation.
     * @param {array} dims - [x,y,z] dimensions of grid
     * @param {array} spacing - [x,y,z] spacing of grid
     * @param {array} origin - position of first cntrol point
     * @param {BisLinearTransformation} initial - initial/linear transformation
     * @param {boolean} nonewfield - if false, no new disp field is created
     */
    initialize(linear=null) {

        linear = linear || null;
        if (linear !== null)
            this.internal.linearTransformation.copy(linear);
    }


    /** Get Linear Transformation 
     * @returns {BisWebLinearTransformation} - the current linear transformation
     */
    getLinearTransformation() {
        return this.internal.linearTransformation || null;
    }
    
    /** Get Grid Transformation 
     * @param{number} index -- index of grid transformations
     * @returns {BisWebGridTransformation} - the grid transformation with index=index
     */
    getGridTransformation(index) {
        index = util.range(index || 0, 0, this.internal.gridTransformationList.length - 1);
        return this.internal.gridTransformationList[index];
    }

    /** Get Number of Grid Transformation 
     */
    getNumberOfGridTransformations() {
        return this.internal.gridTransformationList.length;
    }

    /** Set New Linear Transformation
     */
    setLinearTransformation(tr) {
        this.internal.linearTransformation.copy(tr);
    }

    /*** Creates an optimized cached mapping to spped up the point to voxel transformation
     * @param {array} spa - spacing of target image
     */
    optimize(spa) {
        this.internal.linearTransformation.optimize(spa);
    }
    
    /** serializes the matrix
     * with the legacy BioImage Suite .matr format
     * @return {string} string - containing output
     */
    legacySerialize() {
        let s = "";
        if (this.internal.gridTransformationList.length > 1) {
            s = "#vtkpxMultiComboTransform File\n";
            s += "#Number of Non Linear Transformations\n" + this.internal.gridTransformationList.length.toFixed(0) + "\n";
        } else {
            s = "#vtkpxNewComboTransform File\n";
        }

        s = s + "#NonLinearFirst\n1\n#Linear Component\n";
        s = s + this.internal.linearTransformation.legacySerialize("\n");
        for (let i = 0; i < this.internal.gridTransformationList.length; i++) {
            s += this.internal.gridTransformationList[i].legacySerialize();
        }
        return s;
    }

    /** deserializes the landmark set from a string consistent 
     * with the legacy BioImage Suite .land format
     * @param {string} inpstring - input string
     * @param {string} filename -  filename of original file
     * @return {boolean} val - true or false
     */
    legacyParseFromText(inputstring, filename) {

        let lines = inputstring.split("\n");
        let s1 = (lines[0].trim() === "#vtkpxMultiComboTransform File");
        let s2 = (lines[0].trim() === "#vtkpxNewComboTransform File");
        let s3 = (lines[0].trim() === "#vtkpxBaseGridTransform2 File");
        if (!((s1 === true) || (s2 === true) || (s3 === true))) {
            console.log(filename + ' is not a valid multi combo tensor b-spline grid file .grd' + lines[0].trim());
            return false;
        }

        let offset = 6;
        if (s2 === true)
            offset = 4;
        if (s3 == true)
            offset = 0;

        if (s3 === false) {
            var s = lines[offset] + "\n" + lines[offset + 1] + "\n" + lines[offset + 2] + "\n" + lines[offset + 3] + "\n";
            var ok = this.internal.linearTransformation.legacyParseFromText(s, filename + 'piece');
            if (ok === false)
                return;
            offset = offset + 4;

        } else {
            this.internal.linearTransformation.identity();
        }

        let num = 1;
        if (s1 === true)
            num = (parseInt(lines[2].trim()));
        this.internal.gridTransformationList = [];

        for (let grd = 0; grd < num; grd++) {
            var ng = new BisWebGridTransformation([4, 4, 4], [2, 2, 2], [0, 0, 0], true);
            if (ng.legacyParseFromText(inputstring, filename, offset)) {
                offset = offset + 10 + ng.getNumberOfControlPoints();
                this.internal.gridTransformationList.push(ng);
            } else {
                return false;
            }
        }
        return true;
    }

    
    /** returns number of bytes needed for WASM serialization
     * @returns {number}  -- number of bytes for serialized array
     */
    getWASMNumberOfBytes() {

        let numbytes = 0;
        for (let i = 0; i < this.internal.gridTransformationList.length; i++) {
            numbytes += this.internal.gridTransformationList[i].getWASMNumberOfBytes();
        }
        numbytes += this.internal.linearTransformation.getWASMNumberOfBytes();

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
        header[0]=biswasm.get_combo_magic_code(Module);
        header[1]=16; 
        header[2]=4;
        header[3]=totalbytes;
        header[4] = this.internal.gridTransformationList.length;

        let offset = 20;
        offset += this.internal.linearTransformation.serializeWasmInPlace(Module, inDataPtr + offset);
        for (let i = 0; i < this.internal.gridTransformationList.length; i++) {
            offset += this.internal.gridTransformationList[i].serializeWasmInPlace(Module, inDataPtr + offset);
        }
        
        return totalbytes;
    }

}

module.exports = BisWebComboTransformation;




