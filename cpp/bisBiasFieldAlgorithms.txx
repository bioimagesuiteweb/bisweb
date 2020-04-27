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


#ifndef _bis_BiasField_Algorithms_cpp
#define _bis_BiasField_Algorithms_cpp


namespace bisBiasFieldAlgorithms {

  static inline int meanFit(std::vector<float>& x,std::vector<float>& y,int ndata,float& a,float& b)
  {
    float sx=0.0,sy=0.0,sxy=0.0,sxx=0.0;
    
    for (int j=0;j<ndata;j++)
      {
	sx += x[j];
	sy += y[j];
	sxy += x[j]*y[j];
	sxx += x[j]*x[j];
      }
	
    float del=ndata*sxx-sx*sx;
    a=(sxx*sy-sx*sxy)/del;
    b=(ndata*sxy-sx*sy)/del;
    return ndata;
  }

  template<class TT>  bisSimpleImage<float>* createWeightImage(bisSimpleImage<TT>* inp) 
  {
    int dim[5]; inp->getDimensions(dim);
    float spa[5]; inp->getSpacing(spa);

    //    std::cout << "Dims=" << dim[0] << "," << dim[1] << "," << dim[2] << std::endl;
    
    bisSimpleImage<float>* weightImage=new bisSimpleImage<float>();
    dim[3]=1; dim[4]=1;
    weightImage->allocate(dim,spa);
    weightImage->fill(0.0f);
    int imagesize=weightImage->getLength();

    //    std::cout << "imagesize=" << imagesize << std::endl;
    
    float* wdata=weightImage->getData();
    TT* inpdata=inp->getData();
    for (int i=0;i<imagesize;i++)
      wdata[i]=(float)inpdata[i];


    float sigmas[3]={1.0,1.0,1.0};
    float outsigmas[3];
    std::unique_ptr<bisSimpleImage<float> > smoothed(bisImageAlgorithms::gaussianSmoothImage<float>(weightImage,sigmas,outsigmas,0,1.5));

    //    std::cout << "outsigmas=" << outsigmas[0] << "," << outsigmas[1] << "," << outsigmas[2] << std::endl;
    
    int incr[3];
    incr[0]=1;
    incr[1]=dim[0];
    incr[2]=dim[1]*dim[0];

    float* smdata=smoothed->getImageData();
    
    weightImage->fill(0.0f);
    for (int k=1;k<dim[2]-1;k++)
      {
	for (int j=1;j<dim[1]-1;j++)
	  {
	    for (int i=1;i<dim[0]-1;i++)
	      {
		int index=i+j*incr[1]+k*incr[2];
		float sum=0.0;
		for (int axis=0;axis<=2;axis++)
		  {
		    /*		    if (i==dim[0]/2 && j==dim[1]/2 && k==dim[2]/2)  {
		      std::cout << "axis=" << axis << "values=" <<  smdata[index] << " (" << smdata[index-incr[axis]] << "," << smdata[index+incr[axis]] << ")" << std::endl;
		      }*/
		    sum+=powf(2.0f*smdata[index]-smdata[index-incr[axis]]-smdata[index+incr[axis]],2.0f);

		  }
		wdata[index]=float(sqrt(sum));
		/*		if (i==dim[0]/2 && j==dim[1]/2 && k==dim[2]/2)  {
		  std::cout << "ijk=" << i << "," << j << "," << k << ". index=" << index << " sum=" << wdata[index] << std::endl;
		  std::cout << " raw image=" << inpdata[index] << " smoothed =" << smdata[index] << std::endl;
		  }*/
	      }
	  }
      }

    double range[2]; weightImage->getRange(range);
    double sigma2=pow(range[1]*0.1,2.0);

    //    std::cout << "range=" << range[0] << ":" << range[1] << " sigma2=" << sigma2 << std::endl;
    
    for (int i=0;i<imagesize;i++)
      wdata[i]=float(1000.0*(1.0f-bisUtil::valley2(wdata[i],sigma2)));

    //    weightImage->getRange(range);
    //    std::cout << "valley range=" << range[0] << ":" << range[1] << std::endl;
    return weightImage;
  }

  template<class TT> int computeWeightedImageRatio(TT* data1,TT* data2,float* wgt1, float* wgt2,
						   int maxlength,
						   float threshold, 
						   std::vector<float> x,std::vector<float> y,
						   float& a,float& b)
  {
    int index=0;
    int numgood=0;
    for (int pixel=0;pixel<maxlength;pixel++)
      {
	double xin=data1[pixel];
	double yin=data2[pixel];
	
	if (xin>threshold && yin>threshold)
	  {
	    ++numgood;
	    if (wgt1[pixel]>750.0 && wgt2[pixel]> 750.0)
	      {
		x[index]=(float)xin;
		y[index]=(float)yin;
		++index;
	      }
	  }
      }
    
    if (index > maxlength/20)
      {
	for (int pass=0;pass<=1;pass++)
	  {
	    meanFit(x,y,index,a,b);
	    if (pass==0)
	      {
		for (int i=0;i<index;i++)
		  y[i]=y[i]-a;
	      }
	  }
      }
    else
      {
	a=0.0;
	b=1.0;
      }
    
    return numgood;
  }

