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

/**
 * @file A Broswer module. Contains {@link Bis_3dCrossHairGeometry}.
 * @author Xenios Papademetris
 * @version 1.0
 */

/** A Three.JS Geometry is a Three.JS object that stores the geometry of an object to be rendered
 * See: {@link http://threejs.org/docs/#Reference/Core/Geometry}
 * @typedef ThreeJS-Geometry
 */

/** A Three.JS Buffer Geometry is a Three.JS object that stores the geometry of an object to be rendered (more efficient than ThreeJS Geometry).
 * See: {@link http://threejs.org/docs/#Reference/Core/BufferGeometry}
 * @typedef ThreeJS-BufferGeometry
 */

/** A Three.JS Scene object is a Three.JS object that contains objects lights and cameras.
 * See: {@link http://threejs.org/docs/#Reference/Scenes/Scene}
 * @typedef ThreeJS-Scene
 */

/** A Three.JS Orthographic Camera is the Three.js implementation of an orthographic camera.
 * See: {@link http://threejs.org/docs/#Reference/Cameras/OrthographicCamera}
 * @typedef ThreeJS-OrthographicCamera
 */

/** This is a texture object in Three.js.
 * See: {@link http://threejs.org/docs/#Reference/Textures/Texture}
 * @typedef ThreeJS-Texture
 */

/** This is a core webgl renderer in Three.js.
 * See: {@link http://threejs.org/docs/#Reference/Renderers/WebGLRenderer
 * @typedef ThreeJS-WebGLRenderer
 */


const THREE=require('three');


/**
 * This module has functions to create a Three.JS {@link http://threejs.org/}-style geometry for landmark sets.
 * @namespace Bis_3dCrosshairGeometry
 */

/** A simple object with two elements vertices and indices. 
 * See: {@link http://threejs.org/docs/#Reference/Core/BufferGeometry}
 * @typedef Bis_3dCrosshairGeometry.preGeometry
 * @property {Float32Array} vertices - locations of points (a flat 1D array of the form x1,y1,z1,x2,y2,z2,...)
 * @property {Uint32Array}  indices - indices of triangles
 */


