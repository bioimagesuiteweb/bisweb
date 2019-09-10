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


#ifndef _bis_TransformationCollection_h
#define _bis_TransformationCollection_h

#include "bisAbstractTransformation.h"
#include <vector>
#include <memory>
/**
 * Implements a combination of a single "initial" linear transformation and a collection of grid transformations
 * Used to store results of non linear registrations
 */

class bisTransformationCollection : public bisAbstractTransformation {
  
 public:

  /** Constructor
   * @param n used to set class name 
   */
  bisTransformationCollection(std::string n="collection");

  /** Destructor */
  virtual ~bisTransformationCollection();

    /** Transform point x to y 
   * @param x input point
   * @param y output point
   */
  virtual void transformPoint(float x[3],float y[3]);

    /** Sets the transformation to identity */
  virtual void identity();

  /** Get Number Of Grid Transformations */
  int getNumberOfTransformations();

  /** Get an transformation
   * @param index index of transformation to get
   * @returns a shared pointer to this->transformation[index]
   */
  std::shared_ptr<bisAbstractTransformation> getTransformation(int index);

  /** adds an transformation the list
   * @param additional transformation to add
   */
  void addTransformation(std::shared_ptr<bisAbstractTransformation> additional);


  /** deSerialize this object to a pointer (which has been pre-allocated).
   * Afte parsing the header it deserializes each component transformation in sequence.
   * @param  pointer place to store output from
   */
  virtual int deSerialize(unsigned char* pointer);
  
  /** serialze this class to provided pointer. After a short header, it serializes
   * all components one by one.
   * @param output pointer to store data in
   */
  virtual void serializeInPlace(unsigned char* output);

  /** returns size needed to serialize this object in bytes */
  virtual long getRawSize();

  // No
  virtual  int isLinear() { return 0;}


protected:

  /** List of Transformations */
  std::vector<std::shared_ptr<bisAbstractTransformation> > transformations;
    

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisTransformationCollection(const bisTransformationCollection&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisTransformationCollection&);  
	
};

#endif
