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


#ifndef _bis_LegacyFileSupport_h
#define _bis_LegacyFileSupport_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisEigenUtil.h"
#include "bisUtil.h"
#include "math.h"


class bisComboTransformation;

/**
 * LegacyFileSupport  
 */
namespace bisLegacyFileSupport {

  /** Store a string in bisSimpleVector<char> -- used for returning strings to JS and Python
   * @param s the input string
   * @returns a simple vector containing the string
   */
  bisSimpleVector<char>* storeStringInSimpleVector(std::string& s);
  
  /** return a matrix from a .matr file (either octave style or straight up 4x4 matrix)
   * @param text string containing text file
   * @param output the output matrix
   * @param debug if > 0 print debug messages
   * @returns 1 if success 0 if failed
   */
  int parseMatrixTextFile(const char* text,Eigen::MatrixXf& output,int debug);


  /** return a .matr file (either octave style or straight up 4x4 matrix) from a matrix
   * @param input the input matrix
   * @param name the matrix name
   * @param mode4x4 if true save as 4x4 text file else octave style .matr file
   * @param debug if > 0 print debug messages
   * @returns the output string
   */
  std::string writeMatrixTextFile(Eigen::MatrixXf& input,std::string name="matrix",int mode4x4=0,int  debug=0);



  /** return a combo transformation from a .grd file 
   * @param text string containing text file
   * @param output the combo transformation
   * @param debug if > 0 print debug messages
   * @returns 1 if success 0 if failed
   */
  int parseLegacyGridTransformationFile(const char* text,bisComboTransformation* output,int debug);


  /** return a grd file form a combo transformation
   * @param input the input transformation
   * @param debug if > 0 print debug messages
   * @returns the output string
   */
  std::string writeLegacyGridTransformationFile(bisComboTransformation* input,int debug);

  /** Convert NIFTI mat44 to quatern */
  int convertMat44ToQuatern(Eigen::MatrixXf& input,Eigen::MatrixXf& output,int debug=0);
}
#endif
