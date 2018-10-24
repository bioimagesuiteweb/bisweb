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

/* global document */

"use strict";


const THREE = require('three');
const util=require('bis_util');
const BISCameraControls = require('bis_3dorthographiccameracontrols');
const bis3dOrthogonalSlice=require('bis_3dorthogonalslice');
const bisCrossHair=require('bis_3dcrosshairgeometry');
const webutil=require('bis_webutil');
const $=require('jquery');
const bootbox=require('bootbox');
const BaseViewerElement=require('bisweb_baseviewerelement');

import dat from 'dat.gui';



/**
 *
 * A web element that creates a Orthogonal Viewer inside a {@link ViewerLayoutElement}.
 *  It also takes a pointer to a {@link ColormapControllerElement} and draws it inside
 *  the viewer controls.
 *
 * @example
 *    <bisweb-orthogonalviewer
 *      id="viewer"
 *      bis-layoutwidgetid="#viewer_layout"
 *      bis-colormapeditorid="#viewer_cmap">
 *      bis-otherviewer="#viewer0">
 *    </bisweb-orthogonalviewer>
 *
 * Attributes:
 *      bis-layoutwidget : id of the ViewerLayoutElement to draw in
 *      bis-colormapeditorid : id of the ColormapControllerElement
 *            that will be attached to the viewer controls
 *      bis-otherviewer : id of the master viewer (this becomes a slave!)
 */
class OrthogonalViewerElement extends BaseViewerElement {
    
    constructor() {

        super();

        this.internal.simplemode=false;
        this.internal.rendermode=8;
        this.internal.origviewports = [
            // Slices=0
            [ { x0:0.52, y0:0.55, x1:0.97,  y1:1.0},  { x0:0.03, y0:0.55, x1:0.48, y1:1.0},
              { x0:0.03, y0:0.09, x1:0.48,  y1:0.54}, { x0:0.99, y0:0.0,  x1:0.995, y1:0.01 } , { x0:0.0,y0:0.0,x1:0.0,y1:0.0 } ],
            // Sagittal=1
            [ { x0:0.05, y0:0.09, x1:0.95, y1:0.99},  { x0:0.0, y0:0.0,  x1:0.01, y1:0.01},
              { x0:0.0, y0:0.3,  x1:0.01, y1:0.31},  { x0:0.0, y0:0.6,  x1:0.01, y1:0.61}, { x0:0.0,y0:0.0,x1:0.0,y1:0.0 }],
            // Coronal=2
            [ { x0:0.0, y0:0.0,  x1:0.01, y1:0.01}, { x0:0.05, y0:0.09, x1:0.95, y1:0.99},
              { x0:0.0, y0:0.3,  x1:0.01, y1:0.31},  { x0:0.0, y0:0.6,  x1:0.01, y1:0.61}, { x0:0.0,y0:0.0,x1:0.0,y1:0.0 }],
            // Axial=3
            [ { x0:0.0, y0:0.0,  x1:0.01, y1:0.01}, { x0:0.0, y0:0.3,  x1:0.01, y1:0.31},
              { x0:0.05, y0:0.09, x1:0.95, y1:0.99},   { x0:0.0, y0:0.6,  x1:0.01, y1:0.61}, { x0:0.0,y0:0.0,x1:0.0,y1:0.0 }],
            // 3D +Slices=4
            [ { x0:0.6, y0:0.81, x1:0.79, y1:1.0},  { x0:0.0, y0:0.81, x1:0.19, y1:1.0},
              { x0:0.0, y0:0.2, x1:0.19,  y1:0.39},  { x0:0.21, y0:0.0,  x1:1.0, y1:0.8} , { x0:0.0,y0:0.0,x1:0.0,y1:0.0 }],
            // 3D Only=5
            [ { x0:0.0, y0:0.0,  x1:0.01, y1:0.01}, { x0:0.0, y0:0.3,  x1:0.01, y1:0.31},
              { x0:0.0, y0:0.6,  x1:0.01, y1:0.61}, { x0:0.01, y0:0.01, x1:1.0, y1:1.0}, { x0:0.0,y0:0.0,x1:0.0,y1:0.0 }],
            // Conn 1=6
            [ { x0:0.01, y0:0.06, x1:0.26, y1:0.32},  { x0:0.01, y0:0.38, x1:0.26, y1:0.63},
              { x0:0.01, y0:0.74, x1:0.26,  y1:0.99},  { x0:0.29, y0:0.01,  x1:0.99, y1:0.99},  { x0:0.0,y0:0.0,x1:0.0,y1:0.0 }],
            // Conn 2=7
            [ { x0:0.05, y0:0.01, x1:0.31, y1:0.27},  { x0:0.37, y0:0.01, x1:0.63, y1:0.27},
              { x0:0.69, y0:0.0, x1:0.95,  y1:0.27},  { x0:0.6, y0:0.30,  x1:0.99, y1:0.99 }, { x0:0.01, y0:0.30,  x1:0.59, y1:0.99}],
            // Conn 3=8
            [ { x0:0.05, y0:0.01, x1:0.31, y1:0.27},  { x0:0.37, y0:0.01, x1:0.63, y1:0.27},
              { x0:0.69, y0:0.0, x1:0.95,  y1:0.27},  { x0:0.99, y0:0.0,  x1:0.995, y1:0.01}, { x0:0.00,y0:0.29,x1:1.0,y1:1.0}],
            // Simple Mode=9
            [ { x0:0.05, y0:0.10, x1:0.31, y1:0.9},  { x0:0.37, y0:0.10, x1:0.63, y1:0.90},
              { x0:0.69, y0:0.10, x1:0.95, y1:0.9},  { x0:0.99, y0:0.0,  x1:0.995, y1:0.01}, { x0:0.99, y0:0.0,  x1:0.995, y1:0.01} ]

        ];


        this.internal.viewports = this.internal.origviewports;
        
        this.internal.slicecoord=[ 0,0,0,0];
        this.internal.objectmapshift=[ 0,0,0 ];
        
        this.internal.subviewers=[ null,null,null,null ];
        this.internal.slices=[ null,null,null,null ];
        this.internal.overlayslices=[ null,null,null,null ];
        this.internal.moviefolder=null;
        this.internal.arrowbuttons=[null,null,
                                    null,null,
                                    null,null,
                                    null,null,null,null,null,null];

        this.internal.midline=null;
        this.internal.midline2=null;
        this.internal.midlinemessage=null;
        this.internal.midlinepresent=false;
        this.internal.midlinedata = {
            left : -1,
            origx: -1,
        };
        this.internal.displaymodes=null;
        this.setObjectMapFunction=null;
    }
    
    /** get the coordinates of the overlay given current image coordinates.
        This centers the two images if they have different dimensions as needed
        @returns {array} [x,y,z] coordinates in mm
    */
    getobjectmapcoordinates() {
        var c=[0,0,0];
        for (var i=0;i<=2;i++) {
            c[i]=this.internal.slicecoord[i]*this.internal.imagespa[i]+this.internal.objectmapshift[i];
        }
        return c;
    }

