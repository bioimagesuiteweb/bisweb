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


#ifndef _bis_Surface_h
#define _bis_Surface_h

#include "bisDataObject.h"
#include "bisSimpleDataStructures.h"
#include <memory>
/**
 * Implements a combination of a single "initial" linear transformation and a collection of grid transformations
 * Used to store results of non linear registrations
 */

class bisSurface : public bisDataObject {
  
 public:

  /** Constructor
   * @param n used to set class name 
   */
  bisSurface(std::string n="surface");

  /** Destructor */
  virtual ~bisSurface();
  
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

  /** Get the Points
   * @returns a shared pointer to Points
   */
  std::shared_ptr<bisSimpleMatrix<float> > getPoints() { return this->points; }
  void setPoints(std::shared_ptr<bisSimpleMatrix<float> > pts) {  this->points=pts;  }

  std::shared_ptr<bisSimpleMatrix<int> > getTriangles() { return this->triangles;}
  void setTriangles(std::shared_ptr<bisSimpleMatrix<int> > tri) { this->triangles=tri;}

  std::shared_ptr<bisSimpleMatrix<float> > getPointData() { return this->pointData; }
  void setPointData(std::shared_ptr<bisSimpleMatrix<float> > pts) {  this->pointData=pts;  }
  
  std::shared_ptr<bisSimpleMatrix<float> > getTriangleData() { return this->triangleData; }
  void setTriangleData(std::shared_ptr<bisSimpleMatrix<float> > pts) {  this->triangleData=pts;  }

  /** Copy other surface */
  void copy(bisSurface* other);

  
  
protected:

  /** Initial Linear Transformation */
  std::shared_ptr<bisSimpleMatrix<float> > points;
  std::shared_ptr<bisSimpleMatrix<int> > triangles;
  std::shared_ptr<bisSimpleMatrix<float> > pointData;
  std::shared_ptr<bisSimpleMatrix<float> > triangleData;


private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisSurface(const bisSurface&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisSurface&);  
	
};

#endif
