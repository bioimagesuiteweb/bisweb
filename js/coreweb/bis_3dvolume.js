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
const webutil=require('bis_webutil');
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
            // TODO: look the dtype up in the volume metadata
            let dim=image.getDimensions();
            let spa=image.getSpacing();

            let p_dim=[2,2,2];
            for (let i=0;i<=2;i++) {
                while (p_dim[i]<dim[i])
                    p_dim[i]*=2;
            }

            let range=image.getIntensityRange();
            let scale=255.0/(range[1]-range[0]);

            internal.minintensity=range[0];
            internal.intensityscale=scale;
            p_dim= dim;
            console.log('New Volume = ',p_dim);

            let data=image.getImageData();
            let p_data=new Uint8Array(p_dim[0]*p_dim[1]*p_dim[2]);
            let slicesize=dim[0]*dim[1];
            let p_slicesize=p_dim[0]*p_dim[1];
            for (let k=0;k<dim[2];k++) {
                for (let j=0;j<dim[1];j++) {
                    for (let i=0;i<dim[0];i++) {
                        let v=data[i+j*dim[0]+k*slicesize];
                        let y=(v-range[0])*scale;
                        p_data[i+j*p_dim[0]+k*p_slicesize]=y;
                    }
                }
            }
                        
            
            let volume = {
                xLength : p_dim[0],
                yLength : p_dim[1],
                zLength : p_dim[2],
                data : p_data
            };
            
            internal.volconfig = { clim1: 0, clim2: 1, renderstyle: 'iso', isothreshold: 0.15, colormap: 'gray' };
            
            
            
            /*
              let gui = new internal.dat.GUI({autoPlace : false});
              console.log(gui);
              gui.add( internal.volconfig, 'clim1', 0, 1, 0.01 ).onChange( updateUniforms );
              gui.add( internal.volconfig, 'clim2', 0, 1, 0.01 ).onChange( updateUniforms );
              gui.add( internal.volconfig, 'colormap', { gray: 'gray', viridis: 'viridis' } ).onChange( updateUniforms );
              gui.add( internal.volconfig, 'renderstyle', { mip: 'mip', iso: 'iso' } ).onChange( updateUniforms );
              gui.add( internal.volconfig, 'isothreshold', 0, 1, 0.01 ).onChange( updateUniforms );
              */

            
            // Texture to hold the volume. We have scalars, so we put our data in the red channel.
            // THREEJS will select R32F (33326) based on the RedFormat and FloatType.
            // Also see https://www.khronos.org/registry/webgl/specs/latest/2.0/#TEXTURE_TYPES_FORMATS_FROM_DOM_ELEMENTS_TABLE
            // TODO: look the dtype up in the volume metadata
            internal.texture = new THREE.DataTexture3D( volume.data, volume.xLength, volume.yLength, volume.zLength );
            internal.texture.format = THREE.RedFormat;
            internal.texture.minFilter = internal.texture.magFilter = THREE.NearestFilter;//THREE.LinearFilter;
            internal.texture.unpackAlignment = 1;
            internal.texture.repeat=[0,0];
            internal.texture.needsUpdate = true;
            
            // internal.texture.type = THREE.FloatType;

            // Colormap textures
            
            let cmtexture= new THREE.TextureLoader().load(webutil.getWebPageImagePath()+'/cm_gray.png');

            
            // Material
            let shader = volrenutils.VolumeRenderShader;

            console.log('Values=',JSON.stringify(internal.volconfig,null,2));
            
            let uniforms = THREE.UniformsUtils.clone( shader.uniforms );
            uniforms.u_data.value = internal.texture;
            uniforms.u_spacing.value.set( 1.0/spa[0],1.0/spa[1],1.0/spa[2]);
            uniforms.u_size.value.set( volume.xLength, volume.yLength, volume.zLength );
            uniforms.u_clim.value.set( internal.volconfig.clim1, internal.volconfig.clim2 );
            uniforms.u_renderstyle.value = internal.volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
            uniforms.u_renderthreshold.value = internal.volconfig.isothreshold; // For ISO renderstyle
            uniforms.u_cmdata.value = cmtexture;
            
            internal.material = new THREE.ShaderMaterial( {
                uniforms: uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader,
                //                side: THREE.BackSide // The volume shader uses the backface as its "reference point"
            } );
            
            // Mesh
            let sz=[ 0,0,0];
            for (let i=0;i<=2;i++) {
                sz[i]=(p_dim[i]*spa[i]);
            }
            let geometry = new BIS3dImageVolumeGeometry(p_dim,spa);
            //            geometry.scale(spa[0],spa[1],spa[2]);
            //            geometry.translate(-0.5*spa[0],-0.5*spa[1],-0.5*spa[2]);
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
         * @returns {BisF.ColorMapperFunction} - function to perform colormapping
         */
        updateColormap : function (transferfunction) {

            let volinfo=transferfunction.volumerendering;
            //            console.log('volinfo=',JSON.stringify(transferfunction,null,2));
            
            if (volinfo.mip)
                internal.material.uniforms.u_renderstyle.value = 0;
            else
                internal.material.uniforms.u_renderstyle.value = 1;
            
            let minv=(volinfo.min-internal.minintensity)*internal.intensityscale/255.0;
            let maxv=(volinfo.max-internal.minintensity)*internal.intensityscale/255.0;
            internal.material.uniforms.u_clim.value.set( minv,maxv);
            
            let thr=(volinfo.isothreshold-internal.minintensity)*internal.intensityscale/255.0;
            internal.material.uniforms.u_renderthreshold.value = thr;

            //console.log('Values=', JSON.stringify({'min' : minv, 'max' : maxv,       'thr' : thr},null,3));
            
        },
    };
    output.initialize();
    output.createVolume();
    return output;
};


// ------------------------------------------------------------------------------------------------------

