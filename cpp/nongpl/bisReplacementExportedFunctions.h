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


#ifndef _bis_ReplacementExportedFunctions_h
#define _bis_ReplacementExportedFunctions_h

#include "bisDefinitions.h"

#ifdef __cplusplus
extern "C" {
#endif


  /** @namespace bisReplacementExportedFunctions
      These are dummy functions for now.
  */
  
  
  /** @file bisReplacementExportedFunctions.h */

  /** Stub Function */
  // BIS: { 'runLinearRegistrationWASM', 'bisLinearTransformation', [ 'bisImage', 'bisImage', 'bisLinearTransformation_opt', 'ParamObj', 'debug' ] } 
  BISEXPORT  unsigned char*  runLinearRegistrationWASM(unsigned char* reference,
						       unsigned char* target,
						       unsigned char* initial_xform,
						       const char* jsonstring,
						       int debug);
  
  /** Stub Function */
  // BIS: { 'runNonLinearRegistrationWASM', 'bisComboTransformation', [ 'bisImage', 'bisImage', 'bisLinearTransformation_opt', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* runNonLinearRegistrationWASM(unsigned char* reference,
							unsigned char* target,
							unsigned char* initial_xform,
							const char* jsonstring,
							int debug);
  /** Stub Function */
  // BIS: { 'approximateDisplacementFieldWASM', 'bisGridTransformation', [ 'bisImage', 'bisGridTransformation', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* approximateDisplacementFieldWASM(unsigned char* dispfield,
							    unsigned char* initial_grid,
							    const char* jsonstring,
							    int debug);

  /** Stub Function */
  // BIS: { 'approximateDisplacementFieldWASM2', 'bisGridTransformation', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* approximateDisplacementFieldWASM2(unsigned char* dispfield,
							     const char* jsonstring,
							     int debug);

  /** Stub Function */
  // BIS: { 'segmentImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* segmentImageWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Stub Function */
  // BIS: { 'regularizeObjectmapWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* regularizeObjectmapWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Stub Function */
  // BIS: { 'test_optimizer', 'Int', [ 'Int'] } 
  BISEXPORT int test_optimizer(int numdof);


#ifdef __cplusplus
}
#endif

#endif
