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

#include "bisDefinitions.h"

#ifdef __cplusplus
extern "C" {
#endif

  /** @file bisTesting.h
      Functions exported to JS and Python primarily for testing
  */


  // Actual Regression Tests
  // -----------------------------------------------------

  /** Returns 1701 (Yale's first year) if in webassembly or 1700 if in C (for Python, Matlab etc.) */
  // BIS: { 'test_wasm', 'Int' } 
  BISEXPORT int test_wasm();

  /** Redirects stdout fo a file -- used for debugging and testing
   * @param fname filename to save in (defaults to bislog.txt in current directory)
   * returns 1 if file opened OK
   */
  // BIS: { 'redirect_stdout', 'Int', [ 'String' ] }
  BISEXPORT int redirect_stdout(const char* fname);
  

  /** Tests serialization of 4x4 matrix in and out
   * Expects  matrix[row][col] = (1+row)*10.0+col*col*5.0
   * @param ptr serialized 4x4 transformation as unsigned char array 
   * @param debug if > 0 print debug messages
   * @returns difference between expected and received matrix as a single float
   */
  // BIS: { 'test_matrix4x4', 'Float', [ 'bisLinearTransformation', 'debug'] } 
  BISEXPORT float test_matrix4x4(unsigned char* ptr,int debug);


  /** Create 4x4 Matrix from param vector and two images  
   * @param image1_ptr serialized  image1 as unsigned char array 
   * @param image2_ptr serialized  image2 as unsigned char array 
   * @param pvector_ptr the transformation parameters see \link bisLinearTransformation.setParameterVector \endlink
   * @param jsonstring algorithm parameters  { mode: 2 }
   * @param debug if > 0 print debug messages
   * @returns matrix 4x4 as a serialized array
   */
  // BIS: { 'test_create_4x4matrix', 'bisLinearTransformation', [ 'bisImage', 'bisImage', 'Vector' , 'ParamObj', 'debug'] } 
  BISEXPORT unsigned char* test_create_4x4matrix(unsigned char* image1_ptr,
						 unsigned char* image2_ptr,
						 unsigned char* pvector_ptr,
						 const char* jsonstring,
						 int debug);


  /** Tests Eigen operations
   * @param m_ptr serialized 4x4 transformation as unsigned char array 
   *     where matrix[row][col] = (1+row)*10.0+col*col*5.0 as input for initital test
   * @param v_ptr serialized 6 vector as unsigned char array [ 1,2,3,5,7,11 ]
   * @param debug if > 0 print debug messages
   * @returns number of failed tests (0=pass, -1 -> deserializing failed)
   */
  // BIS: { 'test_eigenUtils', 'Int', [ 'bisLinearTransformation', 'Vector', 'debug'] } 
  BISEXPORT int test_eigenUtils(unsigned char* m_ptr,unsigned char* v_ptr,int debug);


  /** Tests Matlab read
   * @param f_ptr serialized byte vector whose payload are the raw bytes from a .mat file
   * @param m_ptr serialized matrix (one of those in the .mat file)
   * @param name name of matrix to look for
   * @param debug if > 0 print debug messages
   * @returns max abs difference between matrices
   */
  // BIS: { 'test_matlabParse', 'Float', [ 'Vector', 'Matrix', 'String', 'debug'] } 
  BISEXPORT float test_matlabParse(unsigned char* f_ptr,unsigned char* m_ptr,const char* name,int debug);

  /** Tests Bending Energy
   * @param ptr serialized Combo Transformation with 1 grid
   * @param debug if > 0 print debug messages
   * @returns num failed tests
   */
  // BIS: { 'test_bendingEnergy', 'Int', [ 'bisComboTransformation','debug'] } 
  BISEXPORT int test_bendingEnergy(unsigned char* ptr,int debug);

  /** Tests PTZ Conversions i.e. p->t, t->p p->z, z->p
   * @param debug if > 0 print debug messages
   * @returns num failed tests
   */
  // BIS: { 'test_PTZConversions', 'Int', [ 'debug'] } 
  BISEXPORT int test_PTZConversions(int debug);

  
  /** Tests In Place Matrix Multiplication in bisEigenUtil 
   * @param debug if > 0 print debug messages
   * @returns num failed tests
   */
  // BIS: { 'test_eigenUtilOperations', 'Int', [ 'debug'] } 
  BISEXPORT int test_eigenUtilOperations(int debug);


  /** Mirror text file  first parse then recreated 
   * @param input the input text file (from a .grd file)
   * @param debug if >0 print debug messages
   * @returns the recreated text file
   */
  // BIS: { 'test_mirrorComboTransformTextFileWASM', 'String', [ 'String', 'debug'] } 
  BISEXPORT unsigned char* test_mirrorComboTransformTextFileWASM(const char* input,int debug);

  /** Compute Joint Histogram Metrics
   * @param image1_ptr serialized  image1 as unsigned char array 
   * @param image2_ptr serialized  image2 as unsigned char array 
   * @param weight1_ptr serialized  weight 1 as unsigned char array 
   * @param weight2_ptr serialized  weight 2 as unsigned char array 
   * @param num_weights number of weights to use (0=none, 1=only weight1_ptr, 2=both)
   * @param jsonstring algorithm parameters  { numbinsx: 64, numbinst: 64, intscale:1 }
   * @param return_histogram if 1 return the actual histogram else the metrics
   * @param debug if > 0 print debug messages
   * @returns if return_histogram =1 the histogram as a matrix, else a single row matrix consisting of
   *  [ SSD, CC, NMI, MI, EntropyX, Entropy, jointEntropy, numSamples ] both as serialized arrays
   */
  // BIS: { 'test_compute_histo_metric', 'Matrix', [ 'bisImage', 'bisImage','bisImage_opt', 'bisImage_opt', 'Int', 'ParamObj','Int','debug' ]};
  BISEXPORT unsigned char* test_compute_histo_metric(unsigned char* image1_ptr,
						     unsigned char* image2_ptr,
						     unsigned char* weight1_ptr,
						     unsigned char* weight2_ptr,
						     int num_weights,
						     const char* jsonstring,
						     int return_histogram,
						     int debug);

  
  /** test Surface parsing
   * @param input the input surface
   * @param jsonstring { shiftpoints : 2.0 , shiftindices : 3 }
   * @param debug if >0 print debug messages
   * @returns the recreated surface
   */
  // BIS: { 'test_shiftSurfaceWASM', 'bisSurface', [ 'bisSurface', 'ParamObj', 'debug'] }
  BISEXPORT unsigned char* test_shiftSurfaceWASM(unsigned char* input,const char* jsonstring,int debug);

#ifdef __cplusplus
}
#endif
