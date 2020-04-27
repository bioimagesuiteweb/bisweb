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


#ifndef _bis_SimpleImageSegmentation_Algorithms_h
#define _bis_SimpleImageSegmentation_Algorithms_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisImageAlgorithms.h"
#include "bisUtil.h"
#include "math.h"
#include <vector>


/**
 * Mostly Templated functions for implementing intensity based
 * image segmentation algorithms. Basically ports of old
 * BioImage Suite Histogram Segmentation, MRF Segmentation and
 * Objectmap Regularizer
 */
namespace bisSimpleImageSegmentationAlgorithms {

    /** computes binary morphology operations
   * @param label_image the input and output segmentation
   * @param mode (0=dilate,1=erode,2=median)
   * @param radius the kernel radius
   * @param do3d if >0 work in 3d
   * @return the output image
   */
  bisSimpleImage<unsigned char>* doBinaryMorphology(bisSimpleImage<unsigned char>* label_image,int mode=2,int radius=2,int do3d=1);

/**
 * Perform simple sed conectivity on an image
 * @param input the input image
 * @param seed the coordinates of the seed to start connectivity from
 * @param oneconnected if 1 use oneconnected morphology else also use diagonals
 * @return the output image
 */

  
  bisSimpleImage<unsigned char>* seedConnectivityAlgorithm(bisSimpleImage<unsigned char>* input,int seed[3],int oneconnected=1);



}





  
#endif
