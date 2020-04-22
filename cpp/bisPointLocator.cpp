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

#include <vector>
#include <stack>

#include "bisPointLocator.h"
#include "bisUtil.h"
#include "math.h"


bisPointLocator::bisPointLocator(std::string n) : bisObject(n) {

  this->class_name="bisPointLocator";
  this->dimensions[0]=0;
  this->dimensions[1]=0;
  this->dimensions[2]=0;
}

bisPointLocator::~bisPointLocator(){
  
}

// ---------------------------------------------------------------------------------------------------
// Initialize Locator
int bisPointLocator::initialize(std::shared_ptr<bisSimpleMatrix<float> > in_points,float length) {

  int cols=in_points->getNumCols();
  int rows=in_points->getNumRows();

  if (cols!=3 || rows < 4) {
    return 0;
  }
  
  this->points=in_points;
  int numberofpoints=rows;

  float minc[3],maxc[3];
  float* pts=this->points->getData();

  // Find min and max and create bounds
  for (int ia=0;ia<=2;ia++) {
    minc[ia]=pts[ia];
    maxc[ia]=pts[ia];
  }

  for (int index=1;index<numberofpoints;index++) {
    int offset=index*3;
    
    for (int ia=0;ia<=2;ia++) {
      float p=pts[offset+ia];
      if (minc[ia]>p) minc[ia]=p;
      if (maxc[ia]<p) maxc[ia]=p;
    }
  }

  for (int ia=0;ia<=2;ia++) {
    
    float l=maxc[ia]-minc[ia];
    
    this->dimensions[ia]=int( l/length)+1;
    this->spacing[ia]=1.01*(maxc[ia]-minc[ia])/float(this->dimensions[ia]);
    this->origin[ia]=minc[ia];
    float upper=this->origin[ia]+this->dimensions[ia]*this->spacing[ia];
    std::cout << "+++ Axis = " << ia << " origin=" << this->origin[ia] << " spacing=" << this->spacing[ia] << " dims=" << this->dimensions[ia] << " upper=" << upper << std::endl;
  }

  int numbins=this->dimensions[0]*this->dimensions[1]*this->dimensions[2];
  this->indices.clear();
  
  for (int i=0;i<numbins;i++) {
    std::vector<int> a;
    this->indices.push_back(a);
  }

  int strides[3] = { 1, this->dimensions[0], this->dimensions[0]*this->dimensions[1] };
  
  for (int index=0;index<numberofpoints;index++) {

    float pt[3];
    int bin=0;
    for (int ia=0;ia<=2;ia++)
      {
        pt[ia]=pts[index*3+ia];
        int lattice=bisUtil::irange(int( (pt[ia]-origin[ia])/spacing[ia]),0,this->dimensions[ia]-1);
        bin=bin+lattice*strides[ia];
      }
    this->indices[bin].push_back(index);
  }

  return 1;
}

// -------------------------------------------------------------------------------------------------------------------
// Find the nearest point to input in bin=bin
int bisPointLocator::findNearestPointInBin(float input[3],float* pts,int bin,float& mindist2) {

  std::vector<int> bin_indices=this->indices[bin];
  mindist2=0.0f;
  int bestpoint=-1;

  if (bin_indices.size()<1) {
    return -1;
  }
  
  for (int i=0;i<bin_indices.size();i++) {

    float point[3];
    float dist2=0.0;
    int index=bin_indices[i];
    
    for (int ia=0;ia<=2;ia++) {
      point[ia]=pts[index*3+ia];
      dist2+=pow(point[ia]-input[ia],2.0f);
    }

    if (dist2<mindist2 || bestpoint < 0) {
      mindist2=dist2;
      bestpoint=index;
    }
  }

  return bestpoint;
}

// -------------------------------------------------------------------------------------------------------------------
// add all points in bin=bin that are closer than T to input to pointlist
//
int bisPointLocator::addPointsInBinCloserThanT(float input[3],float* pts,int bin,float T,std::vector<int> pointlist) {

  std::vector<int> bin_indices=this->indices[bin];
  int added=0;
  float T2=T*T;
  
  for (int i=0;i<bin_indices.size();i++) {
    
    float point[3];
    float dist2=0.0;
    int index=bin_indices[i];
    
    for (int ia=0;ia<=2;ia++) {
      point[ia]=pts[index*3+ia];
      dist2+=pow(point[ia]-input[ia],2.0f);
    }

    if (dist2<=T2) {
      pointlist.push_back(index);
      ++added;
    }
  }
    
  return added;
}

