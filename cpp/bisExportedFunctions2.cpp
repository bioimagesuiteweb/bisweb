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

#include "bisImageAlgorithms.h"
#include "bisAdvancedImageAlgorithms.h"
#include "bisExportedFunctions2.h"
#include "bisJSONParameterList.h"
#include "bisMatrixTransformation.h"
#include "bisDataObjectFactory.h"
#include <memory>


/** AddGridTo an image using \link bisAdvancedImageAlgorithms::addGridToImage \endlink
 * @param input serialized input as unsigned char array 
 * @param jsonstring the parameter string for the algorithm 
 * { "gap" : 8, "value" 2.0 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to a serialized image
 */
// BIS: { 'addGridToImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
template <class BIS_TT> unsigned char* addGridToImageTemplate(unsigned char* input,bisJSONParameterList* params,int debug,BIS_TT*) {

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int gap=params->getIntValue("gap",8);
  float value=params->getFloatValue("value",2.0);

  
  if (debug) 
    std::cout << "Beginning actual addGridToImage : gap=" << gap << " intensity value=" << value << std::endl;

  
  std::unique_ptr<bisSimpleImage<unsigned char> > out_image(bisAdvancedImageAlgorithms::addGridToImage(inp_image.get(),gap,value));
  
  if (debug)
    std::cout << "addGridToImage Done" << std::endl;
  
  return out_image->releaseAndReturnRawArray();
}

unsigned char* addGridToImageWASM(unsigned char* input, const char* jsonstring,int debug)
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
	bisvtkTemplateMacro( return addGridToImageTemplate(input,params.get(),debug, static_cast<BIS_TT*>(0)));
      }
  return 0;
}



/** Project an image using \link bisImageAlgorithms::flipImage \endlink
 * @param input serialized input as unsigned char array 
 * @param jsonstring the parameter string for the algorithm { "projecti" : 0, "projectj" : 0 , "projectk" : 0 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to a serialized image
 */
// BIS: { 'projectImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
template <class BIS_TT> unsigned char* projectImageTemplate(unsigned char* input_ptr,unsigned char* mask_ptr,bisJSONParameterList* params,int debug,BIS_TT*) {

  std::unique_ptr<bisSimpleImage<BIS_TT> > inp_image(new bisSimpleImage<BIS_TT>("inp_image"));
  if (!inp_image->linkIntoPointer(input_ptr)) 
    return 0;

  int usemask=0;
  std::unique_ptr<bisSimpleImage<BIS_TT> > mask_input(new bisSimpleImage<BIS_TT>("mask_json"));
  if (mask_ptr) {
    if (!mask_input->linkIntoPointer(mask_ptr))
      return 0;
    usemask=1;
  }
  
  int domip=params->getBooleanValue("domip",0);
  int flip=params->getBooleanValue("flip",0);
  int lps=params->getBooleanValue("lps",0);
  int axis=params->getIntValue("axis",1);
  float sigma=params->getFloatValue("sigma",1.0);
  float threshold=params->getFloatValue("threshold",0.05);
  float gradsigma=params->getFloatValue("gradsigma",1.0);
  int window=params->getIntValue("window",5);
  if (debug) {
    std::cout << "Beginning actual Image Projecting" << std::endl;
  }

  if (!usemask) {
    std::unique_ptr<bisSimpleImage<BIS_TT> > out_image(bisAdvancedImageAlgorithms::projectImage(inp_image.get(),
                                                                                                domip,axis,flip,lps,sigma,threshold,gradsigma,window,debug));
    if (debug)
      std::cout << "Projecting Done" << std::endl;
    
    return out_image->releaseAndReturnRawArray();
  }

  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("output_proj"));
  int flag=bisAdvancedImageAlgorithms::projectImageWithMask(inp_image.get(),mask_input.get(),out_image.get(),
                                                            axis,flip,lps,gradsigma,window);
  if (debug)
    std::cout << "Mask Projecting Done ok=" << flag << std::endl;
  if (!flag)
    return 0;
    
  return out_image->releaseAndReturnRawArray();
}

