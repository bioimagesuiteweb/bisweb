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


#ifndef _bis_GridTransformation_h
#define _bis_GridTransformation_h

#include "bisAbstractTransformation.h"
#include <vector>
#include "bisSimpleDataStructures.h"


/**
 * Pure abstract class (interface in Java terms) used by bisGridTransformation when computing gradients
 * for optimization for extra efficieny.
 */
class bisGridTransformationOptimizable  {

public:
  /** This computes the value of some operation (image similarity)
   * for only a piece of the image (bounds) around a single control point */
  virtual float computeValueFunctionPiece(bisAbstractTransformation* tr,int bounds[6],int cp)=0;
};


/**
 * Implements a tensor transformation using either linear or tensor b-spline interpolation
 * inpsired by vtkGridTransform
 */
class bisGridTransformation : public bisAbstractTransformation {
  
 public:

  /** Constructor
   * @param name used to set class name 
   */
  bisGridTransformation(std::string name="gridxform"); 
  
  /** returns number of degrees of freedom = num control points * 3 */
  unsigned int getNumberOfDOF();

  /** returns number of control points */
  unsigned int getNumberOfControlPoints();

  /** returns 1 if using bspline interpolation or 0 if linear */
  int getBSplineMode();

  /** Sets the underlying displacement grid to zero */
  virtual void identity();


  /** Transform point x to y 
   * @param x input point
   * @param y output point
   */
  virtual void transformPoint(float x[3],float y[3]);


  /** Initialize Grid to given dimensions, spacing ,origin and interpolation mode
   * @param dim grid dimensions (but will be increased if < 4 in any direction)
   * @param spa target grid spacing (may be adjusted if grid dimensions are changed to be at least 4)
   * @param origin target grid origin (may be adjust if grid dimensions are changed to be at least 4)
   * @param dobspline if 1 use b-spline interpolation else linear
   */
  virtual void initializeGrid(int dim[3],float spa[3],float origin[3],int dobspline=1);


  /** Set the displacements of the grid */
  virtual int setParameterVector(std::vector<float>& params);

  /** Get the displacements of the grid */
  virtual int getParameterVector(std::vector<float>& params);

  /** Compute Gradient for Optimization 
   * @param params current value of displacement grid
   * @param grad output gradient
   * @param stepsize amount to perturb position to compute gradient
   * @param imgdim underlying image dimensions
   * @param imgspa underlying image spacing
   * @param windowsize (1.0 to 2.0). Amount of image to use 1.0 = 1.0xcontrol point spacing. Strictly speaking
   * this needs to be 2.0 but 1.0 is good enough and accelerates things
   * @param optimizable object to call to compute the actual value
   * @returns the magnitude of the gradient vector */
  virtual float computeGradientForOptimization(std::vector<float>& params,
					       std::vector<float>& grad,
					       float stepsize,
					       int imgdim[3],
					       float imgspa[3],
					       float windowsize,
					       bisGridTransformationOptimizable* optimizable);

  /** Computes the bending energy of the transformation *0.01 */
  float getTotalBendingEnergy();

  /** Computes the contribution of the bending energy at a control point 
   * @param scale if < 0 this is set to 0.01*(1.0/(float(this->getNumberOfControlPoints())));
   * @param cpoint control point index
   * @param scale  value to multiply raw bending energy by
   */
  float getBendingEnergyAtControlPoint(int cpoint,float scale=-1.0);



  /** deSerialize this object to a pointer (which has been pre-allocated
   * @param  pointer place to store output from
   */
  virtual int deSerialize(unsigned char* pointer);

  /** serialze this class to provided pointer 
   * @param output pointer to store data in
   */
  virtual void serializeInPlace(unsigned char* output);

  /** returns size needed to serialize this object in bytes */
  virtual long getRawSize();

  /** returns raw data as float pointer */
  virtual float* getData() { return displacementField->getData(); }


  /** serialize to Text 
   * @param debug print diagnostic messages if > 0
   * @returns a string
   */
  virtual std::string textSerialize(int debug=0);

  /** parse from Text 
   * @param lines (a vector of lines)
   * @param offset the line to begin parsing (at end the last line)
   * @param debug print diagnostic messages if > 0
   * @returns a string
   */
  virtual int textParse(std::vector<std::string>& lines,int& offset,int debug=0);

  // No
  virtual  int isLinear() { return 0;}

  /** Get Grid Origin */
  virtual void getGridOrigin(float ori[3]) {
    ori[0]=this->grid_origin[0];
    ori[1]=this->grid_origin[1];
    ori[2]=this->grid_origin[2];
  }

  /** Get Grid Spacing */
  virtual void getGridSpacing(float spa[3]) {
    spa[0]=this->grid_spacing[0];
    spa[1]=this->grid_spacing[1];
    spa[2]=this->grid_spacing[2];
  }
    
  virtual void getGridDimensions(int dim[3]) {
    dim[0]=this->grid_dimensions[0];
    dim[1]=this->grid_dimensions[1];
    dim[2]=this->grid_dimensions[2];
  }
  
protected:

  /** Object to store displacements in */
  std::unique_ptr<bisSimpleVector<float> > displacementField;

    
#ifndef DOXYGEN_SKIP
  /** Grid Parameters origin, spacing, dimensions and others */
  float grid_origin[3],grid_spacing[3];
  int grid_dimensions[3],grid_slice_size,grid_vol_size,minusdim[3];
#endif
  
  /** Interpolation flag */
  int dobspline_interpolation;

  /** transform X -> TX using linear interpolation */
  void transformPointLinearInterpolation(float X[3],float TX[3]);

  /** transform X -> TX using b-spline interpolation */
  void transformPointBSplineInterpolation(float X[3],float TX[3]);

  /** Get Pointer to value of grid at control point (i,j,k) */
  float* getGridPointer(float* basepointer,int i,int j,int k);

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisGridTransformation(const bisGridTransformation&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisGridTransformation&);  
	
};

#endif
