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


#include "bisfMRIAlgorithms.h"
#include "bisEigenUtil.h"
#include <Eigen/Dense>
#include <vector>

namespace bisfMRIAlgorithms {

  bisSimpleImage<float>* computeGLM(bisSimpleImage<float>* input,bisSimpleImage<unsigned char>* mask,bisSimpleMatrix<float>* regressorMatrix,int num_tasks)
  {
    int dim[5]; input->getDimensions(dim);

    
    int nc=dim[3]*dim[4];
    int nt=dim[0]*dim[1]*dim[2];

    if (num_tasks<0 || num_tasks>nc)
      num_tasks=nc;

    int numrows=regressorMatrix->getNumRows();
    int numcols=regressorMatrix->getNumCols();
    if (numrows!=nc || numcols<num_tasks)
      {
        std::cerr << "Bad Regressor Matrix " << numrows << "*" << numcols << " Need " << nc << "rows and at least " << num_tasks << " columns" << std::endl;
        return NULL;
      }


    int usemask=0;
    unsigned char* maskdata=0;
    if (mask!=0)
      {
        int m_dim[3]; mask->getImageDimensions(m_dim);
        int sum=0;
        for (int ia=0;ia<=2;ia++)
          sum+=abs(m_dim[ia]-dim[ia]);

        if (sum>0)
          {
            std::cerr << "Bad Mask for compute GLM ... ignoring " << std::endl;
          }
        else
          {
            usemask=1;
            maskdata=mask->getImageData();
          }
      }

    bisSimpleImage<float>* output=new bisSimpleImage<float>("beta_image");
    int outdim[5] = { dim[0],dim[1],dim[2],num_tasks,1};
    float spa[5]; input->getSpacing(spa);
    output->allocate(outdim,spa);
    output->fill(0.0f);
    
    float* outdata=output->getImageData();
    Eigen::MatrixXf A=bisEigenUtil::mapToEigenMatrix(regressorMatrix);
    Eigen::MatrixXf LSQ=bisEigenUtil::createLSQMatrix(A);
    Eigen::VectorXf b=Eigen::VectorXf::Zero(numcols);
    Eigen::MatrixXf inputdata=bisEigenUtil::mapImageToEigenMatrix(input);
    
    int task_offset=numcols-num_tasks;
    int volsize=nt;
    for (int voxel=0;voxel<nt;voxel++)
      {
        int compute=0;
        if (usemask)
          {
            if (double(maskdata[voxel])>0)
              compute=1;
          }
        else
          compute=1;

        if (compute)
          {
            Eigen::VectorXf x=inputdata.col(voxel);
    	    bisEigenUtil::inPlaceMultiplyMV(LSQ,x,b);
            for (int task=0;task<num_tasks;task++)
              outdata[task*volsize+voxel]=b[task+task_offset];
          }
      }

    return output;
  }

  // ---------------------------------------------------------------------------------------
  // Legendre Polynomial
  // ---------------------------------------------------------------------------------------
  float legendre(float t,int order)
  {
    order=bisUtil::irange(order,0,6);
    
    if (order==0)
      return 1;
    
    if (order ==1) // P_1(x)=x;
      return t;
    
    if (order ==2) // P_2(x)=0.5*(3x^2-1)
      return 1.5f*t*t-0.5f;
    
    if (order ==3) // P_3(x) =0.5*(5x^3-3x)
      return 2.5f*t*t*t-1.5f*t;
    
    if (order ==4) // P_4(x) = 1/8*(35x^4-30x^2+3)
      return 0.125f*35.0f*t*t*t*t-0.125f*30.0f*t*t+0.375f;
    
    if (order ==5) // P_5(x) = 1/8*(63*x^5-70*x^3+15x)
      return 0.125f*63.0f*t*t*t*t*t-0.125f*70.0f*t*t*t+0.125f*15.0f*t;
    
    // order == 6
    return (231.0f*t*t*t*t*t*t-315.0f*t*t*t*t+105.0f*t*t-5.0f)/16.0f;
  }

