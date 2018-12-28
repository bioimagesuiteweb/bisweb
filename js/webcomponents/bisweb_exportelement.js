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
const bisdate=require('bisdate.js');

class ExportElement extends HTMLElement {

    constructor() {
        super();
        this.export=exportobj;
    }

    connectedCallback() {
        console.log(`BioImage Suite Web Export Object (bioimagesuiteweb) loaded. Current build= (${bisdate.version}, ${bisdate.date}, ${bisdate.time}).`);
    }


}
    
window.customElements.define('bisweb-exportelement', ExportElement);
