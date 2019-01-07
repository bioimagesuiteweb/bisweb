/*global HTMLElement, Worker */

"use strict";


const genericio = require('bis_genericio');
const moduleindex=require('moduleindex');
const bistfutil=require('bis_tfutil');
const BisWebImage = require('bisweb_image');
const BisWebMatrix = require('bisweb_matrix');
const BisWebTextObject = require('bisweb_textobject');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection');
const BisWebComboTransformation=require('bisweb_combotransformation');
const BisWebLinearTransformation=require('bisweb_lineartransformation');
const BisWebGridTransformation=require('bisweb_gridtransformation');
const BisWebTransformationCollection=require('bisweb_transformationcollection');
const userPreferences = require('bisweb_userpreferences.js');
const bisdate=require('bisdate.js');
/**
 * A set of utility functions. <BR>
 * If using from node.js/webpack it is the output of <B>require('bisweblib')</B>.<BR>
 * BisWebExportObject namespace.
 * @namespace biswebexport
 */



module.exports= {


    // ------------------------------------------------------------
    /** Code to load objects 
     * @alias biswebexport.loadObject
     * @param {string} text -- the JSON String to parse
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @returns {Promise} whose payload is the object
     */
    loadObject(filename, objecttype = 'image') {
        return BisWebDataObjectCollection.loadObject(filename, objecttype);

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
    genericio : genericio,
    bisdate : bisdate,
    BisWebImage : BisWebImage,
    BisWebMatrix : BisWebMatrix,
    BisWebTextObject : BisWebTextObject,
    BisWebLinearTransformation : BisWebLinearTransformation,
    BisWebGridTransformation : BisWebGridTransformation,
    BisWebComboTransformation : BisWebComboTransformation,
    BisWebDataObjectCollection :     BisWebDataObjectCollection,
    BisWebTransformationCollection :     BisWebTransformationCollection,
    bistfutil: bistfutil,
    userPreferences :     userPreferences,
};



