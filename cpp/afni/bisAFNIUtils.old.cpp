/* 

 Convert BisWebImage (BISWeb) to MRI_IMAGE (AFNI)

 BisWebImage (BISWeb): Class definition and interface functions defined in bisweb_image.js
 MRI_IMAGE (AFNI): Struct definition and its interface functions are defined in mrilib.h

*/

#include "mrilib.h"
#include "bisSimpleDataStructures.h"
#include "bisJSONParameterList.h"
#include "bisDataObjectFactory.h"
#include "bisAFNIUtils.h"
#include "bisMemoryManagement.h"
#include <memory>

unsigned char*  afniBlurImageWASM(unsigned char* input_ptr,unsigned char* mask_ptr,
				  const char* jsonstring,int debug)
{

  if (debug)
    std::cout << "_____ Beginning Afni Blur " << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;
  int usemask=params->getBooleanValue("usemask",0);
  float sigma=params->getFloatValue("sigma",1.0);
  if (debug)
    std::cout << "usemask=" << usemask << ", sigma=" << sigma << std::endl;


  std::unique_ptr<bisSimpleImage<float> > input(new bisSimpleImage<float>("input"));
  if (!input->linkIntoPointer(input_ptr))
    return 0;

  std::unique_ptr<bisSimpleImage<unsigned char> > maskimage(new bisSimpleImage<unsigned char>("mask_json"));
  if (usemask) {
    if (!maskimage->linkIntoPointer(mask_ptr))
      return 0;
  }

  int dims[5];    input->getDimensions(dims);
  float spa[5];   input->getSpacing(spa);

  // -------------------------------- Convert image to MRI_IMAGE ------------------------------------

  unsigned char* mask=NULL;
  if (usemask) {
    mask=maskimage->getData();
  }

  // Create the output and copy input into it to allocate new memory
  std::unique_ptr<bisSimpleImage<float> > output(new bisSimpleImage<float>("result"));
  output->allocate(dims,spa);
  // Copy intensities from input to output
  float *outP=output->getData();
  float *inpP=input->getData();
  int nvox=output->getLength();
  for (int i=0;i<nvox;i++)
    outP[i]=inpP[i];

  // Create a 3D AFNI Image
  MRI_IMAGE *my_image ;
  my_image = mri_new_vol_empty( dims[0],dims[1],dims[2] , MRI_float ) ;
  my_image->dx = spa[0];
  my_image->dy = spa[1];
  my_image->dz = spa[2];

  // Loop over frames/components
  int numvolumes=dims[3]*dims[4];
  for (int volumeindex=0;volumeindex<numvolumes;volumeindex++) {
    if (debug && numvolumes>0)
      std::cout << "\t processing volume " << volumeindex+1 << "/" << numvolumes << std::endl;
    int offset=volumeindex*dims[0]*dims[1]*dims[2];
    float *newp=&outP[offset];
    mri_fix_data_pointer( newp , my_image ) ;
    // If creating new afni image copy
    //memcpy( MRI_FLOAT_PTR(my_image) , input->getData() , my_image->nvox*my_image->pixel_size ) ;
    
    // Calls the AFNI Function which overwrites my_image which shares memory with output
    mri_blur3D_addfwhm( my_image , mask , sigma ) ;
  }

  // Release MRI_IMAGE without releasing pointer which we own
  mri_clear_and_free(my_image);
  
  // Return the output object back
  return output->releaseAndReturnRawArray();
}

