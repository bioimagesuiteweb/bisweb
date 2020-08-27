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

  /** Is Valid Point Set 
   * @param Points  the points matrix
   * @param minrows minimum number of rows (default=2)
   * @param numcols (default=3)
   * @param debug if >0 print messages
   * @returns number of points or zero if failure
   */
  int isPointSetValid(bisSimpleMatrix<float>* Points,
                      int minrows=2,
                      int numcols=3,
                      int debug=0);

  /** Compute Points Centroid
   * @param Points the input points
   * @param centroid the centroid
   * @param debug print diagnostic messages
   * @param returns 1 if success, 0 if failure
   */
  int computeCentroid(bisSimpleMatrix<float>* Points,
                      float centroid[3],
                      int debug=0);


  /** computes squared distance between points 
   * @param x point 1
   * @param y point 2
   * @returns squared distance
   */
  float distance2(float x[3],float y[3]);
  
  /** computes mapping error i.e. | Output - Transformation(Input)|^2
   * @param Input input point set
   * @param Target target point set
   * @param Transformation the transformation to apply
   * @param debug if > 0 print diagnostics
   * @returns RMS distance
   */
  float computeMappingError(bisSimpleMatrix<float>* Input,
                            bisSimpleMatrix<float>* Target,
                            bisAbstractTransformation* Transformation,
                            int debug=0);

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
                                    bisMatrixTransformation* Output,
                                    bisSimpleVector<float>* RawWeights,
                                    int debug=0);

  /** Transform Points
   * @param Points the input points
   * @param Transformation the transformation to map points with
   * @param debug print diagnostic messages
   * @param Output the output mapped points
   */
  bisSimpleMatrix<float>* transformPoints(bisSimpleMatrix<float>* Points,
                                          bisAbstractTransformation* Transformation,
                                          int debug=0);


  // Print Utilities
  void printTwoPoints(bisSimpleMatrix<float>* pts,std::string name="Points");
  void printJointPoints(bisSimpleMatrix<float>* pts,bisSimpleMatrix<float>* pts2,bisSimpleVector<float>* wv,std::string name="map",int incr=10);
  void printTwoElements(bisSimpleVector<float>* pts,std::string name="vec");
  void printMatrix(bisMatrixTransformation* xform, std::string name="mapping");
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
