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


#ifndef _bis_IndivParcellation_h
#define _bis_IndivParcellation_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisDefinitions.h"
#include "bisUtil.h"
#include "math.h"
#include <vector>


namespace bisIndividualizedParcellation {
  int runIndividualizedParcellation(bisSimpleImage<float>* FMRIImage, bisSimpleImage<short>* groupparcelllation, bisSimpleImage<short>* indiv,
                                    int numexemplars=268);
}


#ifdef __cplusplus
extern "C" {
#endif

  /** @file bisExportedFunctions3.h
      Functions exported to JS and Python 
  */

    /** Individualizes a group parcellation using a new 4D fmri Image
   * @param input serialized 4D input file as unsigned char array 
   * @param groupparcellation serialized input (group) parcellation as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "numberorexemplars" : 268, "smooth" : 4}
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'individualizeParcellationWASM', 'bisImage', [ 'bisImage', 'bisImage', 'ParamObj', 'debug' ] }
  BISEXPORT unsigned char* individualizeParcellationWASM(unsigned char* input, unsigned char* groupparcellation,const char* jsonstring,int debug);


#ifdef __cplusplus
}
#endif


#endif
