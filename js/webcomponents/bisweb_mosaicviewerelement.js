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

/* global window,document*/

"use strict";

const THREE = require('three');
const util=require('bis_util');
const BISCameraControls = require('bis_3dorthographiccameracontrols');
const bis3dOrthogonalSlice=require('bis_3dorthogonalslice');
const webutil=require('bis_webutil');
const $=require('jquery');
const BaseViewerElement=require('bisweb_baseviewerelement');

import dat from 'dat.gui';

// maxviewer size
const MAXROWS=8, MAXCOLS=8;
const MAXVIEWERS=MAXROWS*MAXCOLS;


/**
 *
 * A web element that creates a Mosaic Viewer inside a {@link ViewerLayoutElement}.
 *  It also takes a pointer to a {@link ColormapControllerElement} and draws it inside
 *  the viewer controls.
 *
 * @example
 *    <bisweb-mosaicviewer
 *      id="viewer"
 *      bis-layoutwidgetid="#viewer_layout"
 *      bis-colormapeditorid="#viewer_cmap">
 *    </bisweb-mosaicviewer>
 *
 * Attributes:
 *      bis-layoutwidget : id of the ViewerLayoutElement to draw in
 *      bis-colormapeditorid : if of the ColormapControllerElement
 *            that will be attached to the viewer controls
 *      bis-otherviewer : id of the master viewer (this becomes a slave! )
 */
class MosaicViewerElement extends BaseViewerElement {

    constructor() {

        super();
        
        this.internal.s_width=2;
        this.internal.s_depth=2;

        // viewmode
        this.internal.plane=2;
        this.internal.numrows=1;
        this.internal.numcols=2;
        this.internal.firstslice= 0;
        this.internal.increment= 4;
        this.internal.frame=0;
        this.internal.ismosaic=true;
        this.internal.lastzoom=null;
        this.internal.slices=[null];
        this.internal.displaymodes=null;
        this.internal.corefolder=null;
    }

    // ------------------------------------------------------------------------------------
    // Compute objectmap mm coordinates
    // ------------------------------------------------------------------------------------
    /** get the `z' coordinate (depending on which plane we are displaying -- so in YZ mode this is X, in XZ, this is Y and in XY this is Z) in mm of the current objectmap slice
     * This centers the two images (objectmap vs underlay) if they have different dimensions as needed
     * @returns {number} `z' coordinate in mm
     */
    getmmsl(sl) {
        return this.computeslice(sl)*this.internal.imagespa[this.internal.plane]+this.internal.objectmapshift[this.internal.plane];
    }
    
    // ------------------------------------------------------------------------------------
    // Compute slice and viewports for each view
    // ------------------------------------------------------------------------------------
    
    /** compute the slice to show on sub-viewer
     * @param {number} index - sub-viewer index
     * @returns {number} slice index
     */
    computeslice(index) {
        index=index||0;
        if (this.internal.imagedim[this.internal.plane]<1)
            return 0;
        return this.internal.firstslice+this.internal.increment*index;
        

    }
    
    /** compute the viewport for the subviewer index
     * @param {number} index - sub-viewer index
     * @returns {Bis_Viewport} - viewport of viewer
     */
    computeviewport(index) {
        
        index=Math.floor(util.range(index,0,MAXVIEWERS-1));
        if (index>=this.internal.numrows*this.internal.numcols) 
            return { x0: 0.0, y0: 0.0, x1: 0.0, y1: 0.0 };
        
        let dw=this.internal.layoutcontroller.canvas.width;
        let fullw=this.cleararea[1]*dw;
        let offsetw=this.cleararea[0]*dw;
        let fullh=this.internal.layoutcontroller.canvas.height; // 0.92 is to allow for colorbar
        let fraction=0.91;
        let boty=1.0-fraction;
        
        // sizes in voxels
        let vwidth= fullw/(this.internal.numcols+0.01);
        let vheight=(fraction*fullh)/(this.internal.numrows+0.01);

        // size in voxels
        let vdim = vwidth;
        if (vheight<vwidth)
            vdim=vheight;
        
        // Now map to normalized stuff 0..1
        let widthC=vdim/fullw;
        let widthR=vdim/fullh;

        let xoffset=0.5*(1.0-widthC*this.internal.numcols);
        let yoffset=1.0-widthR*this.internal.numrows;

        if (yoffset>boty)
            yoffset=(yoffset-boty)*0.5+boty;

        let iy=Math.floor(index/this.internal.numcols);
        let ix=(index-Math.floor(iy*this.internal.numcols));
        
        let x0=(ix)*widthC+xoffset;//+(x+1)*leftoverC;
        let y0=(iy)*widthR+yoffset;//+(y+1)*leftoverR;
        
        return { x0: this.cleararea[1]*x0+offsetw,
                 y0: y0,
                 x1: this.cleararea[1]*(x0+0.98*widthC)+offsetw,
                 y1: y0+0.98*widthR
               };
    }
    
