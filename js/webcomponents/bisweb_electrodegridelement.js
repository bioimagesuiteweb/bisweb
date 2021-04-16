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

const THREE = require('three');
const util=require('bis_util');
const bisCrossHair=require('bis_3dcrosshairgeometry');
const BisWebElectrodeMultiGrid=require('bisweb_electrodemultigrid');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');
const $=require('jquery');
const webfileutil = require('bis_webfileutil');
const BisWebPanel = require('bisweb_panel.js');
const dat = require('bisweb_datgui');
const JSZip = require('jszip');
const filesaver = require('FileSaver');

const loaderror = function(msg) {
    console.log(msg);
    webutil.createAlert(msg,true);
};

const MAXGRIDS=30;
const PROPERTIES=[ "Motor", "Sensory", "Visual", "Language", "Auditory", "User1", "SeizureOnset", "SpikesPresent" ];

//const sleep=function(ms) {  return new Promise(resolve => setTimeout(resolve, ms));};

// -------------------------------------------------------------------------

/** 
 * A web element to create and manage a GUI for a Landmark Control
 * that draws landmarks in an {@link OrthogonalViewer} viewer.
 *  The GUI for this appears inside a {@link ViewerLayoutElement}.
 *
 *
 *
 * @example
 *  <bisweb-electrodegridcontrolelement
 *      bis-layoutwidgetid="#viewer_layout"
 *      bis-viewerid="#viewer">
 *  </bisweb-electrodegridcontrolelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class ElectrodeGridElement extends HTMLElement {


    constructor() {

        super();
        
        this.internal = {
            
            // global stuff
            initialized : false,
            this : null,
            subviewers : null,
            volume : null,
            parentDomElement : null,
            domElement : null,
            orthoviewer : null,
            
            // landmarks and index to current one
            multigrid : null,
            currentgridindex  : 0,
            currentelectrode : 0,
            mesh : [] ,
            meshcustomvisible : [] ,
            meshvisible : [] ,
            
            // gui stuff
            landlabelelement : null,
            
            folders : null,
            gridPropertiesGUI : null,
            currentelectrodeselect : null,
            checkbuttons : [],
            data : {
                showmode : "Current",
                allshowmodes : [ "Current", "All", "None" ],
                customshow : true,
                enabled : false,
                radius : 2.0,
                currentname : "No Grid in Memory",
                allnames : "No Grid in Memory",
                description : "",
                currentelectrode : 0,
                color : "#ff0000",
                dummy : false,
            },
        };

        this.panel=null;

    }

    // -------------------------------------------------------------------------
    // Cleanup display elements
    // -------------------------------------------------------------------------

    /** Clean up meshes currently displayed
     * @param {boolean} currentonly - (default false). If true delete only current landmark mesh (for all viewers) instead of all.
     */
    cleanUpMeshes(currentonly=false) {

        if (this.internal.subviewers===null || this.internal.mesh===null)
            return;

        if (this.internal.mesh.length<1)
            return;
        
        let min=0;
        let max=this.internal.mesh.length-1;
        if (currentonly) {
            min=this.internal.currentgridindex;
            max=this.internal.currentgridindex;
        }

        
        
        for (let st=min;st<=max;st++) {
            if (this.internal.mesh[st]!==null) {
                let elem=this.internal.mesh[st];
                for (let i=0;i<elem.length;i++) {
                    let vr=i;
                    if (i>3)
                        vr=3;
                    if (this.internal.subviewers[vr]!==null && elem[i]!==null) {
                        elem[i].visible=false;
                        this.internal.subviewers[vr].getScene().remove(elem[i]);
                        elem[i]=null;
                    }
                }
                this.internal.mesh[st]=null;
            }
        }

        if (!currentonly) {
            this.internal.mesh=[];
        }
        
    }

    // -------------------------------------------------------------------------
    // Create basic geometries of cursor and grids 
    // -------------------------------------------------------------------------
    /** create grid geometries -- calls code in {@link Bis_3dCrosshairGeometry}
     * @param {array} points - array of positions [ x1,y1,z1,x2,y2,z2 , ..  ] 
     * @param {number} pointsize - size of point
     * @param {boolean} smallsphere - (default false). If true make sphere small.
     * @returns {THREEJS-BufferGeometry} out
     */
    createGridGeometry(points,pointsize,smallsphere) {
        if (points.length<1)
            return null;

        smallsphere= smallsphere || false;

        let sz=this.internal.volume.getImageSize();
        let spa=this.internal.volume.getSpacing();
        let length= sz[0] * 0.02*pointsize;
        let thickness=spa[0]*0.5;
        let radius=0.5*length;
        if (smallsphere)
            radius=0.5*spa[0];
        
        let core=bisCrossHair.createcore(length,thickness,true,radius);
        let geometry=bisCrossHair.createcopies(core,points);
        //geometry.computeVertexNormals();
        return geometry;
    }


    mapColor(cl) {
        let cl2=[];
        for (let i=0;i<=2;i++) {
            cl2[i]=Math.floor(255*cl[i]);
        }
        return util.rgbToHex(cl2[0],cl2[1],cl2[2]);
    }


    /** create a mesh for grid of index=index. Stores this.internally
     * @param {number} index - index of grid to use
     */
    creategridmesh( index ) {

        if (this.internal.multigrid.getNumGrids()===0)
            return;
        
        let st= util.range(index||0,0,this.internal.multigrid.getNumGrids()-1);
        let grid=this.internal.multigrid.getGrid(st);
        let numelectrodes=grid.electrodes.length;
        if (numelectrodes<1) {
            if (this.internal.mesh[st]!==null) {
                this.internal.mesh[st].forEach(function(e) {
                    if (e!==null)
                        e.visible=false;
                });
            }
            return;
        }

        let points=[];
        for (let i=0;i<grid.electrodes.length;i++) {
            points.push(grid.electrodes[i].position);
        }

        
        this.internal.mesh[st]=new Array(5);
        let geometry=this.createGridGeometry(points,0.2*parseFloat(grid.radius),true);
        let geometry2=this.createGridGeometry(points,0.2*parseFloat(grid.radius),false);

        let color=this.mapColor(grid.color);
        let mat=new THREE.MeshBasicMaterial( {color: color, wireframe:false});
        let mat2=new THREE.MeshBasicMaterial( {color: color , wireframe:false});
        
        for (let i=0;i<this.internal.subviewers.length;i++) {
            
            if (i===this.internal.subviewers.length-1)
                this.internal.mesh[st][i]=new THREE.Mesh(geometry2,mat2);
            else
                this.internal.mesh[st][i]=new THREE.Mesh(geometry,mat);
            
            this.internal.mesh[st][i].visible=false;
            this.internal.subviewers[i].getScene().add(this.internal.mesh[st][i]);
        }

        // Create line mesh ... add add to 4
        let fp=new Float32Array(points.length*3);
        for (let i=0;i<points.length;i++) {
            for (let j=0;j<=2;j++)
                fp[i*3+j]=points[i][j];
        }
        let indices=new Uint16Array((points.length-1)*2);
        for (let i=0;i<points.length;i++) {
            indices[2*i]=i;
            indices[2*i+1]=i+1;
        }
            
        let buf=new THREE.BufferGeometry();
        buf.setIndex(  new THREE.BufferAttribute( indices, 1 ) );
        buf.addAttribute( 'position', new THREE.BufferAttribute( fp, 3 ) );
        let linemesh = new THREE.LineSegments(buf,
                                              new THREE.LineBasicMaterial( {
                                                  color: color,
                                                  linewidth : 1,
                                                  linecap : "square",
                                              }));
        linemesh.visbile=true;
        this.internal.subviewers[3].getScene().add(linemesh);
        this.internal.mesh[st][4]=linemesh;
        return;
    }
    
    // -------------------------------------------------------------------------
    // Display updates -- colors
    // -------------------------------------------------------------------------
    /** update colors for display based on GUI edits
     */
    updatecolors() {

        if (this.internal.multigrid.getNumGrids()===0)
            return;

        let colorValue=this.internal.data.color.replace( '#','0x' );
        let cl=util.hexToRgb(this.internal.data.color);

        let grid=this.internal.multigrid.getGrid(this.internal.currentgridindex);
        grid.color= [ cl.r/255,cl.g/255,cl.b/255];
        
        
        let mesh=this.internal.mesh[this.internal.currentgridindex];
        if (mesh!==null) {
            mesh.forEach(function(e) {
                e.material.color.setHex(colorValue);
            });
        }

        
    }

    /** shows modal dialog to update grid display properties
     */
    updateGridProperties() {
        this.internal.gridPropertiesGUI.modal('show');
        return false;
    }
    
    /** updates display of elements based on changes from GUI/user
     * @param {boolean} currentonly - (default false). If true delete only current landmark mesh (for all viewers) instead of all.
     */
    updateMeshes(currentonly=false) {
        
        if (this.internal.subviewers===null)
            return;

        this.cleanUpMeshes(currentonly);
        
        let min=0;
        let max=this.internal.multigrid.getNumGrids()-1;
        if (currentonly) {
            min=this.internal.currentgridindex;
            max=this.internal.currentgridindex;
        }

        
        for (let st=min;st<=max;st++) {
            this.creategridmesh(st);
        }

        setTimeout( () => { this.showhidemeshes();},2);
        if (!this.internal.pickmode)
            this.updateelectrodeselector();
    }

    // -------------------------------
    // update gui once changes are made
    // -------------------------------
    /** updates gui based on this.internal changes
     * @param {boolean} nocurrentname - if false (default) also updates the name of the current landmark.
     */
    updategui(nocurrentname=false) {

        if (this.internal.multigrid.getNumGrids()===0)
            return;

        // Set values of this.internal.data
        let grid=this.internal.multigrid.getGrid(this.internal.currentgridindex);
        this.internal.data.color=this.mapColor(grid.color);
        this.internal.data.radius= grid.radius;
        this.internal.data.customshow=this.internal.meshcustomvisible[this.internal.currentgridindex];
        this.internal.data.description='np:'+grid.electrodes.length+" : "+grid.description;
        this.internal.data.fixeddescription=this.internal.data.description;

        if (!nocurrentname) {
            this.internal.data.currentname=this.internal.data.allnames[this.internal.currentgridindex];
        }

        // Update controllers
        if (this.internal.folders!==null) {
            for (let ib=0;ib<this.internal.folders.length;ib++) {
                for (let ia=0;ia<this.internal.folders[ib].__controllers.length;ia++) {
                    this.internal.folders[ib].__controllers[ia].updateDisplay();
                }
            }
        }
    }

    
    /** GUI callback. Select landmark event (button press)
     * @param {number} e - landmark index
     * @param {boolean} noupd - if true no update of select element (callback is coming from it so avoid loop).
     */
    selectElectrode(e,noupd) {

        noupd=noupd || false;
        
        if (this.internal.currentelectrodeselect===null)
            return;
        
        let grid=this.internal.multigrid.getGrid(this.internal.currentgridindex);
        let np=grid.electrodes.length;
        
        if (np>0 && e===-1) 
            this.internal.currentelectrode=0;
        else 
            this.internal.currentelectrode=util.range(e,0,np-1);

        let electrode=this.internal.multigrid.getElectrode(this.internal.currentgridindex,
                                                           this.internal.currentelectrode);
        for (let i=0;i<PROPERTIES.length;i++) {
            let prop=PROPERTIES[i];
            let val=parseInt(electrode.props[prop]);
            if (val>0)
                val=true;
            else
                val=false;
            this.internal.checkbuttons[prop].prop("checked", val);
        }

        
        if (!noupd)
            this.internal.currentelectrodeselect.val(this.internal.currentelectrode);
    }

    /** Updates landmark select element from this.internal code changes (e.g. loading of new set etc.) */
    updateelectrodeselector() {
        if (this.internal.currentelectrodeselect===null)
            return;
        
        this.internal.currentelectrodeselect.empty();
        let grid=this.internal.multigrid.getGrid(this.internal.currentgridindex);
        if (!grid)
            return;
        
        let np=grid.electrodes.length;
        if (np===0) {
            let a=("<option value=\"-1\">None</option>");
            this.internal.currentelectrodeselect.append($(a));
            return;
        }
        for (let i=0;i<np;i++) {
            let name=grid.description+':'+(i+1);
            let b="<option value=\""+i+"\">"+name+"</option>";
            this.internal.currentelectrodeselect.append($(b));
        }
        if (this.internal.currentelectrode>=0 &&
            this.internal.currentelectrode<np) {
            this.internal.currentelectrodeselect.val(this.internal.currentelectrode);
        }
    }

    /** Select or release current landmark
     * @parameter {boolean} dopick - if true select else release.
     */
    centerOnElectrode() {
        let electrode=this.internal.multigrid.getElectrode(this.internal.currentgridindex,
                                                           this.internal.currentelectrode);
        let mm = electrode.position;
        this.internal.orthoviewer.updatemousecoordinates(mm,-1,0);
    }


    // ------------------------------------------------------------------------
    // GUI Options for whole set
    // ------------------------------------------------------------------------

    getInitialSaveFilename() {
        return this.internal.multigrid.getFilename();
    }
    
    /** Export landmarks to a .mgrid file.  */
    exportMultiGrid(fobj) {
        this.centerOnElectrode();
        let fname=bisgenericio.getFixedSaveFileName(fobj,this.internal.multigrid[this.internal.currentgridindex].filename);
        let index=fname.lastIndexOf('.');
        let newname=fname.substr(0,index-1)+".mgrid";
        this.internal.multigrid.save(newname);
        return false;
    }

    
    /** Save landmarks to a .bisgrid file. */
    saveMultiGrid(fobj) {
        // rework this!!!
        // webutil.createAlert('Landmarks loaded from ' +filename+' numpoints='+grid.getnumpoints());
        
        this.centerOnElectrode();
        fobj=bisgenericio.getFixedSaveFileName(fobj,this.internal.multigrid[this.internal.currentgridindex].filename);
        this.internal.multigrid.save(fobj);
        return false;
    }

    

    /** Load landmarks. Called from input=File element 
     * @param {string} filename - filename
     */
    loadMultiGrid(filename) {

        this.internal.multigrid.load(filename).catch( (e) => {
            loaderror(e);
        }).then( () => {
            let grid=this.internal.multigrid;
            this.internal.currentelectrodeselect.empty();
            this.onDemandCreateGUI();
            this.updateMeshes(false);
            this.updategui();
            this.selectElectrode(-1);
            this.centerOnElectrode();
            webutil.createAlert('Grid loaded from' +grid.filename+' numgrids='+grid.getNumGrids());
        });
        return false;
    }

    /** Set Current landmark set.
     * @param {number} ind - index of set to use as current
     */
    setCurrentGrid(ind) {
        
        ind=util.range(ind||0,0,this.internal.multigrid.getNumGrids()-1);
        if (ind==this.internal.currentgridindex)
            return;
        
        //          this.internal.data.enabled=false;
        this.internal.currentgridindex=ind;
        this.internal.currentelectrode=0;
        
        // No carryover pick
        this.centerOnElectrode();
        this.showhidemeshes(true);
        this.updategui();
        this.internal.currentelectrode=0;
        this.updateelectrodeselector();
    }
    
    /** Sets the visibility of the letious meshes depending on GUI state */
    showhidemeshes() {

        for (let st=0;st<this.internal.mesh.length;st++) {
            
            let doshow=this.internal.meshcustomvisible[st];
            if (this.internal.data.showmode === "All" )  {
                doshow=true;
            } else if (this.internal.data.showmode === "None" ) {
                doshow=false;
            } else if (this.internal.data.showmode === "Current") {
                if (st===this.internal.currentgridindex)
                    doshow=true;
                else
                    doshow=false;
            }
            
            this.internal.meshvisible[st]=doshow;
            
            if (this.internal.mesh[st]!==null) {
                for (let si=0;si<this.internal.mesh[st].length;si++) {
                    if (this.internal.mesh[st][si]!==null) {
                        this.internal.mesh[st][si].visible=doshow;
                    }
                }
            }
        }
        

        
    }
    

    // -------------------------------------------------------------------------------------------
    // create GUI
    // -------------------------------------------------------------------------------------------
    /** actual GUI creation when main class is ready
     * The parent element is this.internal.parentDomElement
     */
    onDemandCreateGUI() {
        
        if (this.internal.parentDomElement===null)
            return;
        
        this.internal.parentDomElement.empty();
        
        let basediv=webutil.creatediv({ parent : this.internal.parentDomElement});
        this.internal.domElement=basediv;
        
        let f1 = new dat.GUI({autoPlace: false});
        basediv.append(f1.domElement);

        // Global Properties
        let s1_on_cb=(e) => {
            let ind=this.internal.data.allnames.indexOf(e);
            this.setCurrentGrid(ind);
        };

        this.internal.data.allnames=[];
        for (let i=0;i<this.internal.multigrid.getNumGrids();i++) {
            this.internal.data.allnames.push(this.internal.multigrid.getGrid(i).description);
        }
        
        let sl=f1.add(this.internal.data,'currentname',this.internal.data.allnames).name("Current Grid");
        sl.onChange(s1_on_cb);

        let dp=f1.add(this.internal.data,'showmode',this.internal.data.allshowmodes).name("Grids to Display");
        let dp_on_cb=() => {
            this.showhidemeshes();
            this.updategui(true);
        };
        dp.onChange(dp_on_cb);

        webutil.removedatclose(f1);

        
        // --------------------------------------------
        let ldiv=$("<H4></H4>").css({ 'margin':'15px'});
        basediv.append(ldiv);

        this.internal.landlabelelement=webutil.createlabel( { type : "success",
                                                              name : "Current Electrode Properties",
                                                              parent : ldiv,
                                                            });
        let sbar=webutil.creatediv({ parent: basediv});
        let inlineform=webutil.creatediv({ parent: sbar});
        let elem1=webutil.creatediv({ parent : inlineform,
                                      css : {'margin-top':'20px', 'margin-left':'10px'}});
        
        let elem1_label=$("<span>Electrode: </span>");
        elem1_label.css({'padding':'10px'});
        elem1.append(elem1_label);
        this.internal.currentelectrodeselect=webutil.createselect({parent : elem1,
                                                                   values : [ 'none' ],
                                                                   callback : (e) => {
                                                                       this.selectElectrode(e.target.value,true);
                                                                       this.centerOnElectrode();
                                                                   },
                                                                  });

        this.internal.checkbuttons={};

        let sbar2=webutil.creatediv({ parent: basediv});
        for (let i=0;i<PROPERTIES.length;i++) {
            this.internal.checkbuttons[PROPERTIES[i]]=
                webutil.createcheckbox({
                    name: PROPERTIES[i],
                    type: "info",
                    checked: false,
                    parent: sbar2,
                    css: { 'margin-left': '5px' ,
                           'margin-right': '5px',
                           'width' : '100px'}
                });
        }
            
        
        

        // ----------- Landmark specific stuff

        if (this.internal.gridPropertiesGUI===null) {
            const f2 = new dat.GUI({autoPlace: false});
            console.log('F2=',f2,JSON.stringify(this.internal.data));
            
            console.log('Creating modal');
            let modal=webutil.createmodal("Grid Properties","modal-sm");
            this.internal.gridPropertiesGUI=modal.dialog;
            modal.body.append(f2.domElement);

            
            console.log('Radius=',this.internal.data.radius);
            
            f2.add(this.internal.data, 'radius',0.5,8.0).name("Radius").step(0.5).onChange(() => {
                let grid=this.internal.multigrid.getGrid(this.internal.currentgridindex);
                grid.radius=this.internal.data.radius;
                this.updateMeshes(true);
            });
            
            console.log('Color=',this.internal.data.color);
            
            f2.addColor(this.internal.data, 'color').name("Landmark Color").onChange(()=> {  
                this.updatecolors();
            });
            
            webutil.removedatclose(f2);
            this.internal.folders=[f1, f2];
        } else {
            this.internal.folders[0]=f1;
        }
        // Save self for later
        
        // ---------------
        // rest of gui 
        // ---------------

        let bbar0=webutil.createbuttonbar({ parent: basediv,
                                            css : {'margin-top': '20px','margin-bottom': '10px'}});

        
        let update_cb=() => { this.updateGridProperties();};
        webutil.createbutton({ type : "primary",
                               name : "Display Properties",
                               position : "bottom",
                               tooltip : "Click this to set advanced display properties for this set (color,radius)",
                               parent : bbar0,
                               callback :  update_cb,
                             });

        let load_cb=(f) => { this.loadMultiGrid(f); };
        webfileutil.createFileButton({ type : "warning",
                                       name : "Load",
                                       position : "bottom",
                                       tooltip : "Click this to load points from either a .mgrid or a .bisgrid file",
                                       parent : bbar0,
                                       callback : load_cb,
                                     },{
                                         filename : '',
                                         title    : 'Select file to load current landmark set from',
                                         filters  : [ { name: 'Landmark Files', extensions: ['bisgrid','land' ]}],
                                         save : false,
                                         suffix : ".bisgrid,.mgrid",
                                     });

        let save_cb=(f) => {
            f=f || 'landmarks.bisgrid';
            console.log('f=',f);
            let suffix=f.split(".").pop();
            if (suffix==="land")
                return this.exportMultiGrid(f);
            else
                return this.saveMultiGrid(f);
        };


        
        webfileutil.createFileButton({ type : "primary",
                                       name : "Save",
                                       position : "bottom",
                                       tooltip : "Click this to save points to a .bisgrid or .mgrid file",
                                       parent : bbar0,
                                       callback : save_cb,
                                     },
                                     {
                                         filename : '',
                                         title    : 'Select file to load current landmark set from',
                                         filters  : [ { name: 'Landmark Files', extensions: ['bisgrid','land' ]}],
                                         save : true,
                                         suffix : ".bisgrid,.mgrid",
                                         initialCallback : () => { return this.getInitialSaveFilename(); },
                                     });

        
        webutil.createbutton({ type : "info",
                               name : "Multisnapshot (Current Grid)",
                               parent : bbar0,
                               css : {
                                   'margin-top': '20px',
                                   'margin-left': '10px'
                               },
                               callback : () => { this.multisnapshot(false).catch( (e) => { console.log(e);});}
                             });

        webutil.createbutton({ type : "danger",
                               name : "Multisnapshot (All Grids)",
                               parent : bbar0,
                               css : {
                                   'margin-top': '20px',
                                   'margin-left': '10px'
                               },
                               callback : () => { this.multisnapshot(true).catch( (e) => { console.log(e);});}
                             });

        
        webutil.tooltip(this.internal.parentDomElement);
        
        // ----------------------------------------
        // Now create modal
        // ----------------------------------------

        

    }
    

    /** initialize (or reinitialize landmark control). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.)
     * @param {BisWebSubViewer[]} subviewers - subviewers to place info in
     * @param {BisImage} volume - new image
     */
    connectedCallback() {
        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        this.internal.orthoviewer=document.querySelector(viewerid);
        this.internal.orthoviewer.addMouseObserver(this);
        
        let layoutcontroller=document.querySelector(layoutid);
        this.panel=new BisWebPanel(layoutcontroller,
                                    {  name  : 'Electrode Grid Tool',
                                       permanent : true,
                                       width : '290',
                                       dual : false,
                                    });
        this.internal.parentDomElement=this.panel.getWidget();
        let basediv=$("<div>This will appear once an image is loaded.</div>");
        this.internal.parentDomElement.append(basediv);
        this.panel.show();
    }

    show() {
        this.panel.show();
    }

    
    /** Called by OrthoViewer */
    initialize(subviewers,volume,samesize=false) {

        if (samesize===false) {

            
            if (this.internal.multigrid===null) {
                this.internal.multigrid=new BisWebElectrodeMultiGrid();
            }
            
            this.internal.currentgridindex=0;
            this.internal.intialized=true;

            
            this.internal.mesh=new Array(MAXGRIDS);
            this.internal.meshcustomvisible=new Array(MAXGRIDS);
            this.internal.meshvisible=new Array(MAXGRIDS);
            
            this.internal.data.allnames=new Array(MAXGRIDS);
            
            for (let j=0;j<MAXGRIDS;j++) {
                this.internal.mesh[j]=null;
                this.internal.meshcustomvisible[j]=true;
                this.internal.meshvisible[j]=(j===0);
                this.internal.data.allnames[j]="Grid "+(j+1);
            }
            this.internal.data.currentname=this.internal.data.allnames[0];
            this.internal.subviewers= subviewers;
            if (subviewers) {
                if (subviewers.length>4) {
                    this.internal.subviewers=[ subviewers[0],subviewers[1], subviewers[2], subviewers[3] ];
                }
            }
            this.internal.volume=volume;

        }
        
        this.updateMeshes(false);
        this.updatecolors();
        this.onDemandCreateGUI();
        this.updategui();
        
    }

    /** receive mousecoordinates and act appropriately!
     * (This implements a function from the {@link BisMouseObserver} interface.)
     * @param {array} mm - [ x,y,z ] array with current point
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     * @param {number} mousestate - 0=click 1=move 2=release
     */
    updatemousecoordinates() {

        // NOthing to do here for now
        return;
    }


    /** Store State in to an Object
     * @returns{Object} -- state dictionary
     */
    getElementState() {

        
        let obj = { };
        obj.data = this.internal.data;
        obj.currentelectrode= this.internal.currentelectrode;
        obj.currentset=this.internal.currentgridindex;
        console.log(JSON.stringify(obj,null,1), this.internal.currentgridindex);
        obj.multigrid=this.internal.multigrid.serializeToDictionary();
        obj.isopen=this.panel.isOpen();
        return obj;
    }

    /** Get State from Object
     * @param{Object} dt -- state dictionary
     */
    setElementState(dt) {
        if (!dt)
            return;

        let multigrid=dt.sets || null;
        if (multigrid) {
            this.internal.multigrid.parseFromDictionary(multigrid);
        }
        this.updateMeshes();
        this.internal.data.showmode=dt.data.showmode;
        this.showhidemeshes();
        
        this.setCurrentGrid(dt.currentset || 0);
        this.selectElectrode(dt.currentelectrode);
        if (dt.isopen) {
            this.panel.show();
        } else {
            this.panel.hide();
        }
        this.enablemouse(false);
    }

    
    async multisnapshot(allgrids=false) {
        
        if (this.internal.multigrid.getNumGrids()===0) {
            console.log('No Grids');
            return Promise.reject('None');
        }

        let begin=0;
        let end=this.internal.multigrid.getNumGrids()-1;
        if (!allgrids) {
            begin=this.internal.currentgridindex;
            end=this.internal.currentgridindex;
        }

        let snapshotElement=this.internal.orthoviewer.getSnapShotController();
        snapshotElement.data.dowhite=false;
        const canvaslist=[];
        const names=[];
        let text='Grid,Electrode,I,J,J,X,Y,Z\n';
        const spa=this.internal.volume.getSpacing();
        
        let addzeros=( (num) => {
            let s=`${num}`;
            while (s.length<3) {
                s=`0${s}`;
            }
            return s;
        });

        console.log('Beginning',begin,end,text);
        
        for (let gridindex=begin;gridindex<=end;gridindex++) {
            this.setCurrentGrid(gridindex);
            let grid=this.internal.multigrid.getGrid(gridindex);
            console.log(JSON.stringify(grid));
            let numelectrodes=grid.electrodes.length;
            if (numelectrodes>0) {
                console.log('Num Electrodes for grid',gridindex,'=',numelectrodes);

                for (let i=0;i<numelectrodes;i++) {
                    let electrode=this.internal.multigrid.getElectrode(gridindex,i);
                    let mm = electrode.position;
                    let ijk=[0,0,0];
                    for (let ia=0;ia<=2;ia++) {
                        ijk[ia]=Math.round(mm[ia]/spa[ia]);
                    }
                    this.internal.orthoviewer.updatemousecoordinates(mm,-1,0);
                    let canvas=await snapshotElement.getTestImage();
                    let number=addzeros(`${i+1}`);
                    let name=`${grid.description}:${number}`;
                    text+=`${grid.description},${i+1},${ijk[0]},${ijk[1]},${ijk[2]},${mm[0]},${mm[1]},${mm[2]}\n`;
                    names.push(name);
                    let context=canvas.getContext("2d");

                    
                    context.font='48px Arial';
                    context.fillStyle = "#ffffff";
                    context.textAlign="left";
                    context.textBaseline="bottom";

                    let h=context.measureText(name).width;
                    let w=context.measureText(name).height;

                    context.clearRect(0,canvas.height-(5+h),w+10,h+10);
                    context.fillText(name,5,canvas.height-5);
                    canvaslist.push(canvas);
                }
            }
        }

        const zip = new JSZip();
        zip.file("00LOGFILE.csv", text);
        
        for (let i=0;i<canvaslist.length;i++) {
            let outimg=canvaslist[i].toDataURL("image/png");
            let blob = bisgenericio.dataURLToBlob(outimg);
            zip.file(names[i]+".png", blob, {base64: true});
        }
        try {
            let content=await zip.generateAsync({type:"blob"});
            console.log(content);
            filesaver(content, "snapshots.zip");
            return Promise.resolve('Done');
        } catch (e)  {
            console.log('Error'+e);
        }
        return Promise.reject('Failed to make zip');
    }
}

webutil.defineElement('bisweb-electrodegridcontrolelement', ElectrodeGridElement);
export default ElectrodeGridElement;

