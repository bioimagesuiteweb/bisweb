/*  License
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._ It is released under the terms of the GPL v2.
 
 ----
     
   This program is free software; you can redistribute it and/or
   modify it under the terms of the GNU General Public License
   as published by the Free Software Foundation; either version 2
   of the License, or (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
   See also  http: www.gnu.org/licenses/gpl.html
   
   If this software is modified please retain this statement and add a notice
   that it had been modified (and by whom).  
 
 Endlicense */


#ifndef _bis_ImageSegmentation_Algorithms_h
#define _bis_ImageSegmentation_Algorithms_h

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
namespace bisImageSegmentationAlgorithms {

  /** create Image Histogram
   * @param input the input image
   * @param NumBins  the number of bins to use
   * @param robust if > 0 then use robust range algorithm to eliminate outliers (irony uses code that computes histogram inside this to do that!)
   * @param smoothhisto if > 0 then histogram is smoothed with a gaussian of sigma=1.0
   * @param histogram_origin on output stores the origin of the histogram (i.e. the value corresponding to the minimum bin)
   * @param histogram_spacing on output stores the spacing of the histogram (i.e. the difference in value between consecutive bins)
   * @returns the histogram as a float vector
   */
  template<class TT> std::vector<float> createHistogram(bisSimpleImage<TT>* input,int NumBins,int robust,int smoothhisto,float& histogram_origin,float& histogram_spacing);

  /** computes histogram Segmentation
   * @param input the input image
   * @param in_numclasses the number of classes 
   * @param in_maxsigmaratio the maximum ratio between minimum and maximum standard deviation (for robustness)
   * @param in_maxiterations max number of iterations
   * @param in_convergence the convergence threshold (for means)
   * @param in_usevariance if zero do old fashioned k-means with all classes having the same variance
   * @param in_numbins number of bins for the underlying histogram
   * @param robust whether to use robust range in creating the histogram
   * @param smoothhisto whether to smooth the histogram
   * @param frame the frame of the image to use if 4D or 5D
   * @param component the component of the image to use if 4D or 5D
   * @returns the 3D histogram segmented image
   */
  template<class TT> std::unique_ptr<bisSimpleImage<short> > histogramSegmentation(bisSimpleImage<TT>* input,
											   int in_numclasses,float in_maxsigmaratio=0.2,
											   int in_maxiterations=30, float in_convergence=0.5,int in_usevariance=1,
											   int in_numbins=128,int robust=1, int smoothhisto=1,
											   int frame=0,int component=0);
    


  /** computes MRF Segmentation --> this uses histogram segmentation to initialize
   * @param intensity_image the input image
   * @param label_image the input and output segmentation
   * @param smoothness  MRF weight
   * @param noise_sigma2 image noise variance
   * @param mrf_convergence_percentage -- convergence as percentage of voxels whose labels have changed
   * @param maxiter outer loop iterations (EM)
   * @param internal_iter internal loop iterations (M-step)
   * @param frame the frame of the image to use if 4D or 5D
   * @param component the component of the image to use if 4D or 5D
   * @returns the last changed percentage
   */
  template< class TT> float doMRFSegmentation(bisSimpleImage<TT>* intensity_image,
					      bisSimpleImage<short>* label_image,
					      float smoothness=1.0,
					      float noise_sigma2=0.0,
					      float mrf_convergence_percentage=0.2,
					      int maxiter=8,int internal_iter=8,
					      int frame=0,int component=0);



  /** computes MRF Segmentation-based Objectmap Regularization
   * @param label_image the input and output segmentation
   * @param smoothness  MRF weight
   * @param mrf_convergence_percentage -- convergence as percentage of voxels whose labels have changed
   * @param maxiter outer loop iterations (EM)
   * @param internal_iter internal loop iterations (M-step)
   * @returns the output image
   */
  std::unique_ptr<bisSimpleImage<short> > doObjectMapRegularization(bisSimpleImage<short>* label_image,
                                                                    float smoothness,
                                                                    float mrf_convergence_percentage,
                                                                    int maxiter,int internal_iter);
  


}



#ifndef BIS_MANUAL_INSTANTIATION
#include "bisImageSegmentationAlgorithms.txx"
#endif

  
#endif
