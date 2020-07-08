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

// Color mapping RGBA output now ...
// to go to texture go through canvas
// create image data

/** 
 * @file Browser or Node.js module. Contains {@link BisImageSlicer}.
 * @author Xenios Papademetris
 * @version 1.0
 */

"use strict";

const util=require('bis_util');

/** 
 * A class for extracting 2D slices from 3D images for use as textures in WebGL/Three.js style rendering.
 * This is hidden behind a factory function -- see examples below. <BR>
 * It is the output of <B>require('bis_imageslicer')</B>.<BR>
 * @constructs BisImageSlicer
 * @param {BisImage} bisimage - the input image
 * @param {object} opts - the input options
 * @param {number} opts.plane - (default =2) 0,1,2 to signify which image plane 0=YZ (i.e. constant X), 1=XZ, 2=XY. If the input is axial 0=sag,1=coronal,2=axial.
 * @param {boolean} opts.objectmap - (default=false). If true use objectmap colormapping function to begin with.
 */
class BisImageSlicer {
    
    constructor(image,opts) { 
        
        this.internal = {
            // Input data
            imagedata : null,
            imagedim : null,
            imagespa : null,
            imageorientinvaxis : [ 0,1,2],
            imageorientinvflip : [ 0,0,0],
            iscolor : false,
            // Parameters
            plane : 0 ,
            currentslice : -1,
            currentframe : -1,
            mapfunction : null,
            nexttimeforce : false,
            
            // Output
            outputslice:       null,
            canvas:            null,
            canvasdata:        null,
            slicedim :         [ 0,0 ],
            slicespa :         [ 1.0,1.0 ],
            sliceindices:      [ 0,1,2 ],
            
            // Camera offset
            cameradepth : 100,
            camerabelow : false,

            // outofrange
            outofrange : false,
        };
        this.initialize(image,opts);
    }

    prepareCanvas() {

        if (this.internal.canvasdata!==null) {
            return;
        }
        var ctx=this.internal.canvas.getContext("2d");
        this.internal.canvas.width=this.internal.slicedim[0];
        this.internal.canvas.height=this.internal.slicedim[1];
        this.internal.canvasdata=ctx.createImageData(this.internal.slicedim[0],this.internal.slicedim[1]);
        this.internal.outputslice=this.internal.canvasdata.data;
    }
    
