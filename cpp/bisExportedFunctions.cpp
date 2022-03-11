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

#include "bisSimpleDataStructures.h"
#include "bisImageAlgorithms.h"
#include "bisExportedFunctions.h"
#include "bisJSONParameterList.h"
#include "bisMatrixTransformation.h"
#include "bisGridTransformation.h"
#include "bisComboTransformation.h"
#include "bisDataObjectFactory.h"
#include "bisBiasFieldAlgorithms.h"

#include "bisEigenUtil.h"
#include "bisfMRIAlgorithms.h"
#include "bisLegacyFileSupport.h"
#include "bisDataObjectFactory.h"
#include "bisSimpleImageSegmentationAlgorithms.h"
#include "bisSurface.h"
#include "bisPointRegistrationUtils.h"
#include "bisMemoryManagement.h"
#include <memory>


// --------------------------------------------------------------------------------------------------------------------------------------------------------
// Wrappers for Memory Ops
// --------------------------------------------------------------------------------------------------------------------------------------------------------

void set_debug_memory_mode(int m) {
  bisMemoryManagement::setDebugMemoryMode(m);
}

void set_large_memory_mode(int m) {
  bisMemoryManagement::setLargeMemoryMode(m);
}

void print_memory()
{
  bisMemoryManagement::print_map();
}

void delete_all_memory()
{
  bisMemoryManagement::delete_all();
}

int jsdel_array(unsigned char* ptr) {
  bisMemoryManagement::release_memory(ptr,"js_del");
  return 1;
}

unsigned char* allocate_js_array(int sz)
{
  return bisMemoryManagement::allocate_memory(sz,"js_array","js_alloc");
}

// --------------------------------------------------------------------------------------------------------------------------------------------------------
// Magic Codes
// --------------------------------------------------------------------------------------------------------------------------------------------------------

int getVectorMagicCode() { return bisDataTypes::s_vector; }
int getMatrixMagicCode() { return bisDataTypes::s_matrix; }
int getImageMagicCode() { return bisDataTypes::s_image;   }
int getGridTransformMagicCode() { return bisDataTypes::s_gridtransform; }
int getComboTransformMagicCode() { return bisDataTypes::s_combotransform; }
int getCollectionMagicCode() { return bisDataTypes::s_collection; }
int getSurfaceMagicCode() { return bisDataTypes::s_surface; }


// --------------------------------------------------------------------------------------------------------------------------------------------------------
// Wrappers for Image operations
// --------------------------------------------------------------------------------------------------------------------------------------------------------

unsigned char*  gaussianSmoothImageWASM(unsigned char* input,const char* jsonstring,int debug) {

  if (debug)
    std::cout << "In Smooth Image" << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if (debug)
    params->print();

  float sigmas[3];
  int ns=params->getNumComponents("sigmas");
  if (ns==3)
    {
      for (int ia=0;ia<=2;ia++) 
	sigmas[ia]=params->getFloatValue("sigmas",1.0,ia);
    }
  else
    {
      float s=params->getFloatValue("sigma",1.0);
      sigmas[0]=s;
      sigmas[1]=s;
      sigmas[2]=s;
    }
  int inmm=params->getBooleanValue("inmm");
  int vtkboundary=params->getBooleanValue("vtkboundary",0);
  float radiusfactor=params->getFloatValue("radiusfactor",1.5);

  if (debug)
    std::cout << "Using sigmas=" << sigmas[0] << "," << sigmas[1] << "," << sigmas[2] << std::endl;
  
  std::unique_ptr<bisSimpleImage<float> > in_image(new bisSimpleImage<float>("smooth_input_float"));
  if (!in_image->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("smooth_output_float"));
  out_image->copyStructure(in_image.get());
  float outsigmas[3];
  bisImageAlgorithms::gaussianSmoothImage(in_image.get(),out_image.get(),sigmas,outsigmas,inmm,radiusfactor,vtkboundary);
  if (debug)
    std::cout << "outsigmas=" << outsigmas[0] << "," << outsigmas[1] << "," << outsigmas[2] << std::endl;
  return out_image->releaseAndReturnRawArray();

}

unsigned char*  gradientImageWASM(unsigned char* input,const char* jsonstring,int debug) {

  if (debug)
    std::cout << "In Gradient Image" << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if (debug)
    params->print();

  float sigmas[3];
  int ns=params->getNumComponents("sigmas");
  if (ns==3)
    {
      for (int ia=0;ia<=2;ia++) 
	sigmas[ia]=params->getFloatValue("sigmas",1.0,ia);
    }
  else
    {
      float s=params->getFloatValue("sigmas",1.0);
      sigmas[0]=s;
      sigmas[1]=s;
      sigmas[2]=s;
    }
  int inmm=params->getBooleanValue("inmm");
  float radiusfactor=params->getFloatValue("radiusfactor",1.5);

  
  std::unique_ptr<bisSimpleImage<float> > in_image(new bisSimpleImage<float>("smooth_input_float"));
  if (!in_image->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("smooth_output_float"));
  int dim[5];   in_image->getDimensions(dim);
  dim[3]=dim[3]*3;
  float spa[5]; in_image->getSpacing(spa);
  out_image->allocate(dim,spa);

  
  float outsigmas[3];
  bisImageAlgorithms::gradientImage(in_image.get(),out_image.get(),sigmas,outsigmas,inmm,radiusfactor);
  if (debug)
    std::cout << "outsigmas=" << outsigmas[0] << "," << outsigmas[1] << "," << outsigmas[2] << std::endl;
  return out_image->releaseAndReturnRawArray();
}


// --------------------------------------------------------------------------------------------------------------------------------------------------------
// Wrappers for resliceImage
// --------------------------------------------------------------------------------------------------------------------------------------------------------

