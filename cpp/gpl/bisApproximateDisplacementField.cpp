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

#include "bisApproximateDisplacementField.h"
#include "bisImageAlgorithms.h"
#include <sstream>
#include <iomanip>
#include <time.h>

bisApproximateDisplacementField::bisApproximateDisplacementField(std::string s) : bisOptimizableAlgorithm(s)
{
  this->class_name="bisApproximateDisplacementField";
}

bisApproximateDisplacementField::~bisApproximateDisplacementField()
{
  this->lastSmoothness=-1.0;
  this->lastSimilarity=-1.0;
}


void bisApproximateDisplacementField::generateFeedback(std::string input)
{

  std::cout << input << "  (" << std::fixed << std::setw(5) << this->lastSimilarity << "," << std::setw(5) << this->lastSmoothness << ")" << std::endl;
}


void bisApproximateDisplacementField::generateFeedback2(std::string input)
{
   std::cout << input << std::endl;
}

// Optimizer Stuff
float bisApproximateDisplacementField::computeValue(std::vector<float>& position)
{
  this->currentGridTransformation->setParameterVector(position);
  this->currentGridTransformation->inPlaceComputeDisplacementField(this->temp_displacement_field.get(),this->level_bounds);

  float v=0;

  /*  for (int ia=0;ia<=5;ia++)
    {
      std::cout << "Original = " << this->level_reference->getImageData()[ia] << " vs " << this->temp_displacement_field->getImageData()[ia] << std::endl;
      }*/
  
  
  if (!this->inverse)
    {
      v=bisAbstractTransformation::computeDisplacementFieldSSD(this->temp_displacement_field.get(),
							       this->level_reference.get(),
							       this->level_bounds);
    }
  else
    {
      v=bisImageAlgorithms::computeDisplacementFieldRoundTripError(this->level_reference.get(),
								   this->temp_displacement_field.get(),
								   this->level_bounds);
    }
	
  

  this->lastSimilarity=v;
  

  if (this->lambda>0.0)
    {
      this->lastSmoothness=this->currentGridTransformation->getTotalBendingEnergy();
      v+=this->lambda*this->lastSmoothness;
    }

  return v;
}


float bisApproximateDisplacementField::computeValueFunctionPiece(bisAbstractTransformation* tr,int bounds[6],int cp)
{

  int debug=0;

  tr->inPlaceComputeDisplacementField(this->temp_displacement_field.get(),bounds);
  
  float v=0;
  if (!this->inverse)
    {
      v=bisAbstractTransformation::computeDisplacementFieldSSD(this->temp_displacement_field.get(),
							       this->level_reference.get(),
							       bounds,debug);
    }
  else
    {
      v=bisImageAlgorithms::computeDisplacementFieldRoundTripError(this->level_reference.get(),
								   this->temp_displacement_field.get(),
								   bounds,debug);
    }


  if (debug)
    {
      int i=(bounds[1]-bounds[0])/2;
      int j=(bounds[3]-bounds[2])/2;
      int k=(bounds[5]-bounds[4])/2;
      int dim[3]; temp_displacement_field->getImageDimensions(dim);
      int index=k*dim[0]*dim[1]+j*dim[0]+i;
      std::cout << " Target=" << this->level_reference->getImageData()[index] << " vs Gen=" <<  this->temp_displacement_field->getImageData()[index] << std::endl;
    }
  if (this->lambda>0.0)
    v+=this->lambda*this->currentGridTransformation->getBendingEnergyAtControlPoint(cp);
  
  return v;
}


float bisApproximateDisplacementField::computeGradient(std::vector<float>& params,std::vector<float>& grad)
{
  int dim_ref[3]; level_reference->getImageDimensions(dim_ref);
  float spa_ref[3]; level_reference->getImageSpacing(spa_ref);

  return this->currentGridTransformation->computeGradientForOptimization(params,grad,
									   this->current_step_size,
									   dim_ref,spa_ref,this->windowsize,
									   this);
}

  
int bisApproximateDisplacementField::checkInputParameters(bisJSONParameterList* plist)
{
  std::unique_ptr<bisJSONParameterList> tmp(new bisJSONParameterList(this->name+":plist"));
  this->internalParameters=std::move(tmp);

  
  this->internalParameters->setFloatValue("lambda",bisUtil::frange(plist->getFloatValue("lambda",0.0f),0.0f,1.0f));
  this->internalParameters->setFloatValue("windowsize",bisUtil::frange(plist->getFloatValue("windowsize",1.0f),1.0f,2.0f));
  this->internalParameters->setFloatValue("resolution",bisUtil::frange(plist->getFloatValue("resolution",1.5f),0.5f,10.0f));
  this->internalParameters->setFloatValue("resolutionrate",bisUtil::frange(plist->getFloatValue("resolutionrate",2.0f),1.5f,3.0f));
  this->internalParameters->setFloatValue("tolerance",bisUtil::frange(plist->getFloatValue("tolerance",0.001f),0.0f,0.5f));
  this->internalParameters->setIntValue("levels",bisUtil::irange(plist->getIntValue("levels",3),1,4));
  this->internalParameters->setIntValue("steps",bisUtil::irange(plist->getIntValue("steps",1),1,4));
  this->internalParameters->setFloatValue("stepsize",bisUtil::frange(plist->getFloatValue("stepsize",1.0f),0.05f,4.0f));
  this->internalParameters->setIntValue("iterations",bisUtil::irange(plist->getIntValue("iterations",15),1,100));
  this->internalParameters->setIntValue("inverse",plist->getBooleanValue("inverse",0));
  this->lambda=this->internalParameters->getFloatValue("lambda",0.0f);
  this->windowsize=  this->internalParameters->getFloatValue("windowsize",1.0f);
  this->inverse=this->internalParameters->getIntValue("inverse");
  this->internalParameters->print("Checked!");
  return 1;
}

