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

#ifndef _bis_ExportedFunctions_h
#define _bis_ExportedFunctions_h

#include "bisDefinitions.h"


#ifdef __cplusplus
extern "C" {
#endif


  /** @namespace bisExportedFunctions
      Functions exported to JS and Python. 
      See \link bisExportedFunctions.h \endlink and secondarily
      \link bisTesting.h \endlink.
  */
  
  
  /** @file bisExportedFunctions.h
      Functions exported to JS and Python
  */
  
  // -----------------------------------
  // Memory Management
  // -----------------------------------
  /** 
   *  Set Debugging mode for memory operations
   * @param m if > 0 set to debug to on
   */
  BISEXPORT void set_debug_memory_mode(int m);

  /** 
   *  Set Large memory mode for python/matlab
   * @param m if > 0 set to debug to on
   */
  BISEXPORT void set_large_memory_mode(int m);

  /** print current state of allocated objects */
  BISEXPORT void print_memory();

  /** delete all allocated objects (allocate via bisMemoryManagement) */
  BISEXPORT void delete_all_memory();

  /** Called from JS code to del_ete a pointer 
   * @param ptr the pointer to del_ete
   */
  BISEXPORT int jsdel_array(unsigned char* ptr);
  
  
  /** Called from JS code to allocate an array
   * @param sz the size of the array in bytes
   * @returns the pointer to the allocated data
   */
  BISEXPORT unsigned char* allocate_js_array(int sz);

// -----------------------------------
// Get Object Magic Codes
// -----------------------------------
  /** @returns Magic Code for Serialized Vector */
  BISEXPORT int getVectorMagicCode();

  /** @returns Magic Code for Serialized Matrix */
  BISEXPORT int getMatrixMagicCode();

  /** @returns Magic Code for Serialized Image */
  BISEXPORT int getImageMagicCode();

  /** @returns Magic Code for Serialized GridTransform */
  BISEXPORT int getGridTransformMagicCode();

  /** @returns Magic Code for Serialized Combo Transform */
  BISEXPORT int getComboTransformMagicCode();

  /** @returns Magic Code for Serialized Object Collection */
  BISEXPORT int getCollectionMagicCode();

  /** @returns Magic Code for Serialized Object Collection */
  BISEXPORT int getSurfaceMagicCode();

  // -----------------------------------
  // Functions
  // -----------------------------------
  /** return a matlab matrix from a serialized .mat V6 file packed into an unsigned char serialized array
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for this algorithm { 'name' :  ""} specifies the matrix name
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized matrix 
   */
  // BIS: { 'parseMatlabV6WASM', 'Matrix', [ 'Vector', 'ParamObj', 'debug' ] }  
  BISEXPORT unsigned char* parseMatlabV6WASM(unsigned char* input,const char* jsonstring,int debug);
  
  /** return a matrix from a text file (octave .matr or 4x4 matrix .matr)
   * @param input text of whole file
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized matrix 
   */
  // BIS: { 'parseMatrixTextFileWASM', 'Matrix', [ 'String', 'debug' ] }  
  BISEXPORT unsigned char* parseMatrixTextFileWASM(const char* input,int debug);

  /** return a string (for a text file -- octave .matr or 4x4 matrix .matr) for a matrix
   * @param input serialized input Matrix as unsigned char array 
   * @param name the name of the matrix
   * @param legacy if true then output 4x4 matrix transformation else old .matr file
   * @param debug if > 0 print debug messages
   * @returns a pointer to the string
   */
  // BIS: { 'createMatrixTextFileWASM', 'String', [ 'Matrix', 'String', 'Int', 'debug' ] }  
  BISEXPORT unsigned char* createMatrixTextFileWASM(unsigned char* input,const char* name,int legacy,int debug);


  /** return a combo transformation a .grd text file 
   * @param input text of whole file
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized bisComboTransformation 
   */
  // BIS: { 'parseComboTransformTextFileWASM', 'bisComboTransformation', [ 'String', 'debug' ] }  
  BISEXPORT unsigned char* parseComboTransformTextFileWASM(const char* input,int debug);

  /** return a string (for a grd file)
   * @param input serialized input combo transformation as unsigned char array 
   * @param debug if > 0 print debug messages
   * @returns a pointer to the string
   */
  // BIS: { 'createComboTransformationTextFileWASM', 'String', [ 'bisComboTransformation', 'debug' ] }  
  BISEXPORT unsigned char* createComboTransformationTextFileWASM(unsigned char* input,int debug);

  /** return a matrix with a qform description from an sform desription (NIFTI-1 code)
   * @param input serialized input 4x4 Matrix as unsigned char array 
   * @param debug if > 0 print debug messages
   * @returns a pointer to the output 10x1 matrix containing the quaternion representation
   */
  // BIS: { 'niftiMat44ToQuaternionWASM', 'Matrix', [ 'Matrix', 'debug' ] }  
  BISEXPORT unsigned char* niftiMat44ToQuaternionWASM(unsigned char* input,int debug);
  
  /** Extract image frame using \link bisImageAlgorithms::imageExtractFrame \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "frame" : 0 , " component" : 0 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'extractImageFrameWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* extractImageFrameWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Extract 2d image slice using \link bisImageAlgorithms::imageExtractSlice \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "plane" : 2, "slice":-1, "frame" : 0 , " component" : 0 } (slice=-1 = center slice)
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'extractImageSliceWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* extractImageSliceWASM(unsigned char* input,const char* jsonstring,int debug);

  
  /** Normalize image using \link bisImageAlgorithms::imageNormalize \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "perlow" : 0.0 , "perhigh" : 1.0, "outmaxvalue" : 1024 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a normalized image
   */
  // BIS: { 'normalizeImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* normalizeImageWASM(unsigned char* input,const char* jsonstring,int debug);


  /** Threshold image using \link bisImageAlgorithms::thresholdImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "low" : 50.0, "high": 100, "replacein" :  true, "replaceout" : false, "invalue: 100.0 , "outvalue" : 0.0, "datatype: -1 }, (datatype=-1 same as input)
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'thresholdImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  thresholdImageWASM(unsigned char* input,const char* jsonstring,int debug);

  /** ShiftScale image using \link bisImageAlgorithms::shiftScaleImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "shift" : 0.0, "scale": 1.0, "datatype: -1 }, (datatype=-1 same as input)
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'shiftScaleImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  shiftScaleImageWASM(unsigned char* input,const char* jsonstring,int debug);


  /** Threshold image using \link bisImageAlgorithms::thresholdImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "threshold" : 50.0, "clustersize": 100, "oneconnected" :  true, "outputclusterno" : false, "frame" :0, "component":0, "datatype: -1 }, (datatype=-1 same as input)
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'clusterThresholdImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  clusterThresholdImageWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Smooth image using \link bisImageAlgorithms::gaussianSmoothImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "sigma" : 1.0, "inmm" :  true, "radiusfactor" : 1.5 , "vtkboundary": false},
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'gaussianSmoothImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  gaussianSmoothImageWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Compute image gradient using  using \link bisImageAlgorithms::gradientImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "sigma" : 1.0, "inmm" :  true, "radiusfactor" : 1.5 },
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'gradientImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  gradientImageWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Reslice image using \link bisImageAlgorithms::resliceImage \endlink
   * @param input serialized input as unsigned char array 
   * @param transformation serialized transformation as unsigned char array 
   * @param jsonstring the parameter string for the algorithm  { int interpolation=3, 1 or 0, float backgroundValue=0.0; int ouddim[3], int outspa[3], int bounds[6] = None, int numthreads=2 -- use out image size }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'resliceImageWASM', 'bisImage', [ 'bisImage', 'bisTransformation', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* resliceImageWASM(unsigned char* input,
					    unsigned char* transformation,
					    const char* jsonstring,int debug);
  


    /** Crop an image using \link bisImageAlgorithms::cropImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "i0" : 0: ,"i1" : 100, "di" : 2, "j0" : 0: ,"j1" : 100, "dj" : 2,"k0" : 0: ,"k1" : 100, "dk" : 2, "t0" : 0: ,"t1" : 100, "dt" : 2 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'cropImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  cropImageWASM(unsigned char* input,const char* jsonstring,int debug);

  
  /** Flip an image using \link bisImageAlgorithms::flipImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "flipi" : 0, "flipj" : 0 , "flipk" : 0 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'flipImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  flipImageWASM(unsigned char* input,const char* jsonstring,int debug);


  /** Blank an image using \link bisImageAlgorithms::blankImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "i0" : 0: ,"i1" : 100, "j0" : 0: ,"j1" : 100,"k0" : 0: ,"k1" : 100, "outside" : 0 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'blankImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char*  blankImageWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Median Normalize an Image an image using \link bisImageAlgorithms::medianNormalizeImage \endlink
   * @param input serialized input as unsigned char array 
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'medianNormalizeImageWASM', 'bisImage', [ 'bisImage', 'debug' ] } 
  BISEXPORT unsigned char*  medianNormalizeImageWASM(unsigned char* input,int debug);

  /** Resample image using \link bisImageAlgorithms::resampleImage \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm  { int dim[3], float spacing[3], int interpolation; 3, 1 or 0, float backgroundValue=0.0 };
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'resampleImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* resampleImageWASM(unsigned char* input,
					     const char* jsonstring,int debug);
  
  

  
  /** Prepare Image for Registration using \link bisImageAlgorithms::prepareImageForRegistration \endlink
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */
  // BIS: { 'prepareImageForRegistrationWASM', 'bisImage', [ 'bisImage',  'ParamObj','debug' ] } 
  BISEXPORT unsigned char*  prepareImageForRegistrationWASM(unsigned char* input,const char* jsonstring,int debug);
  
  
  /** Compute Displacement Field 
   * @param transformation the transformation to use to compute a displacement field
   * @param jsonstring the parameter string for the algorithm 
   *   { "dimensions":  [ 8,4,4 ], "spacing": [ 2.0,2.5,2.5 ] };
   * @param debug if > 0 print debug messages
   * @returns a pointer to the displacement field image (bisSimpleImage<float>)
   */
  // BIS: { 'computeDisplacementFieldWASM', 'bisImage', [ 'bisTransformation', 'ParamObj','debug' ] } 
  BISEXPORT unsigned char* computeDisplacementFieldWASM(unsigned char* transformation,
							const char* jsonstring,
							int debug);
  

  /** Perform slice based bias field correction and return either image or bias field (if returnbiasfield=true)
   * @param input serialized input as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "axis" : 2, "threshold":0.02, "returnbiasfield" : false }. If axis >=3 (or <0) then triple slice is done, i.e. all three planes
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized corrected image  (or the bias field if returnbias=true)
   */
  // BIS: { 'sliceBiasFieldCorrectImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* sliceBiasFieldCorrectImageWASM(unsigned char* input,const char* jsonstring,int debug);


  /** Perform morphology operation (one of "median", "erode", "dilate") on binary images
   * @param input serialized binary input image as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "operation" : "median", "radius" : 1, "3d" : true }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a (unsigned char) serialized binary image
   */
  // BIS: { 'morphologyOperationWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* morphologyOperationWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Perform seed connectivity operation 
   * @param input serialized binary input image as unsigned char array 
   * @param jsonstring the parameter string for the algorithm { "seedi" : 10, "seedj": 20", "seedk" : 30, "oneconnected" : true }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a (unsigned char) serialized binary image
   */
  // BIS: { 'seedConnectivityWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* seedConnectivityWASM(unsigned char* input,const char* jsonstring,int debug);


  /** Computes GLM Fit for fMRI
   * @param input input time series as serialized array
   * @param mask for input time series (ignore is jsonstring has usemasks : 0 ) as serialized array
   * @param matrix  the regressor matrix as serialized array
   * @param jsonstring the parameter string for the algorithm { "usemask" : 1, "numstasks":-1 }  (numtaks=-1, means all are tasks)
   * @param debug if > 0 print debug messages
   * @returns a pointer to the beta image 
   */
  // BIS: { 'computeGLMWASM', 'bisImage', [ 'bisImage', 'bisImage_opt', 'Matrix', 'ParamObj', 'debug' ] } 
  BISEXPORT unsigned char* computeGLMWASM(unsigned char* input,unsigned char* mask,unsigned char* matrix,const char* jsonstring,int debug);


  /** Computes ROI Mean for a timeseries
   * @param input input image time series as serialized array
   * @param roi   input roi image
   * @param jsonstring  the parameter string for the algorithm { "storecentroids" : 0 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the roi matrix (rows=frames,cols=rois)
   */
  // BIS: { 'computeROIWASM', 'Matrix', [ 'bisImage', 'bisImage', 'ParamObj',  'debug' ], {"checkorientation" : "all"} } 
  BISEXPORT unsigned char* computeROIWASM(unsigned char* input,unsigned char* roi,const char* jsonstring,int debug);

  /** Compute butterworthFilter Output 
   * @param input the input matrix to filter (time = rows)
   * @param jsonstring the parameters { "type": "low", "cutoff": 0.15, 'sampleRate': 1.5 };
   * @param debug if > 0 print debug messages
   * @returns a pointer to the filtered matrix (rows=frames,cols=rois)
   */
  // BIS: { 'butterworthFilterWASM', 'Matrix', [ 'Matrix', 'ParamObj',  'debug' ] } 
  BISEXPORT  unsigned char* butterworthFilterWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Compute butterworthFilter Output applied to images
   * @param input the input image to filter
   * @param jsonstring the parameters { "type": "low", "cutoff": 0.15, 'sampleRate': 1.5, 'removeMean' : true };
   * if removeMean is true, remove mean of time series before filtering it 
   * @param debug if > 0 print debug messages
   * @returns a pointer to the filtered image
   */
  // BIS: { 'butterworthFilterImageWASM', 'bisImage', [ 'bisImage', 'ParamObj',  'debug' ] } 
  BISEXPORT  unsigned char* butterworthFilterImageWASM(unsigned char* input,const char* jsonstring,int debug);

  /** Compute correlation matrix
   * @param input the input timeseries matrix (roi output, rows=frames);
   * @param weights the input weight vector ( rows=frames);
   * @param jsonstring the parameters { "zscore": "false" }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the filtered matrix (rows=frames,cols=rois)
   */
  // BIS: { 'computeCorrelationMatrixWASM', 'Matrix', [ 'Matrix', 'Vector_opt', 'ParamObj',  'debug' ] } 
  BISEXPORT  unsigned char* computeCorrelationMatrixWASM(unsigned char* input,unsigned char* weights,const char* jsonstring,int debug);

  /** Regress out a time series from another (with optional weights)
   * @param input_ptr the input timeseries matrix (roi output, rows=frames);
   * @param regressor_ptr the regression timeseries matrix (roi output, rows=frames);
   * @param weights_ptr the input weight vector ( rows=frames) or 0 ;
   * @param debug if > 0 print debug messages
   * @returns a pointer to the filtered matrix (rows=frames,cols=rois)
   */
  // BIS: { 'weightedRegressOutWASM', 'Matrix', [ 'Matrix', 'Matrix', 'Vector_opt',  'debug' ] } 
  BISEXPORT  unsigned char* weightedRegressOutWASM(unsigned char* input_ptr,unsigned char* regressor_ptr,unsigned char* weights_ptr,int debug);

  /** Regress out a time series from another (with optional weights)
   * @param input_ptr the input timeseries image
   * @param regressor_ptr the regression timeseries matrix (roi output, rows=frames);
   * @param weights_ptr the input weight vector ( rows=frames) or 0 ;
   * @param debug if > 0 print debug messages
   * @returns a pointer to the filtered image
   */
  // BIS: { 'weightedRegressOutImageWASM', 'bisImage', [ 'bisImage', 'Matrix', 'Vector_opt',  'debug' ] } 
  BISEXPORT  unsigned char* weightedRegressOutImageWASM(unsigned char* input_ptr,unsigned char* regressor_ptr,unsigned char* weights_ptr,int debug);

  /** Regress out global signal from a  time series (with optional weights)
   * @param input_ptr the input timeseries matrix (roi output, rows=frames);
   * @param weights_ptr the input weight vector ( rows=frames) or 0 ;
   * @param debug if > 0 print debug messages
   * @returns a pointer to the filtered matrix (rows=frames,cols=rois)
   */
  // BIS: { 'weightedRegressGlobalSignalWASM', 'Matrix', [ 'Matrix', 'Vector_opt',  'debug' ] } 
  BISEXPORT  unsigned char* weightedRegressGlobalSignalWASM(unsigned char* input_ptr,unsigned char* weights_ptr,int debug);

  /** Compute Seed map correlation image
   * @param input_ptr the input image
   * @param roi_ptr the input roi timeseries matrix (roi output, rows=frames) (the seed timecourses)
   * @param weights_ptr the input weight vector ( rows=frames) or 0 ;
   * @param jsonstring the parameters { "zscore": "false" }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the seed map image 
   */
  // BIS: { 'computeSeedCorrelationImageWASM', 'bisImage', [ 'bisImage', 'Matrix', 'Vector_opt',  'ParamObj', 'debug' ] } 
  BISEXPORT  unsigned char* computeSeedCorrelationImageWASM(unsigned char* input_ptr,unsigned char* roi_ptr,unsigned char* weights_ptr,const char* jsonstring,int debug);

  /** Perform time series normalization 
   * @param input 4d image
   * @param debug if > 0 print debug messages
   * @returns a pointer to a (unsigned char) serialized timeseries normalized image
   */
  // BIS: { 'timeSeriesNormalizeImageWASM', 'bisImage', [ 'bisImage', 'debug' ] } 
  BISEXPORT unsigned char* timeSeriesNormalizeImageWASM(unsigned char* input,int debug);

  /** Transform a surface using a transformation
   * @param input surface
   * @param xform the transformation
   * @param debug if > 0 print debug messages
   * @returns a pointer to a (unsigned char) serialized surface
   */
  // BIS: { 'transformSurfaceWASM', 'bisSurface', [ 'bisSurface', 'bisTransformation', 'debug'] }
  BISEXPORT unsigned char* transformSurfaceWASM(unsigned char* input,unsigned char* xform,int debug);


  
#ifdef __cplusplus
}
#endif

#endif
