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

#ifndef _bis_AbstractImageRegistration_h
#define _bis_AbstractImageRegistration_h


#include "bisSimpleDataStructures.h"
#include "bisJSONParameterList.h"
#include "bisJointHistogram.h"
#include "bisOptimizer.h"

class bisAbstractTransformation;

/**
 * Abstract Parent class for Image Registration code
 */
class bisAbstractImageRegistration : public bisOptimizableAlgorithm {
  
public:
  
  /** Constructor
   * @param n value to set the name of the object
   */
   bisAbstractImageRegistration(std::string n);
  
  /** Destructor */
  virtual ~bisAbstractImageRegistration();
  
  /** Set Reference Image
   * @param input the reference image (as a shared pointer)
   */
  void setReferenceImage(std::shared_ptr<bisSimpleImage<float> > input);

  /** Set Target Image
   * @param input the target image (as a shared pointer)
   */
  void setTargetImage(std::shared_ptr<bisSimpleImage<float> > input);

  
  /** Set Reference Weight Image
   * @param input the reference weight image (as a shared pointer)
   */
  void setReferenceWeightImage(std::shared_ptr<bisSimpleImage<short> > input);


  /** Set Target Weight Image
   * @param input the target weight image (as a shared pointer)
   */
  void setTargetWeightImage(std::shared_ptr<bisSimpleImage<short> > input);
  
  /** MAIN Function -- this invokes the transformation
   * @param  plist -- the list of parameters
   */
  virtual void run(bisJSONParameterList* plist)=0;
  

  // Get Step Size
  virtual float getCurrentStepSize();
  
protected:

  // Images
  /** The reference image */
  std::shared_ptr<bisSimpleImage<float> > reference;
  /** The target image */
  std::shared_ptr<bisSimpleImage<float> > target;
  /** The reference weight image */
  std::shared_ptr<bisSimpleImage<short> > reference_weight;
  /** The target weight image */
  std::shared_ptr<bisSimpleImage<short> > target_weight;

  /** The resampled and smoothed and normalized reference image used at the current level */
  std::unique_ptr<bisSimpleImage<short> > level_reference;

  /** The resampled and smoothed and normalized target  image used at the current level */
  std::unique_ptr<bisSimpleImage<short> > level_target;

  /** The resampled and smoothed reference weight image used at the current level */  
  std::unique_ptr<bisSimpleImage<short> > level_reference_weight;

  /** The resampled and smoothed target weight image used at the current level */  
  std::unique_ptr<bisSimpleImage<short> > level_target_weight;

  /** A temporary image to store the resliced level_target_image at each iteration (at the current level) */  
  std::unique_ptr<bisSimpleImage<short> > temp_target;

  /** A temporary image to store the resliced level_target_weight at each iteration (at the current level) */  
  std::unique_ptr<bisSimpleImage<short> > temp_target_weight;

  /** if use weights =0, then no weights, 1=ref only, 2=both */
  int use_weights;

  /** the dimensions of the resampled reference image at the current level */
  int level_dimensions[3];

  /** the bounds [ 0,dim[0]-1,0,dim[1]-1,0,dim[2]-1] of the resampled reference image at the current level */
  int level_bounds[6];

  /** the current step size for optimization */
  float current_step_size;

  /** the current metric see bisJointHistogram::computeMetric */
  int metric;

  /** whether we have a reference weight or not */
  int has_reference_weight;

  /** whether we have a target weight or not */
  int has_target_weight;
  
  /** Initialize images for the current level
   * @param lv the current level
   * @param initial the initial transformation used to resample the target images (when using multiple transformations)
   */
  virtual void initializeLevel(int lv,bisAbstractTransformation* initial=0);
  
  /** the joint histogram */
  std::unique_ptr<bisJointHistogram>    internalHistogram;

  /** the parameter list */
  std::unique_ptr<bisJSONParameterList> internalParameters;
  
  /** Prepare Images for registration. This is called by the initializeLevel function
   * @param resolution_factor factor by which to downsample the images for the current level
   * @param initial the initial transformation used to resample the target images (when using multiple transformations)
   * @returns 1 if success
   */
  virtual int prepareImagesForRegistration(float resolution_factor,bisAbstractTransformation* initial=0);

  /** Ensure all parameters are there
   * parses input parameters and ensures all necessary parameters are set, else uses default values
   * this creates tge internalParameters object
   * @returns 1 if success
   */
  virtual int checkInputParameters(bisJSONParameterList* plist);

private:


  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisAbstractImageRegistration(const bisAbstractImageRegistration&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisAbstractImageRegistration&);  

};

#endif
