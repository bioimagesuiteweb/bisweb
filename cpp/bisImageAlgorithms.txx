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

#ifndef _bis_Image_Algorithms_cpp
#define _bis_Image_Algorithms_cpp

#include "bisImageAlgorithms.h"
#include "bisIdentityTransformation.h"
#include "bisDataTypes.h"
#include <memory>
#include <vector>
#include <stack>
#include <algorithm>

namespace bisImageAlgorithms {
  
  // ---------------------------------------------------------------------------
  // Same size and spacing 
  // ---------------------------------------------------------------------------
  template<class IT,class OT> int doImagesHaveSameSize(bisSimpleImage<IT>* image1,bisSimpleImage<OT>* image2,int checksameframes) {

    if (image1==0 || image2==0) {
      std::cerr << "null images in checkimages" << std::endl;
      return 0;
    }

    int sum=0;
    int dim1[5]; image1->getDimensions(dim1);
    int dim2[5]; image2->getDimensions(dim2);
    int max=3; 
    if (checksameframes)
      max=5;

    for (int i=0;i<max;i++) 
      sum+=abs(dim1[i]-dim2[i]);
    if (sum>0)
      {
	std::cerr << "Cannot process images that have different dimensions " << std::endl;
	return 0;
      }
			    

    float spa1[5]; image1->getSpacing(spa1);
    float spa2[5]; image2->getSpacing(spa2);

    double sumf=0.0;
    for (int i=0;i<max;i++) 
      sumf+=fabs(spa1[i]-spa2[i]);
    if (sumf>0.01) 
      {
	std::cerr << "Cannot process images that have different spacing " << std::endl;
	return 0;
      }
	
			    
    return 1;
  }

  // ------------------------------------------------- Extract Frame/Component ---------------------------------
  
  
  template<class T> std::unique_ptr<bisSimpleImage<T> >  imageExtractFrame(bisSimpleImage<T>* input,int frame,int component) {

    int dim[5];    input->getDimensions(dim);
    float spa[5];    input->getSpacing(spa);

    frame=bisUtil::irange(frame,0,dim[3]);
    component=bisUtil::irange(component,0,dim[4]);

    int volsize=dim[0]*dim[1]*dim[2];
    int offset=(component*dim[3]+frame)*volsize;

    dim[3]=1;
    dim[4]=1;
    
    std::unique_ptr<bisSimpleImage<T> > output(new bisSimpleImage<T>("extract_frame"));
    output->allocate(dim,spa);
    T* input_data= input->getImageData();
    T* output_data = output->getImageData();
    for (int i=0;i<volsize;i++)
      output_data[i]=input_data[i+offset];
    return std::move(output);
  }


  
  // ------------------------------------------------- Smooth Image ---------------------------------

  struct internal { 
    static std::vector<float> generateSmoothingKernel(float sigma,int radius)
      {
	int len=radius*2+1;
	if (len<3)
	  len=3;
	std::vector<float> kernel(len);
	float sum=0.0;
	if (sigma>0.01)
	  {
	    for (int i=0;i<len;i++) {
	      kernel[i]=(float)exp((-0.5*pow(float(i-radius),2.0))/pow(sigma,2.0));
	      sum=sum+kernel[i];
	    }
	    for (int i=0;i<len;i++)
	      kernel[i]=kernel[i]/sum;
	  }
	else
	  {
	    for (int i=0;i<len;i++) 
	      kernel[i]=0.0f;
	    kernel[radius]=1.0f;
	  }
	
	return kernel;
      }

    static std::vector<float> generateGradientKernel(float sigma,int radius)
      {
	int len=radius*2+1;
	if (len<3)
	  len=3;
	std::vector<float> kernel(len);
	float sum=0.0;
        if (sigma<0.1)
          sigma=0.1;
        for (int i=0;i<len;i++)
          { 
            float x=i-radius;
            kernel[i]=-x*exp(- ( x*x)/(2.0*sigma*sigma));
            sum=sum+fabs(kernel[i]);
          }
        for (int i=0;i<len;i++) 
          kernel[i]=kernel[i]/sum;
	return kernel;
      }
  };
  

  
  template<class T> void oneDConvolution(T* imagedata_in,T* imagedata_out,int dim[5],std::vector<float>& kernel,int axis,int vtkboundary=0)
  {
    int slicesize=dim[0]*dim[1];

    int radius=int((kernel.size()-1)/2);
    
    int offsets[3] = { 1,dim[0],slicesize };
    int axes[3] = { 0,1,2 };
    if (axis==1)
      {
	axes[0]=1;
	axes[1]=0;
      }
    else if (axis==2)
      {
	axes[0]=2;
	axes[1]=0;
	axes[2]=1;
      }

    int outdim[3] = { 0,0,0};
    int outoffsets[3]= { 0,0,0 };

    for (int i=0;i<=2;i++) {
      outdim[i]=dim[axes[i]];
      outoffsets[i]=offsets[axes[i]];
    }

    int outdim0minus=outdim[0]-1;
    int maxia=outdim[0]-radius;

    int volsize=dim[0]*dim[1]*dim[2];

    int numcompframes=dim[3]*dim[4];

    
    
    for (int compframe=0;compframe<numcompframes;compframe++) {
      for (int ic=0;ic<outdim[2];ic++) {
	for (int ib=0;ib<outdim[1];ib++) {
	  int index=ic*outoffsets[2]+ib*outoffsets[1]+compframe*volsize;
		    
	  for (int ia=0;ia<outdim[0];ia++)
	    {
	      double sum=0.0;

	      if (ia>=radius && ia<maxia) {
		for (int tau=-radius;tau<=radius;tau++) {
		  sum+=kernel[tau+radius]*imagedata_in[index+tau*outoffsets[0]];
		}
	      } else if (vtkboundary==0) {
		for (int tau=-radius;tau<=radius;tau++) {
		  int coord=tau+ia;
		  int fixedtau=tau;
                  
		  if (coord<0) 
		    fixedtau=-ia;
		  else if (coord>outdim0minus) 
		    fixedtau=outdim0minus-ia;
                  
                  sum+=kernel[tau+radius]*imagedata_in[index+fixedtau*outoffsets[0]];
		}
	      } else {
                
                double sumw=0.0;
                for (int tau=-radius;tau<=radius;tau++) {
		  int coord=tau+ia;
                  if (coord>=0 && coord<=outdim0minus)  {
                    int fixedtau=tau;
                    sum+=kernel[tau+radius]*imagedata_in[index+fixedtau*outoffsets[0]];
                    sumw+=kernel[tau+radius];
                  }
                }
                if (sumw>0.0)
                  sum=sum/sumw;
              }
	      imagedata_out[index]=(T)sum;
	      index=index+outoffsets[0];
	    }
	}
      }
    }
  }
  
  template<class T> std::unique_ptr<bisSimpleImage<T> > gaussianSmoothImage(bisSimpleImage<T>* input,float sigmas[3], float outsigmas[3],int inmm,float radiusfactor,int vtkboundary)
  {
    std::unique_ptr<bisSimpleImage<T> >output(new bisSimpleImage<T>("gradImage"));
    int ok=output->copyStructure(input);
    if (ok) {
      gaussianSmoothImage(input,output.get(),sigmas,outsigmas,inmm,radiusfactor,vtkboundary);
    }
    return std::move(output);
  }


  template<class T> void gaussianSmoothImage(bisSimpleImage<T>* input,
                                             bisSimpleImage<T>* output,float sigmas[3], float outsigmas[3],int inmm,float radiusfactor,int vtkboundary)
  {

    int dim[5];    input->getDimensions(dim);
    float spa[5];    input->getSpacing(spa);

    if (sigmas[0]<0.000000001 &&
        sigmas[1]<0.000000001 &&
        sigmas[2]<0.000000001 ) {
      std::cout << "Just copying, no smoothing ... " << sigmas[0] << "," << sigmas[1] << "," << sigmas[2] << std::endl;
      output->copyStructure(input);
      T* inp=input->getData();
      T* out=output->getData();
      int l=dim[0]*dim[1]*dim[2]*dim[3]*dim[3];
      for (int i=0;i<l;i++)
        out[i]=inp[i];
      return;
    }
        
        

    std::unique_ptr<bisSimpleImage<T> > temp(new bisSimpleImage<T>("temporary_smooth_image"));
    temp->copyStructure(input);
    
    T* input_data= input->getImageData();
    T* output_data = output->getImageData();
    T* temp_data = temp->getImageData();

    for(int ia=0;ia<=2;ia++)
      {
        if (inmm) 
          outsigmas[ia]=sigmas[ia]/spa[ia];
        else
          outsigmas[ia]=sigmas[ia];
      }
    
    int radii[3] = { 1,1,1 };
    for (int i=0;i<=2;i++) {
      radii[i]=int(outsigmas[i]*radiusfactor);
      if (radii[i]<1)
        radii[i]=1;
    }
    
    std::vector<float> kernelx=internal::generateSmoothingKernel(outsigmas[0],radii[0]);
    std::vector<float> kernely=internal::generateSmoothingKernel(outsigmas[1],radii[1]);

    oneDConvolution(input_data,temp_data,dim,kernelx,0,vtkboundary);
    oneDConvolution(temp_data,output_data,dim,kernely,1,vtkboundary);
    
    if (dim[2]>1)
      {
        std::vector<float> kernelz=internal::generateSmoothingKernel(outsigmas[2],radii[2]);
        int len=input->getLength();
        for(int j=0;j<len;j++)
          temp_data[j]=output_data[j];
        oneDConvolution(temp_data,output_data,dim,kernelz,2,vtkboundary);
      }

  }


