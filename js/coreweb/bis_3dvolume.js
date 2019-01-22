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

/* global document*/

/** 
 * @file Browser ONLY module.Contains {@link Bis3dOrthogonalSlice} 
 * @author Xenios Papademetris
 * @version 1.0
 */



"use strict";


const THREE = require('three');
const BIS3dImageSliceGeometry=require('bis_3dimageslicegeometry');
const BIS3dImageVolumeGeometry=require('bis_3dimagevolumegeometry');
const volrenutils=require('bis_3dvolrenutils');


/**
 * A classes that create  a volume rendering as collection of ThreeJS objects and/remove these from a scene.
 * @namespace Bis_3DVolume
 */


/** 
 * A class to create a 3d volume  (volume rendering for 3D viewing).
 * This is hidden behind a factory function -- see example below. <BR>
 * @constructs Bis_3DOrthogonalSlice.Bis3DVolume
 * @param {BisImage} image - the input image
 * @param {array} in_slices - array of  3 {@link Bis_3DOrthogonalSlice.Bis2DImageSlice} objects for reference
 * @param {boolean} decorations -  if true create outline obejcts (e.g. box around)
 * @param {boolean} transparent - if true make underlying image plane mesh transparent (for overlays)
 * @example
 * To create use (no need to `new')
 * var new3card=bis3d_OrthogonalSlice.create3dvolume(volume,slices,decorations,transparent);
 */
