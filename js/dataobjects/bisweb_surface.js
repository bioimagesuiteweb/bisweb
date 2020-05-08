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

const biswasm = require('bis_wasmutils');
const BisWebDataObject=require('bisweb_dataobject');
const BisWebMatrix=require('bisweb_matrix');
const genericio=require('bis_genericio');

/** A class to model a combo transfomration which is a linear transformations and a list of grid transformations. */

class BisWebSurface extends BisWebDataObject {

    constructor() {
        
        super();
        this.jsonformatname='BisSurface';
        this.matrices={};
        this.matrixnames=[ "points", "triangles", "pointData", "triangleData" ];        
        this.initialize();
        this.legacyextension="vtk";

    }

    /** Returns the type of the object as a string
     * @returns{String} - the type of the object (e.g. image,matrix ...)
     */
    getObjectType() {
        return "surface";
    }

    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription(pretty=false) {
        let s="Surface:\n";
        let t="  ";
        if (pretty) {
            s="";
            t="";
        }
        for (let i=0;i<this.matrixnames.length;i++) {
            let name=this.matrixnames[i];
            if (this.matrices[name])
                s+=t+name+":"+this.matrices[name].getDescription(pretty)+"\n";
        }
        return s;
    }

    /** return points */
    getPoints() { return this.matrices['points'];}

    /** return triangles */
    getTriangles() { return this.matrices['triangles'];}

    /** return pointData */
    getPointData() { return this.matrices['pointData'];}

