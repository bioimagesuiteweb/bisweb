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

#ifndef _bis_Advanced_Image_Algorithms_txx
#define _bis_Advanced_Image_Algorithms_txx

#include "bisAdvancedImageAlgorithms.h"
#include "bisImageAlgorithms.h"


namespace bisAdvancedImageAlgorithms {
  
  // ---------------------------------------------------------------------------

  
  /** create and add a grid overlay on an image
   * @param input the input image
   * @param gap - the number of voxels between each grid line
   * @param value - the fractional intensity of the lines (1.0=same as max intensity of the image)
   * @returns the projected image
   */
  template<class T> bisSimpleImage<unsigned char>*  addGridToImage(bisSimpleImage<T>* input,int gap,float value) {

    double range[2];
    input->getRange(range);

    gap = bisUtil::irange(gap,4,16);
    value = bisUtil::frange(value,0.25f,4.0f);
    float scale=255.0f/(( range[1]-range[0])*(1.0+value));

    int dim[5]; input->getImageDimensions(dim);
    float spa[5]; input->getImageSpacing(spa);

    
    dim[3]=1; dim[4]=1;
    bisSimpleImage<unsigned char>* output=new bisSimpleImage<unsigned char>("grid_result");
    output->allocate(dim,spa);
    
    unsigned char* odata=output->getData();
    T* idata=input->getData();

    int index=0;
    for (int k=0;k<dim[2];k++)
      for (int j=0;j<dim[1];j++)
        for (int i=0;i<dim[0];i++)
          {
            if (k%gap == 0 || j%gap==0 || i%gap==0)
              odata[index]=255;
            else
              odata[index]=(unsigned char)((idata[index]-range[0])*scale);
            ++index;
          }
    return output;
  }


  // -----------------------------------------------------------------------------------------------
  /**
   * Utility Functions for project stuff
   */
  void processInfo(int idim[5],int& axis,int& increment,int offset[2],int outaxis[2]) {

    if (axis<0 || axis>2)
      {
        axis=0;
        int mindim=idim[0];
        for (int i=1;i<=2;i++)
          {
            if (mindim>idim[i])
              {
                axis=i;
                mindim=idim[i];
              }
          }
      }

    increment=1;
    
    if (axis==2)
      {
        increment=idim[0]*idim[1];
        outaxis[0]=0;
        outaxis[1]=1;
        offset[0]=1;
        offset[1]=idim[0];
      }
    else if (axis==1)
      {
        outaxis[0]=0;
        outaxis[1]=2;
        increment=idim[0];
        offset[0]=1;
        offset[1]=idim[0]*idim[1];
      }
    else
      {
        outaxis[0]=1;
        outaxis[1]=2;
        increment=1;
        offset[0]=idim[0];
        offset[1]=idim[0]*idim[1];
      }
  }

  // -----------------------------------------------------------------------------------------------
  // Find first
  template<class T>int find_third(T* idata,int axis,int flip,int idim[5],int v_offset,int increment,float threshold,double& intensity,int debug=0) {

    if (debug)
      std::cout << "------------" << std::endl;
    
    intensity=0.0;
    int third=-1;

    if (!flip)
      {
        int i_third=idim[axis]-1;
        while (third<0 && i_third>0)
          {
            intensity=idata[v_offset+i_third*increment];
            if (intensity>threshold)
              third=i_third;
            else
              i_third=i_third-1;
          }
      }
    else
      {
        int i_third=0;
        while (third<0 && i_third<idim[axis])
          {
            intensity=idata[v_offset+i_third*increment];
            if (intensity>threshold)
              third=i_third;
            else
              i_third=i_third+1;

            if (debug)
              std::cout << ",,,, intensity = " << intensity << " i_third=" << i_third << " third=" << third << std::endl;
            
          }
      }

    return third;
  }

  // Compute Threshold
  template<class T> void computeThresholdAndSigmas(bisSimpleImage<T>* input,float sigma,float sigmas[3],float& threshold,float gradsigma,float gradsigmas[3]) {

    double range[2]; input->getRange(range);
    
    if (threshold<range[0])
      threshold=range[0];
    if (threshold>0.9*range[1])
      threshold=0.9*range[1];

    float spa[5];   input->getSpacing(spa);
    if (sigma>5.0)
      sigma=5.0;
    
    for (int ia=0;ia<=2;ia++)
      {
        sigmas[ia]=sigma*spa[0]/spa[ia];
        gradsigmas[ia]=gradsigma*spa[0]/spa[ia];
      }
  }
  
