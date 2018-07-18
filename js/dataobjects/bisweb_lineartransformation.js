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

// ------------------------------------------------------------------------------------------
// Boilerplate at top
// -----------------------------------------------------------------------------
/** 
 * @file Browser or Node.js module. Contains {@link BisLinearTransformation}.
 * @author Xenios Papademetris
 * @version 1.0
 */


const util=require('bis_util');
const numeric=require('numeric');
const biswasm=require('bis_wasmutils');
const BisWebBaseTransformation=require('bisweb_basetransformation');

// --------------------------------------------------------------------------------------------------------
//   Matrix Utility Code
// --------------------------------------------------------------------------------------------------------
// Uses Euler Z-Y-X Fixed Angles notation - [ theta[offset],theta[offset+1],theta[offset+2] ] = rx,ry,rz
// First rotate about Z by alpha (theta[2]) then about Y by beta (theta[1]), then about X by gamma (theta[0]);
const eulerXYZRotationMatrix = function (theta,offset,out) {
    let rad=[0,0,0];
    for (let i=0;i<=2;i++)
        rad[i]=(Math.PI*theta[i+offset])/180.0;
    
    /*    let calpha=Math.cos(rad[2]),salpha=Math.sin(rad[2]);
          let cbeta =Math.cos(rad[1]),sbeta=Math.sin(rad[1]);
          let cgamma=Math.cos(rad[0]),sgamma=Math.sin(rad[0]);

          let sbeta_cgamma=sbeta*cgamma;
          let sbeta_sgamma=sbeta*sgamma;
          
          out[0][0]= calpha*cbeta;
          out[0][1]= calpha*sbeta_sgamma-salpha*cgamma;
          out[0][2]= calpha*sbeta_cgamma+salpha*sgamma;

          out[1][0]= salpha*cbeta;
          out[1][1]= salpha*sbeta_sgamma+calpha*cgamma;
          out[1][2]= salpha*sbeta_cgamma-calpha*sgamma;

          out[2][0]= -sbeta;
          out[2][1]= cbeta*sgamma;
          out[2][2]= cbeta*cgamma;*/

    let cz=Math.cos(rad[2]),sz=Math.sin(rad[2]);
    let cy =Math.cos(rad[1]),sy=Math.sin(rad[1]);
    let cx=Math.cos(rad[0]),sx=Math.sin(rad[0]);

    out[0][0]= cy*cz;
    out[0][1]= cy*sz;
    out[0][2]= sy;
    
    out[1][0]= - cx*sz - cz*sx*sy;
    out[1][1]= cx*cz - sx*sy*sz;
    out[1][2]= cy*sx;
    
    out[2][0]= sx*sz - cx*cz*sy;
    out[2][1]= - cz*sx - cx*sy*sz;
    out[2][2] = cx*cy;
    
    return;
};


const optimizeMatrix = function(matrix,cache,spa) {
    cache.A00 = matrix[0][0];  cache.A01 = matrix[0][1];
    cache.A02 = matrix[0][2];  cache.A03 = matrix[0][3];
    
    cache.A10 = matrix[1][0];  cache.A11 = matrix[1][1];
    cache.A12 = matrix[1][2];  cache.A13 = matrix[1][3];
    
    cache.A20 = matrix[2][0];  cache.A21 = matrix[2][1];
    cache.A22 = matrix[2][2];  cache.A23 = matrix[2][3];
    
    cache.spa0 =spa[0]; cache.spa1 =spa[1];     cache.spa2 =spa[2];
};

// a*b=result
const inPlaceMatrixMultiply = function (a,b,result) {
    let l=result.length;
    for (let row=0;row<l;row++) {
        for (let col=0;col<l;col++) {
            result[row][col]=0.0;
            for (let index=0;index<l;index++)
                result[row][col]+=a[row][index]*b[index][col];
        }  
    }
};

