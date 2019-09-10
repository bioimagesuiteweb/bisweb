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

#include "bisTransformationCollection.h"

#include "math.h"
#include <iostream>
#include <sstream>
#include "bisDataTypes.h"
#include "bisDataObjectFactory.h"
#include "bisUtil.h"
#include <sstream>

bisTransformationCollection::bisTransformationCollection(std::string n) : bisAbstractTransformation(n) {

  this->magic_type=bisDataTypes::s_collection;
  this->class_name="bisTransformationCollection";
}

bisTransformationCollection::~bisTransformationCollection()
{
  this->transformations.clear();
}


void bisTransformationCollection::addTransformation(std::shared_ptr<bisAbstractTransformation> additional)
{

  this->transformations.push_back(additional);
}

std::shared_ptr<bisAbstractTransformation> bisTransformationCollection::getTransformation(int index)
{
  return this->transformations[bisUtil::irange(index,0,this->transformations.size()-1)];
}

// -------------------------------------------------------------------
long bisTransformationCollection::getRawSize()
{
  // Header
  // 16 bytes big header
  // 4 bytes my header = num_transformations

  long rawsize=20;
  int sz=this->transformations.size();
  for (int i=0;i<sz;i++)
    rawsize+=this->transformations[i]->getRawSize();
  return rawsize;
}

void bisTransformationCollection::serializeInPlace(unsigned char* pointer)
{
  int rawsize=this->getRawSize();

  int* begin_int=(int*)pointer;
  begin_int[0]=this->magic_type;
  begin_int[1]=bisDataTypes::b_float32;
  begin_int[2]=4;
  begin_int[3]=rawsize-20;

  int* i_head=(int*)(pointer+16);
  i_head[0]=this->transformations.size(); // number of transformations

  int offset=20;
  for (unsigned int ia=0;ia<transformations.size();ia++)
    {
      this->transformations[ia]->serializeInPlace(pointer+offset);
      offset+=this->transformations[ia]->getRawSize();
    }
}


int bisTransformationCollection::deSerialize(unsigned char* pointer)
{
  int* begin_int=(int*)pointer;
  int incoming_magic_type=begin_int[0];
  int header_size=begin_int[2];
  if (incoming_magic_type!=this->magic_type || header_size!=4  )
    {
      std::cerr << "Bad Magic Type  or bad header size. Can not deserialize pointer as bisTransformationCollection " << std::endl;
      return 0;
    }

  int* i_head=(int*)(pointer+16);
  int num_transformations=i_head[0];

  int offset=20;
  this->transformations.clear();
  
  for (int ia=0;ia<num_transformations;ia++)
    {
      std::stringstream name;
      name << "transformation_" << (ia+1);
      std::shared_ptr<bisAbstractTransformation> tmp_g(bisDataObjectFactory::deserializeTransformation(pointer+offset,name.str()));
      offset+=tmp_g->getRawSize();
      this->addTransformation(tmp_g);
    }

  return 1;
}

// ----------------------------------------------

void bisTransformationCollection::identity()
{
  this->transformations.clear();
}

void bisTransformationCollection::transformPoint(float x[3],float y[3])
{
  float temp[3];
  for (int ia=0;ia<=2;ia++) 
    y[ia]=x[ia];
  
  for (unsigned int ia=0;ia<this->transformations.size();ia++)
    {
      for (int ib=0;ib<=2;ib++)
	temp[ib]=y[ib];
      this->transformations[ia]->transformPoint(temp,y);
    }
}
