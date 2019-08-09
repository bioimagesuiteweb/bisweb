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

// This derives from Javid's code
// ...


#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisDefinitions.h"
#include "bisUtil.h"
#include "math.h"
#include <vector>

/** @file bisCPM.h

    Implements Connectome Predictive Modelling

*/

#ifndef _bis_CPM_h
#define _bis_CPM_h


extern "C" {

  /** Individualizes a group parcellation using a new 4D fmri Image
   * @param stackedmatrix stacked connectome matrix each rows is lower diagonal of connectome for each subject
   * @param behaviorvector vector of behavior measures
   * @param jsonstring the parameter string for the algorithm 
   * { "threshold" : 0.01, "kfold" : 10, "numtasks" : 0 , "numnodes" : 268, "lambda" : 0.0001}
   * @param debug if > 0 print debug messages
   * @returns a pointer to a serialized vector
   */
  // BIS: { 'computeCPMWASM', 'Matrix', [ 'Matrix', 'Matrix', 'ParamObj', 'debug' ] }
  BISEXPORT unsigned char* computeCPMWASM(unsigned char* stackedmatrix, unsigned char* behaviorvector,const char* jsonstring,int debug);

}


#endif
