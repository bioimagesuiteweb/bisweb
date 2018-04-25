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


#include "bisDTIAlgorithms.h"
#include "bisEigenUtil.h"
#include <Eigen/Dense>
#include "bisImageAlgorithms.h"
#include <vector>

namespace bisDTIAlgorithms {


  
  int computeTensorFit(bisSimpleImage<short>* input,
		       bisSimpleImage<short>* t2image,
		       bisSimpleImage<unsigned char>* mask,
		       Eigen::MatrixXf& gradients,
		       float bValue,
		       bisSimpleImage<float>* tensor)
  {

    if (bisImageAlgorithms::doImagesHaveSameSize<short,short>(input,t2image,0)==0)
      {
	std::cerr << "Bad T2 Image " << std::endl;
	return 0;
      }

    int dim[5]; input->getDimensions(dim);
    float spa[5]; input->getSpacing(spa);
    std::cout << "dim=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;

    if (mask!=0)
      {
	if (bisImageAlgorithms::doImagesHaveSameSize<short,unsigned char>(input,mask,0)==0)
	  {
	    std::cerr << "Bad Mask Image " << std::endl;
	    int dmask[5]; mask->getDimensions(dmask);
	    std::cout << "dmask=" << dmask[0] << "," << dmask[1] << "," << dmask[2] << "," << dmask[3] << "," << dmask[4] << std::endl;
	    return 0;
	  }
      }

    
    
    int numdirections=dim[3];
    if (numdirections!=gradients.rows())
      {
	std::cout << "Bad Directions Matrix " << std::endl;
	return 0;
      }


    
    // Allocate Output
    spa[3]=1;spa[4]=1;
    int t_dim[5]= { dim[0],dim[1],dim[2],6,1};
    tensor->allocateIfDifferent(t_dim,spa);
    tensor->fill(0.0f);

    // Create Matrix
    Eigen::MatrixXf alpha=Eigen::MatrixXf::Zero(numdirections,6);
    for (int i=0; i< numdirections; i++) {
      float gx = gradients(i, 0);
      float gy = gradients(i, 1);
      float gz = gradients(i, 2);
      alpha(i,0) = gx*gx;
      alpha(i,1) = 2*gx*gy;
      alpha(i,2) = 2*gx*gz;
      alpha(i,3) = gy*gy;
      alpha(i,4) = 2*gy*gz;
      alpha(i,5) = gz*gz;
    }

    //    std::cout << "Alpha Matrix=" << std::endl << alpha << std::endl << std::endl;

    short* baseline=t2image->getImageData();
    unsigned char* maskdata=0;
    if (mask!=0)
      maskdata=mask->getImageData();
    short* inpdata=input->getImageData();
    float* tensordata=tensor->getImageData();
    
    int volsize=dim[2]*dim[1]*dim[0];
    float shift=0.0;
    Eigen::VectorXf adc =Eigen::VectorXf::Zero(6);
    Eigen::VectorXf t =Eigen::VectorXf::Zero(6);
    Eigen::MatrixXf LSQ=bisEigenUtil::createLSQMatrix(alpha);

    //    std::cout << "LSQ Matrix=" << std::endl << LSQ << std::endl << std::endl;

    for (int index=0;index<volsize;index++)
      {    
	float baseln = float(baseline[index])+shift;
	
	int inmask = 1;
	if (maskdata!=0)
	  inmask=maskdata[index];
	
	if (inmask)
	  {
	    // Calculate ADCs
	    for(int n=0; n< numdirections;n++)
	      {
		
		int i_index=index+n*volsize;
		float value = float(inpdata[i_index])+shift;
		
		adc(n)=0.0;
		if (value>0.0)
		  {
		    if (baseln/value > 1.0)
		      adc(n) = (float)(log(baseln / value) / bValue);
		  }
	      }
	    
	    bisEigenUtil::inPlaceMultiplyMV(LSQ,adc,t);
	    for (int ia=0;ia<=5;ia++)
	      tensordata[index+ia*volsize]=t(ia);
	  }
      }
    return 1;
  }

  // output is 4 components x 3 frames
  // component 0 = eigenvalues
  // components 1-3 eigenvectors
  // frames are x,y,z
  int computeTensorEigenSystem(bisSimpleImage<float>* tensor,
			       bisSimpleImage<unsigned char>* mask,
			       bisSimpleImage<float>* eigenSystem)

