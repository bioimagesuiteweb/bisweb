//BIOIMAGESUITE_LICENSE  ---------------------------------------------------------------------------------
//BIOIMAGESUITE_LICENSE  This file is part of the BioImage Suite Software Package.
//BIOIMAGESUITE_LICENSE  
//BIOIMAGESUITE_LICENSE  X. Papademetris, M. Jackowski, N. Rajeevan, R.T. Constable, and L.H
//BIOIMAGESUITE_LICENSE  Staib. BioImage Suite: An integrated medical image analysis suite, Section
//BIOIMAGESUITE_LICENSE  of Bioimaging Sciences, Dept. of Diagnostic Radiology, Yale School of
//BIOIMAGESUITE_LICENSE  Medicine, http://www.bioimagesuite.org.
//BIOIMAGESUITE_LICENSE  
//BIOIMAGESUITE_LICENSE  All rights reserved. This file may not be edited/copied/redistributed
//BIOIMAGESUITE_LICENSE  without the explicit permission of the authors.
//BIOIMAGESUITE_LICENSE  
//BIOIMAGESUITE_LICENSE  -----------------------------------------------------------------------------------



#ifndef __bisImageDistanceMatrix_h
#define __bisImageDistanceMatrix_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisDefinitions.h"
#include "bisUtil.h"
#include "math.h"

#include <vector>

extern "C" {

  /** Computes a sparse distance matrix among voxels in the image
   * @param input serialized 4D input file as unsigned char array 
   * @param objectmap serialized input objectmap as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "useradius" : false, "radius" : 2.0, sparsity : 0.01, numthreads: 4 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the sparse distance matrix serialized 
   */
  // BIS: { 'computeImageDistanceMatrixWASM', 'Matrix', [ 'bisImage', 'bisImage_opt', 'ParamObj',  'debug' ], {"checkorientation" : "all"} } 
  BISEXPORT unsigned char* computeImageDistanceMatrixWASM(unsigned char* input, unsigned char* objectmap,const char* jsonstring,int debug);


  /** Eigenvector denoise image -- project image into eigenspace
   * @param input serialized 3D input file as unsigned char array 
   * @param 4D eigenvector image
   * @param jsonstring the parameter string for the algorithm 
   * { "scale" : 10000 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the denoise image
   */
  // BIS: { 'computeEigenvectorDenoiseImageWASM', 'bisImage', [ 'bisImage', 'bisImage', 'ParamObj',  'debug' ], {"checkorientation" : "all"} } 
  BISEXPORT unsigned char* computeEigenvectorDenoiseImageWASM(unsigned char* input, unsigned char* eigenvectors,const char* jsonstring,int debug);

  
  /** Creates an indexmap image
   * @param input objectmap
   * @param debug if > 0 print debug messages
   * @returns a pointer to the serialized index map image (int)
   */
  // BIS: { 'computeImageIndexMapWASM', 'bisImage', [ 'bisImage', 'debug' ] }
  BISEXPORT unsigned char* computeImageIndexMapWASM(unsigned char* input,int debug);

  
  /** Computes a sparse temporal distance matrix among frames in the image (patches perhaps)
   * @param input serialized 4D input file as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { sparsity : 0.01, numthreads: 4 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the sparse distance matrix serialized 
   */
  // BIS: { 'computeTemporalImageDistanceMatrixWASM', 'Matrix', [ 'bisImage', 'ParamObj', 'debug' ] }
  unsigned char* computeTemporalImageDistanceMatrixWASM(unsigned char* input,const char* jsonstring,int debug);
    
   /** Creates a reformatted image where a patch is mapped into frames. This is so as to recycle the ImageDistanceMatrix code for 
    * patch distances as opposed to frame comparisons
    * @param input serialized 3D input file as unsigned char array 
    * @param jsonstring the parameter string for the algorithm 
    * { "radius" : 2, "increment" : 1, numthreads: 4 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the reformated image
   */
  // BIS: { 'createPatchReformatedImage', 'bisImage', [ 'bisImage', 'ParamObj',  'debug' ] }
  BISEXPORT unsigned char* createPatchReformatedImage(unsigned char* input,const char* jsonstring,int debug);

  /** Compute sparse Eigen Vectors based on distance Matrix and IndexMap 
   * @param sparseMatrix the sparse Matrix (output of computeImageDistanceMatrix)
   * @param indexMap the indexMap image (output of computeImageIndexMap)
   * @param eigenVectors the output eigenVector image
   * @param jsonstring the parameter string for the algorithm 
   * { "maxeigen" : 10, "sigma" : 1.0, "lambda" : 0.0, "tolerance" : 0.00001 , "maxiter" : 500, "scale" : 10000 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the reformated image
   */
  // BIS: { 'computeSparseImageEigenvectorsWASM', 'bisImage', [ 'Matrix', 'bisImage', 'ParamObj',  'debug' ] }
  BISEXPORT unsigned char* computeSparseImageEigenvectorsWASM(unsigned char* input, unsigned char* indexmap,const char* jsonstring,int debug);

}


#endif