  float compute_shading(float* grad_data,int axis,int flip,int offset,int volumesize)
  {
    //int offset=v_offset+begin_third*increment;
    float shading=1.0;
    if (grad_data!=NULL)
      {
        float g[3];
        float sum=0.0;
        for (unsigned int ia=0;ia<=2;ia++)
          {
            g[ia]=grad_data[ia*volumesize+offset];
            sum=sum+g[ia]*g[ia];
          }
        
        shading=g[axis]/sqrt(sum);
        if (flip)
          shading=-1.0*shading;
        if (shading<0.1)
          shading=0.1;
      }
    return shading;
  }
  

  template<class T> bisSimpleImage<T>*  projectImage(bisSimpleImage<T>* original_input,
                                                     int domip,int axis,int flip,int lps,
                                                     float sigma,float threshold,float gradsigma,int windowsize,int debug) {


    std::cout << ".... Project Image (no mask) thr=" << threshold << " domip=" << domip  << std::endl;
    
    // Smooth image 
    float sigmas[3],gradsigmas[3],outsigmas[3];
    computeThresholdAndSigmas<T>(original_input,sigma,sigmas,threshold,gradsigma,gradsigmas);
    std::unique_ptr<bisSimpleImage<T> > smoothed=bisImageAlgorithms::gaussianSmoothImage(original_input,sigmas,outsigmas,0,2.0);

    // ----------- Original_input should be done at this point
    
    // Get Axis
    int idim[5];   smoothed->getDimensions(idim);
    float ispa[5];  smoothed->getSpacing(ispa);

    int numframecomp=idim[3]*idim[4];
    int volumesize=idim[0]*idim[1]*idim[2];

    int offset[2],outaxis[2],increment;
    processInfo(idim,axis,increment,offset,outaxis);
    
    // Create 2D Output
    // Create the output by extracting a slice
    int odim[5]; smoothed->getDimensions(odim);
    float ospa[5];smoothed->getSpacing(ospa); // copy

    for (int ia=0;ia<=1;ia++)
      ospa[ia]=ispa[outaxis[ia]];

    // This is a 2D+t+c image so set third dimension to 1 and copy 
    bisSimpleImage<T>* output=new bisSimpleImage<T>();
    for (int ia=0;ia<=1;ia++) {
      odim[ia]=idim[outaxis[ia]];
      ospa[ia]=ispa[outaxis[ia]];
    }
    ospa[2]=1.0;
    odim[2]=1;
    output->allocate(odim,ospa);
    if (debug)
      std::cout << "Output Dimensions = " << odim[0] << "," << odim[1] << "," << odim[2] << std::endl;

    // ----------------------------
    // Get the pointers and set off
    // ----------------------------
    
    T* smoothed_data=smoothed->getImageData();
    T* output_data=output->getImageData();

    
    int beginsecond=0;
    int endsecond=odim[1];
    int incrsecond=1;
    
    if (outaxis[1]==2 && lps) {
      if (debug)
        std::cout << "IN LPS MODE" << std::endl;
      beginsecond=odim[1]-1;
      endsecond=-1;
      incrsecond=-1;
    }
    
    // ----------------------------- MIP is easy --------------------------------------
    
    if (domip)
      {
        if (debug) {
          std::cout << "In MIP " << std::endl;
          std::cout << "Original " << idim[0] << "*" << idim[1] << "," << idim[2] << ", axis=" << axis << std::endl;
          std::cout << "Beginning " << odim[0] << "*" << odim[1] << "," << idim[axis] << std::endl;
          std::cout << "  Axes = " << outaxis[0] << "," << outaxis[1] << "," << axis << std::endl;
          std::cout << "  Offsets=" << offset[0] << "," << offset[1] << ",  incr=" << increment << std::endl;
        }


        int index=0;
        
        // Do each frame separately
        for (int framecomp=0;framecomp<numframecomp;framecomp++)
          {
            int frameoffset=framecomp*volumesize;
            for (int second=beginsecond;second!=endsecond;second=second+incrsecond)
              {
                for (int first=0;first<odim[0];first++)
                  {
                    T maxv=0.0;
                    int v_offset=second*offset[1]+first*offset[0]+frameoffset;
                    for (int third=0;third<idim[axis];third++)
                      {
                        T v=smoothed_data[v_offset+third*increment];
                        if (v>maxv)
                          maxv=v;
                      }
                    output_data[index]=maxv;
                    index=index+1;
                  }
              }
          }
        return output;
      }


    // ----------------------------- Project and Project Average --------------------------------------

    std::unique_ptr<bisSimpleImage<float> > mean_smoothed(new bisSimpleImage<float>("mean_smoothed"));
    int gdim[5];   smoothed->getDimensions(gdim);
    float gspa[5]; smoothed->getSpacing(gspa);

    // ----------------------------- Compute Average Frame/Component for search and gradient ----------
    gdim[3]=1;
    gdim[4]=1;
    mean_smoothed->allocate(gdim,gspa);
    float* mean_smoothed_data=mean_smoothed->getData();
    
    int sdim[3]; mean_smoothed->getDimensions(sdim);
    if (debug) {
      std::cout << "Smooothed created "<<  sdim[0] << "," << sdim[1] << "," << sdim[2] << " volsize=" << volumesize <<  std::endl;
    }
    for (int voxel=0;voxel<volumesize;voxel++)
      {
        if (numframecomp>0)
          {
            if (voxel==0 && debug>0)
              std::cout << "Computing mean image" << std::endl;
            float sum=0.0;
            for (int framecomp=0;framecomp<numframecomp;framecomp++)
              {
                int frameoffset=framecomp*volumesize;
                sum=sum+smoothed_data[voxel+frameoffset];
              }
            mean_smoothed_data[voxel]=sum/float(numframecomp);
          }
        else
          {
            if (voxel==0 && debug>0)
              std::cout << "Copying mean image" << std::endl;

            mean_smoothed_data[voxel]=smoothed_data[voxel];
          }
      }

    // -------------------------------
    // Compute Gradient if needed
    // -------------------------------
    std::unique_ptr<bisSimpleImage<float> > grad_image(new bisSimpleImage<float>("smooth_output_float"));
    float *grad_data=NULL;
    if (gradsigma>0.1)
      {
        gdim[3]=3; gdim[4]=1;
        grad_image->allocate(gdim,gspa);
        if (debug) {
          std::cout << "Computing gradient" <<  gradsigmas[0] << "," << gradsigmas[1] << "," << gradsigmas[2] << std::endl;
          std::cout << "        dims=" << gdim[0] << "," << gdim[1] << "," << gdim[2] << ", nf=" << gdim[3] << std::endl;
        }
        bisImageAlgorithms::gradientImage<float>(mean_smoothed.get(),grad_image.get(),gradsigmas,outsigmas,0,2.0);
        grad_data=grad_image->getData();
      }
    
    int winradius=windowsize-1;
    if (winradius<0)
      winradius=0;

    if (debug) {
      std::cout << "Original " << idim[0] << "*" << idim[1] << "," << idim[2] << "," << idim[3] << "," << idim[4] << " axis=" << axis << std::endl;
      std::cout << "Beginning " << odim[0] << "*" << odim[1] << "," << idim[axis] << std::endl;
      std::cout << "  Axes = " << outaxis[0] << "," << outaxis[1] << "," << axis << std::endl;
      std::cout << "  Offsets=" << offset[0] << "," << offset[1] << ",  incr=" << increment << std::endl;
      std::cout << "  Winradius= " << winradius << std::endl;
      std::cout << "  NumFrameComp = " << numframecomp << std::endl;
    }
    int index=0;

    int outframeoffset=odim[0]*odim[1];
    
    for (int second=beginsecond;second!=endsecond;second=second+incrsecond)
      {
        for (int first=0;first<odim[0];first++)
          {
            int db=0;
            if ( (first==odim[0]/2 && second==odim[1]/2) && debug>0)
              db=1;
            int v_offset=second*offset[1]+first*offset[0];
            double intensity=0.0;
            // Again this should be the average frame;
            int begin_third=find_third<float>(mean_smoothed_data,axis,flip,idim,v_offset,increment,threshold,intensity);

            /*if (first == 45 && second == 38) { 
              std::cout << "In =(" << first << "," << second << ") = " << begin_third << std::endl;
              std::cout << "\t axis=" << axis << ", flips=" << flip << " idm=" << idim[0] << "," << idim[1] << "," << idim[2] << " offset=" << v_offset << std::endl;
              std::cout << "\t increment=" << increment << ", threshold=" << threshold << ", intensity=" << intensity << std::endl;
              }*/

            
            if (begin_third>=0)
              {
                int end_third=0;
                if (flip)
                  {
                    end_third=begin_third+winradius;
                    if (end_third>=idim[axis])
                      end_third=idim[axis];
                  }
                else
                  {
                    end_third=begin_third;
                    begin_third=begin_third-winradius;
                    if (begin_third<0)
                      begin_third=0;
                  }

                int offset=v_offset+begin_third*increment;
                float shading=compute_shading(grad_data,axis,flip,offset,volumesize);

                if (db)
                  std::cout << " First,Second,Third= " << first << "," << second << "," << begin_third << ":" << end_third << " intensity=" << intensity << std::endl;
                
                for (int framecomp=0;framecomp<numframecomp;framecomp++)
                  {
                    int frameoffset=framecomp*volumesize;
                    float sum=0.0;

                    for (int i=begin_third;i<=end_third;i++)
                      sum+=smoothed_data[v_offset+i*increment+frameoffset];
                    output_data[index+framecomp*outframeoffset]=shading*sum/float(end_third-begin_third+1);
                  }
              }
            else
              {
                for (int framecomp=0;framecomp<numframecomp;framecomp++)
                  output_data[index+framecomp*outframeoffset]=0;
              }
            index=index+1;
          }
      }
    return output;
  }


