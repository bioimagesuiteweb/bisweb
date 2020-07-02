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


#ifndef _bis_Image_Reslice_h
#define _bis_Image_Reslice_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisAbstractTransformation.h"
#include "bisUtil.h"
#include "bisEigenUtil.h"
#include "math.h"
#include <vector>

/**
 * Templated functions for multithreaded image reslice
 */


namespace bisImageAlgorithms {
// ------------------------------------------------- Resample/Reslice ---------------------------------

  /** Performs linear interpolation (needed by reslicing operations)
   * @param data the raw image data vector
   * @param TX the location in voxels
   * @param minusdim the dimensions of the underlying image - 1 
   * @param dim0 the width of the underlying image (i.e. dimensions[0])
   * @param slicesize dimensions[0]*dimensions[1] of underlying image
   * @param offset offset to add to calculated index -- used for interpolating 4D images at other frames
   * @returns the interpolated value as a double
   */
  template<class T> double linearInterpolationFunction(T* data,float TX[3],int minusdim[3],int dim0,int slicesize,int offset=0);
  
  /** Performs nearest neigbour interpolation (needed by reslicing operations)
   * @param data the raw image data vector
   * @param TX the location in voxels
   * @param minusdim the dimensions of the underlying image - 1 
   * @param dim0 the width of the underlying image (i.e. dimensions[0])
   * @param slicesize dimensions[0]*dimensions[1] of underlying image
   * @param offset offset to add to calculated index -- used for interpolating 4D images at other frames
   * @returns the interpolated value as a double
   */
  template<class T>  double nearestInterpolationFunction(T* data,float TX[3],int minusdim[3],int dim0,int slicesize,int offset=0);
  
  /** Performs cubic interpolation (needed by reslicing operations)
   * @param data the raw image data vector
   * @param TX the location in voxels
   * @param minusdim the dimensions of the underlying image - 1 
   * @param dim0 the width of the underlying image (i.e. dimensions[0])
   * @param slicesize dimensions[0]*dimensions[1] of underlying image
   * @param offset offset to add to calculated index -- used for interpolating 4D images at other frames
   * @returns the interpolated value as a double
   */
  template<class T>  double cubicInterpolationFunction(T* data,float TX[3],int minusdim[3],int dim0,int slicesize,int offset=0);


  /** Reslices an image given a transformation
   * @param input the input image
   * @param output the output image
   * @param xform the reslicing transformation
   * @param interpolation 0=NN, 3=cubic 1= linear (linear used if other value specified)
   * @param backgroundValue value to use if points fall outside the domain of the input image
   * @param numthreads number of threads to use (default=4)
   */

  template<class T> void resliceImage(bisSimpleImage<T>* input,bisSimpleImage<T>* output,bisAbstractTransformation* xform,
                                      int interpolation=1,double backgroundValue=0,int numthreads=4,int debug=0);


  /** Reslices part of a 2D image given a transformation and bounds. This is called from resliceImageWithBounds if image is 2D.
   * @param input the input image (assumed to be 2D, only first slice is done).
   * @param output the output image
   * @param xform the reslicing transformation
   * @param bounds the region of the output image [xmin:xmax,ymin:ymax:zmin:zmax] to fill in, rest is ignored (zmin,zmax ignored)
   * @param interpolation 0=NN, 3=cubic 1= linear (linear used if other value specified)
   * @param backgroundValue value to use if points fall outside the domain of the input image
   */
  template<class T> void resliceImageWithBounds2D(bisSimpleImage<T>* input,bisSimpleImage<T>* output,bisAbstractTransformation* xform,
						  int bounds[6],int interpolation=1,double backgroundValue=0.0);

  /** Reslices part of an image given a transformation and bounds. Calls resliceImageWithBounds2D if the image is 2D.
   * @param input the input image
   * @param output the output image
   * @param xform the reslicing transformation
   * @param bounds the region of the output image [xmin:xmax,ymin:ymax:zmin:zmax] to fill in, rest is ignored
   * @param interpolation 0=NN, 3=cubic 1= linear (linear used if other value specified)
   * @param backgroundValue value to use if points fall outside the domain of the input image
   */
  template<class T> void resliceImageWithBounds(bisSimpleImage<T>* input,bisSimpleImage<T>* output,bisAbstractTransformation* xform,
						int bounds[6],int interpolation=1,double backgroundValue=0.0);

}

#ifndef BIS_MANUAL_INSTANTIATION
#include "bisImageReslice.txx"
#endif


#endif /* _bis_Image_Reslice_h */
