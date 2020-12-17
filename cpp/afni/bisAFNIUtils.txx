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

#include "mrilib.h"
#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"

/** @file bisAfniUtils.h

    Utility code to support access to AFNI code and data structures

*/

#ifndef _bis_AFNIUtil_txx
#define _bis_AFNIUtil_txx


namespace bisAFNIUtils {

  /** Get the AFNI Type from input type */
  template<class T> MRI_TYPE getAFNIType(T a) {

    if (std::is_same<T, unsigned char>::value)
      return MRI_byte;
    if (std::is_same<T, short>::value)
      return MRI_short;
    if (std::is_same<T, int>::value)
      return MRI_int;
    if (std::is_same<T, float>::value)
      return MRI_float;
    if (std::is_same<T, double>::value)
      return MRI_double;

    std::cerr << "Bad Type:" << typeid(&a).name() << std::endl;
    // bisweb does not support complex so returning this is an error flag really
    return MRI_complex;
  }


  /** CopyImage -- new memory is allocated here */
  template<class T> bisSimpleImage<T>* copyImage(bisSimpleImage<T>* input_image,std::string name) {

    // Create the output and copy input into it to allocate new memory
    int dims[5];    input_image->getDimensions(dims);
    float spa[5];   input_image->getSpacing(spa);

    bisSimpleImage<T> *output_image=new bisSimpleImage<float>(name.c_str());
    output_image->allocate(dims,spa);
    // Copy intensities from input to output
    float *outP=output_image->getData();
    float *inpP=input_image->getData();
    int nvox=output_image->getLength();
    for (int i=0;i<nvox;i++)
      outP[i]=inpP[i];

    return output_image;
  }
  

  /** get pointer to start of frame */
  template<class T> T* getDataAtFrame(bisSimpleImage<T>* input_image,int frame) {
    
    int dims[5];    input_image->getDimensions(dims);
    int actualframe=bisUtil::irange(frame,0,dims[3]*dims[4]-1);
    T* inp=input_image->getData();
    int offset=dims[0]*dims[1]*dims[2]*actualframe;
    return &inp[offset];
  }

  
  /** Convert bisSimpleImage<T> to afni MRI_IMAGE */
  template<class T> MRI_IMAGE* bisSimpleImageToAFNIMRIImage(bisSimpleImage<T>* input_image,int frame) {
    
    int dims[5];    input_image->getDimensions(dims);
    float spa[5];   input_image->getSpacing(spa);

    // Get the type
    MRI_TYPE tp=getAFNIType<T>((T)0);
    
    // Create the image
    MRI_IMAGE *linked_afni_image ;
    linked_afni_image = mri_new_vol_empty( dims[0],dims[1],dims[2] , tp ) ;
    linked_afni_image->dx = spa[0];
    linked_afni_image->dy = spa[1];
    linked_afni_image->dz = spa[2];

    // Link the pointer
    mri_fix_data_pointer( getDataAtFrame<T>(input_image,frame) , linked_afni_image ) ;
    return linked_afni_image;
  }

  
}


#endif
