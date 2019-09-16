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

#ifndef _bis_DataObject_h
#define _bis_DataObject_h

#include "bisObject.h"

/**
 * Root Object for serializable objects in bisWeb. Contains functionality to serialize and deserialize objects
 */
class bisDataObject : public bisObject {
  
public:

  /** Constructs object and sets the name to n
   * @param n name of object
   */
  bisDataObject(std::string n);

  /** serialze this class to a pointer (this calls getRawSize and then serializeInPlace)
   * @return pointer with data
   */
  virtual unsigned char* serialize();
  
  /** Serialize this object inside output pointer
   * @param output the memory to store the data in
   */
  virtual void serializeInPlace(unsigned char* output)=0;
  
  /** Deserializes a transformation from a serialized pointer (see bisMemoryManagement for definition)
   * @param pointer input data
   * @returns 1 if success, 0 if failed
   */
  virtual int deSerialize(unsigned char* pointer)=0;

  /** returns size needed to serialize this object in bytes */
  virtual long getRawSize()=0;

  
  
protected:


  /** Value of magic type, first component in data structure when serialized */
  int magic_type;


private:
  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisDataObject(const bisDataObject&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisDataObject&);  
};



#endif
