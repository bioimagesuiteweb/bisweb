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
const webutil=require('bis_webutil');
const $=require('jquery');
const BisWebImage = require('bisweb_image');

/**
 *
 * This is a parent element for the viewer elements. Do not use directly.
 */
class BaseViewerElement extends HTMLElement {
    
    constructor() {
        
        super();

        this.needsrendering=true;
        
        this.internal = {

            // CORE as core goes
            this : null,
            name : 'viewer',
            layoutcontroller : null,
            cmapcontroller : null,
            
            // 
            colormapobservers : [],
            mouseobservers : [],
            resizeobservers : [],
            framechangedobservers :[],
            imagechangedobservers : [],
            ignorecolormapobservers : false,
            ignoreimageobservers : false,
            ignoreframeobservers : false,
            ignoremouseobservers : false,
            
            // Image Stuff
            volume : null,
            objectmap : null,
            imagespa   : [ 1.0,1.0,1.0 ],
            maximagespa : 1.0,
            objectmapspa   : [ 1.0,1.0,1.0 ],
            imagedim   : [ 0,0,0 ],
            objectmapshift : [ 0,0,0 ],

            // MaxNumFrames
            maxnumframes : 0,
            
            //  scene
            showdecorations : true,
            lockcursor : false,
            datgui : {
                data : { },
                gui : null,
                coords : null,
            },

            subviewers : null,
            slices : null,
            overlayslices: null,
            
            ismosaic : false,
            
            // stuff to create snapshots
            snapshotcontroller : null,
            preservesnapshot : false,
            
            // colormaps
            colormapControllerPayload : null,
            objectmaptransferfunction : util.mapobjectmapfactory(255),
            objectmaptransferinfo : { 'showcolorbar' : false, colormode : 'Overlay' },

            // movie playing
            framecontroller : null,
            enable_renderloop_flag : true,
            webgl_enabled_flag : true,
            play_movie_controller : null,

            // pending render
            pending_render : false,
            has_context_callbacks : false,
            
        };

        this.is_slave_viewer=false;
        this.slave_viewer=null;
        this.master_viewer=null;
        this.cleararea=[ 0.0,1.0];
        // save state stuff
        this.internal.saveState=null;
        this.internal.viewerleft=null;
        this.minLabelWidth=150;
    }


    informToRender() {
        
        if (this.is_slave_viewer && this.master_viewer)
            this.master_viewer.needsrendering=true;
        else
            this.needsrendering=true;
    }

    
    // ------------------------------------------------------------------------------------
    /* set the viewer name 
     * @param{String} name 
     */
    setName(name) {
        this.internal.name=name;
    }

    /* return the viewer name 
     * @returns{String} -- the viewer name 
     */
    getName() {
        return this.internal.name;
    }
    
    // ------------------------------------------------------------------------------------
    /* set the minimum width to draw labels
     * @param{Number} width 
     */
    setMinLabelWidth(n) {
        this.minLabelWidth=n || 150;
    }

    /* return the min Label Width
     * @returns{Number} -- the label width
     */
    getMinLabelWidth() {
        return this.minLabelWidth;
    }

    /* returns last cross hairs (null) */
    getViewerCrossHairs() { return null; }

    /* returns the colormap controller */
    getColormapController() { return this.internal.cmapcontroller; }

    /* Disable clustering for objectmap */
    disableClustering() {
        let cmapcontrol=this.getColormapController();
        let elem=cmapcontrol.getElementState();
        elem.clustersize=0;
        cmapcontrol.setElementState(elem);
        cmapcontrol.updateTransferFunctions(true);
    }
    
    // ------------------------------------------------------------------------------------
    /** returns the size of the viewer
     * @returns {array} - [ width,height] - the viewer dimensions
     */
    getViewerDimensions() {
        let dw=this.internal.layoutcontroller.getviewerwidth();
        let dh=this.internal.layoutcontroller.getviewerheight();
        return [ dw,dh];
    }
    
    // ------------------------------------------------------------------------------------
    /** sets the slave viewer and establishes dual mouse observation and resize observation
     * @param {BaseViewerElement} other - the slave viewer
     */
    setSlaveViewer(other) {
        this.slave_viewer=other;
        this.addMouseObserver(other);
        this.addResizeObserver(other);
        other.addMouseObserver(this);
        if (!this.internal.pending_render)
            this.renderloop();
    }
    