// -------------------------------------------------------------------------------------------------------------------
// Find nearest point in bin boundary to input -- essentially project to corner or plane
// return distance
float bisPointLocator::getClosestBoundaryPointDistance(float input[3],int lattice[3]) {

  float dist2=0.0;
  
  for (int ia=0;ia<=2;ia++) {
    float p0=this->origin[ia]+lattice[ia]*this->spacing[ia];
    float p1=p0+this->spacing[ia];
    float c=input[ia];
    if (input[ia]<p0) 
      c=p0;
    else if (input[ia]>p1)
      c=p1;

    dist2+=pow(c-input[ia],2.0f);
  }
  
  return dist2;
}


// -------------------------------------------------------------------------------------------------------------------
// find all points with distance < radius to input
//
int bisPointLocator::getPointsWithinRadius(float input[3],float radius,std::vector<int> pointlist)
{
  pointlist.clear();
  if (this->dimensions[0]<1)
    return 0;

  float* pts=this->points->getData();
  int lattice[3], minlattice[3],maxlattice[3];
  for (int ia=0;ia<=2;ia++)  {
    lattice[ia]=bisUtil::irange(int( (input[ia]-origin[ia])/spacing[ia]),0,this->dimensions[ia]-1);
    minlattice[ia]=bisUtil::irange(int( ( (input[ia]-radius)-origin[ia])/spacing[ia]),0,this->dimensions[ia]-1);
    maxlattice[ia]=bisUtil::irange(int( ( (input[ia]+radius)-origin[ia])/spacing[ia]),0,this->dimensions[ia]-1);

  }


  float radius2=radius*radius;
  pointlist.clear();
  int strides[3] = { 1, this->dimensions[0], this->dimensions[0]*this->dimensions[1] };
  
  for (int k=minlattice[2];k<=maxlattice[2];k++) {
    for (int j=minlattice[1];j<=maxlattice[1];j++) {
      for (int i=minlattice[0];i<=maxlattice[0];i++) {
        int lat[3] = { i,j,k };
        float dist2=this->getClosestBoundaryPointDistance(input,lat);
        if (dist2<=radius2)
          this->addPointsInBinCloserThanT(input,pts,i+j*strides[1]+k*strides[2],radius,pointlist);
      }
    }
  }

  return pointlist.size();
}
// -------------------------------------------------------------------------------------------------------------------
// find the nearest point
//
int bisPointLocator::getNearestPoint(float input[3],float output[3]) {
  if (this->dimensions[0]<1)
    return -1;
  

  int strides[3] = { 1, this->dimensions[0], this->dimensions[0]*this->dimensions[1] };
  float* pts=this->points->getData();
  
  int lattice[3];
  for (int ia=0;ia<=2;ia++)  {
    lattice[ia]=bisUtil::irange(int( (input[ia]-origin[ia])/spacing[ia]),0,this->dimensions[ia]-1);
  }

  std::stack<int>  stack;
  stack.push(lattice[0]+lattice[1]*strides[1]+lattice[2]*strides[2]);
  std::vector<int> visted(this->dimensions[0]*this->dimensions[1]*this->dimensions[2],0);
  
  float mindist2=0.0;
  int bestpoint=-1;

  while (stack.size()<1) { 
    
    int found=0;
    int currentbin=stack.top();
    stack.pop();

    float dist2=0.0;
    int nearest=this->findNearestPointInBin(input,pts,currentbin,dist2);
    if (nearest>=0 && (dist2< mindist2 || bestpoint==-1)) {
      mindist2=dist2;
      bestpoint=nearest;
      found=1;
    }
    
    if (found==1 || bestpoint<0) {

      int lattice[3];
      lattice[2]=int(currentbin/ strides[2]);
      int tmp=currentbin % strides[2];
      lattice[1]=int( tmp / strides[1]);
      lattice[0]=tmp % strides[1];
      
      // check neighbors and add them
      for (int axis=0;axis<=2;axis++)
        {
          
          for (int shift=-1;shift<=1;shift+=2)
            {
              
              int newlat[3] = { lattice[0],lattice[1],lattice[2] };
              newlat[axis]=lattice[axis]+shift;
              if (newlat[axis]>=0 && newlat[axis] < this->dimensions[axis])
                {
                  if (bestpoint==0) {
                    stack.push(newlat[0]+newlat[1]*strides[1]+newlat[2]*strides[2]);
                  } else {
                    float d2=this->getClosestBoundaryPointDistance(input,newlat);
                    if (d2<mindist2) 
                      stack.push(newlat[0]+newlat[1]*strides[1]+newlat[2]*strides[2]);
                  }
                }
            }
        }
    }

  }

  if (bestpoint>=0) {
    for (int ia=0;ia<=2;ia++) {
      output[ia]=pts[3*bestpoint+ia];
    }

  }

  return bestpoint;
}

