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
 * @file Browser/Node.js module. Contains {@link BisWeb_Matrix}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const BisWebDataObject=require('bisweb_dataobject');
const genericio = require('bis_genericio');
const util=require('bis_util');

/** Class representing a text object 
 * @param{String} txt - text to initialize this with
 */


class BisWebTextObject extends BisWebDataObject{
    
    constructor(txt="") {

        super();
        this.jsonformatname='BisText';
        this.legacyextension="txt";
        this.extension=".bistxt";
        this.data="";
        this.forcetextsave=false;

        if (typeof txt === 'string')
            this.setText(txt);
        else
            this.data=txt;
    }


    // ---- Get Object Information -------------------------------------------------
    /** Returns the type of the object as a string
     * @returns{String} - the type of the object (e.g. image,matrix ...)
     */
    getObjectType() {
        return 'text';
    }
    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription() {
        return "Text: "+this.data.length;
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        return util.SHA256(this.data);
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        return this.data.length+2;
    }


    // ---- Load and Save, Serialize and Deserialize to JSON -------------------------------------------------
    /**
     * Load an object from a filename or file object
     * @param {fobj} - If in browser this is a File object, if in node.js this is the filename!
     * @return {Promise} a promise that is fuilfilled when the image is loaded
     */
    load(fobj) {
        const self=this;
        return new Promise( (resolve,reject) => {
            genericio.read(fobj, false).then((contents) => {

                let filename=contents.filename;

                let ext = filename.name ? filename.name.split('.').pop() : filename.split('.').pop();

                if (ext==='csv' || ext==='txt') {
                    this.data=contents.data;
                } else {
                    this.parseFromJSON(contents.data);
                }
                self.setFilename(filename);
                console.log('++++\t loaded text from '+contents.filename+', '+this.data.length);
                resolve('loaded text from '+contents.filename);
            }).catch( (e) => { reject(e); });
        });
    }


    /** saves an object to a filename. 
     * @param {string} filename - the filename to save to. If in broswer it will pop up a FileDialog
     * @return {Promise} a promise that is fuilfilled when the image is saved
     */
    save(filename) {

        let ext = filename.name ? filename.name.split('.').pop() : filename.split('.').pop();
        let output="";

        if (ext==='csv' || ext==="txt" || this.forcetextsave===true) {
            output=this.data;
        } else {
            output = this.serializeToJSON(true);
        }
        return new Promise( function(resolve,reject) {
            genericio.write(filename,output).then( (f) => {
                console.log('++++\t saved text in '+filename);
                resolve(f);
            }).catch( (e) => { reject(e); });
        });
    }

    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {
        let obj= super.serializeToDictionary();
        obj.text=this.data;
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} obj -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {
        this.data=b.text;
        super.parseFromDictionary(b);
        return true;
    }


    // ---- Interface to Web Assembly Code ----------------------------------------------------
    
    /** serializes an object to a WASM array (this being a string it is trivial)
     * @returns {String}  -- pointer biswasm serialized array
     */
    serializeWasm() {

        return this.data.slice(0);
    }

    /** deserializes an object from WASM array (with an optional second input to help with header stuff)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} wasmarr - the unsined char wasm object
     */
    deserializeWasm(Module,wasmarr) {
        
        this.data="";
        try {
            if (Module)
                this.data=wasmarr.slice(0);
        } catch(e) {
            console.log('Bad String ',wasmarr);
        }
    }
    

    // ---- Testing utility ----------------------------------------------------
    /** compares an image with a peer object of the same class and returns true if similar or false if different 
     * @param{BisWebTextObject} other - the other object
     * @returns{Object} - { testresult: true or false, value: comparison value, metric: metric name } 
     */
    compareWithOther(other) {
        
        let out = {
            testresult : false,
            value : 1000.0,
            metric: "direct comparison",
        };

        if (other.constructor.name !== this.constructor.name)  {
            out.value=1000.0;
            console.log('different constructors');
            return out;
        }

        console.log('....\t comparing strings:',this.data.length,other.data.length);

        if (this.data.trim()===other.data.trim()) {
            out.testresult=true;
            out.value=0.0;
        } 
        return out;
    }

    // ----------------------------------------------------------------------------------------
    // Local Extensions

    /** set the text
     * @param{String} text input (copied)
     */
    setText(t="") {
        this.data=t.slice(0);
    }

    /** returns the a copy of the internal text 
     * @returns{String} - the text
     */
    getText() {
        return this.data.slice(0);
    }

    /** force save to text */
    forceTextSave() {
        this.forcetextsave=true;
    }
        
    
    
}


module.exports=BisWebTextObject;
