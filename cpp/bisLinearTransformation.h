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


#ifndef _bis_LinearTransformation_h
#define _bis_LinearTransformation_h

#include "bisMatrixTransformation.h"
#include <vector>

/**
 * A more complex linear transformation
 * It can compose a 4x4 matrix from 3 translations, 3 rotations, 3 scales and 3 shears
 * inspired by vtkTransform
 */

class bisLinearTransformation : public bisMatrixTransformation {
  
 public:

  /** Constructor
      @param name used to set class name */
  bisLinearTransformation(std::string name="linearxform"); // default is Rigid 3D

  /** Destructor */
  virtual ~bisLinearTransformation();

  /** Sets the mode of the transformation 
      @param m : 0=rigid 3D, 1=similarity 3d,2=9-dof 3d, 3=affine 3d,4=rigid 2d, 5=similarity 2d,6=affine 2d
  */
  void setMode(int m);

  /** Returns the Mode */
  int getMode();
  
  /** Returns number of degrees of freedom depending on the mode of the transformation*/
  int getNumberOfDOF();

  /** Makes transformation identity */
  virtual void identity();
  
  /** Sets a pre matrix transformation
   * this is pre multiplied before the internal parameters are used
   */
  void   setPreMatrixTransformation(bisMatrixTransformation *pre_xform);

  /** Sets optional shifts for images to allow the actual mapping to be centered in the middle of the image
   * @param dim_ref dimensions of reference image
   * @param spa_ref spacing of reference image
   * @param dim_trg dimensions of target image
   * @param spa_trg spacing of target image
   */
  void   setShifts(int dim_ref[3],float spa_ref[3],int dim_trg[3],float spa_trg[3]);

  /** set the parameter vector of this transformation
   * values is an array of [ tx,ty,tz, rx,ry,rz, sx,sy,sz, sh_x,sh_y,sh_z ]
   * if doscale > 1 scale parameters are assumed to be in percenetage (i.e. 1=100)
   * if rigidonly then only first 6 are used
   * @param values input parameters
   * @param doscale whether to divide incoming scale factors by 100
   * @param rigidOnly whether to copy only rigid components
   */
  void   setParameterVector(std::vector<float>& values,int doscale=0,int rigidOnly=0);

    /** gets the parameter vector of this transformation
   * values is an array of [ tx,ty,tz, rx,ry,rz, sx,sy,sz, sh_x,sh_y,sh_z ]
   * if doscale > 1 scale parameters are assumed to be in percenetage (i.e. 1=100)
   * if rigidonly then only first 6 are used
   * @param out output parameters
   * @param doscale whether to multiply outgoing scale factors by 100
   * @param rigidOnly whether to copy only rigid components
   */
  void   storeParameterVector(std::vector<float>& out,int doscale=0,int rigidOnly=0);

protected:

  /** mode of the transformation */
  int mode;

#ifndef DOXYGEN_SKIP
  bisUtil::mat44 temp[2], mshift1, mshift2,pre_matrix;
#endif
  
  /** The actual parameters of the transformation */
  float parameters[12];


  /** Internal function to compute an eulerXYZ rotation matrix and store in out */
  void eulerXYZRotationMatrix(float* thetas,int offset,bisUtil::mat44 out);

  /** In place matrix multiplication a*b=result */
  void inPlaceMatrixMultiply(bisUtil::mat44 a,bisUtil::mat44 b,bisUtil::mat44 result);

  /** get minimum  from n1,n2 but restricted if rigid=1 */
  int getOutputLength(int n1,int n2,int rigidOnly=0);

  /** Multiply up to maxnum matrices and and store in this->matrix */
  void seriesMultiply(bisUtil::mat44* arr[6],int maxnum);

  /** Update this->matrix in 2d modes once parameters are updated */
  void updateInternalMatrix2d();

  /** Update this->matrix in 3d modes once parameters are updated */
  void  updateInternalMatrix();

private:
  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisLinearTransformation(const bisLinearTransformation&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisLinearTransformation&);  
	
};

#endif
