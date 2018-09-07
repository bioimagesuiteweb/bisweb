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

/* global setTimeout,HTMLElement */


"use strict";

const util=require('bis_util');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');
const $=require('jquery');
const bootbox=require('bootbox');
const webfileutil = require('bis_webfileutil');
const BisWebPanel = require('bisweb_panel.js');

import dat from 'dat.gui';

var loaderror = function(msg) {
    console.log(msg);
    webutil.createAlert(msg,true);
};

// -------------------------------------------------------------------------

/** 
 * A web element to create and manage a GUI for a Atlas Control
 * that draws landmarks in an {@link OrthogonalViewer} viewer.
 *  The GUI for this appears inside a {@link ViewerLayoutElement}.
 *
 *
 *
 * @example
 *  <bisweb-atlastoolelement
 *      bis-layoutwidgetid="#viewer_layout"
 *      bis-viewerid="#viewer">
 *  </bisweb-atlastoolelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class AtlasControlElement extends HTMLElement {


    constructor() {

        super();

        this.currentAtlas=null;
        this.panel=null;

        let imagepath=webutil.getWebPageImagePath();
        this.atlaspath=imagepath+'/atlas/';
        this.atlaslist = null;
        
        let mastername=this.atlaspath+'atlaslist.json';
        this.atlaslabelimage=[];
        this.atlasdescription=null;
        
        this.atlasLoaded=new Promise( (resolve,reject) => {
            
            bis_genericio.read(mastername).then( (obj) => {
                let data=obj.data;
                console.log(data);
                resolve();
            }).catch( (e) => {
                console.log(e,e.stack);
                reject();
            });
        });
    }


    /** Called by OrthoViewer when the image changes */
    initialize(subviewers,volume,samesize=false) {

        subviewers=0;
        if (samesize===true && this.currentAtlas!==null)
            return;

        if (this.atlaslist===null)
            return;
        

        let dim=volume.getDimensions();
        let spa=volume.getSpacing();

        let found=false,i=0;
        let keys=Object.keys(this.atlaslist);
        
        while (i<keys.length && found===false) {
            let atlasdim=this.atlaslist[keys[i]]['dimensions'];
            let atlasspa=this.atlaslist[keys[i]]['spacing'];

            let agrees=true;
            for (let i=0;i<=2;i++) {
                let sz=dim[i]*spa[i];
                let asz=atlasdim[i]*atlasspa[i];
                if (Math.abs(sz-asz)>1.5*atlasspa[ia])
                    agrees=false;
            }
            if (!agrees)
                i=i+1;
            else
                found=true;
        }

        if (found) {
            this.atlaslabelimage=null;
            this.atlasdescription=null;

            let atlas=this.atlaslist[keys[i]];
            console.log(atlas);
            bis_genericio.read(this.atlaspath+atlas.filename).then( (obj) => {
                try {
                    let data=JSON.parse(obj.data);
                    this.initializeAtlas(data);
                } catch(e) {
                    console.log(e);
                }
            }).catch( (e) => {
                console.log(e);
            });
        } else {
            webutil.createAlert('Could not load atlas info from '+this.atlaspath+atlasfilename,true);
        }
            
        
    }

    /** parse and load atlas */
    initializeAtlas(data) {

        let img=new BisWebImage();
        img.load(this.atlaspath+data.labels.filename).then( () => {

            console.log('Atlas loaded ',img.getDescription());
            this.atlaslabelimage=img;
            this.atlasdescription=data;
        }).catch( (e) => {
            webutil.createAlert('Could not load atlas image from '+this.atlaspath+data.labels.filename,true);
        });
    }
    

    /** receive mousecoordinates and act appropriately!
     * (This implements a function from the {@link BisMouseObserver} interface.)
     * @param {array} mm - [ x,y,z ] array with current point
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     * @param {number} mousestate - 0=click 1=move 2=release
     */
    updatemousecoordinates(mm,plane,mousestate) {

        if (this.atlasdescription===null)
            return;
        
        if ( mousestate === undefined || this.internal.landmarkset===null)
            return;
        
        if (this.internal.data.enabled===false)
            return;
        
        if (!this.panel.isOpen())
            return;

    }

        /** initialize (or reinitialize landmark control). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.)
     * @param {Bis_SubViewer} subviewers - subviewers to place info in
     * @param {BisImage} volume - new image
     */
    connectedCallback() {

        
        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        this.internal.orthoviewer=document.querySelector(viewerid);
        this.internal.orthoviewer.addMouseObserver(this);
        
        let layoutcontroller=document.querySelector(layoutid);
        this.panel=new BisWebPanel(layoutcontroller,
                                    {  name  : 'Atlas Tool',
                                       permanent : false,
                                       width : '290',
                                       dual : false,
                                    });
        this.internal.parentDomElement=this.panel.getWidget();
        var basediv=$("<div>This will appear once an image is loaded.</div>");
        this.internal.parentDomElement.append(basediv);
    }

    show() {
        this.panel.show();
    }

    

}

webutil.defineElement('bisweb-atlastoolelement', AtlasControlElement);


