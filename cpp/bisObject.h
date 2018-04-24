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

#ifndef _bis_Object_h
#define _bis_Object_h


#include <string>

/**
 * Root Object for bisWeb. Contains functionality to link and delink to Memory database
 */
class bisObject {
  
public:

  /** get the object name -- used for memory debug purposes */
  virtual std::string getName();

  /** get the class name -- used to identify the object in  memory debug purposes and other places */
  std::string getClassName() { return this->class_name;}

  /** prints memory map for objects*/
  static void print_memory_map();
  
protected:

  /** Constructs object and sets the name to n
   * @param n name of object
   */
  bisObject(std::string n);

  /** Destructor , virtual, removes object from database*/
  virtual ~bisObject();

  /** Object Name */
  std::string name;

  /** Object Class Name */
  std::string class_name;


  /** Registers this object to the memory database (implemented privately in bisObject.cpp*/
  virtual void register_object_memory();

  /** Removes this object from the memory database (implemented privately in bisObject.cpp*/
  virtual void release_object_memory();

private:
  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisObject(const bisObject&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisObject&);  
};



#endif
