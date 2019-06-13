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
 * @file Browser or Node.js module. Contains {@link SimpleMat}.
 * @author Xenios Papademetris
 * @version 1.0
 */

/**
 * Code to process 4x4 Float 32 Matrices and 4x1 vectors needed for nifti header processing
 * @namespace SimpleMat
 */

const simpleMat = {

    /**
     * Code to manipulate  4x1 Float32 vector 
     * @namespace SimpleMat.GMVec4
     */
    GMVec4 : {

        /** create new 4x1 empty vector 
         * @alias SimpleMat.GMVec4.createFloat32
         */
        createFloat32 : function createFloat32() {
            return new Float32Array(4);
        },

        /** create new empty one and set values 
         * @alias SimpleMat.GMVec4.createFloat32FromValues
         * @param {number} v0,v1,v2,v3 - the values for elements 1--4
         */
        
        createFloat32FromValues : function createFloat32FromValues(v0, v1, v2, v3) {
            var vec = this.createFloat32();
            this.setFromValues(vec, v0, v1, v2, v3);
            return vec;
        },

        /** set from four values 
         * @alias SimpleMat.GMVec4.setFromValues
         * @param {SimpleMat.GMVec4} vec - the vector (as created by createFloat32)
         * @param {number} v0,v1,v2,v3 - the values for columns 1--4
         */
        setFromValues : function setFromValues (vec, v0, v1, v2, v3) {
            vec[0] = v0;
            vec[1] = v1;
            vec[2] = v2;
            vec[3] = v3;
            return vec;
        },
    },
    
    /**
     * A simple set of methods to process 4x4 float 32 matrices (originally probably from closure)
     * No data is stored you have to provide the matrix each time
     * @namespace SimpleMat.GMMat4
     */
    GMMat4 : {

        /** create new 4x4  empty matrix (actually internally a 16x1 vector) 
         * @alias SimpleMat.GMMat4.createFloat32
         */
        createFloat32 : function createFloat32() {
            return new Float32Array(16);
        },

        /**  Print matrix to string  
         * @alias SimpleMat.GMMat4.print
         * @param {SimpleMat.GMMat4} mat - the matrix (as created by createFloat32)
         */
        print : function print(mat) {
            
            var matline='\n';
            for (var j=0;j<=3;j++) {
                matline+='\t [ ';
                for (var i=0;i<=3;i++) {
                    matline+='\t'+mat[i*4+j]+'';
                }
                matline+='\t]\n';
            }
            return matline;
        },

        /**  Set the valoes of a row (row)  
         * @alias SimpleMat.GMMat4.setRowValues
         * @param {SimpleMat.GMMat4} mat - the matrix (as created by createFloat32)
         * @param {number} row - the row of the matrix to set (0-3)
         * @param {number} v0,v1,v2,v3 - the values for columns 1--4
         */
        setRowValues : function setRowValues(mat, row, v0, v1, v2, v3) {
            mat[row] = v0;
            mat[row + 4] = v1;
            mat[row + 8] = v2;
            mat[row + 12] = v3;
            return mat;
        },

        /**  Invert the 4x4 matrix mat  
         * @alias SimpleMat.GMMat4.invert
         * @param {SimpleMat.GMMat4} mat - the input matrix (as created by createFloat32)
         * @param {SimpleMat.GMMat4} resultMat - the output matrix (as created by createFloat32)
         */     
        invert : function invert (mat, resultMat) {
            var m00 = mat[0], m10 = mat[1], m20 = mat[2], m30 = mat[3];
            var m01 = mat[4], m11 = mat[5], m21 = mat[6], m31 = mat[7];
            var m02 = mat[8], m12 = mat[9], m22 = mat[10], m32 = mat[11];
            var m03 = mat[12], m13 = mat[13], m23 = mat[14], m33 = mat[15];
            
            var a0 = m00 * m11 - m10 * m01;
            var a1 = m00 * m21 - m20 * m01;
            var a2 = m00 * m31 - m30 * m01;
            var a3 = m10 * m21 - m20 * m11;
            var a4 = m10 * m31 - m30 * m11;
            var a5 = m20 * m31 - m30 * m21;
            var b0 = m02 * m13 - m12 * m03;
            var b1 = m02 * m23 - m22 * m03;
            var b2 = m02 * m33 - m32 * m03;
            var b3 = m12 * m23 - m22 * m13;
            var b4 = m12 * m33 - m32 * m13;
            var b5 = m22 * m33 - m32 * m23;
            
            var det = a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;
            if (det === 0) {
                return false;
            }
            
            var idet = 1.0 / det;
            resultMat[0] = (m11 * b5 - m21 * b4 + m31 * b3) * idet;
            resultMat[1] = (-m10 * b5 + m20 * b4 - m30 * b3) * idet;
            resultMat[2] = (m13 * a5 - m23 * a4 + m33 * a3) * idet;
            resultMat[3] = (-m12 * a5 + m22 * a4 - m32 * a3) * idet;
            resultMat[4] = (-m01 * b5 + m21 * b2 - m31 * b1) * idet;
            resultMat[5] = (m00 * b5 - m20 * b2 + m30 * b1) * idet;
            resultMat[6] = (-m03 * a5 + m23 * a2 - m33 * a1) * idet;
            resultMat[7] = (m02 * a5 - m22 * a2 + m32 * a1) * idet;
            resultMat[8] = (m01 * b4 - m11 * b2 + m31 * b0) * idet;
            resultMat[9] = (-m00 * b4 + m10 * b2 - m30 * b0) * idet;
            resultMat[10] = (m03 * a4 - m13 * a2 + m33 * a0) * idet;
            resultMat[11] = (-m02 * a4 + m12 * a2 - m32 * a0) * idet;
            resultMat[12] = (-m01 * b3 + m11 * b1 - m21 * b0) * idet;
            resultMat[13] = (m00 * b3 - m10 * b1 + m20 * b0) * idet;
            resultMat[14] = (-m03 * a3 + m13 * a1 - m23 * a0) * idet;
            resultMat[15] = (m02 * a3 - m12 * a1 + m22 * a0) * idet;
            return true;
        },
        
        /**  Multiply matrix* vector = vector
         * @alias SimpleMat.GMMat4.multVec4
         * @param {SimpleMat.GMMat4} mat - the input matrix 
         * @param {SimpleMat.GMVec4} vec - the input vector 
         * @param {SimpleMat.GMVec4} resultVec - the result vector 
         */     
        multVec4 : function multVec4(mat, vec, resultVec) {
            var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
            resultVec[0] = x * mat[0] + y * mat[4] + z * mat[8] + w * mat[12];
            resultVec[1] = x * mat[1] + y * mat[5] + z * mat[9] + w * mat[13];
            resultVec[2] = x * mat[2] + y * mat[6] + z * mat[10] + w * mat[14];
            resultVec[3] = x * mat[3] + y * mat[7] + z * mat[11] + w * mat[15];
            return resultVec;
        },
    }
};


module.exports = simpleMat;








