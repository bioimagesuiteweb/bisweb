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
/* global HTMLElement */

/**
 * @file A Broswer module. Contains {@link ColormapControllerElement} and {@link BisF.ColorMapControllerPayload}
 * @author Xenios Papademetris
 * @version 1.0
 */




/** This is a type of function that maps raw image scalars to colors. Used by extensively by the viewers.
 * @typedef BisF.ColorMapControllerPayload
 * @property {BisF.ColorMapperFunction} image - function to map image (underlay/anatomy).
 * @property {BisF.ColorMapperFunction} objectmap - function to map overlay (objectmap/functional image).
 * @property {boolean} interpolate - whether to interpolate image texture or not
 * @property {boolean} objinterpolate - whether to interpolate overlay texture or not (turn off for objectmaps!)
 * @property {object} functionalparams - extra info regarding functional image display
 * @property {Boolean} functionalparams.isfunctional - if true this ia functional image else objectmap
 * @property {String}  functionalparams.colormode - the colormode used to display the overlay
 */

const util=require('bis_util');
const webutil=require('bis_webutil');
const imagealgo=require('bis_imagealgorithms');
const smoothreslice=require('bis_imagesmoothreslice');

// -------------------------------------------------------------------------
// contains colormap controller for viewers
// -------------------------------------------------------------------------

/**
 * A web element that creates a viewers colormap controls (inside a dat.gui)
 * Once linked to a viewer element the viewer calls the creategui method to initialize.
 * Otherwise this is an invisible element. The viewer is linked to this by specifying
 * the id of this element as a property of the viewer
 *
 * @example
 * <bisweb-colormapcontrollerelement id="viewer_cmap"></bisweb-colormapcontrollerelement>
 *
 * later
 *
 * <bisweb-orthogonalviewer
 *     id="viewer"
 *     bis-layoutwidgetid="#viewer_layout"
 *     bis-colormapeditorid="#viewer_cmap">
 * </bisweb-orthogonalviewer>
 *
 * Attributes
 *     None
 */
class ColormapControllerElement extends HTMLElement {

    constructor() {
        super();

        this.internal = {
            plainmode : true,
            funcmodelist : [ "Objectmap","Overlay","Overlay2","Red","Green","Blue","Orange","Gray" ],
            funcoutlist  : [ "Positive", "Negative", "Both" ],
            
            // Image range
            imagerange : null,
            objectmaprange : [ 0,1],
            
            // objectmap and clusterinfo
            objectmap : null,
            clusterinfo : null,
            
            // Flags
            mode  : 'None',
            modenamelist : [ 'Objectmap', 'Overlay', 'Image', 'None' ],
            
            // Function to call to update viewers
            update : null,
            
            // Key controllers (dat.gui)
            minobjectmap : null,
            maxobjectmap : null,
            clusterslider : null,
            interpolatecheck : null,
            folder : [ null, null],
            opacityslider : null,
            overlaymodeselector : null,
            functionalcontrollers : null,
            anatomicalcontrollers : null,                                               
            
            // base dom
            basegui : null,
            
            // clustersize
            maxclustersize : 0,
        };

        // This needs to be here
        this.data={
            interpolate : true,
            autocontrast : true
        };
    }


    /**
     * inObjectmapMode 
     * @returns {Boolean} - true if this.internal.mode === "Objectmap"
     */
    inObjectmapMode() {
        return ( this.internal.mode.toLowerCase() === "objectmap");
    }
    
    /**
     * @returns {Boolean} - true if this.data.func.mode === "Overlay" or "Overlay2"
     */
    inFunctionalOverlayMode() {
        let a=this.data.funcmode.toLowerCase();
        return ( a==="overlay" || a==="overlay2");
    }

