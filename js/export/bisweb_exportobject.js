"use strict";

const bisutil = require('bis_util');
const genericio = require('bis_genericio');
const moduleindex=require('moduleindex');
//const bistfutil=require('bis_tfutil');
const bisxformutil = require('bis_transformationutil.js');
const BisWebDataObject = require('bisweb_dataobject');
const BisWebImage = require('bisweb_image');
const BisWebMatrix = require('bisweb_matrix');
const BisWebTextObject = require('bisweb_textobject');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection');
const BisWebComboTransformation=require('bisweb_combotransformation');
const BisWebLinearTransformation=require('bisweb_lineartransformation');
const BisWebGridTransformation=require('bisweb_gridtransformation');
const BisWebTransformationCollection=require('bisweb_transformationcollection');
const BisWebSurface=require('bisweb_surface.js');
const BisWebElectrodeMultiGrid = require('bisweb_electrodemultigrid');
const userPreferences = require('bisweb_userpreferences.js');
const biswasmdate=require('biswasmdate.js');
const basemodule = require('basemodule.js');
const basemoduleutils = require('baseutils.js');
const biswrap = require('libbiswasm_wrapper');



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

    /** Modify bisweb user preferences
     * @param{String} item - item name
     * @param{String} value - new value
     * @param{Boolean} save - if true save (default = false)
     */
    setPref(item,name,save=false) {
        userPreferences.setItem(item,name,save);
    },

    /** Print User Preferences */
    printUserPrefs() {
        userPreferences.printUserPreferences();
    },


    /** @returns{String} -- browser, node, electron */
    getEnvironment() { return genericio.getenvironment(); },
    
    
    /** Just list of modules being reexported */
    // Low level code
    bisutil : bisutil,
    genericio : genericio,
    // Module stuff
    basemodule : basemodule,
    basemoduleutils : basemoduleutils,
    // Bisweb info
    userPreferences :     userPreferences,
    // Core Data Structures
    BisWebDataObject : BisWebDataObject,
    BisWebImage : BisWebImage,
    BisWebMatrix : BisWebMatrix,
    BisWebTextObject : BisWebTextObject,
    BisWebLinearTransformation : BisWebLinearTransformation,
    BisWebGridTransformation : BisWebGridTransformation,
    BisWebComboTransformation : BisWebComboTransformation,
    BisWebDataObjectCollection :     BisWebDataObjectCollection,
    BisWebTransformationCollection :     BisWebTransformationCollection,
    BisWebSurface : BisWebSurface,
    BisWebElectrodeMultiGrid : BisWebElectrodeMultiGrid,
    // Transformation Utilities
    bisxformutil : bisxformutil,
    // Tensor Flow
    //    bistfutil: bistfutil,
    // WASM build time,
    biswasmdate : biswasmdate,
    // WASM Stuff
    biswrap : biswrap
};