  template<class T> bisSimpleImage<T>* backProjectImage(bisSimpleImage<T>* threed_input,
                                                        bisSimpleImage<T>* twod_input,
                                                        int axis,int flipthird,int flipsecond,
                                                        float threshold,int windowsize) {

    // ----------- Original_input should be done at this point
    int idim[5];   threed_input->getDimensions(idim);
    float ispa[5];  threed_input->getSpacing(ispa);

    int offset[2],outaxis[2],increment;
    processInfo(idim,axis,increment,offset,outaxis);

    int odim[5];
    float ospa[5];

    int twodim[5]; twod_input->getDimensions(twodim);
    float twospa[5]; twod_input->getSpacing(twospa);

    for (unsigned int ia=3;ia<=4;ia++)
      {
        odim[ia]=1;
        ospa[ia]=1;
      }
    
    int same=1;
    for (unsigned int ia=0;ia<=2;ia++)
      {
        if (ia<2)
          {
            odim[ia]=idim[outaxis[ia]];
            ospa[ia]=ispa[outaxis[ia]];
            if (odim[ia]!=twodim[ia]) {
              same=0; 
              std::cout << "Odim[" << ia << "]=" << odim[ia] << " vs" << twodim[ia] << "\n";
            }  else if (fabs(ospa[ia]-twospa[ia])>0.01) {
              std::cout << "ospa[" << ia << "]=" << twospa[ia] << " vs" << twodim[ia] << "\n";
              same=0;
            }
          }
      }

    bisSimpleImage<T>* output=new bisSimpleImage<T>();
    
    if (same==0) {
      std::cerr << "\n\n\n Mismatched dimensions" << std::endl;
      return output;
    }

    // Create new output
    int outdim[5]; threed_input->getDimensions(outdim);
    float outspa[5]; threed_input->getSpacing(outspa);
    outdim[3]=twodim[3];   outdim[4]=twodim[4];
    outspa[3]=twospa[3];   outspa[4]=twospa[4];
    output->allocate(outdim,outspa);
    output->fill(0.0);

    // ----------------------------
    // Get the pointers and set off
    // ----------------------------

    T* twod_data=twod_input->getImageData();
    T* input_data=threed_input->getImageData();
    T* output_data=output->getImageData();

    int beginsecond=0;
    int endsecond=odim[1];
    int incrsecond=1;
    
    int winradius=windowsize-1;
    if (winradius<1)
      winradius=1;
    
    std::cout << "Original " << idim[0] << "*" << idim[1] << "," << idim[2] << "," << idim[3] << "," << idim[4] << " axis=" << axis << std::endl;
    std::cout << "Beginning " << odim[0] << "*" << odim[1] << "," << idim[axis] << std::endl;
    std::cout << "  Axes = " << outaxis[0] << "," << outaxis[1] << "," << axis << std::endl;
    std::cout << "  Offsets=" << offset[0] << "," << offset[1] << ",  incr=" << increment << std::endl;
    std::cout << "  Winradius= " << winradius << std::endl;

    int index=0;
    int numframecomp=outdim[3]*outdim[4];
    int threed_volumesize=outdim[0]*outdim[1]*outdim[2];
    int twod_volumesize=twodim[0]*twodim[1]*twodim[2];
    std::cout << "  NumFrameComp= " << numframecomp << " Volume=" << threed_volumesize << " Slice=" << twod_volumesize << std::endl;
    
    for (int second=beginsecond;second<endsecond;second=second+incrsecond)
      {
        for (int first=0;first<odim[0];first++)
          {
            /*            int debug=0;
            if (first==odim[0]/2 && second==odim[1]/2)
            debug=1;*/
            int v_offset=second*offset[1]+first*offset[0];
            if (flipsecond)
              v_offset=(endsecond-1-second)*offset[1]+first*offset[0];
            double intensity=0.0;
            // Again this should be the average frame;
            int begin_third=find_third<T>(input_data,axis,flipthird,idim,v_offset,increment,threshold,intensity);
            if (begin_third>=0)
              {
                int end_third=0;
                if (flipthird)
                  {
                    end_third=begin_third+winradius;
                    if (end_third>=idim[axis])
                      end_third=idim[axis];
                  }
                else
                  {
                    end_third=begin_third;
                    begin_third=begin_third-winradius;
                    if (begin_third<0)
                      begin_third=0;
                  }

                for (int framecomp=0;framecomp<numframecomp;framecomp++)
                  {
                    int threed_frameoffset=framecomp*threed_volumesize;
                    int twod_frameoffset=framecomp*twod_volumesize;

                    T value=twod_data[index+twod_frameoffset];
                    for (int i=begin_third;i<=end_third;i++)
                      output_data[threed_frameoffset+v_offset+i*increment]=value;
                  }
              }
            index=index+1;
          }
      }
    return output;
  }
  // ---------------------- -------------------

