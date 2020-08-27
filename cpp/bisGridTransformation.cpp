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

#include "bisGridTransformation.h"
#include "bisMemoryManagement.h"
#include "math.h"
#include <iostream>
#include <sstream>

bisGridTransformation::bisGridTransformation(std::string n) : bisAbstractTransformation(n) {

  this->grid_dimensions[0]=0;
  this->grid_dimensions[1]=0;
  this->grid_dimensions[2]=0;
  this->grid_spacing[0]=0.0;
  this->grid_spacing[1]=0.0;
  this->grid_spacing[2]=0.0;

  
  this->dobspline_interpolation=1;
  this->magic_type=bisDataTypes::s_gridtransform;
  this->grid_vol_size=0;
  this->class_name="bisGridTransformation";
}


void bisGridTransformation::initializeGrid(int dim[3],float spa[3],float origin[3],int dobspline)
{
  for (int ia=0;ia<=2;ia++)
    {
      this->grid_dimensions[ia]=dim[ia];
      this->grid_spacing[ia]=spa[ia];
      this->grid_origin[ia]=origin[ia];
    }

  int volsize=dim[0]*dim[1]*dim[2]*3;

  std::unique_ptr<bisSimpleVector<float> > tmp(new bisSimpleVector<float>(this->name+":grid"));
  this->displacementField=std::move(tmp);
  this->displacementField->zero(volsize);
  
  for (int ia=0;ia<=2;ia++) {
    this->minusdim[ia]=this->grid_dimensions[ia]-1;
    this->grid_origin[ia]=origin[ia];
  }
  this->grid_slice_size=this->grid_dimensions[0]*this->grid_dimensions[1];
  this->grid_vol_size=this->grid_slice_size*this->grid_dimensions[2];

  this->dobspline_interpolation=(dobspline>0);

  /* std::cout << "Grid Initialized dim= " << this->grid_dimensions[0] << "," << this->grid_dimensions[1] << "," << this->grid_dimensions[2] << std::endl;
  std::cout << "Grid Initialized spa=" << this->grid_spacing[0] << "," << this->grid_spacing[1] << "," << this->grid_spacing[2] << std::endl;
  std::cout << "Grid Initialized ori=" << this->grid_origin[0] << "," << this->grid_origin[1] << "," << this->grid_origin[2] << std::endl;*/
}

int bisGridTransformation::getBSplineMode()
{
  return this->dobspline_interpolation;
}

void bisGridTransformation::identity()
{
  if (this->grid_vol_size==0)
    return;
  this->displacementField->fill(0.0);
}

unsigned int bisGridTransformation::getNumberOfDOF()
{
  return this->getNumberOfControlPoints()*3;
}

unsigned int bisGridTransformation::getNumberOfControlPoints()
{
  return (unsigned int)this->grid_dimensions[0]*this->grid_dimensions[1]*this->grid_dimensions[2];
}

void bisGridTransformation::transformPointLinearInterpolation(float X[3],float TX[3])
{
  int maxcoord=2;
  if (this->grid_dimensions[2]<2)
    maxcoord=1;

  
  double W[3][2];
  int   B[3][2];

  for (int ia=0;ia<=maxcoord;ia++)
    {
      float p= (X[ia]-this->grid_origin[ia])/this->grid_spacing[ia];
      B[ia][0]=int(p);
      B[ia][1]=B[ia][0]+1;
      if (B[ia][1]>minusdim[ia])
        B[ia][1]=minusdim[ia];
      W[ia][0]=B[ia][1]-TX[ia];
      W[ia][1]=1.0-W[ia][0];
    }
  
  B[1][0]*=this->grid_dimensions[0];
  B[1][1]*=this->grid_dimensions[0];

  B[2][0]=B[2][0]*this->grid_slice_size;
  B[2][1]=B[2][1]*this->grid_slice_size;
  
  float* data=this->displacementField->getData();
  if (maxcoord==2) {
    for (int coord=0;coord<=2;coord++)
      {
        double sum=X[coord];
        for (int i=0;i<=1;i++)
          for (int j=0;j<=1;j++)
            for (int k=0;k<=1;k++)
              {
                sum+=W[2][k]*W[1][j]*W[0][i]*data[ B[2][k]+B[1][j]+B[0][i]];
              }
        TX[coord]=(float)sum;
        for (int ia=0;ia<=1;ia++)
          B[2][ia]+=this->grid_vol_size;
      }
  } else {
    for (int coord=0;coord<=1;coord++)
      {
        double sum=X[coord];
        for (int i=0;i<=1;i++)
          for (int j=0;j<=1;j++) {
            sum+=W[1][j]*W[0][i]*data[ B[1][j]+B[0][i]];
          }
        TX[coord]=(float)sum;
        for (int ia=0;ia<=1;ia++)
          B[2][ia]+=this->grid_vol_size;
      }
    TX[2]=X[2];
 
  }
}
  