var bis3dcreatecrosshairgeometry = {
    
    /**
     * create a single cross hair (combination of three boxes and a sphere) ``pre-geometry'' object (i.e. just arrays of points and indices)
     * @alias Bis_3dCrosshairGeometry.createcrosshair
     * @param {number} length - the length of the thre three ``tube-like' boxes
     * @param {number} thickness - the width/thickness of the thre three boxes in their perpendicular direction
     * @param {boolean} showsphere - whether to add a sphere or not (default=false)
     * @param {number}  radius - sphere radius (default= 0.5*length)
     * @returns {ThreeJS-Geometry} out - a Three.JS Geometry Object
     */
    createcrosshair : function (length,thickness,showsphere,radius ) {
        
        showsphere = showsphere || false;
        radius = radius || length*0.5;
        var h1=new THREE.BoxGeometry( length,thickness,thickness);
        var h2=new THREE.BoxGeometry( thickness,length,thickness);
        var h3=new THREE.BoxGeometry( thickness,thickness,length);
        
        h1.merge(h2);
        h1.merge(h3);
        
        if (showsphere) {
            var sph = new THREE.SphereGeometry(radius,16,16);
            h1.merge(sph);
        }
        return h1;
    },
    

    /**
     * create a single cross hair (combination of three boxes and a sphere) ``pre-geometry'' object (i.e. just arrays of points and indices)
     * @alias Bis_3dCrosshairGeometry.createcore
     * @param {number} length - the length of the thre three ``tube-like' boxes
     * @param {number} thickness - the width/thickness of the thre three boxes in their perpendicular direction
     * @param {boolean} showsphere - whether to add a sphere or not (default=false)
     * @param {number}  radius - sphere radius (default= 0.5*length)
     * @returns {Bis_3dCrosshairGeometry.preGeometry} out 
     */
    createcore : function (length,thickness,showsphere,radius ) {

        showsphere = showsphere || false;
        radius = radius || length*0.5;
        var h1=new THREE.BoxGeometry( length,thickness,thickness);
        var h2=new THREE.BoxGeometry( thickness,length,thickness);
        var h3=new THREE.BoxGeometry( thickness,thickness,length);
        
        var arr = [ h1,h2,h3];

        if (showsphere) {
            var sph = new THREE.SphereGeometry(radius,16,16);
            arr.push(sph);
        }
        return this.createpregeometry(arr);
    },
    
    /**
     * create a a ``pre-geometry'' object (i.e. just arrays of points and indices) from an array of ThreeJS-Geometry object. This speeds up caching and replication.
     * @alias Bis_3dCrosshairGeometry.createpregeometry
     * @param {array} bufarray - arrray of {@link ThreeJS-Geometry} objects
     * @returns {Bis_3dCrosshairGeometry.preGeometry} out 
     */
    createpregeometry : function( bufarray) {
        
        var numelements=bufarray.length;
        var numpoints=0,numfaces=0,i=0,j;

        // Only worry abot normals, indices and positions. NOTHING ELSE
        for (i=0;i<numelements;i++) {
            var ind=bufarray[i].faces;
            var x=bufarray[i].vertices;
            numpoints+=x.length;
            numfaces+=ind.length;
        }

        var vertices = new Float32Array( numpoints * 3 ); // three components per vertex
        var indices = new Uint32Array(numfaces*3);
        var index=0;
        for (i=0;i<numelements;i++) {
            var points=bufarray[i].vertices;
            for (j=0;j<points.length;j++) {
                vertices[index]=points[j].x;
                vertices[index+1]=points[j].y;
                vertices[index+2]=points[j].z;
                index+=3;
            }
        }

        var offset=0,findex=0;
        for (i=0;i<numelements;i++) {
            var faces=bufarray[i].faces;
            for (j=0;j<faces.length;j++) {
                indices[findex]=faces[j].a+offset;
                indices[findex+1]=faces[j].b+offset;
                indices[findex+2]=faces[j].c+offset;
                findex+=3;
            }
            offset+=bufarray[i].vertices.length;
        }
        return {
            vertices : vertices,
            indices  : indices ,
        };
    },

    /**
     * Takes a a ``pre-geometry'' object and a set of positions and creates a single ThreeJS-BufferGeometry for fast rendering
     * @alias Bis_3dCrosshairGeometry.createcopies
     * @param {Bis_3dCrosshairGeometry.preGeometry} core - the core object to replicate 
     * @param {array} positions - arrray of [ [ x1,y1,z1],[x2,y2,z1] , ... ] points to replicate core at
     * @param {array} scales - arrray of scalefactors to premultiply the core by
     * @returns {THREEJS-BufferGeometry} out
     */
    createcopies : function( core, positions,scales) {
        
        scales=scales || null;
        var numelements=positions.length;
        var combovertices = new Float32Array( core.vertices.length * numelements ); 
        var comboindices = new Uint32Array(core.indices.length * numelements);

        var points=core.vertices;
        var faces=core.indices;
        var numpoints=points.length/3;
        
        var index=0,j,i;
        for (i=0;i<numelements;i++) {
            var p=positions[i];
            var sc=1.0;
            if (scales!==null)
                sc=scales[i];

            for (j=0;j<numpoints;j++) {
                combovertices[index]=points[j*3]*sc+p[0];
                combovertices[index+1]=points[j*3+1]*sc+p[1];
                combovertices[index+2]=points[j*3+2]*sc+p[2];
                index+=3;
            }
        }

        var offset=0,findex=0;
        for (i=0;i<numelements;i++) {
            for (j=0;j<faces.length;j++) {
                comboindices[findex]=faces[j]+offset;
                ++findex;
            }
            offset+=numpoints;
        }

        var buf=new THREE.BufferGeometry();
        buf.setIndex(new THREE.BufferAttribute( comboindices, 1 ));
        if (THREE['REVISION']<101) {
            buf.addAttribute( 'position', new THREE.BufferAttribute( combovertices, 3 ) );
        } else {
            buf.setAttribute( 'position', new THREE.BufferAttribute( combovertices, 3 ) );
        }
        return buf;
    },
};


module.exports = bis3dcreatecrosshairgeometry;



