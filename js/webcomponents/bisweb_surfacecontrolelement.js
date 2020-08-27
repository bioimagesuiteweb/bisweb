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

const util=require('bis_util');
const BisWebSurface=require('bisweb_surface');
const BisWebSurfaceMeshSet=require('bis_3dsurfacemeshset');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');
const $=require('jquery');
const bootbox=require('bootbox');
const webfileutil = require('bis_webfileutil');
const BisWebPanel = require('bisweb_panel.js');
const dat = require('bisweb_datgui');



const MAXSETS=4;

// -------------------------------------------------------------------------

/** 
 * A web element to create and manage a GUI for a Surface Control
 * that draws surfaces in an {@link OrthogonalViewer} viewer.
 *  The GUI for this appears inside a {@link ViewerLayoutElement}.
 *
 *
 *
 * @example
 *  <bisweb-surfacecontrolelement
 *      bis-layoutwidgetid="#viewer_layout"
 *      bis-viewerid="#viewer">
 *  </bisweb-surfacecontrolelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class SurfaceControlElement extends HTMLElement {

    constructor() {

        super();

        this.internal = {
            // global stuff
            this : null,
            initialized : false,
            subviewers : null,
            parentDomElement : null,
            domElement : null,
            orthoviewer : null,
            
            // surfaces and index to current one
            currentsurfaceindex : 0,
            surfaces : [ ],
            meshsets : [ ],
            meshvisible : [] ,
            // gui stuff
            surfacelabelelement : null,
            folders : null,
            surfacepropertiesgui : null,
            allnames : [ ],
        };

        this.internal.data= {
            color : "#ff0000",
            uniform : true,
            hue : 0.02,
            opacity : 0.8,
            visible : true
        };
        
        this.panel=null;
    }

    // -------------------------------------------------------------------------
    // Cleanup display elements
    // -------------------------------------------------------------------------

    /** Clean up meshes currently displayed
     * @param {boolean} currentonly - (default false). If true delete only current surface mesh (for all viewers) instead of all.
     */
    cleanupdisplayelements(currentonly=false) {

        if (this.internal.subviewers===null || this.internal.mesh===null)
            return;

        let mini=0,maxi=this.internal.meshsets.length;
        if (currentonly) {
            mini=this.internal.currentpointselect;
            maxi=mini+1;
        }
        
        for (let i=mini;i<maxi;i++) {
            if (this.internal.mesheets[i]) {
                this.internal.meshsets[i].remove(true);
                this.internal.mesheets[i]=null;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Create basic geometries of cursor and surfacess 
    // -------------------------------------------------------------------------
    /** create a mesh for surface set of index=index. Stores this.internally
     * @param {number} index - index of surface set to use
     */
    createsurfacemesh(index=null) {

        if (index===null)
            index=this.internal.currentsurfaceindex;
        
        this.internal.meshsets[index].createMeshes(this.internal.subviewers,
                                                  this.internal.surfaces[index],
                                                  null,
                                                  null,
                                                  null,
                                                  null,
                                                   0);
    }

    updatesurfacemesh(index=null,hue=null,color=null,opacity=null,uniformColor=null) {

        if (index===null) index=this.internal.currentsurfaceindex;
        if (hue===null) hue=this.internal.data.hue;
        if (opacity===null) opacity=this.internal.data.opacity;
        if (uniformColor===null) uniformColor=this.internal.data.uniform;
        if (color===null)  color=this.internal.data.color;
        let cl=util.hexToRgb(color);
        let rgb= [ cl.r/255.0, cl.g/255.0, cl.b/255.0 ];
        console.log('Color=',color,'cl=',cl, 'rgb=',rgb,' index=',index,'uniform=',uniformColor);
        this.internal.meshsets[index].updateDisplayMode(hue,rgb,opacity,uniformColor);
        console.log('Setting visible=',this.internal.meshvisible[index]);
        this.internal.meshsets[index].showMeshes(this.internal.meshvisible[index]);
    }
    
    // -------------------------------
    // update gui once changes are made
    // -------------------------------
    /** updates gui based on this.internal changes
     * @param {boolean} nocurrentname - if false (default) also updates the name of the current surface.
     */
    updategui(nocurrentname=false) {
        
        // Set values of this.internal.data
        let cur_surfacemesh=this.internal.meshsets[this.internal.currentsurfaceindex];
        let cl=[ Math.floor(cur_surfacemesh.color[0]*255.0),
                 Math.floor(cur_surfacemesh.color[1]*255.0),
                 Math.floor(cur_surfacemesh.color[2]*255.0) ];

        let color=util.rgbToHex(cl[0],cl[1],cl[2]);
        this.internal.data.color=color;
        this.internal.data.hue=cur_surfacemesh.hue;
        this.internal.data.opacity=cur_surfacemesh.opacity;
        this.internal.data.uniformColor=cur_surfacemesh.uniformColor;
        this.internal.data.visible=this.internal.meshvisible[this.internal.currentsurfaceindex];
        
        if (!nocurrentname) {
            this.internal.data.currentname=this.internal.allnames[this.internal.currentsurfaceindex];
        }

        // Update controllers
        if (this.internal.folders!==null) {
            for (var ib=0;ib<this.internal.folders.length;ib++) {
                for (var ia=0;ia<this.internal.folders[ib].__controllers.length;ia++) {
                    this.internal.folders[ib].__controllers[ia].updateDisplay();
                }
            }
        }

    }

    // ------------------------------------------------------------------------
    // GUI Options for whole set
    // ------------------------------------------------------------------------

    getInitialSaveFilename() {
        return this.internal.surfaces[this.internal.currentsurfaceindex].filename;
    }
    
    /** Export surfaces to a .land file.  */
    exportsurfaces(fobj) {
        this.picksurface(false);
        let fname=bisgenericio.getFixedSaveFileName(fobj,this.internal.surfaces[this.internal.currentsurfaceindex].filename);
        let index=fname.lastIndexOf('.');
        let newname=fname.substr(0,index-1)+".surjson";
        this.internal.surfaces[this.internal.currentsurfaceindex].save(newname);
        return false;
    }

    
    /** Save surfaces to a .ljson file. */
    savesurface(fobj) {
        // rework this!!!
        // webutil.createAlert('Surfaces loaded from ' +filename+' numpoints='+surface.getnumpoints());
        
        this.picksurface(false);
        var a=this.internal.surfaces[this.internal.currentsurfaceindex].serialize();
        fobj=bisgenericio.getFixedSaveFileName(fobj,this.internal.surfaces[this.internal.currentsurfaceindex].filename);
        bisgenericio.write(fobj,a);
        return false;
    }

    /** delete all points -- pops up dialog first to make sure. No undo possible. */
    clearsurface() {

        bootbox.confirm("Are you sure you want to delete surface from memory?", (c) => {

            if (c) {
                this.internal.surfaces[this.internal.currentsurfaceindex].initialize();
                this.internal.meshsets[this.internal.currentsurfaceindex].remove();
            }
        });
        return false;
    }
    
    /** Load surfaces. Called from input=File element 
     * @param {string} filename - filename
     */
    loadsurface(filename) {

        this.internal.surfaces[this.internal.currentsurfaceindex].load(filename).then( () => {
            webutil.createAlert('Surfaces='+this.internal.surfaces[this.internal.currentsurfaceindex].getDescription());
            this.createsurfacemesh();
            this.updatesurfacemesh();
            this.showhidemeshes();
        });
        /*.catch( (e) => {
            console.log(e);
            webutil.createAlert(e,true);
        });*/
        return false;
    }

    /** Set Current surface set.
     * @param {number} ind - index of set to use as current
     */
    setcurrentsurface(ind) {
        
        ind=util.range(ind||0,0,MAXSETS-1);
        if (ind==this.internal.currentsurfaceindex)
            return;
        
        this.internal.currentsurfaceindex=ind;
        this.showhidemeshes();
        this.updategui();
    }
    
    /** Sets the visibility of the various meshes depending on GUI state */
    showhidemeshes() {
        for (let st=0;st<this.internal.meshsets.length;st++) 
            this.internal.meshsets[st].showMeshes(this.internal.meshvisible[st]);
    }

    // -------------------------------------------------------------------------------------------
    // create GUI
    // -------------------------------------------------------------------------------------------
    /* Connected callback */
    connectedCallback() {
        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        this.internal.orthoviewer=document.querySelector(viewerid);
        
        let layoutcontroller=document.querySelector(layoutid);
        let viewer=document.querySelector(viewerid);
        viewer.addMouseObserver(this);
        
        this.panel=new BisWebPanel(layoutcontroller,
                                    {  name  : 'Surface Editor',
                                       permanent : false,
                                       width : '290',
                                       dual : false,
                                    });
        this.initialized=false;
        this.internal.parentDomElement=this.panel.getWidget();
        var basediv=$("<div>This will appear once an image is loaded.</div>");
        this.internal.parentDomElement.append(basediv);
        this.createMeshes();
    }

    createMeshes() {
        this.internal.surfaces=new Array(MAXSETS);
        this.internal.meshsets=new Array(MAXSETS);
        this.internal.meshvisible=new Array(MAXSETS);
        this.internal.allnames=new Array(MAXSETS);


        //const triangles= [ 0,2,1 ];

        
        for (let i=0;i<MAXSETS;i++) {
            //const points=[ 5.0,5.0,10.0+20*i, 5.0,100.0,15.0+20*i, 100.0,100.0,40.0+20*i ];
            let cl=util.getobjectmapcolor(i+1);
            for (let i=0;i<=3;i++)
                cl[i]=cl[i]/255.0;
            this.internal.surfaces[i]=new BisWebSurface();

            //this.internal.surfaces[i].setFromRawArrays(points,triangles);
            
            this.internal.surfaces[i].filename="Surface"+(i+1)+".surjson";
            this.internal.meshsets[i]=new BisWebSurfaceMeshSet();
            this.internal.meshsets[i].color=cl;
            if (i===0)
                this.internal.meshvisible[i]=true;
            else
                this.internal.meshvisible[i]=false;
            this.internal.allnames[i]="Surface "+(i+1);
        }
         
        this.internal.currentsurfaceindex=0;
        this.internal.data.currentname=this.internal.allnames[0];
    }
    
    createGUI() {

        if (this.initialized)
            return;

        this.initialized=true;
        this.internal.parentDomElement.empty();
        let basediv=webutil.creatediv({ parent : this.internal.parentDomElement});
        this.internal.domElement=basediv;
        
        let f1 = new dat.GUI({autoPlace: false});
        basediv.append(f1.domElement);

        
        
        f1.add(this.internal.data,'currentname',this.internal.allnames).name("CurrentSurface").onChange( (e) => {
            let ind=this.internal.allnames.indexOf(e);
            this.setcurrentsurface(ind);
        });
        f1.add(this.internal.data, 'visible').name("Visible").onChange( () => {
            this.internal.meshvisible[this.internal.currentsurfaceindex]=this.internal.data.visible;
            this.showhidemeshes();
        });
        let w1=f1.addColor(this.internal.data, 'color').name("Color").onChange(() => { this.updatesurfacemesh(); });
        $(w1.domElement.children).css( { 'height' : '16px' });
        f1.add(this.internal.data, 'opacity',0.0,1.0).name("Opacity").step(0.1).onChange(() => { this.updatesurfacemesh(); });
        f1.add(this.internal.data, 'uniform').name("Uniform Color").onChange( () => { this.updatesurfacemesh(); });
        f1.add(this.internal.data, 'hue',0.0,1.0).name("Hue").step(0.01).onChange(()  => { this.updatesurfacemesh(); });


        webutil.removedatclose(f1);
        this.internal.folders=[f1];

        // ---------------
        // rest of gui 
        // ---------------

        let bbar0=webutil.createbuttonbar({ parent: basediv,
                                            css : {'margin-top': '10px','margin-bottom': '10px'}});


        
        let load_cb=(f) => { this.loadsurface(f); };
        webfileutil.createFileButton({ type : "warning",
                                       name : "Load",
                                       position : "bottom",
                                       tooltip : "Click this to load surface",
                                       parent : bbar0,
                                       callback : load_cb,
                                       css : { 'margin-left' : '0px' },
                                     },{
                                         filename : '',
                                         title    : 'Select file to load current surface set from',
                                         filters  : [ { name: 'Surface Files', extensions: ['surjson','json' ]}],
                                         save : false,
                                         suffix : ".surjson,.json",
                                     });

        let save_cb=(f) => {
            f=f || 'surfaces.surson';
            return this.savesurfaces(f);
        };

        
        webfileutil.createFileButton({ type : "primary",
                                       name : "Save",
                                       position : "bottom",
                                       tooltip : "Click this to save points to a .surjson file",
                                       parent : bbar0,
                                       callback : save_cb,
                                       css : { 'margin-left' : '3px' },
                                     },
                                     {
                                         filename : '',
                                         title    : 'Select file to load current surface set from',
                                         filters  : [ { name: 'Surface Files', extensions: ['surjson','vtk' ]}],
                                         save : true,
                                         suffix : ".surjson,.vtk",
                                         initialCallback : () => { return this.getInitialSaveFilename(); },
                                     });


        webutil.createbutton({ name : '?',
                               tooltip : 'Info about surface',
                               type : "info",
                               css : { 'margin-left' : '3px' },
                               position : "left",
                               parent : bbar0 }).click( () =>{
                                   webutil.createAlert(this.internal.surfaces[this.internal.currentsurfaceindex].getDescription());
                               });
        
        
        webutil.createbutton({ type : "danger",
                               name : "Delete`",
                               position : "right",
                               tooltip : "Click this to delete the current surface",
                               parent : bbar0,
                               callback : () => { this.clearsurface();},
                               css : { 'margin-left' : '25px' },
                             });




        webutil.tooltip(this.internal.parentDomElement);
        this.updategui();

    }

    show() {
        this.panel.show();
    }

    updatemousecoordinates() {
        // nothing to do
    }
    
    /** mouse observer initialize */
    initialize(subviewers) {

        if (this.internal.subviewers) {

            // First cleanup
            for (let i=0;i<MAXSETS;i++)
                this.internal.meshsets[i].remove();
        }

        this.internal.subviewers=subviewers;
        this.createGUI();
        for (let i=0;i<MAXSETS;i++)
            this.internal.meshsets[i].createMeshes(this.internal.subviewers,
                                                   this.internal.surfaces[i],
                                                   null,
                                                   null,
                                                   null,
                                                   null,
                                                   0);

        this.showhidemeshes();
    }
        
    /** Store State in to an Object
     * @returns{Object} -- state dictionary
     */
    getElementState() {

        
        let obj = { };
        obj.data = this.internal.data;
        obj.currentsurface=this.internal.currentsurfaceindex;
        let surfaces=[];
        for (let i=0;i<this.internal.surfaces.length;i++) {
            surfaces.push(this.internal.surfaces[i].serializeToJSON());
        }
        let props=[];
        for (let i=0;i<this.internal.surfaces.length;i++) {
            props[i] = {
                'hue' : this.internal.meshsets[i].hue,
                'opacity' : this.internal.meshsets[i].opacity,
                'color' : this.internal.meshsets[i].color,
                'uniformColor' : this.internal.meshsets[i].uniformColor,
            };
        }
        obj.meshvisible=this.internal.meshvisible;
        obj.surfaces=surfaces;
        obj.props=props;
        obj.isopen=this.panel.isOpen();
        
        return obj;
    }

    /** Get State from Object
     * @param{Object} dt -- state dictionary
     */
    setElementState(dt) {
        if (!dt)
            return;

        let surfaces=dt.surfaces || [];
        for (let i=0;i<surfaces.length;i++) {
            let str=surfaces[i];
            let surface=this.internal.surfaces[i];
            let fname=surface.filename;
            if (fname.length<2)
                fname=`points_${i+1}.ljson`;
            surface.parseFromJSON(str);
        }

        dt.meshvisible=dt.meshvisible || null;
        
        let props=dt.props || [];
        for (let i=0;i<props.length;i++) {
            this.internal.meshsets[i]['hue']=props[i]['hue'];
            this.internal.meshsets[i]['color']=props[i]['color'];
            this.internal.meshsets[i]['opacity']=props[i]['opacity'];
            this.internal.meshsets[i]['uniformColor']=props[i]['uniformColor'];

            if (dt.meshvisible) {
                this.internal.meshvisible[i]=dt.meshvisible[i] || false;
            }
        }

        this.internal.data.showmode=dt.data.showmode;
        this.showhidemeshes();
        
        this.setcurrentsurface(dt.currentsurface || 0);
        if (dt.isopen) {
            this.panel.show();
        } else {
            this.panel.hide();
        }
    }

}


webutil.defineElement('bisweb-surfacecontrolelement', SurfaceControlElement);
module.exports=SurfaceControlElement;