    getminmaxaxis() { 
        var out,axis1,axis2;
        
        if (this.internal.plane==2) {
            axis1=this.internal.imageorientinvaxis[0];
            axis2=this.internal.imageorientinvaxis[1];
            out=[0,1];
            if (axis1>axis2)
                out=[1,0];
        } else if (this.internal.plane==1) {
            axis1=this.internal.imageorientinvaxis[0];
            axis2=this.internal.imageorientinvaxis[2];
            out=[0,2];
            if (axis1>axis2)
                out=[2,0];
        } else  {
            axis1=this.internal.imageorientinvaxis[1];
            axis2=this.internal.imageorientinvaxis[2];
            out = [ 1,2 ];
            if (axis1>axis2)
                out=[2,1];
        }
        return out;
        
    }

    
    initialize(bisimage,opts) {

        opts = opts || {};
        if (opts.plane!==0)
            opts.plane = opts.plane || 2;
        opts.objectmapmode = opts.objectmap || false;

        
        if ( (typeof bisimage.getImageData !== "function") || (typeof bisimage.getDimensions!=="function" )) {
            throw(new Error('Cannot initialize slicer, bad image '));
        }
        
        this.internal.imagespa=[1.0,1.0,1.0 ];

        
        if ( typeof(bisimage.getSpacing) === "function")
            this.internal.imagespa=bisimage.getSpacing();
        
        if (typeof(bisimage.getOrientation) === "function") {
            this.internal.imageorientinvaxis = bisimage.getOrientation().invaxis;
            this.internal.imageorientinvflip =  bisimage.getOrientation().invflip;
        }
        
        this.internal.imagedata=bisimage.getImageData();
        this.internal.imagedim=bisimage.getDimensions();

        if (this.internal.imagedim[4]>1) {
            if (this.internal.imagedim[4]===3 && this.internal.imagedata.constructor.name==='Uint8Array') {
                this.internal.iscolor=true;
                console.log('Color!!!!');
            } else {
                // TODO: One day do proper 5D
                // Force everything to 4D for now ...
                
                this.internal.imagedim[3]=this.internal.imagedim[3]*this.internal.imagedim[4];
                this.internal.imagedim[4]=1;
            }
        }
        
        this.internal.plane=util.range(opts.plane,0,2);
        
        if (this.internal.plane===0) 
            this.internal.sliceindices=[1,2,0];
        else if (this.internal.plane===1)
            this.internal.sliceindices=[0,2,1];
        else
            this.internal.sliceindices=[0,1,2];
        
        this.internal.slicedim = [ this.internal.imagedim[this.internal.sliceindices[0]], this.internal.imagedim[this.internal.sliceindices[1]] ];
        this.internal.slicespa = [ this.internal.imagespa[this.internal.sliceindices[0]], this.internal.imagespa[this.internal.sliceindices[1]] ];
        this.internal.currentslice = -1;
        this.internal.outputslice=null;

        var d=0;
        for (var i=0;i<=2;i++) {
            var sz=this.internal.imagedim[i]*this.internal.imagespa[i];
            if (sz>d)
                d=sz;
        }
        this.internal.cameradepth=Math.round(d*2.0);

        var rng=[0,255];
        if ( typeof(bisimage.getIntensityRange) === "function")
            rng=bisimage.getIntensityRange();
        
        if (opts.objectmapmode)
            this.internal.mapfunction=util.mapobjectmapfactory(255);
        else
            this.internal.mapfunction=util.mapstepcolormapfactory(rng[0],rng[1],255);
        
        const that=this;
        var computecamerabelow=( () => {
            var axes = that.getminmaxaxis();
            var flip1= (that.internal.imageorientinvflip[axes[0]]>0);
            var doflip = false;
            var y=that.getcameraup();
            var z=[0,0,0];
            z[that.internal.plane]=1.0;
            var x =  [ z[2]*y[1] - z[1]*y[2],
                       z[0]*y[2] - z[2]*y[0],
                       z[1]*y[0] - z[0]*y[1] ];
            var sum=x[0]+x[1]+x[2];
            if (sum>0)
                doflip=true;
            if (flip1)
                doflip=!doflip;
            return doflip;
        });
        
        this.internal.camerabelow=computecamerabelow();
    }

    /** sets a canvas to draw in. If set then BisImageSlicer will use the canvas as a place to draw texture in. (Default mode really)
     * @param {CanvasElement} - canvas to draw in 
     */
    setcanvas(canvas) {
        this.internal.canvas=canvas;
        this.internal.outputslice=null;
        this.internal.canvasdata=null;
    }

    /** when called makes sure that next time gets {@link BisImageSlicer.doineedtoupdate} is called the result is true. Used to force reslicing.
     */
    setnexttimeforce() {
        this.internal.nexttimeforce=true;
    }
    
