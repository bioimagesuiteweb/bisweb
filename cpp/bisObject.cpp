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

#include "bisObject.h"
#include "bisMemoryManagement.h"
#include <iostream>
#include <list>

namespace bisObjectMemory {
  std::list<bisObject*> memory_list;
}


bisObject::bisObject(std::string n)
{
  this->name=n;
  this->class_name="bisObject";
  this->register_object_memory();
}
  
bisObject::~bisObject()
{
  this->release_object_memory();
  bisMemoryManagement::release_links(this);

}


std::string bisObject::getName() {
  return this->name;
}
 

void bisObject::register_object_memory()
{
  bisObjectMemory::memory_list.push_back(this);
    
  if (bisMemoryManagement::debugMemory())
    std::cout << "ooooo (OBJECT MEMORY ALLOC) " << this->getName() << " (loc=" << BISLONG(this) << ")" << std::endl;
}

void bisObject::release_object_memory()
{
  bisObjectMemory::memory_list.remove(this);

  if (bisMemoryManagement::debugMemory())
    {
      std::cout << "ooooo (OBJECT MEMORY DEL) " << this->getName() << " (cl="
		<< this->getClassName() << ")  (loc=" << (BISLONG)this << ") " << std::endl;
    }
}


void bisObject::print_memory_map()
{
  std::list<bisObject*>::iterator it;

  for ( it = bisObjectMemory::memory_list.begin(); it != bisObjectMemory::memory_list.end(); it++ )
    {
      bisObject* obj=*it;
      std::cout << "O " << (BISLONG)obj  // string (key)
		<< " : "
		<< obj->getName()   // string's value
		<< " (" << obj->getClassName() << ") " << std::endl;
    }
  std::cout << "+++++++++++++++++++++++++++++++" << std::endl  << std::endl;
}