module.exports=function(image,in_slices,decorations,transparent,imageplane,isoverlay) {
    
    if (imageplane!==false)
        imageplane=true;
    
    let internal = {
        slices : in_slices,
        volumebox : null,
        box: [ null,null,null,null,null,null ],
        hasdecorations : decorations,
        hasimageplane : imageplane,
        istransparent : transparent || false,
        texture : null,
        uniforms : null,
        renderer : null,
        isoverlay : isoverlay,
        minintensity : 0.0,
        intensityscale : 1.0,
        dimensions : image.getDimensions(),
    };
    
    
    let output = {

        count : 0,
        
        initialize : function() {
            
            let wire=[null,null,null];
            let sz = internal.slices[0].getimagesize();
            
            let boxmat= [ new THREE.MeshBasicMaterial( {color: 0x444444, wireframe:true}),
                          new THREE.MeshBasicMaterial( {color: 0xff8800, wireframe:true})];
            
            if (internal.hasdecorations) {
                
                for (let pl=0;pl<=2;pl++) {
                    let points =  internal.slices[pl].getplanepoints().slice(0);
                    wire[pl]=new BIS3dImageSliceGeometry(points[0],points[1],points[2],true,false);
                    let offset=internal.slices[pl].getsliceoffset();
                    for (let fr=0;fr<=1;fr++) {
                        offset[pl]=sz[pl]*fr;
                        let index=pl*2+fr;
                        internal.box[index]=new THREE.Mesh(wire[pl],boxmat[fr]);
                        internal.box[index].position.set(offset[0],offset[1],offset[2]);
                    }
                }
            }
        },

        createVolume :  function() {
            //   Code from https://threejs.org/examples/#webgl2_materials_texture3d_volume
            // Texture to hold the volume. We have scalars, so we put our data in the red channel.
            // THREEJS will select R32F (33326) based on the RedFormat and FloatType.
            // Also see https://www.khronos.org/registry/webgl/specs/latest/2.0/#TEXTURE_TYPES_FORMATS_FROM_DOM_ELEMENTS_TABLE

            let dim=image.getDimensions();
            let spa=image.getSpacing();
            let range=image.getIntensityRange();
            let tp=image.getImageType();
            let intoffset=0;
            let maxv=255;
            if (internal.overlay) {
                //maxv=253;
                //intoffset=2;
            }
            
            if (range[0]===0 && range[1]<=maxv && ( tp=='uchar' || tp ==='short' || tp ==='ushort' || tp==='char')) {
                internal.minintensity=0;
                internal.intensityscale=1.0;
                console.log('Not scaling',intoffset,maxv);
            } else if ( range[0] < 0 && range[1] > 0 && internal.overlay) {
                let maxint=range[1];
                if (Math.abs(range[0])>maxint)
                    maxint=Math.abs(range[0]);
                let scale=maxv/(2*maxint);
                internal.minintensity=-maxint;
                internal.intensityscale=scale;
                console.log('Symmetric scaling',intoffset,maxv);
            } else {
                let scale=maxv/(range[1]-range[0]);
                internal.minintensity=range[0];
                internal.intensityscale=scale;
                console.log('Normal scaling',internal.minintensity,internal.intensityscale,internal.isoverlay,' max=',maxv,intoffset);
            }
            
            let data=image.getImageData();
            let p_data=new Uint8Array(dim[0]*dim[1]*dim[2]);
            let slicesize=dim[0]*dim[1];
            let index=0;
            for(let k=0;k<dim[2];k++) {
                let offset=k*slicesize;
                for (let j=0;j<dim[1];j++) {
                    for (let i=0;i<dim[0];i++) {
                        let v=data[index];
                        index++;
                        let y=(v-internal.minintensity)*internal.intensityscale+intoffset;
                        // flip x -- seems to need this
                        p_data[offset+(dim[0]-1-i)]=y;
                    }
                    offset+=dim[0];
                }
            }

            // Data Texture
            internal.texture = new THREE.DataTexture3D( p_data, dim[0],dim[1],dim[2]);
            internal.texture.format = THREE.RedFormat;
            internal.texture.minFilter = internal.texture.magFilter = THREE.NearestFilter;//THREE.LinearFilter;
            internal.texture.unpackAlignment = 1;
            internal.texture.repeat=[0,0];
            internal.texture.flipY=false;
            internal.texture.needsUpdate = true;

            
            // Colormap texture
            internal.canvas = document.createElement( 'canvas' );
            internal.canvas.width=256;
            internal.canvas.height=1;
            internal.canvasdata=internal.canvas.getContext("2d").createImageData(256,1);
            
            for (let i=0;i<=255;i++)  {
                internal.canvasdata.data[i*4]=i;
                internal.canvasdata.data[i*4+1]=i;
                internal.canvasdata.data[i*4+2]=i;
                internal.canvasdata.data[i*4+3]=i;
            }
            internal.canvasdata.data[3]=0.0; //background transparent
            internal.canvas.getContext("2d").putImageData(internal.canvasdata,0,0);
            internal.cmtexture = new THREE.Texture(internal.canvas);
            internal.cmtexture.flipY=false;
            internal.cmtexture.needsUpdate = true;
            internal.cmtexture.minFilter = internal.cmtexture.magFilter = THREE.LinearFilter;


                        
            // Material Properties
            let shader = volrenutils.VolumeRenderShader;
            let uniforms = THREE.UniformsUtils.clone({
                "u_size": { value: new THREE.Vector3( dim[0],dim[1],dim[2]) },
                "u_spacing": { value: new THREE.Vector3( 1.0/spa[0],1.0/spa[1],1.0/spa[2] )},
                "u_renderstyle": { value: 1 },
                "u_renderthreshold": { value: 0.15 },
                "u_clim": { value: new THREE.Vector2( 0, 1 ) },
                "u_data": { value: null },
                "u_cmdata": { value: null },
                "u_opacity": { value : 0.5 },
                "u_stepsize": { value : 1.0 },
                "u_boundsmin": { value: new THREE.Vector3( 0.0, 0.0, 0.0 ) },
                "u_boundsmax": { value: new THREE.Vector3( 1.0,1.0,1.0)},
            });

            if (internal.isoverlay) {
                uniforms.u_opacity.value=1.0;
                uniforms.u_renderthreshold.value=0.0;
                uniforms.u_stepsize.value=2.0;
            }
                
            uniforms.u_cmdata.value = internal.cmtexture;
            uniforms.u_data.value = internal.texture;

            // Create Material
            internal.material = new THREE.ShaderMaterial( {
                uniforms: uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader,
                //side: THREE.BackSide // The volume shader uses the backface as its "reference point"
            } );
            
            // Create Geometry & Mesh
            let sz=[ 0,0,0];
            for (let i=0;i<=2;i++) {
                sz[i]=(dim[i]*spa[i]);
            }
            let geometry = new BIS3dImageVolumeGeometry(dim,spa);
            internal.volumebox = new THREE.Mesh( geometry, internal.material );
            //internal.box.push(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial(  {color: 0xffffff, wireframe:true})));
        },
        
        /** clean up all elements (i.e. set them to null)
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume
         */
        cleanup : function() {
            for (let i=0;i<internal.box.length;i++) 
                internal.box[i]=null;
            internal.volumebox=null;
            internal.texture=null;
        },

        /** adds all objects (imageplane, outline and axes depending on decoration mode)
         * to ThreeJS-Scene
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume.prototype
         * @param {ThreeJS-Scene} scene - ThreeJS-Scene object
         */
        addtoscene : function(scene,ren,camera) {

            internal.renderer=ren;
            internal.camera=camera;
            internal.scene=scene;
            if (internal.volumebox) {
                scene.add(internal.volumebox);
                //                if (internal.renderer)
                //  internal.renderer.render( internal.scene, internal.camera );
            }
            if (internal.hasdecorations) {
                for (let i=0;i<internal.box.length;i++) {
                    scene.add(internal.box[i]);
                }
            }
        },

        /** removes all objects (imageplane, outline and axes depending on decoration mode)
         * from ThreeJS-Scene
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume
         * @param {ThreeJS-Scene} scene - ThreeJS-Scene object
         */
        removefromscene : function(scene) {

            if (internal.volumebox)
                scene.remove(internal.volumebox);

            if (internal.hasdecorations) {
                for (let i=0;i<internal.box.length;i++) 
                    scene.remove(internal.box[i]);
            }
        },

        /**
         * this is a dummy function for compatibility with 3dCardSlice
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume
         */
        updatecoordinates : function () { return; },


        /**
         * this is a dummy function for compatibility with 3dCardSlice
         */ 
        updatecoordinatesinmm : function () { return; },
        
        /** Position the camera (set position, upvector and lookAt)
         * to correctly look at one of the three card slices. 
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume.prototype
         * @param {ThreeJS-OrthographicCamera} camera - the camera 
         * @param {number} i - the plane to look at 
         */
        positioncamera : function(camera,i,fromback) {

            if (fromback!==false)
                fromback=true;
            if (i !==0 )
                i= i || 1;
            return internal.slices[i].positioncamera(camera,fromback);
        },


        /** Show decorations if true show axis/outline (if they exist) else hide
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {boolean} show - if true show, else hide
         */
        showdecorations : function(show) {

            show = show || false;
            if (internal.hasdecorations) {
                for (let i=0;i<internal.box.length;i++) {
                    internal.box[i].visible=show;
                }
            }
        },

        /** dummy function */
        setnexttimeforce : function() { },


        
        interpolate : function (dointerpolate) {

            if (dointerpolate) 
                internal.texture.minFilter = internal.texture.magFilter = THREE.LinearFilter;
            else
                internal.texture.minFilter = internal.texture.magFilter = THREE.NearestFilter;
            
            internal.texture.needsUpdate = true;
            if (internal.renderer)
                internal.renderer.render( internal.scene, internal.camera );
        },

        /**
         * update the colormap with new transfer function
         */
        updateColormap : function (cmapcontrolPayload,transferfunction) {

            const uniforms=internal.material.uniforms;
            
            let volinfo=cmapcontrolPayload.volumerendering;
            if (!internal.isoverlay) {
                if (volinfo.mip)
                    uniforms.u_renderstyle.value = 0;
                else
                    uniforms.u_renderstyle.value = 1;
                
                let minv=(volinfo.min-internal.minintensity)*internal.intensityscale/255.0;
                let maxv=(volinfo.max-internal.minintensity)*internal.intensityscale/255.0;
                uniforms.u_clim.value.set( minv,maxv);
            
                let thr=(volinfo.isothreshold-internal.minintensity)*internal.intensityscale/255.0;
                uniforms.u_renderthreshold.value = thr;
            }

            //            console.log('Quality=',volinfo.quality);
            let step=1.0;
            if (volinfo.quality<2)
                step=3.0;
            else if (volinfo.quality>2)
                step=0.5;

            uniforms['u_stepsize'].value=(step);

            let minc = [ 0,0,0];
            let maxc = [ 0,0,0];
            for (let i=0;i<=2;i++) {
                minc[i]=volinfo.crop[2*i]/ (internal.dimensions[i]-1);
                maxc[i]=volinfo.crop[2*i+1]/ (internal.dimensions[i]-1);
                if (maxc[i]<minc[i]) {
                    let tmp=minc[i];
                    minc[i]=maxc[i];
                    maxc[i]=tmp;
                }
                if (i==0) {
                    let tmp=1.0-minc[i];
                    minc[i]=1.0-maxc[i];
                    maxc[i]=tmp;
                }
                                    
            }
            
            uniforms['u_boundsmin'].value.set(minc[0],minc[1],minc[2]);
            uniforms['u_boundsmax'].value.set(maxc[0],maxc[1],maxc[2]);


            // Change colormap
            //            console.log('updating colormap',internal.isoverlay,internal.minintensity,internal.intensityscale);
            if (internal.isoverlay) {
                let dat=[0,0,0,0];
                let idat=[0];
                
                for (let i=0;i<=255;i++) {
                    idat[0]= i/internal.intensityscale+internal.minintensity;
                    transferfunction(idat,0,dat);
                    if (i===1 || i===2)
                        console.log(i,'idat=',idat,'-->',dat);
                    let index=i*4;
                    let sum=dat[0]+dat[1]+dat[2];
                    if (sum>0)
                        dat[3]=255;
                    else
                        dat[3]=0;
                    for (let j=0;j<=3;j++) 
                        internal.canvasdata.data[index+j]=dat[j];
                }
                
                internal.canvas.getContext("2d").putImageData(internal.canvasdata,0,0);
                if (cmapcontrolPayload.isfunctional)
                    internal.cmtexture.minFilter = internal.cmtexture.magFilter = THREE.LinearFilter;
                else
                    internal.cmtexture.minFilter = internal.cmtexture.magFilter = THREE.NearestFilter;
                internal.cmtexture.needsUpdate = true;
            }
        },
    };
    output.initialize();
    output.createVolume();
    return output;
};


// ------------------------------------------------------------------------------------------------------

