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


#ifndef _bis_IdentityTransformation_h
#define _bis_IdentityTransformation_h

#include "bisMatrixTransformation.h"


/**
 * Optimized implementation of linear (or any for that matter) transformation to yield identity mappings
 * inspired by vtkIdentityTransform
 */
class bisIdentityTransformation : public bisMatrixTransformation {
  
 public:

  /** Constructor
      @param n used to set class name */
  bisIdentityTransformation(std::string n="identityxform"); // default is Rigid 3D

  /** Destructor */
  virtual ~bisIdentityTransformation();

  /** Copy x to y
   * @param x input point
   * @param y output point
   */
  virtual void transformPoint(float x[3],float y[3]);

  /** Divide x by spa to give y
   * @param x input point
   * @param y output point
   * @param spa spacing of the underlying image used to convert mm to voxels. Origin is always 0,0,0 in bisWeb
   */
  virtual void transformPointToVoxel(float x[3],float y[3],float spa[3]);

  
  /** Outpus 0,0,0 as disp
   * @param x input point (not used)
   * @param disp output displacement (always 0,0,0)
   */
  virtual void computeDisplacement(float x[3],float disp[3]);


  // No
  virtual  int isLinear() { return 0;}

protected:

  /** Protected here to disable as this class always is identity */
  virtual int setMatrix(bisUtil::mat44 ) { return 0; }

  /** Protected here to disable as this class always is identity */
  virtual int setSimpleMatrix(bisSimpleMatrix<float>* ) {return 0; }

  
private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisIdentityTransformation(const bisIdentityTransformation&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisIdentityTransformation&);  

};

#endif
