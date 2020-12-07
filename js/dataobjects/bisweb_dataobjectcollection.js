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
const BisWebImage = require('bisweb_image.js');
const BisWebSurface = require('bisweb_surface.js');
const BisWebMatrix = require('bisweb_matrix.js');
const BisWebTextObject = require('bisweb_textobject.js');
const bistransforms = require('bis_transformationutil.js');
const BisWebElectrodeMultiGrid= require('bisweb_electrodemultigrid.js');

/** Class to store a collection of data objects */

class BisWebDataObjectCollection extends BisWebDataObject {


    constructor() {
        super();
        this.jsonformatname='BisDataObjectCollection';
        this.itemlist=[];
        this.extensions=".jsondb";
    }

    // ---- Get Object Information -------------------------------------------------
    /** Returns the type of the object as a string
     * @returns{String} - the type of the object (e.g. image,matrix ...)
     */
    getObjectType() {
        return 'collection';
    }
    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription() {
        return "Collection with " +this.itemlist.length + ' items.';
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        let h='Collection';
        for (let i=0;i<this.itemlist.length;i++)
            h+=this.itemlist[i].computeHash();
        return h;
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        let h=100;
        for (let i=0;i<this.itemlist.length;i++)
            h+=this.itemlist[i].getMemorySize();
        return h;
    }

    // ---- Load and Save, Serialize and Deserialize to JSON -------------------------------------------------
    /**
     * Load an object from a filename or file object
     * @param {fobj} - If in browser this is a File object, if in node.js this is the filename!
     * @return {Promise} a promise that is fuilfilled when the image is loaded
     */
    load(fobj) {
        console.log('++++ Reading collection from:',fobj);
        const self=this;
        return new Promise( (resolve,reject) => {
            genericio.read(fobj, false).then((contents) => {
                let ok=this.parseFromJSON(contents.data);
                if (ok) {
                    self.setFilename(contents.filename);
                    resolve('loaded collection from '+contents.filename);
                } else {
                    reject('loaded collection from '+contents.filename);
                }
            }).catch( (e) => { reject(e); });
        });
    }


    /** saves an object to a filename. 
     * @param {string} filename - the filename to save to. If in broswer it will pop up a FileDialog
     * @return {Promise} a promise that is fuilfilled when the image is saved
     */
    save(filename) {
        let output = this.serializeToJSON(true);
        return genericio.write(filename,output);
    }

    /** serializes object to a javascript dictionary object
	 * @returns {Object} dictionary containing all key elements
     */
    serializeToDictionary() {

        let obj= super.serializeToDictionary();
        let arr=[];
        for (let i=0;i<this.itemlist.length;i++) {
            arr.push({
                'type'   : this.itemlist[i].data.getObjectType(),
                'data' : this.itemlist[i].data.serializeToJSON(),
                'metadata' : this.itemlist[i].metadata
            });
        }
        obj.numitems=this.itemlist.length;
        obj.itemlist=arr;
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} obj -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(obj) {
        let numitems=obj.numitems;
        this.itemlist=[];
        for (let i=0;i<numitems;i++) {
            let item=obj.itemlist[i];
            let objtype=item.type;
            let data=item.data;
            let metadata=item.metadata;

            this.itemlist.push({
                data : BisWebDataObjectCollection.parseObject(data,objtype),
                metadata : metadata
            });
        }
        super.parseFromDictionary(obj);
        return true;
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

        let lo=other.getNumberOfItems();
        let ln=this.getNumberOfItems();
        
        if (lo!==ln)
            return out;
        
        out.testresult=true;

        console.log('.... Comparing data object collections:',lo,ln);
        
        for (let i = 0; i < ln; i++) {
            let outitem= this.getItemData(i).compareWithOther(other.getItemData(i),method,threshold);
            console.log('\t',i,outitem);
            out.value=out.value+outitem.value;
            if (outitem.testresult===false) {
                out.testresult=false;
            }
        }

        return out;
    }

    // ----------- Database management -------------------------------------------------------------------

    getNumberOfItems() {
        return this.itemlist.length;
    }
    
    addItem(dataobj,extra={}) {
        this.itemlist.push({
            data : dataobj,
            metadata : extra,
        });
    }