unsigned char*  projectImageWASM(unsigned char* input,unsigned char* funcinput,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if(debug)
    params->print();

  int* header=(int*)input;
  int target_type=bisDataTypes::getTypeCodeFromName(params->getValue("datatype"),header[1]);


  int domip=params->getBooleanValue("domip",0);
  if (domip)
    {
      switch (target_type)
	{
	  bisvtkTemplateMacro( return projectImageTemplate(input,funcinput,params.get(),debug, static_cast<BIS_TT*>(0)));
	}
      return 0;
    }

  
  return projectImageTemplate<float>(input,funcinput,params.get(),debug, 0);

}


  /** Projects and averages a 3D image (inside a mask) to 2D 
   * @param input serialized input as unsigned char array 
   * @param functional_input serialized functional input (optional) as unsigned char array 
   * @param jsonstring the parameter string for the algorithm 
   * { "axis" : -1,  lps = 0 }
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized image
   */

unsigned char*  projectAverageImageWASM(unsigned char* input_ptr,unsigned char* mask_ptr,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;
  
  if(debug)
    params->print();

  std::unique_ptr<bisSimpleImage<float> > inp_image(new bisSimpleImage<float>("inp_image"));
  if (!inp_image->linkIntoPointer(input_ptr)) 
    return 0;

  std::unique_ptr<bisSimpleImage<float> > mask_input(new bisSimpleImage<float>("mask_json"));
  if (!mask_input->linkIntoPointer(mask_ptr))
    return 0;
  
  int lps=params->getBooleanValue("lps",0);
  int axis=params->getIntValue("axis",1);
  
  if (debug) 
    std::cout << "Beginning actual Image Project+Averaging" << std::endl;

  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("output_proj"));
  int flag=bisAdvancedImageAlgorithms::projectAverageImageWithMask(inp_image.get(),mask_input.get(),out_image.get(),
                                                                   axis,lps);
  if (debug)
    std::cout << "Mask Projecting+Averaging Done ok=" << flag << std::endl;
  if (!flag)
    return 0;
    
  return out_image->releaseAndReturnRawArray();
}



// BIS: { 'backProjectImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ] } 
unsigned char*  backProjectImageWASM(unsigned char* input_ptr,unsigned char* input2d_ptr,const char* jsonstring,int debug) {

  debug=1;
  
  if (debug)
    std::cout << "_____ Beginning backProjectImageWASM" << jsonstring << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring)) {
    std::cout << "_____ Failed to parse parameters in backProjectImageWASM" << std::endl;
    return 0;
  }
  
  if(debug)
    params->print("from backProjectImageWASM","_____");

  std::unique_ptr<bisSimpleImage<float> > threed(new bisSimpleImage<float>("threed"));

  if (!threed->linkIntoPointer(input_ptr)) {
    std::cout << "_____ Failed to link into input_ptr in backProjectImageWASM" << std::endl;
    return 0;
  }

  std::unique_ptr<bisSimpleImage<float> > twod(new bisSimpleImage<float>("twod"));
  if (!twod->linkIntoPointer(input2d_ptr)) {
    std::cout << "_____ Failed to link into two2d_ptr in backProjectImageWASM" << std::endl;
    return 0;
  }


  int flipz=params->getBooleanValue("flip",0);
  int flipy=params->getBooleanValue("flipy",0);
  int axis=params->getIntValue("axis",1);
  float threshold=params->getFloatValue("threshold",0.05);
  int window=params->getIntValue("window",5);
  if (debug) {
    std::cout << "Beginning actual Image Back Projecting" << std::endl;
  }
  
  std::unique_ptr<bisSimpleImage<float> > out_image(bisAdvancedImageAlgorithms::backProjectImage(threed.get(),twod.get(),axis,flipz,flipy,threshold,window));
  if (debug)
    std::cout << "Back Projecting Done" << std::endl;
  
  return out_image->releaseAndReturnRawArray();

}



  // BIS: { 'computeBackProjectAndProjectPointPairsWASM', 'Matrix', [ 'bisImage', 'bisTransformation', 'bisTransformation',  'ParamObj', 'debug' ] } 
