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


#ifndef _bis_ApproximateDisplacementField_h
#define _bis_ApproximateDisplacementField_h

#include "bisUtil.h"
#include "bisAbstractImageRegistration.h"
#include "bisComboTransformation.h"
#include "bisGridTransformation.h"

/**
 * Implements nonlinear (tensor b-spline) image registration
 */

class bisApproximateDisplacementField : public bisOptimizableAlgorithm,bisGridTransformationOptimizable {
  
 public:

  /** Constructor
   * @param n value to set the name of the object
   */
  bisApproximateDisplacementField(std::string n="nonlineareg");

  /** Destructor */
  virtual ~bisApproximateDisplacementField();

  /** Run algorithm
   * @param displacementField is what we are trying to approximate
   * @param transformation this is the transformation being optimizized to approximate the displacement field
   * @param plist are the parameters for the algorithm (key one is inverse=true for doing the inverse)
   */
  virtual float run(bisSimpleImage<float>* displacementField, bisGridTransformation* transformation,bisJSONParameterList* plist);

  // Optimizer Stuff
  virtual float computeValue(std::vector<float>& position);
  virtual float computeGradient(std::vector<float>& position,std::vector<float>& gradient);

  // bisGridTransformationOptimizable interface
  virtual float computeValueFunctionPiece(bisAbstractTransformation* tr,int bounds[6],int cp);

  // Enhance this
  virtual void generateFeedback(std::string input);

  /**
   * Essentially a print function for now
   * @param input string to print */
  virtual void generateFeedback2(std::string input);

protected:

  /** the parameter list */
  std::unique_ptr<bisJSONParameterList> internalParameters;

  /** the current grid transformation */
  bisGridTransformation* currentGridTransformation;

  /** the current disp field to approximate */
  bisSimpleImage<float>* currentDisplacementField;
  
  /** A temp image to store the displacement field during optimization */
  std::unique_ptr<bisSimpleImage<float> > temp_displacement_field;

  /** A temp image to store the displacement field during optimization */
  std::unique_ptr<bisSimpleImage<float> > level_reference;
  
  /** Check Params (basically mode of transformation)
   *@param plist is the input parameter set (from run)
   *@returns 1 if success
   */
  virtual int checkInputParameters(bisJSONParameterList* plist);

  /** the current step size for optimization */
  float current_step_size;
  
  /** The current value of the regularization weight */
  float lambda;

  /** if inverse we are fitting to the inverse displacement field */
  int inverse;

  /** level bounds, current bounds of displacement field */
  int level_bounds[6];
  
  /** The current value of the windowsize for gradient computation */
  float windowsize;

  /** Initialize images for the current level
   * @param lv the current level
   */
  void initializeLevel(int lv);

  /** Last similarity **/
  float lastSimilarity;

  /** Last smoothness **/
  float lastSmoothness;
  
private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisApproximateDisplacementField(const bisApproximateDisplacementField&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisApproximateDisplacementField&);  
  
};

#endif