    /**
     * @returns {Boolean} - true if single frame
     */
    showClusterControls() {

        if (!this.inFunctionalOverlayMode())
            return false;
        
        if (!this.internal.objectmap)
            return false;

        let dim=this.internal.objectmap.getDimensions();
        if (dim[3]*dim[4]>1) {
            return false;
        }
        
        return true;
    }


    /**
     * sets the image and function to call 
     * @param {BisImage} volume -  image to manage
     * @param {function} callback - function to call (on viewer) to update it
     * @param {number} opacity = 0.8 - the initial opacity
     */

    setimage(volume,updatefunction,defaultopacity=0.8) {

        this.internal.volume=null;
        
        // Need something here to remove the gui ...
        /*          this.internal.folder[0];
                    this.internal.folder[1];*/
        // Right now this happens on the viewer end
        // this.internal.layoutcontroller.getcorecontrols().empty();
        
        this.data.opacity=defaultopacity;
        this.data.minintensity=0;
        this.data.maxintensity=255;
        this.data.funcmode="Objectmap";
        this.data.outmode="Both";
        this.data.minth=1.0;
        this.data.maxth=100.0;
        this.data.clustersize=0;

        this.olddata={};
        Object.keys(this.data).forEach((key) => {
            this.olddata[key]=this.data[key];
        });


        // Reset values
        this.internal.imagerange=null;
        this.internal.objectmaprange=[ 0,1];
        
        // objectmap and clusterinfo
        this.internal.objectmap=null;
        this.internal.clusterinfo=null;
        
        // Flags
        this.internal.mode='None';

        
        // Key controllers (dat.gui)
        this.internal.minobjectmap=null;
        this.internal.maxobjectmap=null;
        this.internal.clusterslider=null;
        this.internal.interpolatecheck=null;
        this.internal.functionalcontrollers=null;
        this.internal.maxclustersize= 0;

        
        this.internal.update=updatefunction;
        this.internal.imagerange=volume.getIntensityRange();
        if (this.internal.imagerange[1]-this.internal.imagerange[0]>64)
            this.data.minintensity=this.internal.imagerange[0]+1;
        else
            this.data.minintensity=this.internal.imagerange[0];

        this.internal.robustrange=smoothreslice.arrayRobustRange(volume.getImageData(),0.01,0.99);
        let dr=this.internal.robustrange[1]-this.internal.robustrange[0];
        let da=this.internal.imagerange[1]-this.internal.imagerange[0];

        if (dr<0.25*da) {
            this.data.autocontrast=false;
            this.internal.robustrange=this.internal.imagerange;
        }
        this.setAutoContrast(false);
    }


    setAutoContrast(update=true) {
        
        if (this.data.autocontrast) {
            this.data.maxintensity=this.internal.robustrange[1];
        } else {
            this.data.maxintensity=this.internal.imagerange[1];
        }
        
        if (update) {
            if (this.internal.anatomicalcontrollers) {
                this.internal.anatomicalcontrollers[1].updateDisplay();
            }
        }
    }
    
    // --------- --------- --------- --------- --------- --------- ---------
    // Update clients (i.e. viewers and synced cmap controllers)
    // --------- --------- --------- --------- --------- --------- ---------
    
    /** Update all clients -- call the callback function that was set at construction of
     * @param {BisF.ColorMapControllerPayload} output - data to send to update function
     */
    updateClients(output) {
        if (this.internal.update!==null)
            this.internal.update(output);
    }
    
    // --------- --------- --------- --------- --------- --------- ---------
    // First anatomy
    // --------- --------- --------- --------- --------- --------- ---------
    
