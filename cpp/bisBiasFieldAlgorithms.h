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


#ifndef _bis_BiasField_Algorithms_h
#define _bis_BiasField_Algorithms_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisImageAlgorithms.h"
#include "bisUtil.h"
#include "math.h"
#include <vector>


/**
 * Mostly Templated functions for implementing biasFieldCorrection
 * Bias field is an image where correction OUT = 100.0*INPUT/BIAS
 * i.e. identity values=100.0 (this makes it easier to see)
 */
namespace bisBiasFieldAlgorithms {

  /** compute slice inhomogeneity
   * @param input the input image
   * @param in_axis the axis along which to correct (2=Z,1=Y,0=X)
   * @param in_threshold  the fractional threshold to ignore noise
   * @returns the 3D bias field image (always float)
   */
  template<class TT> bisSimpleImage<float>* computeSliceBiasField(bisSimpleImage<TT>* input,int in_axis=2,float in_threshold=0.05);


  /** compute tripleslice inhomogeneity. Class computeSliceBiasField three times and combines result
   * @param input the input image
   * @param threshold  the fractional threshold to ignore noise
   * @returns the 3D bias field image (always float)
   */
  template<class TT> bisSimpleImage<float>* computeTripleSliceBiasField(bisSimpleImage<TT>* input,float threshold=0.05);
  
  /** Perform bias Field correction
   * @param input the input image of type TT
   * @param biasField the bias field image
   * @returns a correct float image.
   */
  template<class TT> bisSimpleImage<float>* biasFieldCorrection(bisSimpleImage<TT>* input,bisSimpleImage<float>* biasField);
}



#ifndef BIS_MANUAL_INSTANTIATION
#include "bisBiasFieldAlgorithms.txx"
#endif

  
#endif
