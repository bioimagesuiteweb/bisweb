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

const bisweb_apputil = require("bisweb_apputilities.js");
const BisWebImage = require('bisweb_image');
const webutil = require('bis_webutil');
const webcss = require('bisweb_css');
const webfileutil = require('bis_webfileutil');
const FastClick = require('fastclick');
const $ = require('jquery');
const genericio=require('bis_genericio');
const bootbox=require('bootbox');

/**
 * A Application Level Element that creates a Viewer Application using an underlying viewer element.
 *
 * @example
 *
 * <bisweb-lightapplication
 *     bis-menubarid="#viewer_menubar"
 *     bis-painttoolid="#painttool"
 *     bis-consoleid="#bisconsole"
 *     bis-viewerid="#viewer"
 *     bis-viewerid2="#viewer">
 * </bisweb-lightapplication>
 *
 * Attributes
 *     bis-viewerid : the id of the underlying <bisweb-orthogonalviewer> or <bisweb-mosaicviewer> element
 *     bis-viewerid2 : the id of the second <bisweb-orthogonalviewer> element (must be for use as slave)
 */
class LightApplicationElement extends HTMLElement {

    constructor() {
        super();
        this.syncmode = false;
        this.VIEWERS=[];
        this.num_independent_viewers = 2;
        this.applicationURL=webutil.getWebPageURL();
        this.applicationName=webutil.getWebPageName();
        this.websocket=null;
        this.websocketindex=-1;
        if (this.applicationName.lastIndexOf("2")===this.applicationName.length-1)
            this.applicationName=this.applicationName.substr(0,this.applicationName.length-1);
        console.log("++++ App_name="+this.applicationName+' ('+this.applicationURL+')');

        // For dual tab apps
        this.tab1name=null;
        this.tab2name=null;

        this.applicationInitializedPromiseList= [ ];

        // List of all components (e.g. module manegr, snapshot controller etc.)
        this.componentDictionary={};
    }

    // ----------------------------------------------------------------------------
    /** return a viewer by index
     * @param{Number} index -- 0 or 1
     * @returns{Viewer}
     */
    getViewer(index) {
        if (index<0 || index>=this.VIEWERS.length)
            return this.VIEWERS[0];
        return this.VIEWERS[index];
    }
    
    //  ---------------------------------------------------------------------------
    // In case of dual viewers
    /** Return the visible tab
     * @returns{Number} - either 1 or 2
     */
    getVisibleTab() {
        if (this.tab1name && this.tab2name) {
            let tab2link = this.getAttribute('bis-tab2');
            let widget=$(tab2link);
            let cls=widget.attr('class');
            if (cls.indexOf('active')>=0) 
                return 2;
        }
        return 1;
    }

    /** Set the visible tab in case of a dual viewer 
     * @param{Number} n - either 1 or 2
     */
    setVisibleTab(n) {

        if (this.tab1name && this.tab2name) {
            if (n===1)
                $(this.tab1name).tab('show');
            else
                $(this.tab2name).tab('show');
        }
    }
    

    //  ---------------------------------------------------------------------------
    // Find the viewers ('bis-viewerid' and 'bis-viewerid2') and store them in t
    // this.VIEWERS
    // Also set this.num_independent_viewers appropriately
    //  ---------------------------------------------------------------------------
    findViewers() {

        const viewerid = this.getAttribute('bis-viewerid');
        const viewerid2 = this.getAttribute('bis-viewerid2') || null;

        this.VIEWERS = [document.querySelector(viewerid)];
        this.VIEWERS[0].setName('viewer1');
        if (viewerid2 !== null) {
            this.VIEWERS.push(document.querySelector(viewerid2));
            this.VIEWERS[1].setName('viewer2');
        }

        this.num_independent_viewers = this.VIEWERS.length;
        if (this.syncmode) {
            this.num_independent_viewers = 1;
            webutil.setAlertTop(130);
        }


    }

    
    
    // ---------------------------------------------------------------------------
    // I/O Code
    // ---------------------------------------------------------------------------
    loadImage(fname, viewer = 0, orient='None') {
        const self=this;

        
        const img = new BisWebImage();
        return new Promise( (resolve,reject) => {

            setTimeout( () => {
                img.load(fname,orient)
                    .then(function () {
                        self.VIEWERS[viewer].setimage(img);
                        resolve();
                    }).catch( (e) => { 
                        webutil.createAlert('An error occured while displaying image ' + fname, true);
                        reject(e); 
                    });
            },10);
        });
    }