    // ------------------------------------------------------------------------------------
    // Create scenes,cameras etc for each slice view
    // ------------------------------------------------------------------------------------
    /** create one of the many slice views of the viewer
     * @param {ThreeJS-WebGLRenderer} renderer - the underlying 3D rendere object
     * @param {BisImage} vol - the image to show
     * @param {Bis_3DOrthogonalSlice.Bis2DImageSlice} orthoslice - the slice to show
     * @param {number} index - viewer index
     * @param {number} width - a characteristic width of the image to set default zoom (e.g. 2/3 of max image dimension in mm)
     * @param {number} depth - a characteristic depth of the image to set default camera thickness (e.g. 2.0*max image dimension in mm)
     * @returns {Bis_SubViewer} the subviewer collection object
     */
    createsliceview(renderer,vol,orthoslice,index,width,depth) {
        
        var plane=orthoslice.getplane();
        
        var scene = new THREE. Scene();
        var light = new THREE.AmbientLight(0xffffff);
        scene.add(light);
        scene.doubleSided=true;
        orthoslice.addtoscene(scene);
        
        var camera = new THREE.OrthographicCamera(-width,width,-width,width,0.01,2.0*depth);
        var lkv=orthoslice.positioncamera(camera);
        
        var controls = new BISCameraControls(camera,plane,lkv,renderer.domElement);
        controls.rotateSpeed = 10.0;
        controls.zoomSpeed = 1.0;
        controls.panSpeed = 5.0;
        controls.noZoom=false;
        controls.noPan=false;
        //
        controls.normViewport=this.computeviewport(index);
        return  {
            scene : scene,
            controls: controls,
            camera : camera,
        };
    }
    
    // ------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------
    
    /** deletes artifacts of oldobjectmap  (display elements)
     * Called when setting new image or new objectmap
     * or when changing the plane (Axial->Coronal->Sagittal)
     * So this.internal.objectmap is not set to null because it might be needed.
     * Set this to null from calling function if context requires it!!!
     * THIS IS DIFFERENT from orthogonal viewer which has no such complications
     */
    deleteoldobjectmap_artifacts() {

        let s=this.internal.objectmap;
        super.deleteoldobjectmap();
        this.internal.objectmap=s;
    }
    
    /** deletes artifacts of oldimage (display elements)
     * Called when setting new image
     * or when changing the plane (Axial->Coronal->Sagittal)
     * So this.internal.volume is not set to null because it might be needed.
     * Set this to null from calling function if context requires it!!!
     * THIS IS DIFFERENT from orthogonal viewer which has no such complications
     */
    deleteoldimage_artifacts() {
        super.deleteoldimage();
    }

    getmaxviewers() {
        return this.internal.numrows*this.internal.numcols;
    }

    renderloop() {
        
        var hasoverlay=false;
        if (this.internal.overlayslices!==null)
            hasoverlay=true;
        this.ensureviewersexist(hasoverlay);
        super.renderloop();
    }
    
    // ------------------------------------------------------------------------------------
    // Handle Resize
    // ------------------------------------------------------------------------------------
    /** handle window resize. Calls {@link ViewerLayoutElement}.handleresize
     * to most of the work and then adjusts the viewports        */
    handleresize() {

        super.handleresize();
        this.updateviewports(this.internal.numrows,this.internal.numcols);
        this.updateResizeObservers();
        this.drawlabels();
    }

