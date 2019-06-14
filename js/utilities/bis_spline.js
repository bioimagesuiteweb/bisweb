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
 * @file A Broswer and Node.js module. Contains {@link Spline}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const numeric=require('numeric');
const splineutil=require('bis_util');

numeric.largeArray = 50; 
numeric.precision = 3;
console.log('+++++ Numeric.version='+numeric.version);

// These are really constants
const MAXPOINTS = 50;
const DEFAULTPOINTS = 8;


/** A class for processing a b-spline curve. Creates an ellipse.
 * This is hidden inside the bis_spline module and can only be accessed using
 * a factory factory function (see examples below)
 * @class Spline 
 * @param {number} mat_size - number of control points
 * @param {number} radiusx,radiusy  - x and y radii of ellipse
 * @param {number} cx,cy  - x and y position of ellipse centroid
 * @example
 * // to create a new spline 
 * let Spline=require('bis_spline'); 
 * let newspline = new Spline(10,20,10.0,50.0,50.0); // returns a new spline object
 */
class Spline {

    constructor(mat_size,radiusx,radiusy,cx,cy) {

        this._internal = {
            inverseMatrix : null,
            controlpoints : null,
            nodepoints : null,
            numpoints : 0,
        };
        this.ellipse(mat_size  ,radiusx  ,radiusy  ,cx  ,cy);
    }

    /** initialize class using a points arrray matrix 
     * @param {Matrix} points - a 2d array created using numericjs
     */
    initialize(points) {
        
        points = points || null;
        if (points!==null)
            this._internal.nodepoints=numeric.clone(points);
        this._internal.numpoints=numeric.dim(this._internal.nodepoints)[0];
        this._internal.controlpoints =  splineutil.zero(this._internal.numpoints,2);
        this.createInverseMatrix(this._internal.numpoints);
        this.updatecontrolpoints();
    }
    
    /** get number of points
     * @returns {number} n - number of points
     */
    getnumpoints() { 
        return this._internal.numpoints;
    }
    
    /** get the nodepoints as a numericjs matrix
     * @returns {Matrix} m - numeric js N*2 matrix
     */
    getnodepoints() { 
        return this._internal.nodepoints;
    }
    
    /** create an ellipse (called by constructor)
     * @param {number} mat_size - number of control points
     * @param {number} radiusx,radiusy  - x and y radii of ellipse
     * @param {number} cx,cy  - x and y position of ellipse centroid
     */
    ellipse(np,radiusx,radiusy,centerx,centery) {
        
        centerx=centerx||50.0;
        centery=centery||50.0;
        radiusx=radiusx||10.0;
        radiusy=radiusy||10.0;
        var n =  splineutil.range(np|| DEFAULTPOINTS ,4,MAXPOINTS);
        this._internal.nodepoints    =  splineutil.zero(n,2);
        for (var i=0;i<n;i++) {
            var t=(i/n)*2.0*Math.PI;
            this._internal.nodepoints[i][0]=radiusx*Math.cos(t)+centerx;
            this._internal.nodepoints[i][1]=radiusy*Math.sin(t)+centery;
        }
        this.initialize();
    }
    
    
    /** update the control points if nodepoints have changed */
    updatecontrolpoints() { 
        this.inPlaceMultiply(this._internal.inverseMatrix,
                             this._internal.nodepoints,
                             this._internal.controlpoints);
    }
    
    
    /** Get position in array pos at arclength s
     * @param {number} s - arclength in range 0..1
     * @param {array} pos - output array [ x,y] (passed in to save on memory alloc/dealloc in loops)
     */
    position(s,pos) {
        
        var reals=s*this._internal.numpoints;
        var index=Math.floor(reals);
        var t=reals-index;
        pos[0]=0.0; pos[1]=0.0;
        
        for (var i=0;i<=3;i++) {
            var b=splineutil.value(i,t);
            var c=splineutil.cyclicrange(index+i-1,this._internal.numpoints);
            for (var j=0;j<=1;j++)
                pos[j]+=b*this._internal.controlpoints[c][j];
        }
    }
    
    /** Get derivative of curve at arclength s
     * @param {number} s - arclength in range 0..1
     * @param {array} pos - output array [ x,y] (passed in to save on memory alloc/dealloc in loops)
     * @returns {array} d - a 2-array containing dx/ds and dy/ds
     */
    derivative(s) {
        
        var reals=s*this._internal.numpoints;
        var index=Math.floor(reals);
        var t=reals-index;
        var dpos = [ 0.0,0.0 ];
        
        for (var i=0;i<=3;i++) {
            var b=splineutil.der(i,t);
            var c=splineutil.cyclicrange(index+i-1,this._internal.numpoints);
            for (var j=0;j<=1;j++)
                dpos[j]+=b*this._internal.controlpoints[c][j];
        }
        return dpos;
    }
    
