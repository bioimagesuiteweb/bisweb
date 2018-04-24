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
 * @file Browser/Node.js module. Contains {@link BisWeb_DataObject}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const BisWebDataObject = require('bisweb_dataobject');
const genericio = require('bis_genericio');
const biswasm = require('bis_wasmutils');

/** Abstract Class representing a transformation object */

class BisWebBaseTransformation extends BisWebDataObject {

    constructor() {
        super();
        this.legacyextension = "";
        this.extension=".bisxform";
    }


    // ---- Get Object Information -------------------------------------------------
    /** Returns the type of the object as a string
     * @returns{String} - the type of the object (e.g. image,matrix ...)
     */
    getObjectType() {
        return "transform";
    }

    // --------------- WASM ---------------------
    /** serializes an object to a WASM array. Internall calls serializeWasmInPlace
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @returns {Pointer}  -- pointer biswasm serialized array
     */
    serializeWasm(Module) {
        let totalbytes = this.getWASMNumberOfBytes();
        let inDataPtr=biswasm.allocate_memory(Module,totalbytes);
        this.serializeWasmInPlace(Module,inDataPtr);
        let output = biswasm.get_array_view(Module, Uint8Array, inDataPtr, totalbytes);
        return output.byteOffset;
    }

        /** serializes the grid to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} inDataPtr - store results here
     * @returns {number}  -- number of bytes stored
     */
    serializeWasmInPlace(Module, inDataPtr) {
        throw new Error('serializeWasmInPlace not defined'+Module+" "+inDataPtr);
    }

    
    /** resets the transformation to identity   */
    identity() {
        throw new Error('identity not implemented for ' + this.constructor.name);
    }

    /** transforms input point in mm to a mm coordinate using this transformation
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in mm
     */
    transformPoint(X, TX) {
        throw new Error('transformPoint not implemented for ' + this.constructor.name + ' ' + X + ' ' + TX);
    }

    /** transforms input point in mm to a mm coordinate using this transformation
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in voxels;
     * @param {array} spa - 3 vector of image spacing of target image
     */
    transformPointToVoxel(X, TX, spa) {
        this.transformPoint(X, TX);
        for (let i = 0; i <= 2; i++)
            TX[i] = TX[i] / spa[i];
    }

    /** Computes the displacement at an input point in mm 
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} U - OUTPUT 3 vector of u,v,w displacements in mm
     */
    computeDisplacement(X, U) {
        this.transformPoint(X, U);
        U[0] -= X[0]; U[1] -= X[1]; U[2] -= X[2];
    }


    // ---- Load and Save, Serialize and Deserialize to JSON -------------------------------------------------
    /**
     * Load an object from a filename or file object
     * @param {fobj} - If in browser this is a File object, if in node.js this is the filename!
     * @return {Promise} a promise that is fuilfilled when the image is loaded
     */
    load(fobj) {
        const self=this;
        return new Promise((resolve, reject) => {
            genericio.read(fobj, false).then((contents) => {
                this.parseFromText(contents.data, contents.filename, reject);
                console.log('loaded transformation from ' + contents.filename);
                self.setFilename(contents.filename);
                resolve();
            }).catch((e) => { reject(e); });
        });
    }

    /** saves an object to a filename. 
     * @param {string} filename - the filename to save to. If in broswer it will pop up a FileDialog
     * @return {Promise} a promise that is fuilfilled when the image is saved
     */
    save(filename) {
        let output = this.serializeToText(filename);
        return new Promise(function (resolve, reject) {
            genericio.write(filename, output).then((f) => {
                if (f.name)
                    f=f.name;
                console.log('++++\t saved transformation in ' + f);
                resolve(f);
            }).catch((e) => { reject(e); });
        });
    }

    /**  Legacy Serialize Methods */
    legacySerialize() {
        throw new Error('legacySerialize not implemented for ' + this.constructor.name);
    }

    /** Serialize with filename 
     * @param {String} filename -- the filename to save to */
    serializeToText(filename = "") {
        let ext = filename.name ? filename.name.split('.').pop() : filename.split('.').pop();
        if (ext === this.legacyextension)
            return this.legacySerialize();
        return this.serializeToJSON();
    }

    /** deserializes the landmark set from a string consistent 
     * with the legacy BioImage Suite .land format
     * @param {string} inpstring - input string
     * @param {string} filename -  filename of original file
     * @return {boolean} val - true or false
     */
    legacyParseFromText(inpstring, filename) {
        throw new Error('legacyParseFromText not implemented for ' + this.constructor.name + ' ' + inpstring.length + 'filename ' + filename);
    }

    /** deserializes the transformation from string
     * @gitparam {string} inpstring - input JSON string or legacy string
     * @param {string} filename -  filename of original file
     * @return {boolean} val - true or false
     */
    parseFromText(jsonstring, filename = "") {

        let ext = filename.name ? filename.name.split('.').pop() : filename.split('.').pop();
        if (ext === this.legacyextension)
            return this.legacyParseFromText(jsonstring, filename);
        return this.parseFromJSON(jsonstring);
    }


}

module.exports = BisWebBaseTransformation;
