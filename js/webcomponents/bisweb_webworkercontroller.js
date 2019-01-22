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

        this.outsideResolve=null;
        this.outsideReject=null;
        const self=this;
        this.promise=new Promise( (resolve, reject) => { 
            self.outsideResolve = resolve; 
            self.outsideReject = reject; 
        });
        this.workerInitialized=false;
    }

    /**
     * Worker is initialize via the connected callback
     */

    connectedCallback() {

        let newname="webworkermain.js";
        if (typeof(BIS) !== "undefined")
            newname="../build/web/"+newname;
        
        try { 
            this.WebWorker=new Worker(newname);
        } catch(e) {
            console.log(e);
            return;
        }

        const self=this;
        this.WebWorker.onmessage = function(e) {

            if (e.data==='initialized') {
                self.workerInitialized=true;
                self.outsideResolve();
                return;
            }
            
            let obj=null;
            try {
                obj=JSON.parse(e.data);
            } catch(err) {
                console.log("Unknown message received",err,err.stack,e.data);
            }
            
            if (obj.modulename) {
                console.log("WebWorker: Received module done command "+obj.modulename);
                bis_webworker.inMainThreadModuleDone(obj);
            }  else {
                console.log("WebWorker: error",e.data);
                bis_webworker.inMainThreadModuleDone( {
                    error : "Failed to execute",
                    detail : e.data,
                });
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

        const self=this;
        
        return new Promise( (resolve, reject) => {
            let clb=function(o) {
                resolve(o);
            };
            
            if (!self.workerInitialized) 
                self.WebWorker.postMessage('initialize');
            
            self.promise.then( () => {
                try {
                    bis_webworker.inMainThreadExecuteModule(this.WebWorker,modulename,inputs,params,clb);
                } catch(e) {
                    reject(e);
                }
            }).catch( (e) => {
                console.log('Error = ',e,e.stack);
                reject(e);
            });
        });
    }
}

module.exports=WebWorkerController;
webutil.defineElement('bisweb-webworkercontroller', WebWorkerController);