    // ------------------------------------------------------------------------------------
    /** playmovie function, starts the movie playing
     * 
     */
    playStopMovie(val) {

        let data = this.internal.datgui.data;

        if (val!==undefined) {
            data.playing=val;
        } else {
            if (this.internal.play_movie_controller)
                this.internal.play_movie_controller.updateDisplay();
        }

        
        if (!data.playing) {
            // this is the stop button
            return;
        }
        
        let delay=1000.0/data.rate;
        this.setframe(this.getframe()+1);


        
        const self=this;
        setTimeout(function() { self.playStopMovie();},delay);
    }
        

    
    /** creates movie playing
     * @param{dat.gui.folder} moviefolder -- the place to create the movie gui
     */
    createmoviecontrols(moviefolder) {

        let data = this.internal.datgui.data;
        data.rate=20;
        data.playing=false;

        moviefolder.add(data,'rate',1,40).name("Frames/s");
        
        this.internal.play_movie_controller=moviefolder.add(data, 'playing').name("Play Movie");

        this.internal.play_movie_controller.onChange( (val) => {
            this.playStopMovie(val);
        });
    }
    
    // ------------------------------------------------------------------------------------
    // Called when setting new image or new objectmap
    // ------------------------------------------------------------------------------------
    /** delete the objectmap/overlay */
    deleteoldobjectmap() {

        this.clearcolorscale();
        
        if (this.internal.overlayslices===null || this.internal.subviewers===null) {
            this.internal.objectmap=null;
            return;
        }
        
        let l=this.internal.overlayslices.length;
        
        for (let i=0;i<l;i++) {
            if (this.internal.overlayslices[i]!==null) {
                this.internal.overlayslices[i].removefromscene(this.internal.subviewers[i].getScene());
                this.internal.overlayslices[i].cleanup();
                this.internal.overlayslices[i]=null;
            }
        }
        this.internal.objectmap=null;
    }
    
    /** delete the image (called when setting a new one) */
    deleteoldimage(samesize=false) {

        // TODO:
        // Test this very carefully
        if (!samesize)
            this.deleteoldobjectmap();          
        
        if (this.internal.volume===null)
            return;

        if (this.internal.subviewers===null)
            return;
        
        let l=this.internal.subviewers.length;
        
        for (let i=0;i<l;i++) {
            
            if (this.internal.subviewers[i]!==null) {
                if (this.internal.slices[i]!==null) {
                    this.internal.slices[i].removefromscene(this.internal.subviewers[i].getScene());
                    this.internal.slices[i].cleanup();
                    this.internal.slices[i]=null;
                }
                if (samesize===false) {
                    this.internal.subviewers[i].remove();
                    this.internal.subviewers[i]=null;
                }
            }
        }
    }

    // ------------------------------------------------------------------------------------
    // Main Renderloop
    // ------------------------------------------------------------------------------------

    /** this sets the snapshot controller for use in store/retrieve Element state
     * @param{SnapshotController} - cont
     */
    setSnapShotController(cont) {
        this.internal.snapshotcontroller=cont;
    }

    /** this geets the snapshot controller 
     * @returns{SnapshotController}
     */
    getSnapShotController() {
        return this.internal.snapshotcontroller;
    }
    
    /** this is the callback registered on {@link SnapshotController} to call when it 
     * requests an update
     * @param{SnapshotController} - controller
     */


    
    savenextrender(controller) {
        this.internal.preservesnapshot=true;
        this.internal.snapshotcontroller=controller;
        this.informToRender();
        return true;
    }

    getmaxviewers() {

        if (this.subviewers===null)
            return 0;
        
        return this.internal.subviewers.length;
    }

    
    /** disable renderloop */
    disable_renderloop(msg='') {
        this.internal.enable_renderloop_flag=false;
        this.playStopMovie(false);

        if (this.internal.play_movie_controller!==null)
            this.internal.play_movie_controller.updateDisplay();


        const renderer=this.internal.layoutcontroller.renderer;
        renderer.getContext().canvas.style.visibility='hidden';
        
        if (msg.length>1)
            webutil.createAlert(msg,true);

    }

    /** enable renderloop */
    enable_renderloop(msg='') {
        this.internal.enable_renderloop_flag=true;
        const renderer=this.internal.layoutcontroller.renderer;
        renderer.getContext().canvas.style.visibility='visible';
        if (msg.length>1)
            webutil.createAlert(msg);
    }
    