unsigned char*  computeBackProjectAndProjectPointPairsWASM(unsigned char* input_ptr,unsigned char* xform_ptr,unsigned char* rotation_ptr,const char* jsonstring,int debug) {

  if (debug)
    std::cout << "_____ Beginning computeBackProjectAndProjectPointPairsWASM" << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring)) {
    std::cout << "_____ Failed to parse parameters in computeBackProjectAndProjectPointPairsWASM" << std::endl;
    return 0;
  }
  
  if(debug)
    params->print("from computeBackProjectAndProjectPointPairsWASM","_____");

  std::unique_ptr<bisSimpleImage<float> > threed(new bisSimpleImage<float>("threed"));

  if (!threed->linkIntoPointer(input_ptr)) {
    std::cout << "_____ Failed to link into input_ptr in computeBackProjectAndProjectPointPairsWASM" << std::endl;
    return 0;
  }

  std::shared_ptr<bisAbstractTransformation> warpXform=bisDataObjectFactory::deserializeTransformation(xform_ptr,"warpxform");
  if (warpXform.get()==0) {
    std::cerr << "Failed to deserialize transformation " << std::endl;
    return 0;
  }

  std::shared_ptr<bisAbstractTransformation> rotation=bisDataObjectFactory::deserializeTransformation(rotation_ptr,"rotation");
  if (rotation.get()==0) {
    std::cerr << "Failed to deserialize rotation " << std::endl;
    return 0;
  }

  int flipz=params->getBooleanValue("flip",0);
  int flipy=params->getBooleanValue("flipy",0);
  int axis=params->getIntValue("axis",1);
  float threshold=params->getFloatValue("threshold",0.05);
  int depth=params->getIntValue("depth",0);
  int height2d=params->getIntValue("2dheight",200);
  float spacing2d=params->getFloatValue("2dspacing",0.1);  
  
  if (debug) {
    std::cout << "Beginning actual Image Back Pair Making" << std::endl;
  }

  std::unique_ptr<bisSimpleMatrix<float> > out_matrix(new bisSimpleMatrix<float>());
  
  bisAdvancedImageAlgorithms::computeBackProjectAndProjectPointPairs(threed.get(),
                                                                     warpXform.get(),
                                                                     rotation.get(),
                                                                     out_matrix.get(),
                                                                     axis,flipz,flipy,threshold,depth,height2d,spacing2d,debug);
if (debug)
    std::cout << "Back Projecting Pair Done" << std::endl;
  
  return out_matrix->releaseAndReturnRawArray();

}

  // BIS: { 'projectMapImageWASM', 'bisImage', [ 'bisImage', 'bisImage','Matrix', 'debug' ] }
BISEXPORT unsigned char*  projectMapImageWASM(unsigned char* ref_ptr,unsigned char* input_ptr,unsigned char* matrix_ptr,int debug) {

  if (debug)
    std::cout << "_____ Beginning projectMapImageWASM" << std::endl;
  
  std::unique_ptr<bisSimpleImage<float> > ref(new bisSimpleImage<float>("ref"));
  if (!ref->linkIntoPointer(ref_ptr)) {
    std::cout << "_____ Failed to link into ref_ptr in projectMapImageWasm" << std::endl;
    return 0;
  }

  std::unique_ptr<bisSimpleImage<float> > input(new bisSimpleImage<float>("ref"));
  if (!input->linkIntoPointer(input_ptr)) {
    std::cout << "_____ Failed to link into input_ptr in projectMapImageWasm" << std::endl;
    return 0;
  }

  std::unique_ptr<bisSimpleMatrix<float> > mapmatrix(new bisSimpleMatrix<float>("matr"));
  if (!mapmatrix->linkIntoPointer(matrix_ptr)) {
    std::cout << "_____ Failed to link into matrix_ptr in projectMapImageWasm" << std::endl;
    return 0;
  }

  std::unique_ptr<bisSimpleImage<float> > out_image(bisAdvancedImageAlgorithms::projectMapImage(ref.get(),
                                                                                                input.get(),
                                                                                                mapmatrix.get(),debug));
                                                                                                
  return out_image->releaseAndReturnRawArray();

}
