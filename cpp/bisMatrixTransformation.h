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


#ifndef _bis_MatrixTransformation_h
#define _bis_MatrixTransformation_h

#include "bisUtil.h"
#include "bisAbstractTransformation.h"
#include "bisSimpleDataStructures.h"

/**
 * Class the encapsulates a 4x4 matrix as a transformation
 */
class bisMatrixTransformation : public bisAbstractTransformation {
  
 public:

  /** Constructor
      @param n used to set class name */
  bisMatrixTransformation(std::string n="matrixxform");

  /** Destructor */
  virtual ~bisMatrixTransformation();

  /** Sets matrix to identity */
  virtual void identity();

  /** Transform point x to y 
   * @param x input point
   * @param y output point
   */
  virtual void transformPoint(float x[3],float y[3]);

  /** transforms a point x to a voxel y using spacing spa
   * @param x input point in mmm
   * @param y output point in voxels
   * @param spa spacing of the underlying image used to convert mm to voxels. Origin is always 0,0,0 in bisWeb
   */
  virtual void transformPointToVoxel(float x[3],float y[3],float spa[3]);
  
  /** Get the internal 4x4 matrix by storing in in m
   * @param m matirx to which the contents of the internal transformation are copied to 
   */
  void getMatrix(bisUtil::mat44 m);


  /** Set the internal matrix from m
   * @param m matirx matrix to set internal matrix from
   */
  virtual int setMatrix(bisUtil::mat44 m);

  /** Export the current matrix to a  bisSimpleMatrix<float> 
   * @param name name of output matrix
   * @returns output matrix
   */
  bisSimpleMatrix<float>* getSimpleMatrix(std::string name="");


  /** Import the current matrix from a  bisSimpleMatrix<float> 
   * @param sm input matrix
   * @returns 1 if success or 0 if failed
   */
  virtual int setSimpleMatrix(bisSimpleMatrix<float>* sm);

  /** Prints the current 4x4 matrix */
  virtual void printSelf();

  /** deSerialize this object to a pointer (which has been pre-allocated
   * @param  pointer place to store output from
   */
  virtual int deSerialize(unsigned char* pointer);

  /** serialze this class to a pointer (using bisSimpleMatrix<float> as intermediery) 
   * @return pointer with data
   */
  virtual unsigned char* serialize();

  
  /** serialze this class to provided pointer (using bisSimpleMatrix<float> as intermediery)
   * @param output pointer to store data in
   */
  virtual void serializeInPlace(unsigned char* output);

  /** returns size needed to serialize this object in bytes */
  virtual long getRawSize();


  // No
  virtual  int isLinear() { return 1;}

  
protected:

  /** internal storage for our 4x4 matrix */
  bisUtil::mat44 matrix;

  /** sets any 4x4 matrix to identity */
  void inPlaceIdentity(bisUtil::mat44 mat);

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisMatrixTransformation(const bisMatrixTransformation&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisMatrixTransformation&);  

};

#endif
