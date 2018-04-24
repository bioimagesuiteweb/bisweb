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


#ifndef _bis_Definitions_h
#define _bis_Definitions_h

/** BISEXPORT is for DLL exports or emscripten keep 
 * WIN32 --     BISEXPORT = __declspec(dllexport)
 * or
 * EMSCRIPTEN -- BISEXPORT =  __attribute__((used))
*/

#ifdef BISWASM
  #define BISEXPORT  __attribute__((used))
#else
  #ifdef _WIN32
    #include <windows.h>
    #define BISEXPORT __declspec(dllexport)
  #else
     #define BISEXPORT
  #endif
#endif

#endif // _bis_Definitions_h
