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

    constructor() {
        super();
        this.export=exportobj;
    }


}
    
window.customElements.define('bisweb-exportelement', ExportElement);