    // ------------------------------------------------------------------------------------
    // Draw pieces of scene
    // updatescene() calls ensureviewersexist() and drawlabels()
    // ------------------------------------------------------------------------------------
    /** draw the labels (e.g. L,R, Axial/Coronal etc). Called when changing viewer size or layout */
    drawlabels() {
        
        if (this.internal.volume===null)
            return;
        
        let context=this.internal.layoutcontroller.context;
        let domwidth=this.internal.layoutcontroller.getviewerwidth();
        let domheight=this.internal.layoutcontroller.getviewerheight();
        let dw=domwidth;
        let dh=domheight;
        context.clearRect(Math.floor(this.cleararea[0]*dw),0,Math.floor(this.cleararea[1]*dw),dh);

        if (this.internal.showdecorations===true) {
            
            // Add R&L s
            let labels = [ [ 'A','P', 'I','S' ] ,
                           [ 'R','L', 'I','S' ] ,
                           [ 'R','L', 'P','A' ] ];
            let names  = [ 'Sagittal','Coronal','Axial'];
            let axes   = [ '-jk','-ik','-ij' ];
            let f = [ 0.98,0.02];
            
            
            let imageorientinvaxis = this.internal.volume.getOrientation().invaxis;
            let imageorientaxis = this.internal.volume.getOrientation().axis;
            
            context.font="12px Arial";
            context.fillStyle = "#dd7700";
            
            let numslices=this.internal.numrows*this.internal.numcols;
            let trueplane=imageorientinvaxis[this.internal.plane];
            let lab=labels[trueplane];
            let maxslice=this.internal.imagedim[this.internal.plane]-1;
            for (let i=0;i<numslices;i++) {
                
                let vp  =this.internal.subviewers[i].controls.normViewport;
                let sliceno=this.computeslice(i);


                if (sliceno>=0 && sliceno <=maxslice && (vp.x1-vp.x0)*domwidth>150) {
                    let xmin=Math.round((f[0]*vp.x0+f[1]*vp.x1)*domwidth);
                    let xmax=Math.round((f[0]*vp.x1+f[1]*vp.x0)*domwidth);
                    let ymid=Math.round( domheight*(1.0-0.5*(vp.y0+vp.y1)));
                    
                    context.textAlign='start';
                    context.textBaseline="middle";
                    context.fillText(lab[0],xmin,ymid);
                    context.textAlign='end';
                    context.fillText(lab[1],xmax,ymid);
                    
                    let ymin=Math.round((1.0-(f[0]*vp.y0+f[1]*vp.y1))*domheight);
                    let ymax=Math.round((1.0-(f[0]*vp.y1+f[1]*vp.y0))*domheight);
                    let xmid=Math.round( domwidth*(0.3*vp.x0+0.7*vp.x1));
                    
                    context.textAlign='end';
                    context.textBaseline="bottom";
                    context.fillText(lab[2],xmid,ymin);
                    
                    context.textBaseline="top";
                    context.fillText(lab[3],xmid,ymax);
                    
                    let name=names[trueplane]+axes[imageorientaxis[trueplane]]+'='+sliceno;
                    if (this.internal.maxnumframes>1)
                        name+=' (fr='+this.internal.frame+')';
                    context.textAlign='start';
                    context.textBaseline='bottom';
                    let xmid0=Math.round( domwidth*(0.8*vp.x0+0.2*vp.x1));
                    context.fillText(name,xmid0,ymin);
                } 
            }
        }
        this.drawcolorscale();
    }
    
