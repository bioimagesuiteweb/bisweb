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


#ifndef _bis_DTI_Algorithms_h
#define _bis_DTI_Algorithms_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisEigenUtil.h"
#include "bisUtil.h"
#include "math.h"



/**
 * DTI Processing Algorithms
 */
namespace bisDTIAlgorithms {


  /** Computes the tensor fit
   * @param input the input 4D image of all the acquisitions
   * @param t2image the input baseline T2 image
   * @param mask the input mask image (can be NULL,0)
   * @param directions the matrix with directions
   * @param bvalue the bvalue
   * @param output the output tensor
   * @return 1 if pass, 0 if failed
   */
  int computeTensorFit(bisSimpleImage<short>* input,
		       bisSimpleImage<short>* t2image,
		       bisSimpleImage<unsigned char>* mask,
		       Eigen::MatrixXf& directions,
		       float bvalue,
		       bisSimpleImage<float>* output);

  /** Computes Eigenvalues and Eigenvector as a single image of 4 components x 3 frames
   * component 0 = eigenvalues
   * components 1-3 eigenvectors
   * frames are x,y,z
   * @param tensor the input dti tensor (from computeTensorFit)
   * @param mask the input mask image (can be NULL,0)
   * @param eigenSystem the output images as defined above
   * @returns 1 if success, 0 if failed */
  int computeTensorEigenSystem(bisSimpleImage<float>* tensor,
			       bisSimpleImage<unsigned char>* mask,
			       bisSimpleImage<float>* eigenSystem);


  /** Compute Tensor Invariants
   * @param eigenSystem the input eigenSystem as output from computeTensorEigenSystem
   * @param mask the input mask image (can be NULL,0)
   * @param mode 0=FA, 1=RA, 2= VolRatio, 3=MD, 4=SK, 5=All (5 component output)
   * @param output the output image
   * @returns 1 if success, 0 if failed */
  int computeTensorInvariants(bisSimpleImage<float>* eigenSystem,
			      bisSimpleImage<unsigned char>* mask,
			      int mode,
			      bisSimpleImage<float>* output);


  /** Compute Orientation Map based on principal eigenvector
   * @param eigenSystem the input eigenSystem as output from computeTensorEigenSystem
   * @param mask the input mask image (can be NULL,0)
   * @param magnitude the weight image (e.g. FA map)
   * @param scaling extra scale factor
   * @param outputImage the output 3 component color image
   * @returns 1 if success, 0 if failed.
   */
  int computeTensorColormap(bisSimpleImage<float>* eigenSystem,
			    bisSimpleImage<unsigned char>* mask,
			    bisSimpleImage<float>* magnitude,
			    float scaling,
			    bisSimpleImage<unsigned char>* outputImage);

}



  
#endif