  template<class T> void simpleGradientImage(bisSimpleImage<T>* original_input,
                                       bisSimpleImage<float>* output,float sigmas[3], float outsigmas[3],int inmm,float radiusfactor)
  {
    T* orig=original_input->getImageData();

    int dim[5];   original_input->getDimensions(dim);
    float spa[5]; original_input->getSpacing(spa);
    
    std::unique_ptr<bisSimpleImage<float> > input(new bisSimpleImage<float>("copy_image"));
    input->allocate(dim,spa);
    float* input_data=input->getImageData();
    for (int i=0;i<input->getLength();i++)
      input_data[i]=orig[i];
    
    std::unique_ptr<bisSimpleImage<float> > temp(new bisSimpleImage<float>("temporary_grad_image"));
    temp->copyStructure(input.get());

    std::unique_ptr<bisSimpleImage<float> > temp2(new bisSimpleImage<float>("temporary_grad_image2"));
    temp2->copyStructure(input.get());

    float* output_data = output->getImageData();
    float* temp_data = temp->getImageData();

    for(int ia=0;ia<=2;ia++)
      {
	if (inmm) 
	  outsigmas[ia]=sigmas[ia]/spa[ia];
	else
	  outsigmas[ia]=sigmas[ia];
      }

    int radii[3] = { 1,1,1 };
    for (int i=0;i<=2;i++) {
      radii[i]=int(outsigmas[i]*radiusfactor);
      if (radii[i]<1)
	radii[i]=1;
    }

    std::vector<float> kernel_dx=internal::generateGradientKernel(outsigmas[0],radii[0]);
    std::vector<float> kernel_dy=internal::generateGradientKernel(outsigmas[1],radii[1]);

    int volumesize=dim[0]*dim[1]*dim[2];
    int offset=volumesize*dim[3];
    
    oneDConvolution(input_data,temp_data,dim,kernel_dx,0);
    for (int i=0;i<volumesize;i++)
      output_data[i]=temp_data[i];
    
    oneDConvolution(input_data,temp_data,dim,kernel_dy,1);
    for (int i=0;i<volumesize;i++)
      output_data[offset+i]=temp_data[i];

    if (dim[2]>0)
      {
        std::vector<float> kernel_dz=internal::generateGradientKernel(outsigmas[2],radii[2]);
        oneDConvolution(input_data,temp_data,dim,kernel_dz,2);
        for (int i=0;i<volumesize;i++)
          output_data[2*offset+i]=temp_data[i];
      }
  }

  
  template<class T> void gradientImage(bisSimpleImage<T>* original_input,
                                       bisSimpleImage<float>* output,float sigmas[3], float outsigmas[3],int inmm,float radiusfactor)
  {
    T* orig=original_input->getImageData();

    int dim[5];   original_input->getDimensions(dim);
    float spa[5]; original_input->getSpacing(spa);
    
    std::unique_ptr<bisSimpleImage<float> > input(new bisSimpleImage<float>("copy_image"));
    input->allocate(dim,spa);
    float* input_data=input->getImageData();
    for (int i=0;i<input->getLength();i++)
      input_data[i]=orig[i];
    
    std::unique_ptr<bisSimpleImage<float> > temp(new bisSimpleImage<float>("temporary_grad_image"));
    temp->copyStructure(input.get());

    std::unique_ptr<bisSimpleImage<float> > temp2(new bisSimpleImage<float>("temporary_grad_image2"));
    temp2->copyStructure(input.get());

    float* output_data = output->getImageData();
    float* temp_data = temp->getImageData();
    float* temp_data2 = temp2->getImageData();

    for(int ia=0;ia<=2;ia++)
      {
	if (inmm) 
	  outsigmas[ia]=sigmas[ia]/spa[ia];
	else
	  outsigmas[ia]=sigmas[ia];
      }

    int radii[3] = { 1,1,1 };
    for (int i=0;i<=2;i++) {
      radii[i]=int(outsigmas[i]*radiusfactor);
      if (radii[i]<1)
	radii[i]=1;
    }

    std::vector<float> kernel_x=internal::generateSmoothingKernel(outsigmas[0],radii[0]);
    std::vector<float> kernel_dx=internal::generateGradientKernel(outsigmas[0],radii[0]);
    std::vector<float> kernel_y=internal::generateSmoothingKernel(outsigmas[1],radii[1]);
    std::vector<float> kernel_dy=internal::generateGradientKernel(outsigmas[1],radii[1]);

    int volumesize=dim[0]*dim[1]*dim[2];
    int offset=volumesize*dim[3];
    
    if (dim[2]<2)
      {
        oneDConvolution(input_data,temp_data,dim,kernel_dx,0);
        oneDConvolution(temp_data,temp_data2,dim,kernel_y,1);
        for (int i=0;i<volumesize;i++)
          output_data[i]=temp_data2[i];
        
        oneDConvolution(input_data,temp_data,dim,kernel_x,0);
        oneDConvolution(temp_data,temp_data2,dim,kernel_dy,1);
        for (int i=0;i<volumesize;i++)
          output_data[offset+i]=temp_data2[i];
      }
    else
      {
        std::vector<float> kernel_z=internal::generateSmoothingKernel(outsigmas[2],radii[2]);
        std::vector<float> kernel_dz=internal::generateGradientKernel(outsigmas[2],radii[2]);

        oneDConvolution(input_data,temp_data,dim,kernel_dx,0);
        oneDConvolution(temp_data,temp_data2,dim,kernel_y,1);
        oneDConvolution(temp_data2,temp_data,dim,kernel_z,2);
        for (int i=0;i<volumesize;i++)
          output_data[i]=temp_data[i];

        oneDConvolution(input_data,temp_data,dim,kernel_x,0);
        oneDConvolution(temp_data,temp_data2,dim,kernel_dy,1);
        oneDConvolution(temp_data2,temp_data,dim,kernel_z,2);
        for (int i=0;i<volumesize;i++)
          output_data[offset+i]=temp_data[i];
        
        oneDConvolution(input_data,temp_data,dim,kernel_x,0);
        oneDConvolution(temp_data,temp_data2,dim,kernel_y,1);
        oneDConvolution(temp_data2,temp_data,dim,kernel_dz,2);
        for (int i=0;i<volumesize;i++)
          output_data[2*offset+i]=temp_data[i];
      }
  }


  // ------------------------------------------------- Normalize Image ---------------------------------

  template<class T> void imageRobustRange(bisSimpleImage<T>* image,float perlow,float perhigh,double outdata[2])
  {
    
    perlow = bisUtil::frange(perlow,0.0f,0.999f);
    perhigh = bisUtil::frange(perhigh,perlow+0.001f,1.0f);

    //    std::cout << "Initial perlow=" << perlow << ", perhigh=" << perhigh << std::endl;
    
    T* arr=image->getImageData();
    
    double min=arr[0],max=arr[0];
    double total = (double) image->getLength();
	
    for (int i=0;i<image->getLength();i++)
      {
	if (min>arr[i])
	  min=arr[i];
	else if (max<arr[i])
	  max=arr[i];
      }

    //std::cout << "in_range=(" << min << "," << max << ") ";

    if (perlow <0.0001 && perhigh>0.9999)
      {
	outdata[0]=min;
	outdata[1]=max;
	//	std::cout << "Returning" << std::endl;
	return;
      }
	
    int numbins = 256;
    double diff=max-min;
    if (diff<0.001)
      diff=0.001;
    double scale=(numbins-1.0)/diff;
    std::vector<int>  bins(numbins);
    for (int i=0;i<numbins;i++)
      bins[i]=0;

    //    std::cout << "scale=" << scale << ", numbis=" << numbins << std::endl;
    //    std::cout << "Length= " << image->getLength() << std::endl;
    // Compute Histogram !!!
    for (int i=0;i<image->getLength();i++)
      bins[int(scale*(arr[i]-min))]+=1;

    //    for (int ia=10;ia<200;ia+=20)
    // std::cout << "ia =" << ia << " = " << bins[ia] << std::endl;

    int foundperlow=0,foundperhigh=0;
    double tlow=min,thigh=max;
    double cumulative=0;
	
    for (int i=0;i<numbins;i++)
      {
	cumulative=cumulative+bins[i];
	double v=cumulative/total;
	if (foundperlow==0) {
	  if (v > perlow) {
	    foundperlow=true;
	    tlow=double(i)/scale+min;
	  }
	}
	
	if (foundperhigh==0) {
	  if (v > perhigh) {
	    foundperhigh=1;
	    thigh=double(i)/scale+min;
	    i=numbins;
	  }
	}
      }

    outdata[0]=tlow;
    outdata[1]=thigh;
    return;
    
  }

  
  template<class T> bisSimpleImage<short>* imageNormalize(bisSimpleImage<T>* input,float perlow,float perhigh,short outmaxvalue,double outdata[2],std::string name)
  {
    int dim[5];   input->getDimensions(dim);
    float spa[5]; input->getSpacing(spa);
    bisSimpleImage<short>* output=new bisSimpleImage<short>(name);
    output->allocate(dim,spa);
    imageNormalize(input,output,perlow,perhigh,outmaxvalue,outdata);
    return output;
  }


