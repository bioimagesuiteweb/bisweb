/*  License
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._ It is released under the terms of the GPL v2.
 
 ----
     
   This program is free software; you can redistribute it and/or
   modify it under the terms of the GNU General Public License
   as published by the Free Software Foundation; either version 2
   of the License, or (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
   See also  http: www.gnu.org/licenses/gpl.html
   
   If this software is modified please retain this statement and add a notice
   that it had been modified (and by whom).  
 
 Endlicense */


#include <string>
#include <iostream>

#ifndef _bis_Optimizer_h
#define _bis_Optimizer_h

#include <vector>
#include "bisObject.h"


/**
 * Parent class for all classes that provide the "Optimizable" Interface
 * These can be "exercised using the bisOptimizer class 
 */

class bisOptimizableAlgorithm : public bisObject {

public:

  /** Constructor
   * @param n used to set class name 
   */
  bisOptimizableAlgorithm(std::string n) : bisObject(n) {   this->enable_feedback=1;}

  /** Compute the value being optimized at this position. Called by bisOptimizer.
   * @param position this contains the current set of parameters
   * @returns the computed value
   */
  virtual float computeValue(std::vector<float>& position)=0;

  /** Compute the gradient of the value being optimized at this position. Called by bisOptimizer.
   * @param position this contains the current set of parameters
   * @param gradient the output gradient at the current position
   * @returns the magnitude of the gradient vector
   */
  
  virtual float computeGradient(std::vector<float>& position,std::vector<float>& gradient)=0;

  /** Called at the beginning of each iteration by bisOptimizer.
   * @param position this contains the current set of parameters
   * @param iterno the current iteration number
   */
  virtual void beginIteration(std::vector<float>&  position,int iterno);


  /** Called  by bisOptimizer to generate output (essentially print)
   * @param input the current message
   */
  virtual void generateFeedback(std::string input) { if (enable_feedback) std::cout << input << std::endl; }

  /** Returns the current step size */
  virtual float getCurrentStepSize() { return -1.0;}

protected:
  /** If zero then no print statements during optimization */
  int enable_feedback;
  

};

#ifndef DOXYGEN_SKIP  
class optParams {

public:
  float ax,bx,cx;
  float fa,fb,fc;
  float xmin;
};
#endif // DOXYGEN_SKIP

/**
 * Optimizer class. This can be used to optimize a functional implemented in a class
 * derived from bisOptimizableAlgorithm
 */

class bisOptimizer : public bisObject {

public:

  /** Constructor
   * @param algorithm the class to optimize
   * @param n used to set class name 
   */
  bisOptimizer(bisOptimizableAlgorithm* algorithm,std::string n="optimizer");

  /** Destructor */
  virtual ~bisOptimizer();

  /** Compute Gradient Descent optimization (of the underlying algorithm)
   * @param position on input the initial set of parameters, on output the optimal set)
   * @param iterations maximum number of iterations
   * @param tolerance if change is below this the optimization stops
   * @returns the optimal value of the functional
   */
  float computeGradientDescent(std::vector<float>& position,int iterations,float tolerance);

  /** Compute Hill Climbing optimization (of the underlying algorithm)
   * @param position on input the initial set of parameters, on output the optimal set)
   * @param step  the current step size to move around by
   * @param iterations maximum number of iterations
   * @returns the optimal value of the functional
   */
  float computeSlowClimb(std::vector<float>& position,float step,int iterations);

  /** Compute Conjugate Gradient Descent optimization (of the underlying algorithm)
   * @param position on input the initial set of parameters, on output the optimal set)
   * @param iterations maximum number of iterations
   * @param tolerance if change is below this the optimization stops
   * @returns the optimal value of the functional
   */
  float computeConjugateGradient(std::vector<float>& position,int iterations,float tolerance);
  
protected:

#ifndef DOXYGEN_SKIP  
  std::vector<float> pcom,xicom,xtemp,gradient;
#endif

  /** Number of degrees of freedom being optimized -- length of position vector */
  unsigned int NumDOF;

  /** Number of function evaluation since we begun */
  int NumEvaluations;

  /** Number of gradient computations since we begun */
  int NumGradients;


  /** The algorithm to optimize */
  bisOptimizableAlgorithm* algorithm;

  /** Allocate internal storage */
  void allocateTempArrays(unsigned int sz);

  /** reset internal statistics NumGradients and NumEvaluations to zero */
  void resetStatistics();

  /** Generate Print Output 
   * @param prefix1 string to prefix the output
   * @param prefix2 string to follow prefix 1 in the output
   * @param position current set of parameters
   * @param measure current output measure
   * @param iter current number of iteration
   */
  void generateOutput(std::string prefix1,std::string prefix2,std::vector<float>& position,float measure,int iter=0);

  /** Generate Statistics print output
   * @param method name of optimization method
   * @param position current set of parameters
   */
  void generateStatistics(std::string method,std::vector<float>& position);


#ifndef DOXYGEN_SKIP  
  float lineFunction(float x);
  void  bracketMinimum(optParams& params);
  float minimizeGivenBounds(optParams& params,float tol=0.0);
  float lineMinimization(std::vector<float>& p,std::vector<float>& xi,int iterno,float tolerance,std::string method="");
#endif
  
private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisOptimizer(const bisOptimizer&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisOptimizer&);  

};


#endif
