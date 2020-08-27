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


const util = require('bis_util');
const biswasm = require('bis_wasmutils');
const BisWebBaseTransformation=require('bisweb_basetransformation');
const numeric=require('numeric');
const genericio = require('bis_genericio');

/** A class to model a bspline grid transfomration */
class BisWebGridTransformation extends BisWebBaseTransformation {
    
    constructor(ii_dims=[4,4,4], ii_spacing=[40,50,40], ii_origin=[0,0,0], ii_nonewfield=false, ii_linearinterpmode=false) {

        super();
        this.jsonformatname='BisGridTransformation';
        this.legacyextension="grd";
        this.internal = {
            dispfield: null,
            origin: [0, 0, 0],
            spacing: [0, 0, 0],
            dimensions: [0, 0, 0],
            minusdim: [0, 0, 0],
            slicesize: 0,
            volsize: 0,
            linearinterpmode: 0,
            Y: [0, 0, 0],
        };
        this.initialize(ii_dims,ii_spacing,ii_origin,ii_nonewfield,ii_linearinterpmode);
    }

    // ---- Get Object Information -------------------------------------------------
    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription() {
        return "Dimensions:" + this.internal.dimensions[0] + " " + this.internal.dimensions[1] + " " + this.internal.dimensions[2] +", "+
            "Spacing:" + this.internal.spacing[0].toFixed(4) + " " + this.internal.spacing[1].toFixed(4) + " " + this.internal.spacing[2].toFixed(4) + ", "+
            "Origin:" + this.internal.origin[0].toFixed(4) + " " + this.internal.origin[1].toFixed(4) + " " + this.internal.origin[2].toFixed(4);
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        return util.SHA256(this.internal.dispfield);
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        return this.getNumberOfDOF()*4+128;
    }


    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {
        let obj= super.serializeToDictionary();
        let bytesarr=new Uint8Array(this.internal.dispfield.buffer);
        let b=genericio.tozbase64(bytesarr);
        obj.origin=this.internal.origin;
        obj.spacing=this.internal.spacing;
        obj.dimensions=this.internal.dimensions;
        obj.dispfield=b;
        obj.linearinterpmode=this.internal.linearinterpmode;
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} b -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {
        let bytesarr=genericio.fromzbase64(b.dispfield);
        this.initialize(b.dimensions, b.spacing, b.origin, true, b.linearinterpmode);
        this.internal.dispfield=new Float32Array(bytesarr.buffer);
        super.parseFromDictionary(b);
        return true;
    }


    /** deserializes an object from WASM array (with an optional second input to help with header stuff)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} wasmarr - the unsined char wasm object
     */
    deserializeWasm(Module,wasmarr) {
        // No image, forcing type to float
        var wasmobj = biswasm.unpackStructure(Module, wasmarr, false, 16);

        if (wasmobj.magic_type !== biswasm.get_grid_magic_code(Module)) {
            console.log('Bad wasmobj, can not deserialize grid Transformation');
            return 0;
        }

        // Now do the header
        this.identity();
        let dim = [0, 0, 0], spa = [0, 0, 0], ori = [0, 0, 0], linearinterp = false;
        let int_header = new Int32Array(wasmobj.header_array.buffer, 0, 4);
        let float_header = new Float32Array(wasmobj.header_array.buffer, 16, 6);

        if (int_header[0] === 0)
            linearinterp = true;

        for (let i = 0; i <= 2; i++) {
            dim[i] = int_header[i + 1];
            spa[i] = float_header[i];
            ori[i] = float_header[i + 3];
        }

        this.initialize(dim, spa, ori, true, linearinterp);

        this.internal.dispfield = wasmobj.data_array;

    }
    