  template<class T> void imageNormalize(bisSimpleImage<T>* input,bisSimpleImage<short>* output,float perlow,float perhigh,short outmaxvalue,double outdata[2])
  {
    if (outmaxvalue > 16384)
      outmaxvalue=16384;

    T* data=input->getImageData();
    short* outarr = output->getImageData();
    
    imageRobustRange(input,perlow,perhigh,outdata);
    
    double scale=outmaxvalue/(outdata[1]-outdata[0]);
    double outthigh=outdata[1]-outdata[0];

    //    std::cout << "scale=" << scale << " thr=" << outdata[0] << "," << outdata[1] << "," << outthigh << std::endl;
    
    for (int i=0;i<output->getLength();i++)
      {
	double v=data[i]-outdata[0];
	if (v>outthigh)
	  v=outthigh;
	else if (v<0.0)
	  v=0.0;
	outarr[i] = short(v*scale+0.5);
      }
  }


  // ------------------------------------------------- Resample/Reslice ---------------------------------
  template<class T> double linearInterpolationFunction(T* data,float TX[3],int minusdim[3],int dim0,int slicesize,int offset ) {

    double W[3][2];
    int   B[3][2];

    for (int ia=0;ia<=2;ia++)
      {
	B[ia][0]=int(TX[ia]);
	B[ia][1]=B[ia][0]+1;
	if (B[ia][1]>minusdim[ia])
	  B[ia][1]=minusdim[ia];
	W[ia][0]=B[ia][1]-TX[ia];
	W[ia][1]=1.0-W[ia][0];
      }


    B[1][0]*=dim0;
    B[1][1]*=dim0;
    
    B[2][0]=B[2][0]*slicesize+offset;
    B[2][1]=B[2][1]*slicesize+offset;

    double sum=0.0;
    for (int i=0;i<=1;i++)
      for (int j=0;j<=1;j++)
	for (int k=0;k<=1;k++)
	  {
	    sum+=W[2][k]*W[1][j]*W[0][i]*data[ B[2][k]+B[1][j]+B[0][i]];
	  }
    return sum;
    
  }

  template<class T>  double nearestInterpolationFunction(T* data,float TX[3],int*,int dim0,int slicesize,int offset ) {
    return data[int(TX[2]+0.5)*slicesize+
		int(TX[1]+0.5)*dim0+
		int(TX[0]+0.5)+offset];
    
  }


  template<class T> double cubicInterpolationFunction(T* data,float TX[3],int minusdim[3],int dim0,int slicesize,int offset ) {

    int B[3][4];
    float W[3][4];
    
    for (int ia=0;ia<=2;ia++)
      {
	B[ia][1]=int(TX[ia]);
	B[ia][0]=B[ia][1]-1;
	    
	if (B[ia][0]<0)
	  B[ia][0]=0;
	    
	B[ia][2]=B[ia][1]+1;
	B[ia][3]=B[ia][1]+2;
	if (B[ia][2]>minusdim[ia]) {
	  B[ia][2]=minusdim[ia];
	  B[ia][3]=minusdim[ia];
	} else if (B[ia][3]>minusdim[ia]) {
	  B[ia][3]=minusdim[ia];
	}

	// cubic interpolation from VTK
	float f=TX[ia]-B[ia][1];
	float fm1 = f - 1.0f;
	float fd2 = f*0.5f;
	float ft3 = f*3.0f;
	W[ia][0] = -fd2*fm1*fm1;
	W[ia][1] = ((ft3 - 2)*fd2 - 1)*fm1;
	W[ia][2] = -((ft3 - 4)*f - 1)*fd2;
	W[ia][3] = f*fd2*fm1;
      }

    B[1][0]*=dim0;	B[1][1]*=dim0;
    B[1][2]*=dim0;	B[1][3]*=dim0;
    B[2][0]*=slicesize;	B[2][1]*=slicesize;
    B[2][2]*=slicesize;	B[2][3]*=slicesize;

    double sum=0.0;
    for (int ka=0;ka<=3;ka++) 
      for (int ja=0;ja<=3;ja++) 
	for (int ia=0;ia<=3;ia++) 
	  sum+=W[2][ka]*W[1][ja]*W[0][ia]*data[offset+B[2][ka]+B[1][ja]+B[0][ia]];
    
    return sum;



  }


    // _-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_2D Versions_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
  
  
  template<class T> double linearInterpolationFunction2D(T* data,float TX[3],int minusdim[2],int dim0,int offset ) {

    double W[2][2];
    int   B[2][2];

    for (int ia=0;ia<=1;ia++)
      {
	B[ia][0]=int(TX[ia]);
	B[ia][1]=B[ia][0]+1;
	if (B[ia][1]>minusdim[ia])
	  B[ia][1]=minusdim[ia];
	W[ia][0]=B[ia][1]-TX[ia];
	W[ia][1]=1.0-W[ia][0];
      }

    B[1][0]*=dim0;
    B[1][1]*=dim0;
    
    double sum=0.0;
    for (int i=0;i<=1;i++)
      for (int j=0;j<=1;j++)
	sum+=W[1][j]*W[0][i]*data[offset+ B[1][j]+B[0][i]];

    return sum;
  }

  template<class T>  double nearestInterpolationFunction2D(T* data,float TX[3],int*,int dim0 ,int offset ) {
    return data[int(TX[1]+0.5)*dim0+
		int(TX[0]+0.5)+offset];
  }


  template<class T> double cubicInterpolationFunction2D(T* data,float TX[3],int minusdim[2],int dim0 ,int offset ) {

    int B[2][4];
    float W[2][4];
    
    for (int ia=0;ia<=1;ia++)
      {
	B[ia][1]=int(TX[ia]);
	B[ia][0]=B[ia][1]-1;
	    
	if (B[ia][0]<0)
	  B[ia][0]=0;
	    
	B[ia][2]=B[ia][1]+1;
	B[ia][3]=B[ia][1]+2;
	if (B[ia][2]>minusdim[ia]) {
	  B[ia][2]=minusdim[ia];
	  B[ia][3]=minusdim[ia];
	} else if (B[ia][3]>minusdim[ia]) {
	  B[ia][3]=minusdim[ia];
	}

	// cubic interpolation from VTK
	float f=TX[ia]-B[ia][1];
	float fm1 = f - 1.0f;
	float fd2 = f*0.5f;
	float ft3 = f*3.0f;
	W[ia][0] = -fd2*fm1*fm1;
	W[ia][1] = ((ft3 - 2)*fd2 - 1)*fm1;
	W[ia][2] = -((ft3 - 4)*f - 1)*fd2;
	W[ia][3] = f*fd2*fm1;
      }

    B[1][0]*=dim0;	B[1][1]*=dim0;
    B[1][2]*=dim0;	B[1][3]*=dim0;

    double sum=0.0;
    for (int ja=0;ja<=3;ja++) 
	for (int ia=0;ia<=3;ia++) 
	  sum+=W[1][ja]*W[0][ia]*data[offset+B[1][ja]+B[0][ia]];
    
    return sum;



  }


  // _-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-y

    // _-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-y

  template<class T> void resliceImage(bisSimpleImage<T>* input,bisSimpleImage<T>* output,bisAbstractTransformation* xform,int interpolation,double backgroundValue) {
    int bounds[6];
    int dim[5]; output->getDimensions(dim);
    for (int ia=0;ia<=2;ia++) {
      bounds[2*ia]=0;
      bounds[2*ia+1]=dim[ia]-1;
    }

    resliceImageWithBounds(input,output,xform,bounds,interpolation,backgroundValue);
  }



  // ----------- 2D -------------------------------------
  template<class T> void resliceImageWithBounds2D(bisSimpleImage<T>* input,bisSimpleImage<T>* output,bisAbstractTransformation* xform,
						  int bounds[6],int interpolation,double backgroundValue)
  {
    int dim[5];  input->getDimensions(dim);
    float spa[3]; input->getImageSpacing(spa);

    int dim0=dim[0];
    
    int outdim[5]; output->getDimensions(outdim);
    int outvolsize = outdim[0]*outdim[1]*outdim[2];
    float outspa[3]; output->getImageSpacing(outspa);

    T* input_data = input->getImageData();
    T* output_data = output->getImageData();
    int minusdim[2] = { dim[0]-1,dim[1]-1 };
    int volsize=dim[0]*dim[1]*dim[2];

    float X[3],TX[3];

    
    // Check for valid bounds and frames
    // Make sure we are only reslicing the frames that are common
    int numcompframes=dim[3]*dim[4];
    int in_numcompframes=outdim[3]*outdim[4];
    if (numcompframes>in_numcompframes)
      numcompframes=in_numcompframes;
    for (int ia=0;ia<=1;ia++)
      {
	bounds[2*ia]=bisUtil::irange(bounds[2*ia],0,outdim[ia]-1);
	bounds[2*ia+1]=bisUtil::irange(bounds[2*ia+1],bounds[2*ia],outdim[ia]-1);
      }

    double (*interpFun2D)(T* data,float TX[3],int minusdim[2], int dim0,int offset);
    interpFun2D=linearInterpolationFunction2D;
    if (interpolation==0)
      interpFun2D=nearestInterpolationFunction2D;
    else if (interpolation==3)
      interpFun2D=cubicInterpolationFunction2D;

    int numgood=0,numbad=0,numsaved=0;
    //    int found=0;

    double intensity_offset=0.0;
    T tmp=0;
    int tcode=bisDataTypes::getTypeCode(tmp);
    if (tcode==bisDataTypes::b_float32 || tcode==bisDataTypes::b_float64)
      intensity_offset=0.0;
    else
      intensity_offset=0.5;

    //    std::cout << "Intensity Offset=" << intensity_offset << " code=" << tcode << std::endl;
    
    for (int j=bounds[2];j<=bounds[3];j++)
      {
	X[1]=j*outspa[1];
	int outindex=j*outdim[0];
	for (int i=bounds[0];i<=bounds[1];i++)
	  {
	    X[0]=i*outspa[0];
	    xform->transformPointToVoxel(X,TX,spa);
	    
	    if (TX[1]>=0.000 && TX[1] <= minusdim[1] &&
		TX[0]>=0.000 && TX[0] <= minusdim[0])
	      {
		for (int framecomp=0;framecomp<numcompframes;framecomp++)
		  {
		    int offset=volsize*framecomp;
		    double v=interpFun2D(input_data,TX,minusdim,dim0,offset);
		    output_data[outindex+framecomp*outvolsize]=(T)(v+intensity_offset);
		  }
		++numgood;
	      }
	    else if (TX[1]>=-0.5 && TX[1] <= (minusdim[1]+0.5) &&
		     TX[0]>=-0.5 && TX[0] <= (minusdim[0]+0.5))
	      {
		for (int ia=0;ia<=1;ia++)
		  TX[ia]=bisUtil::frange(TX[ia],0.0,minusdim[ia]);
		
		for (int framecomp=0;framecomp<numcompframes;framecomp++)
		  {
		    int offset=volsize*framecomp;
		    double v=interpFun2D(input_data,TX,minusdim,dim0,offset);
		    output_data[outindex+framecomp*outvolsize]=(T)(v+intensity_offset);
		  }
		++numsaved;
	      }
	    else
	      {
		for (int framecomp=0;framecomp<numcompframes;framecomp++)
		  {
		    //int offset=volsize*framecomp;
		    output_data[outindex+framecomp*outvolsize]=(T)backgroundValue;
		  }
		++numbad;
	      }
	    outindex++;
	  }
      }
    return;
  }
  // ----------- 3D ------
  