// jsonstring { int interpolation=3, 1 or 0, float backgroundValue=0.0; int bounds[6] = None -- image size }
template <class BIS_TT> unsigned char* resliceImageTemplate(unsigned char* input,unsigned char* transformation,bisJSONParameterList* params,int debug,BIS_TT*) {
  
  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  
  std::shared_ptr<bisAbstractTransformation> resliceXform=bisDataObjectFactory::deserializeTransformation(transformation,"reslicexform");
  if (resliceXform.get()==0) {
    std::cerr << "Failed to deserialize transformation " << std::endl;
    return 0;
  }

  if (debug) {
    std::cout << "Created reslicexform = " << resliceXform->getClassName() << std::endl;
    resliceXform->printSelf();
  }

  int interpolation=params->getIntValue("interpolation",1);
  //int numthreads=params->getIntValue("numthreads",1);
  if (interpolation!=3 && interpolation!=0)
    interpolation=1;

  /*  if (numthreads<1)
    numthreads=1;
  else if (numthreads>4)
  numthreads=4;*/

  //Create a hodgepodge output image
  // Image spacing and dimensions come from parameters but
  // if not there copied from input image
  // So if no params are specified, output=> same size,spacing as input
  int dim[5]; float spa[5];
  int input_dim[5]; inp_image->getDimensions(input_dim);
  float input_spa[5]; inp_image->getSpacing(input_spa);
  for (int ia=0;ia<=4;ia++)
    {
      dim[ia]=params->getIntValue("dimensions",-1,ia);
      spa[ia]=params->getFloatValue("spacing",-1.0,ia);

      if (dim[ia]<0)
	dim[ia]=input_dim[ia];
      if (spa[ia]<0)
	spa[ia]=input_spa[ia];
    }

  int bounds[6] = { 0,dim[0]-1,0,dim[1]-1,0,dim[2]-1 };
  int bounds2[6] = { 0,dim[0]-1,0,dim[1]-1,0,dim[2]-1 };
  int sum=0;
  for (int ia=0;ia<=5;ia++) {
    bounds[ia]=params->getIntValue("bounds",bounds[ia],ia);
    sum=abs(bounds[ia]-bounds2[ia]);
  }

  float backgroundValue=params->getFloatValue("backgroundValue",0.0);

  // Now ready to create a n_e_w output image
  std::unique_ptr<bisSimpleImage<BIS_TT> > out_image(new bisSimpleImage<BIS_TT>("inp_image"));
  out_image->allocate(dim,spa);
  out_image->fill((BIS_TT)backgroundValue);

  
  if (debug>1)
    {
      std::cout << "Beginning actual Image Reslice" << std::endl;
      std::cout << "\tParsed parameters interp=" << interpolation << " backg=" << backgroundValue << std::endl << "\t";
      std::cout << "\tbounds = [";
      for (int ia=0;ia<=5;ia++)
	std::cout << bounds[ia] << " ";
      std::cout << "]" << " diff=" << sum << std::endl;
      std::cout << "\tout dimensions=[";
      for (int ia=0;ia<=4;ia++)
	std::cout << dim[ia] << " ";
      std::cout << "]" << std::endl << "\tout_spacing=[";
      for (int ia=0;ia<=4;ia++)
	std::cout << spa[ia] << " ";
      std::cout << "]" << std::endl;
      std::cout << "-----------------------------------" << std::endl;
    }

  if (sum>0) {
    if (debug) std::cout << "___ Reslice with bounds " << std::endl;
    bisImageAlgorithms::resliceImageWithBounds(inp_image.get(),
                                               out_image.get(),
                                               resliceXform.get(),
                                               bounds,interpolation,backgroundValue);
  } else {
    if (debug) std::cout << "___ Reslice normal " << std::endl;
    bisImageAlgorithms::resliceImage(inp_image.get(),
                                     out_image.get(),
                                     resliceXform.get(),
                                     interpolation,backgroundValue);
  }
  
  return out_image->releaseAndReturnRawArray();
}

unsigned char* resliceImageWASM(unsigned char* input,
				unsigned char* transformation,
				const char* jsonstring,
				int debug)

{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());


  
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  // Maybe set type in code
  int* header=(int*)input;
  // Set output data type to either input image or use "datatype" param if this is used
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return resliceImageTemplate(input,transformation,
							     params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;

}

// -------------------------------------------------------------------
// Resample
// -------------------------------------------------------------------
template <class BIS_TT> unsigned char* resampleImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*) {
  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  float spa[3];
  int ns=params->getNumComponents("spacing");
  if (ns==3)
    {
      for (int ia=0;ia<=2;ia++) 
	spa[ia]=params->getFloatValue("spacing",1.0,ia);
    }
  else
    {
      float s=params->getFloatValue("spacing",1.0);
      spa[0]=s;
      spa[1]=s;
      spa[2]=s;
    }
  int interpolation=params->getIntValue("interpolation",1);
  if (interpolation!=3 && interpolation!=0)
    interpolation=1;

  double backgroundValue=params->getFloatValue("backgroundValue",0.0);

  if (debug) {
    std::cout << "Beginning actual Image Resample" << std::endl;
    std::cout << "Parsed parameters interp=" << interpolation << " backg=" << backgroundValue << std::endl << "\t";
    std::cout << "spacing = [";
    for (int ia=0;ia<=2;ia++)
      std::cout << spa[ia] << " ";
    std::cout << "]" << std::endl;
    
    std::cout << "-----------------------------------" << std::endl;
  }
  
  std::unique_ptr<bisSimpleImage<BIS_TT> > out_image=bisImageAlgorithms::resampleImage(inp_image.get(),
										       spa,interpolation,backgroundValue);
  if (debug)
    std::cout << "Resampling Done" << std::endl;

  return out_image->releaseAndReturnRawArray();
}

unsigned char* resampleImageWASM(unsigned char* input,
				 const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return resampleImageTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;


}
// -------------------------------------------------------------------
// Extract Frame
// -------------------------------------------------------------------
template <class BIS_TT> unsigned char* extractImageFrameTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*) {
  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int frame=params->getIntValue("frame",0);
  int component=params->getIntValue("component",0);

  if (debug) {
    std::cout << "Beginning actual Image ExtractFrame" << std::endl;
    std::cout << "Parsed parameters frame=" << frame << " comp=" << component << std::endl << "\t";
    std::cout << "-----------------------------------" << std::endl;
  }
  
  std::unique_ptr<bisSimpleImage<BIS_TT> > out_image=bisImageAlgorithms::imageExtractFrame(inp_image.get(),
											   frame,component);
  if (debug)
    std::cout << "Extracting Frame Done" << std::endl;

  return out_image->releaseAndReturnRawArray();
}

unsigned char* extractImageFrameWASM(unsigned char* input,
				 const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return extractImageFrameTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;


}

// -------------------------------------------------------------------
// Extract Slice
// -------------------------------------------------------------------
template <class BIS_TT> unsigned char* extractImageSliceTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*)
{

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int plane=params->getIntValue("plane",2);
  int slice=params->getIntValue("slice",0);
  int frame=params->getIntValue("frame",0);
  int component=params->getIntValue("component",0);
  
  if (debug) {
    std::cout << "Beginning actual Image ExtractSlice" << std::endl;
    std::cout << "Parsed parameters plane=" << plane << " slice=" << slice << " frame=" << frame << " comp=" << component << std::endl;
    std::cout << "-----------------------------------" << std::endl;
  }
  
  
  std::unique_ptr<bisSimpleImage<BIS_TT> > out_image(new bisSimpleImage<BIS_TT>());

  int ok=bisImageAlgorithms::imageExtractSlice(inp_image.get(),out_image.get(),
					       plane,slice,frame,component);

  if (debug)
    std::cout << std::endl << "..... Extracting Slice Done ok=" << ok << std::endl;

  return out_image->releaseAndReturnRawArray();
}

unsigned char* extractImageSliceWASM(unsigned char* input,
				     const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return extractImageSliceTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;


}