    /** Called as part of render process to create new sub-viewers on demand
     * if number of rows/columns change demands it
     * @param {boolean} hasoverlay -- if true create overlay elements (in addition or just create these if they were not there)
     */
    ensureviewersexist(hasoverlay) {

        let numviewers=this.internal.numrows*this.internal.numcols;
        for (let i=0;i<numviewers;i++) {
            if (this.internal.slices[i]===null) {
                this.internal.slices[i]=bis3dOrthogonalSlice.create2dslice(this.internal.volume,this.internal.plane,1,false,true);
                this.internal.subviewers[i]=this.createsliceview(this.internal.layoutcontroller.renderer,this.internal.volume,this.internal.slices[i],i,this.internal.s_width,this.internal.s_depth);
            }
            if (hasoverlay && this.internal.objectmap!==null) {
                if (this.internal.overlayslices[i]===null) {
                    this.internal.overlayslices[i]=bis3dOrthogonalSlice.create2dslice(this.internal.objectmap,this.internal.plane,0,true,true);
                    let sl=this.getmmsl(i);
                    this.internal.overlayslices[i].setsliceinmm(this.internal.slices[i],sl,this.internal.frame,this.internal.objectmaptransferfunction);
                    this.internal.overlayslices[i].addtoscene(this.internal.subviewers[i].scene);
                }
            }
        }

        
        if (this.internal.lastzoom!==null) {
            // If setting new image = same size as old rezoom up
            this.zoomViewers(this.internal.lastzoom);
            this.internal.lastzoom=null;
        }
        

        
    }
    
    /** Main update function for coordinate changes or viewer reconfiguration */
    updatescene() {
        var numviewers=this.internal.numrows*this.internal.numcols;
        var hasoverlay=false;
        if (this.internal.overlayslices!==null)
            hasoverlay=true;
        this.ensureviewersexist(hasoverlay);

        let objmapframe=this.internal.frame;
        if (objmapframe>=this.internal.objectmapnumframes)
            objmapframe=this.internal.objectmapnumframes-1;

        let imageframe=this.internal.frame;
        if (imageframe>=this.internal.imagedim[3])
            imageframe=this.internal.imagedim[3]-1;
        
        for (var i=0;i<numviewers;i++) {
            var sl=this.computeslice(i);
            this.internal.slices[i].setsliceno(sl,imageframe,this.internal.imagetransferfunction);
            this.internal.slices[i].showdecorations(this.internal.showdecorations);
            if (hasoverlay && this.internal.overlayslices[i]!==null) {
                var slmm=this.getmmsl(i);
                this.internal.overlayslices[i].setsliceinmm(this.internal.slices[i],slmm,objmapframe,this.internal.objectmaptransferfunction);
            }
        }
        this.drawlabels();
        this.updateFrameChangedObservers();
    }
    
    /** Update viewports if rows or columns have changed */
    updateviewports(rows,cols) {
        
        if (this.internal.subviewers===null)
            return;
        
        var n=util.range(Math.round(rows||0),1,MAXROWS);
        var c=util.range(Math.round(cols||0),1,MAXCOLS);
        
        this.internal.numrows=n;
        this.internal.numcols=c;
        
        
        for (var index=0;index<this.internal.subviewers.length;index++) {
            if (this.internal.subviewers[index]!==null) {
                this.internal.subviewers[index].controls.normViewport=this.computeviewport(index);
                this.internal.subviewers[index].controls.reset();
            }
        }

        // GUI Update
        let data = this.internal.datgui.data;
        data.numrows=this.internal.numrows;
        data.numcols=this.internal.numcols;
        
        this.updatescene();
    }
    
    // ------------------------------------------------------------------------
    // Respond to sub-controllers
    // ------------------------------------------------------------------------
    
    /** handle update from {@link ColormapControllerElement} and update colormap observers
     * @param {BisF.ColorMapControllerPayload} input - definition of new transfer functions to use
     */
    updatetransferfunctions(input) {

        var dooverlay=false;
        if (this.internal.overlayslices!==null) {
            if ( this.internal.overlayslices[0]!==null ) {
                dooverlay=true;
            }
        }
        
        var pl=0;
        var numviewers=this.internal.numrows*this.internal.numcols;
        
        if (input.image!==null) {
            this.internal.imagetransferfunction=input.image;
            for (pl=0;pl<numviewers;pl++) {
                if (this.internal.slices[pl]!==null) {
                    this.internal.slices[pl].setnexttimeforce();
                }
            }
        }
        
        for (pl=0;pl<numviewers;pl++)
            this.internal.slices[pl].interpolate(input.interpolate);
        
        if (dooverlay) {
            if (input.objectmap!==null) {
                this.internal.objectmaptransferfunction=input.objectmap;
                this.internal.objectmaptransferinfo=input.functionalparams;
                for (pl=0;pl<numviewers;pl++) {
                    if (this.internal.overlayslices[pl]!==null)
                        this.internal.overlayslices[pl].setnexttimeforce();
                }
            }
            for (pl=0;pl<numviewers;pl++) {
                if (this.internal.overlayslices[pl]!==null)
                    this.internal.overlayslices[pl].interpolate(input.objinterpolate);
            }
        }

        //      this.handleresize();
        this.updatescene();
        this.updateColormapObservers(input);
        this.drawcolorscale();
    }


