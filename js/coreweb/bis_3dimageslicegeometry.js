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
 * @file A Broswer module (though will work OK in Node.js for testing). Contains {@link Bis_3dImageSliceGeometry}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const THREE=require('three');

/** 
 * A class that inherits from {@link ThreeJS-BufferGeometry} to create a plane on which to render an image texture or an image outline.
 * This is hidden behind a factory function -- see examples below. <BR> <BR>
 * This class has no additional functionality other than it's constructor.
 * @constructs Bis_3dImageSliceGeometry
 * @param {array} p0,p1,p2 - key points (created by {@link BisImageSlicer} functions getplanepoints or getoutlineplanepoints.
 * @param {boolean} wireframe - if true this is an outline
 * @example
 * // to create a new imagegeometry:
 * var imagegeometry=require('bis_3dimageslicegeometry'); 
 * var newimagegeometry = imagegeometry(p0,p1,p2,true); // returns a new Bis_3dImageSliceGeometry object (no need to use ``new'').
 */

const bis3dimageslicegeometry = function ( p0,p1,p2,wireframe,flip ) {

    flip= flip || [ false, false ];
    wireframe=wireframe || false;
    THREE.BufferGeometry.call( this );
    
    this.type = 'PlaneBufferGeometry';
    
    this.parameters = {
        p0: p0,
        p1: p1,
        p2: p2,
    };

    var numpass=1;
    if (!wireframe)
        numpass=2;

    var nv=12*numpass,nt=8*numpass;

    //      console.log('nv =',[ nv,nt]);

    var vertices = new Float32Array( nv);
    var normals = new Float32Array(  nv);
    var uvs = new Float32Array( nt );
    
    var offset = 0, offset2 = 0;
    
    var d1=[ 0,0,0], d2=[0,0,0],p3=[0,0,0];
    for (var i=0;i<=2;i++) {
        // Cross product
        d1[i]=p1[i]-p0[i];
        d2[i]=p2[i]-p0[i];
        // New vector
        p3[i]=p2[i]-d1[i];
    }

    
    var n =  [ d2[2]*d1[1] - d2[1]*d1[2],
               d2[0]*d1[2] - d2[2]*d1[0],
               d2[1]*d1[0] - d2[0]*d1[1] ];
    //      console.log('n=',n,' d1=',d1,'d2=',d2);

    var magn=Math.sqrt( n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);
    for (i=0;i<=2;i++)
        n[i]=n[i]/magn;
    
    var pt = [ p0,p1,p2,p3]; 
    //      if (flipx) 
    //          pt=[p3,p0,p1,p2];
    var textcoord = [ [ 0,1] , [ 0,0 ],
                      [ 1,0] , [ 1,1 ] ];
    if (flip[1]===true) {
        textcoord = [ [0,0],[0,1],
                      [1,1],[1,0 ]];
    } else if (flip[0]===true) {
        textcoord = [ 
            [1,1],[1,0],
            [0,0],[0,1]];
    }
    
    //      console.log('numpass=',numpass,' wire=',wireframe);

    for (var pass=0;pass<numpass;pass++) {
        var tcount=0;
        for ( var iy = 0; iy <=1; iy ++ ) {
            for ( var ix = 0; ix <=1 ; ix ++ ) {    
                vertices[ offset     ] = pt[ix+2*iy][0] ;
                vertices[ offset + 1 ] = pt[ix+2*iy][1] ;
                vertices[ offset + 2 ] = pt[ix+2*iy][2] ;
                
                normals[ offset      ] = n[0];
                normals[ offset + 1  ] = n[1];
                normals[ offset + 2  ] = n[2];
                
                uvs[ offset2     ] = textcoord[tcount][0];
                uvs[ offset2 + 1 ] = 1-textcoord[tcount][1];
                
                offset += 3;
                offset2 += 2;
                tcount++;
            }
        }
        n[0]=-n[0];
        n[1]=-n[1];
        n[2]=-n[2];
    }
    
    var indices;
    if (wireframe) {
        indices = new Uint16Array(12);
        indices[ 0 ] = 0;   indices[ 1 ] = 1;  indices[ 2 ] = 0;
        indices[ 3 ] = 0;   indices[ 4 ] = 3;  indices[ 5 ] =0;
        indices[ 6 ] = 3;   indices[ 7 ] = 2;  indices[ 8 ] =3;
        indices[ 9 ] = 2;   indices[ 10 ] =1;  indices[ 11 ] =2;

        //      indices[ 2 ] = 3;   indices[ 3 ] = 0;
        //          indices[ 4 ] = 2;   indices[ 5 ] = 3;
    } else {
        indices = new Uint16Array(12);
        indices[ 0 ] = 0;   indices[ 1 ] = 1;  indices[ 2 ] = 2;       
        indices[ 3 ] = 2;   indices[ 4 ] = 3;  indices[ 5 ] = 0;
        indices[ 6 ] = 4;   indices[ 7 ] = 6;  indices[ 8 ] = 5; 
        indices[ 9 ] = 6;   indices[10 ] = 4;  indices[11 ] = 7;  
    }
    
    //      this.addAttribute( 'index', new THREE.BufferAttribute( indices, 1 ) );
    this.setIndex(  new THREE.BufferAttribute( indices, 1 ));
    this.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    this.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
    this.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );

};

if (typeof THREE !== 'undefined') {
    bis3dimageslicegeometry.prototype = Object.create( THREE.BufferGeometry.prototype );
    bis3dimageslicegeometry.prototype.constructor = bis3dimageslicegeometry;
    module.exports = bis3dimageslicegeometry;
}