    /** check if the last time a slice was generated is still good. Called by viewers before calling {@link BisImageSlicer.getslice}
     * @param {slice} - slice to extract
     * @param {frame} - frame to extract (if image is 4D).
     * @returns {boolean}
     */
    doineedtoupdate(slice,frame) {

        frame = frame || this.currentframe;
        
        if (this.internal.nexttimeforce === true)
            return true;

        if (this.internal.outputslice===null)
            return true;
        
        slice=util.range(slice,0,this.internal.imagedim[this.internal.plane]-1);
        frame=util.range(frame,0,this.internal.imagedim[3]-1);
        
        if (slice === this.internal.currentslice && frame === this.internal.currentframe ) 
            return false;

        return true;
    }
    
    
    /** Workhorse function. Extract a slice and put either in canvas or return a typedarray with the intensities. The later is really only for command line testing when canvas is not available.
     * @param {slice} - slice to extract
     * @param {frame} - frame to extract (if image is 4D).
     * @param {BisF.ColorMapperFunction} - colormapping function
     * @returns - either the canvas it draw in or a TypedArray if no canvas is in use.
     */
    getslice(slice,frame,mapfunction) { 

        if (this.internal.iscolor)
            return this.getColorSlice(slice,frame);
        
        frame = frame || 0;
        mapfunction = mapfunction || this.internal.mapfunction;
        this.internal.outofrange=false;
        
        if (this.internal.canvas!==null)
            this.prepareCanvas();

        this.internal.nexttimeforce=false;
        this.internal.currentslice=slice;
        this.internal.currentframe=frame;

        
        
        let sourceWidth=this.internal.imagedim[0];
        let sourceHeight=this.internal.imagedim[1];
        let sourceDepth=this.internal.imagedim[2];
        let voloffset=(sourceWidth*sourceHeight*sourceDepth)*this.internal.currentframe;
        let v=[0,0,0,0];

        if (this.internal.outputslice===null)
            this.internal.outputslice=new Uint8Array(this.internal.slicedim[0]*this.internal.slicedim[1]*4);

        if (this.internal.plane==2) {
            if (this.internal.currentslice<0 || this.internal.currentslice>=sourceDepth) {
                for (let ij=0;ij<sourceHeight*sourceWidth*4;ij++) 
                    this.internal.outputslice[ij]=0;
                this.internal.outofrange=true;
            } else {
                let offset=this.internal.currentslice*this.internal.imagedim[0]*this.internal.imagedim[1]+voloffset;
                let outindex=0;
                let index=0;
                for (let j=0;j<sourceHeight;j++) {
                    for (let i=0;i<sourceWidth;i++) {
                        mapfunction(this.internal.imagedata,offset+index,v);
                        this.internal.outputslice[outindex]=v[0];
                        this.internal.outputslice[outindex+1]=v[1];
                        this.internal.outputslice[outindex+2]=v[2];
                        this.internal.outputslice[outindex+3]=v[3];
                        ++index; outindex+=4;
                    }
                }
            }
        } else if (this.internal.plane===1) {
            if (this.internal.currentslice<0 || this.internal.currentslice>=sourceHeight) {
                for (let ij=0;ij<sourceDepth*sourceWidth*4;ij++) 
                    this.internal.outputslice[ij]=0;
                this.internal.outofrange=true;
            } else {
                let outindex=0;
                for (let j=0;j<sourceDepth;j++) {
                    let sliceoffset= voloffset+j*sourceWidth*sourceHeight+this.internal.currentslice*sourceWidth;
                    for (let i=0;i<sourceWidth;i++) {
                        mapfunction(this.internal.imagedata,sliceoffset+i,v);
                        this.internal.outputslice[outindex]=v[0];
                        this.internal.outputslice[outindex+1]=v[1];
                        this.internal.outputslice[outindex+2]=v[2];
                        this.internal.outputslice[outindex+3]=v[3];
                        outindex+=4;
                    }
                }
            }
        } else {
            if (this.internal.currentslice<0 || this.internal.currentslice>=sourceWidth) {
                for (let ij=0;ij<sourceDepth*sourceHeight*4;ij++) 
                    this.internal.outputslice[ij]=0;
                this.internal.outofrange=true;
            } else {
                let outindex=0;
                for (let j=0;j<sourceDepth;j++) {
                    let sliceoffset=j*sourceWidth*sourceHeight+this.internal.currentslice+voloffset;
                    for (let i=0;i<sourceHeight;i++) {
                        mapfunction(this.internal.imagedata,sliceoffset+i*sourceWidth,v);
                        this.internal.outputslice[outindex]=v[0];
                        this.internal.outputslice[outindex+1]=v[1];
                        this.internal.outputslice[outindex+2]=v[2];
                        this.internal.outputslice[outindex+3]=v[3];
                        outindex+=4;
                    }
                }
            }
        }

        if (this.internal.canvas!==null) {
            this.internal.canvas.getContext("2d").putImageData(this.internal.canvasdata,0,0);
            return this.internal.canvas;
        }
        
        return this.internal.outputslice;
    }


