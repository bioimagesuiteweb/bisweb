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



#ifndef __bisImageTransformationJacobian_h
#define __bisImageTransformationJacobian_h

#include "bisDefinitions.h"


extern "C" {

  /** Computes the jacobian image of the transformation on the space of the image
   * @param xform the transformation to use to compute a displacement field
   * @param jsonstring the parameter string for the algorithm 
   *   { "dimensions":  [ 8,4,4 ], "spacing": [ 2.0,2.5,2.5 ], "nonlinearonly" : "false" };
   *   nonlinearonly is only used if the transformation is a bisComboTransformation
   * @param debug if > 0 print debug messages
   * @returns a pointer to the Jacobian field image (bisSimpleImage<float>)
   */
  // BIS: { 'computeJacobianImageWASM', 'bisImage', [ 'bisTransformation', 'ParamObj',  'debug' ] }
  BISEXPORT unsigned char* computeJacobianImageWASM(unsigned char* xform,const char* jsonstring,int debug);

}


#endif