    // ---- Testing utility ----------------------------------------------------
    /** compares an image with a peer object of the same class and returns true if similar or false if different 
     * @param{BisWebDataObject} other - the other object
     * @param{String} method - the comparison method one of maxabs,ssd,cc etc.
     * @param{Number} threshold - the threshold to use for comparison
     * @returns{Object} - { testresult: true or false, value: comparison value, metric: metric name } 
     */
    compareWithOther(other,method="maxabs",threshold=0.01) {
        let out = {
            testresult : false,
            value : null,
            metric : "maxabs"
        };

        if (other.constructor.name !== this.constructor.name) 
            return out;

        let myfield=this.getDisplacementField();
        let otherfield=other.getDisplacementField();
        console.log('....\t comparing grids:',numeric.dim(myfield),numeric.dim(otherfield));
        if (method==='maxabs') {
            out.value=numeric.norminf(numeric.sub(myfield,otherfield));
        } else {
            out.value=numeric.norm2(numeric.sub(myfield,otherfield));
            out.method="ssd";
        }
        if (out.value < threshold) 
            out.testresult=true;

        return out;
    }

    // ---------- BisWebBaseTransformation Functions -------------------------------------------
    /** This is to set the current transformation to identity.
     */
    identity() { 
        var numdof = this.getNumberOfDOF();
        var newfield = true;
        if (this.internal.dispfield !== null) {
            if (this.internal.dispfield.length === numdof) {
                newfield = false;
            }
        }
        if (newfield)
            this.internal.dispfield = new Float32Array(numdof);
        
        for (var i = 0; i < numdof; i++)
            this.internal.dispfield[i] = 0.0;
    }

    /** transforms input point in mm to a mm coordinate using this matrix
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in mm
     */
    transformPoint(X,TX) {
        if (this.internal.linearinterpmode)
            this.linearTransformPoint(X, TX);
        else
            this.bsplineTransformPoint(X, TX);
    }


    // ------------------------------------------
    // Other Code
    // ------------------------------------------
    
