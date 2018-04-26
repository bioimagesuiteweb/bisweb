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

#include "bisReplacementExportedFunctions.h"
#include <iostream>

// --------------------------------------------------------------------------------------------------------------------------------------------------------
// Linear Image Registration
// --------------------------------------------------------------------------------------------------------------------------------------------------------

int uses_gpl() {
  return 0;
}

unsigned char* runLinearRegistrationWASM(unsigned char* ,
					 unsigned char* ,
					 unsigned char* _ptr,
					 const char* ,
					 int )
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}

// --------------------------------------------------------------------------------------------------------------------------------------------------------
// Non Linear Image Registration
// --------------------------------------------------------------------------------------------------------------------------------------------------------

unsigned char* runNonLinearRegistrationWASM(unsigned char* ,
					    unsigned char* ,
					    unsigned char* _ptr,
					    const char* ,
					    int )
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}



unsigned char* segmentImageWASM(unsigned char* ,
                                const char* ,int)
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}

// ------------------------------------------------------------------------------------
unsigned char* approximateDisplacementFieldWASM(unsigned char* ,
						unsigned char* _ptr,
						const char*,
						int )
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}

// ------------------------------------------------------------------------------------
unsigned char* approximateDisplacementFieldWASM2(unsigned char* ,
						 const char* ,
						 int )
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}
// -----------------------------------------------------------------------------------------------------
// Regularize Objectmap
// -----------------------------------------------------------------------------------------------------
  unsigned char* regularizeObjectmapWASM(unsigned char* input,const char* jsonstring,int debug)
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}

int  test_optimizer(int numparam) {

  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}  

// -----------------------------------------------------------------------------------------------------
// DTI Code
// -----------------------------------------------------------------------------------------------------

unsigned char* computeDTITensorFitWASM(unsigned char* ,
                                       unsigned char* ,
                                       unsigned char* ,
                                       unsigned char* ,
                                       const char* ,
                                       int)
{
    std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}


/** Stub Function */
unsigned char* computeTensorEigenSystemWASM(unsigned char* ,
                                            unsigned char* ,
                                            int )
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}



/** Stub Function */
unsigned char* computeDTITensorInvariantsWASM(unsigned char* ,
                                              unsigned char* ,
                                              const char* ,
                                              int )
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}


/** Stub Function */
unsigned char* computeDTIColorMapImageWASM(unsigned char* ,
                                           unsigned char* ,
                                           unsigned char*,
                                           const char* ,
                                           int )
{
  std::cout << "_____ This is simply a stub function. The actual code can be obtained from the plugin repository https://github.com/bioimagesuiteweb/gplcppcode. To use this code see the instructions in the README.md file of the main cpp directory." << std::endl;
  return 0;
}

