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


/** A simple object with elements to describe a subviewer (i.e. one of the four viewers in orthoviewer or any one of the many viewers in mosaicviewer).
 * It has three children -- scene (a ThreeJs-Scene object), controls (a BIS_3dOrthographicCameraControls object) and a camera  object.
 * @typedef Bis_SubViewer
 * @property {ThreeJS-Scene} scene - a ThreeJS - Scene object
 * @property {Bis_3dOrthograpicCameraControls} controls - a camera controls object
 * @property {ThreeJS-OrthographicCamera} camera - a camera obejct
 */


"use strict";

const THREE = require('three');
const util=require('bis_util');
const BisImageSlicer= require('bis_imageslicer');
const BIS3dImageSliceGeometry=require('bis_3dimageslicegeometry');


/**
 * Two classes that create collections of ThreeJS objects and/remove these from a scene.
 * These represent image slices or combo image slices plus outlines, axes, cross-hairs etc.
 * @namespace Bis_3DOrthogonalSlice
 */


const AXIS_COLORS = [ [ [ 0,0.99,0] , [ 0,0,0.99 ]],
                      [ [ 0.99,0,0] , [ 0,0,0.99 ]],
                      [[ 0.99,0,0] , [ 0,0.99,0 ]]];

const exportobj = { };


/** 
 * A class to create a 2d slice collection (i.e. a textured plane, two cross hair axes and an outline plane) for a adding to a ThreeJS-scene
 * This is hidden behind a factory function -- see example below. <BR>
 * @constructs Bis_3DOrthogonalSlice.Bis2DImageSlice
 * @param {BisImage} volume - the input image
 * @param {number} in_plane - the image plane (0,1,2 to signify YZ,XZ, or XY plane)
 * @param {number} decoration mode -  a number 0,1 or 2. 0=nothing other than the image, 1=also draw outline,2=outline +cross-hairs
 * @param {boolean} objectmap - if true then this is a segmentation image and by default interpolation of texture if off
 * @param {boolean} transparent - if true make underlying image plane mesh transparent (for overlays)
 * @example
 * To create use (not need to `new')
 * var new2slice=bis3d_OrthogonalSlice.create2dslice(volume,plane,mode,objectmap,transparent);
 */
