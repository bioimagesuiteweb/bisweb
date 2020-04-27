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


#include "bisJointHistogram.h"
#include "bisUtil.h"
#include "math.h"
#include <iostream>

bisJointHistogram::bisJointHistogram(std::string n) : bisObject(n) {
  
  this->numbinsx=0;
  this->numbinsy=0;
  this->maxx=0;
  this->maxx2=0;
  this->maxy=0;
  this->maxy2=0;
  this->intscale=1;
  this->totalbins=0;
  this->numsamples=0;
  this->backupnumsamples=0;
  this->class_name="bisJointHistogram";
}

bisJointHistogram::~bisJointHistogram(){

}


// Initialize Histogram
void bisJointHistogram::initialize (int numbinsx,int numbinsy,int scale) {

  this->numbinsx=bisUtil::irange(numbinsx,2,1024);
  this->numbinsy=bisUtil::irange(numbinsy,2,1024);
  this->maxx=this->numbinsx-1.000f;
  this->maxy=this->numbinsy-1.000f;
  this->maxx2=this->numbinsx-1.001f;
  this->maxy2=this->numbinsy-1.001f;
  this->intscale=bisUtil::irange(scale,1,10);
  this->totalbins=this->numbinsx*this->numbinsy;
  this->bins.resize(this->totalbins);
  this->backupbins.resize(this->totalbins);
  this->zero();

}

void bisJointHistogram::backup()
{
  if (this->totalbins==0)
    return;
  //  int l=this->totalbins;
  for (unsigned int i=0;i<this->bins.size();i++)
    this->backupbins[i]=this->bins[i];
  this->backupnumsamples=this->numsamples;

}


void bisJointHistogram::restore()
{
  if (this->totalbins==0)
    return;
  for (unsigned int i=0;i<this->bins.size();i++)
    this->bins[i]=this->backupbins[i];
  this->numsamples=this->backupnumsamples;

}

void bisJointHistogram::zero()
{
  int l=this->totalbins;
  for (int i=0;i<l;i++)
    this->bins[i]=0;
  this->numsamples=0;
}

int bisJointHistogram::getnumsamples() {

  return this->numsamples;
}

void bisJointHistogram::getnumbins(int nbins[2])
{
  nbins[0]=this->numbinsx;
  nbins[1]=this->numbinsy;
}


void bisJointHistogram::modifybin(short a,short b, int count)

{
  if (a<0 || a>this->maxx || b<0 || b>this->maxy) {
      return;
  }

  
  int index=a+b*this->numbinsx;
  this->bins[index]+=count;
  this->numsamples+=count;
}

void bisJointHistogram::interpolatemodifybin(short x,short y,int count) {

  if (x<0 || y<0) {
    return;
  }

  float sa=float(x)/float(this->intscale);
  if (sa>this->maxx2) 
    return;

  float sb=float(y)/float(this->intscale);
  if (sb>this->maxy2)
    return;
		
  int A0=int(sa);
  int A1=1+A0;
  float SA0= A1-sa;
  float SA1=1.0f-SA0;
  
  int B0=int(sb);
  int B1=B0+1;
  float SB0 = (B1-sb);
  float SB1=1.0f-SB0;

  B0*=this->numbinsx;
  B1*=this->numbinsx;
  count*=100;
		
  int ct00=int(0.5+count*SA0*SB0) ; this->bins[A0+B0]+=ct00;
  int ct01=int(0.5+count*SA0*SB1) ; this->bins[A0+B1]+=ct01;
  int ct10=int(0.5+count*SA1*SB0) ; this->bins[A1+B0]+=ct10;
  int ct11=int(0.5+count*SA1*SB1) ; this->bins[A1+B1]+=ct11;
  this->numsamples+=(ct00+ct01+ct10+ct11);
}

double bisJointHistogram::computeSSD()
{
  double sum = 0.0f;
  if (this->numsamples<0.01f)
    return 0.0f;

  int index=0;
  for (int j=0; j<this->numbinsy; j++)
    {
      for (int i=0; i<this->numbinsx; i++) {
	double w=this->bins[index];
	sum+=w*powf(i-j,2.0f);
	++index;
      }
    }
  return sum/(double(this->numsamples));
}

double bisJointHistogram::computeCC()
{
  double mean[2]={0.0,0.0};
  double sigma[2]={0.0,0.0};
  double sum[2]={0.0,0.0};
  double sum2[2]={0.0,0.0};
  double sumprod=0.0;
  double numscalars=0;
  int index=0;

  for (int j=0; j<this->numbinsy; j++)
    {
      for (int i=0; i<this->numbinsx; i++)
	{
	  double w=(double)this->bins[index];
	  ++index;
	  sum[0] += w*i;
	  sum2[0] += (w*i*i);

	  sum[1] += w*j;
	  sum2[1] += (w*j*j);
	  sumprod += w*i*j;
	  numscalars += w;
	}
    }
  
  if (numscalars<0.01)
    numscalars=0.01f;
		
  for (int j=0;j<=1;j++)
    {
      mean[j] = sum[j]/numscalars;
      sigma[j] = sum2[j]/(numscalars)-mean[j]*mean[j];
      if (sigma[j]<0.00001)
	sigma[j]=0.00001f;
  }

  double covar = pow(sumprod/numscalars-mean[0]*mean[1],2.0);
  double covar2 = covar/(sigma[0]*sigma[1]);
  return covar2;
}

