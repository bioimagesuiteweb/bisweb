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


#ifndef _bis_Advanced_Image_Algorithms_h
#define _bis_Advanced_Image_Algorithms_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisAbstractTransformation.h"
#include "bisUtil.h"
#include "bisEigenUtil.h"
#include "math.h"
#include <vector>


/**
 * Mostly Templated functions for implementing various core image processing routines
 */
namespace bisAdvancedImageAlgorithms {

  /** compute MIP or shading-color 2d projection of an image
   * @param input the input image
   * @param domip - if >0 use mip else use 2d-integration
   * @param axis - the axis to integrate/project along
   * @param flip - if true integrate from 0 -> maxdim instead of maxdim->0
   * @param lps - if true y-axis needs to be flipped ....
   * @param sigma - the smoothing to use on the image
   * @param threshold - the threshold for 2d integration
   * @param gradsigma - how much to smooth for gradient computation (if 0 then no shading is applied)
   * @param windowsize - how many voxels to average
   * @param debug - turn print messages on/off
   * @returns the projected image
   */
  template<class T> bisSimpleImage<T>* projectImage(bisSimpleImage<T>* input,
                                                                      int domip=0,int axis=-1,int flip=0,int lps=0,float sigma=1.0,
                                                    float threshold=0.05,float gradsigma=1.0,int windowsize=3,int debug=0);

   /** create and add a grid overlay on an image
   * @param input the input image
   * @param gap - the number of voxels between each grid line
   * @param value - the fractional intensity of the lines (1.0=same as max intensity of the image)
   * @returns the projected image
   */
  template<class T> bisSimpleImage<unsigned char>*  addGridToImage(bisSimpleImage<T>* input,int gap=8,float value=1.0);

    /** compute 2d->3d back projection
   * @param threed_input the 3d input image
   * @param twod_input the 2d input image
   * @param axis - the axis to integrate/project along
   * @param flip - if true integrate from 0 -> maxdim instead of maxdim->0
   * @param threshold - the threshold for 2d integration
   * @param windowsize - how many voxels to smear to
   * @returns the back-projected image
   */
  template<class T> bisSimpleImage<T>* backProjectImage(bisSimpleImage<T>* threed_input,
                                                        bisSimpleImage<T>* twod_input,
                                                        int axis,int flip,
                                                        float threshold,int windowsize);
  

  /** compute  shading-color 2d projection of an image (possibly) functional image with a mask to specify boundaries
   * @param input - the input image
   * @param mask - the mask image
   * @param output - the output image
   * @param axis - the axis to integrate/project along
   * @param flip - if true integrate from 0 -> maxdim instead of maxdim->0
   * @param lps - if true y-axis needs to be flipped ....
   * @param gradsigma - how much to smooth for gradient computation (if 0 then no shading is applied)
   * @param windowsize - how many voxels to average
   * @returns the projected image
   */
  template<class T> int projectImageWithMask(bisSimpleImage<T>* input,
                                             bisSimpleImage<T>* mask,
                                             bisSimpleImage<float>* output,
                                             int axis=-1,int flip=0,int lps=0,
                                             float gradsigma=1.0,int windowsize=3);

  /** creates a set of corresponding 2D points as a result of  2d->3d back projection --> transformation -> 3D->2D projection
   * @param 3d_reference the 3d reference input image (atlas)
   * @param transformation the mapping from 3D atlas space to 3D target space
   * @param point_pairs an Nx4 matrix containing the 2D point pairs
   * @param twod_input the 2d input image
   * @param axis - the axis to integrate/project along
   * @param flipsecond - flip secondaxis
   * @param flipthird - flip thirdaxis
   * @param threshold - the threshold for 2d integration
   * @param depth - the offset from the surface to use
   * @param height2d - the flip axis dimension for the optical image
   * @param spacing2d - the flip axis spacing for the optical image
   * @param debug - turn print messages on/off
   * @returns number of points sampled
   */
  int computeBackProjectAndProjectPointPairs(bisSimpleImage<float>* threed_reference,
                                             bisAbstractTransformation* transformation,
                                             bisAbstractTransformation* second_transformation,
                                             bisSimpleMatrix<float>* point_pairs,
                                             int axis=2,int flipthird=0,int flipsecond=0,
                                             float threshold=0.5,int depth=0.0,int height2d=100,float spacing2d=0.1,int debug=0);

    /** creates a set of corresponding 2D points as a result of  2d->3d back projection --> transformation -> 3D->2D projection
   * @param threed_reference the 3d reference input image (atlas)
   * @param optical_input the 2d optical input image (atlas)
   * @param point_pairs an Nx4 matrix containing the 2D point pairs
   * @param debug - if > 0 print diagnostics
   * @returns reslice image
   */
  std::unique_ptr<bisSimpleImage<float> > projectMapImage(bisSimpleImage<float>* threed_reference,
                                                          bisSimpleImage<float>* optical_input,
                                                          bisSimpleMatrix<float>* point_pairs,
                                                          int debug=0);



    /** compute  unshaded average projection of 3D image to a 2d image by averaging inside a mask
   * @param input - the input image
   * @param mask - the mask image
   * @param output - the output image
   * @param axis - the axis to integrate/project along
   * @param lps - if true y-axis needs to be flipped ....
   * @returns the projected image
   */
  template<class T> int projectAverageImageWithMask(bisSimpleImage<T>* input,
                                                    bisSimpleImage<T>* mask,
                                                    bisSimpleImage<float>* output,
                                                    int axis=-1,int lps=0);

}


#ifndef BIS_MANUAL_INSTANTIATION
#include "bisAdvancedImageAlgorithms.txx"
#endif

  
#endif