    getColorSlice(slice,frame) { 

        frame = frame || 0;
        this.internal.outofrange=false;
        
        if (this.internal.canvas!==null)
            this.prepareCanvas();

        this.internal.nexttimeforce=false;
        this.internal.currentslice=slice;
        this.internal.currentframe=frame;

        
        
        let sourceWidth=this.internal.imagedim[0];
        let sourceHeight=this.internal.imagedim[1];
        let sourceDepth=this.internal.imagedim[2];
        let voloffset=(sourceWidth*sourceHeight*sourceDepth)*this.internal.currentframe;
        let coloffset=(sourceWidth*sourceHeight*sourceDepth*this.internal.imagedim[3]);

        if (this.internal.outputslice===null)
            this.internal.outputslice=new Uint8Array(this.internal.slicedim[0]*this.internal.slicedim[1]*4);

        if (this.internal.plane==2) {
            if (this.internal.currentslice<0 || this.internal.currentslice>=sourceDepth) {
                for (let ij=0;ij<sourceHeight*sourceWidth*4;ij++) 
                    this.internal.outputslice[ij]=0;
                this.internal.outofrange=true;
            } else {
                let offset=this.internal.currentslice*this.internal.imagedim[0]*this.internal.imagedim[1]+voloffset;
                let outindex=0;
                let index=0;
                for (let j=0;j<sourceHeight;j++) {
                    for (let i=0;i<sourceWidth;i++) {
                        for (let k=0;k<=2;k++) {
                            this.internal.outputslice[outindex+k]= this.internal.imagedata[offset+index+k*coloffset];
                        }
                        this.internal.outputslice[outindex+3]=255;
                        ++index; outindex+=4;
                    }
                }
            }
        } else if (this.internal.plane===1) {
            if (this.internal.currentslice<0 || this.internal.currentslice>=sourceHeight) {
                for (let ij=0;ij<sourceDepth*sourceWidth*4;ij++) 
                    this.internal.outputslice[ij]=0;
                this.internal.outofrange=true;
            } else {
                let outindex=0;
                for (let j=0;j<sourceDepth;j++) {
                    let sliceoffset= voloffset+j*sourceWidth*sourceHeight+this.internal.currentslice*sourceWidth;
                    for (let i=0;i<sourceWidth;i++) {
                        for (let k=0;k<=2;k++) {
                            this.internal.outputslice[outindex+k]= this.internal.imagedata[sliceoffset+i+k*coloffset];
                        }
                        this.internal.outputslice[outindex+3]=255;
                        outindex+=4;
                    }
                }
            }
        } else {
            if (this.internal.currentslice<0 || this.internal.currentslice>=sourceWidth) {
                for (let ij=0;ij<sourceDepth*sourceHeight*4;ij++) 
                    this.internal.outputslice[ij]=0;
                this.internal.outofrange=true;
            } else {
                let outindex=0;
                for (let j=0;j<sourceDepth;j++) {
                    let sliceoffset=j*sourceWidth*sourceHeight+this.internal.currentslice+voloffset;
                    for (let i=0;i<sourceHeight;i++) {
                        for (let k=0;k<=2;k++) 
                            this.internal.outputslice[outindex+k]=this.internal.imagedata[sliceoffset+i*sourceWidth+k*coloffset];
                        this.internal.outputslice[outindex+3]=255;
                        outindex+=4;
                    }
                }
            }
        }

        if (this.internal.canvas!==null) {
            this.internal.canvas.getContext("2d").putImageData(this.internal.canvasdata,0,0);
            return this.internal.canvas;
        }
        
        return this.internal.outputslice;
    }


