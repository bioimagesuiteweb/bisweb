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


const biswasm=require('bis_wasmutils.js');

/** Abstract Class representing a data object */

class BisWebDataObject {


    constructor() {
        this.jsonformatname='';
        this.commentlist=[];
        this.filename='';
        this.extension=".json";
    }

    /** getExtension
     * @returns {string} - the prefered extension for saving the file in 
     */
    getExtension() {
        return this.extension;
    }

    
    /** get image filename (if known)
     * @returns {string} 
     */
    getFilename()  { return this.filename;}

    /** sets the filename 
     * @param {String} fname - the new filename
     */
    setFilename(s)  {
        if (typeof s==='object')
            s=s.name || '';
        else
            s=s || '';
        this.filename=s;
    }

    // ---- Get Object Information -------------------------------------------------
    /** Returns the type of the object as a string
     * @returns{String} - the type of the object (e.g. image,matrix ...)
     */
    getObjectType() {
        throw new Error('getObjectType not implemented for '+this.constructor.name);
    }
    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription() {
        return "Object "+this.constructor.name;
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        return "0000";
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        return 0;
    }


    // ---- Load and Save, Serialize and Deserialize to JSON -------------------------------------------------
    /**
     * Load an object from a filename or file object
     * @param {fobj} - If in browser this is a File object, if in node.js this is the filename!
     * @return {Promise} a promise that is fuilfilled when the image is loaded
     */
    load(fobj) {
        throw new Error('load not implemented for '+this.constructor.name+' '+fobj);
    }


    /** saves an object to a filename. 
     * @param {string} filename - the filename to save to. If in broswer it will pop up a FileDialog
     * @return {Promise} a promise that is fuilfilled when the image is saved
     */
    save(filename) {
        throw new Error('save not implemented for '+this.constructor.name+' '+filename);
    }

    /** serializes object to json  string
        @returns {String} JSON String
    */
    serializeToJSON(pretty=false) {

        let obj=this.serializeToDictionary();
        if (!pretty)
            return JSON.stringify(obj);
        return JSON.stringify(obj,null,4);
        
    }

    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {
        return {
            bisformat : this.jsonformatname,
            filename : this.filename,
            comments : this.commentlist,
        };
    }
    
    /** parses from JSON 
     * @param {String} JSON String
     * @returns {Boolean} true if OK
     */
    parseFromJSON(text) {
        let b;
        try {
            b=JSON.parse(text);
        } catch(e) {
            console.log('Failed to parse text', e);
            return false;
        }
        if (b.bisformat!==this.jsonformatname)
            return false;
        return this.parseFromDictionary(b);
    }

    /** parses from Dictionary Object  
     * @param {Object} obj -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(obj) {
        this.commentlist= obj.comments;
        this.filename=obj.filename;
    }


    // ---- Interface to Web Assembly Code ----------------------------------------------------
    
    /** serializes an object to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @returns {Pointer}  -- pointer biswasm serialized array
     */
    serializeWasm(Module) {
        throw new Error('serializeWASM not implemented for '+this.constructor.name+' '+Module);
    }

    /** deserializes an object from WASM array (with an optional second input to help with header stuff)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} wasmarr - the unsined char wasm object
     * @param {BisWebDataObject} extra - the extra ``information'' or ``reference'' image (optional)
     */
    deserializeWasm(Module,wasmarr,extra=0) {
        throw new Error('deserializeWASM not implemented for '+this.constructor.name+' '+Module+' '+wasmarr+' ' +extra);
    }
    
    /** deserializes an object from WASM array (with an optional  second input to 
     * and then DELETES (biswasm.release_memory_cpp)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} wasmarr - the unsined char wasm object
     * @param {BisWebDataObject} extra - the extra ``information'' or ``reference'' image (optional)
     */
    deserializeWasmAndDelete(Module,wasmarr,extra=0) {
        const out=this.deserializeWasm(Module,wasmarr,extra);
        biswasm.release_memory_cpp(Module,wasmarr);
        return out;
    }