void bisGridTransformation::transformPointBSplineInterpolation(float X[3],float TX[3])
{

  int maxcoord=2;
  if (this->grid_dimensions[2]<2)
    maxcoord=1;

  int B[3][4];
  double W[3][4];
  
  for (int ia=0;ia<=maxcoord;ia++)
    {
      float p= (X[ia]-this->grid_origin[ia])/this->grid_spacing[ia];

      B[ia][1]=int(p);
      float t=p-B[ia][1];

      B[ia][0]=B[ia][1]-1;
      B[ia][2]=B[ia][1]+1;
      B[ia][3]=B[ia][1]+2;
      
      for (int ib=0;ib<=3;ib++)
        B[ia][ib]=bisUtil::irange(B[ia][ib],0,this->minusdim[ia]);
      
      W[ia][0]=pow(1.0-t,3.0)/6.0;
      W[ia][1]=(3.0*t*t*t - 6.0*t*t + 4.0)/6.0;
      W[ia][2]=(-3.0*t*t*t + 3.0*t*t + 3.0*t + 1.0)/6.0;
      W[ia][3]=(t*t*t)/6.0;

    }

  
  for (int ia=0;ia<=3;ia++)
    {
      B[1][ia]=B[1][ia]*this->grid_dimensions[0];
      B[2][ia]=B[2][ia]*this->grid_slice_size;
    }

  float* data=this->displacementField->getData();

  if (maxcoord==2) {
    for (int coord=0;coord<=2;coord++)
      {
        double sum=X[coord];
        for (int ka=0;ka<=3;ka++) {
          for (int ja=0;ja<=3;ja++)  {
            for (int ia=0;ia<=3;ia++) {
              sum+=W[2][ka]*W[1][ja]*W[0][ia]*data[B[2][ka]+B[1][ja]+B[0][ia]];
            }
          }
        }
        TX[coord]=(float)sum;
        for (int ia=0;ia<=3;ia++)
          B[2][ia]+=this->grid_vol_size;
      }
  } else {
     for (int coord=0;coord<=1;coord++)
       {
         double sum=X[coord];
         for (int ja=0;ja<=3;ja++)  {
           for (int ia=0;ia<=3;ia++) {
             sum+=W[1][ja]*W[0][ia]*data[B[1][ja]+B[0][ia]];
           }
         }
         TX[coord]=(float)sum;
         for (int ia=0;ia<=3;ia++)
           B[2][ia]+=this->grid_vol_size;
       }
     TX[2]=X[2];
  }
}


void bisGridTransformation::transformPoint(float x[3],float y[3])
{
  if (this->grid_vol_size>0)
    {
  
      if (this->dobspline_interpolation)
        {
          this->transformPointBSplineInterpolation(x,y);
        }
      else
        {
          this->transformPointLinearInterpolation(x,y);
        }
      return;
    }

  y[0]=x[0];
  y[1]=x[1];
  y[2]=x[2];
  
}


int bisGridTransformation::setParameterVector(std::vector<float>& params)
{
  if (this->getNumberOfDOF()==0)
    return 0;
  
  if (params.size()!=this->getNumberOfDOF()) {
    std::cerr << "Can not set parameters in grid transform";
    return 0;
  }
  float* dispfield=this->displacementField->getData();
  for (unsigned int i=0;i<params.size();i++)
    dispfield[i]=params[i];
  return 1;
}

