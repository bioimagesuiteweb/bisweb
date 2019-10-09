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
  // BIS: { 'computeImageDistanceMatrixWASM', 'Matrix', [ 'bisImage', 'bisImage', 'ParamObj',  'debug' ], {"checkorientation" : "all"} } 
  BISEXPORT unsigned char* computeImageDistanceMatrixWASM(unsigned char* input, unsigned char* objectmap,const char* jsonstring,int debug);

  /** Creates an indexmap image
   * @param input objectmap
   * @param debug if > 0 print debug messages
   * @returns a pointer to the serialized index map image (int)
   */
  // BIS: { 'computeImageIndexMapWASM', 'bisImage', [ 'bisImage', 'debug' ] }
  BISEXPORT unsigned char* computeImageIndexMapWASM(unsigned char* input,int debug);

   /** Creates a reformatted image where a patch is mapped into frames. This is so as to recycle the ImageDistanceMatrix code for 
    * patch distances as opposed to frame comparisons
    * @param input serialized 3D input file as unsigned char array 
    * @param jsonstring the parameter string for the algorithm 
    * { "radius" : 2,  numthreads: 4 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the reformated image
   */
  // BIS: { 'createPatchReformatedImage', 'bisImage', [ 'bisImage', 'ParamObj',  'debug' ] }
  BISEXPORT unsigned char* createPatchReformatedImage(unsigned char* input,const char* jsonstring,int debug);

}


#endif



