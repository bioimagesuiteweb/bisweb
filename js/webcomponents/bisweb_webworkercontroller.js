/*global HTMLElement, Worker */

"use strict";

const webutil = require('bis_webutil');
const bis_webworker=require("webworkermoduleutil.js");


/**
 * An element that manages module execution via a web worker
 *
 * @example
 *
 * <bisweb-webworkercontroller id="thisworker">
 * </bisweb-webworkercontroller>
 *
 */

class WebWorkerController extends HTMLElement {

    constructor() {
        super();
        /** A pointer to the global WebWorker element*/
        this.WebWorker=null;
    }
    // ----------------------------------------------------------
    // Initialize Web Worker
    // ----------------------------------------------------------
    /**
     * Worker is initialize via the connected callback
     */

    connectedCallback() {

        let newname="webworkermain.js";
        if (typeof(BIS) !== "undefined")
            newname="../build/web/"+newname;
        
        try { 
            this.WebWorker=new Worker(newname);
            console.log('++++ WebWorker created');
        } catch(e) {
            console.log(e);
        }
        
        this.WebWorker.onmessage = function(e) {
            let obj=null;
            try {
                obj=JSON.parse(e.data);
            } catch(err) {
                console.log("Unknown message received",err,err.stack,e.data);
            }
            
            if (obj.modulename) {
                console.log("WebWorker: Received module done command "+obj.modulename+" "+obj.id,Object.keys(obj));
                bis_webworker.inMainThreadModuleDone(obj);
            }  else {
                console.log("WebWorker: Not a module command");
            }
        };
    }

    /**
     * Returns the WebWorker
     * @returns {Worker} -- returns the WebWorker
     */
    getWorker() {
        return this.WebWorker;
    }
    
    /**
     * Command to execute a module in a Web Worker called from the Main thread
     * @param{String} modulename - the name of the module to execute
     * @param{Object} inputs - a dictionary containing the inputs
     * @param{Object} parameters - a dictionary containing the parameters
     * @returns {Promise} - resolved when it is done
     */
    executeModule(modulename,inputs,params) {

        return new Promise( (resolve, reject) => {
            let clb=function(o) {
                resolve(o);
            };
            try {
                bis_webworker.inMainThreadExecuteModule(this.WebWorker,modulename,inputs,params,clb);
            } catch(e) {
                reject(e);
            }
        });
    }
}

webutil.defineElement('bisweb-webworkercontroller', WebWorkerController);
