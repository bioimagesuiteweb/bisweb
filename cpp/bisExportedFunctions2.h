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
   * @param functional_input serialized functional input (optional) as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "domip" : 1: ,"axis" : -1, "flip" : 0, "sigma" : 1.0: 'threshold' : 0.05, 'gradsigma' : 1.0, 'windowsize': 5 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'projectImageWASM', 'bisImage', [ 'bisImage', 'bisImage_opt', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  projectImageWASM(unsigned char* input,unsigned char* functional_input,const char* jsonstring,int debug);

  /** Projects and averages a 3D image (inside a mask) to 2D 
   * @param input serialized input as unsigned char array 
   * @param functional_input serialized functional input (optional) as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "axis" : -1, 'lps' : 1 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'projectAverageImageWASM', 'bisImage', [ 'bisImage', 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  projectAverageImageWASM(unsigned char* input,unsigned char* mask_input,const char* jsonstring,int debug);

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


  /** creates a set of corresponding 2D points as a result of  2d->3d back projection --> transformation -> 3D->2D projection
   * @param input serialized 3D input as unsigned char array   (3D image)
   * @param xform  the transformation from reference to last 3D image (angio)
   * @param xform2  the second transformation from Projected 2D to 2D image 
   * @param jsonstring the parameter string for the algorithm 
   * { "axis" : -1, "flip" : 0,  'flipy' : 0, 'threshold' : 0.05,  'depth': 2, '2dheight': 256, '2dspacing' : 0.1 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'computeBackProjectAndProjectPointPairsWASM', 'Matrix', [ 'bisImage', 'bisTransformation','bisTransformation',  'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  computeBackProjectAndProjectPointPairsWASM(unsigned char* input,
                                                                       unsigned char* xform,unsigned char* xform2,const char* jsonstring,int debug);


  
  /** Uses the corresponding 2D points to reslice an image to common space
   * @param tef the reference image   (2D image)
   * @param input the input image   (2D+t image)
   * @param matrix  output of computeBackProjectAndProjectPointPairsWASM
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'projectMapImageWASM', 'bisImage', [ 'bisImage', 'bisImage','Matrix', 'debug' ] } 
  BISEXPORT unsigned char*  projectMapImageWASM(unsigned char* ref,unsigned char* image,unsigned char* matrix,int debug);


  

#ifdef __cplusplus
}
#endif