  template<class TT> bisSimpleImage<float>* computeSliceBiasField(bisSimpleImage<TT>* input,int in_axis,float in_threshold)
  {
    int dim[5]; input->getDimensions(dim);
    float spa[5]; input->getSpacing(spa);
    int axis=bisUtil::irange(in_axis,0,2);

    
    bisSimpleImage<float>* biasField=new bisSimpleImage<float>();
    dim[3]=1; dim[4]=1;
    biasField->allocate(dim,spa);
    
    //bisSimpleImage<float>* output=new bisSimpleImage<float>();
    //    output->allocate(dim,spa);
    
    if (dim[axis]<2)
      {
	biasField->fill(100.0);
	return biasField;
      }
    
    std::unique_ptr<bisSimpleImage<float> > weight_image(createWeightImage(input));


    double int_range[2]; input->getRange(int_range);
    /*    int nonnegative=0;
    if (int_range[0]>=0.0)
    nonnegative=1;*/

    float threshold=in_threshold*float(int_range[1])+(1.0f-in_threshold)*float(int_range[0]);

    int perdim[3];
    perdim[2]=dim[axis];
    for (int k=1;k<=2;k++)
      {
	int taxis=axis+k;
	if (taxis>2)
	  taxis-=3;
	perdim[k-1]=dim[taxis];
      }
    
    //    std::cout << "Axis=" << axis << " dim=" << dim[0] << "," << dim[1] << "," << dim[2] << "\t ";
    //    std::cout << "perdim=" << perdim[0] << "," << perdim[1] << "," << perdim[2] << std::endl << std::endl;

    int slicesize=perdim[0]*perdim[1];
    std::vector<float> xa(slicesize);
    std::vector<float> ya(slicesize);

    std::vector<float> slice_a(perdim[2]);
    std::vector<float> slice_b(perdim[2]);

    std::unique_ptr< bisSimpleImage<TT> > slice_voi(new bisSimpleImage<TT>());
    std::unique_ptr< bisSimpleImage<TT> > slice_voi2(new bisSimpleImage<TT>());

    std::unique_ptr< bisSimpleImage<float> > weight_voi(new bisSimpleImage<float>());
    std::unique_ptr< bisSimpleImage<float> > weight_voi2(new bisSimpleImage<float>());

    for (int pass=0;pass<=1;pass++)
      {
	double current_a=0.0;
	double current_b=1.0;
	
	int slice=perdim[2]/2+1; 
	int endslice=perdim[2];
	int increment=1;
      
	if (pass==1)
	  {
	    slice=perdim[2]/2-1;   
	    endslice=-1;
	    increment=-1;
	  }
	
	int maxcount=abs(endslice-slice);
	if (slice>=perdim[2] || slice<0)
	  maxcount=-1;

	std::cout << "Slice=" << slice << " endslice=" << endslice << " increm=" << increment << " maxcount=" << maxcount << std::endl;

	for (int count=0;count<maxcount;count++)
	  {
	    //slice_voi->SetSliceNo(slice);	    slice_voi->Update();
	    bisImageAlgorithms::imageExtractSlice<TT>(input,slice_voi.get(),axis,slice,0,0);
	    bisImageAlgorithms::imageExtractSlice<float>(weight_image.get(),weight_voi.get(),axis,slice,0,0);
	    //slice_voi2->SetSliceNo(slice-increment);  slice_voi2->Update();
	    bisImageAlgorithms::imageExtractSlice<TT>(input,slice_voi2.get(),axis,slice-increment,0,0);
	    bisImageAlgorithms::imageExtractSlice<float>(weight_image.get(),weight_voi2.get(),axis,slice-increment,0,0);
	    
	    float a1,b1;
	    int nv1=computeWeightedImageRatio<TT>(slice_voi2->getImageData(),slice_voi->getImageData(),
						  weight_voi2->getImageData(),weight_voi->getImageData(),
						  slicesize,
						  threshold,xa,ya,a1,b1);
	    float ah1,bh1;
	    int nv2=computeWeightedImageRatio<TT>(slice_voi->getImageData(),slice_voi2->getImageData(),
						  weight_voi->getImageData(),weight_voi2->getImageData(),
						  slicesize,
						  threshold,xa,ya,ah1,bh1);
	  
	    double a0=current_a;
	    double b0=current_b;

	    if (nv1>0 && nv2>0 && (b1*bh1)>0.5)
	      {
		a1=0.5f*float(a1-ah1/bh1);
		b1=0.5f*float(b1+1.0/bh1);
		
		if (b1>1.5f || b1 <0.666f)
		  {
		    b1=bisUtil::frange(b1,0.666f,1.5f);
		    a1=0.0f;
		  }
		
		if ( !std::isnan(a1) && !std::isnan(b1) )
		  {
		    current_a=a1+b1*a0;
		    current_b=b1*b0;
		  }
		else
		  {
		    a1=0.0f;
		    b1=1.0f;
		  }
	      }
	    else
	      {
		a1=0.0f;
		b1=1.0f;
	      }

	    slice_a[slice]=float(current_a); //   this->SliceParameters->SetComponent(slice,0,current_a);
	    slice_b[slice]=float(current_b); //   this->SliceParameters->SetComponent(slice,1,current_b);
	    slice+=increment;
	  }
      }


    
    TT* inp=input->getImageData(); //vtkDataArray* inp=input->GetPointData()->GetScalars();
    float* bias=biasField->getImageData(); //  vtkDataArray* bias=this->BiasField->GetPointData()->GetScalars();
    //    float* dat=output->getImageData();
    //    vtkDataArray* dat=output->GetPointData()->GetScalars();
  
    double sum_in=0.0,sum_out=0.0;

    //    std::cout << "Threshold=" << threshold << std::endl;
    int index=0;
    for (int k=0;k<dim[2];k++)
      {
	for (int j=0;j<dim[1];j++)
	  {
	    for (int i=0;i<dim[0];i++)
	      {
		double a=0.0,b=1.0;
		switch (axis)
		  {
		  case 0:
		    a=slice_a[i];//his->SliceParameters->GetComponent(i,0);
		    b=slice_b[i];//this->SliceParameters->GetComponent(i,1);
		    break;
		  case 1:
		    a=slice_a[j];//this->SliceParameters->GetComponent(j,0);
		    b=slice_b[j];//this->SliceParameters->GetComponent(j,1);
		    break;
		  case 2:
		    a=slice_a[k];//this->SliceParameters->GetComponent(k,0);
		    b=slice_b[k];//this->SliceParameters->GetComponent(k,1);
		    break;
		  }
		
		double y=inp[index];
		if (y>threshold && b>0.0)
		  {
		    double x=(y-a)/b;
		    sum_in+=y;
		    sum_out+=x;

		    // This is temporary storage for later
		    bias[index]=float(x);
		  }
		else
		  {
		    // This is temporary storage for later
		    bias[index]=float(y);
		  }
		++index;
	      }
	  }
      }

    //    std::cout << "Sums=" << sum_in << ", " << sum_out << std::endl;
    

    double scale=sum_in/sum_out;
    std::cout << "\t Overall scale=" << scale << std::endl;
    int    nt=biasField->getLength();
    for (int vx=0;vx<nt;vx++)
      {
	double y=inp[vx];
	double x=bias[vx]*scale;
	double b=0.0;
	if (x>0.0)
	  b=100.0*y/x;
	else 
	  b=100.0;
	bias[vx]=float(b);
      }

    return biasField;
  }

