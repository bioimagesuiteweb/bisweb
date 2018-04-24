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


#include "bisAbstractImageRegistration.h"
#include "bisImageAlgorithms.h"
#include "bisUtil.h"
#include "bisIdentityTransformation.h"


bisAbstractImageRegistration::bisAbstractImageRegistration(std::string n) : bisOptimizableAlgorithm(n)
{
  this->use_weights=0;
  this->has_reference_weight=0;
  this->has_target_weight=0;}
  
bisAbstractImageRegistration::~bisAbstractImageRegistration()
{
}


void bisAbstractImageRegistration::initializeLevel(int level,bisAbstractTransformation* initial)
{
  float rsc=this->internalParameters->getFloatValue("resolution",1.5f);
  float rate=this->internalParameters->getFloatValue("resolutionrate",2.0f);
  float resolution=rsc*powf(rate,level-1.0f);

  if (this->enable_feedback)
    std::cout << "+ +  Initializing level r=" << rsc << ", rate=" << rate << " resol= " << resolution << std::endl;
  this->prepareImagesForRegistration(resolution,initial);

}


// Set Input and Output Images
void bisAbstractImageRegistration::setReferenceImage(std::shared_ptr<bisSimpleImage<float> > im) {
  this->reference=im;
}

void bisAbstractImageRegistration::setTargetImage(std::shared_ptr<bisSimpleImage<float> > im) {
  this->target=im;
}

void bisAbstractImageRegistration::setReferenceWeightImage(std::shared_ptr<bisSimpleImage<short> > im)
{
  this->reference_weight=im;
  this->has_reference_weight=1;
}

void bisAbstractImageRegistration::setTargetWeightImage(std::shared_ptr<bisSimpleImage<short> > im)
{
  this->target_weight=im;
  this->has_target_weight=1;
}
 

  // Ensure all parameters are there
int bisAbstractImageRegistration::checkInputParameters(bisJSONParameterList* plist)
{

  std::unique_ptr<bisJSONParameterList> tmp(new bisJSONParameterList(this->name+":plist"));
  this->internalParameters=std::move(tmp);

  // 0 = SSD,1=CC,2=MI,3=NMI
  this->internalParameters->setIntValue("metric",bisUtil::irange(plist->getIntValue("metric",3),0,3));

  // 0 = HillClimb,1=Gradient Descent,2=Conjuhgate
  this->internalParameters->setIntValue("optimization",bisUtil::irange(plist->getIntValue("optimization",2),0,2));

  // Num levels
  this->internalParameters->setIntValue("levels",bisUtil::irange(plist->getIntValue("levels",3),1,4));
  this->internalParameters->setIntValue("steps",bisUtil::irange(plist->getIntValue("steps",1),1,4));
  this->internalParameters->setFloatValue("stepsize",bisUtil::frange(plist->getFloatValue("stepsize",1.0),0.05f,4.0f));
  this->internalParameters->setIntValue("iterations",bisUtil::irange(plist->getIntValue("iterations",15),1,100));
  this->internalParameters->setIntValue("numbins",bisUtil::irange(plist->getIntValue("numbins",64),4,1024));
  this->internalParameters->setIntValue("intscale",bisUtil::irange(plist->getIntValue("intscale",10),1,10));
  this->internalParameters->setFloatValue("resolution",bisUtil::frange(plist->getFloatValue("resolution",1.5),0.5f,10.0f));
  this->internalParameters->setFloatValue("resolutionrate",bisUtil::frange(plist->getFloatValue("resolutionrate",2.0f),1.5f,3.0f));
  this->internalParameters->setFloatValue("tolerance",bisUtil::frange(plist->getFloatValue("tolerance",0.001f),0.0f,0.5f));
  this->internalParameters->setFloatValue("smoothing",bisUtil::frange(plist->getFloatValue("smoothing",-1.0),-1.0,20.0));
  
  this->internalParameters->setIntValue("referenceFrame",plist->getIntValue("referenceFrame",0));
  this->internalParameters->setIntValue("targetFrame",plist->getIntValue("targetFrame",0));
  this->internalParameters->setBooleanValue("normalize",plist->getBooleanValue("normalize",1));
  this->internalParameters->setBooleanValue("debug",plist->getBooleanValue("debug",1));

  if (this->internalParameters->getBooleanValue("debug",1))
    this->enable_feedback=1;
  else
    this->enable_feedback=0;
  this->metric=this->internalParameters->getIntValue("metric",3);

  return 1;
}