    removeItem(i) {
        if (i<0 || i>=this.itemlist.length)
            return false;

        this.itemlist.splice(i,1);
        return true;
    }

    removeAllItems() {

        this.itemlist=[];
    }
    
    getItem(i) {
        if (i<0 || i>=this.itemlist.length)
            return null;
        return this.itemlist[i];
    }

    getItemData(i) {
        if (i<0 || i>=this.itemlist.length)
            return null;
        return this.itemlist[i].data;
    }

    getItemMetaData(i) {
        if (i<0 || i>=this.itemlist.length)
            return null;
        return this.itemlist[i].metadata;
    }

    setItem(i,obj,extra={}) {
        if (i<0 || i>=this.itemlist.length)
            return;
        this.itemlist[i]={
            data : obj,
            metadata : extra
        };
    }

    // ------------------------------------------------------------
    // STATIC Factory Code
    // ------------------------------------------------------------
    /** Code to load objects 
     * @param {string} text -- the JSON String to parse
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @returns {Object} obj
     */
    static parseObject(text, objecttype) {

        if (objecttype === 'transformation' || objecttype === 'transform') {
            return bistransforms.parseTransformationFromJSON(text);
        }

        let obj=null;
        if (objecttype === 'matrix' || objecttype==='vector')  {
            obj= new BisWebMatrix(objecttype);
        } else  if (objecttype==="image") {
            obj= new BisWebImage();
        } else  if (objecttype ==="collection")  {
            obj= new BisWebDataObjectCollection();
        } else if (objecttype === "text" || objecttype === "textobject") {
            obj= new BisWebTextObject();
        } else if (objecttype === "surface" || objecttype === "Surface") {
            obj= new BisWebSurface();
        } else if (objecttype === "electrodemultigrid") {
            obj= new BisWebElectrodeMultiGrid();
        }
        
        if (obj===null) {
            console.log('Error unknown ',objecttype,' =null');
            return null;
        }
        
        if (obj.parseFromJSON(text))
            return obj;

        console.log('Error parsing',objecttype,'null');
        return null;
    }

    getItems() {
        return this.itemlist;
    }

    // ------------------------------------------------------------
    // STATIC Factory Code
    // ------------------------------------------------------------
    /** Code to load objects 
     * @param {string} text -- the JSON String to parse
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @returns {Object} obj
     */
    static loadObject(filename, objecttype) {

        if (objecttype === 'matrix' || objecttype==='vector') {
            let obj=new BisWebMatrix(objecttype);
            return new Promise( (resolve,reject) => {
                obj.load(filename).then( () => {
                    resolve(obj);
                }).catch( (e) => {reject(e);});
            });
        }
        
        if (objecttype === 'text' || objecttype==='textobject') {
            let obj=new BisWebTextObject();
            return new Promise( (resolve,reject) => {
                obj.load(filename).then( () => {
                    resolve(obj);
                }).catch( (e) => {reject(e);});
            });
        }

        if (objecttype === 'collection') {
            let obj=new BisWebDataObjectCollection();
            return new Promise( (resolve,reject) => {
                obj.load(filename).then( () => {
                    resolve(obj);
                }).catch( (e) => {reject(e);});
            });
        }

        if (objecttype === 'surface') {
            let obj=new BisWebSurface();
            return new Promise( (resolve,reject) => {
                obj.load(filename).then( () => {
                    resolve(obj);
                }).catch( (e) => {reject(e);});
            });
        }

        if (objecttype === "electrodemultigrid") { 
            let obj=new BisWebElectrodeMultiGrid();
            return new Promise( (resolve,reject) => {
                obj.load(filename).then( () => {
                    resolve(obj);
                }).catch( (e) => {reject(e);});
            });
        }   
        
        if (objecttype.indexOf('transform')>=0)  {
            return new Promise((resolve, reject) => {
                bistransforms.loadTransformation(filename).then((obj) => {
                    if (!obj.data) 
                        reject('Failed to load/parse file');
                    resolve(obj.data);
                }).catch((e) => { reject(e); });
            });
        }

        let obj= new BisWebImage();

        return new Promise( (resolve,reject) => {
            obj.load(filename).then( () => {
                resolve(obj);
            }).catch( (e) => {reject(e);});
        });
    }


}

module.exports = BisWebDataObjectCollection;