int bisGridTransformation::getParameterVector(std::vector<float>& params)
{
  if (params.size()!=this->getNumberOfDOF()) {
    std::cerr << "Can not get parameters in grid transform";
    return 0;
  }
  float* dispfield=this->displacementField->getData();
  for (unsigned int i=0;i<params.size();i++)
    params[i]=dispfield[i];
  return 1;
}

float bisGridTransformation::computeGradientForOptimization(std::vector<float>& params,
                                                            std::vector<float>& grad,
                                                            float stepsize,
                                                            int imgdim[3],
                                                            float imgspa[3],
                                                            float windowsize,
                                                            bisGridTransformationOptimizable* optimizable) {
  
  float radius[3]= { windowsize*this->grid_spacing[0],
                     windowsize*this->grid_spacing[1],
                     windowsize*this->grid_spacing[2] };
  
  int bounds[6]={0,0,0,0,0,0};

  int imgmindim[3] = { imgdim[0]-1,imgdim[1]-1,imgdim[2]-1 };

  if (params.size()!=this->getNumberOfDOF() || grad.size()!=params.size()) {
    std::cerr << "Bad dimensions for computing grdient optimization in grid transform";
    return 0;
  }
  
  this->setParameterVector(params);
  
  int nc=this->getNumberOfControlPoints();
  float GradientNorm = 0.000001f;
  float* dispfield=this->displacementField->getData();

  //  int debug_index=-(4*64+4*8+3);
  int cp_index=0;
  for (int k=0;k<this->grid_dimensions[2];k++) 
    {
      float pos_z=k*this->grid_spacing[2]+grid_origin[2];
      bounds[4]= bisUtil::irange( int((pos_z-radius[2])/imgspa[2]+0.5),0,imgmindim[2]);
      bounds[5]= bisUtil::irange( int((pos_z+radius[2])/imgspa[2]+0.5),0,imgmindim[2]);
      for (int j=0;j<this->grid_dimensions[1];j++)
        {
          float pos_y=j*this->grid_spacing[1]+grid_origin[1];
          bounds[2]= bisUtil::irange( int((pos_y-radius[1])/imgspa[1]+0.5),0,imgmindim[1]);
          bounds[3]= bisUtil::irange( int((pos_y+radius[1])/imgspa[1]+0.5),0,imgmindim[1]);
          for (int i=0;i<this->grid_dimensions[0];i++)
            {
              float pos_x=i*this->grid_spacing[0]+grid_origin[0];
              bounds[0]= bisUtil::irange( int((pos_x-radius[0])/imgspa[0]+0.5),0,imgmindim[0]);
              bounds[1]= bisUtil::irange( int((pos_x+radius[0])/imgspa[0]+0.5),0,imgmindim[0]);
         
              //float X[3] = { pos_x,pos_y,pos_z }, TX[3];
          
              /*          if (cp_index==debug_index)
                          {
                          std::cout << "cp_index=" << cp_index << " (pos=" << i << "," << j << "," << k << ") X=" << X[0] << "," << X[1] << "," << X[2]  << std::endl;
                          std::cout << "bounds=" << bounds[0] << ":" << bounds[1] << ", " << bounds[2] << ":" << bounds[3] << ", " << bounds[4] << ":" << bounds[5] << std::endl;
                          int fb[6];
                          for (int ia=0;ia<=2;ia++)
                          {
                          fb[2*ia]=bounds[2*ia]*imgspa[ia];
                          fb[2*ia+1]=bounds[2*ia+1]*imgspa[ia];
                          }
                          std::cout << "fb=" << fb[0] << ":" << fb[1] << ", " << fb[2] << ":" << fb[3] << ", " << fb[4] << ":" << fb[5] << std::endl;
                          }*/
        

              for (int coord=0;coord<=2;coord++)
                {

          
                  int index=cp_index+coord*nc;
                  dispfield[index]=params[index]+stepsize;
                  /*          if (cp_index==debug_index)
                              {
                              this->transformPoint(X,TX);
                              std::cout << "disp=" << dispfield[index] << "(" << TX[0] << "," << TX[1] << "," << TX[2] << ") ";
                              }*/
                  float a=optimizable->computeValueFunctionPiece(this,bounds,cp_index);
                  dispfield[index]=params[index]-stepsize;
                  /*          if (cp_index==debug_index)
                              {
                              this->transformPoint(X,TX);
                              std::cout << "disp=" << dispfield[index] << "(" << TX[0] << "," << TX[1] << "," << TX[2] << ") ";
                              }*/
                  float b=optimizable->computeValueFunctionPiece(this,bounds,cp_index);
                  dispfield[index]=params[index];

                  /*          if (cp_index==debug_index)
                              {
                              this->transformPoint(X,TX);
                              std::cout << "disp=" << dispfield[index] << "(" << TX[0] << "," << TX[1] << "," << TX[2] << ") ";
                              }*/

                  float g=-0.5f*(b-a)/stepsize;
                  grad[index]=g;

                  /*          if (cp_index==debug_index)
                              std::cout << "index=" << index << " (a=" << a << ", b=" << b << " g=" << g << " --> grad[index]=" << grad[index] << std::endl;*/
          
                  GradientNorm+=g*g;
                }
              cp_index++;
            }
        }
    }

  
  GradientNorm = float( sqrt(GradientNorm));
  for (unsigned int i=0;i<grad.size(); i++)
    grad[i]=grad[i]/GradientNorm;
  return GradientNorm;
}