    /** get the mm coordinates of the current image
        @returns {array} [x,y,z] coordinates in mm
    */
    getmmcoordinates() {
        var c=[0,0,0,0];
        for (var i=0;i<=2;i++) {
            c[i]=this.internal.slicecoord[i]*this.internal.imagespa[i];
        }
        c[3]=this.internal.slicecoord[3];
        return c;
    }
    
    // ------------------------------------------------------------------------------------
    // Create scenes,cameras etc for 3 slice views
    // ------------------------------------------------------------------------------------
    /** create one of the three slice views of the viewer
     * @param {ThreeJS-WebGLRenderer} renderer - the underlying 3D rendere object
     * @param {BisImage} vol - the image to show
     * @param {Bis_3DOrthogonalSlice.Bis2DImageSlice} orthoslice - the slice to show
     * @param {number} width - a characteristic width of the image to set default zoom (e.g. 2/3 of max image dimension in mm)
     * @param {number} depth - a characteristic depth of the image to set default camera thickness (e.g. 2.0*max image dimension in mm)
     * @returns {Bis_SubViewer} the subviewer collection object
     */
    createsliceview(renderer,vol,orthoslice,width,depth) {
        
        var plane=orthoslice.getplane();
        this.internal.slicecoord[plane]=orthoslice.getsliceno();
        
        var scene = new THREE. Scene();
        var light = new THREE.AmbientLight(0xffffff);
        scene.add(light);
        scene.doubleSided=true;
        orthoslice.addtoscene(scene);
        
        var camera = new THREE.OrthographicCamera(-width,width,-width,width,0.01,2.0*depth);
        var lkv=orthoslice.positioncamera(camera);
        
        var controls = new BISCameraControls(camera,plane,lkv,renderer.domElement);
        controls.rotateSpeed = 10.0;
        if (this.internal.simplemode)
            controls.zoomSpeed = 0.5;
        else
            controls.zoomSpeed = 1.0;
        controls.panSpeed = 5.0;
        controls.noZoom=false;
        controls.noPan=false;
        //
        controls.normViewport=this.internal.viewports[1][plane];
        
        
        return  {
            scene : scene,
            controls: controls,
            camera : camera,
        };
    }
    
    // ------------------------------------------------------------------------------------
    // Create scenes,cameras etc for card views
    // ------------------------------------------------------------------------------------
    /** create the 3D view  the viewer
     * @param {ThreeJS-WebGLRenderer} renderer - the underlying 3D rendere object
     * @param {BisImage} vol - the image to show
     * @param {Bis_3DOrthogonalSlice.Bis3DCardSlice} cardslice - the slice to show
     * @param {number} width - a characteristic width of the image to set default zoom (e.g. 2/3 of max image dimension in mm)
     * @param {number} depth - a characteristic depth of the image to set default camera thickness (e.g. 2.0*max image dimension in mm)
     * @returns {Bis_SubViewer} the subviewer collection object
     */
    createcardview(ren,vol,cardslice,width,depth ) {
        
        var scene = new THREE.Scene();
        var light = new THREE.AmbientLight(0xffffff);
        scene.add(light);
        scene.doubleSided=true;
        
        cardslice.addtoscene(scene);
        
        var camera = new THREE.OrthographicCamera(-width,width,-width,width,0.01,2.0*depth);
        var lkv=cardslice.positioncamera(camera);
        
        var controls = new BISCameraControls(camera,3,lkv,ren.domElement);
        controls.rotateSpeed = 4.0;
        if (this.internal.simplemode)
            controls.zoomSpeed = 3.0;
        else
            controls.zoomSpeed = 1.0;
        controls.panSpeed = 5.0;
        controls.noZoom=false;
        controls.noPan=false;
        controls.normViewport=this.internal.viewports[1][3];
        
        var wd=this.internal.imagespa[0] * 4;
        
        if (!this.internal.simplemode) {
            var origin=new THREE.Mesh(bisCrossHair.createcrosshair(wd,this.internal.imagespa[0],false), 
                                      new THREE.MeshBasicMaterial( {color: 0xffffff, wireframe:false}));
            scene.add(origin);
        }
        
        return {
            scene : scene,
            camera : camera,
            controls : controls,
        };
    }
    
    // ------------------------------------------------------------------------------------
    // Draw pieces of scene
    // updatescene() calls drawcorsshairs() which calls drawtext()
    // ------------------------------------------------------------------------------------
    /** draw text on 2d canvas showing current location and intensity values */
    drawtext() {
        
        if (this.internal.showdecorations===false)
            return;
        
        if (this.internal.volume===null) 
            return;
        
        if (this.internal.simplemode)
            return;

        let fullwidth=this.internal.layoutcontroller.getviewerwidth();
        let dw=fullwidth*this.cleararea[1];
        
        if (dw<200)
            return;

        let frame=this.internal.slicecoord[3];
        let imageframe=frame;
        let objmapframe=frame;
        if (imageframe>=this.internal.imagedim[3])
            imageframe=this.internal.imagedim[3]-1;
        let imagecoord=[ this.internal.slicecoord[0],
                         this.internal.slicecoord[1],
                         this.internal.slicecoord[2],
                         imageframe ];
                       

        
        let value=util.scaledround(this.internal.volume.getVoxel(imagecoord),100);
        if (this.internal.objectmap!==null) {
            let newc=this.getobjectmapcoordinates();
            let coord=[ 0,0,0,0];


            if (objmapframe>=this.internal.objectmapnumframes)
                objmapframe=this.internal.objectmapnumframes-1;
            coord[3]=objmapframe;
            for (let i=0;i<=2;i++)
                coord[i]=Math.floor(newc[i]/this.internal.objectmapspa[i]);
            let v2=util.scaledround(this.internal.objectmap.getVoxel(coord),100);

            let sum=0.0;
            for (let i=0;i<=3;i++)
                sum+=Math.abs(imagecoord[i]-coord[i]);
            sum+=Math.abs(this.internal.objectmapnumframes-this.internal.imagedim[3]);

            if (sum>0) {
                if (this.internal.objectmapnumframes<2 && this.maxnumframes<2)
                    coord.splice(3,1);
                value=value+', Ovr: ('+coord.join(',')+')='+v2;
            } else {
                value=value+', Ovr:'+v2;
            }
        }

        let s="";
        if (this.is_slave_viewer)
            s="V2:";
        if (this.slave_viewer!==null)
            s="V1:";
        if (this.internal.imagedim[3]<2)
            imagecoord.splice(3,1);
        s=s+' Img ('+imagecoord.join(',')+') ='+value;


        var dh=this.internal.layoutcontroller.getviewerheight();
        var y0=0.95*dh;
        
        var context=this.internal.layoutcontroller.context;
        var fnsize=webutil.getfontsize(context.canvas);

        let l=800/40; 
        let l2=dw/s.length;
        let r=(l2/l);
        
        if (r<1.0)
            fnsize=Math.round(r*fnsize);
        
        context.font=fnsize+"px Arial";
        context.fillStyle = "#dddddd";
        context.clearRect(this.cleararea[0]*fullwidth+2,y0,0.5*dw-4,dh-y0);
        context.textAlign="left";
        context.fillText(s,(this.cleararea[0]+0.01)*fullwidth,0.99*dh);
        
    }