const inPlaceIdentity = function(mat) {
    let l=mat.length;
    for (let i=0;i<l;i++) {
        for (let j=0;j<l;j++) {
            if (i==j)
                mat[i][j]=1.0;
            else
                mat[i][j]=0.0;
        }
    }
};

// output is min(n1,n2) if rigidOnly=false or 6 if rigidOnly=true
const getOutputLength=function(n1,n2,rigidOnly) {
    
    if (rigidOnly)
        return 6;
    
    if (n2<n1)
        n1=n2;
    return n1;
};

/** A class to model 12-parameter linear transformations resulting in a 4x4 matrix. Do not call directly use instead the 
 * the a factory function (see examples below).
 * var newlinear = transformationFactory.createLinearTransformation(0); // returns a new rigid linear transformation (no need to use ``new'').
 */

class BisWebLinearTransformation extends BisWebBaseTransformation { 


    constructor(mode=0) {

        super();
        this.jsonformatname='BisLinearTransformation';
        this.legacyextension="matr";
        
        this.internal_cache =  {
            A00 : 0,        A01 : 0,        A02 : 0,        A03 : 0,
            A10 : 0,        A11 : 0,        A12 : 0,        A13 : 0,
            A20 : 0,        A21 : 0,        A22 : 0,        A23 : 0,
            spa0 : 0.0,     spa1 : 0.0,     spa2 : 0.0
        };

        this.internal = {
            mode : 0,
            temp : null,
            mshift1 : null,
            mshift2 : null,
            // 0:2 translation, 3:5 rotation, 6:8 scale, 9:11 prerotation
            parameters : [ 0,0,0,
                           0,0,0,
                           1.0,1.0,1.0,
                           0,0,0],
            matrix :  numeric.identity(4),
        };

        this.initialize(mode);
    }


    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription(pretty) {
        if (!pretty)
            return this.legacySerialize("; ");
        let s=this.getFilename() || '';
        if (s!==' ')
            s=s+'\n';
        return s+this.legacySerialize("\n");
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        return util.SHA256(this.matrix);
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        return 256;
    }


    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {

        let obj= super.serializeToDictionary();
        obj.matrix=this.internal.matrix;
        obj.parameters=this.getParameterVector({ scale:true});
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} b -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {
        this.initialize(this.internal.mode);
        this.setParameterVector(b.parameters,{scale:true});
        for (var i=0;i<=3;i++) {
            for (var j=0;j<=3;j++) {
                this.internal.matrix[i][j]  = b.matrix[i][j];
            }
        }
        super.parseFromDictionary(b);
        return true;
    }



    /** deserializes an object from WASM array (with an optional second input to help with header stuff)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} wasmarr - the unsined char wasm object
     */
    deserializeWasm(Module,wasmarr) {
        const wasmobj=biswasm.unpackStructure(Module,wasmarr);

        let bad=true,vector=false;

        if (wasmobj.magic_type===biswasm.get_matrix_magic_code(Module) && wasmobj.data_array.length===29) {
            vector=true;
            bad=false;
        } else  if (wasmobj.magic_type!==biswasm.get_matrix_magic_code(Module) || wasmobj.dimensions[0]!==4 || wasmobj.dimensions[1]!==4) {
            bad=true;
        } else {
            bad=false;
        }

        if (bad===true) {
            console.log('Bad wasmobj',wasmobj.magic_type,wasmobj.dimensions,wasmobj.data_array.length);
            return 0;
        }
        
        if (vector) {
            this.internal.mode=Math.floor(wasmobj.data_array[28]);
        }
        this.initialize(this.internal.mode);

        for (let i=0;i<4;i++) {
            for (let j=0;j<4;j++) {
                this.internal.matrix[i][j]=wasmobj.data_array[i*4+j];
            }
        }
        if (vector) {
            for (let i=0;i<12;i++) {
                this.internal.parameters[i]=wasmobj.data_array[16+i];
            }
        }
        return 1;
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
        
        let mymatrix=this.getMatrix();
        let othermatrix=other.getMatrix();

        console.log('....\t comparing transformation matrices:',numeric.dim(mymatrix),numeric.dim(othermatrix));
        if (method==='maxabs') {
            out.value=numeric.norminf(numeric.sub(mymatrix,othermatrix));
        } else {
            out.value=numeric.norm2(numeric.sub(mymatrix,othermatrix));
            out.metric="ssd";
        }

        if (out.value < threshold) 
            out.testresult=true;

        return out;
    }

