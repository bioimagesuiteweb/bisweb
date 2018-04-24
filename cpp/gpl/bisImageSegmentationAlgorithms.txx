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

#ifndef _bis_ImageSegmentation_Algorithms_cpp
#define _bis_ImageSegmentation_Algorithms_cpp

#include <iomanip>

namespace bisImageSegmentationAlgorithms {

// ----------------------------------------------------------------------------

  template<class TT> std::vector<float> createHistogram(bisSimpleImage<TT>* input,int NumBins,int robust,int smoothhisto,float& histogram_origin,float& histogram_spacing)
  {

    robust=bisUtil::irange(robust,0,1);
    smoothhisto=bisUtil::irange(smoothhisto,0,1);
    
    double range[2];
    if (robust==0)
      input->getRange(range);
    else
      bisImageAlgorithms::imageRobustRange(input,0.002f,0.998f,range);

    float minv=float(range[0]);
    float maxv=float(range[1]);
    if (fabs(maxv-minv)<0.000001)
      maxv+=1.0f;

    histogram_origin=minv;
    histogram_spacing=1.0f;

    int drange=int(maxv-minv+1);
    int numbins=NumBins;
    
    if (drange< numbins)
      numbins=drange;
    
    while(drange> numbins*histogram_spacing)
      histogram_spacing+=1.0f;

    numbins=bisUtil::irange(int(drange/histogram_spacing+0.5),4,1024);
    
    std::cout << "Computing Histogram" << std::endl;
    std::cout << "\t Input Range = " << range[0] << "," << range[1] << " (robust=" << robust << ")" << std::endl;
    std::cout << "\t Numbins " << numbins << "(from " << NumBins << ") origin=" << histogram_origin << ", spacing=" << histogram_spacing << std::endl;
    std::cout << "\t Smoothing histogram = " << smoothhisto << std::endl;

    std::vector<int> bins(numbins);
    std::fill(bins.begin(), bins.end(), 0);

    TT* data=input->getData();
    for (int voxel=0;voxel<input->getLength();voxel++)
      {
	double val=data[voxel];
	int index= int(0.5+(val-histogram_origin)/histogram_spacing);
	index=bisUtil::irange(index,0,numbins-1);
	bins[index]+=1;
      }

    std::vector<float> outbins(numbins);
    
    if (smoothhisto)
      {
	float kernel[5]= { 0.05f,0.25f,0.4f,0.25f,0.05f };
	
	for (int index=0;index<numbins;index++)
	  {
	    float sum=0.0;
	    for (int r=-2;r<=2;r++)
	      {
		int j=bisUtil::irange(index+r,0,numbins-1);
		sum+=kernel[r+2]*bins[j];
	      }
	    outbins[index]=sum;
	  }
      }
    else
      {
	for (int index=0;index<numbins;index++)
	  outbins[index]=bins[index];
      }

    return outbins;
  }

  
  int initializeParameters(int numbins,float histogram_origin,float histogram_spacing,int numclasses,std::vector<float>& means,std::vector<float>& sigmas2)
  {

    double range[2];
    range[0]=histogram_origin;
    range[1]=histogram_spacing*float(numbins-1);

    std::cout << "Beginning range=" << range[0] << ":" << range[1] << std::endl;

    float s=float(range[1]-range[0])/float(numclasses);
    for (int j=0;j<numclasses;j++)
      {
	float m =float(range[0]+ float(j+0.5)/float(numclasses)*(range[1]-range[0]));
	means[j]=m;
	sigmas2[j]=s*s;
      }
 
    return 1;
  }