    /** transforms input point in mm to a mm coordinate using JUST the b-spline grid
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in mm
     */
    bsplineTransformPoint(X, TX) {
        var minusdim0 = this.internal.minusdim[0];
        var minusdim1 = this.internal.minusdim[1];
        var minusdim2 = this.internal.minusdim[2];
        var data = this.internal.dispfield;

        var X0 = (X[0] - this.internal.origin[0]) / this.internal.spacing[0];
        var X1 = (X[1] - this.internal.origin[1]) / this.internal.spacing[1];
        var X2 = (X[2] - this.internal.origin[2]) / this.internal.spacing[2];

        var t, coord;

        // X-Coordinate
        var B01 = X0 | 0, B00;
        t = X0 - B01;
        if (B01 < 0) {
            B01 = 0;
            B00 = 0;
        } else if (B01 > minusdim0) {
            B01 = minusdim0;
        }
        B00 = B01 - 1;
        if (B00 < 0)
            B00 = 0;
        var B02 = B01 + 1;
        var B03 = B01 + 2;
        if (B02 > minusdim0) {
            B02 = minusdim0;
            B03 = minusdim0;
        } else if (B03 > minusdim0) {
            B03 = minusdim0;
        }

        var W00 = Math.pow(1 - t, 3.0) / 6.0;
        var W01 = (3 * t * t * t - 6 * t * t + 4) / 6.0;
        var W02 = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6.0;
        var W03 = (t * t * t) / 6.0;

        // Y-Coordinate
        var B11 = X1 | 0, B10;
        t = X1 - B11;
        if (B11 < 0) {
            B11 = 0;
            B10 = 0;
        } else {
            B10 = B11 - 1;
            if (B10 < 0)
                B10 = 0;
        }
        var B12 = B11 + 1;
        var B13 = B11 + 2;
        if (B12 > minusdim1) {
            B12 = minusdim1;
            B13 = minusdim1;
        } else if (B13 > minusdim1) {
            B13 = minusdim1;
        }


        var W10 = Math.pow(1 - t, 3.0) / 6.0;
        var W11 = (3 * t * t * t - 6 * t * t + 4) / 6.0;
        var W12 = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6.0;
        var W13 = (t * t * t) / 6.0;

        // Z-Coordinate
        var B21 = X2 | 0, B20;
        t = X2 - B21;
        if (B21 < 0) {
            B21 = 0;
            B20 = 0;
        } else {
            B20 = B21 - 1;
            if (B20 < 0)
                B20 = 0;
        }

        var B22 = B21 + 1;
        var B23 = B21 + 2;
        if (B22 > minusdim2) {
            B22 = minusdim2;
            B23 = minusdim2;
        } else if (B23 > minusdim2) {
            B23 = minusdim2;
        }


        var W20 = Math.pow(1 - t, 3.0) / 6.0;
        var W21 = (3 * t * t * t - 6 * t * t + 4) / 6.0;
        var W22 = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6.0;
        var W23 = (t * t * t) / 6.0;

        // Scale by raster-size
        B10 *= this.internal.dimensions[0];
        B11 *= this.internal.dimensions[0];
        B12 *= this.internal.dimensions[0];
        B13 *= this.internal.dimensions[0];
        B20 *= this.internal.slicesize;
        B21 *= this.internal.slicesize;
        B22 *= this.internal.slicesize;
        B23 *= this.internal.slicesize;

        for (coord = 0; coord <= 2; coord++) {
            TX[coord] = X[coord] + (W20 * W10 * W00 * data[B20 + B10 + B00] + W20 * W10 * W01 * data[B20 + B10 + B01] +
                                    W20 * W10 * W02 * data[B20 + B10 + B02] + W20 * W10 * W03 * data[B20 + B10 + B03] +
                                    W20 * W11 * W00 * data[B20 + B11 + B00] + W20 * W11 * W01 * data[B20 + B11 + B01] +
                                    W20 * W11 * W02 * data[B20 + B11 + B02] + W20 * W11 * W03 * data[B20 + B11 + B03] +
                                    W20 * W12 * W00 * data[B20 + B12 + B00] + W20 * W12 * W01 * data[B20 + B12 + B01] +
                                    W20 * W12 * W02 * data[B20 + B12 + B02] + W20 * W12 * W03 * data[B20 + B12 + B03] +
                                    W20 * W13 * W00 * data[B20 + B13 + B00] + W20 * W13 * W01 * data[B20 + B13 + B01] +
                                    W20 * W13 * W02 * data[B20 + B13 + B02] + W20 * W13 * W03 * data[B20 + B13 + B03] +
                                    W21 * W10 * W00 * data[B21 + B10 + B00] + W21 * W10 * W01 * data[B21 + B10 + B01] +
                                    W21 * W10 * W02 * data[B21 + B10 + B02] + W21 * W10 * W03 * data[B21 + B10 + B03] +
                                    W21 * W11 * W00 * data[B21 + B11 + B00] + W21 * W11 * W01 * data[B21 + B11 + B01] +
                                    W21 * W11 * W02 * data[B21 + B11 + B02] + W21 * W11 * W03 * data[B21 + B11 + B03] +
                                    W21 * W12 * W00 * data[B21 + B12 + B00] + W21 * W12 * W01 * data[B21 + B12 + B01] +
                                    W21 * W12 * W02 * data[B21 + B12 + B02] + W21 * W12 * W03 * data[B21 + B12 + B03] +
                                    W21 * W13 * W00 * data[B21 + B13 + B00] + W21 * W13 * W01 * data[B21 + B13 + B01] +
                                    W21 * W13 * W02 * data[B21 + B13 + B02] + W21 * W13 * W03 * data[B21 + B13 + B03] +
                                    W22 * W10 * W00 * data[B22 + B10 + B00] + W22 * W10 * W01 * data[B22 + B10 + B01] +
                                    W22 * W10 * W02 * data[B22 + B10 + B02] + W22 * W10 * W03 * data[B22 + B10 + B03] +
                                    W22 * W11 * W00 * data[B22 + B11 + B00] + W22 * W11 * W01 * data[B22 + B11 + B01] +
                                    W22 * W11 * W02 * data[B22 + B11 + B02] + W22 * W11 * W03 * data[B22 + B11 + B03] +
                                    W22 * W12 * W00 * data[B22 + B12 + B00] + W22 * W12 * W01 * data[B22 + B12 + B01] +
                                    W22 * W12 * W02 * data[B22 + B12 + B02] + W22 * W12 * W03 * data[B22 + B12 + B03] +
                                    W22 * W13 * W00 * data[B22 + B13 + B00] + W22 * W13 * W01 * data[B22 + B13 + B01] +
                                    W22 * W13 * W02 * data[B22 + B13 + B02] + W22 * W13 * W03 * data[B22 + B13 + B03] +
                                    W23 * W10 * W00 * data[B23 + B10 + B00] + W23 * W10 * W01 * data[B23 + B10 + B01] +
                                    W23 * W10 * W02 * data[B23 + B10 + B02] + W23 * W10 * W03 * data[B23 + B10 + B03] +
                                    W23 * W11 * W00 * data[B23 + B11 + B00] + W23 * W11 * W01 * data[B23 + B11 + B01] +
                                    W23 * W11 * W02 * data[B23 + B11 + B02] + W23 * W11 * W03 * data[B23 + B11 + B03] +
                                    W23 * W12 * W00 * data[B23 + B12 + B00] + W23 * W12 * W01 * data[B23 + B12 + B01] +
                                    W23 * W12 * W02 * data[B23 + B12 + B02] + W23 * W12 * W03 * data[B23 + B12 + B03] +
                                    W23 * W13 * W00 * data[B23 + B13 + B00] + W23 * W13 * W01 * data[B23 + B13 + B01] +
                                    W23 * W13 * W02 * data[B23 + B13 + B02] + W23 * W13 * W03 * data[B23 + B13 + B03]);

            // Shift to y and then z
            B20 += this.internal.volsize;
            B21 += this.internal.volsize;
            B22 += this.internal.volsize;
            B23 += this.internal.volsize;
        }
    }