    getViewerCrossHairs() { return this.internal.slicecoord; }

    
    /** move the crosshairs to correct locations and then call drawtext */
    drawcrosshairs()  {
        
        if (this.internal.volume===null) 
            return;
        
        for (var i=0;i<=2;i++) 
            this.internal.slices[i].drawcrosshairs(this.internal.slicecoord);
        
        // Update Dat.GUI
        if (this.internal.datgui.gui !== null) {
            this.internal.datgui.data.xcoord = this.internal.slicecoord[0];
            this.internal.datgui.data.ycoord = this.internal.slicecoord[1];
            this.internal.datgui.data.zcoord = this.internal.slicecoord[2];
            this.internal.datgui.data.tcoord = this.internal.slicecoord[3];
            var gui=this.internal.datgui.coords;
            
            if (gui!==null) {
                for (var ia=0;ia<gui.__controllers.length;ia++) {
                    gui.__controllers[ia].updateDisplay();
                }
            }
        }
        this.drawtext();
    }

    /** update the display of the overlay/objectmap to current coordinates and
     * color transfer function
     */
    updateobjectmapdisplay() {
        
        let objcoord=this.getobjectmapcoordinates();
        let frame=this.internal.slicecoord[3];
        let objmapframe=frame;
        if (objmapframe>=this.internal.objectmapnumframes)
            objmapframe=this.internal.objectmapnumframes-1;
        
        for (var pl=0;pl<=2;pl++) {
            if (this.internal.overlayslices[pl]!==null) {
                this.internal.overlayslices[pl].setsliceinmm(this.internal.slices[pl],objcoord[pl],
                                                             objmapframe,this.internal.objectmaptransferfunction);
                this.internal.overlayslices[3].updatecoordinatesinmm(this.internal.slices[pl],pl);
            }
        }
    }
    
    /** main update function -- updates slice views then calls updateobjectmapdisplay and drawcrosshairs
     * and then updates mouse observers. This is the place where the 
     * {@link Bis_3dOrthograpicCameraControls} calls back in. Also update mouse observers.
     * @param {array} coords - [ x,y,z ] array with current position in mm
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     * @param {number} mousestate - 0=click 1=move 2=release
     * @param {Boolean} force - if true overrides this.internal.lockcursor blocks
     */
    updatescene(coords, plane,mousestate,force=false) {

        if (coords.length<4) {
            coords.push(this.getframe());
        }
        
        if (this.internal.lockcursor && force===false)
            return;

        if (this.internal.slices===null)
            return;

        if (this.internal.slices[0]===null)
            return;
        
        if (mousestate!==2) {

            if (coords[3]===undefined || coords[3]===null)
                coords[3]=0;
            
            let sl= [ util.range(Math.round(coords[0]/this.internal.imagespa[0]),0,this.internal.imagedim[0]-1),
                      util.range(Math.round(coords[1]/this.internal.imagespa[1]),0,this.internal.imagedim[1]-1),
                      util.range(Math.round(coords[2]/this.internal.imagespa[2]),0,this.internal.imagedim[2]-1),
                      util.range(Math.floor(coords[3]),0,this.internal.maxnumframes-1) ];

            this.internal.slicecoord[3]=sl[3];
            if (plane>=0 && plane<=2) 
                sl[plane]=this.internal.slicecoord[plane];
            
            var old=[0,0,0],pl=0;
            for (pl=0;pl<=2;pl++) {
                let imgframe=sl[3];
                if (imgframe>=this.internal.imagedim[3])
                    imgframe=this.internal.imagedim[3]-1;
                this.internal.slices[pl].showdecorations(this.internal.showdecorations);
                old[pl]=this.internal.slicecoord[pl];
                this.internal.slicecoord[pl]=this.internal.slices[pl].setsliceno(sl[pl],imgframe,
                                                                                 this.internal.imagetransferfunction);
                this.internal.slices[pl].updatecameraclip(this.internal.subviewers[pl].camera,
                                                          this.internal.maxspa*0.5);
                if (old[pl]!==this.internal.slicecoord[pl]) {
                    this.internal.slices[3].updatecoordinates(pl);
                }
            }
            this.updateobjectmapdisplay();
            this.drawcrosshairs();
        }
        if (this.internal.mouseobservers.length===0)
            return;
        
        if (mousestate === undefined)
            mousestate=-1;
        var mm=this.getmmcoordinates();
        this.updateMouseObservers(mm,plane,mousestate);
        this.updateFrameChangedObservers();
    }

    /** create arrow buttons
     * @param {JQueryWidget} base - the widget to add these too 
     */
    createarrowbuttons(base,fontsize) {

        if (this.internal.simplemode)
            return fontsize;

        let fn=Math.round(fontsize*2);
        if (fn>30)
            fn=30;
        else if (fn<20)
            fn=20;


        if ( this.internal.arrowbuttons[0]!==null) {
            for (let ind=0;ind<=11;ind++) {
                this.internal.arrowbuttons[ind].css({'font-size': `${fn}px`});
            }
            return fn;
        }
        const self=this;

        let symbols=[ 'glyphicon glyphicon-chevron-left',
                      'glyphicon glyphicon-pause',
                      'glyphicon glyphicon-play',
                      'glyphicon glyphicon-chevron-right',
                      'glyphicon glyphicon-fast-backward',
                      'glyphicon glyphicon-fast-forward',
                    ];
        

        let arrowcallback=function(e) {
            let elem=$(e.target);
            elem.css({'background-color':'#000000'});

            let index=parseInt(elem.attr('index')) || 0;
            const data = self.internal.datgui.data;
            
            if (index<=6 || index===9) {
                
                let increase=1;
                if (index%2===0)
                    increase=-1;
                let md=3;
                if (index<6) 
                    md=Math.floor(index/2);
                

                if (md===0) {
                    data.xcoord+=increase;
                } else if (md===1) {
                    data.ycoord+=increase;
                } else if (md===2) {
                    data.zcoord+=increase;
                } else if (md===3) { 
                    data.tcoord+=increase;
                    if (data.tcoord<0)
                        data.tcoord=self.internal.maxnumframes-1;
                    else if (data.tcoord>=self.internal.maxnumframes)
                        data.tcoord=0;
                }
                let c = [ data.xcoord, data.ycoord, data.zcoord,data.tcoord ];
                self.setcoordinates(c);
            } else if (index>9) {
                // rate
                let rate = data.rate || 20;
                if (index===11)
                    rate+=5;
                else
                    rate-=5;
                if (rate<5)
                    rate=5;
                else if (rate>50)
                    rate=50;
                data.rate=rate;
            } else {
                self.playStopMovie(index===8);
            }

            setTimeout( ()=> { elem.css({'background-color':'#444444'}); },100);

        };
    
        
        for (let ind=0;ind<=11;ind++) {
            let symindex=0;
            if (ind<6) {
                if (ind%2===1)
                    symindex=3;
            } else {
                symindex=ind-6;
            }
            let a=`<span index="${ind}" class="${symbols[symindex]}"></span>`;
            this.internal.arrowbuttons[ind]=$(a);
            this.internal.arrowbuttons[ind].css({'font-size': `${fn}px`,
                                                 'left': '100px',
                                                 'top' : '0px',
                                                 'padding' : '3px',
                                                 'border-radius' : '10px',
                                                 'background-color' : '#444444',
                                                 'color' : '#cc6600',
                                                 'position' : 'absolute',
                                                 'z-index' : '20',
                                                 'visibility' : 'hidden'});

            base.append(this.internal.arrowbuttons[ind]);

            this.internal.arrowbuttons[ind].click( (e) => {
                e.preventDefault(); // cancel default behavior
                arrowcallback(e);
            });
                


        }
        return fn;
    }