  template<class TT> std::unique_ptr<bisSimpleImage<short> > histogramSegmentation(bisSimpleImage<TT>* input, int in_numclasses,float in_maxsigmaratio,
											   int in_maxiterations, float in_convergence,int in_usevariance,
											   int in_numbins,int robust, int smoothhisto,int frame,int component)
  {
    std::cout.precision(3);
    std::cout << std::fixed;
    float maxsigmaratio=bisUtil::frange(in_maxsigmaratio,0.01f,1.0f);
    int numclasses=bisUtil::irange(in_numclasses,2,20);
    float histogram_origin=0.0f,histogram_spacing=1.0f;
    
    std::unique_ptr< bisSimpleImage<TT> > singleFrameInput=bisImageAlgorithms::imageExtractFrame(input,frame,component);
    std::vector<float> histogram=createHistogram(singleFrameInput.get(),in_numbins,robust,smoothhisto,histogram_origin,histogram_spacing);
    int numbins=histogram.size();
    
    std::vector<float> means(numclasses);
    std::vector<float> sigmas2(numclasses);
    std::vector<float> sum(numclasses);
    std::vector<float> sum2(numclasses);
    std::vector<float> num(numclasses);

    // Initialize values
    initializeParameters(numbins,histogram_origin,histogram_spacing,numclasses,means,sigmas2);

    std::cout << std::endl <<"**** Initial Parameters (maxsigmaratio=" << maxsigmaratio << ")" << std::endl;
    for (int j=0;j<numclasses;j++)
      std::cout << "\t c=" << j+1 << " mean=" << means[j] << " sigma=" << sqrt(sigmas2[j]) << std::endl;
    
    
    // ----------------------------------------------------------------------------------
    //            Iterations
    // ----------------------------------------------------------------------------------
    int iter=1;
    float error=in_convergence+1.0f;

    while (iter <= in_maxiterations && error > in_convergence)
      {
	error=0.0f;
	float totalnum=0.0f;
	
	for (int i=0;i<numclasses;i++)
	  {
	    sum[i]=0.0;
	    sum2[i]=0.0;
	    num[i]=0.0;
	  }
	
	for (int bin=0;bin<numbins;bin++)
	  {
	    float v=histogram_origin+float(bin)*histogram_spacing;
	    float numv=histogram[bin];
	    if (std::isnan(numv))
	      numv=0.0;
	    double bestp=0.0;
	    int   bestc=0;
	    
	    for (int c=0;c<numclasses;c++)
	      {
		double t=0.0;
		if (c<numclasses)
		  {
		    if (in_usevariance)
		      t=bisUtil::gaussian(v,means[c],sigmas2[c]);
		    else
		      t=bisUtil::gaussian(v,means[c],sigmas2[0]);
		  }
		if (t>bestp)  {
		  bestp=t;  bestc=c;
		}
	      }
	    num[bestc]+=numv;
	    sum[bestc]+=v*numv;
	    sum2[bestc]+=v*v*numv;
	    totalnum+=numv;
	  }
	
	std::cout << "It=" << iter << "\t";
	
	// Compute Parameters
	// ------------------
	float maxsigma=0.0;
	for (int c=0;c<numclasses;c++)
	  {
	    if (num[c]<1.0)
	      num[c]=1.0;

	    float m=sum[c]/num[c];
	    error=bisUtil::fmax(float(fabs(m-means[c])),error);
	 
	    means[c]=m;
	    sigmas2[c]=(sum2[c]/num[c]-means[c]*means[c]);
	 
	    if (std::isnan(sigmas2[c]) || sigmas2[c]<2.0)
	      sigmas2[c]=2.0;

	    float s=float(sqrt(sigmas2[c]));
	    if (std::isnan(s))
	      s=2.0;
	    if (s>maxsigma)
	      maxsigma=s;
	  }

	// Enforce MaxSigmaRatio (0.1)
	// ---------------------------
	for (int c=0;c<numclasses;c++)
	  {
	    float s=float(sqrt(sigmas2[c]));
	    if (s<maxsigmaratio*maxsigma)
	      sigmas2[c]=powf(maxsigmaratio*maxsigma,2.0f);;
	    if (std::isnan(sigmas2[c]))
	      sigmas2[c]=2.0f;
	    
	    std::cout << std::setw(8) << means[c] << " +- " << std::setw(6) << sqrt(sigmas2[c]) << " (" << std::setw(6) << 100.0*num[c]/totalnum << "%) \t";
	  }
	std::cout << "usevar= " << in_usevariance << " error=" << error << std::endl;
	++iter;
      }


    // At this point sort via means[c]
    // ------------------------------

    std::vector<float> outmeans(numclasses);
    std::vector<float> outsigmas2(numclasses);
    std::vector<float> outnum(numclasses);
    
    for (int c=0;c<numclasses;c++)
      {
	int best=c;
	float bestm=means[c];
	for (int c1=0;c1<numclasses;c1++)
	  {
	    if (means[c1]<bestm)
	      {
		bestm=means[c1];
		best=c1;
	      }
	  }

	outmeans[c]=means[best];
	outsigmas2[c]=float(sqrt(sigmas2[best]));
	outnum[c]=num[best];
	means[best]=1e+10;
      }

    
    std::vector<float> thresholds(numclasses-1);
    std::cout << std::endl << "\t thresholds=";
    for (int j=0;j<(numclasses-1);j++)
      {
	thresholds[j]=(float)bisUtil::getGaussianThreshold(outmeans[j],outmeans[j+1],outsigmas2[j],outsigmas2[j+1]);
	std::cout << thresholds[j] << " ";
      }
    std::cout << std::endl;

    
    
    std::unique_ptr<bisSimpleImage<short > > output(new bisSimpleImage<short>());
    int dim[5]; input->getDimensions(dim);
    float spa[5]; input->getSpacing(spa);
    output->allocate(dim,spa);
    output->fill(0);
    
    TT* indata=input->getData();
    short* odata=output->getData();
    
    for (int i=0;i<output->getLength();i++)
      {
	int found=0;
	int c=1;
	double v=indata[i];
	if (v>thresholds[0])
	  {
	    while(c<numclasses-1 && found==0)
	      {
		if (v<thresholds[c])
		  {
		    odata[i]=c;
		    found=1;
		  }
		c=c+1;
	      }
	    if (found==0)
	      odata[i]=numclasses-1;
	  }
      }

    return std::move(output);
  }