    /** main renderloop function (run in loop using window.requestAnimationFrame) */
    renderloop() {
        
        const self=this;
        
        if (this.internal.has_context_callbacks===false) {
            this.internal.has_context_callbacks=true;
            
            const renderer=self.internal.layoutcontroller.renderer;
            renderer.getContext().canvas.addEventListener("webglcontextlost", function(event) {
                console.log('Caught');
                self.internal.webgl_enabled_flag=false;                
                event.preventDefault();
            }, false);
            
            renderer.getContext().canvas.addEventListener("webglcontextrestored", function(event) {
                console.log('Restored');
                self.internal.webgl_enabled_flag=true;
                event.preventDefault();
            }, false);
        }
        
        let numviewers=self.getmaxviewers();
        this.internal.pending_render=false;
        
        if (this.internal.enable_renderloop_flag || this.slave_viewer!==null)  {
            if (!this.is_slave_viewer) {
                this.internal.pending_render=true;
                window.requestAnimationFrame( () => {
                    this.renderloop();
                });
            }
        }
        
        if (this.internal.enable_renderloop_flag &&
            this.internal.webgl_enabled_flag &&
            ( this.needsrendering || this.is_slave_viewer)) {
            let subviewers=this.internal.subviewers;
            let renderer=this.internal.layoutcontroller.renderer;

            if (!this.is_slave_viewer)
                renderer.clear();
            for (let i=0;i<subviewers.length;i++) {
                if (this.internal.subviewers[i]!==null) {
                    if (i<numviewers) {
                        this.renderSubViewer(i);
                    } else {
                        subviewers[i].enabled=false;
                    }
                }
            }

            if (this.slave_viewer!==null && this.internal.webgl_enabled_flag)
                this.slave_viewer.renderloop();
            this.needsrendering=false;
        
        }
        
        if (this.internal.preservesnapshot===true && this.internal.snapshotcontroller!==null)  {
            let renderer=this.internal.layoutcontroller.renderer;
            let t=renderer.domElement.toDataURL();
            this.internal.preservesnapshot=false;
            
            let hasColorbar=true;
            if (this.internal.simplemode)
                hasColorbar=false;
            
            this.internal.snapshotcontroller.update(t,hasColorbar);//this.internal.ismosaic);
        }
        
        
        return 0;
    }

    /** render an individual subviewer 
     * @param{number} index - subviewer index
     */
    renderSubViewer(index) {
        if (this.internal.subviewers[index])
            this.internal.subviewers[index].render();
    }
    
    /** removes the colorscale */
    clearcolorscale() {

        if (this.internal.simplemode)
            return;

        let context=this.internal.layoutcontroller.overlaycontext;
        let fullwidth=this.internal.layoutcontroller.getviewerwidth();
        let dw=fullwidth*this.cleararea[1];
        
        if (dw<500)
            return;
        
        let dh=this.internal.layoutcontroller.getviewerheight();
        let y0=0.92*dh;
        if (this.internal.ismosaic) {
            context.clearRect(0.0,y0-5,fullwidth,(dh-y0)+5);
        } else {
            let v=[
                (this.cleararea[0]+0.5*this.cleararea[1])*fullwidth,
                y0-5,
                0.5*dw,
                (dh-y0)+5
            ];
            context.clearRect(v[0],v[1],v[2],v[3]);
        }
    }
    
