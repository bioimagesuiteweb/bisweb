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

// This derives from Javid's code
// ...

//#include "../src/debugtrace.h"  /* 26 Jan 2001 addition */

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisDefinitions.h"

#include "math.h"
#include <vector>

/** @file bisAfniUtils.h

    Attemps to access afni functionality

*/

#ifndef _bis_AFNI_h
#define _bis_AFNI_h


extern "C" {

  /** Smooth image using afni code
   * @param input serialized input as unsigned char array 
   * @param mask serialized input as unsigned char array  (optional)
   * @param jsonstring the parameter string for the algorithm { "sigma" : 1.0, "usemask" :  true },
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'afniBlurImageWASM', 'bisImage', [ 'bisImage', 'bisImage_opt', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  afniBlurImageWASM(unsigned char* input,unsigned char* mask,const char* jsonstring,int debug);

  
}


#endif
