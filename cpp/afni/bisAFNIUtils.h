/*  LICENSE=
 
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

// This derives from Javid's code
// ...

//#include "../src/debugtrace.h"  /* 26 Jan 2001 addition */

#include "mrilib.h"
#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"

/** @file bisAfniUtils.h

    Utility code to support access to AFNI

*/

#ifndef _bis_AFNIUtils_h
#define _bis_AFNIUtils_h


namespace bisAFNIUtils {

  /** Get AFNI Type from c type
   * a -- dummy value
   * @return the MRI_TYPE from afni
  */
  template<class T> MRI_TYPE getAFNIType(T a);

  
  /** Convert bisSimpleImage<T> to afni MRI_Image
   * input - input bisSimpleImage<T>
   * frame - frame to map (for 4D Images)
   *   @return the output MRI_Image (ANI)
   */
  template<class T> MRI_IMAGE* bisSimpleImageToAFNIMRIImage(bisSimpleImage<T>* input,int frame=0);
  
}

#ifndef BIS_MANUAL_INSTANTIATION
#include "bisAFNIUtils.txx"
#endif


#endif