  {
    int dim[5]; tensor->getDimensions(dim);
    float spa[5]; tensor->getSpacing(spa);
    std::cout << "dim=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    if (dim[3]!=6 || dim[4]!=1)
      {
	std::cerr << "Bad Tensor it must have 6 frames and 1 component" << std::endl;
	return 0;
      }
    
    if (mask!=0)
      {
	if (bisImageAlgorithms::doImagesHaveSameSize<float,unsigned char>(tensor,mask,0)==0)
	  {
	    std::cerr << "Bad Mask Image " << std::endl;
	    int dmask[5]; mask->getDimensions(dmask);
	    std::cout << "dmask=" << dmask[0] << "," << dmask[1] << "," << dmask[2] << "," << dmask[3] << "," << dmask[4] << std::endl;
	    return 0;
	  }
      }


    
        // Allocate Output
    spa[3]=1;spa[4]=1;
    int t_dim[5]= { dim[0],dim[1],dim[2],3,4};
    eigenSystem->allocateIfDifferent(t_dim,spa);
    eigenSystem->fill(0.0f);

    unsigned char* maskdata=0;
    if (mask!=0)
      maskdata=mask->getImageData();
    float* tensordata=tensor->getImageData();
    float* outputdata=eigenSystem->getImageData();
    
    int volsize=dim[2]*dim[1]*dim[0];
    int volframesize=volsize*3;
    Eigen::Matrix3f tensorMatrix =Eigen::Matrix3f::Zero(3,3);

    for(int index=0;index<volsize;index++)
      {
	int inmask = 1;
	if (maskdata!=0)
	  inmask=maskdata[index];
	
	if (inmask)
	  {
	    tensorMatrix(0,0)=tensordata[index];
	    tensorMatrix(0,1)=tensordata[index+volsize];
	    tensorMatrix(0,2)=tensordata[index+2*volsize];
	    tensorMatrix(1,0)=tensorMatrix(0,1);
	    tensorMatrix(1,1)=tensordata[index+3*volsize];
	    tensorMatrix(1,2)=tensordata[index+4*volsize];
	    tensorMatrix(2,0)=tensorMatrix(0,2);
	    tensorMatrix(2,1)=tensorMatrix(1,2);
	    tensorMatrix(1,2)=tensordata[index+5*volsize];
	    
	    Eigen::SelfAdjointEigenSolver<Eigen::Matrix3f> solver(tensorMatrix);
	    
	    for (int frame=0;frame<=2;frame++)
	      {
		// Eigen values component = 0;
		outputdata[frame*volsize+index]=solver.eigenvalues()(0);
		for (int v=0;v<=2;v++)
		  outputdata[(v+1)*volframesize+frame*volsize+index]=solver.eigenvectors()(v,frame);
	      }
	  }
      }
    return 1;
  }


  int computeTensorInvariants(bisSimpleImage<float>* eigenSystem,
			      bisSimpleImage<unsigned char>* mask,
			      int mode,
			      bisSimpleImage<float>* output)
  {
    int dim[5]; eigenSystem->getDimensions(dim);
    float spa[5]; eigenSystem->getSpacing(spa);
    std::cout << "dim=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    if (dim[3]!=3 && dim[4]!=4)
      {
	std::cerr << "Bad EigenSystem it must have 3 frames and 4 components" << std::endl;
	return 0;
      }
    
    if (mask!=0)
      {
	if (bisImageAlgorithms::doImagesHaveSameSize<float,unsigned char>(eigenSystem,mask,0)==0)
	  {
	    std::cerr << "Bad Mask Image " << std::endl;
	    int dmask[5]; mask->getDimensions(dmask);
	    std::cout << "dmask=" << dmask[0] << "," << dmask[1] << "," << dmask[2] << "," << dmask[3] << "," << dmask[4] << std::endl;
	    return 0;
	  }
      }

    mode=bisUtil::irange(mode,0,5);
    int outframes=1;
    if (mode==5)
      outframes=5;
    // Allocate Output
    spa[3]=1;spa[4]=1;
    int t_dim[5]= { dim[0],dim[1],dim[2],3,4};
    output->allocateIfDifferent(t_dim,spa);
    output->fill(0.0f);

    unsigned char* maskdata=0;
    if (mask!=0)
      maskdata=mask->getImageData();
    float* eigenSystemData=eigenSystem->getImageData();
    float* outputdata=output->getImageData();
    
    int volsize=dim[2]*dim[1]*dim[0];

    for (int index=0;index<volsize;index++)
      {
	int inmask = 1;
	if (maskdata!=0)
	  inmask=maskdata[index];
	
	if (inmask)
	  {
	    float l1=eigenSystemData[index];
	    float l2=eigenSystemData[index+volsize];
	    float l3=eigenSystemData[index+2*volsize];
	    float ml = (l1 + l2 + l3) / 3.0;
	    float l1m = l1 - ml;
	    float l2m = l2 - ml;
	    float l3m = l3 - ml;
	    
	    float FA = sqrt(3*(l1m*l1m + l2m*l2m + l3m*l3m)) / 
	      sqrt(2*(l1*l1 + l2*l2 + l3*l3));	    
	    float RA = sqrt(l1m*l1m + l2m*l2m + l3m*l3m) / (sqrt(double(3.0))*ml);
	    float VR = 1.0 - ((l1*l2*l3) / (ml*ml*ml));
	    float SK = (l1m*l1m*l1m + l2m*l2m*l2m + l3m*l3m*l3m) / (l1+l2+l3);
	    float MD = ml;
	    
	    for (int i=0;i<outframes;outframes++)
	      {
		int computemode=i;
		if (mode!=5)
		  computemode=mode;
		
		switch (computemode)
		  {
		  case 0:
		    outputdata[index+volsize*i]=FA;
		    break;
		  case 1:
		    outputdata[index+volsize*i]=RA;
		    break;
		  case 2:
		    outputdata[index+volsize*i]=VR;
		    break;
		  case 3:
		    outputdata[index+volsize*i]=MD;
		    break;
		  case 4:
		    outputdata[index+volsize*i]=SK;
		    break;
		  }
	      }
	  }
      }
    return 1;
  }