    /** Get the last slice and frame used to create slice by {@link BisImageSlicer.getslice}.
     * @returns {array } - [ lastslice,lastframe ]
     */
    getsliceframecoords() {
        return [ this.internal.currentslice, this.internal.currentframe ];
    }

    /** Get the current slice dimensions (which depend on the input image and the plane)
     * @returns {array } - [ width,height ]
     */
    getslicedims() {
        return [ this.internal.slicedim[0], this.internal.slicedim[1] ];
    }

    /** Get the current slice extent (which depend on the input image and the plane). This is where the slice appears in the image. 
        This is from -0.5*imagespacing to imagespacing*(imagedim-0.5) such that the center of the first voxel is at 0,0
        * @memberof BisImageSlicer.prototype
        * @returns {array } - [ xmin,ymin,xmax,ymax];
        */
    getsliceextent () {
        return [
                -0.5*this.internal.slicespa[0],
                -0.5*this.internal.slicespa[1],
            (this.internal.slicedim[0]-0.5)*this.internal.slicespa[0],
            (this.internal.slicedim[1]-0.5)*this.internal.slicespa[1] ];
    }

    /** Get the current position of the slice (along the coordinate equal to the image plane, e.g. if image plane==2 then this is z)
     * @returns {number } - `zcoordinate'
     */
    getsliceoffset() {
        var offset = [ 0,0,0 ];
        offset[this.internal.plane]=0.001*Math.round(this.internal.currentslice*this.internal.imagespa[this.internal.plane]*1000.0);
        return offset;
    }
    
    /** Get the current x,y,z position of the center of the slice. Used to position cameras
     * @returns {array } - [x,y,z];
     */
    getslicecenter() {
        var cnt= [ 0.5*(this.internal.slicedim[0]-1)*this.internal.slicespa[0],
                   0.5*(this.internal.slicedim[1]-1)*this.internal.slicespa[1] ];
        var pos = this.internal.currentslice*this.internal.imagespa[this.internal.plane];
        
        if (this.internal.plane==2)
            return [ cnt[0], cnt[1], pos ];
        
        if (this.internal.plane==1)
            return [ cnt[0], pos, cnt[1] ];

        return [ pos, cnt[0], cnt[1] ];
    }

    /** Returns points to image planes for use by {@link Bis_3dOrthogonalSlice}.
     * @returns {array } 
     */
    getplanepoints() {
        var ext=this.getsliceextent();
        
        if (this.internal.plane === 2)
            return [ [ ext[0], ext[1], 0.0 ],
                     [ ext[0], ext[3], 0.0 ],
                     [ ext[2], ext[3], 0.0 ]];
        
        if (this.internal.plane ===1)
            return [ [ ext[0], 0.0, ext[1] ],
                     [ ext[0], 0.0, ext[3] ],
                     [ ext[2], 0.0, ext[3] ] ];
        
        return [ [ 0.0, ext[0], ext[1] ],
                 [ 0.0, ext[0], ext[3] ],
                 [ 0.0, ext[2], ext[3] ] ];
    }

    /** Returns points to outline planes for use by {@link Bis_3dOrthogonalSlice}.
     * @returns {array } 
     */
    getoutlineplanepoints() {
        var ext=this.getsliceextent();
        ext[0]-=0.5*this.internal.slicespa[0];
        ext[2]+=0.5*this.internal.slicespa[0];
        ext[1]-=0.5*this.internal.slicespa[1];
        ext[3]+=0.5*this.internal.slicespa[1];
        
        if (this.internal.plane === 2) 
            return [ [ ext[0], ext[1], 0.0 ],
                     [ ext[0], ext[3], 0.0 ],
                     [ ext[2], ext[3], 0.0 ]];
        
        if (this.internal.plane ===1) 
            return [ [ ext[0], 0.0, ext[1] ],
                     [ ext[0], 0.0, ext[3] ],
                     [ ext[2], 0.0, ext[3] ] ];
        

        return [ [ 0.0, ext[0], ext[1] ],
                 [ 0.0, ext[0], ext[3] ],
                 [ 0.0, ext[2], ext[3] ] ];
    }