float bisGridTransformation::getBendingEnergyAtControlPoint(int cpoint,float scale)
{
  if (scale<0.01)
    scale=0.01f*(1.0f/(float(this->getNumberOfControlPoints())));

  int k=0;
  int maxcomponent=2;
  if (this->grid_dimensions[2]<2) {
    maxcomponent=1;
  } else {
    k=int(cpoint/this->grid_slice_size);
  }
  
  int tmp=cpoint-k*this->grid_slice_size;
  int j=int(tmp/this->grid_dimensions[0]);
  int i=tmp-j*this->grid_dimensions[0];

  float* U=this->displacementField->getData();
  double sum=0.0;

  int ip=bisUtil::irange(i+1,0,this->grid_dimensions[0]-1);
  int jp=bisUtil::irange(j+1,0,this->grid_dimensions[1]-1);
  int im=bisUtil::irange(i-1,0,this->grid_dimensions[0]-1);
  int jm=bisUtil::irange(j-1,0,this->grid_dimensions[1]-1);
  // Compute offsets now for j and k
  j*=this->grid_dimensions[0];
  jp*=this->grid_dimensions[0];
  jm*=this->grid_dimensions[0];

  int kp=0,km=0;

  if (maxcomponent>1) {
    kp=bisUtil::irange(k+1,0,this->grid_dimensions[2]-1);
    km=bisUtil::irange(k-1,0,this->grid_dimensions[2]-1);
    kp*=this->grid_slice_size;
    km*=this->grid_slice_size;
    k*=this->grid_slice_size;
  }

  
  // component is component of displacement i.e. u,v,w 
  for (int component=0;component<=maxcomponent;component++)
    {
      // Bending energy is d^2u/dx^2+d*2u/dy^2+d^2u/dz^2+2*(d^2u/dxdy+d^u/dxdz+d^2u/dydz)
      //
      // http://www.iue.tuwien.ac.at/phd/heinzl/node27.html
      // Regular second partial u(i+1)-2*u(i)+u(i-1)
      // Mixed parial           (u(i+1,j+1)+u(i-i,j-1)-u(i+1,j-1)-u(i-1,j+1))/4

      // d^2/dx^2
      sum+= pow((U[ip+j+k]-2.0*U[i+j+k]+U[im+j+k]),2.0f);

      // d^2u/dy^2
      sum+= pow((U[i+jp+k]-2.0*U[i+j+k]+U[i+jm+k]),2.0f);

      // 2.0*d^2u/dxdy
      sum+= 2.0*pow((U[ip+jp+k]+U[im+jm+k]-U[ip+jm+k]-U[im+jp+k])/4.0,2.0f);


      if (maxcomponent>1)  {
        // d^2u/dz^2
        sum+= pow((U[i+j+kp]-2.0*U[i+j+k]+U[i+j+km]),2.0f);
        // 2.0*d^2u/dxdz
        sum+= 2.0*pow((U[ip+j+kp]+U[im+j+km]-U[ip+j+km]-U[im+j+kp])/4.0,2.0f);
        // 2.0*d^2u/dydz
        sum+= 2.0*pow((U[i+jp+kp]+U[i+jm+km]-U[i+jp+km]-U[i+jm+kp])/4.0,2.0f);
      }
      
      // Add shift to next frame
      U+=this->grid_vol_size;
    }
  
  return (float)((sum)*scale);

}                   