    /** return triangleData */
    getTriangleData() { return this.matrices['triangleData'];}
    
    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        let s='';
        for (let i=0;i<this.matrixnames.length;i++) {
            if (this.matrices[this.matrixnames[i]]) {
                s += this.matrices[this.matrixnames[i]].computeHash();
            }
        }
        return s;
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        let sz=0;
        for (let i=0;i<this.matrixnames.length;i++) {
            if (this.matrices[this.matrixnames[i]]) {
                sz += this.matrices[this.matrixnames[i]].getMemorySize();
            }
        }
        return sz;
    }
    
    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {

        let obj= super.serializeToDictionary();
        obj.matrices={};
        for (let i=0;i<this.matrixnames.length;i++) {
            let mat=this.matrices[this.matrixnames[i]];
            if (mat) { 
                obj['matrices'][this.matrixnames[i]]=mat.serializeToDictionary();
            }
        }
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} b -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {
        let keys=Object.keys(b.matrices);
        this.initialize();
        for (let i = 0; i < keys.length; i++)  {
            let mat=b['matrices'][keys[i]];
            let nm=keys[i];
            this.matrices[nm]=new BisWebMatrix();
            this.matrices[nm].parseFromDictionary(mat);
        }

        super.parseFromDictionary(b);
        return true;
    }


    // ---- Interface to Web Assembly Code ----------------------------------------------------
    

    /** deserializes an object from WASM array (with an optional second input to help with header stuff)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} dataptr - the unsined char wasm object
     */
    deserializeWasm(Module,dataptr) {

        let intheader = biswasm.get_array_view(Module, Int32Array, dataptr, 8);
        const magic_type = intheader[0];
        if (magic_type !== biswasm.get_surface_magic_code(Module)) {
            console.log('Bad wasmobj, can not deserialize surface');
            return 0;
        }

        this.initialize();
        
        let offset=32;
        for (let i=0;i<this.matrixnames.length;i++) {
            let mat=new BisWebMatrix();
            let num=intheader[4+i];
            if (num>0) {
                mat.deserializeWasm(Module, dataptr + offset);
                offset += mat.getWASMNumberOfBytes();
                this.matrices[this.matrixnames[i]]=mat;
            }
        }
        return 1;
    }

        /** returns number of bytes needed for WASM serialization
     * @returns {number}  -- number of bytes for serialized array
     */
    getWASMNumberOfBytes() {

        let numbytes = 0;
        
        for (let i=0;i<this.matrixnames.length;i++) {
            let mat=this.matrices[this.matrixnames[i]];
            if (mat) {
                numbytes += mat.getWASMNumberOfBytes();
            }
        }
        return 32 + numbytes;
    }

    // ---- Interface to Web Assembly Code ----------------------------------------------------
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

    /** serializes an object to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @returns {Pointer}  -- pointer biswasm serialized array
     */
    serializeWasmInPlace(Module,inDataPtr) {

        let totalbytes = this.getWASMNumberOfBytes();
        let header = biswasm.get_array_view(Module,Int32Array,inDataPtr,8);
        header[0]=biswasm.get_surface_magic_code(Module);
        header[1]=16; 
        header[2]=32;
        header[3]=totalbytes-32;

        let offset = 32;
        for (let i=0;i<this.matrixnames.length;i++) {
            let mat=this.matrices[this.matrixnames[i]];
            if (mat) {
                let dt= mat.serializeWasmInPlace(Module, inDataPtr + offset);
                offset+=dt;
                if (i<2)
                    header[4+i]=mat.getDimensions()[0];
                else
                    header[4+i]=mat.getDimensions()[1];
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
        
        for (let i=0;i<this.matrixnames.length;i++) {

            let name=this.matrixnames[i];
            
            if ( (this.matrices[name] === null && other.matrices[name] !== null)  ||
                 (this.matrices[name] !== null && other.matrices[name] === null) ) {
                return out;
            }
            
            if (this.matrices[name] && other.matrices[name]) {
                let merr= this.matrices[name].compareWithOther(other.matrices[name],method,threshold);
                out.value=out.value+merr.value;
                out.metric=merr.metric;
            }
        }

        if (out.value < threshold) 
            out.testresult=true;
        
        return out;
    }

    /** This is to reinitialize the surface to all nulls   */
    initialize() {
        for (let i=0;i<this.matrixnames.length;i++) {
            let name=this.matrixnames[i];
            this.matrices[name]=0;
        }
        this.filename='';
    }

    /** set from raw arrays */
    setFromRawArrays(points,triangles=null,pointData=null,triangleData=null) {
        let np=0,nt=0;
        
        this.initialize();
        if (points.length>0) {
            np=Math.round(points.length/3);
            this.matrices['points']=new BisWebMatrix();
            this.matrices['points'].zero(np,3);
            let dat=this.matrices['points'].getDataArray();
            for (let i=0;i<np*3;i++)
                dat[i]=points[i];
        }

        if (triangles) {
            nt=Math.round(triangles.length/3);
            this.matrices['triangles']=new BisWebMatrix();
            this.matrices['triangles'].allocate(nt,3,0,'uint');
            let dat=this.matrices['triangles'].getDataArray();
            for (let i=0;i<nt*3;i++)
                dat[i]=triangles[i];
        }

        if (pointData) {
            let numc=Math.round(pointData.length/np);
            this.matrices['pointData']=new BisWebMatrix();
            this.matrices['pointData'].zero(np,numc);
            let dat=this.matrices['pointData'].getDataArray();
            for (let i=0;i<np*numc;i++)
                dat[i]=pointData[i];
        }

        if (triangleData) {
            let numc=Math.round(triangleData.length/nt);
            this.matrices['triangleData']=new BisWebMatrix();
            this.matrices['triangleData'].zero(nt,numc);
            let dat=this.matrices['triangleData'].getDataArray();
            for (let i=0;i<nt*numc;i++)
                dat[i]=triangleData[i];
        }

        console.log('Legacy parsing=',this.getDescription());
        
    }

    /** load and save */
    // ---- Load and Save, Serialize and Deserialize to JSON -------------------------------------------------
    /**
     * Load an surface from a filename or file object
     * @param {fobj} - If in browser this is a File object, if in node.js this is the filename!
     * @return {Promise} a promise that is fuilfilled when the image is loaded
     */
    load(fobj) {
        return new Promise((resolve, reject) => {
            
            genericio.read(fobj, false).then((contents) => {

                
                try {
                    let obj=JSON.parse(contents.data);
                    let b=obj.bisformat || null;
                    console.log('Keys=',Object.keys(obj),contents.filename,' b=',b);

                    if (b!==null) {
                        if (this.parseFromJSON(contents.data)) {
                            this.filename=contents.filename;
                            resolve('loaded from '+contents.filename);
                            return;
                        }
                    }

                    if (obj.points && obj.triangles) {
                        console.log('Setting from raw');
                        this.setFromRawArrays(obj.points,
                                              obj.triangles,
                                              obj.pointData || null,
                                              obj.triangleData || null);
                        this.filename=contents.filename;
                        resolve('loaded from (legacy) '+contents.filename);
                        return;
                    } else {
                        console.log('failed to load from (legacy) '+contents.filename);
                        reject('failed to load from (legacy) '+contents.filename);
                        return;
                    }
                } catch(e) {
                    console.log('failed to load from '+contents.filename);
                    reject(e);
                }
            }).catch( (e) => {
                console.log('failed to load (Outer) from '+e);
                reject(e);
            });
        });
    }

    /**
     * save an surface from a filename or file object
     * @param {fobj} - If in browser this is a File object, if in node.js this is the filename!
     * @return {Promise} a promise that is fuilfilled when the image is loaded
     */
    save(filename) { 
        let txt=this.serializeToJSON();
        
        let fname=filename;
        if (fname.name) 
            fname=fname.name;

        return new Promise( (resolve,reject) => {
            genericio.write(fname,txt).then( (f) => {
                console.log('++++\t Saved Surface in '+fname);
                this.filename=fname;
                resolve(f);
            }).catch( (e) => { reject(e);});
        });
    }
}

module.exports = BisWebSurface;




