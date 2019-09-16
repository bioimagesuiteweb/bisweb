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

#include "bisComboTransformation.h"

#include "math.h"
#include <iostream>
#include <sstream>

bisComboTransformation::bisComboTransformation(std::string n) : bisAbstractTransformation(n) {

  std::unique_ptr<bisMatrixTransformation> tmpc(new bisMatrixTransformation(this->name+":grid_linear"));
  this->initialLinearTransformation=std::move(tmpc);
  this->initialLinearTransformation->identity();
  this->magic_type=bisDataTypes::s_combotransform;
  this->class_name="bisComboTransformation";
}

bisComboTransformation::~bisComboTransformation()
{
  this->gridTransformationList.clear();
}

void bisComboTransformation::identity()
{
  this->initialLinearTransformation->identity();
  this->gridTransformationList.clear();
}


void bisComboTransformation::addTransformation(std::shared_ptr<bisGridTransformation> additional_transformation)
{

  this->gridTransformationList.push_back(additional_transformation);
}

std::shared_ptr<bisGridTransformation> bisComboTransformation::getGridTransformation(int index)
{
  return this->gridTransformationList[bisUtil::irange(index,0,this->gridTransformationList.size()-1)];
}


void bisComboTransformation::setInitialTransformation(bisUtil::mat44 m)
{
  this->initialLinearTransformation->setMatrix(m);
}

void bisComboTransformation::setInitialTransformation(bisMatrixTransformation *pre_xform)
{
  bisUtil::mat44 m;
  pre_xform->getMatrix(m);
  this->setInitialTransformation(m);
}


void bisComboTransformation::getInitialTransformation(bisUtil::mat44 m)
{
  this->initialLinearTransformation->getMatrix(m);
}


int bisComboTransformation::getNumberOfGridTransformations()
{
  return this->gridTransformationList.size();
}


void bisComboTransformation::transformPoint(float x[3],float y[3])
{

  int sz=this->gridTransformationList.size();
  if (sz<1) {
    this->initialLinearTransformation->transformPoint(x,y);
    return;
  }
  
  
  float temp[3]= { x[0],x[1],x[2] };
  /*  int debug=0;
  if (fabs(x[0]-20.0)+fabs(x[1]-20.0)+fabs(x[2]-20.0)<0.0001)
  debug=1;*/

  /*  if (debug)
      std::cout << "Beginning " << x[0] << "," << x[1] << "," << x[2] << std::endl;*/
  
  for (int ia=sz-1;ia>=0;ia=ia-1)
    {
      this->gridTransformationList[ia]->transformPoint(temp,y);
      for (int ib=0;ib<=2;ib++)
	temp[ib]=y[ib];
    }

  /*  if (debug)
    {
      std::cout << "Post grid " << y[0] << "," << y[1] << "," << y[2] << std::endl;
      }*/

  this->initialLinearTransformation->transformPoint(temp,y);

  /*  if (debug)
    {
      this->initialLinearTransformation->printSelf();
      std::cout << "Post linear " << y[0] << "," << y[1] << "," << y[2] << std::endl;
      }*/
}


// -------------------------------------------------------------------
long bisComboTransformation::getRawSize()
{
  // Header
  // 16 bytes big header
  // 4 bytes my header = num_transformations

  long rawsize=20;
  rawsize+=this->initialLinearTransformation->getRawSize();
  int sz=this->gridTransformationList.size();
  for (int i=0;i<sz;i++)
    rawsize+=this->gridTransformationList[i]->getRawSize();
  return rawsize;
}

void bisComboTransformation::serializeInPlace(unsigned char* pointer)
{
  long rawsize=this->getRawSize();

  //  std::cout << std::endl << "serializing combo size=" << rawsize << std::endl;
  
  int* begin_int=(int*)pointer;
  begin_int[0]=this->magic_type;
  begin_int[1]=bisDataTypes::b_float32;
  begin_int[2]=4;
  begin_int[3]=rawsize-20;

  int* i_head=(int*)(pointer+16);
  i_head[0]=this->gridTransformationList.size(); // number of grids

  //std::cout << "... serializing Combo ... Raw size=" << rawsize << std::endl;
  //  std::cout << "pointer = " << long(pointer) << std::endl;
  int offset=20;
  this->initialLinearTransformation->serializeInPlace(pointer+offset);
  offset+=this->initialLinearTransformation->getRawSize();
  //  std::cout << "Post linear offset=" << offset << std::endl;
  for (unsigned int ia=0;ia<gridTransformationList.size();ia++)
    {
      this->gridTransformationList[ia]->serializeInPlace(pointer+offset);
      offset+=this->gridTransformationList[ia]->getRawSize();
      //  std::cout << "Post grid offset=" << offset << " (sz=" << this->gridTransformationList[ia]->getRawSize() << " )" << std::endl;
    }
  std::cout << std::endl << std::endl;
}


