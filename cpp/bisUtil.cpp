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

#include <iostream>
#include "bisUtil.h"
#include <math.h>
#include <time.h>
#include <stdlib.h>
#include <cmath>
#include <unsupported/Eigen/SpecialFunctions>

namespace bisUtil {

  int irange(int i,int imin,int imax) {
    if (i<imin)
      return imin;
    if (i>imax)
      return imax;
    return i;
  }

  float frange(float v,float vmin,float vmax) {
    if (v<vmin)
      return vmin;
    if (v>vmax)
      return vmax;
    return v;
  }

  float fmax(float a1,float a2) {
    if (a1>a2)
      return a1;
    return a2;
  }

  void normalize(double v[3])
  {
    double sum=0.0;
    for (int ia=0;ia<=2;ia++)
      sum+=v[ia]*v[ia];

    if (sum<0.000001)
      return;
    float magn=sqrt(sum);
    
    for (int ia=0;ia<=2;ia++)
      v[ia]/=magn;
  }
  
  void printMatrix(mat44 m,std::string name) {
    
    std::cout << std::endl << "____ " << name << ":" << std::endl;
    for (int i=0;i<=3;i++)
      {
	std::cout << "\t[ ";
	for (int j=0;j<=3;j++)
	  std::cout << m[i][j] << " ";
	std::cout << "]" << std::endl;
      }
    std::cout << std::endl;
  }


  // Math Utility Functions
  // ----------------------
  
  double gaussian(double x,double m,double sigma2) {
    double t= (x-m)*(x-m)/(-2.0*sigma2);
    double A= 1.0/sqrt(2.0*PI*sigma2);
    return A*exp(t);
  }

  double getGaussianDifference(double x,double mean1,double mean2,double var1,double var2) {
    return gaussian(x,mean1,var1)-gaussian(x,mean2,var2);
  }


  double getGaussianThreshold(double mean1,double mean2,double var1,double var2)
  {
    double thr=0.01;
    if (fabs(mean1-mean2)<thr)
      return 0.5*(mean1+mean2);
    
    double upperbound=mean1;
    double lowerbound=mean2;
    
    double test=0.5*(upperbound+lowerbound);
    double v=0.0;
    
    while (fabs(upperbound-lowerbound)>thr)
      {
	v=getGaussianDifference(test,mean1,mean2,var1,var2);

	if (v>0.0)
	  upperbound=test;
	else
	  lowerbound=test;
	test=0.5*(upperbound+lowerbound);
      }

    return test;
  }

  void initializeRandomSeed() {
    srand(time(NULL));
  }
  
  // https://stackoverflow.com/questions/2999075/generate-a-random-number-within-range/2999130#2999130
  int getRandom(int limit) { 
    int divisor = RAND_MAX/(limit+1);
    int retval;
    do { 
      retval = rand() / divisor;
    }
    while (retval > limit);

    return retval;
  }

  double getDoubleRandom() {
    int r=getRandom(1000);
    return double(r)/1000.0;
  }
    
  
  double gaussianRandom()
  {
    static int mz_previous_normal_flag=0;
    static double mz_previous_normal=0.0;
    if (mz_previous_normal_flag)
      {
	mz_previous_normal_flag = 0;
	return mz_previous_normal;
      }
    else
      {
	double x,y,r2;
	do
	  {
	    x=2.0*getDoubleRandom()-1.0;
	    y=2.0*getDoubleRandom()-1.0;
	    r2 = x*x+y*y;
	  }
	while (r2 >=1.0 || r2 <= 0.0000000001 );

	double fac = sqrt(-2.0*log(r2)/r2);
	mz_previous_normal = x*fac;
	mz_previous_normal_flag = 1;
	return y*fac;
      }
  }

  // ----------------------------------------------------------------------------
  
  double valley(double x,double sigma) {
    double x2=x*x; return x2/(x2+sigma*sigma+0.001);
  }
  
  double valley2(double x,double sigma2) {
    double x2=x*x; return x2/(x2+sigma2+0.001);
  }