// --------------------------------------------------------------------------------------------------------------------------------------------------------
template <class BIS_TT> unsigned char* normalizeImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*) {

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int outmaxvalue=params->getIntValue("outmaxvalue",1024);
  float perlow=params->getFloatValue("perlow",0.0);
  float perhigh=params->getFloatValue("perhigh",1.0);

  if (debug) {
    std::cout << "Beginning Image normalize" << std::endl;
    std::cout << "\t Parsed parameters range=" << perlow <<" :" << perhigh << " outmax=" << outmaxvalue << std::endl;
  }

  double outdata[2];
  std::unique_ptr<bisSimpleImage<short> > out_image(bisImageAlgorithms::imageNormalize(inp_image.get(),
										       perlow,perhigh,outmaxvalue,outdata));

  if (debug)
    std::cout << "\t Normalizing Image Done : " << outdata[0] << "," << outdata[1] << std::endl;

  return out_image->releaseAndReturnRawArray();
}

unsigned char* normalizeImageWASM(unsigned char* input,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=header[1];

  switch (target_type)
      {
	bisvtkTemplateMacro( return normalizeImageTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;
}

// --------------------------------------------------------------------------------------------------------------------------------------------------------
// Prepare Image  for Registration
// --------------------------------------------------------------------------------------------------------------------------------------------------------
template <class BIS_TT> unsigned char* prepareImageForRegistrationTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*)
{

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int numbins=params->getIntValue("numbins",64);
  int normalize=params->getBooleanValue("normalize",1);
  float res=params->getFloatValue("resolution",1.5);
  float sigma=params->getFloatValue("sigma",-1.0);
  int intscale=params->getIntValue("intscale",1);
  int frame=params->getIntValue("frame",0);
  
  std::string name="external";
  std::unique_ptr<bisSimpleImage<short> > out_image(bisImageAlgorithms::prepareImageForRegistration(inp_image.get(),
												    numbins,normalize,
												    res,sigma,intscale,frame,
                                                                                                    name,
                                                                                                    debug));
  

  return out_image->releaseAndReturnRawArray();
}

unsigned char* prepareImageForRegistrationWASM(unsigned char* input,const char* jsonstring,int debug) {
  int* header=(int*)input;
  int target_type=header[1];

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  params->print();

  
  switch (target_type)
    {
      bisvtkTemplateMacro( return prepareImageForRegistrationTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
    }
  return 0;

}


// -------------------------------------------------------------------
// Bias Field Correction
// -------------------------------------------------------------------
template <class BIS_TT> unsigned char* sliceBiasFieldCorrectImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*)
{

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int axis=params->getIntValue("axis",2);
  float threshold=params->getFloatValue("threshold",0.05f);
  int returnbiasfield=params->getBooleanValue("returnbiasfield",0);
  
  if (debug) {
    std::cout << "Beginning actual bias Field Correction" << std::endl;
    std::cout << "Parsed parameters axis=" << axis << " threshold=" << threshold  << " returnbiasfield=" << returnbiasfield << std::endl;
    std::cout << "-----------------------------------" << std::endl;
  }
  

  if (axis>=0 && axis<=2)
    {
      std::cout << "Going into compute slice bias field " << std::endl;
      std::unique_ptr<bisSimpleImage<float> > bfield(bisBiasFieldAlgorithms::computeSliceBiasField<BIS_TT>(inp_image.get(),axis,threshold));
      std::cout << "compute slice bias  field done " << std::endl;
      if (returnbiasfield==1)
	{
	  std::cout << "return bias field " << std::endl;
	  return bfield->releaseAndReturnRawArray();
	}

      std::cout << "Going into bias field correction " << std::endl;
      std::unique_ptr<bisSimpleImage<float> > out_image(bisBiasFieldAlgorithms::biasFieldCorrection<BIS_TT>(inp_image.get(),bfield.get()));
      return out_image->releaseAndReturnRawArray();
    }

  std::unique_ptr<bisSimpleImage<float> > bfield(bisBiasFieldAlgorithms::computeTripleSliceBiasField<BIS_TT>(inp_image.get(),threshold));
  if (returnbiasfield==1)
    {
      return bfield->releaseAndReturnRawArray();
    }

  std::unique_ptr<bisSimpleImage<float> > out_image(bisBiasFieldAlgorithms::biasFieldCorrection<BIS_TT>(inp_image.get(),bfield.get()));
  return out_image->releaseAndReturnRawArray();

}

unsigned char* sliceBiasFieldCorrectImageWASM(unsigned char* input,
				     const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return sliceBiasFieldCorrectImageTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;


}


unsigned char* parseMatlabV6WASM(unsigned char* input,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    {
      std::cerr << "Failed to parse" << jsonstring << std::endl;
      return 0;
    }

  if(debug)
    params->print("from parseMatlabV6","_____");

  std::string name=params->getValue("name","");
  

  std::unique_ptr<bisSimpleVector<unsigned char> > s_vector(new bisSimpleVector<unsigned char>("mat_vector"));
  if (!s_vector->linkIntoPointer(input))
    {
      std::cerr << "Failed to deserialize vector from mat stuff" << std::endl;
      return 0;
    }

  if (debug)
    std::cout << std::endl << "Looking for matrix *" << name << "* in vector of length=" << s_vector->getLength() << std::endl;
  
  int ok=0;
  Eigen::MatrixXf mat=bisEigenUtil::importFromMatlabV6(s_vector->getData(),s_vector->getLength(),name,0,ok);
  if (debug)
    std::cout << "Ok=" << ok << std::endl;

  if (ok==0)
    return 0;
  
  std::unique_ptr<bisSimpleMatrix<float> > output(bisEigenUtil::createSimpleMatrix(mat,"matfile"));
  return output->releaseAndReturnRawArray();
}



// ------------------------------------------------------------------------------------
unsigned char* computeDisplacementFieldWASM(unsigned char* transformation,
					    const char* jsonstring,
					    int debug)
{
  if (debug)
    std::cout << "_____ Beginning computeDisplacementFieldJSON" << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  if(debug)
    params->print("from computeDisplacementField","_____");



  std::shared_ptr<bisAbstractTransformation> resliceXform=bisDataObjectFactory::deserializeTransformation(transformation,"dispxform");
  if (resliceXform.get()==0) {
    std::cerr << "Failed to deserialize transformation " << std::endl;
    return 0;
  }

  int dim[3];
  float spa[3];
  
  for (int ia=0;ia<=2;ia++)
    {
      dim[ia]=params->getIntValue("dimensions",64,ia);
      spa[ia]=params->getFloatValue("spacing",1.0,ia);
    }
  
  if (debug)
    {
      std::cout << "Computing Displacement Field dim=" << dim[0] << "," << dim[1] << "," << dim[2];
      std::cout << "  spa=" << spa[0] << "," << spa[1] << "," << spa[2] << " with " << resliceXform->getClassName() << std::endl;
      float X[3]={20.0f,20.0f,20.0f };
      float TX[3];
      resliceXform->transformPoint(X,TX);
      std::cout << "Mapping " << resliceXform->getClassName() << " (20,20,20) -> " << TX[0] << ", " << TX[1] << ", " << TX[2] << std::endl;
    }

  std::unique_ptr< bisSimpleImage<float> > output(resliceXform->computeDisplacementField(dim,spa));
  return output->releaseAndReturnRawArray();
}
  

// ------------------------------- fMRI ------------------------

unsigned char* computeGLMWASM(unsigned char* input_ptr,unsigned char* mask_ptr,unsigned char* matrix_ptr,const char* jsonstring,int debug)
{

  if (debug)
    std::cout << "_____ Beginning computeGLMJSON" << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  if(debug)
    params->print("from computeGLMJSON","_____");

  std::unique_ptr<bisSimpleImage<float> > timeseries(new bisSimpleImage<float>("timeseries_json"));
  if (!timeseries->linkIntoPointer(input_ptr))
    return 0;

  std::unique_ptr<bisSimpleMatrix<float> > glm(new bisSimpleMatrix<float>("glm_matrix_json"));
  if (!glm->linkIntoPointer(matrix_ptr))
    return 0;

  int usemask=params->getBooleanValue("usemask",0);
  int numtasks=params->getIntValue("numtasks",-1);
  if (debug)
    std::cout << "usemask=" << usemask << ", numtasks=" << numtasks << std::endl;

  std::unique_ptr<bisSimpleImage<unsigned char> > mask(new bisSimpleImage<unsigned char>("mask_json"));
  
  if (usemask)
    {
      if (!mask->linkIntoPointer(mask_ptr))
	return 0;
    }
  else
    {
      int dim[5];
      float spa[5];
      timeseries->getDimensions(dim);
      timeseries->getSpacing(spa);
      dim[3]=1;
      dim[4]=1;
      mask->allocate(dim,spa);
      mask->fill(100);
    }
      
  std::unique_ptr<bisSimpleImage<float > > output(bisfMRIAlgorithms::computeGLM(timeseries.get(),mask.get(),glm.get(),numtasks));
  return output->releaseAndReturnRawArray();
}

// -----------------------
// ROI Mean
// -----------------------

template<class BIS_TT> unsigned char* computeROITemplate(unsigned char* input_ptr,unsigned char* roi_ptr,const char* jsonstring,int debug,BIS_TT* )
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  int storecentroids=params->getBooleanValue("storecentroids",0);
  
  std::unique_ptr<bisSimpleImage<BIS_TT> > timeseries(new bisSimpleImage<BIS_TT>("timeseries_json"));
  if (!timeseries->linkIntoPointer(input_ptr))
    return 0;

  std::unique_ptr<bisSimpleImage<short> > roi(new bisSimpleImage<short>("roi_json"));
  if (!roi->linkIntoPointer(roi_ptr))
    return 0;

  if (debug) {
    params->print();
    std::cout << "Beginning ROI Analysis " << std::endl;
  }
  
  Eigen::MatrixXf output;
  int ok=bisImageAlgorithms::computeROIMean<BIS_TT>(timeseries.get(),roi.get(),output,storecentroids);

  if (debug)
    std::cout << "ROI Analysis done " << ok << std::endl;

  return bisEigenUtil::serializeAndReturn(output,"roi_matrix");
}


