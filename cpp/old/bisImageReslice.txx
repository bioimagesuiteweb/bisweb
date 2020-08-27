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

#ifndef _bis_Image_Reslice_cpp
#define _bis_Image_Reslice_cpp

#include "bisImageReslice.h"
#include <bisvtkMultiThreader.h>
#include "bisIdentityTransformation.h"
#include "bisDataTypes.h"
#include <memory>
#include <vector>
#include <stack>
#include <algorithm>

namespace bisImageAlgorithms {

  const int RESLICENUMTHREADS=4;

  template<class T> class bisResliceThreadStructure {
  public:
    bisSimpleImage<T>* input;
    bisSimpleImage<T>* output;
    bisAbstractTransformation* xform;
    int interpolation;
    double backgroundValue;
    int bounds[6];
    int threed;
    int debug;
  };
  
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

    B[1][0]*=dim0;  B[1][1]*=dim0;
    B[1][2]*=dim0;  B[1][3]*=dim0;
    B[2][0]*=slicesize; B[2][1]*=slicesize;
    B[2][2]*=slicesize; B[2][3]*=slicesize;

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

    B[1][0]*=dim0;  B[1][1]*=dim0;
    B[1][2]*=dim0;  B[1][3]*=dim0;

    double sum=0.0;
    for (int ja=0;ja<=3;ja++) 
      for (int ia=0;ia<=3;ia++) 
        sum+=W[1][ja]*W[0][ia]*data[offset+B[1][ja]+B[0][ia]];
    
    return sum;



  }


  // _-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-y

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


  template<class T> void resliceThreadFunction(bisvtkMultiThreader::vtkMultiThreader::ThreadInfo *data) {

    bisResliceThreadStructure<T>   *ds = (bisResliceThreadStructure<T> *)(data->UserData);
    int thread=data->ThreadID;
    int numthreads=data->NumberOfThreads;
    int bounds[6];
    for (int ia=0;ia<=5;ia++)
      bounds[ia]=ds->bounds[ia];

    /*if (ds->debug) {
      std::cout << "Bounds=" << ds->bounds[0] << ":" << ds->bounds[1] << ", "
                << ds->bounds[2] << ":" << ds->bounds[3] << ", "
                << ds->bounds[4] << ":" << ds->bounds[5] << std::endl;
    }*/
      
    if (!ds->threed) {
      // 2D
      int step=ds->bounds[4]/numthreads;
      bounds[2]=step*thread;
      if (thread==numthreads-1)
        bounds[3]=ds->bounds[3];
      else
        bounds[3]=bounds[2]+step-1;
      if (ds->debug)
        std::cout << "+++ Reslice Thread (2D)=" << thread+1 << "/" << numthreads << " bounds=" << bounds[2] << ":" << bounds[3] << std::endl;
      
      resliceImageWithBounds2D(ds->input,ds->output,ds->xform,bounds,ds->interpolation,ds->backgroundValue);
    } else {
      int step=ds->bounds[5]/numthreads;
      if (step<1)
        step=1;

      bounds[4]=step*thread;
      if (thread==numthreads-1)
        bounds[5]=ds->bounds[5];
      else
        bounds[5]=bounds[4]+step-1;

      if (ds->debug)
        std::cout << "+++ Reslice Thread (3D)=" << thread+1 << "/" << numthreads << " step=" << step << ", bounds=" << bounds[4] << ":" << bounds[5] << std::endl;
      resliceImageWithBounds(ds->input,ds->output,ds->xform,bounds,ds->interpolation,ds->backgroundValue);
    }
  }
  
  // ---------------------- -------------------
  // _-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-y

  template<class T> void resliceImage(bisSimpleImage<T>* input,bisSimpleImage<T>* output,bisAbstractTransformation* xform,int interpolation,double backgroundValue,int numthreads,int debug) {

    int bounds[6];
    int dim[5]; output->getDimensions(dim);
    for (int ia=0;ia<=2;ia++) {
      bounds[2*ia]=0;
      bounds[2*ia+1]=dim[ia]-1;
    }


    if (numthreads<2) {
      resliceImageWithBounds(input,output,xform,bounds,interpolation,backgroundValue);
      return;
    }

    bisResliceThreadStructure<T>* ds=new bisResliceThreadStructure<T>();
    
    int maxthreads=bounds[5];
    if (dim[2]==1) {
      ds->threed=0;
      maxthreads=bounds[3];
    } else {
      ds->threed=1;
    }

    if (numthreads>maxthreads)
      numthreads=maxthreads;

    if (debug)
      std::cout << "____ Spawning " << numthreads << " threads." << std::endl;
    
    
    ds->input=input;
    ds->output=output;
    ds->xform=xform;
    for (int ia=0;ia<=5;ia++)
      ds->bounds[ia]=bounds[ia];
    ds->interpolation=interpolation;
    ds->backgroundValue=backgroundValue;
    ds->debug=(debug>0);

    bisvtkMultiThreader::runMultiThreader((bisvtkMultiThreader::vtkThreadFunctionType)&resliceThreadFunction<T>,ds,"Reslice Image",numthreads,ds->debug);
    delete ds;
    
  }




  // namespace end
}
#endif





