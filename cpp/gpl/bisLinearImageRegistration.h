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


#ifndef _bis_LinearImageRegistration_h
#define _bis_LinearImageRegistration_h

#include "bisUtil.h"
#include "bisAbstractImageRegistration.h"
#include "bisLinearTransformation.h"

/**
 * Implements linear image registration (rigid, similarity, affine)
 */
class bisLinearImageRegistration : public bisAbstractImageRegistration {
  
 public:
  
  /** Constructor
   * @param n value to set the name of the object
   */
  bisLinearImageRegistration(std::string n="linearreg");

  /** Destructor */
  virtual ~bisLinearImageRegistration();

  /** MAIN Function -- this invokes the transformation -- look at the code for complete list
   * @param  plist -- the list of parameters
   */
  virtual void run(bisJSONParameterList* plist);
  
  /** Return the transformation parameters 
   * @returns a vector containing the transformation parameters
   */
  std::unique_ptr<bisSimpleVector<float> > getTransformationParameterVector();

  /** Return the transformation matrix 
   * @returns a matrix containing the resulting transformation
   */
  std::unique_ptr<bisSimpleMatrix<float> > getOutputMatrix();

  /** Set Initial transformation
   * @param initial the initial matrix
   */
  void setInitialTransformation(bisMatrixTransformation* initial);

  virtual float computeValue(std::vector<float>& position);
  virtual float computeGradient(std::vector<float>& position,std::vector<float>& gradient);


  
protected:

  /** the current transformation that is being optimized */
  std::unique_ptr<bisLinearTransformation> internalTransformation;

  /** the initial transformation */
  std::unique_ptr<bisMatrixTransformation> initialTransformation;

  virtual int checkInputParameters(bisJSONParameterList* plist);

#ifndef DOXYGEN_SKIP  
  // Time things
  double totaltime,reslicetime,filltime;
#endif
  
private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisLinearImageRegistration(const bisLinearImageRegistration&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisLinearImageRegistration&);  
  
};

#endif