    // ------------------------------------------------------------------------------------
    /** draw colormap on 2d canvas showing current location and intensity values */
    drawcolorscale() {
        
        this.clearcolorscale();

        if (this.internal.objectmap===null || this.internal.objectmaptransferinfo.showcolorbar!==true)
            return;

        let context=this.internal.layoutcontroller.overlaycontext;
        let fullwidth=this.internal.layoutcontroller.getviewerwidth();
        let dw=fullwidth*this.cleararea[1];
        
        if (dw<500)
            return;

        let dh=this.internal.layoutcontroller.getviewerheight();
        let y0=0.92*dh;

        let fnsize=webutil.getfontsize(context.canvas);
        if (dw<1000)
            fnsize=Math.round((dw/1000)*fnsize);
        
        let colorfunction=this.internal.objectmaptransferfunction;
        if (this.internal.objectmaptransferinfo.clustersize > 0) 
            colorfunction=this.internal.objectmaptransferinfo.mapfunction;
        
        let md=this.internal.objectmaptransferinfo.overlay;
        let minv=this.internal.objectmaptransferinfo.minth;
        let maxv=this.internal.objectmaptransferinfo.maxth;
        let numsteps=14;
        let numpass=1;
        let wd=(0.45*dw)/(numsteps+1);
        if (maxv<=minv)
            maxv=minv+1.0;
        let dvalue=maxv-minv;
        let dv=dvalue/numsteps;
        if (md===true) {
            
            if (this.internal.objectmaptransferinfo.cmode===3) {
                numsteps=8;
                dv=(maxv-minv)/numsteps;
                numpass=2;
                wd=(0.45*dw)/(2*(numsteps+1)+1);
            } else if (this.internal.objectmaptransferinfo.cmode===2) {
                let a=minv;
                minv=-maxv;
                maxv=-a;
            }
        }
        let map=[0,0,0,0];
        let data=[0];
        
        let x0=0.52*dw;
        if (this.internal.ismosaic)
            x0=0.275*dw;

        x0=x0+this.cleararea[0]*fullwidth;
        
        y0+=2;
        let ht=0.5*(dh-y0);
        if (ht>wd)
            ht=wd;
        
        let power=10.0;
        if (dvalue>100)
            power=1.0;
        if (dvalue<0.1)
            power=100.0;
        
        
        context.font=fnsize+"px Arial";
        context.textAlign="center";
        context.textBaseline="top";


        for (let pass=0;pass<numpass;pass++) {
            context.fillStyle="#888888";
            context.fillRect(x0-2,y0-2,wd*(numsteps+1)+3,ht+4);
            
            for (let i=0;i<=numsteps;i++) {
                if (numpass===1 || pass===1) {
                    data[0]=minv+i*dv;
                } else {
                    data[0]=-(maxv-dv*i);
                }
                colorfunction(data,0,map);
                let cl=util.rgbToHex(map[0],map[1],map[2]);
                context.fillStyle=cl;
                
                context.fillRect(x0+1,y0,wd-2,ht);

                if (i===0 || i===numsteps || i===numsteps/2) {
                    context.strokeStyle="#888888";
                    context.lineWidth=3;
                    context.beginPath();
                    context.moveTo(x0+0.5*(wd-1),y0+0.9*ht);
                    context.lineTo(x0+0.5*(wd-1),y0+1.4*ht);
                    context.stroke();
                    let w0=context.measureText('-').width*-0.5;
                    context.fillStyle = "#888888";
                    if (data[0]>=0.0)
                        w0=0;
                    context.fillText(util.scaledround(data[0],power),x0+w0+0.5*(wd-1),y0+1.5*ht);
                }

                x0+=wd;
            }
            x0+=wd;
        }

    }
    
    
    
    
    // ------------------------------------------------------------------------------------
    // Handle Resize
    // ------------------------------------------------------------------------------------
    /** handle window resize. Calls {@link ViewerLayoutElement}.handleresize.
     * to do most of the work and then adjusts the viewports
     */
    handleresize() {

        if (!this.internal.enable_renderloop_flag)
            return;

        this.informToRender();
        let width=this.internal.layoutcontroller.getviewerwidth();
        if (width<2 || width===undefined)
            return;

        if (!this.is_slave_viewer)
            this.internal.layoutcontroller.handleresize();
        
        if (this.internal.subviewers !== null) {
            for (let i=0;i<this.internal.subviewers.length;i++) {
                if (this.internal.subviewers[i] !== null)
                    this.internal.subviewers[i].handleResize(false);
            }
        }
    }

    
    
    // ------------------------------------------------------------------------
    // Respond to sub-controllers
    // ------------------------------------------------------------------------
    
