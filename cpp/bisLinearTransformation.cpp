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

#include "bisLinearTransformation.h"
#include "math.h"
#include <iostream>

const int LINEAR_LOOKUP_2D[6]={ 0,1,5,6,7,9};

bisLinearTransformation::bisLinearTransformation(std::string name) : bisMatrixTransformation(name) {

  this->mode=0;
  this->inPlaceIdentity(this->pre_matrix);
  this->inPlaceIdentity(this->temp[0]);
  this->inPlaceIdentity(this->temp[1]);
  this->inPlaceIdentity(this->mshift1);
  this->inPlaceIdentity(this->mshift2);
  this->inPlaceIdentity(this->matrix);
  this->identity();
  this->class_name="bisLinearTransformation";
}

bisLinearTransformation::~bisLinearTransformation() { }

void bisLinearTransformation::eulerXYZRotationMatrix(float* theta,int offset,bisUtil::mat44 out)
{

  this->inPlaceIdentity(out);
  
  float rad[3]={0,0,0};
  for (int i=0;i<=2;i++)
    rad[i]=float((bisUtil::PI*theta[i+offset])/180.0);

  /*
    float calpha=cosf(rad[2]),salpha=sinf(rad[2]);
    float cbeta =cosf(rad[1]),sbeta=sinf(rad[1]);
    float cgamma=cosf(rad[0]),sgamma=sinf(rad[0]);

    float sbeta_cgamma=sbeta*cgamma;
    float sbeta_sgamma=sbeta*sgamma;
	
    out[0][0]= calpha*cbeta;
    out[0][1]= calpha*sbeta_sgamma-salpha*cgamma;
    out[0][2]= calpha*sbeta_cgamma+salpha*sgamma;
  
    out[1][0]= salpha*cbeta;
    out[1][1]= salpha*sbeta_sgamma+calpha*cgamma;
    out[1][2]= salpha*sbeta_cgamma-calpha*sgamma;
  
    out[2][0]= -sbeta;
    out[2][1]= cbeta*sgamma;
    out[2][2]= cbeta*cgamma;*/

  float cz=cosf(rad[2]),sz=sinf(rad[2]);
  float cy =cosf(rad[1]),sy=sinf(rad[1]);
  float cx=cosf(rad[0]),sx=sinf(rad[0]);

  out[0][0]= cy*cz;
  out[0][1]= cy*sz;
  out[0][2]= sy;

  out[1][0]= - cx*sz - cz*sx*sy;
  out[1][1]= cx*cz - sx*sy*sz;
  out[1][2]= cy*sx;

  out[2][0]= sx*sz - cx*cz*sy;
  out[2][1]= - cz*sx - cx*sy*sz;
  out[2][2] = cx*cy;
}

void bisLinearTransformation::inPlaceMatrixMultiply(bisUtil::mat44 a,bisUtil::mat44 b,bisUtil::mat44 result)
{
  const int l=4;
  for (int row=0;row<l;row++) {
    for (int col=0;col<l;col++) {
      result[row][col]=0.0;
      for (int index=0;index<l;index++)
        result[row][col]+=a[row][index]*b[index][col];
    }  
  }
}


int bisLinearTransformation::getOutputLength(int n1,int n2,int rigidOnly)
{
  if (rigidOnly)
    return 6;
  
  if (n2<n1)
    n1=n2;
  return n1;
}


void bisLinearTransformation::seriesMultiply(bisUtil::mat44* arr[6],int maxnum)
{
  int l=maxnum,index=0,i,j;
  this->inPlaceMatrixMultiply(*arr[l-2],*arr[l-1],this->temp[0]);
  for (i=l-3;i>=0;i=i-1) {
    if (i>0) {
      this->inPlaceMatrixMultiply(*arr[i],this->temp[index],this->temp[1-index]);
    } else {
      this->inPlaceMatrixMultiply(*arr[i],this->temp[index],this->matrix);
    }
    index=1-index;
  }
  
  for (i=0;i<=3;i++) {
    for (j=0;j<=3;j++) {
      if (fabs(this->matrix[i][j])<0.00001)
        this->matrix[i][j]=0.0;
    }
  }
}


void bisLinearTransformation::updateInternalMatrix2d()
{
  float thetas[3]= { 0,0,this->parameters[5] };
  bisUtil::mat44 TR; 
  this->eulerXYZRotationMatrix(thetas,0,TR);

  // Translation
  for (int i=0;i<=1;i++) 
    TR[i][3]=this->parameters[i];

  bisUtil::mat44* arr[6];

  arr[0]=&this->pre_matrix;
  arr[1]=&this->mshift2;
  arr[2]=&TR;

  
  if (this->mode==4) {
    arr[3]=&this->mshift1;
    this->seriesMultiply(arr,4);
    return;
  }
	    
  float sc[3];
  sc[0]=this->parameters[6];
  sc[2]=1.0;
  if (this->mode==5)
    sc[1]=this->parameters[6];
  else
    sc[1]=this->parameters[7];
	    
  bisUtil::mat44 S; this->inPlaceIdentity(S);
  for (int i=0;i<=2;i++)
    S[i][i]=sc[i];

  arr[3]=&S;
  
  if (this->mode!=6) {
    arr[4]=&this->mshift1;
    this->seriesMultiply(arr,5);
    return;
  }
	    
  bisUtil::mat44 Q; this->inPlaceIdentity(Q);
  float dthetas[3] = { 0,0,this->parameters[11]};
  this->eulerXYZRotationMatrix(dthetas,0,Q);
  arr[4]=&Q;
  arr[5]=&this->mshift1;
  this->seriesMultiply(arr,6);
}