    linearTransformPoint(X, TX) {

        var ia, ja, ka, sum = 0.0;
        var B = [[0, 0], [0, 0], [0, 0]];
        var W = [[0, 0], [0, 0], [0, 0]];

        for (ia = 0; ia <= 2; ia++) {
            var p = (X[ia] - this.internal.origin[ia]) / this.internal.spacing[ia];
            B[ia][0] = p | 0;
            B[ia][1] = B[ia][1] + 1;
            for (var ib = 0; ib <= 1; ib++) {
                if (B[ia][ib] < 0)
                    B[ia][ib] = 0;
                else if (B[ia][ib] > this.internal.minusdim[ia])
                    B[ia][ib] = this.internal.minusdim[ia];
            }
            W[ia][0] = B[ia][1] - TX[ia];
            W[ia][1] = 1.0 - W[ia][0];
        }

        for (ia = 0; ia <= 1; ia++) {
            B[1][ia] = B[1][ia] * this.internal.dimensions[0];
            B[2][ia] = B[2][ia] * this.internal.slicesize;
        }

        for (var coord = 0; coord <= 2; coord++) {
            sum = X[coord];
            for (ka = 0; ka <= 1; ka++) {
                for (ja = 0; ja <= 1; ja++) {
                    for (ia = 0; ia <= 1; ia++) {
                        sum += W[2][ka] * W[1][ja] * W[0][ia] * this.internal.dispfield[B[2][ka] + B[1][ja] + B[0][ia]];
                    }
                }
            }
            TX[coord] = sum;
            for (ia = 0; ia <= 1; ia++)
                B[2][ia] += this.internal.volsize;
        }
    }