    // ---------- BisWebBaseTransformation Functions -------------------------------------------
    /** This is to set the current transformation to identity.
     */
    identity() { 
        // Matrices
        inPlaceIdentity(this.internal.matrix);
        
        // Parameters
        for (let i=0;i<=11;i++) {
            if (i<6 || i>8)
                this.internal.parameters[i]=0.0;
            else
                this.internal.parameters[i]=1.0;
        }
        this.transformPointToVoxel=this.transformPointToVoxelSlow;
        this.setFilename('identity.matr');
    }

    /** transforms input point in mm to a mm coordinate using this matrix
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in mm
     */
    transformPoint(X,TX) {
        TX[0] = (this.internal.matrix[0][0]*X[0]+this.internal.matrix[0][1]*X[1]+this.internal.matrix[0][2]*X[2]+this.internal.matrix[0][3]);
        TX[1] = (this.internal.matrix[1][0]*X[0]+this.internal.matrix[1][1]*X[1]+this.internal.matrix[1][2]*X[2]+this.internal.matrix[1][3]);
        TX[2] = (this.internal.matrix[2][0]*X[0]+this.internal.matrix[2][1]*X[1]+this.internal.matrix[2][2]*X[2]+this.internal.matrix[2][3]);
    }

    
    // ---------- Utility Functions -------------------------------------------
    seriesMultiply(arr) {
        
        var l=arr.length,index=0,i,j;
        inPlaceMatrixMultiply(arr[l-2],arr[l-1],this.internal.temp[0]);
        for (i=l-3;i>=0;i=i-1) {
            if (i>0) {
                inPlaceMatrixMultiply(arr[i],this.internal.temp[index],this.internal.temp[1-index]);
            } else {
                inPlaceMatrixMultiply(arr[i],this.internal.temp[index],this.internal.matrix);
            }
            index=1-index;
        }
        
        for (i=0;i<=3;i++) {
            for (j=0;j<=3;j++) {
                if (Math.abs(this.internal.matrix[i][j])<0.00001)
                    this.internal.matrix[i][j]=0.0;
            }
        }
    }


    /** update2d function -- creates 4x4 matrix from parameters for 2d modes (called from setParameterVector and setShifts) */
    updateInternalMatrix2d() {

        // rotation
        var thetas= [ 0,0,this.internal.parameters[5] ];
        var TR=numeric.identity(4),i;
        eulerXYZRotationMatrix(thetas,0,TR);

        // Translation
        for ( i=0;i<=1;i++) 
            TR[i][3]=this.internal.parameters[i];
        
        if (this.internal.mode===0) {
            this.seriesMultiply([this.internal.mshift2,TR,this.internal.mshift1]);
            return;
        }
        
        var sc;
        if (this.internal.mode===5) 
            sc=[this.internal.parameters[6],this.internal.parameters[6],1.0];
        else
            sc=[this.internal.parameters[6],this.internal.parameters[7],1.0];
        
        var S=numeric.identity(4);
        for (i=0;i<=2;i++)
            S[i][i]=sc[i];
        
        if (this.internal.mode!==6) {
            this.seriesMultiply([this.internal.mshift2,TR,S,this.internal.mshift1]);
            return;
        }
        
        var Q=numeric.identity(4);
        var dthetas = [ 0,0,this.internal.parameters[11] ];
        eulerXYZRotationMatrix(dthetas,0,Q);
        this.seriesMultiply([this.internal.mshift2,TR,S,Q,this.internal.mshift1]);
    }
    