    /** handle update from {@link ColormapControllerElement} and update colormap observers
     * @param {BisF.ColorMapControllerPayload} input - definition of new transfer functions to use
     */
    updatetransferfunctions(input=null) {

        if (!input)
            return;

        this.informToRender();
        
        this.internal.colormapControllerPayload=input;

        let num=this.internal.slices.length;
        
        if (input.image!==null) {
            this.internal.imagetransferfunction=input.image;
            for (let pl=0;pl<num;pl++)  {
                if (this.internal.slices[pl])
                    this.internal.slices[pl].setnexttimeforce();
            }
        }
        for (let pl=0;pl<num;pl++) {
            if (this.internal.slices[pl])
                this.internal.slices[pl].interpolate(input.interpolate);
        }

        if (this.internal.overlayslices!==null) {
            let numov=this.internal.overlayslices.length;
            if (this.internal.overlayslices[0]!==null) {
                if (input.objectmap!==null) {
                    this.internal.objectmaptransferfunction=input.objectmap;
                    this.internal.objectmaptransferinfo=input.functionalparams;
                    for (let pl=0;pl<numov;pl++) {
                        if (this.internal.overlayslices[pl]!==null)
                            this.internal.overlayslices[pl].setnexttimeforce();
                    }
                }
                for (let pl=0;pl<numov;pl++) {
                    if (this.internal.overlayslices[pl]!==null)
                        this.internal.overlayslices[pl].interpolate(input.objinterpolate);
                }
            }
        }
        
        //this.handleresize();
        this.setcoordinates();
        
        this.updateColormapObservers(input);
        this.drawcolorscale();
    }
    
    setcoordinates() {
        // Does nothing in base viewer
    }
    // ------------------------------------------------------------------------
    // get/set image
    // ------------------------------------------------------------------------
    /** Returns the current image
     * @returns {BisImage} current image (may be null);
     */
    getimage() { return this.internal.volume;}
    
    /** Returns the overlay image 
     * @requires{BisWebImage} current objectmap 
     */
    getobjectmap() { return this.internal.objectmap; }

    /** 
     * @return{String} - the objectmap colortype */
    getcolortype() {  return this.internal.objectmaptransferinfo.colormode;  }
    
    // -------------------------------------------
    // Colormap Observers
    // -------------------------------------------
    /** adds a colormap observer to the list. This will be updated each time this viewer is updated.
     */
    addColormapObserver(v) {
        this.internal.colormapobservers.push(v);
    }
    
    /** update all colormap observers with new info
     * @param {BisF.ColorMapControllerPayload } input - new transfer functions
     */
    updateColormapObservers(input) {

        if (this.internal.colormapobservers.length <1)
            return;
        const self=this;

        if (this.internal.ignorecolormapobservers ||
            this.internal.ignoreimageobservers )
            return;

        
        //console.log('**** Updating observers from=',this);
        this.internal.colormapobservers.forEach(function(f) {
            f.updatecmap(self.internal.cmapcontroller,input);
        });

    }
    
    /** update the transfer functions of this viewer from outside.
     * (i.e. this viewer is acting as the colormap observer here)
     * @param {BisGUIColormapController} other - to copy parameters from
     * @param {BisF.ColorMapControllerPayload } input - new transfer functions
     */
    updatecmap(other,input) {

        if (this.internal.ignorecolormapobservers === true ||
            this.internal.ignoreimageobservers === true)
            return;

        if (this.internal.cmapcontroller!==null && this.internal.volume!==null) {

            //console.log('++++++++ Being updated from  observers=',this);
            this.internal.cmapcontroller.setElementState(other.getElementState());
            this.internal.ignorecolormapobservers = true;
            this.updatetransferfunctions(input);
            this.internal.ignorecolormapobservers = false;
        }
    }
    
    // ----------------------------------------------
    // Mouse Observers -- observe mouse events
    // ----------------------------------------------
    /** add a mouse observer to notify after new mouse events
     * @param {BisMouseObserver} v - mouse observer
     */
    addMouseObserver(v) {
        this.internal.mouseobservers.push(v);
    }
    
    /** update all mouse observers with new coordinates 
     *  Called from {@link BisWebOrthogonalViewerElementElement.updatescene}.
     * @param {array} mm - [ x,y,z ] array with current position in mm
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     * @param {number} mousestate - 0=click 1=move 2=release
     */
    updateMouseObservers(mm,plane,mousestate) {
        
        if (this.internal.mouseobservers.length===0)
            return;

        this.informToRender();
        this.internal.ignoremouseobservers = true;
        this.internal.mouseobservers.forEach(function(f) {
            f.updatemousecoordinates(mm,plane,mousestate);
        });
        this.internal.ignoremouseobservers = false;
    }
    