    /** Update anatomical function component (part of this.internal update)
     * @param {boolean} force - if true force update
     * @param {BisF.ColorMapControllerPayload} output - data to send to update function
     */
    updateAnatomicalMappingFunction(force,output) {
        if (this.data.minintensity!=this.olddata.minintensity || 
            this.data.maxintensity!=this.olddata.maxintensity ||
            force===true)  {
            this.olddata.maxintensity = this.data.minintensity;
            this.olddata.minintensity = this.data.maxintensity;

            let opacity=255;
            if (this.internal.objectmap!==null)
                opacity=240;
            
            output.image=util.mapstepcolormapfactory(this.data.minintensity,
                                                     this.data.maxintensity,
                                                     opacity);
        }
    }
    
    
    /** Update functional function component of output if overlay is objectmap (part of this.internal update)
     * @param {boolean} force - if true force update
     * @param {BisF.ColorMapControllerPayload} output - data to send to update function
     */
    updateWhenObjectmap(force,output) {

        this.internal.clusterinfo=null;
        if (this.data.opacity!=this.olddata.opacity || this.data.funcmode !== this.olddata.funcmode || force===true) {
            this.olddata.opacity=this.data.opacity;
            this.olddata.funcmode=this.data.funcmode;
            output.objectmap=util.mapobjectmapfactory(255*this.data.opacity);
            output.functionalparams = { isfunctional : false ,
                                        colormode     : 'Objectmap'
                                      };
        }
    }
    
    /** Update functional function component of output for overlays (part of this.internal update)
     * @param {boolean} force - if true force update
     * @param {BisF.ColorMapControllerPayload} output - data to send to update function
     */


    /** Update functional function component of output for overlays (part of this.internal update)
     * @param {boolean} force - if true force update
     * @param {BisF.ColorMapControllerPayload} output - data to send to update function
     */
    updateWhenNotObject(force,output) {

        let sumlthr=Math.abs(this.data.minth-this.olddata.minth);
        let sumuthr=Math.abs(this.data.maxth-this.olddata.maxth);
        let sumopa=Math.abs(this.data.opacity-this.olddata.opacity);
        let sumclu=0;
        if (this.showClusterControls()) 
            sumclu=Math.abs(this.data.clustersize-this.olddata.clustersize);

        let sum=sumlthr+sumuthr+sumopa+sumclu;
        
        
        if (!(sum>0.01 || this.data.funcmode !==this.olddata.funcmode || this.data.outmode !==this.olddata.outmode || force===true)) {
            return;
        }
        this.olddata.minth = this.data.minth;
        this.olddata.maxth = this.data.maxth;
        this.olddata.funcmode=this.data.funcmode;
        this.olddata.outmode= this.data.outmode;
        this.olddata.opacity=this.data.opacity;
        if (this.showClusterControls()) 
            this.olddata.clustersize=this.data.clustersize;
        let opa=Math.round(Math.sqrt(this.data.opacity)*255);
        
        if (this.data.funcmode=="Red" || this.data.funcmode=="Blue" || this.data.funcmode=="Green" ||
            this.data.funcmode=="Orange" || this.data.funcmode=="Gray"
            
           ) {
            this.internal.clusterinfo=null;
            let mode=1;
            if (this.data.funcmode==="Green")
                mode=2;
            else if (this.data.funcmode==="Blue")
                mode=4;
            else if (this.data.funcmode==="Orange")
                mode=3;
            else if (this.data.funcmode==="Gray")
                mode=7;

            output.objectmap=util.mapstepcolormapfactory(this.data.minth,this.data.maxth,opa,mode);
            output.functionalparams = { minth : this.data.minth,
                                        maxth : this.data.maxth,
                                        isfunctional : false,
                                        colormode     : this.data.funcmode,
                                        overlay  : false,
                                        clustersize : 0 };
        } else {
            let usef4=false;
            if (this.data.funcmode==="Overlay2") 
                usef4=true;
            let cmode=3;
            if (this.data.outmode=="Positive")
                cmode=1;
            if (this.data.outmode=="Negative")
                cmode=2;


            
            if (this.data.clustersize<1) {
                output.objectmap=util.mapoverlayfactory(this.data.minth,this.data.maxth,opa,cmode,usef4);

                output.functionalparams = { minth : this.data.minth,
                                            maxth : this.data.maxth,
                                            isfunctional : true,
                                            overlay  : true,
                                            cmode :    cmode,
                                            colormode     : this.data.funcmode,
                                            clustersize : 0 };

                this.internal.clusterinfo=null;
            } else {
                if (sumlthr >0 ) {
                    this.internal.clusterinfo=null;
                } else if (this.internal.clusterinfo!==null) {
                    if (this.data.clustersize>this.internal.maxclustersize) {
                        this.data.clustersize=this.internal.maxclustersize;
                        this.olddata.clustersize=this.internal.maxclustersize;
                        this.internal.clusterslider.updateDisplay();
                    }
                    this.internal.clusterinfo.maskarray=imagealgo.clusterFilter(this.internal.objectmap,this.internal.clusterinfo.data,this.data.clustersize).getImageData();
                }
                
                if (this.internal.clusterinfo===null) {
                    this.internal.clusterinfo = { };
                    this.internal.clusterinfo.data=imagealgo.createClusterNumberImage(this.internal.objectmap,this.data.minth,false);
                    this.internal.maxclustersize=this.internal.clusterinfo.data.maxsize;
                    if (this.data.clustersize>this.internal.maxclustersize) {
                        this.data.clustersize=this.internal.maxclustersize;
                        this.olddata.clustersize=this.internal.maxclustersize;
                    }
                    this.internal.clusterslider.max(this.internal.maxclustersize);
                    this.internal.clusterslider.updateDisplay();
                    this.internal.clusterinfo.maskarray=imagealgo.clusterFilter(this.internal.objectmap,
                                                                                this.internal.clusterinfo.
                                                                                data,this.data.clustersize).getImageData();
                }
                
                output.objectmap=util.mapoverlayfactory(this.data.minth,this.data.maxth,opa,cmode,usef4,this.internal.clusterinfo.maskarray);

                output.functionalparams = { minth : this.data.minth,
                                            maxth : this.data.maxth,
                                            overlay  : true,
                                            isfunctional : true,
                                            cmode :    cmode,
                                            clustersize : this.data.clustersize,
                                            mapfunction : util.mapoverlayfactory(this.data.minth,this.data.maxth,opa,cmode,usef4),
                                          };
                
            }
        }
        return;
    }