  template<class T> int projectImageWithMask(bisSimpleImage<T>* input,
                                             bisSimpleImage<T>* mask,
                                             bisSimpleImage<float>* output,
                                             int axis,int flip,int lps,
                                             float gradsigma,int windowsize) {


    std::cout << ".... Project Image with Mask" << std::endl;
    
    // Get Axis
    int idim[5];    input->getDimensions(idim);
    float ispa[5];  input->getSpacing(ispa);
    int mdim[5]; mask->getDimensions(mdim);
    int d=0;
    for (int i=0;i<=2;i++)
      d+=abs(idim[i]-mdim[i]);
    if (d>0)
      {
        std::cerr << "Bad Image Mask vs Input Dimensions " << std::endl;
        return 0;
      }


    
    
    // Smooth image 
    float gradsigmas[3];

    for (int ia=0;ia<=2;ia++)
      gradsigmas[ia]=gradsigma*ispa[0]/ispa[ia];


    // ----------- Original_input should be done at this point

    int numframecomp=idim[3]*idim[4];
    int volumesize=idim[0]*idim[1]*idim[2];

    int offset[2],outaxis[2],increment;
    processInfo(idim,axis,increment,offset,outaxis);
    

    int odim[5]; input->getDimensions(odim);
    float ospa[5];input->getSpacing(ospa); // copy

    for (int ia=0;ia<=1;ia++)
      ospa[ia]=ispa[outaxis[ia]];

    // This is a 2D+t+c image so set third dimension to 1 and copy 
    for (int ia=0;ia<=1;ia++) {
      odim[ia]=idim[outaxis[ia]];
      ospa[ia]=ispa[outaxis[ia]];
    }
    ospa[2]=1.0;
    odim[2]=1;
    output->allocate(odim,ospa);
    std::cout << "Output Dimensions = " << odim[0] << "," << odim[1] << "," << odim[2] << std::endl;

    // ----------------------------
    // Get the pointers and set off
    // ----------------------------

    T* mask_data=mask->getImageData();
    T* input_data=input->getImageData();
    float* output_data=output->getImageData();
    
    int beginsecond=0;
    int endsecond=odim[1];
    int incrsecond=1;
    
    if (outaxis[1]==2 && lps) {
      std::cout << "IN LPS MODE" << std::endl;
      beginsecond=odim[1]-1;
      endsecond=-1;
      incrsecond=-1;
    }
    

    // -------------------------------
    // Compute Gradient if needed
    // -------------------------------
    std::unique_ptr<bisSimpleImage<float> > grad_image(new bisSimpleImage<float>("smooth_output_float"));
    float *grad_data=NULL;
    if (gradsigma>0.1)
      {

        // ----------------------------- Project and Project Average --------------------------------------
        std::unique_ptr<bisSimpleImage<float> > float_mask(new bisSimpleImage<float>("mean_smoothed"));
        int gdim[5];   mask->getDimensions(gdim);
        float gspa[5]; mask->getSpacing(gspa);
        
        // ----------------------------- Compute Average Frame/Component for search and gradient ----------
        gdim[3]=1;
        gdim[4]=1;
        float_mask->allocate(gdim,gspa);
        float* float_mask_data=float_mask->getData();
        
        for (int voxel=0;voxel<volumesize;voxel++)
          float_mask_data[voxel]=mask_data[voxel];
        
        gdim[3]=3; gdim[4]=1;
        grad_image->allocate(gdim,gspa);
        std::cout << "Computing gradient" <<  gradsigmas[0] << "," << gradsigmas[1] << "," << gradsigmas[2] << std::endl;
        std::cout << "        dims=" << gdim[0] << "," << gdim[1] << "," << gdim[2] << ", nf=" << gdim[3] << std::endl;
        float outsigmas[3];
        bisImageAlgorithms::gradientImage<float>(float_mask.get(),grad_image.get(),gradsigmas,outsigmas,0,2.0);
        grad_data=grad_image->getData();
      }

    int winradius=windowsize-1;
    if (winradius<0)
      winradius=0;
        

    std::cout << "Original " << idim[0] << "*" << idim[1] << "," << idim[2] << "," << idim[3] << "," << idim[4] << " axis=" << axis << std::endl;
    std::cout << "Beginning " << odim[0] << "*" << odim[1] << "," << idim[axis] << std::endl;
    std::cout << "  Axes = " << outaxis[0] << "," << outaxis[1] << "," << axis << std::endl;
    std::cout << "  Offsets=" << offset[0] << "," << offset[1] << ",  incr=" << increment << std::endl;
    std::cout << "  Winradius= " << winradius << std::endl;
    std::cout << "  NumFrameComp = " << numframecomp << std::endl;
    int index=0;

    int outframeoffset=odim[0]*odim[1];
    
    for (int second=beginsecond;second!=endsecond;second=second+incrsecond)
      {
        for (int first=0;first<odim[0];first++)
          {
            int debug=0;
            if (first==odim[0]/2 && second==odim[1]/2)
              debug=1;
            int v_offset=second*offset[1]+first*offset[0];
            double intensity=0.0;
            // Again this should be the average frame;
            int begin_third=find_third<T>(mask_data,axis,flip,idim,v_offset,increment,0.5,intensity);
            
            if (begin_third>=0)
              {
                int end_third=0;
                if (flip)
                  {
                    end_third=begin_third+winradius;
                    if (end_third>=idim[axis])
                      end_third=idim[axis];
                  }
                else
                  {
                    end_third=begin_third;
                    begin_third=begin_third-winradius;
                    if (begin_third<0)
                      begin_third=0;
                  }
                
                int offset=v_offset+begin_third*increment;
                float shading=compute_shading(grad_data,axis,flip,offset,volumesize);

                if (debug)
                  std::cout << " First,Second,Third= " << first << "," << second << "," << begin_third << ":" << end_third << " intensity=" << intensity << std::endl;
                
                for (int framecomp=0;framecomp<numframecomp;framecomp++)
                  {
                    int frameoffset=framecomp*volumesize;
                    float sum=0.0;

                    for (int i=begin_third;i<=end_third;i++)
                      sum+=input_data[v_offset+i*increment+frameoffset];
                    output_data[index+framecomp*outframeoffset]=shading*sum/float(end_third-begin_third+1);
                  }
              }
            else
              {
                for (int framecomp=0;framecomp<numframecomp;framecomp++)
                  output_data[index+framecomp*outframeoffset]=0;
              }
            index=index+1;
          }
      }
    return 1;
  }


  
    /** compute  unshaded average projection of 3D image to a 2d image by averaging inside a mask
   * @param input - the input image
   * @param mask - the mask image
   * @param output - the output image
   * @param axis - the axis to integrate/project along
   * @returns the projected image
   */
  template<class T> int projectAverageImageWithMask(bisSimpleImage<T>* input,
                                                    bisSimpleImage<T>* mask,
                                                    bisSimpleImage<float>* output,
                                                    int axis,int lps) {
    
    std::cout << ".... ProjectAverage Image with Mask" << std::endl;
    
    // Get Axis
    int idim[5];    input->getDimensions(idim);
    float ispa[5];  input->getSpacing(ispa);
    int mdim[5]; mask->getDimensions(mdim);
    int d=0;
    for (int i=0;i<=2;i++)
      d+=abs(idim[i]-mdim[i]);
    if (d>0)
      {
        std::cerr << "Bad Image Mask vs Input Dimensions " << std::endl;
        return 0;
      }


    
    // ----------- Original_input should be done at this point

    int numframecomp=idim[3]*idim[4];
    int volumesize=idim[0]*idim[1]*idim[2];

    int offset[2],outaxis[2],increment;
    processInfo(idim,axis,increment,offset,outaxis);
    

    int odim[5]; input->getDimensions(odim);
    float ospa[5];input->getSpacing(ospa); // copy

    for (int ia=0;ia<=1;ia++)
      ospa[ia]=ispa[outaxis[ia]];

    // This is a 2D+t+c image so set third dimension to 1 and copy 
    for (int ia=0;ia<=1;ia++) {
      odim[ia]=idim[outaxis[ia]];
      ospa[ia]=ispa[outaxis[ia]];
    }
    ospa[2]=1.0;
    odim[2]=1;
    output->allocate(odim,ospa);
    std::cout << "Output Dimensions = " << odim[0] << "," << odim[1] << "," << odim[2] << " " << odim[3] << " " << odim[4] << std::endl;

    // ----------------------------
    // Get the pointers and set off
    // ----------------------------

    T* mask_data=mask->getImageData();
    T* input_data=input->getImageData();
    float* output_data=output->getImageData();
    
    int beginsecond=0;
    int endsecond=odim[1];
    int incrsecond=1;
    
    if (outaxis[1]==2 && lps) {
      std::cout << "IN LPS MODE" << std::endl;
      beginsecond=odim[1]-1;
      endsecond=-1;
      incrsecond=-1;
    }
    

    int outvolumesize=odim[0]*odim[1];
    
    std::cout << "Original " << idim[0] << "*" << idim[1] << "," << idim[2] << "," << idim[3] << "," << idim[4] << " axis=" << axis << std::endl;
    std::cout << "Beginning " << odim[0] << "*" << odim[1] << "," << idim[axis] << std::endl;
    std::cout << "  Axes = " << outaxis[0] << "," << outaxis[1] << "," << axis << std::endl;
    std::cout << "  Offsets=" << offset[0] << "," << offset[1] << ",  incr=" << increment << std::endl;
    std::cout << "  Ourframe = " << numframecomp << std::endl;
    std::cout << "  NumFrameComp = " << numframecomp << std::endl;

    int index=0;

    

    
    for (int second=beginsecond;second!=endsecond;second=second+incrsecond)
      {
        for (int first=0;first<odim[0];first++)
          {
            int debug=0;
            if (first==odim[0]/2 && second==odim[1]/2)
              debug=1;
            int v_offset=second*offset[1]+first*offset[0];
            
            for (int framecomp=0;framecomp<numframecomp;framecomp++) {
              double sum=0.0;
              int nsum=0;
              for (int third=0;third<idim[axis];third++)
                {

                  int mindex=v_offset+third*increment;
                  int vindex=mindex+framecomp*volumesize;
                  if (mask_data[mindex]>0) {
                    nsum+=1;
                    sum+=input_data[vindex];
                  }
                }

              int outindex=index+framecomp*outvolumesize;
              
              if (nsum>0)
                output_data[outindex]=sum/float(nsum);
              else
                output_data[outindex]=0.0f;
            }
            index=index+1;
          }
      }
    return 1;
  }