    /* add a resize observer to notify after new resize events
     * @param {BisResizeObserver} v - resize observer  */
    addResizeObserver(v) {
        this.internal.resizeobservers.push(v);
    }

    /* add a resize observer to notify after new resize events
     * @param {BisResizeObserver} v - resize observer  */
    removeResizeObserver(v) {
        let i=this.internal.resizeobservers.indexOf(v);
        if (i<0)
            return;
        this.internal.resizeobservers.splice(i,1);
    }
    
    /** update all resize observers with new coordinates 
     *  Called from {@link BisWebOrthogonalViewerElementElementThis.Internal.handleresize}.
     */
    updateResizeObservers() {

        if (this.internal.resizeobservers.length===0)
            return;

        let d=this.getViewerDimensions();
        
        this.internal.resizeobservers.forEach(function(f) {
            f.handleresize(d);
        });
    }
    
    /** Called when viewer has a new image to update all mouse observers with this info.
     * This often results in mouse observer ``recreating'' its gui etc. Called from {@link @this.setimage}.
     * @param{Boolean} samesize -- if image is same size as before
     */
    initializeMouseObservers(samesize=false) {
        
        if (this.internal.mouseobservers.length===0)
            return;
        
        const self=this;
        
        this.internal.mouseobservers.forEach(function(f) {
            let fn=f.initialize || null;
            if (fn!==null) {
                f.initialize(self.internal.subviewers,self.internal.volume,samesize);
            }
        });
    }

    /* add a image observer to notify after new image events
     * @param {BisImageChangedIbserver} v - image observer  */
    addImageChangedObserver(v) {
        this.internal.imagechangedobservers.push(v);
    }

    /* add a image observer to notify after new image events
     * @param {BisImageChangedObserver} v - image observer  */
    removeImageChangedObserver(v) {
        let i=this.internal.imagechangedobservers.indexOf(v);
        if (i<0)
            return;
        this.internal.imagechangedobservers.splice(i,1);
    }
    
    /** update all image observers with new coordinates 
     *  Called from {@link BisWebOrthogonalViewerElementElementThis.Internal.handleimage}.
     */
    updateImageChangedObservers(mode='image') {
        if (this.internal.imagechangedobservers.length===0)
            return;

        this.internal.ignoreimageobservers=true;

        
        this.internal.imagechangedobservers.forEach((f) => {
            f.handleViewerImageChanged(this,mode,this.internal.objectmaptransferinfo.colormode);
        });

        this.internal.ignoreimageobservers=false;
    }

    /** this class can also be an imagechangedobserver */
    handleViewerImageChanged(viewer,source,colortype) {

        if (this.internal.ignoreimageobservers === true)
            return;

        this.informToRender();
        
        let img=null;
        if (source==="overlay")
            img=viewer.getobjectmap();
        else
            img=viewer.getimage();

        //console.log('<HR><BR>Setting ' , this, img, source);
        this.internal.ignoreimageobservers = true;
        if (source==='overlay') {
            let plainmode= false;//(colortype === "Objectmap");
            if (img!==null)
                this.setobjectmap(img,plainmode,colortype);
            else
                this.clearobjectmap();
        } else {
            this.setimage(img);
        }
        this.internal.ignoreimageobservers = false;
    }


    /* add a frame observer to notify after new frame events
     * @param {BisFrameChangedIbserver} v - frame observer  */
    addFrameChangedObserver(v) {
        this.internal.framechangedobservers.push(v);
    }

    /* add a frame observer to notify after new frame events
     * @param {BisFrameChangedObserver} v - frame observer  */
    removeFrameChangedObserver(v) {
        let i=this.internal.framechangedobservers.indexOf(v);
        if (i<0)
            return;
        this.internal.framechangedobservers.splice(i,1);
    }
    
    /** update all frame observers with new coordinates 
     *  Called from {@link BisWebOrthogonalViewerElementElementThis.Internal.handleframe}.
     */
    updateFrameChangedObservers() {

        if (this.internal.framechangedobservers.length===0 ||
           !this.internal.volume)
            return;

        this.internal.ignoreframeobservers = true;

        let frame=this.getframe();
        
        this.internal.framechangedobservers.forEach((f) => {
            f.handleFrameChanged(frame);
        });
        this.internal.ignoreframeobservers = false;
    }

