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
int bisPointLocator::initialize(std::shared_ptr<bisSimpleMatrix<float> > in_points,float length,int debug) {

  int cols=in_points->getNumCols();
  int rows=in_points->getNumRows();

  if (cols!=3 || rows < 4) {
    return 0;
  }
  
  this->points=in_points;
  int numberofpoints=rows;

  if (debug)
    std::cout << std::endl << "___ Building Locator. NumPoints=" << numberofpoints << std::endl;
  
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

  if (debug) {
    std::cout << "___ Bounds = " << minc[0] << ":" << maxc[0] << std::endl;
    std::cout << "           = " << minc[1] << ":" << maxc[1] << std::endl;
    std::cout << "           = " << minc[2] << ":" << maxc[2] << std::endl;
  }

  length=bisUtil::frange(length,0.05,0.5);
  
  for (int ia=0;ia<=2;ia++) {
    this->dimensions[ia]=int(1.0/length)+1;
    this->spacing[ia]=1.01*(maxc[ia]-minc[ia])/float(this->dimensions[ia]);
    this->origin[ia]=minc[ia]-0.005*this->spacing[ia];
    float upper=this->origin[ia]+this->dimensions[ia]*this->spacing[ia];
    if (debug) {
      std::cout << "___ Axis = " << ia << " origin=" << this->origin[ia] << " spacing=" << this->spacing[ia] << " dims=" << this->dimensions[ia] << " upper=" << upper << std::endl;
    }
  }

  int numbins=this->dimensions[0]*this->dimensions[1]*this->dimensions[2];
  this->indices.clear();

  if (debug) 
    std::cout << "___ numbins = " << numbins << std::endl;
  
  for (int i=0;i<numbins;i++) {
    std::vector<int> a;
    this->indices.push_back(a);
  }

  int strides[3] = { 1, this->dimensions[0], this->dimensions[0]*this->dimensions[1] };

  int step=numberofpoints/3;
  
  for (int index=0;index<numberofpoints;index++) {

    float pt[3];
    int bin=0;

    if (debug && index % step ==0 ) 
      std::cout << "___\n___ adding point " << index << "/" << numberofpoints << std::endl << "___    ";
    
    for (int ia=0;ia<=2;ia++)
      
      {
        pt[ia]=pts[index*3+ia];
        int lattice=bisUtil::irange(int( (pt[ia]-origin[ia])/spacing[ia]),0,this->dimensions[ia]-1);
        bin=bin+lattice*strides[ia];
        if (debug && index % step ==0 ) {
          std::cout << "ia=" << ia << " p=" << pt[ia] << "-->" << lattice << ",   ";
        }
      }
    this->indices[bin].push_back(index);
    if (debug && index % step ==0 ) {
      std::cout << std::endl << "___    bin=" << bin << std::endl;
    }
  }

  return 1;
}