  template<class TT> bisSimpleImage<float>* biasFieldCorrection(bisSimpleImage<TT>* input,bisSimpleImage<float>* biasField)
  {
    int dim[5]; input->getDimensions(dim);
    float spa[5]; input->getSpacing(spa);
    int bdim[3]; biasField->getImageDimensions(bdim);
    int sum=0;
    for (int ia=0;ia<=2;ia++)
      sum+=abs(dim[ia]-bdim[ia]);
    
    if (sum>0)
      {
	std::cerr << "Can not perform bias field correction, dimensions do not match " << std::endl;
	return NULL;
      }
    
    bisSimpleImage<float>* output=new bisSimpleImage<float>();
    output->allocate(dim,spa);
    output->fill(0.0f);
    
    TT* idata=input->getImageData();
    float* bdata=biasField->getImageData();
    float* odata=output->getImageData();
    
    int index=0;
    int volsize=dim[2]*dim[1]*dim[0];
    int numframecomp=dim[3]*dim[4];

    std::cout << "volsize = " << volsize << " numcompframes=" << numframecomp << " dims=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << std::endl;
    
    for (int k=0;k<dim[2];k++)
      for (int j=0;j<dim[1];j++)
	for (int i=0;i<dim[0];i++)
	  {
	    double b=bdata[index];
	    if (b>0)
	      {
		for (int fr=0;fr<numframecomp;fr++)
		  {
		    double y=idata[index+volsize*fr];
		    odata[index+volsize*fr]=float(100.0*y/b);
		  }
	      }
	    else
	      {
		for (int fr=0;fr<numframecomp;fr++)
		  odata[index+volsize*fr]=0.0f;
	      }
	    ++index;
	  }

    std::cout << "Done computing bias field correction " << std::endl;
    
    return output;
  }