unsigned char* computeROIWASM(unsigned char* input_ptr,unsigned char* roi_ptr,const char* jsonstring,int debug)
{
  int* header=(int*)input_ptr;
  int in_type=header[1];

  switch (in_type)
      {
	bisvtkTemplateMacro( return computeROITemplate(input_ptr,roi_ptr, jsonstring,debug,static_cast<BIS_TT*>(0)));
      }
  return 0;
}


// -------------------------
// Butterworth Filter Matrix
// -------------------------

unsigned char* butterworthFilterWASM(unsigned char* input_ptr,const char* jsonstring,int debug)
{
  Eigen::MatrixXf input;
  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!bisEigenUtil::deserializeAndMapToEigenMatrix(s_matrix.get(),input_ptr,input,debug))
    return 0;

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  if(debug)
    params->print("from butterworthFilterJSON","_____");


  std::string ftype=params->getValue("type","low");
  float cutoff=params->getFloatValue("cutoff",0.15f);
  float samplerate=params->getFloatValue("sampleRate",1.0f);

  if (debug)
    std::cout << "Filter type=" << ftype << ", cutoff=" << cutoff << ", samplerate=" << samplerate <<  std::endl;


  Eigen::MatrixXf output;
  Eigen::MatrixXf temp;
  Eigen::VectorXf w;
  
  int ok=bisfMRIAlgorithms::butterworthFilter(input,output,w,temp,ftype,cutoff,samplerate,debug);

  if (debug)
    std::cout << "Butterworth Filter done " << ok << std::endl;

  return bisEigenUtil::serializeAndReturn(output,"filtered_matrix");

}

// ------------------------
// Butterworth Filter Image
// ------------------------


unsigned char* butterworthFilterImageWASM(unsigned char* input_ptr,const char* jsonstring,int debug)
{

  std::unique_ptr<bisSimpleImage<float> > in_image(new bisSimpleImage<float>("input"));
  if (!in_image->linkIntoPointer(input_ptr))
    return 0;

  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("filtered_output_float"));
  out_image->copyStructure(in_image.get());

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  if(debug)
    params->print("from butterworthFilterImage","_____");

  if (debug)
    std::cout << "--------- Extracting Parameters ------------- " << std::endl;
  
  std::string ftype=params->getValue("type","low");
  float cutoff=params->getFloatValue("cutoff",0.15f);
  float samplerate=params->getFloatValue("samplerate",1.0f);
  int removeMean=params->getBooleanValue("removeMean",1);
 
  if (debug)
    std::cout << "ButterworthImage Filter type=" << ftype << ", cutoff=" << cutoff << ", samplerate=" << samplerate << ", removeMean=" << removeMean << std::endl;


  int ok=bisfMRIAlgorithms::butterworthFilterImage(in_image.get(),out_image.get(),ftype,cutoff,samplerate,removeMean,debug);

  if (debug)
    std::cout << "Butterworth Filter Image done " << ok << std::endl;

  return out_image->releaseAndReturnRawArray();

}


 unsigned char* computeCorrelationMatrixWASM(unsigned char* input_ptr,unsigned char* weights_ptr,const char* jsonstring,int debug)
 {
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  if(debug)
    params->print("computeCorrelationMatrixJSON","_____");

  int toz=params->getBooleanValue("toz",0);

  Eigen::MatrixXf input;
  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!bisEigenUtil::deserializeAndMapToEigenMatrix(s_matrix.get(),input_ptr,input,debug))
    return 0;


   Eigen::VectorXf weights;
   std::unique_ptr<bisSimpleVector<float> > s_vector(new bisSimpleVector<float>("vector"));
   if (bisEigenUtil::deserializeAndMapToEigenVector(s_vector.get(),weights_ptr,weights,input.rows(),1.0,1)<1)
     return 0;

   if (debug)
     std::cout << "To Z = " << toz << std::endl;

   Eigen::MatrixXf output;
   int ok=bisfMRIAlgorithms::computeCorrelationMatrix(input,toz,weights,output);
   
   if (debug)
     std::cout << "compute Correlation done " << ok << std::endl;

   return bisEigenUtil::serializeAndReturn(output,"correlation_matrix");
 }