  // ----------------------------------------------------------------------------
  double TvalueToPvalue(double t,int df)
  {
    double v=double(df);
    double x = (t + sqrt(t * t + v)) / (2.0 * sqrt(t * t + v));
    double prob = Eigen::numext::betainc(v/2.0, v/2.0, x);
    return 2.0*(1.0-prob);
  }
  
  double PvalueToTvalue(double p,int df)
  {
    if (p<1e-8 || p>0.99 || df < 1)
      return -1.0;
    
    
    double maxt=0.5,minp=p+1.0;
    int counta=0;
    while (minp>p && counta<100)
      {
	maxt*=2.0;
	//	std::cout << "maxt=" << maxt << " minp=" << minp << std::endl;
	minp=TvalueToPvalue(maxt,df);
	counta+=1;
      }

    
    double mint=10.0,maxp=p-1.0;
    
    while (maxp<p)
      {
	mint*=0.5;
	maxp=TvalueToPvalue(mint,df);
      }
    
    
    double dt=fabs(maxt-mint)/(maxt+mint);
    double updatedt=0.5*(maxt+mint);
    
    int count=1;
    
    while (dt>0.001 && count<1000)
      {
	updatedt=0.5*(maxt+mint);
	

	double updatedp=TvalueToPvalue(updatedt,df);

	
	if (updatedp>p)
	  {
	    mint=updatedt;
	    maxp=updatedp;
	  }
	else
	  {
	    maxt=updatedt;
	    minp=updatedp;
	  }
	dt=fabs(maxt-mint)/(maxt+mint);
	++count;
      }
    
    if (count==1000)
      updatedt=-updatedt;
    
    return updatedt;
  }
  
  double ZscoreToPvalue(double Z)
  {
    // From itkGaussianDistribution (2 tail)
    return 1.0-std::erf(sqrt(0.5) * fabs(Z));

}

  double PvalueToZscore(double p)
  {
    /*  if (p<1e-8 || p>0.99 )
	return -1.0;*/
    
    
    double maxt=0.5,minp=p+1.0;
    while (minp>p)
      {
	maxt*=2.0;
	minp=ZscoreToPvalue(maxt);

      }

    
    double mint=10.0,maxp=p-1.0;
    
    while (maxp<p)
      {
	mint*=0.5;
	maxp=ZscoreToPvalue(mint);
      }
    
    
    double dt=fabs(maxt-mint)/(maxt+mint);
    double updatedt=0.5*(maxt+mint);
    
    int count=1;
    
    while (dt>0.001 && count<1000)
      {
	updatedt=0.5*(maxt+mint);
	

	double updatedp=ZscoreToPvalue(updatedt);

	
	if (updatedp>p)
	  {
	    mint=updatedt;
	    maxp=updatedp;
	  }
	else
	  {
	    maxt=updatedt;
	    minp=updatedp;
	  }
	dt=fabs(maxt-mint)/(maxt+mint);
	++count;
      }

    if (count==1000)
      updatedt=-updatedt;
    
    return updatedt;
  }


  // Convert r->z
  double rhoToZConversion(double rho)
  {
    //double gValue = 0; 
    //changed to cap at z=6.1030
    //otherwise this returns a value of 
    //0 for a large correlation
    
    //find sign of correlation
    double sign=1.0;
    if (rho<0.0)
      sign=-1.0;

    double gValue = sign*6.1030; 
  
    if(fabs(rho)>1.00001) {
      std::cerr << "Input correlation (r=" << rho << ") is greater than 1. Returning z=" << gValue << std::endl;
      return gValue;
    }

    if (rho>-0.99999 && rho<0.99999)
      gValue = 0.5*log((1+rho)/(1-rho));
    return gValue;
  }


  void makeIdentityMatrix(mat44 m) {
    for (int ia=0;ia<=3;ia++) {
      for (int ib=0;ib<=3;ib++) {
        if (ia==ib)
          m[ia][ib]=1.0;
        else
          m[ia][ib]=0.0;
      }
    }
  }

  /** fill matrix
   * @param matrix the matrix to fill
   */
  void fillMatrix(mat44 m,float value) {
    for (int ia=0;ia<=3;ia++) 
      for (int ib=0;ib<=3;ib++) 
        m[ia][ib]=value;
  }
  

}


