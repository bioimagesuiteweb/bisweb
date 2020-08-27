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

#include "bisSimpleDataStructures.h"
#include "bisMatrixTransformation.h"

#include "math.h"

bisMatrixTransformation::bisMatrixTransformation(std::string n) : bisAbstractTransformation(n) {
  this->identity();
  this->magic_type=bisDataTypes::s_matrix;
  this->class_name="bisMatrixTransformation";
}

bisMatrixTransformation::~bisMatrixTransformation()
{
}


void bisMatrixTransformation::inPlaceIdentity(bisUtil::mat44 mat)
{
  for (int i=0;i<=3;i++) {
    for (int j=0;j<=3;j++) {
      if (i==j)
	mat[i][j]=1.0;
      else
	mat[i][j]=0.0;
    }
  }
}


void bisMatrixTransformation::identity()
{
  this->inPlaceIdentity(this->matrix);
}
	    
/** transforms input point in mm to a voxel coordinate using this matrix
 * @param {array} X - 3 vector of x,y,z coordinates in mm
 * @param {array} TX - OUTPUT 3 vector of x,y,z coordinates in voxel space for target image
 * @param {array} spa - 3 vector of image spacing of target image
 */
void bisMatrixTransformation::transformPointToVoxel(float X[3],float TX[3],float spa[3])
{
  TX[0] = (this->matrix[0][0]*X[0]+this->matrix[0][1]*X[1]+this->matrix[0][2]*X[2]+this->matrix[0][3])/spa[0];
  TX[1] = (this->matrix[1][0]*X[0]+this->matrix[1][1]*X[1]+this->matrix[1][2]*X[2]+this->matrix[1][3])/spa[1];
  TX[2] = (this->matrix[2][0]*X[0]+this->matrix[2][1]*X[1]+this->matrix[2][2]*X[2]+this->matrix[2][3])/spa[2];
}

void bisMatrixTransformation::transformPoint(float X[3],float TX[3])
{
  TX[0] = (this->matrix[0][0]*X[0]+this->matrix[0][1]*X[1]+this->matrix[0][2]*X[2]+this->matrix[0][3]);
  TX[1] = (this->matrix[1][0]*X[0]+this->matrix[1][1]*X[1]+this->matrix[1][2]*X[2]+this->matrix[1][3]);
  TX[2] = (this->matrix[2][0]*X[0]+this->matrix[2][1]*X[1]+this->matrix[2][2]*X[2]+this->matrix[2][3]);
}



void bisMatrixTransformation::getMatrix(bisUtil::mat44 out)
{
  for (int j=0;j<=3;j++) 
    for (int i=0;i<=3;i++) 
      out[i][j]=this->matrix[i][j];
}

int bisMatrixTransformation::setMatrix(bisUtil::mat44 inp)
{
  for (int i=0;i<=3;i++) 
    for (int j=0;j<=3;j++) 
      this->matrix[i][j]=inp[i][j];

  return 1;
}


// Set and Get from SimpleMatrix
bisSimpleMatrix<float>* bisMatrixTransformation::getSimpleMatrix(std::string name)
{
  bisUtil::mat44 mat; this->getMatrix(mat);
  
  bisSimpleMatrix<float>* simple=new bisSimpleMatrix<float>(name);
  simple->allocate(4,4);
  simple->importMatrix(mat);

  return simple;
}

int bisMatrixTransformation::setSimpleMatrix(bisSimpleMatrix<float>* simple)
{
  if (simple->getNumRows()!=4 || simple->getNumCols()!=4)
    return 0;
  
  bisUtil::mat44 mat; simple->exportMatrix(mat);
  this->setMatrix(mat);
  return 1;
}


void bisMatrixTransformation::printSelf()
{
  bisUtil::printMatrix(this->matrix,this->name);
}


int bisMatrixTransformation::deSerialize(unsigned char* pointer)
{
  std::unique_ptr<bisSimpleMatrix<float> > simple_matrix(new bisSimpleMatrix<float>());
  if (!simple_matrix->linkIntoPointer(pointer))
    return 0;

  this->setSimpleMatrix(simple_matrix.get());
  return 1;
}

unsigned char* bisMatrixTransformation::serialize()
{
  std::unique_ptr<bisSimpleMatrix<float> > simple_matrix(this->getSimpleMatrix());
  simple_matrix->releaseOwnership();
  return simple_matrix->getRawArray();
}

void bisMatrixTransformation::serializeInPlace(unsigned char* output)
{
  std::unique_ptr<bisSimpleMatrix<float> > simple_matrix(this->getSimpleMatrix());
  //  std::cout << "Matrix Raw size = " << this->getRawSize() << std::endl;
  //  std::cout << "pointer = " << long(output) << std::endl;
  //  this->printSelf();
  
  bisMemoryManagement::copy_memory(output,simple_matrix->getRawArray(),this->getRawSize());

  //  std::cout << "Deserialize back " << std::endl;
  //  this->deSerialize(output);
  //  this->printSelf();
  //  std::cout << "-------------------------------" << std::endl;
  //  std::cout.flush();
}
		
long bisMatrixTransformation::getRawSize()
{
  return 16+// Raw header 
    8+ // rows cols
    +4*4*4; // 4x4xsize(float)
}