  Eigen::MatrixXf createDriftRegressor(int numframes,int order) {
    
    order = bisUtil::irange(order,0,6);
    if (numframes<1)
      numframes=1;

    float shift=(numframes-1)*0.5f;
    float bot=0.5f*(numframes-1);

    Eigen::MatrixXf m=Eigen::MatrixXf(numframes,order+1);
    for (int i=0;i<numframes;i++) {
      float t=(i-shift)/bot;
      for (int j=0;j<=order;j++)
        m(i,j)=legendre(t,j);
    }
    return m;
  }

  
  

  // ---------------------------------------------------------------------------
  // Regress out "regressors"
  // ---------------------------------------------------------------------------

  int regressOut(Eigen::MatrixXf& input,Eigen::MatrixXf& regressors,Eigen::MatrixXf& LSQ,Eigen::MatrixXf& output) {

    int ok=bisEigenUtil::inPlaceMultiply3(regressors,LSQ,input,output);
    if (ok==0)
      return 0;
    int sz[2]; bisEigenUtil::getMatrixDimensions(input,sz);
    for (int row=0;row<sz[0];row++)
      for (int col=0;col<sz[1];col++)
        output(row,col)=input(row,col)-output(row,col);
    return 1;
  }

  // ---------------------------------------------------------------------------------------------------
  // Regress out "regressors" using weight vector `weights' which signifies quality of each frame (row)
  // ---------------------------------------------------------------------------------------------------
  int weightedRegressOut(Eigen::MatrixXf& input,Eigen::MatrixXf& weightedRegressors,Eigen::VectorXf& weights,Eigen::MatrixXf& LSQ,
                         Eigen::MatrixXf& wI,
                         Eigen::MatrixXf& output)
  {

    int sz_inp[2];
    bisEigenUtil::getMatrixDimensions(input,sz_inp);


    bisEigenUtil::resizeZeroMatrix(wI,sz_inp);
    
    for (int i=0;i<sz_inp[0];i++)
      {
        float w=weights(i);
        for(int j=0;j<sz_inp[1];j++) 
          wI(i,j)=w*input(i,j);
      }
    
    int ok=regressOut(wI,weightedRegressors,LSQ,output);
    if (ok==0)
      return 0;

    for (int i=0;i<sz_inp[0];i++)
      {
        float w=weights(i);
        for(int j=0;j<sz_inp[1];j++)
          if (fabs(w)>0.001)
            output(i,j)=output(i,j)/w;
      }
    
    return 1;
  }

  Eigen::MatrixXf createWeightedLSQ(Eigen::MatrixXf& regressors,Eigen::VectorXf& weights,Eigen::MatrixXf& wR)
  {
    int sz_reg[2];
    bisEigenUtil::getMatrixDimensions(regressors,sz_reg);
    bisEigenUtil::resizeZeroMatrix(wR,sz_reg);
    
    // Basically transform input data and regressors, do ordinary LSQ and scale back
    // Do regressors here and inputs in precomputed_weightedregressors
    // Multiply by weights
    for (int i=0;i<weights.rows();i++)
      {
        float w=weights(i);
        for(int j=0;j<sz_reg[1];j++) 
          wR(i,j)=w*regressors(i,j);
      }
    
    Eigen::MatrixXf LSQ=bisEigenUtil::createLSQMatrix(wR);
    return LSQ;
  }