    /** Update transfer functions on GUI changes
     * @param {boolean} force - if true force update
     */
    updateTransferFunctions(force=false) {


        let output = {
            image : null,
            interpolate : this.data.interpolate,
            objectmap : null,
            objinterpolate : !this.inObjectmapMode(),
            isfunctional : false,
        };
        
        this.updateAnatomicalMappingFunction(force,output);
        
        // If I don't have an objectmap/o
        if (this.internal.objectmap===null && output.image!==null) {
            this.updateClients(output);
            return;
        }
        
        // If my overlay is in fact an objectmap (i.e. not a continuous functional image)
        if (this.data.funcmode=="Objectmap") {
            this.updateWhenObjectmap(force,output);
        } else {
            this.updateWhenNotObject(force,output);
        }
        this.updateClients(output);
        
    }
    
    /** Update transfer functions on GUI changes -- this is the direct GUI callback */
    updateTransferFunctionsInternal(zerocluster=false) {
        if (zerocluster===true) {
            this.data.clustersize=0;
            if (this.internal.clusterslider!==null)
                this.internal.clusterslider.updateDisplay();
        } 
        this.updateTransferFunctions(false);
    }
    
    // --------- --------- --------- --------- --------- --------- ---------
    // Remove GUI and objectmap
    // --------- --------- --------- --------- --------- --------- ---------
    
