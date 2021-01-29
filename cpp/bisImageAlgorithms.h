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


#ifndef _bis_Image_Algorithms_h
#define _bis_Image_Algorithms_h

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
namespace bisImageAlgorithms {


  /** Check if two images have the same dimensions (i,j,k) and spacing. If checksameframescomponents=1
   * then check t and c components also
   * @param image1 the first image
   * @param image2 the second image
   * @param checksameframescomponents if 1 check all 5 dimensions else only the first three
   * @returns 1 if true,0 if false
   */
  template<class IT,class OT> int doImagesHaveSameSize(bisSimpleImage<IT>* image1,bisSimpleImage<OT>* image2,int checksameframescomponents=0);


  /** Create mask by thresholding image  at a fractional threshold (0.05 -> 5% of max)
   * @param image the input image
   * @param threshold the threshold at which to mask 
   * @param absolute if 0 then use fractional threshold (i.e. % between min and max value) else absolute
   * @param outputis100 if 1 then "in" values are set to 100 else 1
   * @returns mask image
   */
  template<class TT> bisSimpleImage<unsigned char>* createMaskImage(bisSimpleImage<TT>* image,float threshold=0.05,int absolute=0,int outputis100=0);
  
  /** thresholds an image.
   * to perform a simple threshold where the values are set to 0 if lower than 50 or higher than 100 and stay the same otherwise use
   *   thresholds={50,100}, replace={1,0}, replacevalues={0, anyvalue } where replacevalues[1] can be any value as it will not be used.
   *  to perform a threshold where the values are set to 0 if lower than 50 or higher than 100 and 1 otherwise use
   *   thresholds={50,100}, replace={1,1}, replacevalues={0, 1 } 
   * @param input the input image
   * @param thresholds the lower and upper threshold , if intensity is v then in   thresholds[0]<=v<=thresholds[1] else out
   * @param replace  whether to replace "out" values (replace[0]>0) and "in" values (replace[1]>0). If replace is zero then input value is kept
   * @param replacevalues values to replace out and in cases respectively
   * @returns thresholded image
   */
  template<class IT,class OT> std::unique_ptr<bisSimpleImage<OT> >  thresholdImage(bisSimpleImage<IT>* input,float thresholds[2],int replace[2],OT replacevalues[2]);

  /** Shifts Scales and Casts an image. Essentially out = (input+shift)*scale and then cast to desired type
   * @param input the input image
   * @param shift the shift value 
   * @param scale the scale value 
   * @returns shifted and scaled image
   */
  template<class IT,class OT> std::unique_ptr<bisSimpleImage<OT> >  shiftScaleImage(bisSimpleImage<IT>* input,double shift,double scale);

  
  /** extract single Frame and Component from Image[i][j][j][frame][component]
   * @param input the input image
   * @param frame the frame to extract
   * @param component the component to extract 
   * @returns the 3D image
   */
  template<class T> std::unique_ptr<bisSimpleImage<T> >  imageExtractFrame(bisSimpleImage<T>* input,int frame=0,int component=0);


  /** extract single 2D slice (fixed slice, frame and component from Image[i][j][j][frame][component]
   * @param input the input image
   * @param output the output image -- if this has correct spacing and dimensions it will be kept as we use bisSimpleImage::allocate
   * @param in_plane the plane, 0=YZ, 1=XZ, 2=XY plane of the image
   * @param in_slice the slice number to  extract
   * @param in_frame the frame to extract
   * @param in_component the component to extract 
   * @returns 1 if success, 0 if failed
   */
  template<class T> int imageExtractSlice(bisSimpleImage<T>* input,bisSimpleImage<T>* output,int in_plane,int in_slice,int in_frame=0,int in_component=0);