    /** Returns points to draw axis cross hairs for use by {@link Bis_3dOrthogonalSlice} to draw axis
     * @returns {array } 
     */
    getaxispoints() {

        var ext= [ 0,0,
                   (this.internal.slicedim[0]-1)*this.internal.slicespa[0],
                   (this.internal.slicedim[1]-1)*this.internal.slicespa[1] ];
        var sz=0.5*this.internal.imagespa[this.internal.plane];

        if (this.internal.plane==2)
            return [ // x-axis, y=0,z=+-
                [ [ ext[0], ext[1], -sz ],
                  [ ext[0], ext[1],  sz ],
                  [ ext[2], ext[1],  sz ],
                ], // y-axis, x=0, z=+-
                [ [ ext[0], ext[1], -sz ],
                  [ ext[0], ext[1],  sz ],
                  [ ext[0], ext[3],  sz ],
                ],
            ];

        if (this.internal.plane ===1) 
            return [ // x-axis, z=0,y=+-
                [ [ ext[0],-sz, ext[1] ],
                  [ ext[0], sz, ext[1] ],
                  [ ext[2], sz, ext[1] ],
                ], // z-axis, x=0, y=+-
                [ [ ext[0],-sz, ext[1] ],
                  [ ext[0], sz, ext[1] ],
                  [ ext[0], sz, ext[3] ],
                ],
            ];
        
        return [ // y-axis, z=0,x=+-
            [ [ -sz, ext[0],ext[1] ],
              [  sz, ext[0],ext[1] ],
              [  sz, ext[2],ext[1] ],
            ], // z-axis, y=0, x=+-
            [ [ -sz, ext[0],ext[1] ],
              [  sz, ext[0],ext[1] ],
              [  sz, ext[0],ext[3] ],
            ],
        ];
        
    }

    /** This returns a flag as to whether the camera is ``above' or ``behind'' the slice.
     * Needed to draw overlays a little closer to the camera
     * @returns {boolean}
     */
    getcamerabelow() {
        return this.internal.camerabelow;
    }
    

    /** 
     * Get the correct position (x,y,z) to put a camera at so that this image plane looks correct
     * @returns {array} - [ x,y,z]
     */
    getcamerapos() {
        var cnt = this.getslicecenter();
        if (this.internal.camerabelow)
            cnt[this.internal.plane]=-0.5*this.internal.cameradepth;
        else
            cnt[this.internal.plane]=this.internal.imagedim[this.internal.plane]*this.internal.imagespa[this.internal.plane]+0.5*this.internal.cameradepth;

        return cnt;
    }
    
    /** 
     * Get the correct up vector (x,y,z) for a camera at so that this image plane looks correct
     * @returns {array} - [ x,y,z]
     */
    getcameraup() {

        var upv= [ 0,0,0];
        var axes = this.getminmaxaxis();
        var maxaxis=axes[1];
        var value=-1.0;
        if (this.internal.imageorientinvflip[maxaxis]>0) {
            value=1.0;
        }

        upv[maxaxis]=value;
        return upv;
        
        /*return [ 0,-1,0 ];
          
          if (this.internal.plane ==1)
          return [ 0,0,-1 ];
          return [ 0,0,-1 ];*/

    }

    /** returns if slice is out of range <0 or >=maxslice 
     * @returns {Boolean}
     */
    getoutofrange() {
        return this.internal.outofrange;
    }

}

module.exports = BisImageSlicer;






