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

#include "bisIdentityTransformation.h"


bisIdentityTransformation::bisIdentityTransformation(std::string n): bisMatrixTransformation(n) {
  this->identity();
  this->class_name="bisIdentityTransformation";
}

bisIdentityTransformation::~bisIdentityTransformation(){

}


void bisIdentityTransformation::transformPointToVoxel(float X[3],float TX[3],float spa[3])
{
  TX[0] = X[0]/spa[0];
  TX[1] = X[1]/spa[1];
  TX[2] = X[2]/spa[2];
}

void bisIdentityTransformation::transformPoint(float X[3],float TX[3])
{
  TX[0] = X[0];
  TX[1] = X[1];
  TX[2] = X[2];
}

void bisIdentityTransformation::computeDisplacement(float* ,float U[3])
{
  U[0]=0.0, U[1]=0.0,U[2]=0.0;
}