    /** this class can also be an framechangedobserver */
    handleFrameChanged(frame) {

        if (this.internal.ignoreframeobservers || !this.internal.volume)
            return;

        this.informToRender();
        this.setframe(frame);
    }


    // -----------------------------------------------------------------------------
    //  finalize tools
    // -----------------------------------------------------------------------------
    /** finalizes the tool layout
     * @returns {number} -- result of collapse operation
     */
    finalizeTools() {
        return this.internal.layoutcontroller.getdockbar().collapse();
    }
    
    /** collapses the viewer controls tab
     */
    collapseCore() {
        let w=this.internal.layoutcontroller.getcorecontrols();
        $(w[0]).removeClass('in');
    }


    // -----------------------------------------------------------------------------
    // Get Slices
    // -----------------------------------------------------------------------------
    /** return slices array */
    getSliceMeshes() {
        return this.internal.slices;
    }

    /** return overlay slices array */
    getOverlaySliceMeshes() {
        return this.internal.overlayslices;
    }
    
    // -----------------------------------------------------------------------------
    // Reset
    // -----------------------------------------------------------------------------
    /** resets all sub-viewers to default zoom and position of camera 
     */
    resetViewers() {
        this.internal.subviewers.forEach(function(f) {
            if (f!==null) {
                f.reset();
            }
        });
    }

    zoomViewers(factor=0.9) {
        this.internal.subviewers.forEach(function(f) {
            if (f!==null) {
                f.zoomCamera(factor);
                f.render();
            }
        });
    }
    
    connectedCallbackBase() {
        
        const self=this;
        let layoutwidgetid=this.getAttribute('bis-layoutwidgetid');

        let simple=this.getAttribute('bis-simplemode');
        this.internal.simplemode=false;
        if (simple==="1" || simple==="true")
            this.internal.simplemode=true;
        
        this.internal.layoutcontroller=document.querySelector(layoutwidgetid);
        let rs=function() {
            if (!this.is_slave_viewer)
                self.handleresize();
        };
        
        window.addEventListener( 'resize', rs);
        this.internal.layoutcontroller.addEventListener( 'resize', rs);

        let otherid=this.getAttribute('bis-otherviewer');
        if (otherid!==null) {
            this.is_slave_viewer=true;
            this.master_viewer=document.querySelector(otherid);
            this.master_viewer.setSlaveViewer(this);
        }                               
    }

    getInsideViewer(x) {
        let dw=this.internal.layoutcontroller.getviewerwidth();
        if (x<dw*this.cleararea[0])
            return false;
        if (x>dw*(this.cleararea[0]+this.cleararea[1]))
            return false;
        return true;
    }

    setDualViewerMode(left=0.5) {

        if (this.is_slave_mode)
            return;

        this.internal.viewerleft=left;
        
        if (left>0.9) {
            this.setViewerMode('right',0.0);
            this.master_viewer.setViewerMode('full',1.0);
        } else if (left<0.1) {
            this.master_viewer.setViewerMode('left',0.0);
            this.setViewerMode('full',1.0);
        } else {
            this.master_viewer.setViewerMode('left',left);
            this.setViewerMode('right',1.0-left);
        }
        this.master_viewer.handleresize();
    }

    /** sets the viewer mode one of full,left,right 
     * @param{mode} - on of left,right or full (default)
     * @param{size} - width (fraction) of this viewer
     * @returns {String} - the current mode
     */
    setViewerMode(mode='full',size=0.5) {

        if (mode !=="left" && mode !=="right")
            mode="full";

        if (mode==="full") {
            this.cleararea=[ 0.0,1.0];
        } else {
            let shift=0.0;
            if (mode==="right") {
                shift=1.0-size;
            }
            this.cleararea=[ shift,size];
        }

        return mode;
    }