    /** update function -- creates 4x4 matrix from parameters (called from setParameterVector and setShifts)  */
    updateInternalMatrix() {

        if (this.internal.mode>3)
            return this.updateInternalMatrix2d();
        
        var TR=numeric.identity(4),i;
        eulerXYZRotationMatrix(this.internal.parameters,3,TR);
        for ( i=0;i<=2;i++) 
            TR[i][3]=this.internal.parameters[i];
        
        if (this.internal.mode===0) {
            this.seriesMultiply([this.internal.mshift2,TR,this.internal.mshift1]);
            return;
        }
        
        var sc;
        if (this.internal.mode===1) 
            sc=[this.internal.parameters[6],this.internal.parameters[6],this.internal.parameters[6]];
        else
            sc=[this.internal.parameters[6],this.internal.parameters[7],this.internal.parameters[8]];
        
        var S=numeric.identity(4);
        for (i=0;i<=2;i++)
            S[i][i]=sc[i];
        
        if (this.internal.mode!==3) {
            this.seriesMultiply([this.internal.mshift2,TR,S,this.internal.mshift1]);
            return;
        }
        
        var Q=numeric.identity(4);
        eulerXYZRotationMatrix(this.internal.parameters,9,Q);
        this.seriesMultiply([this.internal.mshift2,TR,S,Q,this.internal.mshift1]);
    }
    
    /**
     * This reinitializes the transformation.
     * @param {number} mode - 0: rigid, 1=similarity (7-param), 2=scale+rigid (9-param) 3=affine
     */
    initialize(mode) {
        mode = mode || 0;
        this.internal.mode = util.range(mode,0,6);
        this.internal.temp = [ numeric.identity(4),  numeric.identity(4) ];
        this.internal.mshift1 = numeric.identity(4);
        this.internal.mshift2 = numeric.identity(4);
        this.internal.matrix = numeric.identity(4);
        this.identity();
    }
    
    /** This returns the number of DOFs
     * @returns {number} - number of degrees of freedom
     */
    getNumberOfDOF() {
        if (this.internal.mode==3)
            return 12;
        if (this.internal.mode==2)
            return 9;
        if (this.internal.mode==1)
            return 7;
        if (this.internal.mode==4)
            return 3;
        if (this.internal.mode==5)
            return 4;
        if (this.internal.mode==6)
            return 6;
        return 6;
    }
    
    
    /** transforms input point in mm to a voxel coordinate using this matrix
     * @param {array} X - 3 vector of x,y,z coordinates in mm
     * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in voxel space for target image
     * @param {array} spa - 3 vector of image spacing of target image
     */
    transformPointToVoxelSlow(X,TX,spa) {
        TX[0] = (this.internal.matrix[0][0]*X[0]+this.internal.matrix[0][1]*X[1]+this.internal.matrix[0][2]*X[2]+this.internal.matrix[0][3])/spa[0];
        TX[1] = (this.internal.matrix[1][0]*X[0]+this.internal.matrix[1][1]*X[1]+this.internal.matrix[1][2]*X[2]+this.internal.matrix[1][3])/spa[1];
        TX[2] = (this.internal.matrix[2][0]*X[0]+this.internal.matrix[2][1]*X[1]+this.internal.matrix[2][2]*X[2]+this.internal.matrix[2][3])/spa[2];
    }
    
