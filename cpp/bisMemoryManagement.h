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

#ifndef _bis_Memory_Management_h
#define _bis_Memory_Management_h

#include <string>

#include "bisDataTypes.h"
#include "bisObject.h"

 #ifndef BISLONG
  #ifdef BISWASM
    #define BISLONG long
  #else
    #ifdef _WINDOWS
       #define BISLONG long long
    #else
       #define BISLONG int64_t
    #endif
  #endif
#endif

// --------------------- bisMemoryManagement -------------------------------------
//
/** This code provides functionality for serializing/deserializing and manipulating
    images, matrices and vectors which are serialized from JS as unsigned char arrays
    using the following syntax:

<PRE>
  int magic_type; // 20001=vector, 20002=matrix, 20003=image (up to 5d)
  int data_type;  // defined in bisDataTypes
  int header_size; // in bytes
  int data__size; // in bytes
  unsigned char* header[header_size]; //  defined separately for vector,matrix and image
  unsigned char* data[data_size];   //  raw data of type defined by data_type --> data_size
</PRE>
*/



namespace bisMemoryManagement {

  /** Return 1 if internal_flag =1 (see bisMemoryManagement.cpp)  */
  int debugMemory();

  /** Return 1 if large_flag =1 (see bisMemoryManagement.cpp)  */
  int largeMemory();

  /**
     Set the value of the internal flag
  */
  void setDebugMemoryMode(int m);

  /**
     Set the value of the internal flag
  */
  void setLargeMemoryMode(int m);


  /** Called bis bisObject::~bisObject to eliminate links
   * @param obj calling object
   */
  void release_links(bisObject* obj);
  
  
  /**
   * Allocate memory of size sz with name=name, 
   * @param sz size in bytes
   * @param name pointer name
   * @param operation description of the operation
   * @param owner owner object for this memory
   */
  unsigned char* allocate_memory(BISLONG sz,std::string name="",std::string operation="",bisObject* owner=0);

  /**
   * Release memory at location specified by pointer
   * @param pointer location to del_ete (i.e. internally del_ete [] pointer)
   * @param operation name for debug print messages
   */
  void release_memory(unsigned char* pointer,std::string operation="");

  /**
   * Prints debug message that pointer is not being del_eted
   * @param pointer item not being del_eted
   * @param operation name for debug print messages
   * @param used_to_own diagnostic debug message flag
   */
  void not_releasing_memory(unsigned char* pointer,std::string operation="",int used_to_own=1);

  /** 
   * Print current list of allocated pointers and BisObjects
   */
  void print_map();

  /** 
   * Delete all allocated pointers and BisObjects
   */
  void delete_all();

  /** 
   * A wrapper around memcpy
   * copies length bytes from input to output
   * @param output location of output data
   * @param input location of input data
   * @param length number of bytes to copy
   */
  void copy_memory(unsigned char* output,unsigned char* input,BISLONG length);


  
}


#endif