  template<class T> void resliceImageWithBounds(bisSimpleImage<T>* input,bisSimpleImage<T>* output,bisAbstractTransformation* xform,
						int bounds[6],int interpolation,double backgroundValue)
  {
    int dim[5];  input->getDimensions(dim);
    if (dim[2]<2)
      {
	resliceImageWithBounds2D(input,output,xform,bounds,interpolation,backgroundValue);
	return;
      }
    
    float spa[3]; input->getImageSpacing(spa);
    int slicesize= dim[0]*dim[1];
    int dim0=dim[0];
    
    int outdim[5]; output->getDimensions(outdim);
    int outslicesize = outdim[0]*outdim[1];
    int outvolsize = outdim[0]*outdim[1]*outdim[2];
    float outspa[3]; output->getImageSpacing(outspa);

    T* input_data = input->getImageData();
    T* output_data = output->getImageData();
    int minusdim[3] = { dim[0]-1,dim[1]-1,dim[2]-1 };
    //    float insidedim[3] = { dim[0]-1.05f,dim[1]-1.05f,dim[2]-1.05f };
    //float outsidedim[3] = { dim[0]-0.95f,dim[1]-0.95f,dim[2]-0.95f };
    int volsize=dim[0]*dim[1]*dim[2];

    float X[3],TX[3];



    // Check for valid bounds and frames
    // Make sure we are only reslicing the frames that are common
    int numcompframes=dim[3]*dim[4];
    int in_numcompframes=outdim[3]*outdim[4];
    if (numcompframes>in_numcompframes)
      numcompframes=in_numcompframes;
    for (int ia=0;ia<=2;ia++)
      {
	bounds[2*ia]=bisUtil::irange(bounds[2*ia],0,outdim[ia]-1);
	bounds[2*ia+1]=bisUtil::irange(bounds[2*ia+1],bounds[2*ia],outdim[ia]-1);
      }



    double (*interpFun)(T* data,float TX[3],int minusdim[3], int dim0,int slicesize,int offset);
    interpFun=linearInterpolationFunction;
    if (interpolation==0)
      interpFun=nearestInterpolationFunction;
    else if (interpolation==3)
      interpFun=cubicInterpolationFunction;

    int numgood=0,numbad=0,numsaved=0;
    //    int found=0;

    double intensity_offset=0.0;
    T tmp=0;
    int tcode=bisDataTypes::getTypeCode(tmp);
    if (tcode==bisDataTypes::b_float32 || tcode==bisDataTypes::b_float64)
      intensity_offset=0.0;
    else
      intensity_offset=0.5;

    //    std::cout << "Intensity Offset=" << intensity_offset << " code=" << tcode << std::endl;
    
    for (int k=bounds[4];k<=bounds[5];k++)
      {
	X[2]=k*outspa[2];
	int outbase=k*outslicesize+bounds[0];
	for (int j=bounds[2];j<=bounds[3];j++)
	  {
	    X[1]=j*outspa[1];
	    int outindex=j*outdim[0]+outbase;
	    for (int i=bounds[0];i<=bounds[1];i++)
	      {
		X[0]=i*outspa[0];
		xform->transformPointToVoxel(X,TX,spa);

		if (TX[2]>=0.000 && TX[2] <= minusdim[2] &&
		    TX[1]>=0.000 && TX[1] <= minusdim[1] &&
		    TX[0]>=0.000 && TX[0] <= minusdim[0])
		  {
		    for (int framecomp=0;framecomp<numcompframes;framecomp++)
		      {
			int offset=volsize*framecomp;
			double v=interpFun(input_data,TX,minusdim,dim0,slicesize,offset);
			output_data[outindex+framecomp*outvolsize]=(T)(v+intensity_offset);
		      }
		    ++numgood;
		  }
		else if (TX[2]>=-0.5 && TX[2] <= (minusdim[2]+0.5) &&
			 TX[1]>=-0.5 && TX[1] <= (minusdim[1]+0.5) &&
			 TX[0]>=-0.5 && TX[0] <= (minusdim[0]+0.5))
		  {
		    for (int ia=0;ia<=2;ia++)
		      TX[ia]=bisUtil::frange(TX[ia],0.0,minusdim[ia]);
		    
		    for (int framecomp=0;framecomp<numcompframes;framecomp++)
		      {
			int offset=volsize*framecomp;
			double v=interpFun(input_data,TX,minusdim,dim0,slicesize,offset);
			output_data[outindex+framecomp*outvolsize]=(T)(v+intensity_offset);
		      }
		    ++numsaved;
		  }
		else
		  {
		    for (int framecomp=0;framecomp<numcompframes;framecomp++)
		      {
			//int offset=volsize*framecomp;
			output_data[outindex+framecomp*outvolsize]=(T)backgroundValue;
		      }
		    ++numbad;
		  }
		outindex++;
	      }
	  }
      }
    //    std::cout << "numgood=" << numgood << "\t numbad=" << numbad << "\t numsaved=" << numsaved << std::endl;
    
    return;
  }

  template<class T> std::unique_ptr< bisSimpleImage<T> > resampleImage(bisSimpleImage<T>* input, float outspa[3],int interpolation,double backgroundValue,bisAbstractTransformation* xform) {

    int dim[5];input->getDimensions(dim);
    float spa[5]; input->getSpacing(spa);
    
    int outdim[5] = { 0,0,0,dim[3],dim[4]};
    for (int ia=0;ia<=2;ia++) {
      double sz=(dim[ia]-1)*spa[ia];
      outdim[ia]=int(sz/outspa[ia])+1;
      spa[ia]=outspa[ia];
    }

    std::unique_ptr<bisSimpleImage<T> > output(new bisSimpleImage<T>("resampleImage"));
    output->allocate(outdim,spa);

    if (xform==0)
      {
	// Xenios this needs to account for subvoxel shift ... (maybe)
	std::unique_ptr<bisIdentityTransformation> ident(new bisIdentityTransformation());
        resliceImage(input,output.get(),ident.get(),interpolation,backgroundValue);
      }
    else
      {
	resliceImage(input,output.get(),xform,interpolation,backgroundValue);
      }
 
    return std::move(output);
  }

