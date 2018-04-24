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

#include "bisDefinitions.h"

#ifdef __cplusplus
extern "C" {
#endif

  /** @file bisExportedFunctions2.h
      Functions exported to JS and Python 
  */

    /** AddGridTo an image using \link bisAdvancedImageAlgorithms::addGridToImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "gap" : 8, "value" 2.0 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'addGridToImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] }
  BISEXPORT unsigned char* addGridToImageWASM(unsigned char* input, const char* jsonstring,int debug);

  /** Project a 3D image to 2D either mip or average or shaded average
   * @param input serialized input as unsigned char array 
   * @param funcinput serialized functional input (optional) as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "domip" : 1: ,"axis" : -1, "flip" : 0, "sigma" : 1.0: 'threshold' : 0.05, 'gradsigma' : 1.0, 'windowsize': 5 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'projectImageWASM', 'bisImage', [ 'bisImage', 'bisImage_opt', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  projectImageWASM(unsigned char* input,unsigned char* functional_input,const char* jsonstring,int debug);

  /** Back Projects a 2D image to a 3D image
   * @param input serialized input as unsigned char array   (3D image)
   * @param input2d serialized input as unsigned char array  (2D image)
   * @param jsonstring the parameter string for the algorithm 
   * { "axis" : -1, "flip" : 0,  'threshold' : 0.05,  'windowsize': 5 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'backProjectImageWASM', 'bisImage', [ 'bisImage', 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  backProjectImageWASM(unsigned char* input,unsigned char* input2d,const char* jsonstring,int debug);


  

#ifdef __cplusplus
}
#endif
