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

#include "bisLinearImageRegistration.h"
#include "bisImageAlgorithms.h"
#include "sstream"
#include <time.h>

bisLinearImageRegistration::bisLinearImageRegistration(std::string s) : bisAbstractImageRegistration(s)
{
  this->class_name="bisLinearImageRegistration";
  
  std::string n=this->name+":internal";
  
  std::unique_ptr<bisLinearTransformation> tmp(new bisLinearTransformation(n));
  this->internalTransformation=std::move(tmp);
  this->internalTransformation->identity();

  std::string n2=this->name+":initial";
  std::unique_ptr<bisMatrixTransformation> tmpM(new bisMatrixTransformation(n2));
  this->initialTransformation=std::move(tmpM);
  this->initialTransformation->identity();

}

bisLinearImageRegistration::~bisLinearImageRegistration()
{
}


  
std::unique_ptr< bisSimpleMatrix<float> > bisLinearImageRegistration::getOutputMatrix()
{
  return this->internalTransformation->getSimpleMatrix("lin_reg_matrix");
}


std::unique_ptr<bisSimpleVector<float> > bisLinearImageRegistration::getTransformationParameterVector()
{
  std::unique_ptr<bisSimpleVector<float> > output(new bisSimpleVector<float>("lin_reg_vector"));
  output->allocate(29);

  bisUtil::mat44 m;
  this->internalTransformation->getMatrix(m);
  int index=0;
  for (int ia=0;ia<=3;ia++) {
    for (int ib=0;ib<=3;ib++) {
      output->getData()[index]=m[ia][ib];
      index=index+1;
    }
  }

  std::vector<float> p(12);
  this->internalTransformation->storeParameterVector(p,1);
  for (int ia=0;ia<=11;ia++) 
    output->getData()[ia+16]=p[ia];

  output->getData()[28]=(float)this->internalTransformation->getMode();

  return std::move(output);
}


void bisLinearImageRegistration::setInitialTransformation(bisMatrixTransformation* initial)
{
  bisUtil::mat44 m; initial->getMatrix(m);
  this->initialTransformation->setMatrix(m);
}
  

// Optimizer Stuff
float bisLinearImageRegistration::computeValue(std::vector<float>& position)
{
  this->internalTransformation->setParameterVector(position,1);
  time_t timer1,timer2;
  time(&timer1);
  bisImageAlgorithms::resliceImage(this->level_target.get(),this->temp_target.get(),this->internalTransformation.get(),1,0.0);
  time(&timer2);
  this->reslicetime+=difftime(timer2,timer1);
  
  short* weight1_ptr=0,*weight2_ptr=0;
  if (this->use_weights>0)
    {
      weight1_ptr=this->level_reference_weight->getImageData();
      if (this->use_weights==2)
	{
	  bisImageAlgorithms::resliceImage(this->level_target_weight.get(),this->temp_target_weight.get(),this->internalTransformation.get(),1,0.0);
	  weight2_ptr=this->temp_target_weight->getImageData();
	}
    }

  time_t timer3,timer4;
  time(&timer3);
  this->internalHistogram->weightedFillHistogram(this->level_reference->getImageData(),
						 this->temp_target->getImageData(),
						 weight1_ptr,
						 weight2_ptr,
						 use_weights,
						 1.0,
						 1, // reset
						 this->level_dimensions,
						 this->level_bounds);
  time(&timer4);
  this->filltime+=difftime(timer4,timer3);

  float mv=(float)this->internalHistogram->computeMetric(this->metric);

  /*  count=count+1;
  if (count>=13 && count<=20)
    {
      std::vector<float> p(12);
      this->internalTransformation->storeParameterVector(p,1);
      bisUtil::mat44 m; this->internalTransformation->getMatrix(m);
      std::cout << count << " [";
      for (int j=0;j<p.size();j++)
	std::cout << p[j] << " ";
      std::cout << "] [";
	for (int row=0;row<=2;row++) {
	  for (int col=0;col<=3;col++) {
	    std::cout << m[row][col] << " ";
	  }
	}
      std::cout << "] = " << mv << std::endl;
      }*/


  return mv;
}


float bisLinearImageRegistration::computeGradient(std::vector<float>& params,std::vector<float>& grad)
{
  
  int numdof=this->internalTransformation->getNumberOfDOF();

  //  std::cout << "sizes=" << params.size() << " " << grad.size() << " dof=" << numdof << std::endl;
  
  for (int i=0;i<numdof;i++)
    grad[i]=0.0;
		
  float GradientNorm = 0.000001f;

  
  for (int i=0;i<numdof;i++)
    {
      float orig=params[i];
      params[i]=orig+this->current_step_size;
      float a=this->computeValue(params);
		    
      params[i]=orig-this->current_step_size;
      float b=this->computeValue(params);
		    
      params[i]=orig;
      float g=-0.5f*(b-a)/this->current_step_size;
      grad[i]=g;
      GradientNorm+=g*g;
    }

  GradientNorm = (float)sqrt(GradientNorm);
  //  std::cout << "\t grad=";
  for (int i=0;i<numdof; i++) {
    grad[i]=grad[i]/GradientNorm;
    //std::cout << grad[i] << " ";
  }
  //  std::cout << std::endl;
  return GradientNorm;
}

  
int bisLinearImageRegistration::checkInputParameters(bisJSONParameterList* plist)
{

  bisAbstractImageRegistration::checkInputParameters(plist);

  int mode=bisUtil::irange(plist->getIntValue("mode",0),0,6);
  

  int dim[3];
  this->reference->getImageDimensions(dim);
  if (dim[2]<2) {
    // Force use of 2D mode
    if (mode==0)
      mode=4;
    if (mode==1 || mode==2)
      mode=5;
    if (mode==3)
      mode=6;
  }

  this->internalParameters->setIntValue("mode",mode);
  if (this->enable_feedback)
    this->internalParameters->print("Fixed Parameters prior to running Linear","+ + + ");
  return 1;
}