  int butterworthFilter(Eigen::MatrixXf& input,Eigen::MatrixXf& output,Eigen::VectorXf& w,Eigen::MatrixXf& temp,
                        std::string passType,float frequency,float sampleRate,int debug)
  {

    class internal
    {
    protected:
      double b0,b1,b2,a0,a1,a2;
      double inputHistory[2];
      double outputHistory[3];
      int filter_element_count;

    public:
      internal(float frequency,std::string passType,float sampleRate,int debug) {

        this->inputHistory[0]=0.0;
        this->inputHistory[1]=0.0;
        this->outputHistory[0]=0.0;
        this->outputHistory[1]=0.0;
        this->outputHistory[2]=0.0;
	
        filter_element_count=0;
        if (passType !="high")
          passType = "low";
	
        if (sampleRate<0.0)
          sampleRate=0.6452f; // (1.0/1.55s);
	
        if (passType=="low" && frequency<0.0)
          frequency=0.02f;
        if (passType=="high" && frequency<0.0)
          frequency=0.1f;
	
        //https://stackoverflow.com/questions/20924868/calculate-coefficients-of-2nd-order-butterworth-low-pass-filter

        const double ff=frequency/sampleRate;
        
        const double ita =1.0/ tan(bisUtil::PI*ff);
        const double q=sqrt(2.0);
        this->b0 = 1.0 / (1.0 + q*ita + ita*ita);
        this->b1= 2*b0;
        this->b2= b0;
        this->a0 = 1.0;
        this->a1 = -(2.0 * (ita*ita - 1.0) * this->b0);
        this->a2 = ((1.0 - q*ita + ita*ita) * this->b0);
      

        if (passType=="high")
          {
            if (debug)
              std::cout << "___ Computing high pass" << std::endl;
            this->b0 = this->b0*ita*ita;
            this->b1 = -this->b1*ita*ita;
            this->b2 = this->b2*ita*ita; 
          }
        else if (debug) {
          std::cout << "___ Computing low pass" << std::endl;
        }

        if (debug) {
          std::cout << "___ Pass=" << passType << " freq=" << frequency << ", ff=" << ff <<  std::endl;
          std::cout << "___ B=" << this->b0 << "," << this->b1 << "," << this->b2 << std::endl;
          std::cout << "___ A=" << this->a0 << "," << this->a1 << "," << this->a2  << std::endl;
        }
      }


    protected:
      // Compute filter
      // While zero fill is good we need to think harder about this
      double update(double updated_Input) {
	
        double updated_Output=0.0;
	
        if (filter_element_count>1)
          {
            updated_Output= this->b0 * updated_Input + this->b1 * inputHistory[0] + this->b2 * inputHistory[1] -
              this->a1 * outputHistory[0] - this->a2 * outputHistory[1];
          }
        else if (filter_element_count==1)
          {
            updated_Output= this->b0 * updated_Input + this->b1 * inputHistory[0]  -this->a1 * outputHistory[0];
          }
        else if (filter_element_count==0)
          {
            updated_Output= this->b0 * updated_Input;
          }
	    
        filter_element_count=filter_element_count+1;
        inputHistory[1] = inputHistory[0];
        inputHistory[0] = updated_Input;
	
        outputHistory[2] = outputHistory[1];
        outputHistory[1] = outputHistory[0];
        outputHistory[0] = updated_Output;
        return updated_Output;
      };

      int backfill(Eigen::MatrixXf& input,Eigen::VectorXf& w,Eigen::MatrixXf& output) { 

        int sz[2]; bisEigenUtil::getMatrixDimensions(input,sz);

        int sw=w.rows();
        if (sz[0]!=sw)
          {
            std::cerr << "Bad array sizes for backfill." << std::endl;
            return 0;
          }

        bisEigenUtil::resizeZeroMatrix(output,sz);
	
        int row=0,nextgoodrow=0;
        while (row< sz[0])
          {
            for (int i=0;i<sz[1];i++)
              output(row,i)=input(row,i);
	    
            if (w(row)<0.5)
              {
                nextgoodrow=row+1;
                while (w(nextgoodrow)<0.5 && nextgoodrow < sz[0])
                  {
                    nextgoodrow++;
                  }
		
                if (nextgoodrow!=sz[0])
                  {
                    // We found a good one, now back fill
                    for (long c=0;c<sz[1];c++)
                      {
                        float v=output(nextgoodrow,c);
                        for (long r=row;r<nextgoodrow;r++) {
                          output(r,c)=v;
                        }
                      }
                  }
              }
            ++row;
          }
        return 1;
      };

    public:
      
      int filter(Eigen::MatrixXf& input,Eigen::VectorXf& w,Eigen::MatrixXf& output,Eigen::MatrixXf& temp,int debug)
      {
        int sz[2]; bisEigenUtil::getMatrixDimensions(input,sz);
        bisEigenUtil::resizeZeroMatrix(output,sz);

        int doweight=0;
        if (w.rows()>2)
          {
            if (debug)
              std::cout << "Backfilling" << std::endl;
            int ok=backfill(input,w,temp);
            if (ok==0)
              return 0;
            doweight=1;
          }

        filter_element_count=0;
	
        for (int col=0;col<output.cols();col++)
          {
            filter_element_count=0; // Reset  filter
            for (int row=0;row<output.rows();row++)
              {
                if (doweight)
                  output(row,col)=(float)update(temp(row,col));
                else
                  output(row,col)=(float)update(input(row,col));
              }
          }
        return 1;
      }
      
    };

    internal filter_obj(frequency,passType,sampleRate,debug);
    
    return filter_obj.filter(input,w,output,temp,debug);
    
  }