    /** info box */
    viewerInformation() {

                
        let a="No image loaded";
        if (this.internal.volume) {
            a=this.internal.volume.getDetailedDescription('Image');
        }

        let b="No overlay loaded";
        if (this.internal.objectmap) {
            b=this.internal.objectmap.getDetailedDescription('Overlay');
        }

        let txt=a+'<BR> <BR>'+b;
        let dh=Math.round(this.internal.layoutcontroller.getviewerheight()*0.7);
        webutil.createLongInfoText(txt,'Viewer Information',dh);
        
        /*const output=`<div style="margin-left:3px; margin-right:3px; margin-top:3px; overflow-y: auto; position:relative; color:#fefefe; width:100%; background-color:#000000; max-height:${dh}px; overflow-y: auto; overflow-x: auto">`+txt+`</div>`;
        
        bootbox.dialog({
            title: 'Viewer Information',
            message: output,
        });*/
    }


    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {

        let obj= { image: '',
                   overlay: '',
                   colortype: '' };
        if (this.internal.cmapcontroller)
            obj['colormap']=this.internal.cmapcontroller.getElementState();
        if (this.internal.viewerleft)
            obj['viewerleft'] = this.internal.viewerleft;

        if (this.internal.snapshotcontroller) 
            obj['snapshotcontroller']=this.internal.snapshotcontroller.getElementState();
        
        if (storeImages) {
            let img=this.getimage();
            if (img) {
                obj['image']=img.serializeToJSON(false);
                let objmap=this.getobjectmap();
                if (objmap) {
                    obj['overlay']=objmap.serializeToJSON(false);
                    obj['colortype']=this.getcolortype();
                }
            }
        }

        if (this.internal.subviewers) {
            let n=this.internal.subviewers.length;
            if (n>0) {
                obj.subviewers = [];
                for (let i=0;i<n;i++) {
                    if (this.internal.subviewers[i]) {
                        let controls=this.internal.subviewers[i];
                        let p=controls.serializeCamera();
                        obj.subviewers.push(p);
                    }
                }
            }
        }

        return obj;
    }

    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null) {
        if (dt===null)
            return;

        this.internal.ignorecolormapobservers = true;

        if (dt['viewerleft'])
            this.internal.viewerleft= dt['viewerleft'];

        let img=dt['image'] || '';
        if (img.length>1) {
            let newimg=new BisWebImage();
            newimg.parseFromJSON(dt['image']);
            this.setimage(newimg);
            
            let ovr=dt['overlay'] || '';
            if (ovr.length >1) {
                let newobj=new BisWebImage();
                newobj.parseFromJSON(dt['overlay']);
                let colortype=dt['colortype'] || 'Overlay';
                let plainmode= (colortype === "Objectmap");
                this.setobjectmap(newobj,plainmode,colortype);
            }
        }


        if (!this.is_slave_viewer)
            this.internal.ignorecolormapobservers = false;

        if (this.internal.cmapcontroller) {
            this.internal.cmapcontroller.setElementState(dt['colormap']);
            this.internal.cmapcontroller.updateTransferFunctions(true);
        }

        this.internal.ignorecolormapobservers=false;
        
        if (this.internal.snapshotcontroller) 
            this.internal.snapshotcontroller.setElementState(dt['snapshotcontroller']);
        
        
        


        return;
    }

    /**  this does the final part of setElement State
     * by updating the subviewer cameras */
    setElementStateCameras(dt=null) {

        this.resetViewers();
        let subviewers=this.internal.subviewers;
        
        if (dt.subviewers && subviewers) {
            let num=subviewers.length;
            if (dt.subviewers.length<num)
                num=dt.subviewers.length;
            for (let i=0;i<num;i++) {
                if (dt.subviewers[i] && subviewers[i]) {
                    subviewers[i].parseCamera(dt.subviewers[i]);
                    subviewers[i].render();
                }
            }
        } 

    }
    
    /** store State in this.internal.saveState */
    storeState() {
        this.internal.saveState=this.getElementState();
    }

    /** restore State from this.internal.saveState */
    restoreState() {
        if (this.internal.saveState) {
            this.setElementState(this.internal.saveState);
        }
    }

    /** getlayoutcontroller 
        @returns {Object} the layout controller
    */
    getLayoutController() {
        return this.internal.layoutcontroller;
    }


    /** remap dimensions to 4D 
     * @param{Array} idim -- input/output 5 dimensional array
     */
    remapDimensionsTo4D(dim,volume) {
        // TODO: One day do proper 5D
        // Force everything to 4D for now ...
        if (volume) {
            if (dim[4]===3 && volume.getDataType()==='uchar')
                return;
        }
        
        if (dim[4]>1) {
            dim[3]=dim[3]*dim[4];
            dim[4]=1;
        }
    }

    /** handle color mode change */
    handleColorModeChange(dark=true) {
        this.getLayoutController().setDarkMode(dark);
        this.handleresize();
    }

}


module.exports=BaseViewerElement;