  // -------------------------------------------------------------------------------------------------------------------------------
  template<class TT> void doExpectationStep(bisSimpleImage<short>* label_image,
					    bisSimpleImage<TT>* input_image,
					    std::vector<float>& means,
					    std::vector<float>& sigmas2,
					    std::vector<float>& num)
    
  {
    // input is single frame !!!
    int nt=input_image->getLength();
    int numclasses=means.size();
    
    for (int i=0;i<numclasses;i++)
      {
	means[i]=0.0;
	sigmas2[i]=0.0;
	num[i]=0.0;
      }
    
    short* label_data=label_image->getData();
    TT* intensities=input_image->getData();
    
    for (int vox=0;vox<nt;vox++)
      {
	int c=label_data[vox];
	float v=(float)intensities[vox];
	means[c]+=v;
	sigmas2[c]+=v*v;
	num[c]+=1.0f;
      }
    
    for (int c=0;c<numclasses;c++)
      {
	if (num[c]>0.0)
	  {
	    means[c]=means[c]/num[c];
	    sigmas2[c] =sigmas2[c]/num[c]-means[c]*means[c];
	  }
	else
	  {
	    means[c]=0.0;
	    sigmas2[c]=1.0;
	    num[c]=0;
	  }

	if (sigmas2[c]<1.0)
	  sigmas2[c]=1.0;
      }

    std::cout << "___   E-Result: ";
    for (int c=0;c<numclasses;c++)
      {
	std::cout << std::setw(8) << means[c] << " +- " << std::setw(6) << sqrt(sigmas2[c]) << " (" << std::setw(6) << 100.0f*num[c]/nt << "%) \t";
      }
    std::cout << std::endl;

    
  }

  // -------------------------------- ------------------------------- ---------------------
  void computeMRFIncrementsAndWeights(int dim[3],float sp[3],int incr[6],float wgt[6])
  {

    if (dim[2]>1)
      {
	incr[5]=dim[0]*dim[1];   wgt[5]=1.0f/sp[2];
	incr[4]=-incr[5];        wgt[4]=1.0f/sp[2];
      }
    else
      {
	incr[5]=0;  incr[4]=0;
	wgt[5]=0.0; wgt[4]=0.0;
      }
    
    incr[3]=dim[0];          wgt[3]=1.0f/sp[1];
    incr[2]=-incr[3];        wgt[2]=1.0f/sp[1];
    incr[1]=1;               wgt[1]=1.0f/sp[0];
    incr[0]=-incr[1];        wgt[0]=1.0f/sp[0];
    
    float sum=0.0;
    for (int l=0;l<=5;l++)
      sum+=wgt[l];
    
    for (int k=0;k<=5;k++)
      wgt[k]/=sum;
    
  }

  static inline int updateVoxel(int eveni,int evenj,int evenk,int pass)
  {
    int update_voxel=0;
    if (eveni == evenj) update_voxel=1;
    if (evenk>=0)
      {
	if (evenk)   	  
	  update_voxel=1-update_voxel;
      }
    if (pass==1)
      update_voxel=1-update_voxel;
    
    return update_voxel;
  }

