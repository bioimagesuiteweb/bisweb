/*  LICENSE=
 
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
#include "bisSimpleDataStructures.h"
#include "bisDefinitions.h"

#include "math.h"
#include <vector>

/** @file bisAFNIExportedFunctions.h

    Functions that access AFNI Functionality

*/

#ifndef _bis_AFNIExportedFunctions_h
#define _bis_AFNIExportedFunctions_h


extern "C" {

  /** Smooth image using afni code
   * @param input serialized input as unsigned char array 
   * @param mask serialized input as unsigned char array  (optional) -- must have same spatial dimensions and orientation as input
   * @param jsonstring the parameter string for the algorithm { "sigma" : 1.0, "usemask" :  true },
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'afniBlurFloatImageWASM', 'bisImage', [ 'bisImage', 'bisImage_opt', 'ParamObj', 'debug' ], {"checkorientation" : "all"} }
  BISEXPORT unsigned char*  afniBlurFloatImageWASM(unsigned char* input,unsigned char* mask,const char* jsonstring,int debug);

  /** Smooth image using afni code -- templated version (uses float if input is neither float nor double)
   * @param input serialized input as unsigned char array 
   * @param mask serialized input as unsigned char array  (optional) -- must have same spatial dimensions and orientation as input
   * @param jsonstring the parameter string for the algorithm { "sigma" : 1.0, "usemask" :  true },
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'afniBlurImageWASM', 'bisImage', [ 'bisImage', 'bisImage_opt', 'ParamObj', 'debug' ], {"checkorientation" : "all"} }
  BISEXPORT unsigned char*  afniBlurImageWASM(unsigned char* input,unsigned char* mask,const char* jsonstring,int debug);
  
}


#endif