    connectedCallback() {
        this.connectedCallbackBase();
    }
    
    
    // ------------------------------------------------------------------------
    // set image
    // ------------------------------------------------------------------------

    
    /** Sets new image (and deletes objectmap if present)
     * @param {BisImage} volume - new image
     */
    setimage(volume) {

        this.disable_renderloop();
        this.playStopMovie(false);
        
        let samesize=false;
        // clear old info
        if (this.internal.volume!==null) {
            if (volume!==null)
                samesize=this.internal.volume.hasSameSizeAndOrientation(volume);
        }

        if (samesize)
            this.internal.lastzoom=this.internal.subviewers[0].controls.getZoomFactor();
        
        if (this.internal.volume!==null) {
            this.deleteoldimage_artifacts();
            this.internal.objectmap=null;
        }

        this.internal.volume=volume;

        if (samesize===false) {
            this.internal.imagedim=volume.getDimensions();
            // TODO: One day do proper 5D
            this.remapDimensionsTo4D(this.internal.imagedim);
            this.internal.plane=2;
            this.internal.imagespa=volume.getSpacing();
            this.internal.firstslice=Math.round(this.internal.imagedim[2]/2);
            this.internal.increment=1;
            this.internal.maxnumframes=this.internal.imagedim[3];
        }
        let imagerange=volume.getIntensityRange();
        this.internal.imagetransferfunction=util.mapstepcolormapfactory(imagerange[0],imagerange[1],255);

        this.setimageplane(this.internal.plane,true);
        if (samesize===false)
            this.handleresize();

        this.updateImageChangedObservers('image');
    }
    
    // ------------------------------------------------------------------------------------
    //  this is almost like set image 
    // ------------------------------------------------------------------------------------
    /** Change the image plane (i.e. switch viewer to show different orientation slices)
     * @param {number} pl - plane: 0=YZ, 1=XZ,2=XY
     * @param {boolean} force - if true, force change even if old plane was the same. (setimage uses this)
     */
    setimageplane(pl,force) {

        
        force = force || false;
        if (pl!==0)
            pl = pl || this.internal.plane;
        
        if (force===false && pl===this.internal.plane) {
            return;
        }

        let obj=this.internal.objectmap;
        this.deleteoldimage_artifacts();
        this.internal.objectmap=obj;

        
        // CMAP
        const self=this;
        //this.internal.cmapcontroller = bisColormapController(this.internal.volume,updatetransferfunctions);
        var fn=function(i) { self.updatetransferfunctions(i); };
        
        if (this.internal.cmapcontroller===null) {
            let colormapid=this.getAttribute('bis-colormapeditorid');
            this.internal.cmapcontroller=document.querySelector(colormapid);
        }
        this.internal.cmapcontroller.setimage(this.internal.volume,fn,1.0);
        
        
        this.internal.plane=pl;
        
        var imagesize=this.internal.volume.getImageSize();
        var d=imagesize[2];
        if (this.internal.plane===0) {
            if (imagesize[1]>imagesize[2])
                d=imagesize[1];
        } else if (this.internal.plane===1) {
            if (imagesize[0]>imagesize[2])
                d=imagesize[0];
        } else if (this.internal.plane===2) {
            if (imagesize[1]>imagesize[0])
                d=imagesize[1];
            else
                d=imagesize[0];
        }
        
        this.internal.s_width=Math.round(d*0.6);
        this.internal.s_depth=Math.round(imagesize[this.internal.plane]*2.0);
        
        this.internal.slices=new Array(MAXVIEWERS);
        this.internal.subviewers = new Array(MAXVIEWERS);
        for (var i=0;i<MAXVIEWERS;i++) {
            this.internal.slices[i]=null;
            this.internal.subviewers[i]=null;
        }

        this.enable_renderloop();
        this.renderloop();
        
        //this.internal.layoutcontroller.setelementdimensions(domparent[0].clientWidth);
        this.drawlabels();
        
        this.createdatgui();
        if (this.internal.objectmap!==null) {
            this.setobjectmapplane(this.internal.plane,true);
        }
    }
    