  // ------------------------------------------------------------------------------------------
  int butterworthFilterImage(bisSimpleImage<float>* input_image,bisSimpleImage<float>* output_image,
                             std::string passType,float frequency,float sampleRate,int removeMean,int debug) {


    std::cout << "Begin FILTER IMage TR=" << sampleRate << ", removeMean=" << removeMean << std::endl;
    
    int dim[5]; input_image->getDimensions(dim);
    Eigen::MatrixXf temp;
    Eigen::VectorXf w;

    Eigen::MatrixXf input=  Eigen::MatrixXf::Zero(dim[3],1);
    Eigen::MatrixXf output=  Eigen::MatrixXf::Zero(dim[3],1);
    int numvoxels=dim[0]*dim[1]*dim[2];
    float* indata=input_image->getImageData();
    float* outdata=output_image->getImageData();

    int ok=1;
    
    //std::cout << "Dim=" << dim[0] << "," << dim[1] << "," << dim[2] << ", frames=" << dim[3] << " nv=" << numvoxels << std::endl;
    
    for (int i=0;i<numvoxels;i++)
      {
        double mean=0.0;
        int d=debug;
        if (i>0)
          d=0;
        
        double sum=0.0;
        for (int f=0;f<dim[3];f++)  
          sum+=indata[numvoxels*f+i];
        mean=sum/double(dim[3]);
        
        if (d>0) 
          std::cout << "___ Computed  value of mean=" << mean << std::endl;

        if (!removeMean) {
          if (d>0)
            std::cout << "___ Not removing" << std::endl;
          mean=0;
        } else {
          if (d>0)
            std::cout << "___ Removing mean" << std::endl;
        }
        
        for (int f=0;f<dim[3];f++)  
          input(f,0)=indata[numvoxels*f+i]-mean;
        
        ok*=butterworthFilter(input,output,w,temp,passType,frequency,sampleRate,d);

        //        if (i==0)
        //std::cout << "Output" << std::endl;
          
        for (int f=0;f<dim[3];f++) {
          outdata[numvoxels*f+i]=output(f,0);
          /*if (i==0)
            std::cout <<  outdata[numvoxels*f+i] << std::endl;*/
        }
      }
    return ok;
  }


 
  // ------------------------------------------------------------------------------------------
  // Compute correlation matrix stuff
  // ------------------------------------------------------------------------------------------------