float bisGridTransformation::getTotalBendingEnergy()
{

  int n=this->getNumberOfControlPoints();
  float sum=0.0;
  for (int i=0;i<n;i++)
    sum+=this->getBendingEnergyAtControlPoint(i,1.0f);

  float scale=0.01f*(1.0f/(float(this->getNumberOfControlPoints())));
  return sum*scale;
}


// ----------------------------------------------------
// Serialization/Serialization
// ----------------------------------------------------

    
long bisGridTransformation::getRawSize()
{
  // Header
  // 8 bytes raw
  // actual header
  // 3x4 -- interp mode (int[1] 4), dimensions, int[3]x4 spacing float[3]x4 origin float[3]x4  = 40
  // raw bytes = num control points *3 * 4
  long databytes=4*3*this->grid_dimensions[0]*this->grid_dimensions[1]*this->grid_dimensions[2];
  int headerbytes=16+40;
  return  databytes+headerbytes;
}

void bisGridTransformation::serializeInPlace(unsigned char* pointer)
{
  int* begin_int=(int*)pointer;
  begin_int[0]=this->magic_type;
  begin_int[1]=bisDataTypes::b_float32;
  begin_int[2]=40;
  begin_int[3]=this->grid_vol_size*12;

  int* i_head=(int*)(pointer+16);
  float* f_head=(float*)(pointer+32);

  i_head[0]=  this->dobspline_interpolation;
  for (int ia=0;ia<=2;ia++)
    {
      i_head[ia+1]=this->grid_dimensions[ia];
      f_head[ia]=this->grid_spacing[ia];
      f_head[ia+3]=this->grid_origin[ia];
    }

  int databytes=begin_int[3];
  bisMemoryManagement::copy_memory(pointer+56,(unsigned char*)(this->displacementField->getData()),databytes);
  //  for (int i=10;i<=11;i++)
  //    std::cout << "C++ i=" << i << " -> " << this->displacementField->getData()[i] << std::endl;
}


int bisGridTransformation::deSerialize(unsigned char* pointer)
{
  int* begin_int=(int*)pointer;
  int incoming_magic_type=begin_int[0];
  //  int data_type=begin_int[1];
  int header_size=begin_int[2];
  int data_size=begin_int[3];
  if (incoming_magic_type!=this->magic_type || begin_int[1]!=bisDataTypes::b_float32 || header_size!=40  )
    {
      std::cerr << "Bad Magic Type or not float or bad header size. Can not deserialize pointer as bisGridTransform " << std::endl;
      return 0;
    }

  int* i_head=(int*)(pointer+16);
  float* f_head=(float*)(pointer+32);

  int interp_mode=i_head[0];
  int dim[3] = { i_head[1],i_head[2],i_head[3] };
  float spa[3] = { f_head[0],f_head[1], f_head[2] };
  float ori[3] = { f_head[3],f_head[4], f_head[5] };
  int volsize_inbytes=dim[0]*dim[1]*dim[2]*12;
  if (data_size!=volsize_inbytes)
    {
      std::cerr << "Not enough data .. can not deserialize pointer as bisGridTransform " << std::endl;
      std::cerr << "data_size=" << data_size << " volsize=" << volsize_inbytes << std::endl;
      return 0;
    }

  
  this->initializeGrid(dim,spa,ori,interp_mode);

  float* data=this->displacementField->getData();
  bisMemoryManagement::copy_memory((unsigned char*)data,(pointer+56),volsize_inbytes);

  return 1;
}