int bisAbstractImageRegistration::prepareImagesForRegistration(float resolution_factor,bisAbstractTransformation* initial)
{
  
  int numbins=this->internalParameters->getIntValue("numbins",64);
  int normalize=this->internalParameters->getBooleanValue("normalize",1);

  float smoothing=this->internalParameters->getFloatValue("smoothing",-1.0);
  int intscale=this->internalParameters->getIntValue("intscale",1);
  
  int ref_frame=this->internalParameters->getIntValue("referenceFrame",0);
  int targ_frame=this->internalParameters->getIntValue("targetFrame",0);

  this->use_weights=0;
  if (this->has_reference_weight!=0)
    {
      this->use_weights=1;
      if (this->has_target_weight!=0)
	this->use_weights=2;
    }

  this->level_reference=
    bisImageAlgorithms::prepareImageForRegistration(this->reference.get(),numbins,normalize,resolution_factor,smoothing,intscale,ref_frame,
						    this->name+":level_ref_image",0,this->enable_feedback);

  this->level_target=
    bisImageAlgorithms::prepareImageForRegistration(this->target.get(),numbins,normalize,resolution_factor,smoothing,intscale,targ_frame,
						    this->name+":level_targ_image",initial,this->enable_feedback);

  // This resolution factor should be 1 !!!!!!!!11 (do not reslice until later .. i.e. do not reslice!)
  

  // Temp for reslicing into
  std::unique_ptr<bisSimpleImage<short> > tmp25(new bisSimpleImage<short>(this->name+":temp_target_image"));
  this->temp_target=std::move(tmp25);
  this->temp_target->copyStructure(this->level_reference.get());


  if (this->use_weights>0)
    {
      std::unique_ptr<bisIdentityTransformation> xform(new bisIdentityTransformation(this->name+"ident"));

      std::unique_ptr<bisSimpleImage<short> > tmp3(new bisSimpleImage<short>(this->name+":level_reference_weight"));
      this->level_reference_weight=std::move(tmp3);
      this->level_reference_weight->copyStructure(this->level_reference.get());
      bisImageAlgorithms::resliceImage(this->reference_weight.get(),this->level_reference_weight.get(),xform.get(),1,0.0);

      if (this->use_weights==2) {
	std::unique_ptr<bisSimpleImage<short> > tmp4(new bisSimpleImage<short>(this->name+":level_target_weight"));
	this->level_target_weight=std::move(tmp4);
	this->level_target_weight->copyStructure(this->level_target.get());
	// This resolution factor should be 1 !!!!!!!!11 (do not reslice until later .. i.e. do not reslice!)
	if (initial==0)
	  bisImageAlgorithms::resliceImage(this->target_weight.get(),this->level_target_weight.get(),xform.get(),1,0.0);
	else
	  bisImageAlgorithms::resliceImage(this->target_weight.get(),this->level_target_weight.get(),initial,1,0.0);

	// Temp for reslicing into
	std::unique_ptr<bisSimpleImage<short> > tmp45(new bisSimpleImage<short>(this->name+":this_temp_target_weight"));
	this->temp_target_weight=std::move(tmp45);
	this->temp_target_weight->copyStructure(this->level_reference.get());
      }
    }

  std::unique_ptr<bisJointHistogram> tmp(new bisJointHistogram(this->name+":joint_histo"));
  this->internalHistogram=std::move(tmp);
  internalHistogram->initialize(numbins,numbins,intscale);

   this->level_reference->getImageDimensions(level_dimensions);
  for (int ia=0;ia<=2;ia++)
    {
      this->level_bounds[2*ia]=0;
      this->level_bounds[2*ia+1]=this->level_dimensions[ia]-1;
    }
  
  return 1;

}
float bisAbstractImageRegistration::getCurrentStepSize() {
  return this->current_step_size;
}