// --------------------------------------------------------------- ------------------------------------------------------------------
// weighted (optionally) Regress Out
// --------------------------------------------------------------- ------------------------------------------------------------------
unsigned char* weightedRegressOutWASM(unsigned char* input_ptr,unsigned char* regressor_ptr,unsigned char* weights_ptr,int debug)
{

  if (debug)
    std::cout << std::endl << "______ in weighted RegressOutJSON  weights=" << (BISLONG)weights_ptr << std::endl;
  
  Eigen::MatrixXf input;
  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!bisEigenUtil::deserializeAndMapToEigenMatrix(s_matrix.get(),input_ptr,input,debug))
    return 0;


   std::unique_ptr<bisSimpleMatrix<float> > s_regressors(new bisSimpleMatrix<float>("regrmatrix"));
   if (!s_regressors->linkIntoPointer(regressor_ptr))
     {
       std::cerr << "Failed to deserialize regressor matrix" << std::endl;
       return 0;
     }
   
   int useweights=0;
   Eigen::VectorXf weights;
   std::unique_ptr<bisSimpleVector<float> > s_vector(new bisSimpleVector<float>("vector"));
   if (bisEigenUtil::deserializeAndMapToEigenVector(s_vector.get(),weights_ptr,weights,0,1.0,1)<1)
     return 0;
   if (weights.rows()>=2)
     useweights=1;

   
   Eigen::MatrixXf regressors=bisEigenUtil::mapToEigenMatrix(s_regressors.get());
   Eigen::MatrixXf output;
   int ok=0;
   
   
   if (useweights==0)
     {
       // int regressOut(Eigen::MatrixXf& input,Eigen::MatrixXf& regressors,Eigen::MatrixXf& LSQ,Eigen::MatrixXf& output) {
       Eigen::MatrixXf LSQ=bisEigenUtil::createLSQMatrix(regressors);
       ok=bisfMRIAlgorithms::regressOut(input,regressors,LSQ,output);
     }
   else
     {
       Eigen::MatrixXf weightedR;
       Eigen::MatrixXf LSQ=bisfMRIAlgorithms::createWeightedLSQ(regressors,weights,weightedR);
       Eigen::MatrixXf temp;
       ok=bisfMRIAlgorithms::weightedRegressOut(input,weightedR,weights,LSQ,
						temp, output);
     }
   
   if (debug)
     std::cout << "regressedOUT done " << ok << std::endl;

   return bisEigenUtil::serializeAndReturn(output,"regress_out");
 }

// --------------------------------------------------------------- ------------------------------------------------------------------
// weighted (optionally) Regress Out Global Signal
// --------------------------------------------------------------- ------------------------------------------------------------------
unsigned char* weightedRegressGlobalSignalWASM(unsigned char* input_ptr,unsigned char* weights_ptr,int debug)
{

  if (debug)
    std::cout << std::endl << "______ in weighted RegressOutJSON  weights=" << (BISLONG)weights_ptr << std::endl;

  Eigen::MatrixXf input;
  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!bisEigenUtil::deserializeAndMapToEigenMatrix(s_matrix.get(),input_ptr,input,debug))
    return 0;

   Eigen::VectorXf weights;
   std::unique_ptr<bisSimpleVector<float> > s_vector(new bisSimpleVector<float>("vector"));
   if (bisEigenUtil::deserializeAndMapToEigenVector(s_vector.get(),weights_ptr,weights,0,0.0,1)<1)
     return 0;


   Eigen::MatrixXf output;
   Eigen::VectorXf means;
   int ok=0;
   
   ok=bisfMRIAlgorithms::computeGlobalSignal(input,weights,means);
   std::cout << "computed means " << ok << "( means=" << means.rows() << " weights=" << weights.rows() << ")" << std::endl;
   
   if (ok)
     ok=bisfMRIAlgorithms::regressGlobalSignal(input,weights,means,output);
   
   if (debug)
     std::cout << "regressed global signal done " << ok << std::endl;

   return bisEigenUtil::serializeAndReturn(output,"regress_glob");
 }





// -------------------------------------------------------------------
// Threshold Image
// -------------------------------------------------------------------
template <class BIS_IT,class BIS_OT> unsigned char* thresholdImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_IT*,BIS_OT*) {

  std::unique_ptr<bisSimpleImage<BIS_IT> > inp_image(new bisSimpleImage<BIS_IT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  float thresholds[2];
  thresholds[0]=params->getFloatValue("low",0.0);
  thresholds[1]=params->getFloatValue("high",1000.0);
  int replace[2];
  replace[0]=params->getBooleanValue("replaceout",1);
  replace[1]=params->getBooleanValue("replacein",0);

  BIS_OT replacevalue[2];
  replacevalue[0]=(BIS_OT)params->getFloatValue("outvalue",0);
  replacevalue[1]=(BIS_OT)params->getFloatValue("invalue",1);
  


  if (debug) {
    std::cout << "Beginning actual Image Thresholding" << std::endl;
    std::cout << "Thresholding between : " << thresholds[0] << ":" << thresholds[1] << std::endl;
    std::cout << "Replace in =" << replace[1] << " replace out=" << replace[0] << std::endl;
    
    if (replace[1])
      std::cout << "Replacing in values with " << replacevalue[1] << std::endl; 

    if (replace[0])
      std::cout << "Replacing out values with " << replacevalue[0] << std::endl; 

  }
  
  std::unique_ptr<bisSimpleImage<BIS_OT> > out_image=bisImageAlgorithms::thresholdImage<BIS_IT,BIS_OT>(inp_image.get(),
											thresholds,replace,replacevalue);

  if (debug)
    std::cout << "Thresholding Done" << std::endl;
  
  return out_image->releaseAndReturnRawArray();
}


template <class BIS_IT> unsigned char* thresholdImageTemplate1(unsigned char* input,bisJSONParameterList* params,int debug,int output_type,BIS_IT*) {

  switch (output_type)
      {
	bisvtkTemplateMacro( return thresholdImageTemplate(input,params,debug,static_cast<BIS_IT*>(0),static_cast<BIS_TT*>(0)));
      }
  return 0;
}

unsigned char* thresholdImageWASM(unsigned char* input,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (header[1])
      {
	bisvtkTemplateMacro( return thresholdImageTemplate1(input,params.get(),debug,target_type,static_cast<BIS_TT*>(0)));
      }
  return 0;
}

// -------------------------------------------------------------------
// clusterThreshold Image
// -------------------------------------------------------------------
template <class BIS_TT> unsigned char* clusterThresholdImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*) {

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  float threshold=params->getFloatValue("threshold",100.0);
  int clustersize=params->getIntValue("clustersize",100);
  int oneconnected=params->getBooleanValue("oneconnected",1);
  int outputclusterno=params->getBooleanValue("outputclusterno",0);
  int frame=params->getIntValue("frame",0);
  int component=params->getIntValue("component",0);
  

  if (debug) {
    std::cout << "Beginning actual clusterThreshold" << std::endl;
    std::cout << "Threshold = " << threshold << " clustersize= " << clustersize << " oneconnected=" << oneconnected << std::endl;
  }

  if (outputclusterno)
    {
      if (debug)
	std::cout << " Outputing cluster number instead of cluster thresholding" << std::endl;
      std::unique_ptr<bisSimpleImage<short> > output_image(new bisSimpleImage<short>());
      std::vector<int> clusters;
      int maxsize=bisImageAlgorithms::createClusterNumberImage(inp_image.get(),threshold,oneconnected,
                                                               clustersize,
							       output_image.get(),
							       clusters,frame,component);

      if (debug)
	std::cout << "done, maxclustersize = " << maxsize << std::endl;
      return output_image->releaseAndReturnRawArray();
    }
      
  std::unique_ptr<bisSimpleImage<BIS_TT> > output_image(bisImageAlgorithms::clusterFilter(inp_image.get(),
											  clustersize,threshold,
											  oneconnected,
											  frame,component));
  
  if (debug)
    std::cout << "Cluster filter done " << std::endl;
  return output_image->releaseAndReturnRawArray();

}