void bisLinearTransformation::updateInternalMatrix()
{

  if (this->mode>3)
    return this->updateInternalMatrix2d();

  bisUtil::mat44 TR; 
  this->eulerXYZRotationMatrix(this->parameters,3,TR);
  for (int i=0;i<=2;i++) 
    TR[i][3]=this->parameters[i];

  bisUtil::mat44* arr[6];

  arr[0]=&this->pre_matrix;
  arr[1]=&this->mshift2;
  arr[2]=&TR;

  if (this->mode==0) {
    arr[3]=&this->mshift1;
    this->seriesMultiply(arr,4);
    return;
  }
	    
  float sc[3] = { this->parameters[6],this->parameters[6],this->parameters[6] };
  if (this->mode!=1) 
    {
      sc[1]=this->parameters[7];
      sc[2]=this->parameters[8];
    }

  bisUtil::mat44 S; this->inPlaceIdentity(S);
  for (int i=0;i<=2;i++)
    S[i][i]=sc[i];

  arr[3]=&S;
  
  if (this->mode!=3) {
    arr[4]=&this->mshift1;
    this->seriesMultiply(arr,5);
    //    seriesMultiply([this->mshift2,TR,S,this->mshift1]);
    return;
  }
  
  bisUtil::mat44 Q; 
  this->eulerXYZRotationMatrix(this->parameters,9,Q);
  arr[4]=&Q;
  arr[5]=&this->mshift1;
  this->seriesMultiply(arr,6);
}

void bisLinearTransformation::setMode(int m) {
  this->mode=bisUtil::irange(m,0,6);
}

int bisLinearTransformation::getMode() {
  return this->mode;
}

int bisLinearTransformation::getNumberOfDOF()
{
  if (this->mode==3)
    return 12;
  if (this->mode==2)
    return 9;
  if (this->mode==1)
    return 7;
  if (this->mode==4)
    return 3;
  if (this->mode==5)
    return 4;
  if (this->mode==6)
    return 6;
  return 6;
}

void bisLinearTransformation::identity()
{
  this->inPlaceIdentity(this->matrix);
  
  // Parameters
  for (int i=0;i<=11;i++) {
    if (i<6 || i>8)
      this->parameters[i]=0.0;
    else
      this->parameters[i]=1.0;
  }
}
	    
void bisLinearTransformation::setPreMatrixTransformation(bisMatrixTransformation *pre_xform)
{
  pre_xform->getMatrix(this->pre_matrix);
  this->updateInternalMatrix();
}



void bisLinearTransformation::setShifts(int dim_ref[3],float spa_ref[3],int dim_trg[3],float spa_trg[3])
{
  this->inPlaceIdentity(this->mshift1);
  this->inPlaceIdentity(this->mshift2);

  for (int i=0;i<=2;i++) {
    this->mshift1[i][3]= -0.5f*(dim_ref[i]-1)*spa_ref[i];
    this->mshift2[i][3]=  0.5f*(dim_trg[i]-1)*spa_trg[i];
  }
  this->updateInternalMatrix();
}
	


/** Sets parameter values from an array and does update.
 * @memberof BisLinearTransformation.prototype
 * @param {array} values - a 12-sized array. Elements 0-2 are translations, 3-5 are rotations, 6-8 are scales and 9-11 are pre-rotations (shear)
 * @param {object} opts - the options object
 * @param {boolean} opts.rigidOnly - if true then only store first six parameters (default=false)
 * @param {boolean} opts.scale - if true  then divide input scale parameters by 100 (default=false)
 * @returns {array} out - parameter vector
 */
void bisLinearTransformation:: setParameterVector(std::vector<float>& values,int doscale,int rigidOnly)
{
  int n=this->getOutputLength(this->getNumberOfDOF(),values.size(),rigidOnly);
  this->identity();
  
  /*  std::cout << "[ ";
  for (int i=0;i<n;i++) 
    std::cout << values[i] << " ";
    std::cout << "]" << std::endl;*/

  if (this->mode>3) {
    for (int i=0;i<n;i++)  {
      int index=LINEAR_LOOKUP_2D[i];
      this->parameters[index]=values[i];
      if (doscale && index>=6 && index<=8) {
        this->parameters[index]=this->parameters[index]/100.0f;
      }
    }
  } else {
    for (int i=0;i<n;i++)  {
      this->parameters[i]=values[i];
      if (doscale && i>=6 && i<=8) {
        this->parameters[i]=this->parameters[i]/100.0f;
      }
    }
  }

  /*std::cout << "[ ";
  for (int i=0;i<12;i++) 
    std::cout << this->parameters[i] << " ";
    std::cout << "]" << std::endl;*/

  this->updateInternalMatrix();
}

void bisLinearTransformation:: storeParameterVector(std::vector<float>& out,int doscale,int rigidOnly)
{
  int l=this->getOutputLength(this->getNumberOfDOF(),out.size(),rigidOnly);

  if (this->mode>3) {
    for (int i=0;i<l;i++)  {
      int index=LINEAR_LOOKUP_2D[i];
      out[i]=this->parameters[index];
      if (doscale && index>=6 && index<=8)
        out[i]=out[i]*100.0f;
    }
  } else {
    for (int i=0;i<l;i++) {
      out[i]=this->parameters[i];
		
      if (doscale && i>=6 && i<=8)
        out[i]=out[i]*100.0f;
    }
  }
}