    /** Get sampled curve from b-spline
     * @param {number} ds - arclength spacing in range 0.005 to 0.5
     * @returns {Matrix} d - an N*2-array containing x,y coordinates of each output point
     */
    createcurve(ds) {
        ds=splineutil.range(ds,0.005,0.5);
        var np=1.0/ds;
        var pts= splineutil.zero(np,2);
        var pos=[0.0,0.0];
        for (var i=0;i<np;i++) {
            var s=i*ds;
            this.position(s,pos);
            pts[i][0]=pos[0];
            pts[i][1]=pos[1];
        }
        return pts;
    }

    /** get the length of the curve (after sampling at ds=0.05)
     * @returns {number} l - arclength of curve
     */
    length(spacing) {
        
        var ds = spacing || 0.05;
        
        var pts=this.createcurve(ds);
        var n=numeric.dim(pts)[0];
        var d=0.0;
        for (var i=0;i<n;i++) {
            var ip=i+1;
            if (ip===n)
                ip=0;
            d+=Math.sqrt( Math.pow(pts[i][0]-pts[ip][0],2.0)+
                          Math.pow(pts[i][1]-pts[ip][1],2.0));
        }
        return d;
    }
    
    /** resample spline to have a new number of points (DESTRUCTIVE)
     * @param {number} newnumpoints - new number of points
     */
    resample(newnumpoints) {
        var n =  splineutil.range( newnumpoints || DEFAULTPOINTS ,4,MAXPOINTS);
        this._internal.nodepoints=this.createcurve(1.0/n);
        this.initialize();
    }
    
    /** a complex test function -- used for testing
     * @param {boolean} silent - if true print debug messages
     * @returns {boolean} out - true or false
     */
    // A complex test function
    test(silent) {
        
        silent=silent || false;
        
        var mat = numeric.identity(this._internal.numpoints);
        var x=splineutil.zero(this._internal.numpoints,2);
        
        var i=0;
        for (i=0;i<this._internal.numpoints;i++) {
            var ip=i+1;
            if (ip>(this._internal.numpoints-1)) ip=0;
            var im=i-1;
            if (im<0) im=this._internal.numpoints-1;
            
            mat[i][im]=splineutil.value(0,0.0);
            mat[i][i]=splineutil.value(1,0.0);
            mat[i][ip]=splineutil.value(2,0.0);
            
            x[i][0]=this._internal.controlpoints[i][0];
            x[i][1]=this._internal.controlpoints[i][1];
        }
        
        
        
        var y=numeric.dot(mat,x);
        if (!silent)
            console.log('\t +++++ Check difference nodepoints size=',
                        this._internal.numpoints,'*',this._internal.numpoints,',',
                        numeric.norm2(numeric.sub(y,this._internal.nodepoints)));
        var m2=numeric.inv(mat);
        var z=numeric.dot(m2,y);
        var err=numeric.norm2(numeric.sub(x,z));
        if (!silent)
            console.log('\t +++++ Check difference inverse=',
                        this._internal.numpoints,'*',this._internal.numpoints,',',err);
        return (err<0.001);
    }

    /** create internal inverse matrix for nump control points
     * this maps nodepoints to controlpoints
     * @param {number} nump - number of points
     */
    createInverseMatrix(nump) {
        var forwardMatrix= splineutil.zero(nump,nump);
        for (var i=0;i<nump;i++) {
            var ip=splineutil.cyclicrange(i+1,nump);
            var im=splineutil.cyclicrange(i-1,nump);
            forwardMatrix[i][im]=1.0/6.0;
            forwardMatrix[i][i]=2.0/3.0;
            forwardMatrix[i][ip]=1.0/6.0;
        }
        this._internal.inverseMatrix=numeric.inv(forwardMatrix);
        return true;
    }
    
    /** in place matrix multiply to save on memory alloc/dealloc A*x=B
     * this maps nodepoints to controlpoints
     * @param {Matrix} A -  input matrix 1
     * @param {Matrix} x -  input matrix 2
     * @param {Matrix} B -  output
     */
    inPlaceMultiply(A,X,B) {
        var d=numeric.dim(A);
        var matrows=d[0],
            matcols=d[1],
            veccols=numeric.dim(X)[1],
            row=0,
            col=0,
            index=0;
        
        for (row=0;row<matrows;row++) {
            for (col=0;col<veccols;col++) {
                B[row][col]=0.0;
                for (index=0;index<matcols;index++)
                    B[row][col]+=A[row][index]*X[index][col];
            }
        }
    }
}

module.exports = Spline;