  /** Gaussian smooth image
   * @param input the input image
   * @param sigmas the standard deviations of the gaussian kernel
   * @param outsigmas the sigmas actually used (this is an output parameter)
   * @param inmm if 1 the input sigmas are in mm else in voxels
   * @param radiusfactor use to determine the size of the smoothing kernel
   * @param vtkboundary if true use normalizing kernel to handle edge if not just tile (default)
   * @returns smoothed image
   */
  template<class T> static std::unique_ptr<bisSimpleImage<T> > gaussianSmoothImage(bisSimpleImage<T>* input,float sigmas[3],
                                                                                   float outsigmas[3],int inmm=0,float radiusfactor=1.5,int vtkboundary=0);


  /** Gaussian smooth image storing in existing output
   * @param input the input image
   * @param output the output image (assumed to have same size as input)
   * @param sigmas the standard deviations of the gaussian kernel
   * @param outsigmas the sigmas actually used (this is an output parameter)
   * @param inmm if 1 the input sigmas are in mm else in voxels
   * @param radiusfactor use to determine the size of the smoothing kernel
   * @param vtkboundary if true use normalizing kernel to handle edge if not just tile (default)
   */
  template<class T> static void gaussianSmoothImage(bisSimpleImage<T>* input,bisSimpleImage<T>* output,float sigmas[3],
                                                    float outsigmas[3],int inmm=0,float radiusfactor=1.5,int vtkboundary=0);

  // ------------------------------------------------- Normalize Image ---------------------------------
  /** Compute image Gradient by gaussian gradient convolution -- this blurs the other directions in addition to computing 
   * a derivative in the current one
   * @param input the input image
   * @param output the output image (assumed to have same size as input but 3 x number of components)
   * @param sigmas the standard deviations of the gaussian kernel
   * @param outsigmas the sigmas actually used (this is an output parameter)
   * @param inmm if 1 the input sigmas are in mm else in voxels
   * @param radiusfactor use to determine the size of the smoothing kernel
   */
  template<class T> void gradientImage(bisSimpleImage<T>* input,
                                       bisSimpleImage<float>* output,float sigmas[3], float outsigmas[3],int inmm,float radiusfactor);


  // ------------------------------------------------- Normalize Image ---------------------------------
  /** Compute image Gradient by gaussian gradient convolution
   * @param input the input image
   * @param output the output image (assumed to have same size as input but 3 x number of components)
   * @param sigmas the standard deviations of the gaussian kernel
   * @param outsigmas the sigmas actually used (this is an output parameter)
   * @param inmm if 1 the input sigmas are in mm else in voxels
   * @param radiusfactor use to determine the size of the smoothing kernel
   */
  template<class T> void simpleGradientImage(bisSimpleImage<T>* input,
                                       bisSimpleImage<float>* output,float sigmas[3], float outsigmas[3],int inmm,float radiusfactor);

// ------------------------------------------------- Normalize Image ---------------------------------

  /** Estimates the intensity range of the image based on the image histogram
   * @param image the input image
   * @param perlow the percentage of the cumulative histogram at the low range 
   * @param perhigh the percentage of the cumulative histogram at the upper range 
   * @param outdata the values of the intensity corresponding to perlow and perhigh
   */
  template<class T> void imageRobustRange(bisSimpleImage<T>* image,float perlow,float perhigh,double outdata[2]);

  
  /** Normalizes the image intensity of image using robust image range saturation.
   * if value < intensity at percentage perlow then it is set to 0
   * if value > intensity at percentage perhigh then it is set to outmaxvalue
   * else linear interpolate in between
   *
   * @param input the input image
   * @param per_low the percentage of the cumulative histogram at the low range 
   * @param per_high the percentage of the cumulative histogram at the upper range 
   * @param outmaxvalue the maximum value of the output (often this is used as input o histogram operations)
   * @param outdata the intensity values at which things were saturated (from imageRobustRanage)
   * @param name the name of the output image
   * @returns a normalized image
   */
  template<class T> bisSimpleImage<short>* imageNormalize(bisSimpleImage<T>* input,float per_low,float per_high,short outmaxvalue,double outdata[2],std::string name="");

