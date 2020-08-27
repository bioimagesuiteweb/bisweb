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

#include "bisAbstractTransformation.h"
#include "bisSimpleDataStructures.h"
#include "bisMemoryManagement.h"
#include "bisUtil.h"

bisAbstractTransformation::bisAbstractTransformation(std::string n): bisDataObject(n) {
  this->class_name="bisAbstractTransformation";
}

void bisAbstractTransformation::transformPointToVoxel(float x[3],float y[3],float spa[3])
{
  this->transformPoint(x,y);
  for (int ia=0;ia<=2;ia++)
    y[ia]=y[ia]/spa[ia];
}

void bisAbstractTransformation::computeDisplacement(float x[3],float disp[3])
{
  this->transformPoint(x,disp);
  for (int ia=0;ia<=2;ia++)
    disp[ia]=disp[ia]-x[ia];
}


bisSimpleImage<float>* bisAbstractTransformation::computeDisplacementField(int i_dim[3],float i_spa[3])
{

  int dim[5] = { i_dim[0],i_dim[1],i_dim[2],3,1};
  float spa[5] = { i_spa[0],i_spa[1],i_spa[2],1.0,1.0};

  std::string n1=this->name+":dispfield";
  bisSimpleImage<float >* out=new bisSimpleImage<float>(n1);
  out->allocate(dim,spa);

  float* data=out->getImageData();
  float X[3],U[3];
  int index=0;
  int volsize=dim[0]*dim[1]*dim[2];
  for (int k=0;k<dim[2];k++)
    {
      X[2]=k*spa[2];
      for (int j=0;j<dim[1];j++)
	{
	  X[1]=j*spa[1];
	  for (int i=0;i<dim[0];i++)
	    {
	      X[0]=i*spa[0];
	      this->computeDisplacement(X,U);
	      for (int ia=0;ia<=2;ia++)
		data[index+ia*volsize]=U[ia];
	      ++index;
	    }
	}
    }

  return out;
  
}

int bisAbstractTransformation::inPlaceComputeDisplacementField(bisSimpleImage<float>* output, int bounds[6])

{

  int dim[5]; output->getDimensions(dim);
  float spa[5]; output->getSpacing(spa);

  if (dim[3]!=3)
    {
      std::cerr << "Bad image for storing disp field .. frames=3 " << std::endl;
      return 0;
    }

  for (int ia=0;ia<=2;ia++)
    {
      bounds[2*ia]=bisUtil::irange(bounds[2*ia],0,dim[ia]-1);
      bounds[2*ia+1]=bisUtil::irange(bounds[2*ia+1],bounds[2*ia],dim[ia]-1);
    }
  
  float* data=output->getImageData();
  float X[3],U[3];

  int volsize=dim[0]*dim[1]*dim[2];
  for (int k=bounds[4];k<=bounds[5];k++)
    {
      X[2]=k*spa[2];
      for (int j=bounds[2];j<=bounds[3];j++)
	{
	  X[1]=j*spa[1];
	  int index=k*dim[0]*dim[1]+j*dim[0]+bounds[0];
	  for (int i=bounds[0];i<=bounds[1];i++)
	    {
	      X[0]=i*spa[0];
	      this->computeDisplacement(X,U);
	      for (int ia=0;ia<=2;ia++)
		data[index+ia*volsize]=U[ia];
	      ++index;
	    }
	}
    }
  return 1;
}


// STATIC
float bisAbstractTransformation::computeDisplacementFieldSSD(bisSimpleImage<float>* dispfield1,
							     bisSimpleImage<float>* dispfield2,
							     int bounds[6],int debug)
{
  int dim[5];   dispfield1->getDimensions(dim);
  int dim_2[5]; dispfield2->getDimensions(dim_2);  

  int sum=0;
  for (int i=0;i<=4;i++)
    sum+=abs(dim[i]-dim_2[i]);
  
  if (sum!=0 || dim[3]!=3)
    {
      std::cerr << "Bad image for computing dispfield SSD. Either unequal sizes or frames!=3 " << std::endl;
      return -1.0;
    }

  for (int ia=0;ia<=2;ia++)
    {
      bounds[2*ia]=bisUtil::irange(bounds[2*ia],0,dim[ia]-1);
      bounds[2*ia+1]=bisUtil::irange(bounds[2*ia+1],bounds[2*ia],dim[ia]-1);
    }

  if (debug)
    {
      std::cout << "Computing SSD bounds=" << bounds[0] << ":" << bounds[1] << ", " << bounds[2] << ":" << bounds[3] << ", " << bounds[4] << ":" << bounds[5];
      std::cout << "( dim=" << dim[0] << "," << dim[1] << "," << dim[2] << ")"<< std::endl;
    }
  
  float* data1=dispfield1->getImageData();
  float* data2=dispfield2->getImageData();

  int volsize=dim[0]*dim[1]*dim[2];
  int slicesize=dim[0]*dim[1];
  
  double ssd=0.0;
  for (int k=bounds[4];k<=bounds[5];k++)
    {
      int k_index=k*slicesize;
      for (int j=bounds[2];j<=bounds[3];j++)
	{
	  int index=k_index+j*dim[0]+bounds[0];
	  for (int i=bounds[0];i<=bounds[1];i++)
	    {
	      for (int ia=0;ia<=2;ia++)
		ssd+=pow(data1[index+ia*volsize]-data2[index+ia*volsize],2.0);
	      ++index;
	    }
	}
    }

  int np=((bounds[5]-bounds[4]+1)*(bounds[3]-bounds[2]+1)*(bounds[1]-bounds[0]+1));
  float v=float(sqrt(ssd/np));

  if (debug)
    std::cout << "\t\t\t np=" << np << " ssd=" << ssd << "  v=" << v << std::endl;
  return v;
}
