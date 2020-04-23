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

#ifndef _bis_pointRegistrationUtils_h
#define _bis_pointRegistrationUtils_h


#include "bisDefinitions.h"
#include "bisSimpleDataStructures.h"
#include "bisMatrixTransformation.h"

namespace bisPointRegistrationUtils {

  /** Computes best fit Landmark Transformation (see VTK/VTKLandmarkTransform.cxx) given two sets of points
   * @param RawSourceLandmarks the source points (Nx3)
   * @param RawTargetLandmarks the target points (Nx3)
   * @param mode 0=rigid,1=similarity,2=affine
   * @param Output the output Matrix Transformation
   * @return 1 if success 0 if failed
   */
  int computeLandmarkTransformation(bisSimpleMatrix<float>* RawSourceLandmarks,
                                    bisSimpleMatrix<float>* RawTargetLandmarks,
                                    int mode,
                                    bisMatrixTransformation* Output);

}

extern "C" {
  /** Computes best fit Landmark Transformation (see VTK/VTKLandmarkTransform.cxx) given two sets of points
   * @param RawSourceLandmarks the source points (Nx3)
   * @param RawTargetLandmarks the target points (Nx3)
   * @param jsonstring { mode 0=rigid,1=similarity,2=affine }
   * @param Output the output Matrix Transformation
   */
  // BIS: { 'computeLandmarkTransformWASM', 'bisLinearTransformation', [ 'Matrix', 'Matrix', 'ParamObj', 'debug' ] }
  BISEXPORT unsigned char* computeLandmarkTransformWASM(unsigned char* source, unsigned char* target,const char* jsonstring,int debug);

  
/** Test Point Locator
 * @param RawPoints the source points (Nx3)
 * @param paramobj { mode 0=nearest,1=threshold, threshold = 5.0, x,y,z = point }
 * @param Output the output points
 */
// BIS: { 'testPointLocatorWASM', 'Matrix', [ 'Matrix', 'ParamObj', 'debug' ] }
  BISEXPORT unsigned char* testPointLocatorWASM(unsigned char* source_ptr,const char* jsonstring,int debug);
}

#endif