    hidearrowbuttons(beg=0) {
        for (let i=beg;i<=11;i++) {
            if (this.internal.arrowbuttons[i])
                this.internal.arrowbuttons[i].css({'visibility':'hidden'});
            }
    }

    // ---------- Draggable Separator -------------- -------------- --------------

    handleSeparator(e,mode,modifyCallbacks) {

        if (!this.internal.midlinepresent)
            return false;

        let data=this.internal.midlinedata;
        
        if (mode>=1 && data.origx<0)
            return false;
        
        e.preventDefault();
        
        let x=e.pageX;
        let cnv=this.internal.midline;
        let cnv2=this.internal.midline2;
        

        
        if (mode===0) {
            
            cnv.css({'left' : `${data.left-3}px`,
                     'width' : '9px'});
            cnv2.css({'left' : `${data.left-4}px`});
            data.origx=x;
            $('body').append(this.internal.midlinemessage);
            setTimeout( () => {
                this.internal.midlinemessage.remove();
            },2000);

            modifyCallbacks(1);
            return true;
        }

        let offset=this.internal.layoutcontroller.getviewerleft();
        let vw=this.internal.layoutcontroller.getviewerwidth();
        let minl=0.1*vw;
        let maxl=0.9*vw;
        
        if (mode===1 && data.origx>=0) {

            x=x-offset;
            if (x<minl)
                x=minl;
            else if (x>=maxl)
                x=maxl;
            x=x+offset;

            
            let shift=x-data.origx;

            let l=data.left+shift;
            
            cnv.css({ 'left' : `${l-3}px`,});
            cnv2.css({'left' : `${l-5}px`});
            return true;
        }
        
        if (mode===2) {
            cnv.css({'width' : '1px'  });
            
            let shiftx=x-data.origx;

            let newleft=data.left+shiftx;
            let newclear=((newleft-offset)/(data.left-offset))*this.cleararea[0];
            if (newclear>0.45 && newclear<0.55) {
                newclear=0.5;
            } else if (newclear<0.1) {
                newclear=0.1;
            } else if (newclear>0.9) {
                newclear=0.9;
            }
            data.left=(data.left-offset)*(newclear/this.cleararea[0])+offset;
            data.origx=-1;
            modifyCallbacks(2);
            setTimeout( () => {
                this.setDualViewerMode(newclear);
            },10);
            return true;
        }
        
    }