int bisComboTransformation::deSerialize(unsigned char* pointer)
{
  int* begin_int=(int*)pointer;
  int incoming_magic_type=begin_int[0];
  //int data_type=begin_int[1];
  int header_size=begin_int[2];
  //  int data_size=begin_int[3];
  if (incoming_magic_type!=this->magic_type || begin_int[1]!=bisDataTypes::b_float32 || header_size!=4  )
    {
      std::cerr << "Bad Magic Type or not float or bad header size. Can not deserialize pointer as bisComboTransform " << std::endl;
      return 0;
    }

  this->identity();
  this->gridTransformationList.clear();
  int* i_head=(int*)(pointer+16);
  int num_transformations=i_head[0];

  int offset=20;
  this->initialLinearTransformation->deSerialize(pointer+offset);
  offset=offset+this->initialLinearTransformation->getRawSize();

  for (int ia=0;ia<num_transformations;ia++)
    {
      std::shared_ptr<bisGridTransformation> tmp_g(new bisGridTransformation());
      tmp_g->deSerialize(pointer+offset);
      offset+=tmp_g->getRawSize();
      this->addTransformation(tmp_g);
      //      float* data=tmp_g->getData();
      //      int numc=tmp_g->getNumberOfControlPoints();
      //      std::cout << "num control = " << numc << std::endl << " at 370=";
      /*for (int ia=0;ia<=2;ia++)
	std::cout << data[370+ia*numc] << " ";
	std::cout << std::endl;*/
    }

  return 1;
}

// ----------------------------------

  /** parse from Text 
   * @param linevector (a vector of lines)
   * @param offset the line to begin parsing
   * @param debug print diagnostic messages if > 0
   * @returns a string
   */
int bisComboTransformation::textParse(std::vector<std::string>& lines,int& offset,int debug)
{
  if (debug)
    std::cout << lines[offset] << debug << std::endl;
  
  int isnewcombo=(lines[offset].find("#vtkpxNewComboTransform File")!= std::string::npos);
  int ismulticombo=(lines[offset].find("#vtkpxMultiComboTransform File")!= std::string::npos);
  int isgrid=(lines[offset].find("#vtkpxBaseGridTransform2 File")!= std::string::npos);

  if (isnewcombo==0 && ismulticombo==0 && isgrid==0)
    {
      if (debug)
	std::cerr << "Bad header line " << lines[offset] << std::endl;
      return 0;
    }

  int numgrids=1;
  int nonlinearfirst=1;
  if (isnewcombo)
    {
      offset+=2;
      nonlinearfirst=std::stoi(lines[offset]);
    } 
  else if (ismulticombo)
    {
      offset+=2;
      numgrids=std::stoi(lines[offset]);
      offset+=2;
      nonlinearfirst=std::stoi(lines[offset]);
    }


  if (nonlinearfirst==0)
    {
      std::cerr << "Bad Grid Transformation as nonlinearfirst=0 is not supported here" << std::endl;
      return 0;
    }

  if (debug)
    std::cout << "numgrids=" << numgrids << " nonlinear=" << nonlinearfirst << std::endl;
  
  if (!isgrid)
    {
      offset+=2;
      this->initialLinearTransformation->identity();
      // Load 4x4 matrix
      bisUtil::mat44 m;
      for (int i=0;i<=3;i++)
	{
	  sscanf(lines[offset].c_str(),"%f %f %f %f",&m[i][0],&m[i][1],&m[i][2],&m[i][3]);
	  offset=offset+1;
	}
      this->initialLinearTransformation->setMatrix(m);
      if (debug)
	this->initialLinearTransformation->printSelf();
    }

  this->gridTransformationList.clear();
  
  for (int i=0;i<numgrids;i++)
    {
      std::shared_ptr<bisGridTransformation> newgrid(new bisGridTransformation("combogrid"));
      if (newgrid->textParse(lines,offset,debug))
	{
	  this->addTransformation(newgrid);
	  if (debug)
	    std::cout << "added a new transformation, now have = " << this->gridTransformationList.size() <<  std::endl;
	}
    }
    
  return 1;
}

/** serialize to Text 
 * @param debug print diagnostic messages if > 0
 * @returns a string
 */
std::string bisComboTransformation::textSerialize(int debug)
{
  std::stringstream output;
  output.precision(5);  

  if (this->getNumberOfGridTransformations()==1)
    {
      output << "#vtkpxNewComboTransform File" << std::endl;
    }
  else
    {
      output << "#vtkMultiComboTransform File" << std::endl;
      output << "#Number of Non Linear Transformations " << std::endl
	     << this->getNumberOfGridTransformations() << std::endl;
    }

  
  output << "#NonLinearFirst " << std::endl << 1 << std::endl;
  bisUtil::mat44 m;
  this->initialLinearTransformation->getMatrix(m);
  output << "#Linear Component" << std::endl;
  for(int i=0;i<=3;i++)
    {
      for (int j=0;j<=3;j++)
	output << m[i][j] << " ";
      output << std::endl;
    }

  if (debug)
    std::cout << "Header =\n\n\n" << output.str() << "\n\n";

  for (int i=0;i<this->getNumberOfGridTransformations();i++)
    output << this->gridTransformationList[i]->textSerialize(debug);

  return output.str();
  
}