double bisJointHistogram::entropyX()
{
  double out=0.0;

  for (int i=0;i<this->numbinsx;i++) {
    double tmp=0.0;
    for (int j = 0; j < this->numbinsy; j++)
      tmp +=this->bins[i+j*this->numbinsx];
		    
    if (tmp > 0)
      out += tmp * log(tmp);
  }
  return (- out / double(this->numsamples) + log(double(this->numsamples)));

}

double bisJointHistogram::entropyY()
{
  double out=0.0;
  int index=0;
  for (int j=0; j < this->numbinsy; j++)
    {
      double tmp=0.0;
      for (int i=0;i<this->numbinsx;i++)
	{
	  tmp +=this->bins[index];
	  ++index;
	}
      if (tmp > 0)
	out += tmp * log(tmp);
    }
  return (- out / double(this->numsamples) + log(double(this->numsamples)));

}

double bisJointHistogram::jointEntropy()
{
  double out=0.0;
  for (int i=0;i<this->totalbins;i++) {
    double v=this->bins[i];
    if (v>0.0)
      out += v * log(v);
  }
  return (- out / double(this->numsamples) + log(double(this->numsamples)));
}

double bisJointHistogram::computeMI()
{
  double e1=this->entropyX();
  double e2=this->entropyY();
  double j= this->jointEntropy();
  return (e1+e2)-j;
}

double bisJointHistogram::computeNMI()
{
  double e1=this->entropyX();
  double e2=this->entropyY();
  double j= this->jointEntropy();
  return (e1+e2)/j-1.0;
}

  // mode - (0=SSD,1=CC,2=MI,3=NMI)
double bisJointHistogram::computeMetric(int mode)
{
  if (mode==0)
    return this->computeSSD();
  if (mode==1)
    return -this->computeCC();
  if (mode==2)
    return -this->computeMI();

  return -this->computeNMI();
}


int bisJointHistogram::fillHistogram(short* arr1,short* arr2,
				     int factor,int reset,int dim[3],int bounds[6])
{
  return this->weightedFillHistogram(arr1,arr2,0,0,0,factor,reset,dim,bounds);
}


int bisJointHistogram::getWeight2(int j,short* weightarr1,short* weightarr2)
{
  return weightarr1[j]+weightarr2[j];
}

int bisJointHistogram::getWeight1(int j,short* weightarr1,short*) {
  return weightarr1[j];
}

int bisJointHistogram::getWeight0(int ,short* ,short*) {
  return 1;
}


int bisJointHistogram::weightedFillHistogram(short* arr1,short* arr2,short* weightarr1,short* weightarr2,int num_weights,
					     int factor,int reset,int dim[3],int bounds[6])
{
  int (*weightFun)(int,short*,short* );
  weightFun=bisJointHistogram::getWeight0;
  
  if (num_weights==2) {
    weightFun=bisJointHistogram::getWeight2;
  } else if (num_weights==1) {
    weightFun=bisJointHistogram::getWeight1;
  }


  if (reset)
    this->zero();

  int slicesize=dim[0]*dim[1];
  
  // Treat as images with dimensions

  
  for (int k=bounds[4];k<=bounds[5];k++)
    {
      int koffset=k*slicesize;
      for (int j=bounds[2];j<=bounds[3];j++)
	{
	  int offset=koffset+j*dim[0]+bounds[0];
	  for (int i=bounds[0];i<=bounds[1];i++)
	    {
	      if (this->intscale>1) {
		this->interpolatemodifybin(arr1[offset],arr2[offset],factor*weightFun(offset,weightarr1,weightarr2));
	      } else {
		int w=factor*weightFun(offset,weightarr1,weightarr2);
		this->modifybin(arr1[offset],arr2[offset],w);

	      }
	      offset=offset+1;
	    }
	}
    }

  return 1;
}
 
void bisJointHistogram::print()
{
  for (int j=0;j<this->numbinsy;j++)
    {
      std::cout << "[ ";
      for (int i=0;i<this->numbinsx;i++) {
	std::cout << this->bins[j*this->numbinsx+i] << " ";
      }
      std::cout << "] " << std::endl;
    }
  std::cout << "Max = " << this->maxx << "," << this->maxy << std::endl << std::endl;
}


bisSimpleMatrix<float>* bisJointHistogram::exportHistogram(std::string name)
{
  bisSimpleMatrix<float>* output=new bisSimpleMatrix<float>(name);
  output->allocate(this->numbinsy,this->numbinsx);
  for (int i=0;i<this->numbinsx*this->numbinsy;i++)
    output->getData()[i]=this->bins[i];

  return output;
}