    transformPointToVoxelFast(X,TX) {
        var X0=X[0],X1=X[1],X2=X[2];
        TX[0] = (this.internal_cache.A00*X0+this.internal_cache.A01*X1+this.internal_cache.A02*X2+this.internal_cache.A03)/this.internal_cache.spa0;
        TX[1] = (this.internal_cache.A10*X0+this.internal_cache.A11*X1+this.internal_cache.A12*X2+this.internal_cache.A13)/this.internal_cache.spa1;
        TX[2] = (this.internal_cache.A20*X0+this.internal_cache.A21*X1+this.internal_cache.A22*X2+this.internal_cache.A23)/this.internal_cache.spa2;
    }
    
    
    /** Gets this.internal 4x4 matrix
     * @returns {Matrix} out - pointer to this.internal 4x4 matrix, use with care.
     */
    getMatrix() {
        return this.internal.matrix;
    }
    
    /** Gets this.internal 4x4 matrix
     * @param {Matrix} input - 4x4 matrix to copy to this.internal 4x4 matrix
     */
    setMatrix(m) {
        for (var i=0;i<=3;i++) {
            for (var j=0;j<=3;j++) {
                this.internal.matrix[i][j]=m[i][j];
            }
        }
        this.transformPointToVoxel=this.transformPointToVoxelSlow;                                  
    }
    
    /*** Creates an optimized this.internal_cached mapping to spped up the point to voxel transformation
     * @memberof BisMatrixLinearTransformation.prototype
     * @param {array} spa - spacing of target image
     */
    
    optimize(spa) {
        optimizeMatrix(this.internal.matrix,this.internal_cache,spa);
        this.transformPointToVoxel=this.transformPointToVoxelFast;
    }
    

    
    /** serializes the matrix
     * with the legacy BioImage Suite .matr format
     * @param {string} s - row delimiter, if not set -> "\n";
     * @return {string} string - containing output
     */
    legacySerialize(s) {
        s=s||"\n";
        var outstring = "";
        for (var i=0;i<4;i++) 
            outstring+=this.internal.matrix[i][0].toFixed(3)+" "+this.internal.matrix[i][1].toFixed(3)+" "+this.internal.matrix[i][2].toFixed(3)+" "+this.internal.matrix[i][3].toFixed(3)+s;
        return outstring;
    }
    
    /** deserializes the landmark set from a string consistent 
     * with the legacy BioImage Suite .land format
     * @param {string} inpstring - input string
     * @param {string} filename -  filename of original file
     * @return {boolean} val - true or false
     */
    legacyParseFromText(inpstring,filename) {
        this.identity();
        var lines=inpstring.split("\n");
        if (lines.length<4) {
            console.log('Failed to deserialize '+filename+' bad file');
            return false;
        }
        for (var row=0;row<4;row++) {
            var x=lines[row].replace(/ +(?= )/g,'').trim().split(" ");
            if (x.length!=4) {
                console.log('Failed to deseriaalize '+filename+' bad file. split='+x.join(':')+', line='+lines[row]);
                return false;
            }
            for (var j=0;j<=3;j++) {
                this.internal.matrix[row][j]=parseFloat(x[j]);
            }
        }
        return true;
    }

    /**
     * This copies another linear transformation
     * @param {BisLinearTransformation} other - transformation to copy
     */
    copy(other) {
        this.parseFromDictionary(other.serializeToDictionary());
    }
    
    /**
     * This sets the optional shifts for `centered' mapping of image to image where the translation is
     * from image center to image center.
     * @param {array} dim_ref - reference image dimensions [width,height,depth ],
     * @param {array} spa_ref - reference image spacing    [sx,sy,sz ],
     * @param {array} dim_trg - target image dimensions [width,height,depth ],
     * @param {array} spa_trg - target image spacing    [sx,sy,sz ],
     */
    setShifts(dim_ref,spa_ref,dim_trg,spa_trg) {

        inPlaceIdentity(this.internal.mshift1);
        inPlaceIdentity(this.internal.mshift2);
        for (var i=0;i<=2;i++) {
            this.internal.mshift1[i][3]= -0.5*(dim_ref[i]-1)*spa_ref[i];
            this.internal.mshift2[i][3]=  0.5*(dim_trg[i]-1)*spa_trg[i];
        }
        this.updateInternalMatrix();
        this.transformPointToVoxel=this.transformPointToVoxelSlow;
    }
    
