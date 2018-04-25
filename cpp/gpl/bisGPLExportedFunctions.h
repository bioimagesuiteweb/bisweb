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

#ifndef _bis_GPLExportedFunctions_h
#define _bis_GPLExportedFunctions_h

#include "bisDefinitions.h"


#ifdef __cplusplus
extern "C" {
#endif


  /** @namespace bisGPLExportedFunctions
      Functions exported to JS and Python. 
      See \link bisExportedFunctions.h \endlink and secondarily
      \link bisTesting.h \endlink.
  */
  
  
  /** @file bisGPLExportedFunctions.h
      Functions exported to JS and Python
  */

  /** run Linear Image Registration using \link bisLinearImageRegistration  \endlink
   * @param reference serialized reference image as unsigned char array 
   * @param target    serialized target image as unsigned char array 
   * @param initial_xform serialized initial transformation as unsigned char array 
   * @param jsonstring the parameter string for the algorithm including return_vector which if true returns a length-28 vector
   * containing the 4x4 matrix and the 12 transformation parameters
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized vector or matrix depending on the value of return_vector
   */
  // BIS: { 'runLinearRegistrationWASM', 'bisLinearTransformation', [ 'bisImage', 'bisImage', 'bisLinearTransformation_opt', 'ParamObj', 'debug' ] } 
  BISEXPORT  unsigned char*  runLinearRegistrationWASM(unsigned char* reference,
						       unsigned char* target,
						       unsigned char* initial_xform,
						       const char* jsonstring,
						       int debug);
  
  
  /** run Non Linear Image Registration using \link bisNonLinearImageRegistration  \endlink
   * @param reference serialized reference image as unsigned char array 
   * @param target    serialized target image as unsigned char array 
   * @param initial_xform serialized initial transformation as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized combo transformation (bisComboTransformation)
   */
  // BIS: { 'runNonLinearRegistrationWASM', 'bisComboTransformation', [ 'bisImage', 'bisImage', 'bisLinearTransformation_opt', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* runNonLinearRegistrationWASM(unsigned char* reference,
							unsigned char* target,
							unsigned char* initial_xform,
							const char* jsonstring,
							int debug);



  /** Approximate Displacement Field with Grid Transformation (pre initialized)
   * @param dispfield serialized target displacement field
   * @param initial_grid serialized grid transformation as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * @param debug if > 0 print debug messages
   * @returns a pointer to the updated grid (bisGridTransformation)
   */
  // BIS: { 'approximateDisplacementFieldWASM', 'bisGridTransformation', [ 'bisImage', 'bisGridTransformation', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* approximateDisplacementFieldWASM(unsigned char* dispfield,
							    unsigned char* initial_grid,
							    const char* jsonstring,
							    int debug);
  
  /** Approximate Displacement Field with Grid Transformation -- initialized using the sapcing parameter
   * @param dispfield serialized target displacement field
   * @param jsonstring the parameter string for the algorithm  -- key is spacing : --> this defines the spacing for the grid transformation
   * @param debug if > 0 print debug messages
   * @returns a pointer to the updated grid (bisGridTransformation)
   */
  // BIS: { 'approximateDisplacementFieldWASM2', 'bisGridTransformation', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* approximateDisplacementFieldWASM2(unsigned char* dispfield,
							     const char* jsonstring,
							     int debug);
  

  /** Perform image segmentation either histogram based or plus mrf segmentation if smoothness > 0.0
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "numclasses" : 3, "maxsigmaratio":0.2, "robust" : true, "numbins": 256, "smoothhisto": true, "smoothness" : 0.0, "mrfconvergence" : 0.2, "mrfiterations" : 8, "noisesigma2" : 0.0 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized segmented image 
   */
  // BIS: { 'segmentImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* segmentImageWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Perform objectmap regularization 
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "smoothness" : 2.0, "convergence" : 0.2, "terations" : 8, "internaliterations" : 4 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a (short) serialized segmented image 
   */
  // BIS: { 'regularizeObjectmapWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* regularizeObjectmapWASM(unsigned char* input,const char* jsonstring,int debug);

  
  /** Tests Optimizer with numdof = 1 or 2 and all three modes 
   * @param numdof number of degrees of freedom for simple quadratic function (1 or 2)
   * @returns number of failed tests
   */
  // BIS: { 'test_optimizer', 'Int', [ 'Int'] } 
  BISEXPORT int test_optimizer(int numdof);


  /** Compute DTI Tensor
   * @param input_ptr the images as a serialized array
   * @param baseline_ptr the "Baseline" T2 Image as a serialized array
   * @param mask_ptr the Mask Image (optional, set this to 0) as a serialized array
   * @param directions_ptr the directions matrix
   * @param jsonstring { "bvalue": 1000, "numbaseline:" 1 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the tensor image */
  // BIS: { 'computeDTITensorFitWASM', 'bisImage', [ 'bisImage', 'bisImage',  'bisImage_opt' ,'Matrix', 'ParamObj', 'debug'] } 
  BISEXPORT unsigned char* computeDTITensorFitWASM(unsigned char* input_ptr,
						   unsigned char* baseline_ptr,
						   unsigned char* mask_ptr,
						   unsigned char* directions_ptr,
						   const char* jsonstring,
						   int debug);


  /** Compute DTI Tensor EigenSystem
   * @param input_ptr the image tensor as a serialized array
   * @param mask_ptr the Mask Image (optional, set this to 0) as a serialized array
   * @param debug if > 0 print debug messages
   * @returns a pointer to the eigensystem image */
  // BIS: { 'computeTensorEigenSystemWASM', 'bisImage', [ 'bisImage', 'bisImage_opt' , 'debug'] } 
  unsigned char* computeTensorEigenSystemWASM(unsigned char* input_ptr,
					      unsigned char* mask_ptr,
					      int debug);


  /** Compute DTI Tensor Invariants
   * @param input_ptr the image tensor eigensystem as a serialized array
   * @param mask_ptr the Mask Image (optional, set this to 0) as a serialized array
   * @param jsonstring { "mode": 0 } // mode 0=FA, 1=RA etc. -- see bisDTIAlgorithms::computeTensorInvariants
   * @param debug if > 0 print debug messages
   * @returns a pointer to the invarient image */
  // BIS: { 'computeDTITensorInvariantsWASM', 'bisImage', [ 'bisImage', 'bisImage_opt' , 'ParamObj', 'debug'] } 
  BISEXPORT unsigned char* computeDTITensorInvariantsWASM(unsigned char* input_ptr,
							  unsigned char* mask_ptr,
							  const char* jsonstring,
							  int debug);

  /** Compute DTI Orientation Map
   * @param input_ptr the image tensor eigensystem as a serialized array
   * @param mask_ptr the Mask Image (optional, set this to 0) as a serialized array
   * @param magnitude_ptr the Magnitude Image (e.g. FA map) (optional, set this to 0) as a serialized array
   * @param jsonstring { "scaling": 1.0 } Optional extra scaling
   * @param debug if > 0 print debug messages
   * @returns a pointer to the colormap image */
  // BIS: { 'computeDTIColorMapImageWASM', 'bisImage', [ 'bisImage', 'bisImage_opt' ,'bisImage_opt', 'ParamObj', 'debug'] } 
  BISEXPORT unsigned char* computeDTIColorMapImageWASM(unsigned char* input_ptr,
						       unsigned char* mask_ptr,
						       unsigned char* magnitude_ptr,
						       const char* jsonstring,
						       int debug);



#ifdef __cplusplus
}
#endif

#endif
