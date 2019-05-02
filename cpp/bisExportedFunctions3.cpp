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

#include "bisExportedFunctions3.h"
#include "bisJSONParameterList.h"
#include "bisDataObjectFactory.h"
#include <memory>


/** AddGridTo an image using \link bisAdvancedImageAlgorithms::addGridToImage \endlink
 * @param input serialized input as unsigned char array 
 * @param jsonstring the parameter string for the algorithm 
 * { "gap" : 8, "value" 2.0 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to a serialized image
 */

unsigned char* individualizeParcellation(unsigned char* input, unsigned char* groupparcellation,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if (debug)
    params->print();

  std::unique_ptr<bisSimpleImage<float> > inp_image(new bisSimpleImage<float>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<short> > parc_image(new bisSimpleImage<short>("parc_image"));
  if (!inp_image->linkIntoPointer(groupparcellation))
    return 0;

  int numexemplars=params->getIntValue("numberofexemplars",268);
  
  if (debug) 
    std::cout << "Beginning actual individualizedparcellation : numexemplars=" << numexemplars <<   std::endl;

  
  //std::unique_ptr<bisSimpleImage<unsigned char> > out_image=bisAdvancedImageAlgorithms::addGridToImage(inp_image.get(),gap,value);
  
  if (debug)
    std::cout << "individualized Parcellation Done" << std::endl;
  
  return NULL;//out_image->releaseAndReturnRawArray();

}
