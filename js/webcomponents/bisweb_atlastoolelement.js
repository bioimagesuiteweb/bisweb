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
const bis_genericio=require('bis_genericio');
const $=require('jquery');
//const bootbox=require('bootbox');
//const webfileutil = require('bis_webfileutil');
const BisWebPanel = require('bisweb_panel.js');
const BisWebImage = require('bisweb_image.js');



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
        this.atlaspath=imagepath+'/atlases/';
        this.atlaslist = null;
        
        let mastername=this.atlaspath+'atlaslist.json';
        this.atlaslabelimage=null;
        this.atlasdescription=null;
        this.atlasdimensions=null;
        this.atlasspacing=null;
        this.atlasslicesize=0;
        this.atlasvolumesize=0;


        
        this.atlasLoaded=new Promise( (resolve,reject) => {
            
            bis_genericio.read(mastername).then( (obj) => {
                let data=obj.data;
                this.atlaslist=null;
                console.log(data);
                try {
                    this.atlaslist=JSON.parse(data);
                } catch(e) {
                    console.log(e);
                }
                resolve();
            }).catch( (e) => {
                console.log(e,e.stack);
                reject();
            });
        });
    }

    compareDimensions(imgdim,imgspa,atlasdim,atlasspa,factor=1.5) {
            
        let agrees=true;
        for (let i=0;i<=2;i++) {
            let sz=imgdim[i]*imgspa[i];
            let asz=atlasdim[i]*atlasspa[i];
            if (Math.abs(sz-asz)>factor*atlasspa[i])
                agrees=false;
        }
        return agrees;
    }


    /** Called by OrthoViewer when the image changes */
    initialize(subviewers,volume,samesize=false) {

        
        if (samesize===true && this.currentAtlas!==null)
            return;

        if (this.atlaslist===null)
            return;

        // Is this the same size as the current atlas

        let dim=volume.getDimensions();
        let spa=volume.getSpacing();

        if (this.atlaslabelimage) {
            let atlasdim=this.atlaslabelimage.getDimensions();
            let atlasspa=this.atlaslabelimage.getSpacing();
            if (this.compareDimensions(dim,spa,atlasdim,atlasspa)) {
                console.log('This atlas will do');
                return;
            }
        }

        
        let found=false,i=0;
        let keys=Object.keys(this.atlaslist);
        console.log('Keys=',keys,dim,spa);
        
        while (i<keys.length && found===false) {
            let atlasdim=this.atlaslist[keys[i]]['dimensions'];
            let atlasspa=this.atlaslist[keys[i]]['spacing'];

            if (this.compareDimensions(dim,spa,atlasdim,atlasspa)) 
                found=true;
            else
                i=i+1;
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
            webutil.createAlert('Could not load find a good atlas',true);
        }
            
        
    }

    /** parse and load atlas */
    initializeAtlas(data) {

        let img=new BisWebImage();
        img.load(this.atlaspath+data.labels.filename).then( () => {

            console.log('Atlas loaded ',img.getDescription());
            this.atlaslabelimage=img;
            this.atlasdescription=data;
            this.atlasdimensions=img.getDimensions();
            this.atlasspacing=img.getSpacing();
            this.atlasslicesize=this.atlasdimensions[0]*this.atlasdimensions[1];
            this.atlasvolumesize=this.atlasslicesize*this.atlasdimensions[2];
        }).catch( (e) => {
            webutil.createAlert('Could not load atlas image from '+this.atlaspath+data.labels.filename+' '+e,true);
        });
    }
    

    updateGUI(result) {

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
        
        if ( mousestate === undefined )
            return;
        
        if (!this.panel.isOpen())
            return;

        let voxelcoords=[0,0,0,0];
        for (let i=0;i<=2;i++) {
            voxelcoords[i]=util.range(mm[i]*this.atlasspacing[i],0,this.atlasdimensions[i]-1);
        }

        let result=[];
        let data=this.atlasdescription.labels.data;
        console.log(data);
        for (let j=0;j<this.atlasdimensions[3];j++) {
            voxelcoords[3]=j;
            let elem=data[j];
            if (elem.name!=='') { 
                let v=( this.atlaslabelimage.getVoxel(voxelcoords));
                let desc=elem.labels[v] || 'None';
                if (desc) {
                    result.push( { coordinates : voxelcoords,
                                   name : elem.name,
                                   value : v,
                                   desc : desc
                                 });
                }
            }
        }
        this.updateGUI(result);
    }

        /** initialize (or reinitialize landmark control). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.)
     * @param {Bis_SubViewer} subviewers - subviewers to place info in
     * @param {BisImage} volume - new image
     */
    connectedCallback() {

        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        
        webutil.runAfterAllLoaded( () => {
            this.orthoviewer=document.querySelector(viewerid);
            this.orthoviewer.addMouseObserver(this);
            
            let layoutcontroller=document.querySelector(layoutid);
            console.log('Panel ...\n');
            this.panel=new BisWebPanel(layoutcontroller,
                                       {  name  : 'Atlas Tool',
                                          permanent : false,
                                          width : '290',
                                          dual : false,
                                       });
            this.parentDomElement=this.panel.getWidget();
            var basediv=$("<div>This will appear once an image is loaded.</div>");
            this.parentDomElement.append(basediv);
        });
    }
                                

    show() {
        this.panel.show();
    }

    

}

webutil.defineElement('bisweb-atlastoolelement', AtlasControlElement);