  /** Normalizes the image intensity of image using robust image range saturation using an existing output image
   * if value < intensity at percentage per_low then it is set to 0
   * if value > intensity at percentage per_high then it is set to outmaxvalue
   * else linear interpolate in between
   * @param input the input image
   * @param output the output image
   * @param per_low the percentage of the cumulative histogram at the low range 
   * @param per_high the percentage of the cumulative histogram at the upper range 
   * @param outmaxvalue the maximum value of the output (often this is used as input o histogram operations)
   * @param outdata the intensity values at which things were saturated (from imageRobustRanage)
   */
  template<class T> void imageNormalize(bisSimpleImage<T>* input,bisSimpleImage<short>* output,float per_low,float per_high,short outmaxvalue,double outdata[2]);


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
   */

  template<class T> void resliceImage(bisSimpleImage<T>* input,bisSimpleImage<T>* output,bisAbstractTransformation* xform,
				      int interpolation=1,double backgroundValue=0);


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

  
  /** Resamples an existing image 
   * @param input the input image
   * @param outspa the output image spacing
   * @param interpolation 0=NN, 3=cubic 1= linear (linear used if other value specified)
   * @param backgroundValue value to use if points fall outside the domain of the input image
   * @param xform the reslicing transformation (usually identity here if set to 0)
   * @returns the resampled image
   */
  template<class T> std::unique_ptr<bisSimpleImage<T> > resampleImage(bisSimpleImage<T>* input, float outspa[3],int interpolation=1,double backgroundValue=0.0,bisAbstractTransformation* xform=0);


  /** Prepares an image for registration by calling
   * extractFrame, smoothImage, resampleImage and normalizeImage in sequence *
   * @param input the input image
   * @param numbins the number of bins targetted (sets the maximum value of the output image to numbins*intscale-1)
   * @param normalize if set to 0 the image is not normalized
   * @param resolution_factor factor to shrink the resolution (increase the spacing) of the output image relative to the input
   * @param smoothing amount of smoothing to perform. If  < 0.0 use image resolution. Assume this is in mm
   * @param intscale used to compute the maximum value of the normalized image
   * @param frame used to specify the frame to extract for 4D input images
   * @param name is the name of the output image
   * @param debug if > 0 print debug statements
   * @returns the single frame, smoothed, resampled and normalized image
   */
  template<class T> bisSimpleImage<short>* prepareImageForRegistration(bisSimpleImage<T>* input,
                                                                       int numbins=64,int normalize=1,
                                                                       float resolution_factor=1.0,float smoothing=0.0,int intscale=10,
                                                                       int frame=0,std::string name="",
                                                                       int debug=1);



  /** Prepares an image for registration by calling
   * extractFrame, smoothImage, resampleImage and normalizeImage in sequence 
   * and tehn reslices
   * @param input the input image
   * @param reslicexform the reslicetransformation
   * @param refdim the reference dimensions
   * @param refspa the reference spacing
   * @param numbins the number of bins targetted (sets the maximum value of the output image to numbins*intscale-1)
   * @param normalize if set to 0 the image is not normalized
   * @param resolution_factor factor to shrink the resolution (increase the spacing) of the output image relative to the input
   * @param smoothing amount of smoothing to perform. If  < 0.0 use image resolution. Assume this is in mm
   * @param intscale used to compute the maximum value of the normalized image
   * @param frame used to specify the frame to extract for 4D input images
   * @param name is the name of the output image
   * @param debug if > 0 print debug statements
   * @returns the single frame, smoothed, resampled and normalized image
   */
  template<class T> bisSimpleImage<short>*  prepareAndResliceImageForRegistration(bisSimpleImage<T>* input,
                                                                                  bisAbstractTransformation* reslicexform,
                                                                                  int refdim[5],
                                                                                  float refspa[5],
                                                                                  int numbins=64,int normalize=1,
                                                                                  float smoothing=0.0,int intscale=10,
                                                                                  int frame=0,std::string name="",
                                                                                  int debug=1);