// Set Parameters and Run
void bisLinearImageRegistration::run(bisJSONParameterList* plist)
{

  this->checkInputParameters(plist);

  this->generateFeedback("+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +");


  std::stringstream strss;
  strss.precision(5);

  int numlevels=  this->internalParameters->getIntValue("levels");
  int numsteps=   this->internalParameters->getIntValue("steps");
  float stepsize=   this->internalParameters->getFloatValue("stepsize");
  int optimization=this->internalParameters->getIntValue("optimization");
  int iterations=this->internalParameters->getIntValue("iterations");
  float tolerance=this->internalParameters->getFloatValue("tolerance",0.001f);
  int mode=this->internalParameters->getIntValue("mode",0);
  int initial_mode=0;
  if (mode>3)
    initial_mode=4;

  if (enable_feedback) {
    std::cout << "+ +  Retrieved parameters: nlevels=" << numlevels << " numsteps=" << numsteps << " stepsize=" << stepsize << std::endl;
    std::cout << "+ +      optimization=" << optimization << " iterations=" << iterations << " tolerance=" << tolerance << std::endl;
    std::cout << "+ +      mode=" << mode << ", initial=" << initial_mode << ", similarity metric=" << metric << std::endl;
  }
  // Initialize Transformation 
  this->internalTransformation->setMode(initial_mode);
  this->internalTransformation->identity();
  this->internalTransformation->setPreMatrixTransformation(this->initialTransformation.get());

  time_t timer1,timer2;
  time(&timer1);
  for (int level=numlevels;level>=1;level=level-1)
    {
      strss.clear();
      std::stringstream strss2;
      strss2 << "+ +  Beginning to compute  l i n e a r  registration at level=" << level << ", numsteps=" << numsteps << ", tolerance=" << tolerance;
      this->generateFeedback(strss2.str());
      this->generateFeedback("+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +");
      this->initializeLevel(level);
      if (level==numlevels)
	{
	  // Set Shifts now that the first level is initialized ...
	  int dim_ref[3]; level_reference->getImageDimensions(dim_ref);
	  float spa_ref[3]; level_reference->getImageSpacing(spa_ref);
	  int dim_trg[3]; level_target->getImageDimensions(dim_trg);
	  float spa_trg[3]; level_target->getImageSpacing(spa_trg);
	  this->internalTransformation->setShifts(dim_ref,spa_ref,dim_trg,spa_trg);
	}

      this->generateFeedback("+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +");
      float spa[3]; this->level_reference->getImageSpacing(spa);
      int numdof=this->internalTransformation->getNumberOfDOF();
      std::stringstream strss3;
      this->current_step_size=stepsize*powf(2.0f,float(numsteps-1))*0.5f*spa[0];
      strss3 << "+ +  \t\t Beginning level=" << level << " resolution=" << spa[0] << " numdof=" << numdof << " current_step=" << this->current_step_size;
      this->generateFeedback("+ + ");
      this->generateFeedback(strss3.str());
      this->generateFeedback("+ + ");
      // Set stepsize


      std::unique_ptr<bisOptimizer> optimizer(new bisOptimizer(this));

      std::vector<float> position(numdof);
  
      // true here refers to scale*100.0. Get Initial Parameters from transformation
      this->internalTransformation->storeParameterVector(position,1);

      this->totaltime=0.0,this->reslicetime=0.0,this->filltime=0.0;


      for (int step=numsteps;step>=1;step=step-1)
	{
	  if (enable_feedback)
	    std::cout << "+ +  In step = " << step << ". Iterations = " << iterations << ", optimization=" << optimization <<", current=" << this->current_step_size << "." << std::endl;
	  if (optimization==0)
	    optimizer->computeSlowClimb(position,this->current_step_size,iterations);
	  else if (optimization==1)
	    optimizer->computeGradientDescent(position,iterations,tolerance);
	  else
	    optimizer->computeConjugateGradient(position,iterations,tolerance);
	  
	  this->current_step_size=this->current_step_size/2.0f;
	}
      if (level==2)
	this->internalTransformation->setMode(mode);
      this->generateFeedback("+ + ");
      this->generateFeedback("+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +");
    }
  time(&timer2);
  std::stringstream strss_final;
  this->totaltime=difftime(timer2,timer1);
  strss_final << "+ +  Stats : total_time " <<  this->totaltime << " " << " reslice=" << this->reslicetime << " fill=" << this->filltime;
  this->generateFeedback(strss_final.str());
  this->generateFeedback("+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +");

}