    /**
     * This reinitializes the transformation.
     * @param {array} dims - [x,y,z] dimensions of grid
     * @param {array} spacing - [x,y,z] spacing of grid
     * @param {array} origin - position of first cntrol point
     * @param {boolean} nonewfield - if false, no new disp field is created
     * @param {boolean} linearinterpmode - if true, use linear interpolation, else bspline. Default=true.
     */
    initialize(dims, spacing, origin, in_nonewfield, linearinterpmode) {
        
        this.internal.dimensions = dims || this.internal.dimensions;
        
        for (var i = 0; i <= 2; i++) {
            this.internal.dimensions[i] = Math.floor(util.range(this.internal.dimensions[i], 1, 1000));
            this.internal.minusdim[i] = this.internal.dimensions[i] - 1;
        }
        this.internal.slicesize = this.internal.dimensions[0] * this.internal.dimensions[1];
        this.internal.volsize = this.internal.dimensions[2] * this.internal.slicesize;

        this.internal.spacing = spacing || this.internal.spacing;
        this.internal.origin = origin || this.internal.origin;
        in_nonewfield = in_nonewfield || false;
        if (!in_nonewfield)
            this.identity();

        this.internal.linearinterpmode = linearinterpmode || false;
    }

    /** This returns the number of DOFs
     * @returns {number} - number of degrees of freedom
     */
    getNumberOfDOF() {
        return this.internal.dimensions[0] * this.internal.dimensions[1] * this.internal.dimensions[2] * 3;
    }

    /** This returns the number of control points
     * @returns {number} - number of control points
     */
    getNumberOfControlPoints() {
        return this.internal.dimensions[0] * this.internal.dimensions[1] * this.internal.dimensions[2];
    }

    
    /*** Creates an optimized cached mapping to spped up the point to voxel transformation
     * @param {array} spa - spacing of target image
     */
    optimize() {
    }
    
    /** serializes the  grid
     * with the legacy BioImage Suite .matr format
     * @return {string} string - containing output
     * @memberof BisBSplineGridTransformation.prototype
     */
    legacySerialize() {

        let s = "#vtkpxBaseGridTransform2 File\n";
        s = s + "#Origin\n" + this.internal.origin[0].toFixed(4) + " " + this.internal.origin[1].toFixed(4) + " " + this.internal.origin[2].toFixed(4) + "\n";
        s = s + "#Spacing\n" + this.internal.spacing[0].toFixed(4) + " " + this.internal.spacing[1].toFixed(4) + " " + this.internal.spacing[2].toFixed(4) + "\n";
        s = s + "#Dimensions\n" + this.internal.dimensions[0] + " " + this.internal.dimensions[1] + " " + this.internal.dimensions[2] + "\n";
        if (this.internal.linearinterpmode)
            s = s + "#Interpolation Mode\n1\n#Displacements\n";
        else
            s = s + "#Interpolation Mode\n4\n#Displacements\n";
        var np = this.getNumberOfControlPoints();
        var np2 = 2 * np;
        for (var i = 0; i < np; i++) {
            s += i.toFixed(0) + " " + this.internal.dispfield[i].toFixed(4) + " " + this.internal.dispfield[i + np].toFixed(4) + " " + this.internal.dispfield[i + np2].toFixed(4) + "\n";
        }
        return s;
    }

    /** deserializes the landmark set from a string consistent 
     * with the legacy BioImage Suite .land format
     * @param {string} inpstring - input string
     * @param {string} filename -  filename of original file
     * @param {number} offset -  line to begin
     * @return {boolean} val - true or false
     * @memberof BisBSplineGridTransformation.prototype
     */
    legacyParseFromText(inpstring, filename, offset) {

        offset = offset || 0;
        var lines = inpstring.split("\n");
        var s1 = (lines[offset + 0].trim() === "#vtkpxBaseGridTransform2 File");
        var s2 = (lines[8].trim() === "#vtkpxBaseGridTransform2 File");
        if (s1 === false && s2 === false) {
            console.log(filename + ' is not a valid legacy tensor b-spline grid file .grd' + lines[offset + 0].trim() + ',' + lines[offset + 8].trim());
            return false;
        }

        // Line 0 =#vtkpxBaseGridTransform2 File
        // Origin = 2, Spacing=4, Dimenions=6, Mode = 8, Displacements start at 10
        var origin = lines[offset + 2].trim().split(" ");
        var spacing = lines[offset + 4].trim().split(" ");
        var dims = lines[offset + 6].trim().split(" ");
        for (var k = 0; k <= 2; k++) {
            origin[k] = parseFloat(origin[k]);
            spacing[k] = parseFloat(spacing[k]);
            dims[k] = parseInt(dims[k]);
        }
        let interp = lines[offset + 8].trim().split(" ");
        if (interp !== 4)
            this.internal.linearinterpmode = true;
        else
            this.internal.linearinterpmode = false;

        var np = dims[0] * dims[1] * dims[2];
        this.initialize(dims, spacing, origin, null);
        for (var cp = 0; cp < np; cp++) {
            var x = lines[offset + 10 + cp].trim().split(" ");
            for (var j = 0; j <= 2; j++) {
                this.internal.dispfield[np * j + cp] = parseFloat(x[j + 1]);
            }
        }
        return true;
    }


