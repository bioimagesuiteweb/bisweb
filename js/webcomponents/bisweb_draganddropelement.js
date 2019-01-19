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


/* global  HTMLElement,window */
"use strict";

const $=require('jquery');
const webutil=require('bis_webutil');

// ---------------- drag and drop controller ----------------
/** 
 * A class to create functionality for drag-and-drop file loading in the current window
 */

class BisWebDragAndDropElement extends HTMLElement {

    constructor() {
        super();
        this.callback=null;
        this.enabled=true;
        this.newdiv = null;
        this.appended = false;
        this.blocks=0;
    }

    setCallback(clb) {
        this.callback=clb;
    }

    addBlock() {
        this.blocks=this.blocks+1;
    }

    removeBlock() {
        this.blocks=this.blocks-1;
        if (this.blocks<0) 
            this.blocks=0;
    }

    processEvent(e) {

        e.stopPropagation();
        e.preventDefault();
        if (!this.enabled)
            return false;

        if (this.blocks>0)
            return false;

        if (this.callback===null)
            return false;

        return true;
    }
    
    fileDragHover(e) {

        e.stopPropagation();
        e.preventDefault();
        let proceed=this.processEvent(e);
        if (proceed===false)
            return;

        
        if (e.type == "dragover" && this.appended === false) {
            this.newdiv = $('<div align="center" style="padding:5px; width:50vw; left:25vw; top:0vh; height:100px;' +
                            'border-radius:30px;background-color:#884400; z-index:5000; position: absolute; color:#ffffff">' +
                            '<H1>Drop Files to Load</H1></div>');
            $('body').append(this.newdiv);
            this.appended = true;
        } else if (e.type == "dragleave" && this.appended === true) {
            this.newdiv.remove();
            this.newdiv = null;
            this.appended = false;
        }
    }
    
    fileSelectHandler(e) {
        e.stopPropagation();
        e.preventDefault();

        if (!this.enabled || this.callback===false || this.blocks>0)
            return;
        
        this.newdiv.remove();
        this.appended = false;
        this.newdiv = null;
        let files = e.target.files || e.dataTransfer.files || null;

        if (files !==null) {
            if (files.length>0) {
                this.callback(files,e);
            }
        }
    }

    connectedCallback() {
        const self=this;
        window.addEventListener("dragover",
                                function(e) { self.fileDragHover(e);},
                                false);
        window.addEventListener("dragleave",
                                function(e) { self.fileDragHover(e);},
                                false);
        window.addEventListener("drop",
                                function(e) { self.fileSelectHandler(e);},
                                false);
    }
}

module.exports=BisWebDragAndDropElement;
webutil.defineElement('bisweb-draganddropelement', BisWebDragAndDropElement);
