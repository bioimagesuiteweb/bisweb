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
        this.useAtlas=false;
        this.tablebody=null;
        this.orientation="";
        this.atlasOrientation="";
        this.flips=[0,0,0];
        this.atlasLoaded=new Promise( (resolve,reject) => {
            
            bis_genericio.read(mastername).then( (obj) => {
                let data=obj.data;
                this.atlaslist=null;
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

    compareDimensions(imgdim,imgspa,atlasdim,atlasspa,factor=2.0) {
            
        let agrees=true;
        for (let i=0;i<=2;i++) {
            let sz=imgdim[i]*imgspa[i];
            let asz=atlasdim[i]*atlasspa[i];
            //            console.log("Checking ",i,sz,asz);
            if (Math.abs(sz-asz)>factor*atlasspa[i])
                agrees=false;
        }
        return agrees;
    }


    removeAtlas() {

        this.useAtlas=false;
        /*        this.atlaslabelimage=null;
                  this.atlasdescription=null;*/
        if (this.panel) {
            this.parentDomElement.empty();
            this.parentDomElement.append($("<div>There is no suiteable atlas for this image.</div>"));
            this.panel.hide();
        }
    }

    setFlips() {
        this.flips=[0,0,0];
        if (this.orientation===this.atlasOrientation)
            return;
        
        for (let i=0;i<=2;i++) {
            let a=this.orientation.substr(i,1);
            let b=this.atlasOrientation.substr(i,1);
            if (a!==b)
                this.flips[i]=1;
        }
        //        console.log('Flips=',this.flips);
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
        this.orientation=volume.getOrientationName();
        if (this.orientation!=="LPS" &&
            this.orientation!=="RAS" &&
            this.orientation!=="LAS" ) {
            this.removeAtlas();
            return;
        }
            
        
        if (this.atlaslabelimage) {
            let atlasdim=this.atlaslabelimage.getDimensions();
            let atlasspa=this.atlaslabelimage.getSpacing();
            if (this.compareDimensions(dim,spa,atlasdim,atlasspa)) {
                //Good Enough keeping it
                this.setFlips();
                this.useAtlas=true;
                this.createGUITable();
                this.updateGUI(this.queryAtlas(this.orthoviewer.getmmcoordinates()));
                return;
            }
        } else {
            //            console.log("No atlas in memory");
        }
        
        this.useAtlas=false;
        let found=false,i=0;
        let keys=Object.keys(this.atlaslist);

        
        while (i<keys.length && found===false) {
            let atlasdim=this.atlaslist[keys[i]]['dimensions'];
            let atlasspa=this.atlaslist[keys[i]]['spacing'];

            if (this.compareDimensions(dim,spa,atlasdim,atlasspa)) 
                found=true;
            else
                i=i+1;
        }
    
        if (found) {
            let atlas=this.atlaslist[keys[i]];
            bis_genericio.read(this.atlaspath+atlas.filename).then( (obj) => {
                try {
                    let data=JSON.parse(obj.data);
                    this.initializeAtlas(data);
                } catch(e) {
                    console.log(e);
                }
            }).catch( (e) => {
                console.log(e);
                this.removeAtlas();
            });
        } else {
            this.removeAtlas();
        
        }
    }

    /** parse and load atlas */
    initializeAtlas(data) {

        let img=new BisWebImage();
        img.load(this.atlaspath+data.labels.filename,"NONE").then( () => {

            console.log('.... Atlas loaded ',img.getDescription());
            this.useAtlas=true;
            this.atlaslabelimage=img;
            this.atlasdescription=data;
            this.atlasdimensions=img.getDimensions();
            this.atlasspacing=img.getSpacing();
            this.atlasslicesize=this.atlasdimensions[0]*this.atlasdimensions[1];
            this.atlasvolumesize=this.atlasslicesize*this.atlasdimensions[2];
            this.atlasOrientation=img.getOrientationName();
            
            this.createGUITable();
        }).catch( (e) => {
            webutil.createAlert('Could not load atlas image from '+this.atlaspath+data.labels.filename+' '+e,true);
            this.removeAtlas();
        });
    }

    createGUITable() {
        this.parentDomElement.empty();
        let templates=webutil.getTemplates();
        let newid=webutil.createWithTemplate(templates.bisscrolltable,$('body'));
        let stable=$('#'+newid);
        let thead = stable.find(".bisthead");
        let tbody = stable.find(".bistbody",stable);
        
        thead.empty();
        tbody.empty();
        tbody.css({'font-size':'11px',
                   'user-select': 'none'});
        thead.css({'font-size':'14px',
                   'user-select': 'none'});
        
        
        thead.append($(`<tr><td width="10%"></td><td width="90%">${this.atlasdescription.labels.description}</td></tr>`));
        thead.append($(`<tr><BR></tr>`));
        //thead.append($(`<tr><td width="100%">${this.atlasdescription.labels.extra}</td></tr>`));
        
        
        this.tablebody=tbody;
        this.parentDomElement.append(stable);
        this.setFlips();
        this.updateGUI(this.queryAtlas(this.orthoviewer.getmmcoordinates()));
    }
    

    updateGUI(results) {

        this.tablebody.empty();
        let w=`<tr><td width="50%">Coordinates (mm)</td><td width="50%">${results.coords.join(', ')}</td></tr>`;
        this.tablebody.append($(w));
                
        for (let i=0;i<results.data.length;i++) {

            let elem=results.data[i];
            let w=$(`<tr>
                    <td width="50%">${elem.name}</td>
                    <td width="50%">${elem.desc}</td>
                    </tr>`);
            this.tablebody.append(w);

        }
    }
    
    /** receive mousecoordinates and act appropriately!
     * (This implements a function from the {@link BisMouseObserver} interface.)
     * @param {array} mm - [ x,y,z ] array with current point
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     * @param {number} mousestate - 0=click 1=move 2=release
     */
    updatemousecoordinates(mm,plane,mousestate) {

        if (!this.useAtlas)
            return;
        
        if ( mousestate === undefined || mousestate===2)
            return;
        
        if (!this.panel.isOpen())
            return;

        // ----- all clear try something
        this.updateGUI(this.queryAtlas(mm));
    }

    queryAtlas(mm) {

        let voxelcoords=[0,0,0,0];
        for (let i=0;i<=2;i++) {
            voxelcoords[i]=util.range(mm[i]*this.atlasspacing[i],0,this.atlasdimensions[i]-1);
            if (this.flips[i])
                voxelcoords[i]=(this.atlasdimensions[i]-1)-voxelcoords[i];
        }


        let results={
            'coords' : [ mm[0],mm[1],mm[2] ],
            'data' : []
        };


        if (this.atlasdescription.labels.coordinates) {
            let atlas=[0,0,0];
            let offsets=this.atlasdescription.labels.coordinates.offsets;
            for (let i=0;i<=2;i++)
                atlas[i]=voxelcoords[i]-offsets[i];
            results.data.push({
                "name" : this.atlasdescription.labels.coordinates.name,
                "desc" : atlas.join(", ")
            });
        }
        

        let data=this.atlasdescription.labels.data;
        for (let j=0;j<this.atlasdimensions[3];j++) {
            voxelcoords[3]=j;
            let elem=data[j];
            if (elem.name!=='') { 
                let v=( this.atlaslabelimage.getVoxel(voxelcoords));
                let desc=elem.labels[v] || 'None';
                if (desc) {
                    results.data.push( { 
                        name : elem.name,
                        desc : desc
                                  });
                }
            }
        }
        return results;
    }

        /** initialize (or reinitialize landmark control). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.)
     * @param {Bis_SubViewer} subviewers - subviewers to place info in
     * @param {BisImage} volume - new image
     */
    connectedCallback() {

        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        
        let layoutcontroller=document.querySelector(layoutid);
        this.panel=new BisWebPanel(layoutcontroller,
                                   {  name  : 'Atlas Tool',
                                      permanent : false,
                                      width : '290',
                                      dual : false,
                                   });
        this.parentDomElement=this.panel.getWidget();
        this.parentDomElement.append($("<div>This will appear once an image is loaded.</div>"));
        
        this.orthoviewer=document.querySelector(viewerid);
        this.orthoviewer.addMouseObserver(this);
            

    }
                                

    show() {
        this.panel.show();
    }

    isOpen() {
        return this.panel.isOpen();
    }
    

}

module.exports=AtlasControlElement;
webutil.defineElement('bisweb-atlastoolelement', AtlasControlElement);