exportobj.create2dslice=function(volume,in_plane,decorationmode,objectmap,transparent) {
    

    var internal = { 
        decorationmode : decorationmode || 0,
        isobjectmap : objectmap || false,
        istransparent : transparent || false,
        plane : util.range(in_plane || 0 ,0,2),
        imageplane: null,
        outline   : null,
        axis1 : null,
        axis2 : null,
        canvas: null,
        texture: null,
        lastinterpolate : null,
        imageslicer : null,
        slicecoord : 0,
        frame : 0,
        imagespa : null,
        imagedim : null,
        imagesize : [ 1,1,1],
        imagerange : null,
    };

    var vert_text = 
        'void main() {\n'+
        '     vec3 transformed = vec3( position );\n'+
        '     vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );\n'+
        '     gl_Position = projectionMatrix * mvPosition;\n'+
        '     gl_Position.z=-0.85+0.001*gl_Position.z;\n'+
        '}\n';
    
    var shader_text=
        'uniform float opacity;\n'+
        'uniform vec3  diffuse;\n'+
        'void main() {\n'+
        '   gl_FragColor = vec4( diffuse.x,diffuse.y,diffuse.z, opacity );\n'+
        '}';
    
    
    var output= {
        
        initialize : function() {
            
            if (internal.decorations===true)
                internal.decorations=1;
            
            //if (internal.isobjectmap===true)
            internal.istransparent=true;
            
            // Get Image Information
            internal.imagedim=volume.getDimensions();
            internal.imagerange=volume.getIntensityRange();
            internal.imagespa=volume.getSpacing();
            internal.imagesize=volume.getImageSize();

            // Create canvas, slicer and set slice
            internal.canvas = document.createElement('canvas');
            internal.imageslicer =  new BisImageSlicer(volume, {
                plane : internal.plane,
                objectmapmode : internal.isobjectmap,
                padded : false,
            });
            internal.slicecoord=Math.floor(internal.imagedim[internal.plane]/2);
            internal.imageslicer.setcanvas(internal.canvas);
            
            // Get initial 2d texture map
            internal.imageslicer.getslice(internal.slicecoord,0,null,true);
            
            // Create texture
            internal.texture = new THREE.Texture(internal.canvas);
            internal.texture.flipY=false;
            internal.texture.needsUpdate = true;
            this.interpolate(!internal.isobjectmap);

            // Create Geometry
            var points =  internal.imageslicer.getplanepoints();
            var geometry = new BIS3dImageSliceGeometry(points[0],points[1],points[2],false);
            var material=new THREE.MeshLambertMaterial({map: internal.texture,      transparent:internal.istransparent});
            
            internal.imageplane = new THREE.Mesh(geometry, material);

            var offset=internal.imageslicer.getsliceoffset();
            internal.imageplane.position.set(offset[0],offset[1],offset[2]);


            if (internal.decorationmode>0) { 

                /*var wd=[ internal.imagesize[0] *0.005,
                  internal.imagesize[1] *0.005,
                  internal.imagesize[2] *0.005];
                  var wd2 = [ internal.imagespa[0] *1.0,
                  internal.imagespa[1] *1.0,
                  internal.imagespa[2] *1.0];*/

                
                var opoints =  internal.imageslicer.getoutlineplanepoints();
                var geometry2= new BIS3dImageSliceGeometry(opoints[0],opoints[1],opoints[2],true);

                
                var outline_material2 = new THREE.ShaderMaterial({
                    "uniforms": {
                        "diffuse": {"type":"c","value":
                                    {"r":1.0,
                                     "g":0.5,
                                     "b":0}},
                        "opacity": {"type":"f","value":1.0 }
                    },
                    transparent : false,
                    wireframe:true,
                    vertexShader : vert_text, 
                    fragmentShader: shader_text,
                });
                
                internal.outline = new THREE.Mesh(geometry2,outline_material2);
                //        new THREE.MeshBasicMaterial( {color: 0xff8800, wireframe:true}));

                
                
                internal.outline.position.set(offset[0],offset[1],offset[2]);
                if (internal.decorationmode>1) {


                    
                    var pts=internal.imageslicer.getaxispoints();
                    var cl1=AXIS_COLORS[internal.plane][0];
                    var cl2=AXIS_COLORS[internal.plane][1];
                    //                          console.log('cl='+[cl1,cl2]);
                    var axis_material = new THREE.ShaderMaterial({
                        "uniforms": {
                            "diffuse": {  "type":"c","value":
                                          {"r":cl1[0],
                                           "g":cl1[1],
                                           "b":cl1[2]}},
                            "opacity": {"type":"f","value":1.0},
                        },
                        transparent : true,
                        wireframe:true,
                        vertexShader : vert_text,
                        fragmentShader: shader_text,
                    });
                    
                    var axis_material2 = new THREE.ShaderMaterial({
                        "uniforms": {
                            "diffuse": {"type":"c","value":
                                        {"r":cl2[0],
                                         "g":cl2[1],
                                         "b":cl2[2]}},
                            "opacity": {"type":"f","value":1.0 }
                        },
                        transparent : false,
                        wireframe:true,
                        vertexShader : vert_text, 
                        fragmentShader: shader_text,
                    });

                    
                    internal.axis1=new THREE.Mesh(new BIS3dImageSliceGeometry(pts[0][0],
                                                                              pts[0][1],pts[0][2],true),
                                                  axis_material);
                    internal.axis2=new THREE.Mesh(new BIS3dImageSliceGeometry(pts[1][0],pts[1][1],
                                                                              pts[1][2],true),
                                                  axis_material2);
                }
            }
            
        },

        /** clean up all elements (i.e. set them to null)
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         */
        cleanup : function() {
            internal.imageplane=null;
            internal.outline=null;
            internal.axis1=null;
            internal.axis2=null;
            internal.canvas=null;
            internal.texture=null;
            internal.imageslicer=null;
        },

        /** get the image plane (0,1 or 2)
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {number} image plane
         */
        getplane : function() {
            return internal.plane;
        },

        /** get the current slice number
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {number} slice number
         */
        getsliceno : function () {
            return internal.slicecoord;
        },

        /** get the current frame
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {number} frame
         */
        getframeno : function ()  {
            return internal.frame;
        },

        /** get the images size (this is the same as BisImage.getImageSize(), i.e. spacing*dimensions)
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {array} [ width,height,depth] in mm
         */
        getimagesize : function ()  {
            return internal.imagesize;
        },

        /** KEY function, sets the slice and frame and forces update of display
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {number} sl - the slice 
         * @param {number} fr - the frame 
         * @param {BisF.ColorMapperFunction} mapfunction - the colormapping function
         * @param {boolean} force - if true force update, otherwise check if update bis needed. Used when changing mapfunction for example.
         */
        setsliceno : function (sl,fr,mapfunction,force) {

            fr = fr || 0;
            force = force || false;

            if (internal.imageslicer.doineedtoupdate(sl,fr) || force === true) {
                internal.imageslicer.getslice(sl,fr,mapfunction);
                var offset=internal.imageslicer.getsliceoffset();
                var f =internal.imageslicer.getsliceframecoords();
                internal.slicecoord=f[0];
                internal.frame=f[1];

                internal.imageplane.position.set(offset[0],offset[1],offset[2]);

                if (internal.outline !==null)  {
                    internal.outline.position.set(offset[0],offset[1],offset[2]);
                }
                internal.texture.needsUpdate=true;
            } 
            return internal.slicecoord;
        },
        
        /** Update camera clip settings to just show this slice and +- thickness in-front and behind
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {ThreeJS-OrthographicCamera} camera - the camera 
         * @param {number} thickness - sets camera.near=position-thickness and camera.far=position+thickness
         */
        updatecameraclip : function (camera,thickness) {

            thickness=thickness|| 0.1*internal.imagespa[internal.plane];

            var offset=internal.imageslicer.getsliceoffset();
            var campos=camera.position;
            var p=0;
            if (internal.plane===2)
                p=campos.z;
            else if (internal.plane===1)
                p=campos.y;
            else
                p=campos.x;
            var d=Math.abs(p-offset[internal.plane]);

            camera.near=d-thickness;
            camera.far=d+thickness;
        },

        /** KEY function, sets the slice (in mm) and frame and forces update of display
         * this is used for overlays which need to be positioned slightly above the main slice (depending on camera pos)
         * and may have different voxel dimensions than image so slice is specified in mm.
         * We extract the ``nearest neighbor'' slice 
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {number} slmm - the slice in mm.
         * @param {number} fr - the frame 
         * @param {BisF.ColorMapperFunction} mapfunction - the colormapping function
         * @param {boolean} force - if true force update, otherwise check if update bis needed. Used when changing mapfunction for example.
         */
        setsliceinmm : function (masterslice,slmm,fr,mapfunction,force) {

            fr = fr || 0;
            force = force || false;

            var sl=Math.floor(slmm/internal.imagespa[internal.plane]);
            
            if (internal.imageslicer.doineedtoupdate(sl,fr) || force === true) {
                // We have a new slice
                internal.imageslicer.getslice(sl,fr,mapfunction);
            }
            
            var f =internal.imageslicer.getsliceframecoords();
            internal.slicecoord=f[0];
            internal.frame=f[1];
            
            var offset=masterslice.getsliceoffset();
            var shift=0.05;
            if (internal.imageslicer.getcamerabelow())
                shift=-0.05;
            offset[internal.plane]+=shift*internal.imagespa[internal.plane];
            
            internal.imageplane.position.set(offset[0],offset[1],offset[2]);
            if (internal.outline !==null) {
                internal.outline.position.set(offset[0],offset[1],offset[2]);
            }
            internal.texture.needsUpdate=true;
            return internal.slicecoord[0];
        },

        
        /** Draws the cross hairs (if decoration mode is appropriately set)
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {array} coords - [x,y,z] crosshair positions in voxels
         */
        drawcrosshairs : function (coords) {
            
            if (internal.axis1 === null)
                return;

            var x0=coords[0]*internal.imagespa[0],
                y0=coords[1]*internal.imagespa[1],
                z0=coords[2]*internal.imagespa[2];

            if (internal.plane==2) {
                internal.axis1.position.set(0,y0,z0);
                internal.axis2.position.set(x0,0,z0);
            } else if (internal.plane==1) {
                internal.axis1.position.set(0,y0,z0);
                internal.axis2.position.set(x0,y0,0);
            } else {
                internal.axis1.position.set(x0, 0,z0);
                internal.axis2.position.set(x0, y0,0);
            }
            
        },
        
        /** adds all objects (imageplane, outline and axes depending on decoration mode)
         * to ThreeJS-Scene
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {ThreeJS-Scene} scene - ThreeJS-Scene object
         */
        addtoscene : function(scene) {
            scene.add(internal.imageplane);
            
            if (internal.outline!==null)  {
                scene.add(internal.outline);
            }
            if (internal.axis1!==null) { 
                scene.add(internal.axis1);
                scene.add(internal.axis2);
            }

        },

        /** removes all objects (imageplane, outline and axes depending on decoration mode)
         * from ThreeJS-Scene
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {ThreeJS-Scene} scene - ThreeJS-Scene object
         */
        removefromscene : function(scene) {
            scene.remove(internal.imageplane);

            if (internal.outline!==null) {
                scene.remove(internal.outline);
            }

            if (internal.axis1!==null) { 
                scene.remove(internal.axis1);
                scene.remove(internal.axis2);
            }

        },
        
        /** get appropriate camera position for looking at this slice
         * internally calls {@link BisImageSlicer}.getcamerapos
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {array} [x,y,z] coordinates to set camera to
         */
        getcamerapos : function() {
            return internal.imageslicer.getcamerapos();
        },

        /** get scene center
         * internally calls {@link BisImageSlicer}.getslicecenter()
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {array} [x,y,z] coordinates to set camera center to
         */
        getscenecenter : function() {
            return internal.imageslicer.getslicecenter();
        },

        /** get up vector for the camera to correctly look at this slice
         * internally calls {@link BisImageSlicer}.getcameraup()
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {array} [x,y,z] coordinates to set camera up vector to
         */
        getupvector : function() {
            return internal.imageslicer.getcameraup();
        },

        /** Position the camera (set position, upvector and lookAt)
         * to correctly look at this image slice
         * @param {boolean} fromback - if true move to other side
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {ThreeJS-OrthographicCamera} camera - the camera 
         */
        positioncamera : function(camera,fromback) {
            
            fromback=fromback || false;

            var campos=this.getcamerapos();
            var meanpos=this.getscenecenter();
            var upv=this.getupvector();
            
            if (fromback) {
                for (var ia=0;ia<=2;ia++) {
                    var d=meanpos[ia]-campos[ia];
                    campos[ia]+=2*d;
                }
            }
            camera.position.set(campos[0],campos[1],campos[2]);
            camera.up.set(upv[0],upv[1],upv[2]);
            var lkv=new THREE.Vector3(meanpos[0],meanpos[1],meanpos[2]);
            camera.lookAt(lkv);
            return lkv;
        },

        /** Internally calls {@link BisImageSlicer}.getplanepoints
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {array}  of point coordinates
         */
        getplanepoints : function() {
            return internal.imageslicer.getplanepoints();
        },
        
        /** Get the internal texture
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {ThreeJS-Texture} texture that is rendered
         */
        gettexture : function() {
            return internal.texture;
        },

        /** Get the internal canvas
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {CanvasElement} canvas where texture is taken from
         */
        getcanvas : function() { 
            return internal.canvas;
        },

        /** Get the slice offset. Calls {@link BisImageSlicer}.getsliceoffset
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @returns {number } - `zcoordinate' of slice
         */
        getsliceoffset : function() {
            return internal.imageslicer.getsliceoffset();
        },

        /** when called makes sure that next time setslice/setslicemm is called we force the update
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         */
        setnexttimeforce : function() {
            internal.imageslicer.setnexttimeforce();
        },


        /** Show decorations if true show axis/outline (if they exist) else hide
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {boolean} show - if true show, else hide
         */
        showdecorations : function(show) {

            show = show || false;
            if (internal.imageslicer.getoutofrange())
                show=false;
            
            if (internal.outline!==null) {
                internal.outline.visible=show;
            }
            if (internal.axis1!==null) { 
                internal.axis1.visible=show;
                internal.axis2.visible=show;
            }
        },

        /** Interpoalte texture or not
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {boolean} dointerpolate - if true interpolate (set texture.minFilter=THREE.LinearFilter) else (texture.minFilter=THREE.NearestFilter);
         */
        interpolate : function (dointerpolate) {
            if (internal.texture===null)
                return;

            dointerpolate = dointerpolate || false;
            if (dointerpolate===internal.lastinterpolate)
                return;
            internal.lastinterpolate=dointerpolate;

            if (dointerpolate) {
                internal.texture.minFilter=THREE.LinearFilter;
                internal.texture.magFilter=THREE.LinearFilter;
            } else {
                internal.texture.minFilter=THREE.NearestFilter;
                internal.texture.magFilter=THREE.NearestFilter;
            }
        },
    };
    
    output.initialize();
    return output;
};