    /** Remove the objectmap from GUI and data  */
    internalRemoveObjectmap() {

        this.internal.mode='None';
        this.internal.objectmap = null;
        this.internal.clusterinfo=null;
        this.internal.functionalcontrollers=null;
        
        if (this.internal.folder[1]===null) {
            return;
        }

        if (this.internal.opacityslider!==null) {
            let f=this.internal.folder[1];
            let l=f.__controllers.length-1;
            for (let c=l;c>=0;c=c-1) {
                let elem=f.__controllers[c];
                if (elem !== null) {
                    try {
                        f.remove(elem);
                    } catch(e) {
                        // Left over mess as contollers.remove does not always do the right thing.
                        //
                    }
                }
            }
            f.__controllers=[ ];
            this.internal.opacityslider=null;
        }
    }

    // --------- --------- --------- --------- --------- --------- ---------
    // Add new objectmap
    // --------- --------- --------- --------- --------- --------- ---------
    
    /** Create GUI for new functional data
     * @param {folder} - dat.gui folder
     */
    createFunctionalGUI(folder) {

        if (this.internal.functionalcontrollers!==null) {
            let f=this.internal.folder[1];
            // This works but does not remove the lements from folder[1].__controllers it just takes them out of the GUI
            for (let i=0;i<this.internal.functionalcontrollers.length;i++) {
                f.remove(this.internal.functionalcontrollers[i]);
            }

        }

        
        // Set ranges
        this.internal.functionalcontrollers =  [ ];
        let overlayrange= [ this.internal.objectmaprange[0], this.internal.objectmaprange[1] ];
        let modemap=null;
        if (this.inFunctionalOverlayMode()) {
            modemap=folder.add(this.data,'outmode',this.internal.funcoutlist).name("Overlay Show:");
            this.internal.functionalcontrollers.push(modemap);
        } else {
            this.data['outmode']='Both';
        }
        this.internal.minobjectmap = folder.add(this.data,'minth',overlayrange[0],overlayrange[1]).name("Min Overlay");
        this.internal.maxobjectmap = folder.add(this.data,'maxth',overlayrange[0],overlayrange[1]).name("Max Overlay");

        this.internal.functionalcontrollers.push(this.internal.minobjectmap);
        this.internal.functionalcontrollers.push(this.internal.maxobjectmap);
        if (this.showClusterControls()) {
            this.internal.clusterslider =  folder.add(this.data,'clustersize').min(0).max(2000).step(1).name("Cluster Size");
            this.internal.functionalcontrollers.push(this.internal.clusterslider);
        } else {
            this.internal.clusterslider =  null;
            this.data['clustersize']=0;
        }
        

        const self=this;
        let clbtrue=function() { self.updateTransferFunctionsInternal(true);     };
        let clbfalse=function() { self.updateTransferFunctionsInternal(false); };
        
        if (modemap!==null)
            modemap.onChange(clbtrue);
        this.internal.minobjectmap.onChange(clbtrue);
        this.internal.maxobjectmap.onFinishChange(clbfalse);
        if (this.internal.clusterslider!==null)
            this.internal.clusterslider.onFinishChange(clbfalse);
        
    }