  int computeGlobalSignal(Eigen::MatrixXf& input,Eigen::VectorXf& weights,Eigen::VectorXf& mean)
  {
    int dm[2]; bisEigenUtil::getMatrixDimensions(input,dm);

    int sw=weights.rows();
    if (sw<=2)
      {
        weights=Eigen::VectorXf::Zero(dm[0]);
        for (int ia=0;ia<dm[0];ia++)
          weights(ia)=1.0;
      }
    else if (sw!=dm[0])
      {
        std::cerr << "Bad weight size for global Signal Regression. Mush be a vector of size " << dm[0] << std::endl;
        return 0;
      }

    bisEigenUtil::resizeZeroVector(mean,dm[0]);

    double sumv=0.0;
    for (int row=0;row<dm[0];row++) {
      float sum=0.0;
      if (weights(row)>0.5)
        for (int col=0;col<dm[1];col++) {
          sum=sum+input(row,col);
        }
      mean(row)=sum/dm[1];
      sumv+=pow(mean(row),2.0);
    }

    double magn=sqrt(sumv);
    for (int row=0;row<dm[0];row++) {
      mean(row)=(float)(mean(row)/magn);
    }
    
    return 1;
  }


  int regressGlobalSignal(Eigen::MatrixXf& input,Eigen::VectorXf& weights,Eigen::VectorXf& mean,Eigen::MatrixXf& output)
  {
    int sz[2]; bisEigenUtil::getMatrixDimensions(input,sz);
    int sw=weights.rows();
    int sm=mean.rows();

    if (sm!=sz[0])
      {
        std::cerr << "Bad mean vector size for global Signal Regression. Mush be a vector of size " << sz[0] << std::endl;
        return 0;
      }
    
    if (sw<=2)
      {
        weights=Eigen::VectorXf::Zero(sz[0]);
        for (int ia=0;ia<sz[0];ia++)
          weights(ia)=1.0;
      }
    else if (sw!=sz[0])
      {
        std::cerr << "Bad weight size for global Signal Regression. Mush be a vector of size " << sz[0] << std::endl;
        return 0;
      }

    
    
    bisEigenUtil::resizeZeroMatrix(output,sz);

    for (int col=0;col<sz[1];col++)
      {
        float sum=0.0;
        for (int row=0;row<sz[0];row++)
          {
            if (weights(row)>0.5) 
              sum=sum+input(row,col)*mean(row);
          }
        for (int row=0;row<sz[0];row++)
          {
            if (weights(row)>0.5)
              output(row,col)=input(row,col)-sum*mean(row);
          }
      }
    return 1;
  }