/** 
 * A class to create a 3d card slice (three interescting slices for 3D viewing). This is collection (i.e. three textured planes etc.) that are added to a scene.
 * This uses three existing {@link Bis_3DOrthogonalSlice.Bis2DImageSlice} objects as a basis and copies info from them for the 3D side of things
 * This is hidden behind a factory function -- see example below. <BR>
 * @constructs Bis_3DOrthogonalSlice.Bis3DCardSlice
 * @param {BisImage} volume - the input image
 * @param {array} in_slices - array of  3 {@link Bis_3DOrthogonalSlice.Bis2DImageSlice} objects.
 * @param {boolean} decorations -  if true create outline obejcts (e.g. box around)
 * @param {boolean} transparent - if true make underlying image plane mesh transparent (for overlays)
 * @example
 * To create use (not need to `new')
 * var new3card=bis3d_OrthogonalSlice.create3cardslice(volume,slices,decorations,transparent);
 */
exportobj.create3cardslice=function(vol,in_slices,
                                    decorations,transparent,
                                    imageplane) {

    if (imageplane!==false)
        imageplane=true;

    let dim=vol.getDimensions();
    let spa=vol.getSpacing();
    

    let internal = {
        slices : in_slices,
        imageplane : [ null,null,null ],
        outlineplane : [ null,null,null ],
        box: [ null,null,null,null,null,null ],
        hasdecorations : decorations || false,
        hasimageplane : imageplane,
        istransparent : transparent || false,
        sizex : (dim[0]-1)*spa[0],
    };

    
    let output = {

        initialize : function() {
            
            let wire=[null,null,null],offset;
            let flipx= [[ false,false],[false,false],[false,false] ];
            for (let i=0;i<=2;i++) {
                let points =  internal.slices[i].getplanepoints().slice(0);
                if (internal.hasimageplane) {
                    internal.imageplane[i]=new THREE.Mesh(new BIS3dImageSliceGeometry(points[0],points[1],points[2],false,flipx[i]),
                                                          new THREE.MeshLambertMaterial({map: internal.slices[i].gettexture(),
                                                                                         transparent:internal.istransparent}));
                    
                    if (internal.hasdecorations) {
                        wire[i]=new BIS3dImageSliceGeometry(points[0],points[1],points[2],true,flipx[i]);

                        internal.outlineplane[i]=new THREE.Mesh(wire[i],
                                                                new THREE.MeshBasicMaterial( {color: 0xaa6622, wireframe:true}));
                        
                        offset=internal.slices[i].getsliceoffset();
                        if (internal.imageplane[i]!==null)
                            internal.imageplane[i].position.set(offset[0],offset[1],offset[2]);
                        internal.outlineplane[i].position.set(offset[0],offset[1],offset[2]);
                    }
                } else {
                    internal.imageplane[i]=null;
                    internal.hasdecorations=false;
                }
                
            }

            if (internal.hasdecorations) {
                let sz = internal.slices[0].getimagesize();
                let boxmat= [ new THREE.MeshBasicMaterial( {color: 0x444444, wireframe:true}),
                              new THREE.MeshBasicMaterial( {color: 0xff8800, wireframe:true})];
                for (let pl=0;pl<=2;pl++) {
                    offset=internal.slices[pl].getsliceoffset();
                    for (let fr=0;fr<=1;fr++) {
                        offset[pl]=sz[pl]*fr;
                        let index=pl*2+fr;
                        internal.box[index]=new THREE.Mesh(wire[pl],boxmat[fr]);
                        internal.box[index].position.set(offset[0],offset[1],offset[2]);
                    }
                }
            }
        },

        /** clean up all elements (i.e. set them to null)
         * @memberof Bis_3DOrthogonalSlice.Bis3DCardSlice
         */
        cleanup : function() {
            for (let i=0;i<=2;i++) {
                internal.imageplane[i]=null;
                internal.outlineplane[i]=null;
                internal.box[2*i]=null;
                internal.box[2*i+1]=null;
            }
        },

        /** adds all objects (imageplane, outline and axes depending on decoration mode)
         * to ThreeJS-Scene
         * @memberof Bis_3DOrthogonalSlice.Bis3DCardSlice.prototype
         * @param {ThreeJS-Scene} scene - ThreeJS-Scene object
         */
        addtoscene : function(scene) {
            for (let i=0;i<=2;i++) {
                if (internal.imageplane[i]!==null)
                    scene.add(internal.imageplane[i]);
                if (internal.hasdecorations) {
                    scene.add(internal.outlineplane[i]);
                    scene.add(internal.box[2*i]);
                    scene.add(internal.box[2*i+1]);
                }
            }
        },

        /** removes all objects (imageplane, outline and axes depending on decoration mode)
         * from ThreeJS-Scene
         * @memberof Bis_3DOrthogonalSlice.Bis3DCardSlice
         * @param {ThreeJS-Scene} scene - ThreeJS-Scene object
         */
        removefromscene : function(scene) {
            for (let i=0;i<=2;i++) {
                if (internal.imageplane[i]!==null)
                    scene.remove(internal.imageplane[i]);
                if (internal.hasdecorations) {
                    scene.remove(internal.outlineplane[i]);
                    scene.remove(internal.box[2*i]);
                    scene.remove(internal.box[2*i+1]);
                }
            }
        },

        /** Updates coordinates for plane 0,1 or 2.
         * This takes info from intenal 2D slice object and updates the appropriate
         * component of the Card Slice
         * @memberof Bis_3DOrthogonalSlice.Bis3DCardSlice
         * @param {number} pl - The plane 0,1 or 2
         */
        updatecoordinates : function (pl) {
            let offset=internal.slices[pl].getsliceoffset().slice(0);

            // if (pl===0)
            //  offset[0]=internal.sizex-offset[0];

            if (internal.imageplane[pl]!==null)
                internal.imageplane[pl].position.set(offset[0],offset[1],offset[2]);
            if (internal.hasdecorations) {
                internal.outlineplane[pl].position.set(offset[0],offset[1],offset[2]);
            }
        },

        /** Updates coordinates in MM from a ``master slice''
         * component of the Card Slice. This is used to position overlay slices close to original
         * @memberof Bis_3DOrthogonalSlice.Bis3DCardSlice
         * @param {Bis_3DOrthogonalSlice.Bis2DImageSlice} masterslice - the slice to `immitate'
         * @param {number} pl - The plane 0,1 or 2
         */
        updatecoordinatesinmm : function (masterslice,pl) {
            let offset=masterslice.getsliceoffset().slice(0);
            //if (pl===0)
            // offset[0]=180-offset[0];
            if (internal.imageplane[pl]!==null)
                internal.imageplane[pl].position.set(offset[0],offset[1],offset[2]);
            if (internal.hasdecorations) {
                internal.outlineplane[pl].position.set(offset[0],offset[1],offset[2]);
            }
        },


        /** Position the camera (set position, upvector and lookAt)
         * to correctly look at one of the three card slices. 
         * @memberof Bis_3DOrthogonalSlice.Bis3DCardSlice.prototype
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

        /** Dummy functions for compatibility with 2D Slice */
        setnexttimeforce : function() { },
        interpolate : function () { },
        updateColormap : function () { },

        
        /** Show decorations if true show axis/outline (if they exist) else hide
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {boolean} show - if true show, else hide
         */
        showdecorations : function(show) {

            show = show || false;
            if (internal.hasdecorations) {
                for (let i=0;i<=2;i++) {
                    internal.outlineplane[i].visible=show;
                    internal.box[2*i].visible=show;
                    internal.box[2*i+1].visible=show;
                }
            }
        }
    };
    output.initialize();
    return output;
};


// ------------------------------------------------------------------------------------------------------
module.exports = exportobj;