unsigned char* clusterThresholdImageWASM(unsigned char* input,
				 const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return clusterThresholdImageTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;
}



// -------------------------------------------------------
// Legacy File Support
// -------------------------------------------------------
unsigned char* parseMatrixTextFileWASM(const char* input,int debug)
{
  Eigen::MatrixXf output;

  int ok=bisLegacyFileSupport::parseMatrixTextFile(input,output,debug);
  if (ok==0)
    {
      if (debug)
	std::cout << "parse failed returning zero matrix" << std::endl;
      output=Eigen::MatrixXf::Zero(1,1);
    }

  return bisEigenUtil::serializeAndReturn(output,"legacy_matrix");
}

unsigned char* createMatrixTextFileWASM(unsigned char* input_ptr,const char* name,int legacy,int debug)
{
  Eigen::MatrixXf input;
  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!bisEigenUtil::deserializeAndMapToEigenMatrix(s_matrix.get(),input_ptr,input,debug))
    {
      if (debug)
	std::cerr << "Failed to deserialize matrix pointer" << std::endl;
      return 0;
    }
  
  std::string out=bisLegacyFileSupport::writeMatrixTextFile(input,name,legacy,debug);
  if (debug)
    std::cout <<  out << std::endl;

  std::unique_ptr<bisSimpleVector<char> > outvect(bisLegacyFileSupport::storeStringInSimpleVector(out));
  return outvect->releaseAndReturnRawArray();
}


unsigned char* parseComboTransformTextFileWASM(const char* input,int debug)
{

  std::unique_ptr<bisComboTransformation> output(new bisComboTransformation());
  int ok=bisLegacyFileSupport::parseLegacyGridTransformationFile(input,output.get(),debug);

  if(debug)
    std::cout << " Parsed file for combo transformation status=" << ok << std::endl;

  return output->serialize();
}

unsigned char* createComboTransformationTextFileWASM(unsigned char* input_ptr,int debug)
{
  std::unique_ptr<bisComboTransformation> input(new bisComboTransformation());
  if (!input->deSerialize(input_ptr))
    {
      std::cerr << "Failed to serialize ptr for combo" << std::endl;
      return 0;
    }
  
  std::string s=bisLegacyFileSupport::writeLegacyGridTransformationFile(input.get(),debug);

  std::unique_ptr<bisSimpleVector<char> > outvect(bisLegacyFileSupport::storeStringInSimpleVector(s));
  return outvect->releaseAndReturnRawArray();

}



/** Crop an image using \link bisImageAlgorithms::cropImage \endlink
 * @param input serialized input as unsigned char array 
 * @param jsonstring the parameter string for the algorithm 
 * { "i0" : 0: ,"i1" : 100, "di" : 2, "j0" : 0: ,"j1" : 100, "dj" : 2,"k0" : 0: ,"k1" : 100, "dk" : 2, "t0" : 0: ,"t1" : 100, "dt" : 2 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to a serialized image
 */
// BIS: { 'cropImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
template <class BIS_TT> unsigned char* cropImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*) {

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int bounds[8];
  bounds[0]=params->getIntValue("i0",0);
  bounds[1]=params->getIntValue("i1",100);
  bounds[2]=params->getIntValue("j0",0);
  bounds[3]=params->getIntValue("j1",100);
  bounds[4]=params->getIntValue("k0",0);
  bounds[5]=params->getIntValue("k1",100);
  bounds[6]=params->getIntValue("t0",0);
  bounds[7]=params->getIntValue("t1",100);

  int incr[4];
  incr[0]=params->getIntValue("di",1);
  incr[1]=params->getIntValue("dj",1);
  incr[2]=params->getIntValue("dk",1);
  incr[3]=params->getIntValue("dt",1);
  
  if (debug) {
    std::cout << "Beginning actual Image Cropping" << std::endl;
    std::cout << "Crop Regions : ";
    for (int i=0;i<=3;i++) 
      std::cout << bounds[2*i] << ":" << bounds[2*i+1] << " (incr=" << incr[i] << ") ";
    std::cout << std::endl;
  }
  
  std::unique_ptr<bisSimpleImage<BIS_TT> > out_image=bisImageAlgorithms::cropImage(inp_image.get(),bounds,incr);

  if (debug)
    std::cout << "Croping Done" << std::endl;
  
  return out_image->releaseAndReturnRawArray();
}

unsigned char* cropImageWASM(unsigned char* input,
				 const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return cropImageTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;
}


/** Flip an image using \link bisImageAlgorithms::flipImage \endlink
 * @param input serialized input as unsigned char array 
 * @param jsonstring the parameter string for the algorithm { "flipi" : 0, "flipj" : 0 , "flipk" : 0 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to a serialized image
 */
// BIS: { 'flipImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
template <class BIS_TT> unsigned char* flipImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*) {

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;


  int flip[3];
  flip[0]=params->getBooleanValue("flipi",1);
  flip[1]=params->getBooleanValue("flipj",1);
  flip[2]=params->getBooleanValue("flipk",1);
  
  if (debug) {
    std::cout << "Beginning actual Image Flipping" << std::endl;
    std::cout << "Flip Axis: " << flip[0] << ", " << flip[1] << ", " << flip[2] << std::endl;
  }
  
  std::unique_ptr<bisSimpleImage<BIS_TT> > out_image=bisImageAlgorithms::flipImage(inp_image.get(),flip);
  if (debug)
    std::cout << "Fliping Done" << std::endl;
  
  return out_image->releaseAndReturnRawArray();
}

unsigned char*  flipImageWASM(unsigned char* input,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return flipImageTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;
}

/** Blank an image using \link bisImageAlgorithms::blankImage \endlink
 * @param input serialized input as unsigned char array 
 * @param jsonstring the parameter string for the algorithm 
 * { "i0" : 0: ,"i1" : 100,  "j0" : 0: ,"j1" : 100, "k0" : 0: ,"k1" : 100 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to a serialized image
 */