  // ------------------------------------------------------------------------------------------------------------------------------
  template<class T> int imageExtractSlice(bisSimpleImage<T>* input,bisSimpleImage<T>* output,int in_plane,int in_slice,int in_frame,int in_component)
  {
    
    
    struct internal {
      static int getSliceSize(int i_plane,int i_dim[5],float i_spa[5],int o_dim[5],float o_spa[5])
      {
	int plane=bisUtil::irange(i_plane,0,2);

	switch (plane)
	  {
	  case 2:
	    o_dim[0] = i_dim[0];
	    o_dim[1] = i_dim[1];
	    o_dim[2] = 1;
	    o_spa[0]=i_spa[0];o_spa[1]=i_spa[1];o_spa[2]=i_spa[2];
	    break;
	  case 1:
	    o_dim[0] = i_dim[0];
	    o_dim[1] = i_dim[2];
	    o_dim[2] = 1;
	    o_spa[0]=i_spa[0];o_spa[1]=i_spa[2];o_spa[2]=i_spa[1];
	    break;
	  case 0:
	    o_dim[0] = i_dim[1];
	    o_dim[1] = i_dim[2];
	    o_dim[2] = 1;
	    o_spa[0]=i_spa[1];o_spa[1]=i_spa[2];o_spa[2]=i_spa[0];
	    break;
	  }
	
	for (int ia=3;ia<=4;ia++)
	  {
	    o_dim[ia]=i_dim[ia];
	    o_spa[ia]=i_spa[ia];
	  }

	//	std::cout << "plane=" << plane << " o_dim=" << o_dim[0] << "," << o_dim[1] << "," << o_dim[2] << std::endl;

	return plane;
      }
    };
    
    
    
    if (input==0 || output==0)
      return 0;
    
    
    int imagedim[5]; input->getDimensions(imagedim);
    float imagespa[5]; input->getSpacing(imagespa);
    
    int frame=bisUtil::irange(in_frame,0,imagedim[3]-1);
    int component=bisUtil::irange(in_component,0,imagedim[4]-1);
    
    int sourceWidth=imagedim[0];
    int sourceHeight=imagedim[1];
    int sourceDepth=imagedim[2];
    int voloffset=(sourceWidth*sourceHeight*sourceDepth)*(frame+component*imagedim[3]);
    
    int outputdim[5]; float outputspa[5];
    int plane=internal::getSliceSize(in_plane,imagedim,imagespa,outputdim,outputspa);
    outputdim[3]=1; outputdim[4]=1;

    output->allocateIfDifferent(outputdim,outputspa);
    
    T* outputslice=output->getImageData();
    T* imagedata=input->getImageData();

    if (in_slice<0)
      in_slice=imagedim[plane]/2;
    int currentslice=bisUtil::irange(in_slice,0,imagedim[plane]-1);
    int outindex=0;

    if (plane==2)
      {
	int index=currentslice*imagedim[0]*imagedim[1]+voloffset;
	for (int j=0;j<sourceHeight;j++)
	  {
	    for (int i=0;i<sourceWidth;i++)
	      {
		outputslice[outindex]=imagedata[index];
		++index;
		++outindex;
	      }
	  }
      }
    else if (plane==1)
      {
	for (int j=0;j<sourceDepth;j++)
	  {
	    int sliceoffset= voloffset+j*sourceWidth*sourceHeight+currentslice*sourceWidth;
	    for (int i=0;i<sourceWidth;i++)
	      {
		outputslice[outindex]=imagedata[sliceoffset+i];
		outindex+=1;
	      }
	  }
      }
    else
      {
	for (int j=0;j<sourceDepth;j++)
	  {
	    int sliceoffset=j*sourceWidth*sourceHeight+currentslice+voloffset;
	    for (int i=0;i<sourceHeight;i++)
	      {
		outputslice[outindex]=imagedata[sliceoffset+i*sourceWidth];
		outindex+=1;
	      }
	  }
      }
    
    return 1;
  }


  static inline float	computeDisplacementFieldRoundTripError(bisSimpleImage<float>* forward,bisSimpleImage<float>* reverse,int bounds[6],int debug)
  {
    int dim[5]; forward->getDimensions(dim);
    int reverse_dim[5]; reverse->getDimensions(reverse_dim);
    
	
    if (dim[3]!=3 || reverse_dim[3]!=3)
      {
	std::cout << "Fields must have dimension = 3" << std::endl;
	return -1.0;
      }
    
    int rev_minusdim[3] = { reverse_dim[0]-1,reverse_dim[1]-1,reverse_dim[2]-1 };
    int rev_slicesize=reverse_dim[0]*reverse_dim[1];
    int rev_volsize=reverse_dim[2]*rev_slicesize;
    float reverse_spa[3]; reverse->getImageSpacing(reverse_spa);
    
    
    int volsize=dim[0]*dim[1]*dim[2],slicesize=dim[0]*dim[1];
    float spa[3]; forward->getImageSpacing(spa);
    
    float*  fordata=forward->getImageData();
    float*  revdata=reverse->getImageData();
    
    for (int ia=0;ia<=2;ia++)
      {
	bounds[2*ia]=bisUtil::irange(bounds[2*ia],0,dim[ia]-1);
	bounds[2*ia+1]=bisUtil::irange(bounds[2*ia+1],bounds[2*ia],dim[ia]-1);
      }
    
    int numgood=0;
    float error=0.0;
    float X[3],Y[3],TX[3],disp[3];

    int midk=(bounds[5]-bounds[4])/2+bounds[4];
    int midj=(bounds[3]-bounds[2])/2+1+bounds[2];
    int midi=(bounds[1]-bounds[0])/2+2+bounds[0];

    if (debug)
      std::cout << std::endl << "------------------  mid=" << midi << "," << midj << "," << midk << std::endl;
				     
    
    for (int k=bounds[4];k<=bounds[5];k++)
      {
	X[2]=k*spa[2];
	for (int j=bounds[2];j<=bounds[3];j++)
	  {
	    X[1]=j*spa[1];
	    int index=j*dim[0]+k*slicesize+bounds[0];
	    for (int i=bounds[0];i<=bounds[1];i++)
	      {
		X[0]=i*spa[0];
		for (int axis=0;axis<=2;axis++)
		  {
		    disp[axis]=fordata[index+axis*volsize];
		    Y[axis]=disp[axis]+X[axis];
		    TX[axis]=(Y[axis]/reverse_spa[axis]);
		  }

		
		if (debug>0 && i==midi && j==midj && k==midk)
		  {
		    std::cout << std::endl << "ijk=" << i << "," << "," << j << "," << k << "index=" << index << std::endl;
		    std::cout << " X=" << X[0] << "," << X[1] << "," << X[2] << std::endl;
		    std::cout << " Y=" << Y[0] << "," << Y[1] << "," << Y[2] << std::endl;
		    std::cout << " TX=" << TX[0] << "," << TX[1] << "," << TX[2] << std::endl;
		    std::cout << " disp=" << disp[0] << "," << disp[1] << "," << disp[2] << std::endl;
		  }
		
		
		if (TX[2]>=0 && TX[2] < rev_minusdim[2] &&
		    TX[1]>=0 && TX[1] < rev_minusdim[1] &&
		    TX[0]>=0 && TX[0] < rev_minusdim[0]) {
		  
		  
		  
		  float sum=0.0;
		  numgood++;
		  for (int axis=0;axis<=2;axis++)
		    {
		      int offset=rev_volsize*axis;
		      float d=(float)linearInterpolationFunction<float>(revdata,TX,rev_minusdim,reverse_dim[0],rev_slicesize,offset);
		      sum+=powf( disp[axis]+d,2.0f);
		      if (debug && i==midi && j==midj && k==midk)
			std::cout << "axis= " << axis << " d=" << d << " offset=" << offset << std::endl;
		    }
		  error+=sum;
		}
		index++;
	      }
	  }
      }
    
    float v=(float)sqrt(error/float(numgood));
    if (debug)
      std::cout <<  "error=" << error << " numgood=" << numgood << " v=" << v << std::endl;
    return v;
  }


    // ---------------------------------------------------------------------------
  // Compute ROI Mean
  // ---------------------------------------------------------------------------
  template<class T> int computeROIMean(bisSimpleImage<T>* input,bisSimpleImage<short>* roi,Eigen::MatrixXf& output,int storecentroids)
  {
    
    if (doImagesHaveSameSize<T,short>(input,roi,0)==0)
      return 0;
  
    double r[2]; roi->getRange(r);
    if (r[1]>9999 || r[0]<-3)
      {
	std::cerr << "Bad ROI Image. It has largest value > 999 (max=" << r[1] << ") or min value <-3 ( min="<< r[0] << ")" << std::endl;
	return 0;
      }

    int dim[5]; input->getDimensions(dim);

    int volsize = dim[0]*dim[1]*dim[2];
    int numframes = dim[3];
    int numrois=int(r[1]);
    int extra=0;
    if (storecentroids)
      extra=5;
    
    int mat_dim[2] = { numframes+extra,numrois };

    bisEigenUtil::resizeZeroMatrix(output,mat_dim);
    
    std::vector<int> num(numrois);
    for (int i=0;i<numrois;i++)
      num[i]=0;
    
    T* inpdata= input->getImageData();
    short* roidata= roi->getImageData();
    
    std::cout << "\t Computing ROI: volsize=" << volsize << " numrois=" << numrois << " numframes=" << numframes << " range=" << r[0] << ":" << r[1] << std::endl;

    int voxel=0;

    for (int k=0;k<dim[2];k++) {
      for (int j=0;j<dim[1];j++) {
        for (int i=0;i<dim[0];i++) {
          int region=int(roidata[voxel])-1;
          if (region>=0)
            {
              num[region]+=1;
              for (int frame=0;frame<numframes;frame++)  {
                output(frame,region)=output(frame,region)+inpdata[voxel+frame*volsize];
              }
              if (storecentroids) {
                output(numframes+2,region)=output(numframes+2,region)+i;
                output(numframes+3,region)=output(numframes+3,region)+j;
                output(numframes+4,region)=output(numframes+4,region)+k;
              }
            }
          voxel++;
        }
      }
    }
    
    for (int region=0;region<numrois;region++) {
      if (num[region]>0) {
        for (int frame=0;frame<numframes;frame++) 
	  output(frame,region)=output(frame,region)/float(num[region]);
        if (extra>0) {
          for (int frame=numframes+2; frame<numframes+extra;frame++)
            output(frame,region)=output(frame,region)/float(num[region]);
          output(numframes+1,region)=num[region];
          output(numframes,region)=-1.0;
        }
      } else if (extra>0) {
        output(numframes,region)=-1.0;
      }
    }
    
    return 1;
  }