    createmidline(parentcanvas,dw,dh) {
 
        if (!(this.is_slave_viewer && this.cleararea[1] < 0.95 && this.cleararea[1]>0.05)) {
            if (this.internal.midlinepresent) {
                this.internal.midline.remove();
                this.internal.midline2.remove();
                this.internal.midlinepresent=false;
            }
            return;
        }

        const self=this;

        let modifyCallbacks=null;
        let downC=function(e) {  self.handleSeparator(e,0,modifyCallbacks);  };
        let moveC=function(e) {  self.handleSeparator(e,1,modifyCallbacks);  };
        let upC=function(e) {  self.handleSeparator(e,2,modifyCallbacks);  };

        modifyCallbacks=function(add=0) {

            let cnv2=self.internal.midline2;
            let par=$(parentcanvas).parent().parent();

            
            if (add===0) {
                cnv2[0].addEventListener('mousedown',downC);
            } else if (add===1)  {
                par[0].addEventListener('mousemove',moveC);
                par[0].addEventListener('mouseup',  upC);
                par[0].addEventListener('mouseleave',upC);
            } else if (add===2) {
                par[0].removeEventListener('mousemove',moveC);
                par[0].removeEventListener('mouseup',  upC);
                par[0].removeEventListener('mouseleave',upC);
            }
        };
        

        if (!this.internal.midline) {
            let cnv=$(`<div></div>`);
            this.internal.midline=cnv;
            cnv.css({ 'position' : 'absolute',
                         'top' : `0px` ,
                         'z-index' : 650,
                    });

            this.internal.midline2=$(`<div style="cursor:ew-resize"></div>`);
            this.internal.midline2.css({ 'position' : 'absolute',
                                         'top' : `0px` ,
                                         'z-index' : 641,
                                       });

            this.internal.midlinemessage = $(`<div align="center" style="padding:2px; width:50vw; left:25vw; top:${top}px; height:40px;border-radius:30px;background-color:#884400; z-index:5000; position: absolute; color:#ffffff"><H4>Drag the line to adjust the relative width of the two viewers</H4></div>`);

            
            modifyCallbacks(0);
        }
        
        this.internal.midlinedata.origx=-1;
        let left=this.internal.layoutcontroller.getviewerleft();
        this.internal.midlinedata.left=this.cleararea[0]*dw+left;
        this.internal.midlinedata.height=dh;
        
        if (!this.internal.midlinepresent) {
            let par=$(parentcanvas).parent().parent();
            par.append(this.internal.midline);
            par.append(this.internal.midline2);
            this.internal.midlinepresent=true;
        }

        //        let tp=$(parentcanvas).parent().parent().parent().css(['top']);
        let tp=this.internal.layoutcontroller.getviewertop();
        this.internal.midline.css({
            'height' : `${dh}px`,
            'top' : `${tp}px`,
            'width'  : '3px',
            'left'   : `${this.internal.midlinedata.left-1}px`,
            'background-color' : 'rgba(128,128,128,1.0)',
        });
        this.internal.midline2.css({
            'height' : `${dh}px`,
            'top' : `${tp}px`,
            'width'  : '11px',
            'left'   : `${this.internal.midlinedata.left-5}px`,
            'background-color' : 'rgba(10,10,10,0.1)',
        });
    }
    
    
    /** draw the labels (e.g. L,R, Axial/Coronal etc). Called when changing viewer size or layout */
    drawlabels() {
        
        if (this.internal.volume===null)
            return;
        
        var context=this.internal.layoutcontroller.context;
        var dw=context.canvas.width;
        var dh=context.canvas.height;
        context.clearRect(Math.floor(this.cleararea[0]*dw),0,Math.floor(this.cleararea[1]*dw),dh);
        let cdim=$(context.canvas).css(['width','height','left','top' ]);
        
        // Add R&L s
        var labels = [ [ 'A','P', 'S','I' ] ,
                       [ 'R','L', 'S','I' ] ,
                       [ 'R','L', 'A','P' ] ];
        var names  = [ 'Sagittal','Coronal','Axial'];
        var axes   = [ '-jk','-ik','-ij' ];
        
        var fnsize=0;
        if (this.internal.simplemode)
            fnsize=Math.round(2*webutil.getfontsize(context.canvas)/3);
        else
            fnsize=Math.round(webutil.getfontsize(context.canvas)*this.cleararea[1]);

        context.font=fnsize+"px Arial";
        if (this.internal.simplemode)
            context.fillStyle = "#884400";
        else
            context.fillStyle = "#cc6600";


        let arrowsize=this.createarrowbuttons($(context.canvas).parent().parent(),fnsize);
        this.createmidline(context.canvas,dw,dh);

        if (this.internal.showdecorations===false) {
            this.hidearrowbuttons();
            return;
        }
        
        var invorientaxis = this.internal.volume.getOrientation().invaxis;
        var orientaxis = this.internal.volume.getOrientation().axis;
        
        for (var pl=0;pl<=3;pl++) {
            var trueplane=invorientaxis[pl];
            var lab=labels[trueplane];
            var vp  =this.internal.subviewers[pl].controls.normViewport;
            if ((vp.x1-vp.x0)*dw>200) {
                if (pl<=2) {

                    let dx=0.25*vp.shiftx*dw;
                    if (dx>120)
                        dx=120;

                    let dy=0.25*vp.shifty*dh;
                    if (dy>50)
                        dy=50;
                    
                    let xshift=[ -(2+dx),dx-(arrowsize+1)];
                    let xshift0=[-(2+dx),(dx+2)];

                    let ymid=Math.round( dh*(1.0-0.5*(vp.y0+vp.y1))+6);
                    let xmin=vp.x0*dw+xshift0[0];
                    if (xmin<2)
                        xmin=2;
                    let xmax=vp.x1*dw+xshift0[1];
                    if (xmax>(dw-2))
                        xmax=dw-2;

                    context.textBaseline="middle";
                    context.textAlign="start";   context.fillText(lab[0],xmin,ymid);
                    context.textAlign="end";     context.fillText(lab[1],xmax,ymid);
                    
                    let xmid=Math.round( dw*0.5*(0.5*vp.x0+1.5*vp.x1)-6);
                    let ymin=Math.round((1.0-vp.y1)*dh)-dy;
                    if (ymin<(fnsize+2))
                        ymin=(fnsize+2);
                    let ymax=Math.round((1.0-vp.y0)*dh)+dy;
                    if (ymax>0.9*dh)
                        ymax=0.9*dh;
                    
                    context.textAlign="center";
                    context.textBaseline="top";
                    context.fillText(lab[2],xmid,ymin);
                    context.textBaseline="alphabetic";
                    context.fillText(lab[3],xmid,ymax);
                    
                    let name=names[trueplane]+axes[orientaxis[trueplane]];
                    context.textAlign="start";
                    context.fillText(name,xmin,ymin);
                    
                    if (!this.internal.simplemode) {
                        let wd=Math.round(parseInt(cdim['width']));
                        let lf=Math.round(parseInt(cdim['left']));
                        let left=this.internal.layoutcontroller.getviewerleft();
                        let l= [ Math.round(vp.x0*wd+lf+xshift[0]+left),
                                 Math.round(vp.x1*wd+lf+xshift[1])+left];
                        if (l[0]<0)
                            l[0]=0;
                        

                        
                        let h=Math.round((1-(0.75*vp.y1+0.25*vp.y0))*parseInt(cdim['height']))+parseInt(cdim['top']);
                        
                        for (let k=0;k<=1;k++) {
                            this.internal.arrowbuttons[pl*2+k].css({ 'left' :  `${l[k]}px`,
                                                                     'top'  :  `${h}px`,
                                                                     'visibility' : 'visible'});
                        }
                    }
                }
                if (this.internal.simplemode)
                    context.strokeStyle = "#dddddd";
                else
                    context.strokeStyle = "#222222";
                
                context.lineWidth=1;
                context.beginPath();
                
                if (pl===3)
                    vp=this.internal.subviewers[pl].controls.normViewport.old;
                context.moveTo(vp.x0*dw,(1-vp.y0)*dh);
                context.lineTo(vp.x0*dw,(1-vp.y1)*dh);
                context.lineTo(vp.x1*dw,(1-vp.y1)*dh);
                context.lineTo(vp.x1*dw,(1-vp.y0)*dh);
                context.lineTo(vp.x0*dw,(1-vp.y0)*dh);
                context.stroke();
            }  else if (pl<3) {
                for (let ia=0;ia<=1;ia++)
                    if (this.internal.arrowbuttons[pl*2+ia])
                        this.internal.arrowbuttons[pl*2+ia].css({'visibility':'hidden'});
            }
        }


        // Movie Stuff
        if (!this.internal.simplemode) {

            //console.log("Checking on arrows",this.internal.maxnumframes);
            if (this.internal.maxnumframes<2 || dw<500) {
                
                for (let ia=6;ia<=11;ia++)
                    if (this.internal.arrowbuttons[ia])
                        this.internal.arrowbuttons[ia].css({'visibility':'hidden'});
                
            } else {
        
                let lh=this.internal.layoutcontroller.getviewerheight();
                let left=this.internal.layoutcontroller.getviewerleft();
                let y0=0.92*lh+parseInt(cdim['top']);
                for (let k=0;k<=5;k++) {
                    let extra=0;
                    if (k>3)
                        extra=20;
                    this.internal.arrowbuttons[6+k].css({ 'left' :  `${50+40*k+left+extra}px`,
                                                          'top'  :  `${y0}px`,
                                                          'visibility' : 'visible'});
                }
            }
        }
        
    }
    
    // ------------------------------------------------------------------------------------
    // Handle Resize
    // ------------------------------------------------------------------------------------
    /** handle window resize. Calls {@link ViewerLayoutElement}.handleresize.
     * to do most of the work and then adjusts the viewports
     */
    handleresize() {

        super.handleresize();
        this.setrendermode(this.internal.rendermode,true);
        this.drawcrosshairs();
        this.updateResizeObservers();
        this.drawtext();
        this.drawcolorscale();
    }
    
    // ------------------------------------------------------------------------
    // Rearrange scenes on renderer
    // ------------------------------------------------------------------------
    