    // ---- Testing utility ----------------------------------------------------
    /** compares an image with a peer object of the same class and returns true if similar or false if different 
     * @param{BisWebDataObject} other - the other object
     * @param{String} method - the comparison method one of maxabs,ssd,cc etc.
     * @param{Number} threshold - the threshold to use for comparison
     * @returns{Object} - { testresult: true or false, value: comparison value, metric: metric name } 
     */
    compareWithOther(other,method="maxabs",threshold=0.01) {
        throw new Error('compareWithOther not implemented for '+this.constructor.name+' '+method+' '+threshold);

    }

    // ------------------------------------------
    /** Adds an element (string or list) to the comment list 
        /* @param {String} txt - the element to add
    */
    addComment(txt) {
        this.commentlist.push(txt);
    }

    /** Returns a copy of the comment list
        /* @param {array} - a copy of the comment list
    */
    getCommentList() {
        return this.commentlist.slice(0);
    }

    /** Sets the the comment list
        /* @param {array} lst - the list to copy
    */
    setCommentList(lst) {

        try {
            this.commentlist = lst.slice(0);
        } catch(e) {
            this.commentlist=[];
            this.commentlist.push(lst);
        }
    }

    /** 
     * @returns{string} - a detailed description of the object including comment list
     */
    getDetailedDescription(name='') {
        
        let cleanElement=function(str) {
            str=str.replace(/\{/g,'');
            str=str.replace(/\}/g,'');
            str=str.replace(/"/g,'');
            str=str.replace(/:/g,' ');
            str=str.replace(/,/g,' ');
            return str;
        };

        let formatObject=function(obj,mainkey=null,level=0) {

            let keys=Object.keys(obj);
            if (keys.length<1)
                return "";

            let value=obj[keys[0]];
            let s='';
            
            if (keys.length===1) {
                if (typeof value === "object") {
                    s=`<LI>${keys[0]}</LI>`;
                    s+=`<UL>`;
                    s+=formatObject(value,null,level+1);
                    s+='</UL>';
                    return s;
                }

                return `<LI><B>${keys[0]}</B>: ${value}</LI>`;
            }

            // Long things ... recursive;
            
            if (mainkey) {
                s=`<LI><B>${mainkey}</B></LI><UL>`;
            }
            
            for (let i=0;i<keys.length;i++) {
                value=obj[keys[i]];
                if (typeof value !== "object") {
                    s=s+`<LI><I>${keys[i]}</I>: ${value}</LI>`;
                } else {
                    if (level<1) {
                        s+=formatObject(value,keys[i],level+1);
                    } else {
                        s=s+`<LI><I>${keys[i]}</I>: `;
                        
                        let ikeys=Object.keys(value);
                        for (let j=0;j<ikeys.length;j++) {
                            let ival=value[ikeys[j]];
                            if (typeof ival === "object") {
                                ival=cleanElement(JSON.stringify(ival));
                            }
                            if (j>0)
                                s=s+', ';
                            s=s+`<I>${ikeys[j]}</I>: ${ival}`;
                            
                        }
                        s+='</LI>';
                    }
                }
            }
            return s+'</UL>';
        };
        
        let formatCommentList=function(lst) {

            let s='<OL>';
            for (let i=0;i<lst.length;i++) {
                s+=formatObject(lst[i]).replace(/\\n/g,'<BR>').replace(/===================================/g,'<HR>');
            }
            return s+'</OL>';

        };

        name=name || this.getObjectType();

        let des=this.getDescription(true).replace(/\\n/g,'<BR>');

        if (this.getCommentList().length>0) {
            let b=formatCommentList(this.getCommentList());
            return `<details><summary><B>${name}</B>:  ${des}</summary>${b}</details>`;
        }
            
        return `<B>${name}</B>:<BR>${des}`;
    }


}

module.exports=BisWebDataObject;