    /** Sets parameter values from an array and does update.
     * @param {array} values - a 12-sized array. Elements 0-2 are translations, 3-5 are rotations, 6-8 are scales and 9-11 are pre-rotations (shear)
     * @param {object} opts - the options object
     * @param {boolean} opts.rigidOnly - if true then only store first six parameters (default=false)
     * @param {boolean} opts.scale - if true  then divide input scale parameters by 100 (default=false)
     * @returns {array} out - parameter vector
     */
    setParameterVector(values,opts) {
        opts= opts || {};
        opts.scale = opts.scale || false;
        opts.rigidOnly = opts.rigidOnly || false;
        
        var i=0;
        var n=getOutputLength(this.getNumberOfDOF(),values.length,opts.rigidOnly);
        this.identity();
        for (i=0;i<n;i++) 
            this.internal.parameters[i]=values[i];
        
        // Check scale
        if (opts.scale && n>6) {
            for (i=6;i<n;i++) {
                this.internal.parameters[i]=this.internal.parameters[i]/100.0;
            }
        }
        this.updateInternalMatrix();
        this.transformPointToVoxel=this.transformPointToVoxelSlow;
    }
    
    /** Gets parameter values as an array
     * @param {object} opts - the options object
     * @param {boolean} opts.rigidOnly - if true then only return first six parameters (default=false)
     * @param {boolean} opts.scale - if true  then multiply scale parameters *100 (default=false)
     * @returns {array} out - parameter vector
     */
    getParameterVector(opts) {
        opts= opts || {};
        opts.rigidOnly = opts.rigidOnly || false;
        opts.scale = opts.scale || false;
        
        var l=getOutputLength(this.getNumberOfDOF(),12,opts.rigidOnly);
        var p=new Array(l);
        this.storeParameterVector(p,opts);
        return p;
    }
    
    /** Store parameter values as an array
     * @param {array} out - parameter vector output (of length 6,7,9 or 12 depending on type)
     * @param {object} opts - the options object
     * @param {boolean} opts.rigidOnly - if true then only return first six parameters (default=false)
     * @param {boolean} opts.scale - if true  then multiply scale parameters *100 (default=false)
     */
    storeParameterVector(out,opts) {
        
        opts= opts || {};
        opts.scale = opts.scale || false;
        opts.rigidOnly = opts.rigidOnly || false;
        
        var i=0,l=getOutputLength(this.getNumberOfDOF(),out.length,opts.rigidOnly);
        
        for (i=0;i<l;i++) 
            out[i]=this.internal.parameters[i];
        
        if (opts.scale === true) {
            var maxi=9;
            if (maxi>l)
                maxi=l;
            for (i=6;i<maxi;i++) {
                out[i]=this.internal.parameters[i]*100.0;
            }
        }
    }

    /** returns number of bytes needed for WASM serialization
     * @returns {number}  -- number of bytes for serialized array
     */
    getWASMNumberOfBytes() {
        // 16 = main header, 8=my header, 4*4*4=4x4xfloat elements
        return 16+8+4*4*4;
    }
    
    /** serializes a 4x4 matrix to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {PointerInt} inDataPtr - store result here
     * @returns {number}  -- number of bytes serialized

     */
    serializeWasmInPlace(Module,inDataPtr) {

        let data_arr=new Float32Array(16);
        for (let i=0;i<4;i++) {
            for (let j=0;j<4;j++) {
                data_arr[i*4+j]=this.internal.matrix[i][j];
            }
        }
        let header_arr=new Int32Array([4,4]);
        
        return biswasm.packRawStructureInPlace(Module,
                                               inDataPtr,
                                               header_arr,
                                               data_arr,
                                               biswasm.get_matrix_magic_code(Module));
        
    }


}


module.exports = BisWebLinearTransformation;