  template<class TT> bisSimpleImage<unsigned char>* createMaskImage(bisSimpleImage<TT>* input,float threshold,int absolute,int outputis100)
  {
    int dim[5]; input->getDimensions(dim);
    float spa[5]; input->getSpacing(spa);
    
    bisSimpleImage<unsigned char>*output=new bisSimpleImage<unsigned char>("mask");
    output->allocate(dim,spa);


    double range[2]; input->getRange(range);
    double thr=threshold;
    if (absolute==0)
      {
	float t=bisUtil::frange(threshold,0.0,1.0);
	thr=range[0]+t*(range[1]-range[0]);
      }

    unsigned char* odata=output->getData();
    TT* idata=input->getData();
    unsigned char good=1;
    if (outputis100)
      good=100;
    
    for (int i=0;i<input->getLength();i++)
      {
	if (idata[i]>=thr)
	  odata[i]=good;
	else
	  odata[i]=0;
      }
    return output;
  }

  template<class IT,class OT> std::unique_ptr<bisSimpleImage<OT> >  thresholdImage(bisSimpleImage<IT>* input,float thresholds[2],int replace[2],OT replacevalue[2])
  {

    std::unique_ptr<bisSimpleImage<OT> >output(new bisSimpleImage<OT>("threshold_result"));

    int dim[5];    input->getDimensions(dim);
    float spa[5];    input->getSpacing(spa);
    output->allocate(dim,spa);

    OT* odata=output->getData();
    IT* idata=input->getData();
    output->fill(replacevalue[0]);
    for (int i=0;i<input->getLength();i++)
      {
	double v=idata[i];

	if (v>= thresholds[0] && v<=thresholds[1])
	  {
	    if (replace[1])
	      odata[i]=replacevalue[1];
	    else
	      odata[i]=(OT)v;
	  }
	else
	  {
	    if (replace[0])
	      odata[i]=replacevalue[0];
	    else
	      odata[i]=(OT)v;
	  }
      }

    if (!replace[0] && !replace[1]) {
      double sum=0.0;
      for (int i=0;i<input->getLength();i++)
	{
	  sum+=fabs(odata[i]-idata[i]);
	  if (i<10)
	    std::cout << "Values (WASM) " << i << ":" << idata[i] << " vs " << odata[i] << std::endl;
	}
      
      std::cout << "Difference post threshold=" << sum << std::endl;
    }
		
    
    return std::move(output);
  }

  template<class IT,class OT> std::unique_ptr<bisSimpleImage<OT> >  shiftScaleImage(bisSimpleImage<IT>* input,double shift,double scale)
  {
    std::unique_ptr<bisSimpleImage<OT> >output(new bisSimpleImage<OT>("threshold_result"));
    
    int dim[5];    input->getDimensions(dim);
    float spa[5];    input->getSpacing(spa);
    output->allocate(dim,spa);

    OT* odata=output->getData();
    IT* idata=input->getData();
    output->fill(1.0);

    //    std::cout << "Shift=" << shift << ", scale=" << scale << "\t inp=" << bisDataTypes::getTypeCode(IT(0)) << "--> " << bisDataTypes::getTypeCode(OT(0)) << std::endl;
    
    for (int i=0;i<input->getLength();i++)
      {
	double inp=idata[i];
        double out=(inp+shift)*scale;
        odata[i]=(OT)out;
      }
    return std::move(output);
  }


  
    /** 
     * This function performs image clustering. The output is an object containing an image (with values = cluster numbers) and an array containing the volme of each cluster
     * @alias BisImageAlgorithms.createClusterNumberImage
     * @param {BisImage} volume - the input image
     * @param {number} threshold - the value (absolute value thresholding) above which a voxel is counted as good.
     * @param {boolean} oneconnected - whether to use oneconnected (6 neighbors) or corner connected (26 neighbors) connectivity (default =fa
     * @returns {object} out - out.maxsize = size of biggest cluster, out.clusterimage (BisImage) image output where each voxel has its cluster number (or 0), clusterhist (array) containing volume of clusters (e.g. clusterhist[4] is volume of cluster 4. 
     */

  class clusterElement {
    
  public:
    clusterElement(int a,int b,int c, int d=0) {
      this->data[0]=a;
      this->data[1]=b;
      this->data[2]=c;
      this->data[3]=d;
    };
    
    int data[4];
  };
  
  template<class T> int createClusterNumberImage(bisSimpleImage<T>* input,float threshold,int oneconnected,
                                                 int clustersizethreshold,
						 bisSimpleImage<short>* cluster_number_output,
						 std::vector<int>& clusters,int frame,int component)
  {

    
    const short VOXELVISITED=   -1;
    const short UNVISITEDVOXEL= 0;
    
    int dim[5];    input->getDimensions(dim);
    float spa[5];    input->getSpacing(spa);
    
    frame=bisUtil::irange(frame,0,dim[3]-1);
    component=bisUtil::irange(component,0,dim[4]-1);
    int slicesize=dim[0]*dim[1];
    unsigned long volsize=dim[0]*dim[1]*dim[2];
    int offset=(component*dim[3]+frame)*volsize;

    dim[3]=1;  dim[4]=1;
    
    cluster_number_output->allocateIfDifferent(dim,spa);
    cluster_number_output->fill(UNVISITEDVOXEL);

    int d[5]; cluster_number_output->getDimensions(d);
    std::cout << "Number Dim=" << d[0] << "*" << d[1] << "*" << d[2] << "*" << d[3] << "*" << d[4] << std::endl;
    
    oneconnected = (oneconnected>0);
    clusters.empty();
    clusters.push_back(0);
    
    T* inpdata= input->getImageData();
    short* clustdata= cluster_number_output->getImageData();

    std::vector<clusterElement> shifts;
    int maxc=1;
    if (dim[2]==1)
      maxc=0;
    
    for (int ic=-maxc;ic<=maxc;ic++) {
      for (int ib=-1;ib<=1;ib++) {
	for (int ia=-1;ia<=1;ia++) {
	  int sh=ic*slicesize+ib*dim[0]+ia;
	  int diff=abs(ia)+abs(ib)+abs(ic);
	  if (diff==1 || (oneconnected==0 && diff!=0))
	    shifts.push_back(clusterElement(ia,ib,ic,sh));
	}
      }
    }

    int maxshift=shifts.size();

    int CurrentCluster=0;
    int voxelindex=0;
    
    std::vector<clusterElement> clusterseeds;
    
    for (int idZ = 0; idZ < dim[2]; idZ++)
      {
	for (int idY = 0; idY < dim[1]; idY++)
	  {
	    for (int idX = 0; idX < dim[0]; idX++)
	      {
		
		int otval = clustdata[voxelindex];
		
		if (otval == UNVISITEDVOXEL) {

		  // Only Use First Component
		  double value = (double) inpdata[voxelindex+offset];
		  float voxelsign=1.0;
		  if (value<0.0)
		    voxelsign=-1.0;
		  value=fabs(value);
		  
		  if(value >= threshold)
		    {
		      CurrentCluster=CurrentCluster+1;
		      std::stack<clusterElement>  currentStack;
		      currentStack.push(clusterElement(idX,idY,idZ,voxelindex));;
		      int nClusterVoxels=1;
		      clustdata[voxelindex]=CurrentCluster;
		      clusterseeds.push_back(clusterElement(idX,idY,idZ));
		      
		      while(currentStack.size()>0)
			{
			  // ----------------------------------------------------------------------------------------
			  // Work trhough currentStack -- starts with seed but will grow!
			  
			  // ----------------------------------------------------------------------------------------
			  clusterElement CP=currentStack.top();
			  currentStack.pop();
			  
			  for (int nb=0;nb<maxshift;nb++)
			    {
			      int i1=CP.data[0]+shifts[nb].data[0];
			      int i2=CP.data[1]+shifts[nb].data[1];
			      int i3=CP.data[2]+shifts[nb].data[2];
			      
			      if (i1>=0 && i1<dim[0] && i2>=0 && i2<dim[1] && i3>=0 && i3<dim[2])
				{
				  
				  int tmpindex=CP.data[3]+shifts[nb].data[3]+offset;
				  short ot=clustdata[tmpindex];
				  double it=voxelsign*inpdata[tmpindex];
				  
				  // If not yet visitied
				  if ( ot == UNVISITEDVOXEL)
				    {
				      if (it >= threshold)
					{
					  // Mark it as part of this cluster and add to currentStack
					  //					  CurrentCluster=clusters.size();
					  clustdata[tmpindex]=CurrentCluster;
					  currentStack.push(clusterElement(i1,i2,i3,tmpindex));
					  nClusterVoxels++;
					}
				      else
					{
					  clustdata[tmpindex]=VOXELVISITED;
					}
				    }
				}
			    }
			}
		      clusters.push_back(nClusterVoxels);
		    }
		  else
		    {
		      clustdata[voxelindex]=VOXELVISITED;
		    }
		} 
		++voxelindex;
	      }
	  }
      }

    for (unsigned int i=0;i<volsize;i++)
      {
	if (clustdata[i]<=0)
	  clustdata[i]=0;
      }
    
    int sumc=0,maxsize=0;
    clusters[0]=0;
    for (unsigned int i=0;i<clusters.size();i++)
      {
	if (clusters[i]>maxsize)
	  maxsize=clusters[i];
	sumc+=clusters[i];
      }

    if (clustersizethreshold<1)
      {
        std::cout << "+ +  clustering at threshold " << threshold <<" numvoxels that pass=" << sumc << ", maxsize=" << maxsize << ", numclusters=" << clusters.size() << std::endl;
        return maxsize;
      }

    std::vector<int> mapv(clusters.size());
    int good=0;
    for (unsigned int i=0;i<clusters.size();i++)
      {
        if (clusters[i]>=clustersizethreshold) {
          good+=1;
          mapv[i]=good;
        } else {
          mapv[i]=0;
        }
      }
    
    for (unsigned int i=0;i<volsize;i++)
      {
        int clusterno=clustdata[i];
        if (clusterno>0) {
          clustdata[i]=mapv[clusterno];
        }
      }

    std::cout << "+ +  clustering at threshold " << threshold <<" numclusters that pass=" << good << ", maxsize=" << maxsize << std::endl;
    return good;

    

  }