    /** Returns displacement field array 
     * @returns {array} - displacement field in x,y,z,c order (c=component 3 3 of these)
     */
    getDisplacementField() {
        return this.internal.dispfield;
    }

    /** Returns info about structure of displacement field
     * @returns {object} - { object.dimensions,object.origin,object.spacing} -- describing the grid
     */
    getGridInfo() {
        return {
            origin: [this.internal.origin[0], this.internal.origin[1], this.internal.origin[2]],
            spacing: [this.internal.spacing[0], this.internal.spacing[1], this.internal.spacing[2]],
            dimensions: [this.internal.dimensions[0], this.internal.dimensions[1], this.internal.dimensions[2]]
        };
    }


    /** Sets value from displacement field (nearest voxel). Crude initialization for fitting
     * @param {BisImage} displacementfield
     * @param {boolean} inverse -- if true approximate -disp_field. Default = false
     */
    initializeFromDisplacementField(displacement_field, inverse) {

        var sc = 1.0;
        inverse = inverse || false;
        if (inverse)
            sc = -1.0;

        var dim = displacement_field.getDimensions();
        var data = displacement_field.getImageData();
        if (dim[3] !== 3)
            throw new Error("Need a displacement field here, 3 components!");
        var spa = displacement_field.getSpacing();
        var slicesize = dim[0] * dim[1];
        var volsize = slicesize * dim[2];
        var outindex = 0, i, j, k, coord;

        for (k = 0; k < this.internal.dimensions[2]; k++) {
            var z = util.range(Math.round((k * this.internal.spacing[2] + this.internal.origin[2]) / spa[2]), 0, dim[2] - 1) * slicesize;
            for (j = 0; j < this.internal.dimensions[1]; j++) {
                var y = util.range(Math.round((j * this.internal.spacing[1] + this.internal.origin[1]) / spa[1]), 0, dim[1] - 1) * dim[0];
                for (i = 0; i < this.internal.dimensions[0]; i++) {
                    var x = util.range(Math.round((i * this.internal.spacing[0] + this.internal.origin[0]) / spa[0]), 0, dim[0] - 1);
                    var index = x + y + z;
                    for (coord = 0; coord <= 2; coord++)
                        this.internal.dispfield[coord * this.internal.volsize + outindex] = sc * data[index + volsize * coord];
                    ++outindex;
                }
            }
        }
    }

