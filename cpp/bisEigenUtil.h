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

#ifndef _bis_EigenUtil_h
#define _bis_EigenUtil_h

#include <string>

/**
 *   Eigen Utility functions for BioImage Suite Web
 *   These functions encapsulate calls to the eigen numerical algebra library
 *   http://eigen.tuxfamily.org/dox/group__QuickRefPage.html
 */

#include <Eigen/Core>
#include "bisSimpleDataStructures.h"

namespace bisEigenUtil {

  /** Deserializes a bisSimpleMatrix<float> serialized array and casts to Eigen::MatrixXf
   * @param s_matrix the SimpleMatrix (for memory management purposes)
   * @param ptr the serialized array containing the data
   * @param output the output Eigen::MatrixXf
   * @param debug if >0 print diagnostics
   * @return 1 if deserialized, 0 if failed
   */
  int deserializeAndMapToEigenMatrix(bisSimpleMatrix<float>* s_matrix,unsigned char* ptr,Eigen::MatrixXf& output,int debug=1);
  

  /** Deserializes a bisSimpleVector<float> serialized array and casts to Eigen::Vector
   * if ptr is null, creates a vector of size defaultsize and fills it with defaultvalue
   * @param s_vector the SimpleVector (for memory management purposes)
   * @param ptr the serialized array containing the data
   * @param output the output Eigen::Vector
   * @param defaultsize the size of the vector if ptr is 0
   * @param defaultvalue the value to fill the vector with if ptr is 0
   * @param debug if >0 print diagnostics
   * @return 1 if deserialized, 0 if failed, 2 if created and filled! > 0 is OK
   */
  int deserializeAndMapToEigenVector(bisSimpleVector<float>* s_vector,unsigned char* ptr,Eigen::VectorXf& output,int defaultsize,float defaultvalue=0.0f,int debug=1);

  /** serialize and return raw array from Eigen::MatrixXf 
   * the pointer ownership is released here
   * @param mat the input matrix
   * @param name the name of the serialized array
   * @returns serialized array (via bisSimpleMatrix<float> */
  unsigned char* serializeAndReturn(Eigen::MatrixXf& mat,std::string name="eigenmatrix");
  

  /** Convert simpleMatrix float to eigen matrix float.
   * NO N_E_W Memory is allocated this is just a pointer move.
   * Uses Eigen::MatrixXf::Map
   * @param m the input matrix
   * @returns an Eigen float Matrix
   */
  Eigen::MatrixXf mapToEigenMatrix(bisSimpleMatrix<float>* m);

    /** Convert simpleImage float to eigen matrix float.
   * NO N_E_W Memory is allocated this is just a pointer move.
   * Uses Eigen::MatrixXf::Map
   * @param m the input image
   * @returns an Eigen float Matrix
   */
  Eigen::MatrixXf mapImageToEigenMatrix(bisSimpleImage<float>* m);

  /** Convert simpleVector float to eigen matrix float
   * NO N_E_W Memory is allocated this is just a pointer move.
   * Uses Eigen::Vector::Map
   * @param m the input vector
   * @returns an Eigen float Vector
   */
  Eigen::VectorXf mapToEigenVector(bisSimpleVector<float>* m);
  
  
  /** Create Simple Matrix from Eigen Matrix 
   * @param inp the input Eigen matrix
   * @param name is use to set the name of the output matrix
   * @returns a n_e_w bisSimpleMatrix<float>
   */
  bisSimpleMatrix< float>* createSimpleMatrix(Eigen::MatrixXf inp,std::string name="eigenm");
  
  
  /** Create Simple Vector from an Eigen Vector
   * @param inp the input Eigen Vector
   * @param name is use to set the name of the output vector
   * @returns a n_e_w bisSimpleVector<float>
   */
  bisSimpleVector< float>* createSimpleVector(Eigen::VectorXf inp,std::string name="eigenv");
  
  
  /** returns matrix dimensions 
   * @param matrix the matrix
   * @param sz stores dimensions on output 
   */
  void getMatrixDimensions(Eigen::MatrixXf& matrix,int sz[2]);

  /** initialize eigen matrix (resize if needed and set to zero)
   * @param matrix the matrix
   * @param sz the n_e_w dimensions
   */
  void resizeZeroMatrix(Eigen::MatrixXf& matrix,int sz[2]);


  /** initialize eigen vector (resize if needed and set to zero)
   * @param vct the vector
   * @param numrows the n_e_w number of rows)
   */
  void resizeZeroVector(Eigen::VectorXf& vct,int numrows);


  /** Computes Least Squares fir Matrix i.e. inv(AtA)*At
   * param A the input matrix
   * @returns the LSQ Matrix */
  Eigen::MatrixXf createLSQMatrix(Eigen::MatrixXf& A);

  /** In place Multiply Matrix * Vector A*x=b 
   * @param A the matrix
   * @param x the vector x
   * @param b the result vector b
   * @returns 0 if error, 1 if ok
   */
  int inPlaceMultiplyMV(Eigen::MatrixXf& A, Eigen::VectorXf& x, Eigen::VectorXf& b);

  
  /** In place Multiply A*B=C
   * @param A the first matrix
   * @param B the second matrix
   * @param C the result matrix 
   * @returns 0 if error, 1 if ok
   */
  int inPlaceMultiply(Eigen::MatrixXf& A, Eigen::MatrixXf& B, Eigen::MatrixXf& C);

      /** In place Multiply A*B*C=result
   * @param A the first matrix
   * @param B the second matrix
   * @param C the third matrix 
   * @param result the result matrix 
   * @returns 0 if error, 1 if ok
   */
    int inPlaceMultiply3(Eigen::MatrixXf& A, Eigen::MatrixXf& B, Eigen::MatrixXf& C,Eigen::MatrixXf& result);

  
  /** Read an Eigen::Matrix from a bytestring originally read from a Matlab .mat file 
   * @param bytepointer raw bytes from a matlab .mat file
   * @param numbytes is the number of bytes in bytepointer
   * @param matrixname  name of matrix to get (or empty)
   * @param debug if 1 print stuff
   * @param out_ok on output set to 1 if success or 0 if failure
   * @returns a matrix
   */
  Eigen::MatrixXf importFromMatlabV6(const unsigned char* bytepointer,int numbytes,std::string matrixname,int debug,int& out_ok);
}

#endif
