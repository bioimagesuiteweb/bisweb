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

const THREE = require('three');
const util=require('bis_util');
const bisCrossHair=require('bis_3dcrosshairgeometry');
const LandmarkSet=require('bis_landmarks');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');
const $=require('jquery');
const bootbox=require('bootbox');
const webfileutil = require('bis_webfileutil');
const inobounce=require('inobounce.js');
const BisWebPanel = require('bisweb_panel.js');
const dat = require('bisweb_datgui');


var loaderror = function(msg) {
    console.log(msg);
    webutil.createAlert(msg,true);
};

var MAXSETS=5;
// -------------------------------------------------------------------------

/** 
 * A web element to create and manage a GUI for a Landmark Control
 * that draws landmarks in an {@link OrthogonalViewer} viewer.
 *  The GUI for this appears inside a {@link ViewerLayoutElement}.
 *
 *
 *
 * @example
 *  <bisweb-landmarkcontrolelement
 *      bis-layoutwidgetid="#viewer_layout"
 *      bis-viewerid="#viewer">
 *  </bisweb-landmarkcontrolelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class LandmarkControlElement extends HTMLElement {


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
            landmarkset : null,
            currentsetindex  : 0,
            currentpoint : 0,
            mesh : [] ,
            meshcustomvisible : [] ,
            meshvisible : [] ,
            pickmode : false,
            pickbutton : null,
            
            // cursor meshes
            cursormesh : null,
            
            // gui stuff
            landlabelelement : null,
            enableelement : null,
            folders : null,
            landmarkpropertiesgui : null,
            currentpointselect : null,
            data : {
                showmode : "Current",
                allshowmodes : [ "Current", "All", "None", "Custom" ],
                customshow : true,
                enabled : false,
                size : 2.0,
                currentname : "No Point Sets in Memory",
                allnames : "No Point Sets in Memory",
                description : "",
                currentpoint : 0,
                color : "#ff0000",
                dummy : false,
            },
            mousestate : -2,
        };

        this.panel=null;

    }

    // -------------------------------------------------------------------------
    // Cleanup display elements
    // -------------------------------------------------------------------------

    /** Clean up meshes currently displayed
     * @param {boolean} docursor - (default false). If true delete cursor meshes also
     * @param {boolean} currentonly - (default false). If true delete only current landmark mesh (for all viewers) instead of all.
     */
    cleanupdisplayelements(docursor=false,currentonly=false) {

        if (this.internal.subviewers===null || this.internal.mesh===null)
            return;
        
        var i=0;
        for (var st=0;st<this.internal.landmarkset.length;st++) {
            if ( (currentonly===false || st === this.internal.currentsetindex) &&
                 (this.internal.mesh[st]!==null)) {
                for ( i=0;i<this.internal.subviewers.length;i++)  {
                    if (this.internal.subviewers[i]!==null && this.internal.mesh[st][i]!==null) {
                        this.internal.mesh[st][i].visible=false;
                        this.internal.subviewers[i].scene.remove(this.internal.mesh[st][i]);
                        this.internal.mesh[st][i]=null;
                    }
                }
                this.internal.mesh[st]=null;
            }
        }
        
        if (docursor) {
            for (i=0;i<this.internal.subviewers.length;i++)  {
                if (this.internal.cursormesh[i]!==null) {
                    if (this.internal.subviewers[i]!==null) 
                        this.internal.subviewers[i].scene.remove(this.internal.cusormesh[i]);
                    this.internal.cursormesh[i].visible=false;
                    this.internal.cursormesh[i]=null;
                }
            }
            this.internal.cursormesh=null;
        }
    }

    // -------------------------------------------------------------------------
    // Create basic geometries of cursor and landmarksets 
    // -------------------------------------------------------------------------
    /** create landmarkset geometries -- calls code in {@link Bis_3dCrosshairGeometry}
     * @param {array} points - array of positions [ x1,y1,z1,x2,y2,z2 , ..  ] 
     * @param {number} pointsize - size of point
     * @param {boolean} smallsphere - (default false). If true make sphere small.
     * @returns {THREEJS-BufferGeometry} out
     */
    createlandmarksetgeometry(points,pointsize,smallsphere) {
        if (points.length<1)
            return null;

        smallsphere= smallsphere || false;

        var sz=this.internal.volume.getImageSize();
        var spa=this.internal.volume.getSpacing();
        var length= sz[0] * 0.02*pointsize;
        var thickness=spa[0]*0.5;
        var radius=0.5*length;
        if (smallsphere)
            radius=0.5*spa[0];
        
        var core=bisCrossHair.createcore(length,thickness,true,radius);
        var geometry=bisCrossHair.createcopies(core,points);
        return geometry;
    }

    /** create a mesh for the cursor. Stores this.internally. */
    createcursormesh() {
        
        var sz=this.internal.volume.getImageSize();
        var spa=this.internal.volume.getSpacing();
        var wd= sz[0] * 0.1;
        var thk=spa[0]*0.8;
        var core=bisCrossHair.createcore(wd,thk,true,wd*0.2);
        var cursorgeom=new THREE.BufferGeometry();
        cursorgeom.setIndex(new THREE.BufferAttribute( core.indices, 1 ) );
        cursorgeom.addAttribute( 'position', new THREE.BufferAttribute( core.vertices, 3 ) );

        this.internal.cursormesh=new Array(this.internal.subviewers.length);
        //          var gmat=new THREE.MeshBasicMaterial( {color: "#ffffff", wireframe:true});
        var gmat=new THREE.MeshPhongMaterial( {
            wireframe : true,
            color: 0xffffff, 
            specular: 0xffffff,
            shininess: 100
        } );

        for (var i=0;i<this.internal.subviewers.length;i++) {
            this.internal.cursormesh[i]=new THREE.Mesh(cursorgeom, gmat);
            this.internal.cursormesh[i].visible=false;
            this.internal.subviewers[i].scene.add(this.internal.cursormesh[i]);
        }
    }

    /** create a mesh for landmark set of index=index. Stores this.internally
     * @param {number} index - index of landmark set to use
     */
    createlandmarkmesh( index ) {

        // DO NOT CALL THIS DIRECTLY
        var st= util.range(index||0,0,this.internal.landmarkset.length-1);
        var pset=this.internal.landmarkset[st];
        if (pset.getnumpoints()<1) {
            if (this.internal.mesh[st]!==null) {
                this.internal.mesh[st].forEach(function(e) {
                    if (e!==null)
                        e.visible=false;
                });
            }
            return;
        }
        
        this.internal.mesh[st]=new Array(this.internal.subviewers.length);
        var geometry=this.createlandmarksetgeometry(pset.points,pset.size,true);
        var geometry2=this.createlandmarksetgeometry(pset.points,pset.size,false);
        var mat=new THREE.MeshBasicMaterial( {color: pset.color, wireframe:true});
        var mat2=new THREE.MeshBasicMaterial( {color: pset.color , wireframe:false});
        
        for (var i=0;i<this.internal.subviewers.length;i++) {
            
            if (i===this.internal.subviewers.length-1)
                this.internal.mesh[st][i]=new THREE.Mesh(geometry2,mat2);
            else
                this.internal.mesh[st][i]=new THREE.Mesh(geometry,mat);
            
            this.internal.mesh[st][i].visible=false;
            this.internal.subviewers[i].scene.add(this.internal.mesh[st][i]);
        }
        return;
    }
    
    // -------------------------------------------------------------------------
    // Display updates -- colors
    // -------------------------------------------------------------------------
    /** update colors for display based on GUI edits
     */
    updatecolors() {

        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        pset.color=this.internal.data.color;
        var colorValue=pset.color.replace( '#','0x' );
        
        var mesh=this.internal.mesh[this.internal.currentsetindex];
        if (mesh!==null) {
            mesh.forEach(function(e) {
                e.material.color.setHex(colorValue);
            });
        }

        if (this.internal.cursormesh!==null) {
            this.internal.cursormesh.forEach(function(e) {
                e.material.color.setHex(colorValue);
            });
        }
        
    }

    /** shows modal dialog to update landmark display properties
     */
    updatelandmarkproperties() {
        this.internal.landmarkpropertiesgui.modal('show');
        return false;
    }
    
    /** updates display of elements based on changes from GUI/user
     * @param {boolean} currentonly - if ture only update for current landmark set (default =false)
     */
    updatedisplay(currentonly) {

        if (this.internal.meshvisible[this.internal.currentsetindex]===false)
            return;
        
        currentonly=currentonly || false;
        this.cleanupdisplayelements(false,currentonly);

        if (this.internal.subviewers===null)
            return;
        
        // First do cursor
        if (this.internal.cursormesh===null) 
            this.createcursormesh();
        
        var numsets= this.internal.mesh.length;
        for (var st=0;st<numsets;st++) {
            if (currentonly===false || st === this.internal.currentsetindex ) {
                this.createlandmarkmesh(st);
            }            
        }

        const self=this;
        let fn2=function() { self.showhidemeshes(); };
        
        setTimeout(fn2,2);
        if (!this.internal.pickmode)
            this.updatelandmarkselector();
    }

    // -------------------------------
    // update gui once changes are made
    // -------------------------------
    /** updates gui based on this.internal changes
     * @param {boolean} nocurrentname - if false (default) also updates the name of the current landmark.
     */
    updategui(nocurrentname=false) {
        
        // Set values of this.internal.data
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        this.internal.data.color=pset.color;
        this.internal.data.size= pset.size;
        this.internal.data.customshow=this.internal.meshcustomvisible[this.internal.currentsetindex];
        this.internal.data.description='np:'+pset.getnumpoints()+" : "+pset.filename;
        this.internal.data.fixeddescription=this.internal.data.description;

        if (!nocurrentname) {
            this.internal.data.currentname=this.internal.data.allnames[this.internal.currentsetindex];
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

    // -------------------------------
    // gui callbacks
    // -------------------------------
    /** checks if the currently selected landmark is valid (exists, is within range etc.)
     * @return {boolean} 
     */
    isvalidlandmarkselected() {
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var np=pset.getnumpoints();
        var ind=this.internal.currentpoint;
        if (ind<0 || ind>=np)
            return false;
        return true;
    }
    
    /** GUI callback. Select landmark event (button press)
     * @param {number} e - landmark index
     * @param {boolean} noupd - if true no update of select element (callback is coming from it so avoid loop).
     */
    selectlandmark(e,noupd) {

        noupd=noupd || false;
        
        if (this.internal.currentpointselect===null)
            return;
        
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var np=pset.getnumpoints();
        
        
        if (np>0 && e===-1) 
            this.internal.currentpoint=np-1;
        else 
            this.internal.currentpoint=util.range(e,0,np-1);

        if (!noupd)
            this.internal.currentpointselect.val(this.internal.currentpoint);
        
        this.picklandmark(false);
        
    }

    /** Updates landmark select element from this.internal code changes (e.g. loading of new set etc.) */
    updatelandmarkselector() {
        if (this.internal.currentpointselect===null)
            return;

        
        this.internal.currentpointselect.empty();
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var np=pset.getnumpoints();
        if (np===0) {
            var a=("<option value=\"-1\">None</option>");
            this.internal.currentpointselect.append($(a));
            return;
        }
        for (var i=0;i<np;i++) {
            var name=pset.names[i]+"."+(i+1);
            var b="<option value=\""+i+"\">"+name+"</option>";
            this.internal.currentpointselect.append($(b));
        }
        if (this.internal.currentpoint>=0 &&
            this.internal.currentpoint<np) {
            this.internal.currentpointselect.val(this.internal.currentpoint);
        }
    }

    /** Select or release current landmark
     * @parameter {boolean} dopick - if true select else release.
     */
    picklandmark(dopick) {

        if (dopick===false) {
            this.setcursor([0,0,0],false);
            this.internal.pickmode=false;
            this.internal.pickbutton.prop('textContent','Pick');
            this.internal.pickbutton.removeClass("btn-info");
            this.internal.pickbutton.addClass("btn-danger");
            return;
        }

        if (this.isvalidlandmarkselected()===false)
            return;

        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var ind=this.internal.currentpoint;
        var mm = pset.points[ind];

        if (this.internal.data.enabled===true) {
            this.setcursor(mm,true);
            this.internal.pickmode=true;
            this.internal.pickbutton.prop('textContent','Release');
            this.internal.pickbutton.removeClass("btn-danger");
            this.internal.pickbutton.addClass("btn-info");
        }
        this.internal.orthoviewer.updatemousecoordinates(mm,-1,0);
    }


    /** UNDO (GUI) */
    undolast() {

        this.picklandmark(false);
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var ok=pset.undo();
        if (ok)  {
            this.updatedisplay(true);
            this.updatelandmarkselector();
        }
        return false;
    }

    /** REDO (GUI) */
    redolast() {

        this.picklandmark(false);
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var ok=pset.redo();
        if (ok)  {
            this.updatedisplay(true);
            this.updatelandmarkselector();
        }
        return false;
    }

    /** Rename Current landmark -- pops up a dialog to ask user for a new name */
    renamecurrentlandmark() {
        if (this.isvalidlandmarkselected()===false)
            return false;
        
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var ind=this.internal.currentpoint;
        var name=pset.names[ind];

        const self=this;
        var fn=function(result) {
            if (result !== null) {
                pset.renamepoint(ind,result);
                self.updatelandmarkselector();
            }
        };
        bootbox.prompt({
            title: "Enter new name for landmark",
            value: name,
            callback: fn,
        });
        return false;
    }
    
    /** Delete Current landmark -- no dialog as undo can fix this */
    deletecurrentlandmark() {
        
        if (this.isvalidlandmarkselected()===false)
            return false;
        
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var ind=this.internal.currentpoint;
        pset.deletepoint(ind);
        this.updatedisplay(true);
        this.picklandmark(false);
        this.internal.currentpoint=this.internal.landmarkset[this.internal.currentsetindex].getnumpoints()-1;
        this.updatelandmarkselector();
        return false;
    }
    
    
    // ------------------------------------------------------------------------
    // GUI Options for whole set
    // ------------------------------------------------------------------------

    getInitialSaveFilename() {
        return this.internal.landmarkset[this.internal.currentsetindex].filename;
    }
    
    /** Export landmarks to a .land file.  */
    exportlandmarks(fobj) {
        this.picklandmark(false);
        var outstring=this.internal.landmarkset[this.internal.currentsetindex].legacyserialize();

        let fname=bisgenericio.getFixedSaveFileName(fobj,this.internal.landmarkset[this.internal.currentsetindex].filename);
        let index=fname.lastIndexOf('.');
        let newname=fname.substr(0,index-1)+".land";
        bisgenericio.write(newname,outstring);
        return false;
    }

    
    /** Save landmarks to a .ljson file. */
    savelandmarks(fobj) {
        // rework this!!!
        // webutil.createAlert('Landmarks loaded from ' +filename+' numpoints='+pset.getnumpoints());
        
        this.picklandmark(false);
        var a=this.internal.landmarkset[this.internal.currentsetindex].serialize();
        fobj=bisgenericio.getFixedSaveFileName(fobj,this.internal.landmarkset[this.internal.currentsetindex].filename);
        bisgenericio.write(fobj,a);
        return false;
    }

    /** delete all points -- pops up dialog first to make sure. No undo possible. */
    clearallpoints() {

        const self=this;
        var fn=function(result) {
            if (result===true) {
                var pset=self.internal.landmarkset[self.internal.currentsetindex];
                pset.clear();
                self.updatedisplay(true);
                self.picklandmark(false);
            }
        };
        
        this.picklandmark(false);
        bootbox.confirm("Are you sure you want to delete all points?", fn);
        return false;
    }

    /** Load landmarks. Called from input=File element 
     * @param {string} filename - filename
     */
    loadlandmarks(filename) {

        const self=this;

        bisgenericio.read(filename).then( (obj) => {
            let pset=this.internal.landmarkset[this.internal.currentsetindex];
            var ok=pset.deserialize(obj.data,obj.filename,loaderror);
            if (ok) {
                pset.filename=obj.filename;
                self.updatedisplay(true);
                self.updategui();
                self.picklandmark(false);
                webutil.createAlert('Landmarks loaded from' +pset.filename+' numpoints='+pset.getnumpoints());
            }
        }).catch( (e) => { loaderror(e) ; });
        return false;
    }

    /** Set Current landmark set.
     * @param {number} ind - index of set to use as current
     */
    setcurrentset(ind) {
        
        ind=util.range(ind||0,0,MAXSETS-1);
        if (ind==this.internal.currentsetindex)
            return;
        
        //          this.internal.data.enabled=false;
        this.internal.currentsetindex=ind;
        
        // No carryover pick
        this.picklandmark(false);
        this.showhidemeshes(true);
        this.updategui();
        this.internal.currentpoint=this.internal.landmarkset[this.internal.currentsetindex].getnumpoints()-1;
        this.updatelandmarkselector();
    }
    
    /** Sets the visibility of the various meshes depending on GUI state */
    showhidemeshes() {

        for (var st=0;st<this.internal.mesh.length;st++) {

            var doshow=this.internal.meshcustomvisible[st];
            if (this.internal.data.showmode === "All" )  {
                doshow=true;
            } else if (this.internal.data.showmode === "None" ) {
                doshow=false;
            } else if (this.internal.data.showmode === "Current") {
                if (st===this.internal.currentsetindex)
                    doshow=true;
                else
                    doshow=false;
            }
            
            this.internal.meshvisible[st]=doshow;
            
            if (this.internal.mesh[st]!==null) {
                for (var si=0;si<this.internal.mesh[st].length;si++) {
                    if (this.internal.mesh[st][si]!==null) {
                        this.internal.mesh[st][si].visible=doshow;
                    }
                }
            }
        }
        
        if (this.internal.meshvisible[this.internal.currentsetindex]===false)  {
            this.enablemouse(false);
        }
        
    }

    /** enable or disable mouse input to this control. Also change background color to show if live!
     * @param {boolean} mode - if true enable else disable
     */
    enablemouse(mode) {
        this.internal.data.enabled=mode;

        if (this.internal.data.enabled===true) {
            this.updatecolors();
            this.panel.makeActive(true);
            this.internal.landlabelelement.removeClass('label-success');
            this.internal.landlabelelement.addClass('label-danger');
            inobounce.enable();
        } else {
            this.panel.makeActive(false);
            this.internal.landlabelelement.removeClass('label-danger');
            this.internal.landlabelelement.addClass('label-success');
            this.picklandmark(false);
            inobounce.disable();
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
        var basediv=webutil.creatediv({ parent : this.internal.parentDomElement});
        this.internal.domElement=basediv;
        
        var f1 = new dat.GUI({autoPlace: false});
        basediv.append(f1.domElement);

        const self=this;
        // Global Properties
        let s1_on_cb=function(e) {
            var ind=self.internal.data.allnames.indexOf(e);
            self.setcurrentset(ind);
        };
        
        var sl=f1.add(this.internal.data,'currentname',this.internal.data.allnames).name("CurrentSet");
        sl.onChange(s1_on_cb);

        //        webutil.addtooltip($(sl.domElement.children[0]),
        //                         {  position: "top",
        //                          tooltip : "The landmark tool can edit upto "+MAXSETS+" of sets of landmarks at a time. Pick the current one to manipulate"});
        
        var dp=f1.add(this.internal.data,'showmode',this.internal.data.allshowmodes).name("Sets to Display");
        //        webutil.addtooltip($(dp.domElement.children[0]),
        //                         {  position: "left",
        //                          tooltip : "Display Mode. Current = show current set. Custom: Display sets that have their `advanced' property show enabled. All/None = obvious." });

        let dp_on_cb=function() {
            self.showhidemeshes();
            self.updategui(true);
        };
        dp.onChange(dp_on_cb);

        let f1_on_cb=function() {
            if (self.internal.meshvisible[self.internal.currentsetindex]===false)
                self.internal.data.enabled=false;
            self.enablemouse(self.internal.data.enabled);
        };
        
        var en=f1.add(this.internal.data, 'enabled').name("Enable Mouse");
        en.onChange(f1_on_cb);

        webutil.addtooltip($(en.domElement.children[0]),
                           { position: "top",
                             tooltip : "Clicking in the viewer will either add a new landmark or move the current one (in pick mode)" });
        this.internal.enableelement=en.domElement.children[0];

        webutil.removedatclose(f1);

        
        // --------------------------------------------
        var ldiv=$("<H4></H4>").css({ 'margin':'15px'});
        basediv.append(ldiv);

        this.internal.landlabelelement=webutil.createlabel( { type : "success",
                                                              name : "Current Landmark Options",
                                                              parent : ldiv,
                                                            });
        var sbar=webutil.creatediv({ parent: basediv});
        var inlineform=webutil.creatediv({ parent: sbar});
        var elem1=webutil.creatediv({ parent : inlineform,
                                      css : {'margin-top':'20px', 'margin-left':'10px'}});
        
        var elem1_label=$("<span>Landmark: </span>");
        elem1_label.css({'padding':'10px'});
        elem1.append(elem1_label);
        this.internal.currentpointselect=webutil.createselect({parent : elem1,
                                                               values : [ 'none' ],
                                                               tooltip :
                                                               "Select the current point.",
                                                               callback : function(e) {
                                                                   self.selectlandmark(e.target.value,true);
                                                                   self.picklandmark(true);
                                                               },
                                                              });
        


        this.internal.pickbutton=webutil.createbutton({ type : "danger",
                                                        name : "Pick",
                                                        position : "left",
                                                        tooltip : "Click this to pick the current landmark so that you can reposition it.",
                                                        css : { 'margin-left' : '20px'},
                                                        parent : elem1,
                                                        callback : function() {
                                                            var v=self.internal.pickbutton.prop('textContent');
                                                            var dopick=true;
                                                            if (v!=="Pick") {
                                                                dopick=false;
                                                            }
                                                            self.picklandmark(dopick);
                                                        },
                                                      });
        
        var landmarkbar=webutil.createbuttonbar({ parent :basediv,
                                                  css : {"margin-top":"10px"}});

        let undo_cb=function() { self.undolast(); };
        
        webutil.createbutton({ type : "warning",
                               name : "Undo",
                               position : "right",
                               tooltip : "Click this to undo the last edit operation.",
                               parent : landmarkbar,
                               callback : undo_cb,
                             });

        let redo_cb=function() { self.redolast(); };
        
        webutil.createbutton({ type : "info",
                               name : "Redo",
                               position : "bottom",
                               tooltip : "Click this to redo the last edit operation.",
                               parent : landmarkbar,
                               callback : redo_cb,
                             });
        
        let delete_cb=function() { self.deletecurrentlandmark();};
        webutil.createbutton({ type : "danger",
                               name : "Delete",
                               position : "bottom",
                               tooltip : "Click this to delete the current landmark",
                               parent : landmarkbar,
                               callback : delete_cb,
                             });
        
        let rename_cb=function() { self.renamecurrentlandmark();};
        webutil.createbutton({ type : "primary",
                               name : "Rename",
                               position : "left",
                               tooltip : "Click this to rename the current landmark",
                               parent : landmarkbar,
                               callback : rename_cb,
                             });

        

        
        // ----------- Landmark specific stuff

        var f2 = new dat.GUI({autoPlace: false});
        f2.add(this.internal.data, 'customshow').name("Show in Custom Mode").onChange(function() {
            self.internal.meshcustomvisible[self.internal.currentsetindex]=self.internal.data.customshow;
            self.showhidemeshes();
        });
        
        f2.add(self.internal.data, 'size',0.5,4.0).name("Size").step(0.5).onChange(function() {
            var pset=self.internal.landmarkset[self.internal.currentsetindex];
            pset.size=self.internal.data.size;
            self.updatedisplay();
        });
        
        f2.addColor(self.internal.data, 'color').name("Landmark Color").onChange(function() {  
            self.updatecolors();
        });

        webutil.removedatclose(f2);
        self.internal.folders=[f1, f2];
        // Save self for later

        // ---------------
        // rest of gui 
        // ---------------

        var bbar0=webutil.createbuttonbar({ parent: basediv,
                                            css : {'margin-top': '20px','margin-bottom': '10px'}});
        var bbar1=webutil.createbuttonbar({ parent : basediv});

        let clear_cb=function() { self.clearallpoints();};
        
        webutil.createbutton({ type : "danger",
                               name : "Delete All",
                               position : "right",
                               tooltip : "Click this to delete all landmarks in this set",
                               parent : bbar0,
                               callback : clear_cb,
                             });

        let update_cb=function() { self.updatelandmarkproperties();};
        webutil.createbutton({ type : "primary",
                               name : "Display Properties",
                               position : "bottom",
                               tooltip : "Click this to set advanced display properties for this set (color,size)",
                               parent : bbar0,
                               callback :  update_cb,
                             });

        let load_cb=function(f) { self.loadlandmarks(f); };
        webfileutil.createFileButton({ type : "warning",
                                       name : "Load",
                                       position : "bottom",
                                       tooltip : "Click this to load points from either a .land or a .ljson file",
                                       parent : bbar1,
                                       callback : load_cb,
                                     },{
                                         filename : '',
                                         title    : 'Select file to load current landmark set from',
                                         filters  : [ { name: 'Landmark Files', extensions: ['ljson','land' ]}],
                                         save : false,
                                         suffix : ".ljson,.land",
                                     });

        let save_cb=function(f) {
            f=f || 'landmarks.ljson';
            console.log('f=',f);
            let suffix=f.split(".").pop();
            if (suffix==="land")
                return self.exportlandmarks(f);
            else
                return self.savelandmarks(f);
        };


        
        webfileutil.createFileButton({ type : "primary",
                                       name : "Save",
                                       position : "bottom",
                                       tooltip : "Click this to save points to a .ljson or .land file",
                                       parent : bbar1,
                                       callback : save_cb,
                                     },
                                     {
                                         filename : '',
                                         title    : 'Select file to load current landmark set from',
                                         filters  : [ { name: 'Landmark Files', extensions: ['ljson','land' ]}],
                                         save : true,
                                         suffix : ".ljson,.land",
                                         initialCallback : () => { return self.getInitialSaveFilename(); },
                                     });
        
        webutil.tooltip(this.internal.parentDomElement);
        
        // ----------------------------------------
        // Now create modal
        // ----------------------------------------

        var modal=webutil.createmodal("Landmark Set Properties","modal-sm");
        modal.body.append(f2.domElement);
        this.internal.landmarkpropertiesgui=modal.dialog;

    }
    
    // -------------------------------------------------------------------------
    // Cursor Stuff
    // -------------------------------------------------------------------------
    
    /** set cursor (in response to mouse input or select event)
     * @param {array} mm - [ x,y,z] position of cursor
     * @param {boolean} show - show if true (default=false)
     */
    setcursor(mm,show=false)  {

        if (this.internal.cursormesh===null)
            return;
        this.internal.cursormesh.forEach(function(e) {
            e.position.set(mm[0],mm[1],mm[2]);
            if (e.visible !== show) 
                e.visible=show;
        });
    }
    
    /** update point based on user mouse edits
     */
    updatepoint(mm) {
        
        var pset=this.internal.landmarkset[this.internal.currentsetindex];
        var doselect = false;

        if (!this.internal.pickmode) {
            pset.addpoint(mm);
            doselect=true;
        } else {
            pset.movepoint(this.internal.currentpoint,mm);
        }
        this.updatedisplay(true);
        this.updategui(true);
        if (doselect)
            this.selectlandmark(-1);

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
                                    {  name  : 'Landmark Editor',
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

    
    /** Called by OrthoViewer */
    initialize(subviewers,volume,samesize=false) {

        if (samesize===false) {

            
            if (this.internal.landmarkset===null) {
                this.internal.landmarkset=new Array(MAXSETS);
                for (let i=0;i<MAXSETS;i++) {
                    var cl=util.objectmapcolormap[i+1];
                    this.internal.landmarkset[i]=new LandmarkSet(20);
                    this.internal.landmarkset[i].filename="PointSet"+(i+1)+".ljson";
                    this.internal.landmarkset[i].color=util.rgbToHex(cl[0],cl[1],cl[2]);
                }
            }
            
            this.internal.currentsetindex=0;
            this.internal.intialized=true;
            this.cleanupdisplayelements(true,true);
            
            this.internal.mesh=new Array(MAXSETS);
            this.internal.meshcustomvisible=new Array(MAXSETS);
            this.internal.meshvisible=new Array(MAXSETS);
            
            this.internal.data.allnames=new Array(MAXSETS);
            
            for (let j=0;j<MAXSETS;j++) {
                this.internal.mesh[j]=null;
                this.internal.meshcustomvisible[j]=true;
                this.internal.meshvisible[j]=(j===0);
                this.internal.data.allnames[j]="Point Set "+(j+1);
                
            }
            this.internal.data.currentname=this.internal.data.allnames[0];
            this.internal.subviewers=subviewers;
            this.internal.volume=volume;

        }
        
        this.updatedisplay();
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
    updatemousecoordinates(mm,plane,mousestate) {
        if ( mousestate === undefined || this.internal.landmarkset===null)
            return;
        
        if (this.internal.data.enabled===false)
            return;
        
        if (!this.panel.isOpen())
            return;

        if (mousestate===0) {
            this.setcursor(mm,true); 
        } else if (mousestate===1 || mousestate===-1) {
            this.setcursor(mm,true);
        } else if (mousestate===2) {
            this.updatepoint(mm);
            this.setcursor(mm,false);
            if (this.internal.pickmode)
                this.picklandmark(false);
        }

        if (mousestate!==2) {
            this.internal.mousestate=mousestate;
        }         
    }
}


webutil.defineElement('bisweb-landmarkcontrolelement', LandmarkControlElement);
export default LandmarkControlElement;