  /** This function computes a correlation matrix from a set of timeseries. Weights are binary either use or do not use frame (>0.01 = use)
   * @alias BisfMRIMatrixConnectivity.computeCorrelationMatrix
   * @param {Matrix} input - the input timeseries vectors (row=frames)
   * @param {boolean} toz - if true compute r->z transform and return z-values else r's (default = false)
   * @param {array} weights - the input regressors vectors (weights for each row)
   * @returns {Matrix} correlation matrix
   */
  int computeCorrelationMatrix(Eigen::MatrixXf& input,int toz,Eigen::VectorXf& weights,Eigen::MatrixXf& output)
  {
    int sz[2]; bisEigenUtil::getMatrixDimensions(input,sz);
    int sw=weights.rows();
    if (sw<=2)
      {
        weights=Eigen::VectorXf::Zero(sz[0]);
        for (int ia=0;ia<sz[0];ia++)
          weights(ia)=1.0;
      }
    else if (sw!=sz[0])
      {
        std::cerr << "Bad weight size. Must be a vector of size " << sz[1] << std::endl;
        return 0;
      }

    Eigen::MatrixXf norm=Eigen::MatrixXf::Zero(sz[0],sz[1]);
		
    // First normalize
    double sumw=0.0;

    for (int row=0;row<sz[0];row++) {
      if (weights(row)>0.0)
        weights(row)=1.0;
      else
        weights(row)=0.0;
      sumw+=weights(row);
    }
    
    
    if (sumw<0.00001)
      {
        std::cerr << "bad weights, must have a positive sum!" <<std::endl;
        return 0;
      }

    for (int row=0;row<sz[0];row++) {
      weights(row)=(float)(weights(row)/sumw);
    }

    for (int col=0;col<sz[1];col++)
      {
        double sum=0.0;
        double sum2=0.0;
	
        for (int row=0;row<sz[0];row++)
          {
            float v=input(row,col);
            sum=sum+v*weights(row);
            sum2=sum2+v*v*weights(row);
          }
        double mean=sum;
        double sigma=sqrt(sum2-mean*mean);
        if (sigma>0.0)
          {
            for (int row=0;row<sz[0];row++)
              norm(row,col)=(float)((input(row,col)-mean)/sigma);
          }
      }
  
    // Now compute matrix
    int odim[2] = { sz[1],sz[1] };
    bisEigenUtil::resizeZeroMatrix(output,odim);

    for (int outrow=0;outrow<sz[1];outrow++)
      {
        for (int outcol=outrow;outcol<sz[1];outcol++)
          {
            double sum=0.0;
            for (int row=0;row<sz[0];row++) {
              sum=sum+norm(row,outrow)*norm(row,outcol)*weights(row);
            }

	    
            if (toz)
              {
                //std::cout << " toz " << sum << " --> ";
                sum=bisUtil::rhoToZConversion(sum);
                //std::cout  << sum << std::endl;
              }
			
            output(outrow,outcol)=(float)sum;
            output(outcol,outrow)=(float)sum; // symmetric;
          }
      }
    return 1;
  }