  template<class TT> bisSimpleImage<float>* computeTripleSliceBiasField(bisSimpleImage<TT>* input,float threshold)
  {
    std::unique_ptr<bisSimpleImage<float> > bias_x(computeSliceBiasField(input,0,threshold));
    std::unique_ptr<bisSimpleImage<float> > result_x(biasFieldCorrection(input,bias_x.get()));
    
    std::unique_ptr<bisSimpleImage<float> > bias_y(computeSliceBiasField(result_x.get(),1,threshold));
    std::unique_ptr<bisSimpleImage<float> > result_y(biasFieldCorrection(result_x.get(),bias_y.get()));
    
    bisSimpleImage<float>*  bias_z=computeSliceBiasField(result_y.get(),2,threshold);
    std::unique_ptr<bisSimpleImage<float> > result_z(biasFieldCorrection(result_y.get(),bias_z));

    int l=bias_z->getLength();
    TT* i_data=input->getData();
    float* odata=result_z->getData();
    float* bdata=bias_z->getData();
    
    for (int i=0;i<l;i++)
      {
	if (odata[i]>0.0)
	  bdata[i]=float(100.0*i_data[i]/odata[i]);
	else
	  bdata[i]=100.0f;
      }
    return bias_z;
  }
   

  template<class TT> bisSimpleImage<TT>* computedMaskedBiasFieldCorrection(bisSimpleImage<TT>* input,bisSimpleImage<unsigned char>* mask_in,
											    double blursigma,
											    double outputmean)
  {

    int dim[5]; input->getDimensions(dim);
    float spa[5]; input->getSpacing(spa);
    
    // Cast Mask to float
    std::unique_ptr<bisSimpleImage<float> > imagefloat(new bisSimpleImage<float>());
    imagefloat->allocate(dim,spa);
    float* data=imagefloat->getImageData();
    TT* idata=input->getImageData();
    
    std::unique_ptr<bisSimpleImage<float> > maskfloat(new bisSimpleImage<float>());
    dim[3]=1,dim[4]=1;
    maskfloat->allocate(dim,spa);
    
    float *mask=maskfloat->getImageData();
    unsigned char *imask=mask_in->getImageData();
    int numvoxels=dim[0]*dim[1]*dim[2];

    float sum=0.0,numvox=0.0;
    
    for (int i=0;i<numvoxels;i++)
      {
	mask[i]=(float)(imask[i]>0.5);
	data[i]=float(idata[i])*mask[i];
	if (mask[i]>0.0)
	  {
	    sum+=data[i];
	    numvox+=1.0f;
	  }
      }

    if (numvox<1)
      {
	return NULL;
      }
    
    float in_meanval=sum/numvox;
    float meanval=in_meanval;
    if (outputmean>0.0)
      in_meanval=outputmean;

    float sigmas[3]= { (float)blursigma,(float)blursigma,(float)blursigma };
    float outsigmas[3];
    float scale=1.0/meanval;
    std::unique_ptr<bisSimpleImage<float> > smooth_img=bisImageAlgorithms::gaussianSmoothImage(imagefloat.get(),sigmas,outsigmas,1);
    std::unique_ptr<bisSimpleImage<float> > smooth_msk=bisImageAlgorithms::gaussianSmoothImage(maskfloat.get(),sigmas,outsigmas,1);

    std::unique_ptr<bisSimpleImage<float> > ratio(new bisSimpleImage<float>());
    ratio->copyStructure(smooth_img.get());
    ratio->fill(0.0f);
    float* ratiodata=ratio->getImageData();

    float* smimagedata=smooth_img->getImageData();
    float* smmaskdata=smooth_msk->getImageData();
    
    for (int i=0;i<numvoxels;i++)
      {
	if (smmaskdata[i]>0.0)
	  ratiodata[i]=scale*smimagedata[i]/smmaskdata[i];
	ratiodata[i]=ratiodata[i]*mask[i];
      }


    bisSimpleImage<float>* output=biasFieldCorrection<TT>(input,ratio);

    float scale2=(in_meanval/meanval);
    if (fabs(scale2-1.0) > 0.1 ){
      std::cout << "+++ Post variance, scaling entire image by " << scale2 << " (target=" << in_meanval << " out= " << meanval << ") to normalize" << std::endl;
      float* odata=output->getImageData();
      for (int i=0;i<numvoxels;i++)
	odata[i]=odata[i]*scale2;
    }
    
    return output;
  }
  // End of namespace
}

#endif

