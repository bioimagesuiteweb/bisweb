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

#ifndef _bis_Data_Types_h
#define _bis_Data_Types_h

#include <type_traits>
#include <string>

/**
   This contains the definitions of data types and magic numbers for
   use in serialization, plus some utility functions.

   Don't change this without sync'ing JS code also
   b_types are same as NIFTI
   s_types are custom ...
*/

namespace bisDataTypes {

  /** Code for uint8 (unsigned char) image (per NIFTI definitions) */
  const int b_uint8=2;
  /** Code for int16 (short) image (per NIFTI definitions) */
  const int b_int16=4;
  /** Code for int32 (int) image (per NIFTI definitions) */
  const int b_int32=8;
  /** Code for float32 (float) image (per NIFTI definitions) */
  const int b_float32=16;
  /** Code for float64 (double) image (per NIFTI definitions) */
  const int b_float64=64;
  /** Code for int8 (char) image (per NIFTI definitions) */
  const int b_int8=256;
  /** Code for uint16 (unsigned short) image (per NIFTI definitions) */
  const int b_uint16=512;
  /** Code for uint32 (unsigned int) image (per NIFTI definitions) */
  const int b_uint32=768;


  /** Magic number of vector=20001 for serialization */
  const int s_vector=20001;
  /** Magic number of matrix=20002 for serialization */
  const int s_matrix=20002;
  /** Magic number of image=20003 for serialization */
  const int s_image=20003;
  /** Magic number of grid transform=20004 for serialization */
  const int s_gridtransform=20004;
  /** Magic number of combo transform=20005 for serialization */
  const int s_combotransform=20005;
  /** Magic number for collection object=20006 for serialization */
  const int s_collection=20006;
  /** Magic number for collection object=20006 for serialization */
  const int s_surface=20007;

  /** Return the code of a given type 
   * @param a dummy variable specificying the type
   * @returns code 
   */
  template<class T>int getTypeCode(T a );

  // Implementation: this separation makes doxygen happy
  template<class T>int getTypeCode(T ) {

    if (std::is_same<T, unsigned char>::value)
      return b_uint8;
    if (std::is_same<T, short>::value)
      return b_int16;
    if (std::is_same<T, int>::value)
      return b_int32;
    if (std::is_same<T, float>::value)
      return b_float32;
    if (std::is_same<T, double>::value)
      return b_float64;
    if (std::is_same<T,  char>::value)
      return b_int8;
    if (std::is_same<T, unsigned short>::value)
      return b_uint16;
    if (std::is_same<T, unsigned int>::value)
      return b_uint32;

    return -1;
  }
    

  /** Given the name of the type (e.g. "short" or "int16") return the type
   * @param a name of the type
   * @param defaultv value if not found 
   * @returns the type code
   */
  int getTypeCodeFromName(std::string a,int defaultv=-1);

}


// --------------------- bisTemplateMacro -------------------------------------
// This is modified from VTK!!

// The bisvtkTemplateMacro is used to centralize the set of types
// supported by Execute methods.  It also avoids duplication of long
// switch statement case lists.
//
// This version of the macro allows the template to take any number of
// arguments.  Example usage:
// switch(array->GetDataType())
//   {
//   bisvtkTemplateMacro(myFunc(static_cast<VTK_TT*>(data), arg2));
//   }
#define bisvtkTemplateMacroCase(typeN, type, call)     \
  case typeN: { typedef type BIS_TT;  call; }; break
#define bisvtkTemplateMacro(call)                                              \
  bisvtkTemplateMacroCase(bisDataTypes::b_float64, double, call);	\
  bisvtkTemplateMacroCase(bisDataTypes::b_float32, float, call);	\
  bisvtkTemplateMacroCase(bisDataTypes::b_int32, int, call);		\
  bisvtkTemplateMacroCase(bisDataTypes::b_uint32, unsigned int, call); \
  bisvtkTemplateMacroCase(bisDataTypes::b_int16, short, call);	\
  bisvtkTemplateMacroCase(bisDataTypes::b_uint16, unsigned short, call); \
  bisvtkTemplateMacroCase(bisDataTypes::b_int8, char, call);		\
  bisvtkTemplateMacroCase(bisDataTypes::b_uint8, unsigned char, call); 


#define bisvtkTemplateMacroDebug(call)                                              \
  bisvtkTemplateMacroCase(bisDataTypes::b_float64, float, call);	



#endif 