  /** This function computes a correlation matrix from a set of timeseries. Weights are binary either use or do not use frame (>0.01 = use)
   * @alias BisfMRIMatrixConnectivity.computeSeedMapImage
   * @param {Image} input - the input timeseries vectors as image
   * @param {Matrix} seedtime series -- seed timeseries vectors as matrix (rows = frames);
   * @param {boolean} toz - if true compute r->z transform and return z-values else r's (default = false)
   * @param {array} weights - the input regressors vectors (weights for each row)
   * @returns {Matrix} seed map image
   */
  int computeSeedMapImage(bisSimpleImage<float>* input,Eigen::MatrixXf& roi,int toz,Eigen::VectorXf& weights,bisSimpleImage<float>* output)
  {

    int dim[5]; input->getDimensions(dim);
    int sz[2]; bisEigenUtil::getMatrixDimensions(roi,sz);


    if (dim[3]!=sz[0]) {
      std::cerr << "Bad roi numframes size. Image frames=" << dim[3] << " roimatrix frames=" << sz[0] << ". Not Equal!" << std::endl;
      return 0;
    }

    // ---------------------------------------------------
    // Weights stuff
    // ---------------------------------------------------
    int sw=weights.rows();
    if (sw<=2)
      {
        weights=Eigen::VectorXf::Zero(sz[0]);
        for (int ia=0;ia<sz[0];ia++)
          weights(ia)=1.0;
      }
    else if (sw!=sz[0])
      {
        std::cerr << "Bad weight size. Must be a vector of size " << sz[1] << std::endl;
        return 0;
      }

    for (int ia=0;ia<sz[0];ia++) {
      if (weights(ia)>0.0)
        weights(ia)=1.0;
      else
        weights(ia)=0.0;
    }

    double sumw=0.0;
    for (int row=0;row<sz[0];row++) {
      sumw+=weights(row);
    }
    
    std::cout << "Sumw=" << sumw << std::endl;

    if (sumw<0.00001)
      {
        std::cerr << "bad weights, must have a positive sum!" <<std::endl;
        return 0;
      }

    for (int row=0;row<sz[0];row++) 
      weights(row)=weights(row)/sumw;
    


    // ---------------------------------------------------
    // Normalize ROI Time cources
    // ---------------------------------------------------
    Eigen::MatrixXf norm=Eigen::MatrixXf::Zero(sz[0],sz[1]);

    for (int col=0;col<sz[1];col++)
      {
        double sum=0.0;
        double sum2=0.0;
	
        for (int row=0;row<sz[0];row++)
          {
            float v=roi(row,col);
            sum=sum+v*weights(row);
            sum2=sum2+v*v*weights(row);
          }
        double mean=sum;
        double sigma=sqrt(sum2-mean*mean);
        if (sigma>0.0)
          {
            for (int row=0;row<sz[0];row++)
              norm(row,col)=(float)((roi(row,col)-mean)/sigma);
          }

      }

  
    // Now compute for each pixel
    // --------------------------
    float* imagedata=input->getImageData();
    Eigen::VectorXf img_matrix=Eigen::VectorXf::Zero(sz[0]);
    int numvoxels=dim[0]*dim[1]*dim[2];
    int numframes=sz[0];

    
    int outdim[5] = { dim[0],dim[1],dim[2],sz[1],1};
    float spa[5]; input->getSpacing(spa);
    output->allocate(outdim,spa);
    output->fill(0.0f);
    float* outimagedata=output->getImageData();

    
    
    for (int voxel=0;voxel<numvoxels;voxel++) {
      double sum=0.0;
      double sum2=0.0;
      
      for (int frame=0;frame<numframes;frame++)
        {
          float v=imagedata[voxel+frame*numvoxels];
          sum=sum+v*weights(frame);
          sum2=sum2+v*v*weights(frame);
        }

      double mean=sum;
      double sigma=sqrt(sum2-mean*mean);
      if (sigma>0.0) {
        for (int frame=0;frame<numframes;frame++) {
          img_matrix(frame)=(float)((imagedata[voxel+frame*numvoxels]-mean)/sigma);
        }
      } else {
        for (int frame=0;frame<numframes;frame++) {
          img_matrix(frame)=0.0;
        }
      }
        
      for (int seed=0;seed<sz[1];seed++) {
        float sum=0.0;
        for (int frame=0;frame<numframes;frame++) {
          sum=sum+norm(frame,seed)*img_matrix(frame)*weights(frame);
        }


        if (toz)
          sum=bisUtil::rhoToZConversion(sum);
	
        outimagedata[voxel+seed*numvoxels]=(float)sum;
      }
    }
    return 1;

  }

  /** This function normalizes a time series image to have unit magnitude and zero mean
   * @alias BisfMRIMatrixConnectivity.normalizeTimeSeriesImage
   * @param {Image} input - the input timeseries  image
   * @param {Image} output - the normalized timeseries  image
   */
  int normalizeTimeSeriesImage(bisSimpleImage<float>* input,bisSimpleImage<float>* output)
  {
    output->copyStructure(input);
    int dim[5]; input->getDimensions(dim);
    int volumesize=dim[0]*dim[1]*dim[2];
    int numframes=dim[3]*dim[4];

    float* idata=input->getImageData();
    float* odata=output->getImageData();

    double scale=1.0/double(numframes);
    
    for (int voxel=0;voxel<volumesize;voxel++) {
      
      double sum=0.0;
      double sum2=0.0;
	
      for (int frame=0;frame<numframes;frame++)
        {
          int index=voxel+frame*volumesize;
          float v=idata[index];
          sum=sum+v;
          sum2=sum2+v*v;
        }
      double mean=sum*scale;
      double sigma=sqrt(sum2*scale-mean*mean);
      double scale=0.0;
      if (sigma>0.0)
        scale=1.0/sigma;
      for (int frame=0;frame<numframes;frame++)
        {
          int index=voxel+frame*volumesize;
          float v=idata[index];
          odata[index]=(v-mean)*scale;
        }

        
    }
    return 1;
  }
    
  // End of namespace
}