    /** Update functional GUI sliders based on updates */
    updateFunctionalSliders() {

        let overlayrange= [ this.internal.objectmaprange[0], this.internal.objectmaprange[1] ];

        if (this.inFunctionalOverlayMode()) {
            let a1=Math.abs(this.internal.objectmaprange[0]);
            let a2=Math.abs(this.internal.objectmaprange[1]);
            if (a2>a1)
                overlayrange[1]=a2;
            else
                overlayrange[1]=a1;
            overlayrange[0]=0;
            this.data.minth=0.5*(overlayrange[1]);
            this.data.maxth=0.9*(overlayrange[1]);
        } else {
            this.data.minth=0.95*overlayrange[0]+0.05*overlayrange[1];
            this.data.maxth=overlayrange[1];
        }
        
        if (this.internal.minobjectmap!==null) {
            this.internal.minobjectmap.min(overlayrange[0]).max(overlayrange[1]);
            this.internal.maxobjectmap.min(overlayrange[0]).max(overlayrange[1]);
            this.internal.minobjectmap.updateDisplay();
            this.internal.maxobjectmap.updateDisplay();
            if (this.internal.clusterslider!==null)
                this.internal.clusterslider.updateDisplay();
        }
    }

    
    /** Update functional gui from mode callback
     * @param {string} m - this is the new mode one of [ "Objectmap","Overlay","Overlay2","Red","Green","Blue" ],
     */
    updateFunctionalGUI(m) {

        if (m==="Objectmap") {
            //this.internal.interpolatecheck.updateDisplay();
            
            // Remove functional gui
            
            if (this.internal.functionalcontrollers!==null) {
                for (let i=0;i<this.internal.functionalcontrollers.length;i++) {
                    this.internal.folder[1].remove(this.internal.functionalcontrollers[i]);
                }
                this.internal.functionalcontrollers=null;
            }
            return;
        }
        
        this.createFunctionalGUI(this.internal.folder[1]);
        
        if (this.data.funcmode !==this.olddata.funcmode)  {
            this.updateFunctionalSliders();
        }
        return false;
        
    }
    
    /** Create overlay gui (will call more stuff)
     * @param {object} folder - this.data.gui folder
     */
    createOverlayGUI(folder) {


        this.internal.overlaymodeselector=folder.add(this.data,'funcmode',this.internal.funcmodelist).name("Overlay Type:");
        const self=this;
        let clbm1=function(m) {
            self.updateFunctionalGUI(m);
            self.updateTransferFunctionsInternal();
        };
        
        this.internal.overlaymodeselector.onChange(clbm1);
        
        if (!this.inObjectmapMode())  
            this.createFunctionalGUI(folder);
        else
            this.internal.functionalcontrollers=null;

        return;
    }
    

    /** Adds an objectmap to GUI
     * @param {BisImage} objectmap - the objectmap/overlay image
     * @param {boolean} plainmode - if true create limited gui (just opacity)
     * @param {colormapmode} colormap type - "Overlay","Overlay2","Red","Green","Blue","Objectmap" 
     */
    internalAddObjectmap(objectmap,plainmode,colormapmode) {


        let index=this.internal.funcmodelist.indexOf(colormapmode);
        
        // First check phase
        if (objectmap===null || this.internal.basegui===null)  {
            this.internal.mode='None';
            return;
        }

        this.internalRemoveObjectmap();
        this.internal.objectmap = objectmap;

        let dt=objectmap.getDataType();
        this.internal.objectmaprange=objectmap.getIntensityRange();

        this.internal.plainmode = plainmode || false;
        if (this.internal.plainmode) {
            colormapmode="Objectmap";
            if (dt=='float' || dt=='double' || this.internal.objectmaprange[1]>400 || this.internal.objectmaprange[0]<0) {
                let r= this.internal.objectmaprange[0]+":"+this.internal.objectmaprange[1];
                webutil.createAlert(`The loaded objectmap does not look like an objectmap type= ${dt} range:${r}.`,true);
            }
        } else if (index <0 ) {
            if (dt=='float' || dt=='double' || this.internal.objectmaprange[1]>160 || this.internal.objectmaprange[0]<0) {
                if (this.internal.objectmaprange[0]<0.0) {
                    colormapmode="Overlay";
                } else {
                    colormapmode="Orange";
                }
            } else {
                colormapmode="Objectmap";
                
            }
        }

        this.data.funcmode = colormapmode;
        
        if (this.data.funcmode === "Objectmap") {
            this.internal.mode="Objectmap";
        } else {
            this.internal.mode="Overlay";
        }

        let f3=null;
        if (this.internal.folder[1]===null) {
            f3 = this.internal.basegui.addFolder('Overlay Color Mapping');
            this.internal.folder[1]=f3;
        } else {
            f3 = this.internal.folder[1];
        }

        
        if (this.internal.opacityslider===null) {
            this.internal.opacityslider=f3.add(this.data,'opacity',0.0,1.0).name("Opacity").step(0.05);
            const self=this; let clb=function(e) { self.updateTransferFunctionsInternal(e); };
            this.internal.opacityslider.onChange(clb);
        }
        
        if (this.internal.plainmode === false ) {
            this.createOverlayGUI(f3);
            if (!this.inObjectmapMode())
                this.updateFunctionalSliders();
        } 
        

        this.olddata.opacity=-1;
        this.updateTransferFunctions();
    }