    /** gui callback. Set the rendermode to either single slice, three-slice view, three-slice +3D etc.
     * @param {number} mode - 0='Slices',  1='Sagittal', 2='Coronal', 3='Axial', 4='3D+slices', 5='3D Only', 9='Simple Mode'
     * @param {boolean} force - force update otherwise do as needed
     */
    setrendermode(mode,force) {
        
        force = force || false;
        mode  = mode ||  0;
        
        if (mode===this.internal.rendermode && force===false)
            return;
        
        if (this.internal.subviewers[0] === null)
            return;
        
        var invorientaxis = [ 0,1,2];
        if (this.internal.volume!==null)
            invorientaxis= this.internal.volume.getOrientation().invaxis;
        this.internal.rendermode=util.range(mode,0,this.internal.viewports.length-1);
        for (var pl=0;pl<this.internal.subviewers.length;pl++) {
            var trueplane=pl;
            // For axial,coronal and Sagittal remap
            if (pl<=2) {
                trueplane=invorientaxis[pl];
            }
            
            var vp0=this.internal.viewports[this.internal.rendermode][trueplane];
            var vp= { 
                x0 : vp0.x0,
                x1 : vp0.x1,
                y0 : vp0.y0,
                y1 : vp0.y1,
            };
            
            var ratio=1.0;
            var fullw=this.internal.layoutcontroller.canvas.width*(vp.x1-vp.x0);
            var fullh=this.internal.layoutcontroller.canvas.height*(vp.y1-vp.y0);
            
            vp.old= vp0;
            
            if (fullw>fullh) {
                ratio=fullh/fullw;
                var midx=0.5*(vp.x0+vp.x1);
                var scalemidx=midx*ratio;
                vp.x0=ratio*vp.x0+(midx-scalemidx);
                vp.x1=ratio*vp.x1+(midx-scalemidx);
                vp.shiftx=(midx-scalemidx);
                vp.shifty=0;
            } else if (fullh>fullw) {
                ratio=fullw/fullh;
                var midy=0.5*(vp.y0+vp.y1);
                var scalemidy=midy*ratio;
                vp.y0=ratio*vp.y0+(midy-scalemidy);
                vp.y1=ratio*vp.y1+(midy-scalemidy);
                vp.shifty=(midy-scalemidy);
                vp.shiftx=0;
                
            }
            this.internal.subviewers[pl].controls.normViewport=vp;
        }
        
        this.drawlabels();
        this.drawcolorscale();
    }
    
    
    // ------------------------------------------------------------------------
    // get/set image
    // ------------------------------------------------------------------------
    /** Returns the current image
     * @returns {BisImage} current image (may be null);
     */
    getimage() { return this.internal.volume;}
    
    /** Sets new image (and deletes objectmap if present)
     * @param {BisImage} volume - new image
     */
    setimage(volume) {

        const self=this;
        // clear old info

        this.disable_renderloop();
        
        let samesize=false;
        // clear old info
        if (this.internal.volume!==null && volume!==null)
            samesize=this.internal.volume.hasSameSizeAndOrientation(volume);
        if (volume.getDimensions()[3]>1)
            samesize=false;
        
        if (this.internal.volume!==null)
            this.deleteoldimage(samesize);
        
        // get info
        this.internal.volume=volume;

        if (samesize===false) {
            this.internal.imagedim=volume.getDimensions();
            this.internal.imagespa=volume.getSpacing();
            this.internal.maxspa=this.internal.imagespa[2];
            // TODO: One day do proper 5D
            this.remapDimensionsTo4D(this.internal.imagedim);
        }

        this.internal.maxnumframes=this.internal.imagedim[3];


        let imagesize=volume.getImageSize();
        let d=1.0,i=0;
        for (i=0;i<=2;i++) {
            if (imagesize[i]>d)
                d=imagesize[i];
            if (samesize===false) 
                this.internal.slicecoord[i]=Math.floor(this.internal.imagedim[i]/2);
            if (this.internal.imagespa[i]>this.internal.maxspa)
                this.internal.maxspa=this.internal.imagespa[i];
        }
        if (samesize===false) 
            this.internal.slicecoord[3]=0;
        
        let s_width=Math.round(d*0.667);
        let s_depth=Math.round(d*2.0);
        if (samesize===false)
            this.internal.rendermode=0;

        let imagerange=volume.getIntensityRange();
        this.internal.imagetransferfunction=util.mapstepcolormapfactory(imagerange[0],imagerange[1],255);
        
        
        // Create scenes
        let opacity=0.8;
        if (this.internal.simplemode)
            opacity=0.4;
        
        var fn=function(i) {  self.updatetransferfunctions(i); };
        
        if (this.internal.cmapcontroller===null) {
            let colormapid=this.getAttribute('bis-colormapeditorid');
            this.internal.cmapcontroller=document.querySelector(colormapid);
        }
        
        this.internal.cmapcontroller.setimage(this.internal.volume,fn,opacity);
        
        this.internal.slices =  [ null,null,null,null ];

        if (samesize===false) {
            this.internal.subviewers =  [ null,null,null,null ];
        }
        
        for (i=0;i<=2;i++) {
            this.internal.slices[i]=bis3dOrthogonalSlice.create2dslice(this.internal.volume,i,2);
            this.internal.slices[i].setsliceno(this.internal.slicecoord[i],this.internal.slicecoord[3],this.internal.imagetransferfunction,true);
            if (samesize===false) {
                this.internal.subviewers[i]=this.createsliceview(this.internal.layoutcontroller.renderer,
                                                                 this.internal.volume,this.internal.slices[i],
                                                                 s_width,s_depth);
            } else {
                this.internal.slices[i].addtoscene(this.internal.subviewers[i].scene);
            }
        }
        
        let drawimages=true;
        if (this.internal.simplemode)
            drawimages=false;
        this.internal.slices[3]=bis3dOrthogonalSlice.create3cardslice(this.internal.volume,
                                                                      this.internal.slices,true,
                                                                      false,drawimages);
        if (samesize===false) {
            this.internal.subviewers[3]=this.createcardview(this.internal.layoutcontroller.renderer,
                                                            this.internal.volume,this.internal.slices[3],s_width,s_depth);
        } else {
            this.internal.slices[3].addtoscene(this.internal.subviewers[3].scene);
        }                
        
        // Activate renderloop
        this.enable_renderloop();
        this.renderloop();
        
        // Add mouse updates

        if (samesize===false) {
            let mousefn=function(coords,plane,mousestate) {
                let c=[ coords[0],coords[1],coords[2] ];
                self.updatescene(c,plane,mousestate);
            };
            
            for (let j=0;j<this.internal.subviewers.length;j++)
                this.internal.subviewers[j].controls.coordinateChangeCallback=mousefn;
            
            this.setrendermode(this.internal.rendermode,true);
        }
        
        this.drawcrosshairs();
        this.drawlabels();
        
        // Create GUI
        this.createdatgui(samesize);
        this.initializeMouseObservers(samesize);

        if (samesize===false) {
            if (this.internal.imagedim[2]<2) 
                this.internal.rendermode=3;
            this.handleresize();
        }

        this.updateImageChangedObservers('image');
        
        return true;
    }
    
    // ------------------------------------------------------------------------
    // set objectmap
    // ------------------------------------------------------------------------
    /** Sets new objectmap (and deletes old objectmap if present)
     * @param {BisImage} ovolume - new objectmap
     * @param {boolean} plainmode - if true this is an objectmap so only create opacity controls as opposed to full functional colormapping
     * @param {colormapmode} colormap type - "Overlay","Overlay2","Red","Green","Blue" 
     */
    setobjectmap(ovolume,plainmode,colormapmode) {
        if (this.setObjectMapFunction===null)
            this.setobjectmap_internal(ovolume,plainmode,colormapmode);
        else
            this.setObjectMapFunction(ovolume,plainmode,colormapmode);
    }

