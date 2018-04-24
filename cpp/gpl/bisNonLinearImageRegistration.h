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


#ifndef _bis_NonLinearImageRegistration_h
#define _bis_NonLinearImageRegistration_h

#include "bisUtil.h"
#include "bisAbstractImageRegistration.h"
#include "bisComboTransformation.h"
#include "bisGridTransformation.h"

/**
 * Implements nonlinear (tensor b-spline) image registration
 */

class bisNonLinearImageRegistration : public bisAbstractImageRegistration,bisGridTransformationOptimizable {
  
 public:

  /** Constructor
   * @param n value to set the name of the object
   */
  bisNonLinearImageRegistration(std::string n="nonlineareg");

  /** Destructor */
  virtual ~bisNonLinearImageRegistration();

  // Set Parameters and Run
  virtual void run(bisJSONParameterList* plist);
  
  /** Set Initial transformation
   * @param initial the initial matrix
   */
  void setInitialTransformation(bisMatrixTransformation* initial);

  // Optimizer Stuff
  virtual float computeValue(std::vector<float>& position);
  virtual float computeGradient(std::vector<float>& position,std::vector<float>& gradient);

  // bisGridTransformationOptimizable interface
  virtual float computeValueFunctionPiece(bisAbstractTransformation* tr,int bounds[6],int cp);

  /** Get Output Transformation
   * @returns the output combo transformation (shared pointer)
   */
  std::shared_ptr<bisComboTransformation> getOutputTransformation() { return this->internalTransformation; }

  // Enhance this to add last similarity and last smoothness
  virtual void generateFeedback(std::string input);

  /**
   * Essentially a print function for now
   * @param input string to print */
  virtual void generateFeedback2(std::string input);

protected:

  /** the current combo transformation */
  std::shared_ptr<bisComboTransformation> internalTransformation;

    /** the currently being optimize gridtransformation, this is added to internalTransformation when the current level is done */
  std::shared_ptr<bisGridTransformation> currentGridTransformation;

  /** A temp image to reslice in part into during optimization */
  std::unique_ptr<bisSimpleImage<short> > part_temp_target;
  
  // Check Params (basically mode of transformation)
  virtual int checkInputParameters(bisJSONParameterList* plist);

  // Initialize Level
  virtual void initializeLevel(int lv,bisAbstractTransformation* initial=0);
  

#ifndef DOXYGEN_SKIP  
  double totaltime,reslicetime,filltime;
#endif

  /** The current control point spacing */
  float current_cps[3];

  /** The current grid dimensions */
  int current_dim[3];

  /** The current value of the regularization weight */
  float lambda;

  /** The current value of the windowsize for gradient computation */
  float windowsize;

  /** Last similarity **/
  float lastSimilarity;

  /** Last smoothness **/
  float lastSmoothness;
  

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisNonLinearImageRegistration(const bisNonLinearImageRegistration&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisNonLinearImageRegistration&);  
  
};

#endif