// BIS: { 'blankImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
template <class BIS_TT> unsigned char* blankImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*) {

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int bounds[6];
  bounds[0]=params->getIntValue("i0",0);
  bounds[1]=params->getIntValue("i1",100);
  bounds[2]=params->getIntValue("j0",0);
  bounds[3]=params->getIntValue("j1",100);
  bounds[4]=params->getIntValue("k0",0);
  bounds[5]=params->getIntValue("k1",100);
  float outside=params->getFloatValue("outside",0.0);
  
  if (debug) {
    std::cout << "Beginning actual Image Blanking" << std::endl;
    std::cout << "Blank Regions : ";
    for (int i=0;i<=2;i++) 
      std::cout << bounds[2*i] << ":" << bounds[2*i+1] << "  ";
    std::cout << " outside=" << outside << std::endl;
  }
  
  std::unique_ptr<bisSimpleImage<BIS_TT> > out_image=bisImageAlgorithms::blankImage(inp_image.get(),bounds,outside);

  if (debug)
    std::cout << "Blanking Done" << std::endl;
  
  return out_image->releaseAndReturnRawArray();
}

unsigned char* blankImageWASM(unsigned char* input,
				 const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (target_type)
      {
	bisvtkTemplateMacro( return blankImageTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;
}



// -----------------------------------------------------------------------------------------------------
// Dilate,Erode,Median
// -----------------------------------------------------------------------------------------------------
  unsigned char* morphologyOperationWASM(unsigned char* input,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  std::unique_ptr<bisSimpleImage<unsigned char> > input_image(new bisSimpleImage<unsigned char>("input_image"));
  // This 1 at the end means "copy data" as this is an in/out function
  if (!input_image->linkIntoPointer(input,1))
    return 0;

  int do3d=params->getBooleanValue("3d",1);
  int radius=params->getIntValue("radius",1);
  std::string operation=params->getValue("operation","median");
  int mode=2;
  
  if (operation=="dilate") {
    mode=1;
  } else if (operation=="erode") {
    mode=0;
  } else {
    operation="median";
    mode=2;
  }
  
  if (debug) {
    std::cout << "Morphology Operation: " << operation << "(" << mode << "), radius=" << radius << " in3d=" << do3d << std::endl;
    std::cout << "-----------------------------------" << std::endl;
  }

  
  std::unique_ptr<bisSimpleImage<unsigned char> > out_image(bisSimpleImageSegmentationAlgorithms::doBinaryMorphology(input_image.get(),mode,radius,do3d));
  if (debug)
    std::cout << std::endl << "..... Morphology Operation " << operation  << "(" << mode << ") done." << std::endl;
  return out_image->releaseAndReturnRawArray();
}

// -----------------------------------------------------------------------------------------------------
// seedConnectivity
// -----------------------------------------------------------------------------------------------------
unsigned char* seedConnectivityWASM(unsigned char* input,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  std::unique_ptr<bisSimpleImage<unsigned char> > input_image(new bisSimpleImage<unsigned char>("input_image"));
  // This 1 at the end means "copy data" as this is an in/out function
  if (!input_image->linkIntoPointer(input,1))
    return 0;

  int oneconnected=params->getBooleanValue("oneconnected",1);
  int seed[3];
  seed[0]=params->getIntValue("seedi",50);
  seed[1]=params->getIntValue("seedj",50);
  seed[2]=params->getIntValue("seedk",50);
  
  if (debug) {
    std::cout << "Seed Connectivity. seed=(" << seed[0] << ", "  << seed[1] << ", " << seed[2] << ") oneconnected=" << oneconnected << std::endl;
    std::cout << "-----------------------------------" << std::endl;
  }

  std::unique_ptr<bisSimpleImage<unsigned char> > out_image(bisSimpleImageSegmentationAlgorithms::seedConnectivityAlgorithm(input_image.get(),seed,1));
  
  if (debug)
    std::cout << std::endl << "..... Seed Connectivity done " << std::endl;
  return out_image->releaseAndReturnRawArray();
}

// BIS: { 'niftiMat44ToQuaternionWASM', 'Matrix', [ 'Matrix', 'debug' ] }  
unsigned char* niftiMat44ToQuaternionWASM(unsigned char* input_ptr,int debug) {

  Eigen::MatrixXf input;
  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!bisEigenUtil::deserializeAndMapToEigenMatrix(s_matrix.get(),input_ptr,input,debug))
    return 0;

  Eigen::MatrixXf output;

  bisLegacyFileSupport::convertMat44ToQuatern(input,output,debug);
  return bisEigenUtil::serializeAndReturn(output,"quatern_matrix");
}

// -------------------------------------------------------------------
// ShiftScale Image
// -------------------------------------------------------------------
template <class BIS_IT,class BIS_OT> unsigned char* shiftScaleImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_IT*,BIS_OT*) {

  std::unique_ptr<bisSimpleImage<BIS_IT> > inp_image(new bisSimpleImage<BIS_IT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  double shift=params->getFloatValue("shift",0.0);
  double scale=params->getFloatValue("scale",1.0);

  if (debug) {
    std::cout << "Beginning actual Image Shift+Scale" << std::endl;
    std::cout << "Shift=" << shift << ", scale=" << scale << std::endl;
  }

  std::unique_ptr<bisSimpleImage<BIS_OT> > out_image=bisImageAlgorithms::shiftScaleImage<BIS_IT,BIS_OT>(inp_image.get(),shift,scale);

  
  if (debug)
    std::cout << "Shift+Scale Done" << std::endl;
  
  return out_image->releaseAndReturnRawArray();
}


template <class BIS_IT> unsigned char* shiftScaleImageTemplate1(unsigned char* input,bisJSONParameterList* params,int debug,int output_type,BIS_IT*) {

  switch (output_type)
      {
	bisvtkTemplateMacro( return shiftScaleImageTemplate(input,params,debug,static_cast<BIS_IT*>(0),static_cast<BIS_TT*>(0)));
      }
  return 0;
}

unsigned char* shiftScaleImageWASM(unsigned char* input,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);

  switch (header[1])
      {
	bisvtkTemplateMacro( return shiftScaleImageTemplate1(input,params.get(),debug,target_type,static_cast<BIS_TT*>(0)));
      }
  return 0;
}


/** MedianNormalize an image using \link bisImageAlgorithms::medianNormalizeImage \endlink
 * @param input serialized input as unsigned char array 
 * @param debug if > 0 print debug messages
 * @returns a pointer to a serialized image
 */
// BIS: { 'medianNormalizeImageWASM', 'bisImage', [ 'bisImage', 'debug' ] } 
template <class BIS_TT> unsigned char* medianNormalizeImageTemplate(unsigned char* input,int debug,BIS_TT*) {

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<float> > out_image(bisImageAlgorithms::medianNormalizeImage<BIS_TT>(inp_image.get(),debug));
  
  if (debug)
    std::cout << "MedianNormalizing Done" << std::endl;
  
  return out_image->releaseAndReturnRawArray();
}

unsigned char* medianNormalizeImageWASM(unsigned char* input,int debug)
{
  int* header=(int*)input;
  int target_type=header[1];
  
  switch (target_type)
    {
      bisvtkTemplateMacro( return medianNormalizeImageTemplate(input,debug, static_cast<BIS_TT*>(0)));
    }
  return 0;
}

