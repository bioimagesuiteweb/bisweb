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

#ifndef _bis_SimpleImageSegmentation_Algorithms_cpp
#define _bis_SimpleImageSegmentation_Algorithms_cpp

#include "bisSimpleImageSegmentationAlgorithms.h"
#include <iomanip>

namespace bisSimpleImageSegmentationAlgorithms {


  /** computes binary Morphology Operation
   * @param input_image the input and output segmentation
   * @param mode (0=dilate,1=erode,2=median)
   * @param radius the kernel radius
   * @param do3d if >0 work in 3d
   * @returns the processed image
   */
  bisSimpleImage<unsigned char>* doBinaryMorphology(bisSimpleImage<unsigned char>* input,int mode,int radius,int do3d)  {

    bisSimpleImage<unsigned char >* output=new bisSimpleImage<unsigned char>();
    int dim[5]; input->getDimensions(dim);
    dim[3]=1; dim[4]=1;
    float spa[5]; input->getSpacing(spa);
    output->allocate(dim,spa);
    unsigned char* idata=input->getData();
    unsigned char* odata=output->getData();

    radius=bisUtil::irange(radius,1,5);
    do3d=bisUtil::irange(do3d,0,1);

    int slicesize=dim[0]*dim[1];

    int kradius=radius;
    if (do3d<1)
      kradius=0;

    std::cout << "Radius = " << radius << " and " << kradius << "do3d=" << do3d << " mode=" << mode << std::endl;
    
    for (int k=0;k<dim[2];k++)
      {
        int kmin=k-kradius;
        if (kmin<0)
          kmin=0;
        int kmax=k+kradius;
        if (kmax>=dim[2])
          kmax=dim[2]-1;
        
        for (int j=0;j<dim[1];j++)
          {

            int jmin=j-radius;
            if (jmin<0)
              jmin=0;
            int jmax=j+radius;
            if (jmax>=dim[1])
              jmax=dim[1]-1;
            
            for (int i=0;i<dim[0];i++)
              {
                int imin=i-radius;
                if (imin<0)
                  imin=0;
                int imax=i+radius;
                if (imax>=dim[0])
                  imax=dim[0]-1;

                int numones=0,numzeros=0;
                for (int ka=kmin;ka<=kmax;ka++)
                  for (int ja=jmin;ja<=jmax;ja++)
                    for (int ia=imin;ia<=imax;ia++)
                      {
                        int index=ka*slicesize+ja*dim[0]+ia;
                        if (idata[index]>0)
                          ++numones;
                        else
                          ++numzeros;
                      }
                int outindex=i+j*dim[0]+k*slicesize;
                if (mode==0) { // erode one zero is enough to make you zero
                  if (numzeros>0)
                    odata[outindex]=0;
                  else
                    odata[outindex]=1;
                } else if (mode==1) {
                  if (numones>0) // dilate one one is enough
                    odata[outindex]=1;
                  else
                    odata[outindex]=0;
                } else { // median, majority vote
                  if (numones>=numzeros)
                    odata[outindex]=1;
                  else
                    odata[outindex]=0;
                }
              }
          }
      }

    return output;
  }

      /** 
     * This function performs binary seed based connectivity
     * @alias BisImageAlgorithms.seedConnectivityAlgorithm
     * @param {BisImage} volume - the input image
     * @param {array} seed - the seed to connect from
     * @param {boolean} oneconnected - whether to use oneconnected (6 neighbors) or corner connected (26 neighbors) connectivity (default =fa
     * @returns {BisImage} out - the connected binary image
     */

  class seedElement {
    
  public:
    seedElement(int a,int b,int c, int d=0) {
      this->data[0]=a;
      this->data[1]=b;
      this->data[2]=c;
      this->data[3]=d;
    };
    
    int data[4];
  };
  
  bisSimpleImage<unsigned char>* seedConnectivityAlgorithm(bisSimpleImage<unsigned char>* input,int seed[3],int oneconnected)
  {
    const short VOXELVISITED=   2;
    const short UNVISITEDVOXEL= 0;

    
    int dim[5];    input->getDimensions(dim);
    dim[3]=1; dim[4]=1;
    float spa[5]; input->getSpacing(spa);

    bisSimpleImage<unsigned char >* output=new bisSimpleImage<unsigned char>();
    output->allocate(dim,spa);
    unsigned char* idata=input->getData();
    unsigned char* odata=output->getData();

    output->fill(UNVISITEDVOXEL);

    int slicesize=dim[0]*dim[1];
    int volsize=slicesize*dim[2];
    
    oneconnected = (oneconnected>0);

    std::vector<seedElement> shifts;
    int maxc=1;
    if (dim[2]==1)
      maxc=0;
    
    for (int ic=-maxc;ic<=maxc;ic++) {
      for (int ib=-1;ib<=1;ib++) {
	for (int ia=-1;ia<=1;ia++) {
	  int sh=ic*slicesize+ib*dim[0]+ia;
	  int diff=abs(ia)+abs(ib)+abs(ic);
	  if (diff==1 || (oneconnected==0 && diff!=0))
	    shifts.push_back(seedElement(ia,ib,ic,sh));
	}
      }
    }

    int maxshift=shifts.size();

    std::vector<seedElement> clusterseeds;

    int idZ=seed[2];
    int idY=seed[1];
    int idX=seed[0];

    int voxelindex=idZ*slicesize+idY*dim[0]+idX;
    unsigned char value = idata[voxelindex];
		  
    if(value > 0)
      {
        std::stack<seedElement>  currentStack;
        currentStack.push(seedElement(idX,idY,idZ,voxelindex));;
        odata[voxelindex]=1;
        while(currentStack.size()>0)
          {
            // ----------------------------------------------------------------------------------------
            // Work trhough currentStack -- starts with seed but will grow!
            
            // ----------------------------------------------------------------------------------------
            seedElement CP=currentStack.top();
            currentStack.pop();
			  
            for (int nb=0;nb<maxshift;nb++)
              {
                int i1=CP.data[0]+shifts[nb].data[0];
                int i2=CP.data[1]+shifts[nb].data[1];
                int i3=CP.data[2]+shifts[nb].data[2];
		
                if (i1>=0 && i1<dim[0] && i2>=0 && i2<dim[1] && i3>=0 && i3<dim[2])
                  {
                    int tmpindex=CP.data[3]+shifts[nb].data[3];
                    unsigned char it=idata[tmpindex];
                    unsigned char ot=odata[tmpindex];
                    
                    // If not yet visitied
                    if ( ot == UNVISITEDVOXEL)
                      {
                        if (it > 0)
                          {
                            // Mark it as part of this cluster and add to currentStack
                            //					  CurrentCluster=clusters.size();
                            odata[tmpindex]=1;
                            currentStack.push(seedElement(i1,i2,i3,tmpindex));
                          }
                        else
                          {
                            odata[tmpindex]=VOXELVISITED;
                          }
                      }
                  }
	      }
	  }
      }

    for (int i=0;i<volsize;i++)
      {
	if (odata[i]!= 1)
	  odata[i]=0;
      }

    return output;
  }

  // Close namespace
}
  
#endif
