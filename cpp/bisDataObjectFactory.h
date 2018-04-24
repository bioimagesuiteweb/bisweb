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


#ifndef _bis_DataObject_Factory_h
#define _bis_DataObject_Factory_h

#include "bisAbstractTransformation.h"


/** Contains functions to create data objects from a serialized pointer */

namespace bisDataObjectFactory {

  /** Create a derived class of  bisAbstractTransformation  from a serialized unsigned char pointer 
   * @name pointer the raw serialized pointer
   * @name name the name of the output transformation
   * @returns the output transformation or 0 if failed		      
   */
  std::shared_ptr<bisAbstractTransformation> deserializeTransformation(unsigned char* pointer,std::string name="xform_from_pointer");

  /** Create a derived class of  bisDataObject  from a serialized unsigned char pointer 
   * @name pointer the raw serialized pointer
   * @name name the name of the output object
   * @returns the output object or 0 if failed		      
   */
  std::shared_ptr<bisDataObject> deserializeObject(unsigned char* pointer,std::string name="obj_from_pointer");
}
  
#endif