    /** Same as above but allows rerouting */
    setobjectmap_internal(ovolume,plainmode,colormapmode) {


        this.disableClustering();
        colormapmode=colormapmode || "Auto";

        if (plainmode===null)
            plainmode= (colormapmode === "Objectmap");        
        
        // First check if this is OK
        if (this.internal.volume===null) {
            bootbox.alert('can not load objectmap if no image is in memory');
            return false;
        }
        
        var orient1=this.internal.volume.getOrientationName();
        var orient2=ovolume.getOrientationName();
        if (orient1!==orient2) {
            bootbox.alert('Loaded objectmap from has a different orientation ('+ orient2 + ' vs '+orient1+') than currently loaded image');
            return false;
        }
        
        plainmode=plainmode || false;
        var i=0;
        
        // Cleanup artifacts
        this.deleteoldobjectmap();
        
        this.internal.objectmap=ovolume;
        
        this.internal.objectmapspa=this.internal.objectmap.getSpacing();
        var odim=this.internal.objectmap.getDimensions();

        // TODO: One day do proper 5D
        this.remapDimensionsTo4D(odim);
        this.internal.objectmapnumframes=odim[3];
        
        for (i=0;i<=2;i++) { 
            var ci=(this.internal.imagedim[i])*0.5*this.internal.imagespa[i];
            var co=(odim[i])*0.5*this.internal.objectmapspa[i];
            this.internal.objectmapshift[i]=co-ci;
        }
        
        // Create scene
        this.internal.overlayslices =  [ null,null,null,null ];
        var objcoord=this.getobjectmapcoordinates();

        if (this.internal.objectmapnumframes>this.internal.maxnumframes)
            this.internal.maxnumframes=this.internal.objectmapnumframes;

        for (i=0;i<=2;i++) {
            this.internal.overlayslices[i]=bis3dOrthogonalSlice.create2dslice(this.internal.objectmap,i,0,true);
            this.internal.overlayslices[i].addtoscene(this.internal.subviewers[i].scene);
            this.internal.overlayslices[i].setsliceinmm(this.internal.slices[i],objcoord[i],
                                                        this.internal.slicecoord[3],this.internal.objectmaptransferfunction,true);
        }
        var drawimages=true;
        if (this.internal.simplemode)
            drawimages=false;
        
        this.internal.overlayslices[3]=bis3dOrthogonalSlice.create3cardslice(this.internal.volume,
                                                                             this.internal.overlayslices,
                                                                             true,
                                                                             true,
                                                                             drawimages);
        for (i=0;i<=2;i++) {
            this.internal.overlayslices[3].updatecoordinatesinmm(this.internal.slices[i],i);
        }

        
        this.internal.overlayslices[3].addtoscene(this.internal.subviewers[3].scene);

        if (this.internal.maxnumframes>this.internal.imagedim[3]) {
            this.createdatgui(false);
            this.drawlabels();
        }
        this.internal.cmapcontroller.addobjectmap(this.internal.objectmap,plainmode,colormapmode);
        
        // update text
        this.drawtext();


        if (this.internal.maxnumframes>this.internal.imagedim[3]) {
            this.drawlabels();
        }
        this.updateImageChangedObservers('overlay');
        return true;
    }
    
    // ------------------------------------------------------------------------
    // clear objectmap (called from outside)
    // ------------------------------------------------------------------------
    /** clears the objectmap.
     */
    clearobjectmap() {

        if (this.internal.objectmap===null)
            return;
        
        this.deleteoldobjectmap();
        this.internal.cmapcontroller.removeobjectmap();
        this.internal.objectmaptransferinfo={ isfunctional : false, 'colormode' : 'Objectmap' };
        this.drawtext();
        this.updateImageChangedObservers('overlay');
    }
    
    
    // ------------------------------------------------------------------------
    // Main outside update
    // ------------------------------------------------------------------------

                
                
    /** set the coordinates of the viewer 
     * @param {array} coords - [ x,y,z ] array with current position in mm
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     */
    setcoordinates(coords,plane) {

        var c = coords || [ this.internal.slicecoord[0], this.internal.slicecoord[1], this.internal.slicecoord[2],this.internal.slicecoord[3] ];
        for (var i=0;i<=2;i++)
            c[i]=c[i]*this.internal.imagespa[i];
        if (plane!==0 && plane!==1 && plane!==2)
            plane  = -1;
        this.updatescene(c,plane,-1,true);
        this.updateFrameChangedObservers();
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
        
        const data = this.internal.datgui.data;

        this.internal.slicecoord[3]=Math.floor(fr);
        data.tcoord=this.internal.slicecoord[3];
        this.setcoordinates();
        this.internal.framecontroller.updateDisplay();
        this.updateFrameChangedObservers();
    }

    /** @return {number} the current frame} */
    getframe() {
        return this.internal.slicecoord[3];
    }
    
    /**
     * Move 3Dviewer to appropriate planes 
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     * @param {boolean} back -- true or false
     */
    
    set3dview(plane,back) {
        if (plane!==0 && plane!==2)
            plane=1;
        back =back || false;
        
        if (this.internal.slices[3]===null || this.internal.subviewers[3]===null)
            return;
        
        this.internal.slices[3].positioncamera(this.internal.subviewers[3].camera,plane,back);
        var renderer=this.internal.layoutcontroller.renderer;
        renderer.render(this.internal.subviewers[3].scene,
                        this.internal.subviewers[3].camera);
    }
    
    
    // ------------------------------------------------------------------------
    // Create dat.gui core
    // ------------------------------------------------------------------------
    
