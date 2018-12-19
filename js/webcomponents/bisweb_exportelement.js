/*global HTMLElement, Worker */

"use strict";

/**
 * An element that exports functionality from the core BISWeb Code
 *
 * @example
 *
 * <bisweb-exportelement id="thiselement">
 * </bisweb-exportelement>
 *
 */

const exportobj=require('bisweb_exportobject');

class ExportElement extends HTMLElement {

    // ------------------------------------------------------------
    /** Code to load objects 
     * @param {string} text -- the JSON String to parse
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @returns {Promise} whose payload is the object
     */
    loadObject(filename, objecttype,) {
        return exportobj.loadObject(filename, objecttype);

    }

    /** Code to create objects 
     * @param {string} text -- the JSON String to parse
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @param {Various} param -- type specific initialization object, or parameter
     * @returns {BisWebDataObject} the underlying object
     */
    createObject(objecttype,param=null) {
        return exportobj.createObject(objecttype,param);
    }


    /** createModule
     * @param{string} ModuleName - the name of the module to create
     * @returns{Module} the module
     */
    createModule(modulename) {
        return exportobj.createModule(modulename);
    }

    /** return module genericio 
     * @returns{JavaScript Module} 
     */
    getGenericIO() {
        return exportobj.getGenericIO();
    }


}
    
window.customElements.define('bisweb-exportelement', ExportElement);