  // --------------------------------------------------------------------------------------------
  template<class TT> int doHardClassification(short* labels,
					      TT* intensities,
					      int current_voxel,
					      std::vector<float>& means,
					      std::vector<float>& sigmas2,
					      float noise_variance,
					      float smoothness,
					      int incr[6],float wgth[6],int mode,
					      int debug)
  {
    int bestclass=0;
    float bestprob=0.0;
    
    
    int num_classes=means.size();
    
    for (int cl=0;cl< num_classes;cl++)
      {
	float  pmrf=0.0;
	if (smoothness>0.0)
	  {
	    for (int i=0;i<=5;i++)
	      {
		if ( abs(cl-labels[current_voxel+incr[i]])>0)
		  pmrf+=wgth[i];
	      }
	  }

	float total_prob=0.0;
        float v=(float)intensities[current_voxel];
        
	if (mode==0)
	  {
	    float loglikelihood=powf(v-means[cl],2.0f)/(2.0f*sigmas2[cl]+noise_variance);
	    total_prob=loglikelihood+smoothness*pmrf;
	    if (debug)
	      {
		std::cout << " voxel=" << current_voxel << " intensity=" << v << ", try_label=" << cl << std::setw(6);
		std::cout << " prob = " << loglikelihood << "(m=" << std::setw(5) << means[cl] << "," << std::setw(4) << sigmas2[cl] << ",";
		std::cout << noise_variance << "), pmrf=" << std::setw(6) << smoothness*pmrf << " total=" << std::setw(6) << total_prob << std::endl;
	      }
	  }
	else
	  {
	    // Objectmap mode
            total_prob=pmrf*smoothness;
	    if ( fabs(cl-v)>0.0001) 
	      total_prob+=1.0;
            
            if (debug)
	      {
		std::cout << " voxel=" << current_voxel << " intensity=" << v << ", try_label=" << cl << std::setw(6);
		std::cout << ", pmrf=" << std::setw(6) << smoothness*pmrf << " total=" << std::setw(6) << total_prob << std::endl;
	      }
	  }


	if (cl==0 || total_prob<bestprob)
	  {
	    bestprob=total_prob;
	    bestclass=cl;
	  }
      }
    if (debug)
      std::cout << "\t\t bestclass=" << bestclass << "\t " << bestprob << std::endl;

    if (labels[current_voxel]!=bestclass)
      {
	labels[current_voxel]=bestclass;
	return 1;
      }
    
    return 0;
  }
  
  // ------------------------ ------------------------- --------------------
 
  template< class TT> float doMaximizationStep(bisSimpleImage<short>* label_image,
					       bisSimpleImage<TT>* intensity_image,
					       float noise_sigma2,
					       std::vector<float>& means,
					       std::vector<float>& sigmas2,
					       float mrf_convergence_percentage,
					       float smoothness,int maxiter,int mode=0)
  {

    std::cout << "___ doMaximization mode=" << mode << " (1= objectmap)" <<  std::endl;
    
    TT* intensities=intensity_image->getData();
    short* labels=label_image->getData();

    int nt=intensity_image->getLength();

    int dim[3]; intensity_image->getImageDimensions(dim);
    float spa[3]; intensity_image->getImageSpacing(spa);
    int incr[6]; float weights[6]; computeMRFIncrementsAndWeights(dim,spa,incr,weights);

    int done=0,iter=0;

    int tenth=nt/11;
    
    int mink=1,maxk=dim[2]-1;
    if (dim[2]==1)
      {
	mink=0;
	maxk=1;
      }
    
    float sumchanged=0.0;
    if (smoothness<0.001)
      maxiter=1;

    std::cout << "___   M-step Regularization (" << smoothness << ") " << std::endl;

    
    while (done==0 && iter<maxiter)
      {
	float total=0.0;
	float changed=0.0;
	
	int order=(bisUtil::getDoubleRandom()>0.5);

	std::cout << "___  \t M_iter=" << iter+1 << "( order=" << order << ")" ;
	
	int count=0;

	for (int pass=0;pass<=1;pass++)
	  {
	    int realpass=pass;
	    if (order>0)
	      realpass=1-realpass;

            //            std::cout << "\t pass=" << pass << ", realpass=" << realpass << std::endl;
	    
	    for (int k=mink;k<maxk;k++)
	      {
		int evenk= ( ( k % 2 )  == 0);
		if (maxk==1)
		  evenk=-1;
		
		for (int j=1;j<dim[1]-1;j++)
		  {
		    int evenj= ( ( j % 2 ) == 0 );
		    int vox=k*incr[5]+j*incr[3]+1;
		    for (int i=1;i<dim[0]-1;i++)
		      {
			int eveni= ( ( i % 2 ) == 0 );
			++count;
			if (count==tenth)
			  {
			    std::cout << ".";
			    count=0;
			  }
			
		      // ----------------------------
		      // Updating Voxel
		      // ----------------------------

			int debug=0;
                        // if (k==38 && j==77 && i==45)
                        //debug=1;

			if (debug)
			  std::cout << std::endl << "____ Vox=" << vox << std::endl;
			
			if ( updateVoxel(eveni,evenj,evenk,realpass)==1)
			  {
			    changed+=doHardClassification(labels,intensities,vox,
							  means,sigmas2,noise_sigma2,
							  smoothness,incr,weights,mode,debug);
			    total+=1;
			  }
			++vox;
		      }
		  }
	      }
	  }
	changed=100.0f*changed/total;
	sumchanged+=changed;
	std::cout << " changed= " << changed << "%" << std::endl;

	if (changed<mrf_convergence_percentage)
	  done=1;
	++iter;
      }

    std::cout << "___   M-step done. Changed= " << sumchanged << "%" << std::endl;
    return sumchanged;
  }