    /** create dat.gui interface for core controls. This goes in 
     * this.internal.layoutcontroller.getcorecontrols(). This gui is recreated each time a new image is set.
     * @param {Boolean} samesize - if true x,y,z dims are same
     */
    createdatgui(samesize=false) {

        if (samesize) {
            //let gui=this.internal.datgui.gui;
            let cmapfolder=this.internal.cmapcontroller.creategui(null);
            if (this.internal.simplemode) {
                cmapfolder.open();
            }
            return;
        }
        
        //this.internal.layoutcontroller.getcorecontrols().empty();
        
        let dpname = [ 'Slices', 'Sagittal', 'Coronal', 'Axial' , 'Slices+3D','3D Only','Simple Mode'];
        let data = this.internal.datgui.data;
        
        data.displaymode = dpname[0];
        if (this.internal.imagedim[2]<2) {
            this.internal.rendermode=3;
            data.displaymode=dpname[3];
        }
        
        data.decorations = true;
        data.xcoord = this.internal.slicecoord[0];
        data.ycoord = this.internal.slicecoord[1];
        data.zcoord = this.internal.slicecoord[2];
        data.tcoord = this.internal.slicecoord[3] || 0;
        data.rate=25;
        data.playing=false;
        data.decorations=this.internal.showdecorations || true;
        data.lockcursor=this.internal.lockcursor || false;
        
        let creatingnew=false;
        //        let createmovie = false;

        let base_widget=this.internal.layoutcontroller.getcorecontrols(this.is_slave_viewer);
        
        if (this.internal.datgui.gui===null) {
            this.internal.datgui.gui = new dat.GUI({autoPlace: false, width:this.internal.domextra});
            base_widget.append(this.internal.datgui.gui.domElement);
            creatingnew=true;
        } 
        
        let gui=this.internal.datgui.gui;
        const self=this;
        
        if (this.internal.simplemode) {
            this.internal.rendermode=7;
            this.internal.datgui.coords = null;
        } else {

            if (creatingnew) {
                this.internal.datgui.coords = gui.addFolder('Core');
            } else {
                for (let c=this.internal.datgui.coords.__controllers.length-1;c>=0;c=c-1) {
                    let elem=this.internal.datgui.coords.__controllers[c];
                    try {
                        this.internal.datgui.coords.remove(elem);
                    } catch(e) {
                        // nothing to do
                    }
                }

                /*if (this.internal.moviefolder!==null) {
                    for (let c=this.internal.moviefolder.__controllers.length-1;c>=0;c=c-1) {
                        let elem=this.internal.moviefolder.__controllers[c];
                        try {
                            this.internal.moviefolder.remove(elem);
                        } catch(e) {
                            // nothing to do
                        }
                    }
                    this.internal.play_movie_controller=null;
                }*/
            }
            let dmode=this.internal.datgui.coords.add(data,'displaymode', dpname).name("Mode");
            this.internal.displaymodes=dpname;

            
            dmode.onChange(function(val) {
                let ind=dpname.indexOf(val);
                if (ind===6)
                    ind=9;
                self.setrendermode(ind);
            });
            
            let coordchange = function() {
                let c = [ data.xcoord, data.ycoord, data.zcoord,data.tcoord ];
                self.setcoordinates(c);
            };
            
            let tcoordchange = function() {
                let c = [ data.xcoord, data.ycoord, data.zcoord,data.tcoord ];
                self.internal.slicecoord[3]=data.tcoord;
                self.setcoordinates(c);
            };

            let xcoord=this.internal.datgui.coords.add(data,'xcoord',0,this.internal.imagedim[0]-1).name("I-Coord").step(1);
            let ycoord=this.internal.datgui.coords.add(data,'ycoord',0,this.internal.imagedim[1]-1).name("J-Coord").step(1);
            xcoord.onChange(coordchange);
            ycoord.onChange(coordchange);
            
            if (this.internal.imagedim[2]>1) {
                let zcoord=this.internal.datgui.coords.add(data,'zcoord',0,this.internal.imagedim[2]-1).name("K-Coord").step(1);
                zcoord.onChange(coordchange);
            }
            
            if (this.internal.maxnumframes>1) {
                this.internal.framecontroller=
                    this.internal.datgui.coords.add(data,'tcoord',0,
                                                    this.internal.maxnumframes-1).
                    name("Frame/Comp").step(1);
                this.internal.framecontroller.onChange(tcoordchange);
                //if (this.internal.moviefolder===null)
                //                    this.internal.moviefolder = gui.addFolder('Movie Controls');
                //createmovie = true;
            }
            

            let deco=this.internal.datgui.coords.add(data, 'decorations').name("Labels");
            deco.onChange(function(val) {
                self.internal.showdecorations=val;
                self.drawlabels();
                self.drawcolorscale();
                self.setcoordinates();
            });



            let lock=this.internal.datgui.coords.add(data, 'lockcursor').name("Disable Mouse");
            lock.onChange(function(val) {
                self.internal.lockcursor=val;
            });
            this.internal.datgui.coords.open();
        }
        

        let cgui=gui;
        if (!creatingnew) 
            cgui=null;
        let cmapfolder=this.internal.cmapcontroller.creategui(cgui);

        //if (createmovie)
        //            this.createmoviecontrols(this.internal.moviefolder);

        if (!creatingnew)
            return;

        webutil.removedatclose(gui);
        let bbar=$("<div></div>");
        bbar.css({'margin': '10px'});
        base_widget.append(bbar);


        let s="Reset Slices";
        if (this.internal.simplemode) {
            s="Reset 2D/3D Views";
            cmapfolder.open();
        }
        
        let fn2=function(e) {
            e.preventDefault();
            self.resetViewers();
        };
        
        webutil.createbutton({ name : s,
                               type : "info",
                               tooltip : "This resets the viewer to default camera positions and zoom level",
                               position : "left",
                               parent : bbar }).click(fn2);
        
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

        bbar.tooltip();
    } 
    
    /** updatemouse coordinates
     * @param {array} mm - [ x,y,z ] array with current position in mm
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     * @param {number} mousestate - 0=click 1=move 2=release
     */
    updatemousecoordinates(mm,plane,mousestate) {

        if (this.internal.ignoremouseobservers === true)
            return;

        if (this.internal.lockcursor)
            return;
        this.updatescene(mm,plane,mousestate);
    }
    
    
    // -----------------------------------------------------------------------------
    // Set Render mode externally
    // -----------------------------------------------------------------------------
    /** sets the rendermode from outside and return current viewports!
     */
    setRenderMode(mode) {
        this.setrendermode(mode,true);
        return this.internal.viewports[this.internal.rendermode];
    }

    /** sets the viewer mode one of full,left,right 
     * @param{mode} - on of left,right or full (default)
     * @param{size} - width (fraction) of this viewer
     * @returns {String} - the current mode
     */
    setViewerMode(in_mode='full',in_size=0.5) {

        let mode=super.setViewerMode(in_mode,in_size);
        if (mode==="full") {
            this.internal.viewports = this.internal.origviewports;
        } else {
            this.internal.viewports = [ ];
            let shift=this.cleararea[0];
            let size=this.cleararea[1];
            
            for (let i=0;i< this.internal.origviewports.length;i++) {
                let toadd = [];
                let vp=this.internal.origviewports[i];
                for (let j=0;j<vp.length;j++) {
                    let it=vp[j];
                    let newit = { x0 : it.x0*size+shift, y0 : it.y0, x1 : it.x1*size+shift, y1 : it.y1 };
                    toadd.push(newit);
                }
                this.internal.viewports.push(toadd);
            }
        }
        this.setRenderMode(this.internal.rendermode,true);
        return mode;
    }

    connectedCallback() {
        super.connectedCallbackBase();
    }

    
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
            if (this.internal.displaymodes) {
                let ind=this.internal.displaymodes.indexOf(sanedata['displaymode']);
                if (ind>=0) {
                    this.internal.datgui.data.displaymode=this.internal.displaymodes[ind];
                    if (ind===6) // Simple Mode
                        ind=9;
                    this.setrendermode(ind);
                }
            }
            
            
            this.internal.showdecorations=sanedata['decorations'];
            this.internal.lockcursor=sanedata['lockcustor'];
            this.internal.datgui.data.decorations=this.internal.showdecorations;
            this.internal.datgui.data.lockcursor=this.internal.lockcursor=sanedata['lockcustor'];
            
            
            
            this.setcoordinates([ parseInt(sanedata['xcoord']),
                                  parseInt(sanedata['ycoord']),
                                  parseInt(sanedata['zcoord']),
                                  parseInt(sanedata['tcoord'])]);
            
        } catch(e) {
            console.log(e.stack,e);
        }
        
        this.setElementStateCameras(dt);
        
        // The end update the controllers
        setTimeout( () => {
            let gui=this.internal.datgui.coords;
            if (gui!==null) {
                for (let ia=0;ia<gui.__controllers.length;ia++) {
                    gui.__controllers[ia].updateDisplay();
                }
            }
        },100);
    }
    
}

webutil.defineElement('bisweb-orthogonalviewer', OrthogonalViewerElement);



