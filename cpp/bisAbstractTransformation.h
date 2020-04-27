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

#ifndef _bis_AbstractTransformation_h
#define _bis_AbstractTransformation_h

#include <memory>
#include "bisSimpleDataStructures.h"
#include "bisDataObject.h"

/**
 * Parent class for all bisWeb transformation classes
 *
 * This must implement transformPoint(), identity, deSerialize, serializeInPlace and getRawSize
 * which are all pure virtual functions.
 *
 */

class bisAbstractTransformation : public bisDataObject {

public:

  /** Constructs a transformation
   * @param name value to set the name of the object
   */
  bisAbstractTransformation(std::string name);

  /** Destructor */
  virtual ~bisAbstractTransformation() { }

  /** Pure virtual method to transform x to y
   * @param x input point
   * @param y output point
   */
  virtual void transformPoint(float x[3],float y[3])=0;

  /** Sets the transformation to identity */
  virtual void identity()=0;

  /** transforms a point x to a voxel y using spacing spa
   * essentially calls transformPoint and then divides by spa
   * @param x input point in mmm
   * @param y output point in voxels
   * @param spa spacing of the underlying image used to convert mm to voxels. Origin is always 0,0,0 in bisWeb
   */
  virtual void transformPointToVoxel(float x[3],float y[3],float spa[3]);

  /** computes the displacement at a point x.
   * essentially calls transformPoint and then subtracts x from the result
   * @param x input point in mmm
   * @param disp output displacement in mm
   */
  virtual void computeDisplacement(float x[3],float disp[3]);


  /** computes the displacement at a point x for region of image bounded by bounds
   * @param output is the image (3 components) to store displacements in 
   * @param bounds [ imin:imax,jmin:jmax;kmin:kmax] is the region to compute
   * @returns 1 if success, 0 if failure
   */
  virtual int inPlaceComputeDisplacementField(bisSimpleImage<float>* output, int bounds[6]);


  /** computes the SSD between two displacement fields -- this is static member 
   * @param dispfield1 first displacement field
   * @param dispfield2 second displacement field
   * @param bounds [ imin:imax,jmin:jmax;kmin:kmax] is the region to compute
   * @param debug if > 0 print debug messages
   * @returns SSD of displacement field within bounds */
  static float computeDisplacementFieldSSD(bisSimpleImage<float>* dispfield1,
					   bisSimpleImage<float>* dispfield2,
					   int bounds[6],int debug=0);
  
  /** Compute a displacement field over the space specified by dim and spa 
   * @param dim dimensions of output displacement field image
   * @param spa spacing of output field image
   * @returns 1 if success, 0 if failure
   */

  virtual bisSimpleImage <float>* computeDisplacementField(int dim[3],float spa[3]);


  /** Gets the raw size in bytes for this structure */
  virtual long getRawSize()=0;

  /** Get Magic Type for this transformation -> used in serialization */
  virtual int getMagicType() { return this->magic_type; }

  /** Prints info about this object for debugging, mostly used to print 4x4 matrices
      in linear transformations */
  virtual void printSelf() { }

  /** Test if this transformation is a linear one (i.e. derives from bisMatrixTransformation) */
  virtual  int isLinear() = 0;


private:
  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisAbstractTransformation(const bisAbstractTransformation&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisAbstractTransformation&);  
};



#endif