void bisApproximateDisplacementField::initializeLevel(int lv)
{
  float rsc=this->internalParameters->getFloatValue("resolution",1.5f);
  float rate=this->internalParameters->getFloatValue("resolutionrate",2.0f);
  float resolution=rsc*powf(rate,lv-1.0f);

  float ospa[5]; currentDisplacementField->getSpacing(ospa);
  float target_spa[3];
  
  for (int ia=0;ia<=2;ia++)
    {
      target_spa[ia]=resolution*ospa[ia];

    }

  // Create resample disp field
  std::unique_ptr<bisSimpleImage<float> > tmp(bisImageAlgorithms::resampleImage<float>(currentDisplacementField,target_spa));
  this->level_reference=std::move(tmp);

  // Create empty disp field
  std::unique_ptr<bisSimpleImage<float> > tmp2(new bisSimpleImage<float>("temp_dispfield"));
  tmp2->copyStructure(this->level_reference.get());
  this->temp_displacement_field=std::move(tmp2);

  int dim[3]; this->temp_displacement_field->getImageDimensions(dim);
  for (int ia=0;ia<=2;ia++)
    {
      this->level_bounds[2*ia]=0;
      this->level_bounds[2*ia+1]=dim[ia]-1;
    }
      
}


// Set Parameters and Run
float bisApproximateDisplacementField::run(bisSimpleImage<float>* displacementGrid, bisGridTransformation* transformation,bisJSONParameterList* plist)
{

  this->currentGridTransformation=transformation;
  this->currentDisplacementField=displacementGrid;
  
  this->generateFeedback2("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
  this->checkInputParameters(plist);

  this->generateFeedback2("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


  std::stringstream strss;
  strss.precision(5);

  int numlevels=  this->internalParameters->getIntValue("levels");
  int numsteps=   this->internalParameters->getIntValue("steps");
  float stepsize=   this->internalParameters->getFloatValue("stepsize");
  int iterations=this->internalParameters->getIntValue("iterations");
  float tolerance=this->internalParameters->getFloatValue("tolerance",0.001f);

  // Also cps, cpsrate, windowsize, lambda ...
  
  std::cout << "++++ Retrieved parameters: nlevels=" << numlevels << " numsteps=" << numsteps << " stepsize=" << stepsize << std::endl;
  std::cout << "++++   iterations=" << iterations << " tolerance=" << tolerance << std::endl;


  float last=0.0;

  for (int level=numlevels;level>=1;level=level-1)
    {

      this->generateFeedback2("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
      strss.clear();
      std::stringstream strss2;
      if (!this->inverse)
	strss2 << "++++ Beginning to appproximate FORWARD displacement field at level=" << level << ", numsteps=" << numsteps << ", tolerance=" << tolerance;
      else
      	strss2 << "++++ Beginning to appproximate INVERSE displacement field at level=" << level << ", numsteps=" << numsteps << ", tolerance=" << tolerance;
      this->generateFeedback2(strss2.str());
      this->generateFeedback2("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
      this->initializeLevel(level);

      this->generateFeedback2("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
      float spa[3]; this->level_reference->getImageSpacing(spa);
      int numdof=this->currentGridTransformation->getNumberOfDOF();
      this->current_step_size=stepsize*powf(2.0,float(numsteps-1))*0.5f*spa[0];
      this->generateFeedback2("++++");
      std::stringstream strss3;
      strss3 << "++++ \t\t beginning level=" << level << " resolution=" << spa[0] << " numdof=" << numdof << " current_step=" << this->current_step_size;
      this->generateFeedback2(strss3.str());
      this->generateFeedback2("++++");
      // Set stepsize

      std::unique_ptr<bisOptimizer> optimizer(new bisOptimizer(this));

      std::vector<float> position(numdof);
      
      // Get current state ...
      this->currentGridTransformation->getParameterVector(position);
      
      for (int step=numsteps;step>=1;step=step-1)
	{
	  std::cout << "~~~~ In step = " << step << " \t iterations = " << iterations << " cur=" << this->current_step_size << std::endl;

	  strss.clear();
	  this->generateFeedback2(strss.str());
	  last=optimizer->computeConjugateGradient(position,iterations,tolerance);
	  this->current_step_size=this->current_step_size/2.0f;
	}
      this->generateFeedback2("++++");
      this->generateFeedback2("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

    }


  this->generateFeedback2("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

  return last;
}