    /** Computes gradient for a process. 
     * @param {array} params -- the current parameters
     * @param {array} grad - the gradient array to be computed
     * @param {number} stepsize - the stepsize for computing the gradient
     * @param {array} imgbounds - the dimensions of the underlying image (with optional margin)
     * @param {array} imgspa - the spacing of the underlying image
     * @param {number} windowsize - a number 1 to 2 to specify window around controlpoint
     * @param {function} computeValueFunctionPiece -  a function to evaluate a piece
     * @returns {number} - the gradient magnitude
     */
    computeGradientForOptimization(params, grad, stepsize, imgbounds, imgspa, windowsize, computeValueFunctionPiece) {

        var radius = [windowsize * this.internal.spacing[0],
                      windowsize * this.internal.spacing[1],
                      windowsize * this.internal.spacing[2]];
        var bounds = [0, 0, 0, 0, 0, 0];

        var computeBounds = (  (axis, value) => {
            var pos = value * this.internal.spacing[axis] + this.internal.origin[axis];
            bounds[2 * axis] = util.range(Math.round((pos - radius[axis]) / imgspa[axis]), imgbounds[2 * axis], imgbounds[2 * axis + 1]);
            bounds[2 * axis + 1] = util.range(Math.round((pos + radius[axis]) / imgspa[axis]), imgbounds[2 * axis], imgbounds[2 * axis + 1]);
        });


        if (params.length !== this.internal.dispfield.length)
            throw new Error('Bad dimensions for computing grdient optimization in grid transform');

        var nc = this.getNumberOfControlPoints(), cp = 0, i, j, k, coord;
        var GradientNorm = 0.000001;
        for (k = 0; k < this.internal.dimensions[2]; k++) {
            computeBounds(2, k);
            for (j = 0; j < this.internal.dimensions[1]; j++) {
                computeBounds(1, j);
                for (i = 0; i < this.internal.dimensions[0]; i++) {
                    computeBounds(0, i);
                    for (coord = 0; coord <= 2; coord++) {
                        var index = cp + coord * nc;
                        this.internal.dispfield[index] = params[index] + stepsize;
                        var a = computeValueFunctionPiece(this, bounds);
                        this.internal.dispfield[index] = params[index] - stepsize;
                        var b = computeValueFunctionPiece(this, bounds);
                        this.internal.dispfield[index] = params[index];
                        var g = -0.5 * (b - a) / stepsize;
                        grad[index] = g;
                        GradientNorm += g * g;
                    }
                    cp++;
                }
            }
        }

        GradientNorm = Math.sqrt(GradientNorm);
        for (i = 0; i < grad.length; i++)
            grad[i] = grad[i] / GradientNorm;
        return GradientNorm;
    }

    /** Initialize from another displacement grid
     * @param {BisGridTransform} other - the input disp grid
     * @param {BisImage} displacements - last good displacements image
     * @param {number} cps - control point spacing
     
     */
    initializeFromOtherGrid(original_grid, displacements, cps) {

        var hd = original_grid.getGridInfo();

        var spa = [0, 0, 0], origin = [0, 0, 0], dim = [0, 0, 0], i;
        for (i = 0; i <= 2; i++) {
            var sz = (hd.dimensions[i] - 1) * hd.spacing[i];
            dim[i] = Math.round(sz / cps) + 1;
            if (dim[i] < 4)
                dim[i] = 4;
            spa[i] = sz / (dim[i] - 1.05);
            var newsz = (dim[i] - 1) * spa[i];
            var offset = newsz - sz;
            origin[i] = util.scaledround(-0.5 * offset, 100);
        }

        this.initialize(dim, spa, origin);
        this.initializeFromDisplacementField(displacements);

        return;
    }


    /** returns number of bytes needed for WASM serialization
     * @returns {number}  -- number of bytes for serialized array
     */
    getWASMNumberOfBytes() {
        // 16 = main header, 40=my header + 4 bytes per DOF
        return 16 + 40 + this.getNumberOfDOF() * 4;
    }

    /** serializes the grid to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} inDataPtr - store results here
     * @returns {number}  -- number of bytes stored
     */
    serializeWasmInPlace(Module, inDataPtr) {

        let header_arr = new Uint8Array(40);
        let int_header = new Int32Array(header_arr.buffer, 0, 4);
        let float_header = new Float32Array(header_arr.buffer, 16, 6);

        if (this.internal.linearinterpmode)
            int_header[0] = 0;
        else
            int_header[0] = 1;

        for (let i = 0; i <= 2; i++) {
            int_header[i + 1] = this.internal.dimensions[i];
            float_header[i] = this.internal.spacing[i];
            float_header[i + 3] = this.internal.origin[i];
        }

        return biswasm.packRawStructureInPlace(Module,
                                               inDataPtr,
                                               header_arr,
                                               this.internal.dispfield,
                                               biswasm.get_grid_magic_code(Module));
    }


}


module.exports = BisWebGridTransformation;




