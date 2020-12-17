/* 

 Convert BisWebImage (BISWeb) to MRI_IMAGE (AFNI)

 BisWebImage (BISWeb): Class definition and interface functions defined in bisweb_image.js
 MRI_IMAGE (AFNI): Struct definition and its interface functions are defined in mrilib.h

*/


#include "bisJSONParameterList.h"
#include "bisAFNIUtils.h"
#include "bisAFNIExportedFunctions.h"
#include "bisImageAlgorithms.h"
#include <memory>

unsigned char*  afniBlurImageWASM(unsigned char* input_ptr,unsigned char* mask_ptr,
				  const char* jsonstring,int debug)
{

  if (debug)
    std::cout << "_____ Beginning Afni Blur " << std::endl;

  // ---------------------------------------------------------------------------------
  // Extract Parameters by parsing the JSON string jsonstring
  // ---------------------------------------------------------------------------------
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  // Store the values. The value after "usemask" is the default value
  int usemask=params->getBooleanValue("usemask",0);
  float sigma=params->getFloatValue("sigma",1.0);

  // Print if needed
  if (debug)
    std::cout << "usemask=" << usemask << ", sigma=" << sigma << std::endl;

  // ---------------------------------------------------------------------------------
  // Input Image Deserialization
  // Memory is linked not copied unless they type is not float
  // ---------------------------------------------------------------------------------
  std::unique_ptr<bisSimpleImage<float> > input(new bisSimpleImage<float>("input"));
  if (!input->linkIntoPointer(input_ptr))
    return 0;

  // ---------------------------------------------------------------------------------
  // Are we using a mask? If yes, deserialize and check for dimensions, else
  //    leave mask pointer as NULL
  // ---------------------------------------------------------------------------------
  unsigned char* mask=NULL;
  std::unique_ptr<bisSimpleImage<unsigned char> > maskimage(new bisSimpleImage<unsigned char>("mask_json"));
  if (usemask) {
    if (!maskimage->linkIntoPointer(mask_ptr))
      return 0;

    // Check that images have the same dimensions the 0 means only check 3D dimensions
    if (bisImageAlgorithms::doImagesHaveSameSize<float,unsigned char>(input.get(),maskimage.get(),0)==0) {
      std::cerr << "Mask and Image do not have the same dimensions" << std::endl;
      return 0;
    }

    // If everything is good store the pointer to the data
    mask=maskimage->getData();
  }

  // -------------------------------- Convert image to MRI_IMAGE ------------------------------------
  // Create the output and copy input into it to allocate new memory as AFNI blur overwrites
  // The .get() part converts from smart pointer to real pointer
  std::unique_ptr<bisSimpleImage<float> > output(bisAFNIUtils::copyImage<float>(input.get(),"copyfloat"));

  // Create a 3D AFNI Image Pointer that links into Output
  // Uses same raw storage
  MRI_IMAGE *afni_linked_output_image = bisAFNIUtils::bisSimpleImageToAFNIMRIImage<float>(output.get());

  // Get Number of Volumes
  int dims[5]; output->getDimensions(dims);
  int numvolumes=dims[3]*dims[4];

  // Loop over volumes
  for (int volumeindex=0;volumeindex<numvolumes;volumeindex++) {

    if (debug && numvolumes>0)
      std::cout << "\t processing volume " << volumeindex+1 << "/" << numvolumes << std::endl;

    // Change the pointer in my_umage
    mri_fix_data_pointer( bisAFNIUtils::getDataAtFrame<float>(output.get(),volumeindex) , afni_linked_output_image ) ;
    // If creating new afni image copy
    //memcpy( MRI_FLOAT_PTR(afni_linked_output_image) , input->getData() , afni_linked_output_image->nvox*afni_linked_output_image->pixel_size ) ;
    
    // Calls the AFNI Function which overwrites afni_linked_output_image which shares memory with output
    mri_blur3D_addfwhm( afni_linked_output_image , mask , sigma ) ;
  }

  // Release MRI_IMAGE without releasing pointer which we own
  mri_clear_and_free(afni_linked_output_image);
  
  // Return the output object back
  return output->releaseAndReturnRawArray();
}