    // ------------------------------------------------------------------------
    // set objectmap
    // ------------------------------------------------------------------------
    /** Sets new objectmap (and deletes old objectmap if present)
     * @param {BisImage} ovolume - new objectmap
     * @param {boolean} plainmode - if true this is an objectmap so only create opacity controls as opposed to full functional colormapping
     * @param {colormapmode} colormap type - "Objectmap", "Overlay","Overlay2","Red","Green","Blue" 
     */
    setobjectmap(ovolume,plainmode,colormapmode) {

        colormapmode=colormapmode || "Auto";
        plainmode = plainmode || false;
        if (this.internal.volume===null) {
            webutil.createAlert('can not load objectmap if no image is in memory',true);
            return;
        }
        
        /*var dim=ovolume.getDimensions();
          var sum=0;
          for (var i=0;i<=2;i++)
          sum+=Math.abs(dim[i]-this.internal.imagedim[i]);
          if (sum>0) {
          window.alert('bad objectmap -- dimensions != image dimensions');
          return;
          }*/
        this.disableClustering();
        
        this.internal.objectmap=ovolume;
        let ospa=this.internal.objectmap.getSpacing();
        let odim=this.internal.objectmap.getDimensions();
        this.remapDimensionsTo4D(odim);
        
        for (let i=0;i<=2;i++) {
            var ci=(this.internal.imagedim[i])*0.5*this.internal.imagespa[i];
            var co=(odim[i])*0.5*ospa[i];
            this.internal.objectmapshift[i]=co-ci;
        }
        this.internal.objectmapnumframes=odim[3];
        if (this.internal.objectmapnumframes>this.internal.maxnumframes) {
            this.internal.maxnumframes=this.internal.objectmapnumframes;
        }

        // Make these update next time to handle overlay
        var numviewers=this.internal.numrows*this.internal.numcols;
        for (let pl=0;pl<numviewers;pl++) {
            if (this.internal.slices[pl]!==null)
                this.internal.slices[pl].setnexttimeforce();
        }


        if (this.internal.maxnumframes>this.internal.imagedim[3]) {
            this.createdatgui();
        }
        this.setobjectmapplane(this.internal.plane,true,plainmode,colormapmode);
        this.updateImageChangedObservers('overlay');
    }
    
    /** Change the image plane of the objectmap (called from setimageplane and setobjectmap)
     * @param {number} pl - plane: 0=YZ, 1=XZ,2=XY
     * @param {boolean} force - if true, force change even if old plane was the same. (setimage uses this)
     * @param {boolean} plainmode - if true this is an objectmap so only create opacity controls as opposed to full functional colormapping
     * @param {colormapmode} colormap type - "Objectmap", "Overlay","Overlay2","Red","Green","Blue" 
     */
    setobjectmapplane(pl, force,plainmode,colormapmode) {
        
        force = force || false;
        plainmode = plainmode || false;
        if (pl!==0)
            pl = pl || this.internal.plane;
        
        if (force===false && pl===this.internal.plane)
            return;
        
        this.deleteoldobjectmap_artifacts();
        
        this.internal.overlayslices=new Array(MAXVIEWERS);
        for (let i=0;i<MAXVIEWERS;i++) {
            this.internal.overlayslices[i]=null;
        }
        this.ensureviewersexist(true);

        this.internal.cmapcontroller.addobjectmap(this.internal.objectmap,plainmode,colormapmode);
        this.updatescene();
    }
    
