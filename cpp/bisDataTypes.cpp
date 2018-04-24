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



#include "bisDataTypes.h"


namespace bisDataTypes {

  int getTypeCodeFromName(std::string a,int defaultv) {

    if (a=="")
      return defaultv;
    
    if (a=="uint8" || a=="uchar")
      return b_uint8;
    if (a=="int16" || a=="short")
      return b_int16;
    if (a=="int32" || a=="int")
      return b_int32;
    if (a=="float")
      return b_float32;
    if (a=="double")
      return b_float64;
    if (a=="uchar" || a=="uint8")
      return b_int8;
    if (a=="ushort" || a=="uint16")
      return b_uint16;
    if (a=="uint32" || a=="uint")
      return b_uint32;
    
    return defaultv;
   }


}