  int computeBackProjectAndProjectPointPairs(bisSimpleImage<float>* threed_reference,
                                             bisAbstractTransformation* transformation,
                                             bisAbstractTransformation* second_transformation,
                                             bisSimpleMatrix<float>* point_pairs,
                                             int axis,int flipthird,int flipsecond,
                                             float threshold,int depth,int height2d,float spacing2d,int debug) {


    if (debug)
      std::cout << "Axis=" << axis << " depth=" << depth << " height2d=" << height2d << ", spacing2d=" << spacing2d << std::endl;
    
    // ----------- Original_input should be done at this point
    int idim[5];   threed_reference->getDimensions(idim);
    float ispa[5];  threed_reference->getSpacing(ispa);
    
    int offset[2],outaxis[2],increment;
    processInfo(idim,axis,increment,offset,outaxis);
    int odim[2];

    for (unsigned int ia=0;ia<=1;ia++) 
      odim[ia]=idim[outaxis[ia]];

    
    // ----------------------------
    // Get the pointers and set off
    // ----------------------------

    float* input_data=threed_reference->getImageData();
    int endsecond=odim[1];

    if (debug) {
      std::cout << "Original " << idim[0] << "*" << idim[1] << "," << idim[2] << "," << idim[3] << "," << idim[4] << " axis=" << axis << std::endl;
      std::cout << "  Axes = " << outaxis[0] << "," << outaxis[1] << "," << axis << std::endl;
      std::cout << "  Offsets=" << offset[0] << "," << offset[1] << ",  incr=" << increment << "flipsecond=" << flipsecond << std::endl;
    }

    std::vector<float> newset; // 1-d vector 6 components (x,y,z) of point plus 

    float ysize=(height2d-1)*spacing2d;
    //float ysize=(odim[1]-1)*ispa[outaxis[1]];
    
    for (int second=0;second<odim[1];second++)
      {
        for (int first=0;first<odim[0];first++)
          {
            
            // For each pixel in the image
            int v_offset=second*offset[1]+first*offset[0];
            if (flipsecond)
              v_offset=(endsecond-1-second)*offset[1]+first*offset[0];
            // Again this should be the average frame;
            double intensity=0.0;

            int db=0;
            if ( ( first==24 && second==17 ) && debug>0)
              db=1; 
            
            int third=find_third<float>(input_data,axis,flipthird,idim,v_offset,increment,threshold,intensity,db)+depth;

            if (db>0) {
              std::cout << std::endl;
              if (first==0 && second==0)  {
                std::cout << "\n\n flipthird=" << flipthird << " idim=" << idim[0] << "," << idim[1] << "," << idim[2] << "  v_offset=" << v_offset << " incr=" << increment << " thr=" << threshold << " int=" << intensity << std::endl;
                std::cout << "outaxis=" << outaxis[0] << "," << outaxis[1] << "," << axis << " --> ispa " << ispa[0] << "," << ispa[1] << "," << ispa[2] << std::endl;
                std::cout << "Odim=" << odim[1]-1 << std::endl;
              }
            }
            
            if (third>=0)
              {
                // new coordinates in pixels         (first,second,third)
                float x[3],y[3],X[2],Y[3],final[3];
                if (db) {

                  std::cout << ".... first=" << first << ", second=" << second << " -->" << third << std::endl;

                }
                // Scale to mm
                int fixed_second=second;
                if (flipsecond)
                  fixed_second=(odim[1]-1)-second;
                x[outaxis[0]]=first*ispa[outaxis[0]];
                x[outaxis[1]]=fixed_second*ispa[outaxis[1]];
                x[axis]=third*ispa[axis];

                if (db) {
                  std::cout << "\tijk = [ " << x[0]/ispa[0] << "," << x[1]/ispa[1] << "," << x[2] /ispa[2] << "]" << std::endl;
                  std::cout << "\tx=[ " << x[0] << "," << x[1] << "," << x[2] << "]";
                }
                
                // transform
                transformation->transformPoint(x,y);

                if(db)
                  std::cout << " --> y=(" << y[0] << "," << y[1] << "," << y[2] << ") " << std::endl;
                // back to pixels
                Y[0]=y[outaxis[0]];
                Y[1]=ysize-y[outaxis[1]];
                Y[2]=0.0;
                second_transformation->transformPoint(Y,final);
                

                X[0]=first;
                X[1]=second;

                if (db>0) {
                  std::cout << "\t\t X=[" << X[0] << "," << X[1] << "] --> ";
                  std::cout << "\t\t Y=[" <<  Y[0] << "," << Y[1] << "]" << std::endl;
                  std::cout << "\t\t final=" << final[0] << "," << final[1] << "] ysize=" << ysize << std::endl;
                }


                
                
                newset.push_back(X[0]);
                newset.push_back(X[1]);
                newset.push_back(final[0]);
                newset.push_back(final[1]);
              }
          }
      }

    int l=newset.size();
    point_pairs->zero(l,4);
    float *odata=point_pairs->getData();
    for (int i=0;i<l;i++)
      odata[i]=newset[i];
    
    return l;
  }


