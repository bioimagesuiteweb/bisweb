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


#ifndef _bis_PointLocator_h
#define _bis_PointLocator_h

#include <vector>
#include "bisSimpleDataStructures.h"

/**
 * Class that creates a point locator to allow for fast searches
 */
class bisPointLocator : public bisObject {
  
public:
  
  /** Constructor
   * @param name used to set class name 
   */
  bisPointLocator(std::string name="pointlocator");
  
  /** Destructor */
  virtual ~bisPointLocator();
  
  /** Initialize Locator 
   * @param points an Nx3 matrix containing the points
   * @param length the length of each octtree box (fraction of range)
   * @returns 1 if successful, 0 otherwise
   */
  int initialize(std::shared_ptr<bisSimpleMatrix<float> > points,float length=0.1,int debug=0);
  
  /**
   * Get Nearest Point
   * @param input the coordinate of the point
   * @param output the coordinates of the nearest point
   * @returns the index of the nearest point (-1 if no points)
   */
  int getNearestPoint(float input[3],float output[3],int debug=0);

  /**
   * Get Nearest N Points
   * @param input the coordinate of the point
   * @param radius the search distance
   * @param pointlist the indices of the points
   * @returns number of points returned or 0 if failed
   */
  int getPointsWithinRadius(float input[3],float radius,std::vector<int>& pointlist,int debug=0);


protected:

  /** octree storage */
  std::vector<std::vector<int> > indices;

  /** Stores the backup histogram */
  std::shared_ptr<bisSimpleMatrix<float> > points;
  
  /** bin spacing */
  float spacing[3];
  
  /** bin origin */
  float origin[3];
  
  /** bin dimensions */
  int dimensions[3];
  
  /** find the nearest point in the bin bin */
  int findNearestPointInBin(float input[3],float* pts,int bin,float& mindist2,int debug=0);
  
  /** find points in bin of distance < T and add to pointlist */
  int addPointsInBinCloserThanT(float input[3],float* pts,int bin,float T,std::vector<int>& pointlist,int debug=0);

  /** get closed boundary boing in a bin with lattice coordinates = lattice, return squared distance */
  float getClosestBoundaryPointDistance(float input[3],int lattice[3],int debug=0);
  
private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisPointLocator(const bisPointLocator&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisPointLocator&);  
};
  

#endif
  