  /** 
   * This function performs masking using as input the results of {@link BisImageAlgorithms.createClusterNumberImage} and a cluster threshold size. Clusters smaller than this are eliminated.
   * @param  volume - the input image
   * @param  clusterOutput - the results of {@link BisImageAlgorithms.createClusterNumberImage}. 
   * @param  clustersizethreshold - the size of cluster below which we filter out
   the value (absolute value thresholding) above which a voxel is counted as good.
   * @returns image
   */
  template<class T> std::unique_ptr<bisSimpleImage<T> > clusterFilter(bisSimpleImage<T>* input,
                                                                      int clustersizethreshold,
                                                                      float threshold,
                                                                      int oneconnected,
                                                                      int frame,int component)
  {

    std::unique_ptr<bisSimpleImage<short> > clusterImage(new bisSimpleImage<short>("clusterno_image"));
    std::unique_ptr<bisSimpleImage<T> > output(new bisSimpleImage<T>("cluster_filtered_image"));

    output->copyStructure(input);
    output->fill(0.0);
    
    std::vector<int> clusters;
    int maxsize=createClusterNumberImage(input,threshold,oneconnected,0,
					 clusterImage.get(),clusters,frame,component);


    if (clustersizethreshold<0)
      clustersizethreshold=maxsize;
    
    std::cout << "___ Filtering: Number of Clusters=" << clusters.size() << " maxsize=" << maxsize << " clustersizethreshold=" << clustersizethreshold << std::endl;

    int dim[5]; output->getDimensions(dim);
    int volsize=dim[0]*dim[1]*dim[2];
    int numcomp=dim[3]*dim[4];

    short* clustdata=clusterImage->getImageData();
    T* odata=output->getImageData();
    T* idata=input->getImageData();
    int numpass=0;

    for (int i=0;i<volsize;i++)
      {
	int clusterno=clustdata[i];
	if (clusterno>0) {
	  if (clusters[clusterno]>=clustersizethreshold)
	    {
	      numpass=numpass+1;
              for (int c=0;c<numcomp;c++)
                odata[i+c*volsize]=idata[i+c*volsize];
            }
	}
      }

    std::cout << "+ +  cluster size masking biggest_cluster=" << maxsize << " threshold=" << clustersizethreshold << " numpass=" << numpass << std::endl;
    return std::move(output);
  }


  // ---------------------- -------------------
  template<class T> std::unique_ptr<bisSimpleImage<T> >  cropImage(bisSimpleImage<T>* input,int bounds[8],int incr[4])
  {

    int dim[5]; input->getDimensions(dim);
    float spa[5];  input->getSpacing(spa);

    int outdim[5]; input->getDimensions(outdim);
    float outspa[5]; input->getSpacing(outspa);
    int shift[4] = { 0,0,0,0};
    
    for (int i=0;i<=3;i++) {

      int mina=bounds[i*2];
      int maxa=bounds[i*2+1];

      //      std::cout << "\n Processing axis " << i << " bounds=" << mina << ":" << maxa << std::endl;
      
      if (i!=3)
	{
	  if (mina<-100)
	    mina=-100;
	  if (maxa>dim[i]+100)
	    maxa=dim[i]+100;
	}
      else
	{
	  if (mina<0)
	    mina=0;
	  if (maxa>dim[3])
	    maxa=dim[3];
	}

      if (incr[i]<1)
	incr[i]=1;
      else if (incr[i]>dim[i])
	incr[i]=dim[i];

    
      //      std::cout << "i=" << i << ", min=" << mina << "," << maxa << " " << incr[i] << std::endl;
      
      outdim[i]=(maxa-mina)/incr[i]+1;
      shift[i]=mina;
      outspa[i]=incr[i]*spa[i];

      //      std::cout << "i=" << i << ",dim=" << outdim[i] << ", shift=" << shift[i] << ", spa=" << outspa[i] << " was =(" << dim[i] << "," << spa[i] << ")" << std::endl << std::endl;
    }

    /*    std::cout << "Out dim = " << outdim[0] << "," << outdim[1] << "," << outdim[2] << "," << outdim[3] << std::endl;
	  std::cout << "Out shift = " << shift[0] << "," << shift[1] << "," << shift[2] << "," << shift[3] << std::endl;
	  std::cout << "Out spa = " << outspa[0] << "," << outspa[1] << "," << outspa[2] << "," << outspa[3] << std::endl;*/

    int in_slicesize=dim[0]*dim[1];
    int in_volsize=in_slicesize*dim[2];
    int in_csize=in_volsize*dim[3];

    int out_slicesize=outdim[0]*outdim[1];
    int out_volsize=out_slicesize*outdim[2];
    int out_csize=out_volsize*outdim[3];
    
    std::unique_ptr<bisSimpleImage<T> >output(new bisSimpleImage<T>("crop_result"));
    output->allocate(outdim,outspa);

    T* odata=output->getData();
    T* idata=input->getData();

    int total=outdim[0]*outdim[1]*outdim[2]*outdim[3]*outdim[4];
    for (int i=0;i<total;i++)
      odata[i]=0;
    
    // Mapping  (i*incr+shift)
    for (int c=0;c<dim[4];c++)
      {
	for (int f=0;f<outdim[3];f++)
	  {
	    int newf=(f*incr[3]+shift[3]);
	    if (newf>=0 && newf<dim[3])
	      {
	    	int in_offset=c*in_csize+newf*in_volsize;
		int out_offset=c*out_csize+f*out_volsize;
		for (int k=0;k<outdim[2];k++)
		  {
		    int newk=(k*incr[2]+shift[2]);
		    if (newk>=0 && newk<dim[2])
		      {
			int in_k=newk*in_slicesize;
			int out_k=k*out_slicesize;
			for (int j=0;j<outdim[1];j++)
			  {
			    int newj=(j*incr[1]+shift[1]);
			    if (newj>=0 && newj<dim[1])
			      {
				int in_j=newj*dim[0];
				int out_j=j*outdim[0];
				
				for (int i=0;i<outdim[0];i++)
				  {
				    int newi=(i*incr[0]+shift[0]);
				    if (newi>=0 && newi<dim[0])
				      odata[out_offset+out_k+out_j+i]=idata[in_offset+in_k+in_j+newi];
				  }
			      }
			  }
		      }
		  }
	      }
	  }
      }

    return std::move(output);

    
    
  }

  // ---------------------- -------------------
  template<class T> std::unique_ptr<bisSimpleImage<T> >  flipImage(bisSimpleImage<T>* input,int flips[3])
  {
    std::unique_ptr<bisSimpleImage<T> >output(new bisSimpleImage<T>("flip_result"));
    int ok=output->copyStructure(input);
    if (!ok)
      return std::move(output);

    int dim[5];    input->getDimensions(dim);

    int maxdim[3];
    for (int ia=0;ia<=2;ia++)
      maxdim[ia]=dim[ia]-1;
    
    T* odata=output->getData();
    T* idata=input->getData();

    int volsize=dim[0]*dim[1]*dim[2];
    int slicesize=dim[0]*dim[1];

    int in_index=0;
    for (int c=0;c<dim[3]*dim[4];c++)
      {
	int offset=c*volsize;
	for (int k=0;k<dim[2];k++)
	  {
	    int flipk=k;
	    if (flips[2])
	      flipk=maxdim[2]-k;
	    for (int j=0;j<dim[1];j++)
	      {
		int flipj=j;
		if (flips[1])
		  flipj=maxdim[1]-j;
		for (int i=0;i<dim[0];i++)
		  {
		    int flipi=i;
		    if (flips[0])
		      flipi=maxdim[0]-i;

		    int out_index=offset+flipk*slicesize+flipj*dim[0]+flipi;
		    odata[out_index]=idata[in_index];
		    in_index=in_index+1;
		  }
	      }
	  }
      }

    return std::move(output);
  }

    // ---------------------- -------------------
  template<class T> std::unique_ptr<bisSimpleImage<T> >  blankImage(bisSimpleImage<T>* input,int bounds[6],float outside)
  {
    int dim[5]; input->getDimensions(dim);
    float spa[5];  input->getSpacing(spa);

    for (int i=0;i<=2;i++) {

      int mina=bounds[i*2];
      int maxa=bounds[i*2+1];
      if (mina<0)
        mina=0;
      if (maxa>=dim[i])
        maxa=dim[i]-1;
      
      bounds[i*2]=mina;
      bounds[i*2+1]=maxa;
    }

    int slicesize=dim[0]*dim[1];
    int volsize=slicesize*dim[2];


    std::unique_ptr<bisSimpleImage<T> >output(new bisSimpleImage<T>("blank_result"));
    output->allocate(dim,spa);

    T* odata=output->getData();
    T* idata=input->getData();

    int total=dim[0]*dim[1]*dim[2]*dim[3]*dim[4];
    for (int i=0;i<total;i++)
      odata[i]=outside;
    
    int numcf=dim[4]*dim[3];
    
    for (int k=bounds[4];k<=bounds[5];k++)
      {
        int k_offset=k*slicesize;
        for (int j=bounds[2];j<=bounds[3];j++)
          {
            int offset=j*dim[0]+k_offset;
            for (int i=bounds[0];i<=bounds[1];i++)
              {
                for (int f=0;f<numcf;f++)
                  {
                    int f_offset=f*volsize;
                    odata[f_offset+offset+i]=idata[f_offset+offset+i];
                  }
              }
          }
      }
    return std::move(output);
  }