    /**
     * @param{dat.gui} basegui - if null hat means it is fine */
    creategui(basegui) {

        let f2=null;
        if (basegui!==null) {
            this.internal.basegui=basegui;
            f2 = basegui.addFolder('Image Color Mapping');
            this.internal.folder[0]=f2;
            this.internal.folder[1]= this.internal.basegui.addFolder('Overlay Color Mapping');
            
            let a1=f2.add(this.data,'minintensity',this.internal.imagerange[0],this.internal.imagerange[1]).name("Min Int");
            let a2=f2.add(this.data,'maxintensity',this.internal.imagerange[0],this.internal.imagerange[1]).name("Max Int");
            let a3=f2.add(this.data,'interpolate').name('Interpolate');
            const self=this;
            
            let clb=function() {
                self.updateTransferFunctionsInternal(false);
            };
            
            for (let i in f2.__controllers) {
                f2.__controllers[i].onChange(clb);
            }
            
            let a4=f2.add(this.data,'autocontrast').name('Auto-Contrast');
            this.internal.anatomicalcontrollers=[a1,a2,a3,a4];
            a4.onChange( function() {
                self.setAutoContrast(true);
                self.updateTransferFunctionsInternal(false);
            });

        } else {
            f2=this.internal.folder[0];
            for (let i=0;i<=1;i++) {
                this.internal.anatomicalcontrollers[i].min(this.internal.imagerange[0]).max(this.internal.imagerange[1]);
                this.internal.anatomicalcontrollers[i].updateDisplay();
            }
        }
        
        this.updateTransferFunctions();
        return f2;
    }

    
    /** Manage on overlay (objectmap) in addition to the anatomical image
     * @param {BiSImage} objectmap - the objectmap image
     * @param {boolean} plainmode - if true only manage opacity of objectmap
     * @param {colormapmode} colormap type - "Overlay","Overlay2","Red","Green","Blue" 
     */
    addobjectmap(objectmap,plainmode,colormapmode) {
        this.internalAddObjectmap(objectmap,plainmode,colormapmode);
        return;
    }
    
    /** Remove objectmap -- delete it's controls also    */
    removeobjectmap() { 
        this.internalRemoveObjectmap();
        return false;
    }
    
    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState() {
        return JSON.parse( JSON.stringify( this.data ) );
    }

    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null) {
        
        if (dt===null)
            return 0;

        let old_mode=this.data.funcmode;
        for (let attr in dt) {
            if (this.data.hasOwnProperty(attr)) {
                this.data[attr] = dt[attr];
            }
        }

        for (let pass=0;pass<=1;pass++) {
            if (this.internal.folder[pass]!==null) {
                for (let ia=0;ia<this.internal.folder[pass].__controllers.length;ia++) {
                    this.internal.folder[pass].__controllers[ia].updateDisplay();
                }
            }
        }

        //       if (this.internal.functionalcontrollers===null) {
        // console.log('No functional controllers');
        //  return;
        //}
        
        let new_mode=this.data.funcmode;
        if (new_mode !== old_mode)  {
            this.updateFunctionalGUI(new_mode);
            this.updateFunctionalSliders();
        } 

        return 1;
    }

    getClusterInfoData() {

        if (this.internal.clusterinfo) {
            return this.internal.clusterinfo.data || null;
        }
        return null;
    }
}


webutil.defineElement('bisweb-colormapcontrollerelement', ColormapControllerElement);