    // ------------------------------------------------------------------------
    // clear objectmap (called from outside)
    // ------------------------------------------------------------------------
    /** clears the objectmap.  */
    clearobjectmap() {
        if (this.internal.objectmap===null)
            return;

        this.deleteoldobjectmap_artifacts();
        this.internal.objectmap=null;
        this.internal.cmapcontroller.removeobjectmap();     
        this.internal.objectmap=null;
    }
    
    // ------------------------------------------------------------------------
    // Main outside update
    // ------------------------------------------------------------------------
    
    /** Set viewer slice info
     * @param {number} beginslice - slice to show in viewer 0
     * @param {number} increment - offset from viewer to viewer
     * @param {number} frame - frame for all viewers
     */
    setslices(beginslice,increment,frame) {
        beginslice= Math.floor(beginslice || 0);
        increment = Math.floor(increment || 1);
        frame = Math.floor(frame || 0);
        this.internal.firstslice=util.range(beginslice,0,this.internal.imagedim[this.internal.plane]-1);
        this.internal.increment=util.range(increment,-20,20);
        this.internal.frame= frame;

        // GUI Update
        let data = this.internal.datgui.data;
        data.first=this.internal.firstslice;
        data.increment=this.internal.increment;
        data.tcoord=this.internal.frame;
        
        this.updatescene();
    }

    

    /** set the frame 
     * @param{integer} frame*/
    setframe(fr) {

        if (!this.internal.framecontroller)
            return;
        
        let num=this.internal.maxnumframes;
        if (fr<0)
            fr=num-1;
        else if (fr>=num)
            fr=0;
        
        this.setslices(this.internal.firstslice,this.internal.increment,fr);
        let data = this.internal.datgui.data;
        data.tcoord=this.internal.frame;

        this.internal.framecontroller.updateDisplay();
        this.updateFrameChangedObservers();
    }

    /** @return {number} the current frame} */
    getframe() {
        return this.internal.frame;
    }
    // ------------------------------------------------------------------------
    // Create GUI
    // ------------------------------------------------------------------------
    