  // ---------------------- -------------------
  static inline void print_image(int dim[3],float spa[3],double range[2]) {
    
    std::cout.precision(3);
    std::cout << " dim=(" << dim[0] << "," << dim[1] << "," << dim[2] << ") spa=(" << std::fixed << spa[0] << "," << spa[1] << "," << spa[2] << ")";
    std::cout << " rng=(" << range[0] << ":" << range[1] << ") ";
  }
  
  
  template<class T> std::unique_ptr<bisSimpleImage<T> >  prepareImageForRegistrationExtractFrameAndSmooth(bisSimpleImage<T>* input,
                                                                                                          float sigmas[3],
                                                                                                          int frame,std::string name,
                                                                                                          int debug)
  {
    float outsigmas[3];

    int i_dim[3]; float i_spa[3];
    double range[2];

    int doprint=debug;

    if (doprint) {
      std::cout << "+ +\n+ +  Preprocessing Step1 " << name << ":" << std::endl;
      std::cout << "+ +  \t Extracting frame =" << frame << " ";
    }

    std::unique_ptr< bisSimpleImage<T> > singleFrame=imageExtractFrame(input,frame,0);
    singleFrame->getImageDimensions(i_dim);
    if (doprint) {
      singleFrame->getImageDimensions(i_dim);  singleFrame->getImageSpacing(i_spa);     singleFrame->getRange(range);
      print_image(i_dim,i_spa,range);
      std::cout << std::endl;
    }

    if (doprint)
      std::cout << "+ +  \t Smoothing (" << sigmas[0] << "," << sigmas[1] << "," << sigmas[2] << ") -->";
    std::unique_ptr<bisSimpleImage<T> > smoothed=gaussianSmoothImage(singleFrame.get(),sigmas,outsigmas,1);
    if (doprint) {
          smoothed->getImageDimensions(i_dim);  smoothed->getImageSpacing(i_spa);     smoothed->getRange(range);
	  print_image(i_dim,i_spa,range);
	  std::cout << " vx-sigmas=(" << outsigmas[0] << "," << outsigmas[1] << "," << outsigmas[2] << ")" << std::endl;
    }

    return std::move(smoothed);
  }
  
  template<class T> bisSimpleImage<short>* prepareImageForRegistration(bisSimpleImage<T>* input,
                                                                       int numbins,int normalize,
                                                                       float resolution_factor,float smoothing,int intscale,
                                                                       int frame,std::string name,
                                                                       int debug)
  {

    float in_spa[5]; input->getSpacing(in_spa);
    float r=in_spa[0];
    for (int i=1;i<=2;i++) {
      if (in_spa[i]<r)
	r=in_spa[i];
    }

    r=r*resolution_factor;

    float resolution[3];
    for (int ia=0;ia<=2;ia++)
      resolution[ia] = r;

    float sigmas[3]={0,0,0};
    //    int dosmooth=1;

    if (smoothing>0.02) {
      for (int ia=0;ia<=2;ia++)
	sigmas[ia]=r*0.4247f*smoothing;
    } 


    int i_dim[5]; float i_spa[5]; double range[2];
    std::unique_ptr<bisSimpleImage<T> > smoothed=prepareImageForRegistrationExtractFrameAndSmooth(input,sigmas,frame,name,debug);

    if (debug)
      std::cout << "+ +  \t Resampling (" << resolution[0] << "," << resolution[1] << "," << resolution[2] << ") ->";
    
    std::unique_ptr<bisSimpleImage<T> > resliced=resampleImage(smoothed.get(),resolution,1,0.0,0);


    
    if (debug) {
      resliced->getImageDimensions(i_dim); resliced->getImageSpacing(i_spa); resliced->getRange(range);
      print_image(i_dim,i_spa,range);
      std::cout << std::endl;
    }

    float perlow=0.01f,perhigh=0.99f;
    if (normalize==0) {
      perlow=0.0;
      perhigh=1.0;
    }
    int outmaxvalue=numbins*intscale-1;
    if (debug) {
      std::cout << "+ +  \t Normalizing (" << perlow << ":" << perhigh << ") " << outmaxvalue << " -->";
    }

    double odata[2];
    bisSimpleImage<short>* out=imageNormalize(resliced.get(),perlow,perhigh,outmaxvalue,odata,name);


    
    if (debug) {
      out->getImageDimensions(i_dim); out->getImageSpacing(i_spa);
      out->getRange(range);
      print_image(i_dim,i_spa,range);
      std::cout  << " robust 1:99 %, info=" << odata[0] << "," << odata[1] << " numbins=" << numbins << std::endl;
    }
    return out;
  }

  // ---------------------- -------------------
  template<class T> bisSimpleImage<short>*  prepareAndResliceImageForRegistration(bisSimpleImage<T>* input,
                                                                                  bisAbstractTransformation* reslicexform,
                                                                                  int refdim[5],
                                                                                  float refspa[5],
                                                                                  int numbins,int normalize,
                                                                                  float smoothing,int intscale,
                                                                                  int frame,std::string name,
                                                                                  int debug)  {
    
    
    float sigmas[3]={0,0,0};
    if (smoothing>0.02) {
      for (int ia=0;ia<=2;ia++)
	sigmas[ia]=refspa[ia]*0.4247f*smoothing;
    } 
    
    int i_dim[5]; float i_spa[5]; double range[2];
    std::unique_ptr<bisSimpleImage<T> > smoothed=prepareImageForRegistrationExtractFrameAndSmooth(input,sigmas,frame,name,debug);

    if (debug)
      std::cout << "+ +  \t Reslicing :";

    std::unique_ptr<bisSimpleImage<T> > resliced(new bisSimpleImage<T>("reslicedImage"));
    resliced->allocate(refdim,refspa);
    resliceImage(input,resliced.get(),reslicexform,1,0.0);
 
    if (debug) {
      resliced->getImageDimensions(i_dim); resliced->getImageSpacing(i_spa); resliced->getRange(range);
      print_image(i_dim,i_spa,range);
      std::cout << std::endl;
    }
    
    int outmaxvalue=numbins*intscale-1;
    float perlow=0.01f,perhigh=0.99f;
    if (normalize==0) {
      perlow=0.0;
      perhigh=1.0;
    }

    if (debug) {
      std::cout << "+ +  \t Normalizing (" << perlow << ":" << perhigh << ") " << outmaxvalue << " -->";
    }

    double odata[2];
    bisSimpleImage<short>* out(imageNormalize(resliced.get(),perlow,perhigh,outmaxvalue,odata,name));

    if (debug) {
      out->getImageDimensions(i_dim); out->getImageSpacing(i_spa);
      out->getRange(range);
      print_image(i_dim,i_spa,range);
      
      std::cout  << " robust 1:99 %, info=" << odata[0] << "," << odata[1] << " numbins=" << numbins << std::endl;
    }
    return out;
  }

  /** median normalize an image -- set values so that median = 0 and interquartile range = 1
   * @param input the input image
   * @param debug - a debug flag
   * @returns the normalized image
   */
  template<class T> bisSimpleImage<float>*  medianNormalizeImage(bisSimpleImage<T>* input,int debug)
  {
    int dim[5]; input->getDimensions(dim);
    float spa[5];  input->getSpacing(spa);
    int slicesize=dim[0]*dim[1];
    int volsize=slicesize*dim[2];

    bisSimpleImage<float>* output=new bisSimpleImage<float>("normalized_image");
    output->allocate(dim,spa);

    float* odata=output->getData();
    T* idata=input->getData();
    int datasize=dim[0]*dim[1]*dim[2]*dim[3]*dim[4];

    // Copy data first as nth largest is destructive
    for (int i=0;i<datasize;i++)
      odata[i]=idata[i];

    
    int quarter=(volsize/4);
    int middle=(volsize/2);
    int threequarter=(volsize*3/4);

    /*        
    if (debug>1) {
      std::cout << "Image Size = " << volsize << " indices="<< quarter << ":" << middle << ":" << threequarter << std::endl;
      std::cout << "Image Values = " << idata[quarter] << ":" << idata[middle] << ":" << idata[threequarter] << std::endl;
      }*/

    std::nth_element(odata,odata+quarter,odata+volsize);
    float s1=odata[quarter];
    std::nth_element(odata,odata+middle,odata+volsize);
    float m=odata[middle];
    std::nth_element(odata,odata+threequarter,odata+volsize);
    float s2=odata[threequarter];

    if (debug) {
      std::cout << "Image Size = " << volsize << " indices="<< quarter << ":" << middle << ":" << threequarter << std::endl;
      std::cout << "Image Values = " << s1 << ":" << m << ":" << s2 << std::endl;
    }
    
    float range=s2-s1;
    if (range<0.001)
      range=0.001;

    for (int i=0;i<datasize;i++) 
      odata[i]=(idata[i]-m)/range;
    
    return output;
  }


    // ---------------------- -------------------

  // namespace end
}
#endif





