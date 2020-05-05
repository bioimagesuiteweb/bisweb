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

#include "bisSurface.h"


bisSurface::bisSurface(std::string n) : bisDataObject(n) {
  this->magic_type=bisDataTypes::s_surface;
  this->class_name="bisSurface";
}

bisSurface::~bisSurface() {

}


void bisSurface::copy(bisSurface* other) {

  if (other->getPoints()) {
    std::shared_ptr< bisSimpleMatrix<float> > tmp(new bisSimpleMatrix<float>());
    tmp->deSerialize(other->getPoints()->serialize());
    this->points=std::move(tmp);
  } else {
    this->points=0;
  }

  if (other->getTriangles()) {
    std::shared_ptr< bisSimpleMatrix<int> > tmp(new bisSimpleMatrix<int>());
    tmp->deSerialize(other->getTriangles()->serialize());
    this->triangles=std::move(tmp);
  } else {
    this->triangles=0;
  }

  if (other->getPointData()) {
    std::shared_ptr< bisSimpleMatrix<float> > tmp(new bisSimpleMatrix<float>());
    tmp->deSerialize(other->getPointData()->serialize());
    this->pointData=std::move(tmp);
  } else {
    this->pointData=0;
  }

  if (other->getTriangleData()) {
    std::shared_ptr< bisSimpleMatrix<float> > tmp(new bisSimpleMatrix<float>());
    tmp->deSerialize(other->getTriangleData()->serialize());
    this->triangleData=std::move(tmp);
  } else {
    this->triangleData=0;
  }  
}


// -------------------------------------------------------------------
long bisSurface::getRawSize()
{
  // Header
  // 16 bytes big header
  // 16 bytes my header = rows,rows,cols,cols

  long rawsize=32;
  if (this->points) 
    rawsize+=this->points->getRawSize();
      
  if (this->triangles) 
    rawsize+=this->triangles->getRawSize();
  
  if (this->pointData) 
    rawsize+=this->pointData->getRawSize();

  if (this->triangleData)
    rawsize+=this->triangleData->getRawSize();

  return rawsize;
}

void bisSurface::serializeInPlace(unsigned char* pointer)
{
  long rawsize=this->getRawSize();
  
  int* begin_int=(int*)pointer;
  begin_int[0]=this->magic_type;
  begin_int[1]=bisDataTypes::b_float32;
  begin_int[2]=4;
  begin_int[3]=rawsize-32;

  int offset=32;
  int* i_head=(int*)(pointer+16);
  i_head[0]=0;
  if (this->points) {
    i_head[0]=this->points->getNumRows();
    this->points->serializeInPlace(pointer+offset);
    offset+=this->points->getRawSize();
  }
      
  i_head[1]=0;
  if (this->triangles) {
    i_head[1]=this->triangles->getNumRows();
    this->triangles->serializeInPlace(pointer+offset);
    offset+=this->triangles->getRawSize();
  }
  
  i_head[2]=0;
  if (this->pointData) {
    i_head[2]=this->pointData->getNumCols();
    this->pointData->serializeInPlace(pointer+offset);
    offset+=this->pointData->getRawSize();
  }

  i_head[3]=0;
  if (this->triangleData) {
    i_head[3]=this->triangleData->getNumCols();
    this->triangleData->serializeInPlace(pointer+offset);
    offset+=this->triangleData->getRawSize();
  }
}


int bisSurface::deSerialize(unsigned char* pointer)
{
  int* begin_int=(int*)pointer;
  int incoming_magic_type=begin_int[0];
  int header_size=begin_int[2];
  int data_size=begin_int[3];

  if (incoming_magic_type!=this->magic_type ||  header_size!=32 || data_size <1  )
    {
      std::cerr << "Bad Magic Type or  bad header size. Can not deserialize pointer as bisSurface " << std::endl;
      return 0;
    }

  int* i_head=(int*)(pointer+16);
  int offset=32;
  
  if (i_head[0]) {
    std::unique_ptr< bisSimpleMatrix<float> > tmp(new bisSimpleMatrix<float>());
    this->points=std::move(tmp);
    this->points->deSerialize(pointer+offset);
    offset=offset+this->points->getRawSize();
  } else {
    this->points=0;
  }

  //  std::cout << "  offset=" << offset << std::endl;
  

  if (i_head[1]) {
    
    /*int* rc=(int*)(pointer+offset+16);
    int* idat=(int*)(pointer+offset+24);
    /std::cout << "Raw Triangle Dim=" << rc[0] << "*" << rc[1] << ":";
    for (int ia=0;ia<rc[0]*rc[1];ia++)
      std::cout << idat[ia] << " ";
      std::cout << std::endl;*/
    std::unique_ptr< bisSimpleMatrix<int> > tmp(new bisSimpleMatrix<int>());
    this->triangles=std::move(tmp);
    this->triangles->deSerialize(pointer+offset);
    offset=offset+this->triangles->getRawSize();
    /*int rawsize=this->triangles->getRawSize();
    std::cout << "Raw size=" << rawsize << std::endl;
    int rows=this->triangles->getNumRows();
    int cols=this->triangles->getNumCols();
    int* tri=this->triangles->getData();
    for (int ia=0;ia<rows;ia++)
    std::cout << "tri=" << ia << "="<< tri[ia*3+0] << "," << tri[ia*3+1] << "," << tri[ia*3+2] << std::endl;
    std::cout << "SIze=" << rows << "," << cols << std::endl;*/
    
  } else {
    this->triangles=0;
  }
  
  if (i_head[2]) {
    std::unique_ptr< bisSimpleMatrix<float> > tmp(new bisSimpleMatrix<float>());
    this->pointData=std::move(tmp);
    this->pointData->deSerialize(pointer+offset);
    offset=offset+this->pointData->getRawSize();
  } else {
    this->pointData=0;
  }

  if (i_head[3]) {
    std::unique_ptr< bisSimpleMatrix<float> > tmp(new bisSimpleMatrix<float>());
    this->triangleData=std::move(tmp);
    this->triangleData->deSerialize(pointer+offset);
    offset=offset+this->triangleData->getRawSize();
  } else {
    this->triangleData=0;
  }

  return 1;
}

// ----------------------------------