  /** Compute round trip  displacement field error
   * @param forward the forward displacement field
   * @param reverse the reverse displacement field
   * @param bounds [ imin:imax,jmin:jmax;kmin:kmax] is the region to compute
   * @param debug if > 0 print debug messages
   * @returns average displacement field within bounds */
  static inline float	computeDisplacementFieldRoundTripError(bisSimpleImage<float>* forward,bisSimpleImage<float>* reverse,int bounds[6],int debug=0);



  /** This function creates the roi mean timeseries of an input image given an roi definition image
   * @param input - the input (4D potentially image)
   * @param roi - the input ROI Definition
   * @param output - the mean timeseries (rows=frames,cols=roi)
   * @param storecentroids - if 1 add three columns with the centroid of each roi
   */
  template<class T> int computeROIMean(bisSimpleImage<T>* input,bisSimpleImage<short>* roi,Eigen::MatrixXf& output,int storecentroids=0);


  /** This functions taks an image and a threshold and divides into clusters. Output image is the cluster number
   * with additional information in the clusters vector 
   * @param input the input image
   * @param threshold the absolute value threshold at which to threshold
   * @param oneconnected if true use 6 neighbors else 26
   * @param clustersizethreshold the minimum cluster size (if 0 return all clusters)
   * @param cluster_number_output the output image with values equal to the cluster number of zero
   * @param clusters a vector storing the size of each cluster
   * @param frame the frame to use in 4D images
   * @param component the component to use in 4D/5D images
   * @returns the maximum cluster size*/
  template<class T> int createClusterNumberImage(bisSimpleImage<T>* input,
                                                 float threshold,int oneconnected,
                                                 int clustersizethreshold,
						 bisSimpleImage<short>* cluster_number_output,
						 std::vector<int>& clusters,int frame,int component);



  /** This functions taks an image and thresholds and clusters
   * @param input the input image
   * @param clustersizethreshold the minimum cluster size
   * @param threshold the absolute value threshold at which to threshold
   * @param oneconnected if true use 6 neighbors else 26
   * @param frame the frame to use in 4D images
   * @param component the component to use in 4D/5D images
   * @returns the thresholded and clustered image*/
  template<class T> std::unique_ptr<bisSimpleImage<T> > clusterFilter(bisSimpleImage<T>* input,
                                                                      int clustersizethreshold,
                                                                      float threshold,
								      int oneconnected,
								      int frame,int component);
    
  /** crop an image
   * @param input the input image
   * @param bounds an integer array[4] contain mini:maxi, minj:maxj, mink:maxk mint:maxt
   * @param incr an integer array[4] containing the increments [ di,dj,dk,dt ]
   * @returns the cropped image
   */
  template<class T> std::unique_ptr<bisSimpleImage<T> >  cropImage(bisSimpleImage<T>* input,int bounds[8],int incr[4]);

  /** flip an image
   * @param input the input image
   * @param flips an integer array[3] containing the flips [ flipi,flipj,flipk ]
   * @returns the flipped image
   */
  template<class T> std::unique_ptr<bisSimpleImage<T> >  flipImage(bisSimpleImage<T>* input,int flips[3]);

  /** blank an image -- set values outside bbox to 0
   * @param input the input image
   * @param bounds an integer array[6] contain mini:maxi, minj:maxj, mink:maxk 
   * @param outside -- value to fill outside part of the image
   * @returns the blanked image
   */
  template<class T> std::unique_ptr<bisSimpleImage<T> >  blankImage(bisSimpleImage<T>* input,int bounds[6],float outside);

  /** median normalize an image -- set values so that median = 0 and interquartile range = 1
   * @param input the input image
   * @param debug a debug flag
   * @returns the normalized image (float)
   */
  template<class T> bisSimpleImage<float>*  medianNormalizeImage(bisSimpleImage<T>* input,int debug=0);

}


#ifndef BIS_MANUAL_INSTANTIATION
#include "bisImageAlgorithms.txx"
#endif

  
#endif