    /** create dat.gui interface for core controls. This gets drawn in
     * the corecontrols of the linked {@link ViewerLayoutElement} element. This gui is recreated each time a new image is set.
     */
    createdatgui() {
        
        const self=this;

        let base_widget=this.internal.layoutcontroller.getcorecontrols(this.is_slave_viewer);
        
        if (this.internal.datgui.gui!==null) {
            base_widget.empty();
        }
        
        var names  = [ 'Sagittal','Coronal','Axial'];
        var dpname = [ '','', '' ];
        var imageorientinvaxis = this.internal.volume.getOrientation().invaxis;
        
        for (var pl=0;pl<=2;pl++) {
            var trueplane=imageorientinvaxis[pl];
            dpname[pl]=names[trueplane];
        }
        
        var data = this.internal.datgui.data;
        data.displaymode = dpname[this.internal.plane];
        data.first = this.internal.firstslice;
        data.numrows = this.internal.numrows;
        data.numcols = this.internal.numcols;
        data.increment = this.internal.increment;
        data.tcoord = this.internal.frame;
        data.decorations = true;
        data.rate=20;
        data.playing=false;

        this.internal.displaymodes=dpname;
        
        var gui = new dat.GUI({autoPlace: false, width:this.internal.domextra});
        base_widget.append(gui.domElement);
        
        
        var f1 = gui.addFolder('Core');
        this.internal.corefolder=f1;
        var dmode=f1.add(data,'displaymode',dpname).name("Plane");
        dmode.onChange(function(val) {
            var ind=dpname.indexOf(val);
            self.setimageplane(ind,false);
        });

        var vpchange = function() {
            self.updateviewports(data.numrows,data.numcols);
        };
        var rowcoord=f1.add(data,'numrows',1,MAXROWS).name("Rows").step(1);
        var colcoord=f1.add(data,'numcols',1,MAXCOLS).name("Columns").step(1);
        rowcoord.onChange(vpchange);
        colcoord.onChange(vpchange);
        
        var coordchange = function() {
            self.setslices(data.first, data.increment,data.tcoord);
        };
        //        let moviefolder=null;
        this.internal.play_movie_controller=null;
        
        var xcoord=f1.add(data,'first',0,this.internal.imagedim[this.internal.plane]-1).name("First").step(1);
        var ycoord=f1.add(data,'increment').name("Increment").step(1);
        xcoord.onChange(coordchange);
        ycoord.onChange(coordchange);

        /*if (this.internal.maxnumframes>1) {
            this.internal.framecontroller=f1.add(data,'tcoord',0,this.internal.maxnumframes-1).name("Frame");
            this.internal.framecontroller.onChange(coordchange);
            moviefolder = gui.addFolder('Movie');
        }*/

        data.decorations=self.internal.showdecorations;
        var deco=f1.add(data, 'decorations').name("Labels");
        deco.onChange(function(val) {
            self.internal.showdecorations=val;
            self.updatescene();
        });
        f1.open();
        this.internal.cmapcontroller.creategui(gui);
        this.internal.datgui.gui=gui;
        webutil.removedatclose(gui);
        
        var bbar=$("<div></div>");
        bbar.css({'margin': '10px'});
        base_widget.append(bbar);
        
        webutil.createbutton({ name : "Reset Slices",
                               type : "info",
                               tooltip : "This resets the viewer to default camera positions and zoom level",
                               position : "bottom",
                               parent : bbar
                             }).click(function(e) {
                                 e.preventDefault();
                                 self.resetViewers();
                             });

        let fn3=function(e) {  e.preventDefault();   self.zoomViewers(0.9);   };
        let fn4=function(e) {  e.preventDefault();   self.zoomViewers(1.1);   };
        
        webutil.createbutton({ name : 'Z-',
                               type : "info",
                               tooltip : 'Zoom out',
                               css : { 'margin-left' : '8px' },
                               position : "left",
                               parent : bbar }).click(fn4);
        webutil.createbutton({ name : 'Z+',
                               tooltip : 'Zoom in',
                               type : "info",
                               css : { 'margin-left' : '8px' },
                               position : "left",
                               parent : bbar }).click(fn3);
        webutil.createbutton({ name : '?',
                               tooltip : 'Info about displayed image(s)',
                               type : "info",
                               css : { 'margin-left' : '8px' },
                               position : "left",
                               parent : bbar }).click( function() { self.viewerInformation();});


        //        if (moviefolder!==null)
        //this.createmoviecontrols(moviefolder);
        bbar.tooltip();
    }

    /** dummy function */
    updatemousecoordinates() { }

        /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {
        
        let obj=super.getElementState(storeImages);
        obj.data=JSON.parse( JSON.stringify( this.internal.datgui.data ) );
        return obj;
        
    }

    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null) {

        if (dt===null)
            return;

        super.setElementState(dt);

        let sanedata=JSON.parse(JSON.stringify(this.internal.datgui.data));
        for (let attr in dt.data) {
            if (sanedata.hasOwnProperty(attr)) {
                sanedata[attr] = dt.data[attr];
            } 
        }


                    
        // The middle -- set the parameters
        try {
            let ind=this.internal.displaymodes.indexOf(sanedata['displaymode']);
            this.setimageplane(ind,false);
            
            
            this.internal.showdecorations=sanedata['decorations'];
            this.internal.datgui.data.decorations=this.internal.showdecorations;
            
            this.updateviewports(parseInt(sanedata['numrows']),
                                 parseInt(sanedata['numcols']));
            
            this.setslices( parseInt(sanedata['first']),
                            parseInt(sanedata['increment']),
                            parseInt(sanedata['tcoord']));


            
            
        } catch(e) {
            console.log(e.stack,e);
        }

        this.setElementStateCameras(dt);
        
        // The end update the controllers
        setTimeout( () => {
            let gui=this.internal.corefolder || null;
            if (gui!==null) {
                for (let ia=0;ia<gui.__controllers.length;ia++) {
                    gui.__controllers[ia].updateDisplay();
                }
            }
        },100);
    }

}


webutil.defineElement('bisweb-mosaicviewer', MosaicViewerElement);