// --------------------------------------------------------------- ------------------------------------------------------------------
// weighted (optionally) Regress Out
// --------------------------------------------------------------- ------------------------------------------------------------------
unsigned char* weightedRegressOutImageWASM(unsigned char* input_ptr,unsigned char* regressor_ptr,unsigned char* weights_ptr,int debug)
{
  if (debug)
    std::cout << std::endl << "______ in weighted RegressOutImage  weights=" << (BISLONG)weights_ptr << std::endl;
  
  std::unique_ptr<bisSimpleImage<float> > in_image(new bisSimpleImage<float>("input"));
  if (!in_image->linkIntoPointer(input_ptr))
    return 0;
  
  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("filtered_output_float"));
  out_image->copyStructure(in_image.get());
  
  std::unique_ptr<bisSimpleMatrix<float> > s_regressors(new bisSimpleMatrix<float>("regrmatrix"));
  if (!s_regressors->linkIntoPointer(regressor_ptr))
    {
      std::cerr << "Failed to deserialize regressor matrix" << std::endl;
      return 0;
    }
  
  int useweights=0;
  Eigen::VectorXf weights;
  std::unique_ptr<bisSimpleVector<float> > s_vector(new bisSimpleVector<float>("vector"));
  if (bisEigenUtil::deserializeAndMapToEigenVector(s_vector.get(),weights_ptr,weights,0,1.0,1)<1)
    return 0;
  if (weights.rows()>=2)
    useweights=1;

  if (debug) {
    std::cout << "Regress Out Image useweights=" << useweights << std::endl;
  }
  
  
  Eigen::MatrixXf regressors=bisEigenUtil::mapToEigenMatrix(s_regressors.get());


  int dim[5]; in_image->getDimensions(dim);
  Eigen::MatrixXf input=  Eigen::MatrixXf::Zero(dim[3],1);
  Eigen::MatrixXf output=  Eigen::MatrixXf::Zero(dim[3],1);
  int ok=1;

  Eigen::MatrixXf LSQ;
  Eigen::MatrixXf temp;
  Eigen::MatrixXf weightedR;
  
   if (useweights==0)
     {
       LSQ=bisEigenUtil::createLSQMatrix(regressors);
     }
   else
     {
       LSQ=bisfMRIAlgorithms::createWeightedLSQ(regressors,weights,weightedR);
     }
   
   
   int numvoxels=dim[0]*dim[1]*dim[2];
   float* indata=in_image->getImageData();
   float* outdata=out_image->getImageData();
   
   for (int i=0;i<numvoxels;i++)
     {
       for (int f=0;f<dim[3];f++) {
         input(f,0)=indata[numvoxels*f+i];
       }
       
       if (useweights==0)
         ok*=bisfMRIAlgorithms::regressOut(input,regressors,LSQ,output);
       else
         ok*=bisfMRIAlgorithms::weightedRegressOut(input,weightedR,weights,LSQ,
                                                   temp, output);
       for (int f=0;f<dim[3];f++) {
         outdata[numvoxels*f+i]=output(f,0);
       }
     }
   
   if (debug)
     std::cout << "regressedOUTImage done " << ok << std::endl;

   return out_image->releaseAndReturnRawArray();
}



unsigned char* computeSeedCorrelationImageWASM(unsigned char* input_ptr,unsigned char* roi_ptr,unsigned char* weights_ptr,const char* jsonstring,int debug) {


  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  if(debug)
    params->print("computeSeedCorrelationImageJSON","_____");

  int toz=params->getBooleanValue("toz",0);

  Eigen::MatrixXf seeds;
  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!bisEigenUtil::deserializeAndMapToEigenMatrix(s_matrix.get(),roi_ptr,seeds,debug))
    return 0;
  
  
  Eigen::VectorXf weights;
  std::unique_ptr<bisSimpleVector<float> > s_vector(new bisSimpleVector<float>("vector"));
  if (bisEigenUtil::deserializeAndMapToEigenVector(s_vector.get(),weights_ptr,weights,seeds.rows(),1.0,1)<1)
    return 0;
  
  if (debug)
    std::cout << "To Z = " << toz << std::endl;

  std::unique_ptr<bisSimpleImage<float> > in_image(new bisSimpleImage<float>("input"));
  if (!in_image->linkIntoPointer(input_ptr))
    return 0;
  
  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("filtered_output_float"));


  int ok=bisfMRIAlgorithms::computeSeedMapImage(in_image.get(),seeds,toz,weights,out_image.get());
  if (debug)
    std::cout << "SeedCorrelationMapping done " << ok << std::endl;

  return out_image->releaseAndReturnRawArray();
  
}


/** Perform time series normalization 
 * @param input 4d image
 * @param debug if > 0 print debug messages
 * @returns a pointer to a (unsigned char) serialized timeseries normalized image
 */
// BIS: { 'timeSeriesNormalizeImageWASM', 'bisImage', [ 'bisImage', 'debug' ] } 
unsigned char* timeSeriesNormalizeImageWASM(unsigned char* input,int debug) {

  std::unique_ptr<bisSimpleImage<float> > in_image(new bisSimpleImage<float>("input_float"));
  if (!in_image->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("smooth_output_float"));
  out_image->copyStructure(in_image.get());

  if (debug) {
    int dim[5];
    in_image->getDimensions(dim);
    std::cout << "beginning timeSeriesNormalizeImage dim=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
  }
  
  int ok=bisfMRIAlgorithms::normalizeTimeSeriesImage(in_image.get(),out_image.get());
  if (debug)
    std::cout << "timeSeriesNormalizeImage done " << ok << std::endl;
  
  return out_image->releaseAndReturnRawArray();
}

/**
 * Transform Surface
 */
unsigned char* transformSurfaceWASM(unsigned char* input,unsigned char* xform,int debug) {
  std::unique_ptr<bisSurface > surface(new bisSurface("surface"));
  if (!surface->deSerialize(input))
    {
      std::cerr << "Failed to deserialize surface" << std::endl;
      return 0;
    }

  std::shared_ptr<bisAbstractTransformation> warpXform=bisDataObjectFactory::deserializeTransformation(xform,"warpxform");
  if (warpXform.get()==0) {
    std::cerr << "Failed to deserialize transformation " << std::endl;
    return 0;
  }

  std::unique_ptr<bisSurface> output(new bisSurface("output"));
  if (surface->getTriangles())
    output->setTriangles(surface->getTriangles());
  if (surface->getTriangleData())
    output->setTriangleData(surface->getTriangleData());
  if (surface->getPointData())
    output->setPointData(surface->getPointData());

  if (surface->getPoints()) {
    std::shared_ptr<bisSimpleMatrix<float> > newpoints(bisPointRegistrationUtils::transformPoints(surface->getPoints().get(),
                                                                                                  warpXform.get(),debug));
    output->setPoints(newpoints);
  }

  unsigned char* outstr=output->serialize();
  return outstr;
}