// ----------------------------------

/** parse from Text 
 * @param linevector (a vector of lines)
 * @param offset the line to begin parsing
 * @param debug print diagnostic messages if > 0
 * @returns a string
 */
int bisGridTransformation::textParse(std::vector<std::string>& lines,int& offset,int debug)
{
  int read_interpmode=0;
  if (debug)
    std::cout << "offset=" << offset << "line=" << lines[offset] << std::endl;
  
  if (lines[offset].find("#vtkpxBaseGridTransform File")==std::string::npos)
    {
      if (lines[offset].find("#vtkpxBaseGridTransform2 File")==std::string::npos)
        return 0;
      else
        read_interpmode=1;
    }


  if (debug)
    std::cout << "read_interp_mode=" << read_interpmode << std::endl;
  
  float ori[3],spa[3];
  int   dim[3],interp_mode=4;
  offset+=2;  sscanf(lines[offset].c_str(),"%f %f %f",&ori[0],&ori[1],&ori[2]);
  offset+=2;  sscanf(lines[offset].c_str(),"%f %f %f",&spa[0],&spa[1],&spa[2]);
  offset+=2;  sscanf(lines[offset].c_str(),"%d %d %d",&dim[0],&dim[1],&dim[2]);

  if (read_interpmode) {
    offset+=2;  sscanf(lines[offset].c_str(),"%d",&interp_mode);
  }
  int use_bspline=1;
  if (interp_mode!=4)
    use_bspline=0;

  if (debug)
    std::cout << "Initializing grid " << dim[0] << "*" << dim[1] << "*" << dim[2] << std::endl;
  
  this->initializeGrid(dim,spa,ori,use_bspline);

  this->displacementField->fill(0.0);
  float* data=this->displacementField->getData();
  int np=this->getNumberOfControlPoints();
  offset+=2;


  int tmp=0;
  float dx[3];
  for (int i=0;i<np;i++)
    {
      if (debug && (i==0 || i==np-1))
        std::cout << "data point = " << i << " = " << lines[offset] << std::endl;

      sscanf(lines[offset].c_str(),"%d %f %f %f",&tmp,&dx[0],&dx[1],&dx[2]);
      for (int ia=0;ia<=2;ia++)
        data[i+ia*np]=dx[ia];
      offset+=1;
    }

  return 1;
}

/** serialize to Text 
 * @param debug print diagnostic messages if > 0
 * @returns a string
 */
std::string bisGridTransformation::textSerialize(int debug)
{
  std::stringstream output;
  output.precision(5);  

  int interp=4;
  if (!this->dobspline_interpolation)
    interp=1;
  

  output << "#vtkpxBaseGridTransform2 File" << std::endl;
  output << "#Origin" << std::endl << this->grid_origin[0] << " " << this->grid_origin[1] << " " << this->grid_origin[2] << std::endl;
  output << "#Spacing" << std::endl << this->grid_spacing[0] << " " << this->grid_spacing[1] << " " << this->grid_spacing[2] << std::endl;
  output << "#Dimensions" << std::endl << this->grid_dimensions[0] << " " << this->grid_dimensions[1] << " " << this->grid_dimensions[2] << std::endl;
  output << "#Interpolation Mode" << std::endl << interp << std::endl;
  output << "#Displacements" << std::endl;

  int np=this->getNumberOfControlPoints();
  float* data=this->displacementField->getData();
  
  if (debug)
    {
      std::cout << "Grid: np=" << np << " l=" << this->displacementField->getLength() << std::endl;
    }
      
  for (int i = 0; i < np;i++)
    {
      output << i;
      for (int ia=0;ia<=2;ia++)
        output << " " << data[i+ia*np];
      output << std::endl;
    }
  return output.str();
}
