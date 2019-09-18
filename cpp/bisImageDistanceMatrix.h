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
#include <vtkMultiThreader.h>
#include <vector>

namespace bisImageDistanceMatrix {

  class bisImageDistanceMatrixThreadStructure {
  public:
    short* wgt_dat;
    int*   index_dat;
    float* img_dat;
    long   numvoxels;
    int    numframes;
    long   numbest;
    long   numgoodvox;
    long   slicesize;

    // Stuff for radius
    int dim[3];
    float spa[3];
    float DistanceRadius;
    double maxintensity;
    double normalization;
    std::vector<double> output_array[VTK_MAX_THREADS];
    int numcols;

    bisImageDistanceMatrixThreadStructure() {
      this->wgt_dat=NULL;
      this->index_dat=NULL;
      this->img_dat=NULL;
      this->numcols=3;
    }

    ~bisImageDistanceMatrixThreadStructure() {
      for (int i=0;i<VTK_MAX_THREADS;i++) {
        this->output_array[i].clear();
        this->output_array[i].shrink_to_fit();
      }
      this->wgt_dat=NULL;
      this->index_dat=NULL;
      this->img_dat=NULL;
      this->numcols=0;
    }
  };

  // Description:
  // Parallel Implementations of 
  std::unique_ptr<bisSimpleMatrix<double> > CreateSparseMatrixParallel(bisSimpleImage<float>* input,
                                                                       bisSimpleImage<short>* objectmap,
                                                                       bisSimpleImage<int>* indexmap,
                                                                       float sparsity,int numthreads=4);
  std::unique_ptr<bisSimpleMatrix<double> > CreateRadiusMatrixParallel(bisSimpleImage<float>* input,
                                                                       bisSimpleImage<short>* objectmap,
                                                                       bisSimpleImage<int>* indexmap,
                                                                       float radius,int numthreads=4);
  

}

extern "C" {

  /** Computes a sparse distance matrix among voxels in the image
   * @param input serialized 4D input file as unsigned char array 
   * @param objectmap serialized input objectmap as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "useradius" : false, "radius" : 2.0, sparsity : 0.01, numthreads: 4 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to the sparse distance matrix serialized 
   */
  // BIS: { 'computeImageDistanceMatrixWASM', 'bisImage', [ 'bisImage', 'bisImage', 'ParamObj', 'debug' ], {"checkorientation" : "all"} }
  BISEXPORT unsigned char* computeImageDistanceMatrixWASM(unsigned char* input, unsigned char* objectmap,const char* jsonstring,int debug);

  /** Creates an indexmap image
   * @param input objectmap
   * @param debug if > 0 print debug messages
   * @returns a pointer to the serialized index map image (int)
   */
  // BIS: { 'computeImageIndexMapWASM', 'bisIamage', [ 'bisImage', 'debug' ]
  BISEXPORT unsigned char* computeImageIndexMapWASM(unsigned char* input,int debug);

}


#endif