  int computeTensorColormap(bisSimpleImage<float>* eigenSystem,
			    bisSimpleImage<unsigned char>* mask,
			    bisSimpleImage<float>* magnitude,
			    float scaling,
			    bisSimpleImage<unsigned char>* outputImage)
  {
    if (mask!=0)
      {
	if (bisImageAlgorithms::doImagesHaveSameSize<float,unsigned char>(eigenSystem,mask,0)==0)
	  {
	    std::cerr << "Bad mask for computeTensorColormap" << std::endl;
	    return 0;
	  }
      }

    if (magnitude!=0)
      {
	if (bisImageAlgorithms::doImagesHaveSameSize<float,float>(eigenSystem,magnitude,0)==0)
	  {
	    std::cerr << "Bad magnitude for computeTensorColormap" << std::endl;
	    return 0;
	  }
      }
    

    float* in_data =eigenSystem->getImageData();
    int dim[5];  eigenSystem->getDimensions(dim);
    std::cout << "dim=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    if (dim[3]!=3 && dim[4]!=4)
      {
	std::cerr << "Bad EigenSystem it must have 3 frames and 4 components" << std::endl;
	return 0;
      }

    outputImage->fill(0);
    unsigned char* odata=outputImage->getImageData();
    unsigned char* mask_data=0;
    if (mask != 0)
      mask_data= mask->getImageData();
    
    float* mag_data=0;
    double mrange[2];
    if (magnitude != 0)
      {
	mag_data= magnitude->getImageData();
	magnitude->getRange(mrange);
      }
    
    double v[3], rgb[3], nrgb[3];
    int volsize=dim[0]*dim[1]*dim[2];
    // Principal Eigenvector is last one so components 9,10,11
    int offset=9*volsize;
    
    for (int index=0;index<volsize;index++)
      {	
	rgb[0] = rgb[1] = rgb[2] = 0;

	int compute=1;
	if (mask_data!=0)
	  compute=mask_data[index];
	
	if (compute)
	  {
	    for (int ia=0;ia<=2;ia++)
	      v[ia]= in_data[index+ia*volsize+offset];
	    bisUtil::normalize(v);
	    
	    /* compute color */
	    double mgn = 1.0;
	    if (mag_data!=0)
	      mgn=(mag_data[index] - mrange[0]) / mrange[1];

	    for (int ia=0;ia<=2;ia++)
	      rgb[ia] = fabs(v[ia])*mgn;

	    for (int ia=0;ia<=2;ia++)
	      {
		nrgb[ia] = rgb[ia]*255*scaling;
		odata[ia*volsize+index]=( nrgb[ia] < 256 ? nrgb[ia] : 255);
	      }
	  }
      }
    return 1;
  }
  
  // End of namespace
}