  std::unique_ptr<bisSimpleImage<float> > projectMapImage(bisSimpleImage<float>* threed_reference,
                                                          bisSimpleImage<float>* optical_input,
                                                          bisSimpleMatrix<float>* point_pairs,
                                                          int debug) {


    std::unique_ptr<bisSimpleImage<float> > output(new bisSimpleImage<float>("resliced"));

    int dim_x[5];    threed_reference->getDimensions(dim_x);
    float spa_x[5];  threed_reference->getSpacing(spa_x);
    
    int dim_y[5];  optical_input->getDimensions(dim_y);
    float spa_y[5];  optical_input->getSpacing(spa_y);

    // Map spacing and dimensions over
    dim_x[3]=dim_y[3];
    dim_x[4]=dim_y[4];
    spa_x[2]=1.0;
    spa_x[3]=spa_y[3];
    spa_x[4]=spa_y[3];
    

    int numframes=dim_x[3]*dim_x[4];
    int volumesize_x=dim_x[0]*dim_x[1]*dim_x[2];
    int volumesize_y=dim_y[0]*dim_y[1]*dim_y[2];
    
    output->allocate(dim_x,spa_x);
    output->fill(0.0f);

    float* data_x=output->getData();
    float* data_y=optical_input->getData();
    float* coords_ptr=point_pairs->getData();

    int numrows=point_pairs->getNumRows();

    int index=0;
    for (int row=0;row<numrows;row++) {

      int xi[2],yi[2]; float Y[2];
      xi[0]=int(0.5+coords_ptr[index]); index++;
      xi[1]=int(0.5+coords_ptr[index]); index++;
      Y[0]=coords_ptr[index];           index++;
      Y[1]=coords_ptr[index];           index++;

      int db=0;
      if (debug) {
        if ( (xi[0]==24 && xi[1]==17))
          db=1;
      }

      if (db)
        std::cout << "row = " << row << ", [ " << xi[0] << "," << xi[1] << "]" << std::endl;

      int good=1;
      for (int ia=0;ia<=1;ia++) {
        yi[ia]=int(Y[ia]/spa_y[ia]+0.5);

        if (yi[ia]<0 || yi[ia]>=dim_y[ia])
          good=0;
      }

      if (db)
        std::cout << " xi=" << xi[0] << "," << xi[1] << "--> Out= [ " << yi[0] << "," << yi[1] << "] good=" << good << std::endl;
      
      
      if (good) {
        int voxelindex_x=xi[0]+dim_x[0]*(xi[1]);
        int voxelindex_y=yi[0]+dim_y[0]*yi[1];

        for (int frame=0;frame<numframes;frame++) {
          data_x[voxelindex_x+volumesize_x*frame]=data_y[voxelindex_y+frame*volumesize_y];
        }
      }
    }

    return std::move(output);
  }

}
      
                                

    
    



#endif

