/*global HTMLElement, Worker */

"use strict";

const webutil = require('bis_webutil');
const BisWebImage = require('bisweb_image');
const BisWebMatrix = require('bisweb_matrix');
const BisWebTextObject = require('bisweb_textobject');
const bistransforms = require('bis_transformationutil');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection');
const moduleindex=require('moduleindex');

/**
 * An element that exports functionality from the core BISWeb Code
 *
 * @example
 *
 * <bisweb-exportelement id="thiselement">
 * </bisweb-exportelement>
 *
 */

const bisdate=require('bisdate.js');


class ExportElement extends HTMLElement {


    /**
     * Worker is initialize via the connected callback
     */

    constructor() {
        super();
        console.log(`BioImage Suite Web Export Libary ( current build= ${bisdate.version}, ${bisdate.date}, ${bisdate.time}) loaded.`);
    }
    

    // ------------------------------------------------------------
    /** Code to load objects 
     * @param {string} text -- the JSON String to parse
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @returns {Promise} whose payload is the object
     */
    loadObject(filename, objecttype,) {
        return BisWebDataObjectCollection.loadObject(filename, objecttype);

    }

    /** Code to create objects 
     * @param {string} text -- the JSON String to parse
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @param {Various} param -- type specific initialization object, or parameter
     * @returns {BisWebDataObject} the underlying object
     */
    createObject(objecttype,param=null) {

        if (objecttype === 'matrix' || objecttype==='vector') {
            return new BisWebMatrix(objecttype);
        }
        
        if (objecttype === 'text' || objecttype==='textobject') {
            return new BisWebTextObject();
        }

        if (objecttype === 'collection') {
            return new BisWebDataObjectCollection();
        }

        if (objecttype.indexOf('lineartransform')>=0)  {
            return bistransforms.createLinearTransformation(param);
        }

        if (objecttype.indexOf('gridtransform')>=0) {
            return bistransforms.createComboTransformation(param);
        }
        return new BisWebImage();


    }

    /** createModule
     * @param{string} ModuleName - the name of the module to create
     * @returns{Module} the module
     */
    createModule(modulename) {
        return moduleindex.getModule(modulename);
    }
}
    

console.log('here 1');
webutil.defineElement('bisweb-exportelement', ExportElement);