    loadOverlay(fname, viewer=0,orient='None') {

        const self=this;
        return new Promise( (resolve,reject) => {
            let img = new BisWebImage();
            setTimeout( () => {
                img.load(fname,orient)
                    .then(function () {
                        self.VIEWERS[viewer].setobjectmap(img, false);
                        resolve();
                    }).catch((e) => {
                        webutil.createAlert(e, true);
                        console.log(e.stack);
                        reject(e);
                    });
            },10);
        });
    }

    //  ---------------------------------------------------------------------------
    connectWebSocket(port,index) {
        let str="ws://127.0.0.1:"+port;
        console.log('Connecting to',str);
        this.websocket = new WebSocket(str);
        this.websocketindex=index;
        this.websocket.onmessage = (event) => {
            let cmd=JSON.parse(event.data);
            console.log("Received",cmd);
            
            if (cmd.command==='load') {
                let v=cmd.viewer || 0;
                let ov=cmd.overlay || false;

                let p=null;
                if (ov)
                    p=this.loadOverlay(cmd.filename,v);
                else
                    p=this.loadImage(cmd.filename,v);
                p.then( () => {
                    setTimeout( () => {
                        this.websocket.send(JSON.stringify({
                            "command" : "done",
                            "index" : this.websocketindex
                        }));
                    },100);
                });
            }

            if (cmd.command==='crosshairs') {
                setTimeout( () => {
                    let v=cmd.viewer || 0;
                    this.getViewer(v).setcoordinates(cmd.coords);
                },10);
            }

            if (cmd.command==='show') {
                setTimeout( () => {
                    let md=cmd['mode'];
                    console.log(' V=',this.getViewer(0));
                    if (md==='Left')
                        this.getViewer(1).setDualViewerMode(1.0);
                    else if (md==='Right')
                        this.getViewer(1).setDualViewerMode(0.0);
                    else
                        this.getViewer(1).setDualViewerMode(0.5);
                },10);
            }
        };

        this.websocket.addEventListener('open', (event) => {
            this.websocket.send(JSON.stringify({
                "command" : "viewerReady",
                "index" : index
            },null,2));
        });
    }
    //  ---------------------------------------------------------------------------
    
    parseQueryParameters() {

        let imagename=webutil.getQueryParameter('image') || '';
        let imagename2=webutil.getQueryParameter('image2') || '';
        let overlayname=webutil.getQueryParameter('overlay') || '';
        let overlayname2=webutil.getQueryParameter('overlay2') || '';
        let websocketnumber=parseInt(webutil.getQueryParameter('port') || 0);
        let index=parseInt(webutil.getQueryParameter('index') || 0);

        if (imagename.length>0) {
            this.loadImage(imagename,0).then( () => {
                if (overlayname.length>0) {
                    if (painttoolid===null)  {
                        this.loadOverlay(overlayname,0);
                    } else {
                        let painttool = document.querySelector(painttoolid);
                        painttool.loadobjectmap(overlayname);
                    }
                }
            });
            if (imagename2.length>0 && this.num_independent_viewers>1) {
                this.loadImage(imagename2,1).then( () => {
                    if (overlayname2.length>0) {
                        this.loadOverlay(overlayname2,1);
                    }
                });
            }
        }

        if (websocketnumber>0) {
            console.log('Port=',websocketnumber);
            this.connectWebSocket(websocketnumber,index);
        }
        
    }
                                
    fixColors() {
        // This is probably already taken care of
        // by a viewerlayoutelement but if not ...
        //console.log("Calling setAutoColorMode");
        webcss.setAutoColorMode();
    }

   
    fixMobileMouseHandling() {
        new FastClick(document.body);
        window.addEventListener("touchstart", 
                                (event) => {
                                    if(event.touches.length > 1) {
                                        //the event is multi-touch
                                        //you can then prevent the behavior
                                        event.preventDefault();
                                    }
                                },{ passive : false});
    }
    
    
    connectedCallback() {

        // -----------------------------------------------------------------------
        // Find other items
        // -----------------------------------------------------------------------
        this.findViewers();
        console.log(this.VIEWERS);
        // ----------------------------------------------------------
        // Mouse Issues on mobile and final cleanup
        // ----------------------------------------------------------
        this.fixMobileMouseHandling();
        this.fixColors();
        
        if (this.num_independent_viewers > 1)
            this.VIEWERS[1].setDualViewerMode(0.75);

        this.parseQueryParameters();
    }
        
}
webutil.defineElement('bisweb-lightapplication', LightApplicationElement);
module.exports=LightApplicationElement;