  // label_image -> in,out
  template< class TT> float doMRFSegmentation(bisSimpleImage<TT>* intensity_image,
					      bisSimpleImage<short>* label_image,
					      float smoothness,
					      float noise_sigma2,
					      float mrf_convergence_percentage,
					      int maxiter,int mrf_iter,int frame,int component)
  {

    int done=0;

    double range[2];
    label_image->getRange(range);

    int numclasses=(int)(range[1]+1);
    std::vector<float> means(numclasses);
    std::vector<float> sigmas2(numclasses);
    std::vector<float> num(numclasses);
    

    std::unique_ptr< bisSimpleImage<TT> > singleFrameInput=bisImageAlgorithms::imageExtractFrame(intensity_image,frame,component);
    /*    std::unique_ptr<bisSimpleImage<TT > > singleFrameInput(new bisSimpleImage<TT>());
          singleFrameInput->pointToSingleFrame(intensity_image,frame,component);*/

    std::cout << std::endl << "___________________________" << std::endl << "----- Beginning MRF Segmentation: ";
    std::cout << "smoothnes=" << smoothness << ", conv=" << mrf_convergence_percentage << ", noisevar=" << noise_sigma2 << std::endl << std::endl;
    
    doExpectationStep(label_image,singleFrameInput.get(),means,sigmas2,num);

    float changed=0.0;
    int iter=1;
    while (iter<=maxiter && done==0)
      {
	std::cout << std::endl << "___ M a s t e r  I t e r a t i o n :" << iter << "/" << maxiter << std::endl;
	
	changed=doMaximizationStep<TT>(label_image,
				       singleFrameInput.get(),
				       noise_sigma2,
				       means,
				       sigmas2,
				       mrf_convergence_percentage,
				       smoothness,mrf_iter);
	
	doExpectationStep(label_image,singleFrameInput.get(),means,sigmas2,num);
      
	++iter;
	if (changed<mrf_convergence_percentage)
	  done=1;
      }
    std::cout << std::endl;
    return changed;
  }


  // label_image -> in,out
  std::unique_ptr<bisSimpleImage<short> > doObjectMapRegularization(bisSimpleImage<short>* label_image,
                                                                    float smoothness,
                                                                    float mrf_convergence_percentage,
                                                                    int maxiter,int mrf_iter)
  {
    int done=0;


    std::unique_ptr<bisSimpleImage<short> > input=bisImageAlgorithms::imageExtractFrame<short>(label_image,0,0);
    std::unique_ptr<bisSimpleImage<short> > output(new bisSimpleImage<short>());
    output->copyStructure(input.get());
    
    short* idata=input->getData();
    short* odata=output->getData();
    int numvoxels=label_image->getLength();
    for (int i=0;i<numvoxels;i++)
      odata[i]=idata[i];

    double range[2];
    input->getRange(range);

    std::cout << "Input Range=" << range[0] << ":" << range[1] << std::endl;
    
    int m=int(range[1]);
    if (m<1)
      m=1;
    int numclasses=m+1;

    
    std::vector<float> means(numclasses);
    std::vector<float> sigmas2(numclasses);
    std::vector<float> num(numclasses);
    
    std::cout << std::endl << "___________________________" << std::endl << "----- Beginning Objectmap Regularization: " << numclasses << ", ";
    std::cout << "smoothnes=" << smoothness << ", conv=" << mrf_convergence_percentage << std::endl << std::endl;
    
    float changed=0.0;
    int iter=1;
    while (iter<=maxiter && done==0)
      {
	std::cout << std::endl << "___ M a s t e r  I t e r a t i o n :" << iter << "/" << maxiter << std::endl;
	
	changed=doMaximizationStep<short>(output.get(),
                                          input.get(),
                                          0.0,
                                          means,
                                          sigmas2,
                                          mrf_convergence_percentage,
                                          smoothness,mrf_iter,1);
	
	++iter;
	if (changed<mrf_convergence_percentage)
	  done=1;

        if (done==0 && iter<maxiter) {
          for (int i=0;i<numvoxels;i++)
            idata[i]=odata[i];
        }
      }
    std::cout << std::endl;
    return std::move(output);
  }




  // Close namespace
}
  
#endif