// -------------------------------------------------------------------------------------------------------------------
// Find the nearest point to input in bin=bin
int bisPointLocator::findNearestPointInBin(float input[3],
                                           float* pts,int bin,
                                           float& mindist2,int debug) {

  std::vector<int> bin_indices=this->indices[bin];
  mindist2=0.0f;
  int bestpoint=-1;

  if (debug) {
    std::cout << "____ Looking for point = " << input[0] << "," << input[1] << "," << input[2] << " in bin " << bin << " numpoints=" << bin_indices.size() << std::endl;
    if (bin_indices.size()<20 && bin_indices.size()>0) {
      std::cout << "\t\t :";
      for (unsigned int i=0;i<bin_indices.size();i++) 
        std::cout << bin_indices[i] << " ";
      std::cout << std::endl;
    }
  }
  
  if (bin_indices.size()<1) {
    if (debug)
      std::cout << "____ Empty, returning -1" << std::endl;
    return -1;
  }
  
  for (unsigned int i=0;i<bin_indices.size();i++) {

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

  if (debug) {
    float p[3];
    for (int ia=0;ia<=2;ia++) {
      p[ia]=pts[bestpoint*3+ia];
    }
    
    std::cout << "_____ returning bestpoint=" << bestpoint << "(" << p[0] << "," << p[1] << "," << p[2] << "), mindist2=" << mindist2 << std::endl;
  }
  return bestpoint;
}

// -------------------------------------------------------------------------------------------------------------------
// add all points in bin=bin that are closer than T to input to pointlist
//
int bisPointLocator::addPointsInBinCloserThanT(float input[3],float* pts,int bin,float T2,std::vector<int>& pointlist,int debug) {

  std::vector<int> bin_indices=this->indices[bin];
  int added=0;
  
  for (unsigned int i=0;i<bin_indices.size();i++) {
    
    float point[3];
    float dist2=0.0;
    int index=bin_indices[i];
    
    for (int ia=0;ia<=2;ia++) {
      point[ia]=pts[index*3+ia];
      dist2+=pow(point[ia]-input[ia],2.0f);
    }
    
    if (dist2<=T2) {
      if (debug)
        std::cout << "___ Adding "  << point[0] << "," << point[1] << "," << point[2] << " dist2=" << dist2 << " < " << T2 << std::endl;
      pointlist.push_back(index);
      ++added;
    }
  }

    
  return added;
}

// -------------------------------------------------------------------------------------------------------------------
// Find nearest point in bin boundary to input -- essentially project to corner or plane
// return distance
float bisPointLocator::getClosestBoundaryPointDistance(float input[3],int lattice[3],int debug) {

  float dist2=0.0;
  if (debug)
    std::cout << "Finding closest boundary distance " << input[0] << "," << input[1] << "," << input[2] << " in lat=" << lattice[0] << "," << lattice[1] << "," << lattice[2] << std::endl;
  
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
int bisPointLocator::getPointsWithinRadius(float input[3],float radius,std::vector<int>& pointlist,int debug)
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

  if (debug) {
    std::cout << "__ Point= " << input[0] << "," << input[1] << "," << input[2] << std::endl;
    std::cout << "__ Lattice= " << lattice[0] << "," << lattice[1] << "," << lattice[2] << std::endl;
    int p1[3],p2[3];
    for (int ia=0;ia<=2;ia++) {
      p1[ia]=this->origin[ia]+this->spacing[ia]*minlattice[ia];
      p2[ia]=this->origin[ia]+this->spacing[ia]*(1+maxlattice[ia]);
    }
    std::cout << "__ Min Lattice " << minlattice[0] << "," << minlattice[1] << "," << minlattice[2] << "(" << p1[0] << "," << p1[1] << "," << p1[2] << ")" << std::endl;
    std::cout << "__ Max Lattice " << maxlattice[0] << "," << maxlattice[1] << "," << maxlattice[2] << "(" << p2[0] << "," << p2[1] << "," << p2[2] << ")" << std::endl;
  }

  

  float radius2=radius*radius;
  if (debug)
    std::cout << "Looking for points closer than radius2=" << radius2 << std::endl;
  pointlist.clear();
  int strides[3] = { 1, this->dimensions[0], this->dimensions[0]*this->dimensions[1] };
  
  for (int k=minlattice[2];k<=maxlattice[2];k++) {
    for (int j=minlattice[1];j<=maxlattice[1];j++) {
      for (int i=minlattice[0];i<=maxlattice[0];i++) {
        int lat[3] = { i,j,k };
        //float dist2=this->getClosestBoundaryPointDistance(input,lat,debug);
        //if (dist2<=radius2) {
        if (debug) 
          std::cout << "___ Testing lattice = " << lat[0] << "," << lat[1] << "," << lat[2] << std::endl;
        this->addPointsInBinCloserThanT(input,pts,i+j*strides[1]+k*strides[2],radius2,pointlist);
        if (debug)
          std::cout << "___ numpoints so far =" << pointlist.size() << std::endl;
        /* } else if (debug)  {
           std::cout << "___ NOT Adding lattice = " << lat[0] << "," << lat[1] << "," << lat[2] << " closest=" << dist2 << " < " << radius2 << std::endl;
           }*/
      }
    }
  }
  
  return pointlist.size();
}
// -------------------------------------------------------------------------------------------------------------------
// find the nearest point
//
int bisPointLocator::getNearestPoint(float input[3],float output[3],int debug) {
  if (this->dimensions[0]<1)
    return -1;
  

  int strides[3] = { 1, this->dimensions[0], this->dimensions[0]*this->dimensions[1] };
  int lattice[3];
  for (int ia=0;ia<=2;ia++)  {
    lattice[ia]=bisUtil::irange(int( (input[ia]-this->origin[ia])/this->spacing[ia]),0,this->dimensions[ia]-1);
  }
  int latticeindex=lattice[0]+lattice[1]*strides[1]+lattice[2]*strides[2];
  if (debug) {
    std::cout << "__ Point= " << input[0] << "," << input[1] << "," << input[2] << std::endl;
    std::cout << "__ Lattice= " << lattice[0] << "," << lattice[1] << "," << lattice[2] << std::endl;
    std::cout << "__ Lattice Index=" << latticeindex << std::endl;
  }
    
  
  std::stack<int>  stack;
  stack.push(latticeindex);
  std::vector<int> visited(this->dimensions[0]*this->dimensions[1]*this->dimensions[2],0);
  
  float mindist2=0.0;
  int bestpoint=-1;
  float* pts=this->points->getData();

  if (debug)
    std::cout << "Stack Size=" << stack.size() << std::endl;

  int numvisits=0;
  
  while (stack.size()>0) {

    ++numvisits;
    
    int currentbin=stack.top();
    if (debug) 
      std::cout << std::endl << "_____ Stack=" << stack.size() << " looking at bin=" << currentbin << std::endl;

    stack.pop();
    int lattice[3];
    lattice[2]=int(currentbin/ strides[2]);
    int tmp=currentbin % strides[2];
    lattice[1]=int( tmp / strides[1]);
    lattice[0]=tmp % strides[1];

    if (debug) 
      std::cout << "___ Lattice = " << lattice[0] << "," << lattice[1] << "," << lattice[2] << " --> " << currentbin << std::endl;
        
    
    float dist2=0.0;
    int nearest=this->findNearestPointInBin(input,pts,currentbin,dist2,debug);
    visited[currentbin]=1;
    if (nearest>=0 && (dist2< mindist2 || bestpoint==-1)) {
      mindist2=dist2;
      bestpoint=nearest;
    }

    if (debug)
      std::cout << "__ Checking neighbors mind2=" << mindist2 << " bestpoint=" << bestpoint << std::endl;
    
    // check neighbors and add them
    for (int axis=0;axis<=2;axis++)
      {
        for (int shift=-1;shift<=1;shift+=2)
          {
            int newlat[3] = { lattice[0],lattice[1],lattice[2] };
            newlat[axis]=lattice[axis]+shift;
            if (newlat[axis]>=0 && newlat[axis] < this->dimensions[axis])
              {
                int latindex=newlat[0]+newlat[1]*strides[1]+newlat[2]*strides[2];
                if (debug)
                  std::cout << "____ Checking lattice = " << newlat[0] << "," << newlat[1] << "," << newlat[2] << "-->" << latindex << ", visited=" << visited[latindex] << std::endl;
                if (visited[latindex]==0) {
                  float d2=this->getClosestBoundaryPointDistance(input,newlat);
                  if (d2<mindist2 || bestpoint<0)  {
                    if (debug)
                      std::cout << "____     ADDING lattice = " << newlat[0] << "," << newlat[1] << "," << newlat[2] << ", mindistance= " << d2 << std::endl;
                    stack.push(newlat[0]+newlat[1]*strides[1]+newlat[2]*strides[2]);
                  } else if (debug) {
                    std::cout << "____      NOT adding lattice = " << newlat[0] << "," << newlat[1] << "," << newlat[2] << ", mindistance= " << d2 << std::endl;
                    
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

  if (debug) {
    std::cout << "____ numvisits=" << numvisits << std::endl;
  }
  
  return bestpoint;
}

