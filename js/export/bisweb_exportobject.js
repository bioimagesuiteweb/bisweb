/*global HTMLElement, Worker */

"use strict";


const genericio = require('bis_genericio');
const BisWebImage = require('bisweb_image');
const BisWebMatrix = require('bisweb_matrix');
const BisWebTextObject = require('bisweb_textobject');
const bistransforms = require('bis_transformationutil');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection');
const moduleindex=require('moduleindex');
const bisdate=require('bisdate.js');

/**
 * A set of utility functions. <BR>
 * If using from node.js/webpack it is the output of <B>require('bisweblib')</B>.<BR>
 * Util namespace.
 * @namespace biswebexport
 */

console.log(`BioImage Suite Web Export Object (bioimagesuiteweb) loaded. Current build= (${bisdate.version}, ${bisdate.date}, ${bisdate.time}).`);

module.exports= {


    // ------------------------------------------------------------
    /** Code to load objects 
     * @alias biswebexport.loadObject
     * @param {string} text -- the JSON String to parse
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @returns {Promise} whose payload is the object
     */
    loadObject(filename, objecttype,) {
        return BisWebDataObjectCollection.loadObject(filename, objecttype);

    },

    /** Code to create objects 
     * @alias biswebexport.createObject
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


    },

    /** createModule
     * @alias biswebexport.createModule
     * @param{string} ModuleName - the name of the module to create
     * @returns{Module} the module
     */
    createModule(modulename) {
        return moduleindex.getModule(modulename);
    },

    /** return module genericio 
     * @alias biswebexport.getGenericIO
     * @returns{JavaScript Module} 
     */
    getGenericIO() {
        return genericio;
    },


};
    


