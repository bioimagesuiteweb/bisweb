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

#include "bisMemoryManagement.h"
#include "bisUtil.h"
#include <map>
#include <iostream>
#include <string>
#include <string.h>
#include "bisObject.h"

namespace bisMemoryManagement {

  int debug_memory=0;
  int large_memory=0;
  std::map <BISLONG, BISLONG> memory_map;
  std::map <BISLONG, std::string> memory_map_name;
  std::map <BISLONG, bisObject*> memory_map_owner;


  int debugMemory() {
    if (debug_memory>0)
      return 1;
    return 0;
  }
  
  int largeMemory() {
#ifdef BISWASM
    return 0;
#else
    if (large_memory>0)
      return 1;
    return 0;
#endif
  }

  void setDebugMemoryMode(int m) {
    debug_memory=m;
  }

  void setLargeMemoryMode(int m) {
    large_memory=m;
  }


  unsigned char* allocate_memory(BISLONG sz,std::string name,std::string operation,bisObject* owner) {

    unsigned char* out_pointer=new unsigned char[sz];

    BISLONG pt=(BISLONG)out_pointer;
    memory_map[pt]=sz;
    memory_map_name[pt]=name;
    memory_map_owner[pt]=owner;
    
    if (debugMemory())
      {
	std::cout << "*****\t (MEMORY ALLOC) " << name << " (" << operation << ") allocating =["
		  << sz << "],  (loc=" << (BISLONG)out_pointer << ") ";
	if (owner!=0)
	  std::cout << " [ " << owner->getClassName()  << ", " << BISLONG(owner) << "]" << std::endl ;
	else
	  std::cout << " [ no owner ]" << std::endl;
      }

    return out_pointer;
  }

  void release_memory(unsigned char* pointer,std::string operation) {

    BISLONG sz2=-1;
    BISLONG pt=(BISLONG)pointer;
    std::string name="unknown";
    bisObject* owner=0;
    if(memory_map.find(pt) == memory_map.end()) {
      std::cerr << "*****\t (MEMORY ERR) Memory was not allocated here ... "  << BISLONG(pointer) << std::endl;
    } else {
      sz2=memory_map[pt];
      owner=memory_map_owner[(BISLONG)pointer];
      name=memory_map_name[pt];
    }
    
    // Erase
    memory_map.erase(pt);
    memory_map_name.erase(pt);
    memory_map_owner.erase(pt);
    
    if (debugMemory())
      {
	std::cout << "*****\t (MEMORY DEL) " << name << " (" << operation << ") deleting size=["
		  << sz2 << "],  (loc=" << (BISLONG)pointer << ") ";
      	if (owner!=0)
	  std::cout << " [ " << owner->getClassName() << ", " << BISLONG(owner) << "]" << std::endl ;
	else
	  std::cout << " [ no owner ]" << std::endl;
      }
    delete [] pointer;
  }

  void not_releasing_memory(unsigned char* pointer,std::string operation,int used_to_own) {

    BISLONG sz2=-1;
    BISLONG pt=(BISLONG)pointer;
    std::string name="unknown";
    bisObject* owner=0;
    
    if(memory_map.find(pt) != memory_map.end()) {
      sz2=memory_map[pt];
      owner=memory_map_owner[(BISLONG)pointer];
      name=memory_map_name[pt];
    }

    
    if (debugMemory())
      {
	std::cout << "-----\t (MEMORY ___) " << name << " (" << operation << ") ";
	
	if (used_to_own)
	  std::cout << "(releasing)";
	else
	  std::cout << "(ignoring)";
	
	std::cout << "; size=" << sz2 << " (loc=" << (BISLONG)pointer << ") ";
	
	if (owner!=0)
	  std::cout << " [ "  << owner->getClassName() << ", " << BISLONG(owner) << "]" << std::endl ;
	else
	  std::cout << " [ no owner ]" << std::endl;
      }

   
  }

  

  void release_links(bisObject* obj) {

    std::map<BISLONG, bisObject*>::iterator it;
    
    for ( it = memory_map_owner.begin(); it != memory_map_owner.end(); it++ ) {

      if (it->second==obj)
	it->second=0;
    }
  }


    
  
  void print_map() {
    std::map<BISLONG, BISLONG>::iterator it;

    std::cout << std::endl;
    std::cout << "+++++++++++++++++++++++++++++++" << std::endl;
    std::cout << "+ Current Pointer Memory state " << std::endl;
    std::cout << "+++++++++++++++++++++++++++++++" << std::endl;

    if (memory_map.size()==0)
      {
	std::cout << "P: No raw data" << std::endl;
      }
    else
      {
        for ( it = memory_map.begin(); it != memory_map.end(); it++ )
	  {
	    std::cout << "P " << it->first  // string (key)
		      << " : " << memory_map_name[it->first] << " (" 
		      << it->second << ")";
	    
	    bisObject* owner=memory_map_owner[it->first];
	    if (owner!=0)
	      std::cout << " [ " <<  owner->getClassName()  << ", " << BISLONG(owner) << "]" << std::endl ;
	    else
	      std::cout << " [ no owner ]" << std::endl;
	    
	  }
      }
    

    bisObject::print_memory_map();
  }

  void delete_all() {
    std::map<BISLONG, BISLONG>::iterator it;

    if (memory_map.size()==0)
      {
        return;
      }

    for (int pass=0;pass<=1;pass++) {
      
      for ( it = memory_map.begin(); it != memory_map.end(); it++ )
        {
          unsigned char* pointer=(unsigned char*)it->first;
          delete [] pointer;
        }

      memory_map.clear();
      memory_map_name.clear();
      memory_map_owner.clear();
    }
    return;
  }


  void copy_memory(unsigned char* output,unsigned char* input,BISLONG length) {

    memcpy(output,input,length);
  }
}

