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

#ifndef _bis_Util_h
#define _bis_Util_h

#include<string>

/**
 *   Utility functions for BioImage Suite Web
 */
namespace bisUtil {

// These are needed when linking to AFNI which defines PI and mat44
// ----------------------------------------------------------------
#ifdef PI
#undef PI
#endif
  
#ifdef mat44
#undef mat44
#endif

  /** PI definition */
  const double PI=3.14159265358979;
  
  /**
   *   A Simple 4x4 float matrix used internally for linear transformation storage
   */
  typedef float mat44[4][4];

  /**
   *   Map integer within range i<imin-> imin, i>imaxv->imax
   *   @param i input value
   *   @param imin minimum bound
   *   @param imax maximum bound
   *   @return the bounded value
   */
  int irange(int i,int imin,int imax);


  /**
   *   Map float within range i<vmin-> vmin, i>vmax->vmax
   *   @param v input value
   *   @param vmin minimum bound
   *   @param vmax maximum bound
   *   @return the bounded value
   */
  float frange(float v,float vmin,float vmax);

  /**
   *   Returns the maximum of two float values
   *   @param a1 value 1
   *   @param a2 value 2
   *   @return the maximum
   */
  float fmax(float a1,float a2);


  /** Normalizes a vector 
   * @param v the vector
   */
  void normalize(double v[3]);


  /** make matrix identity 
   * @param matrix the matrix to make identity
   */
  void makeIdentityMatrix(mat44 m);

  /** fill matrix
   * @param matrix the matrix to fill
   */
  void fillMatrix(mat44 m,float value=0.0);
  

  /** Prints a 4x4 matrix with a name comment
   * @param m matrix to print
   * @param name name of matrix
   */
  void printMatrix(mat44 m,std::string name="matrix");

  /** Compute the probability under a gaussian distribution 
   * @param x the input variable
   * @param m the mean
   * @param sigma2 the variance
   * @returns the probability 
   */
  double gaussian(double x,double m,double sigma2);

  /** Compute the probability difference between two gaussian distributions
   * @param x the input variable
   * @param mean1 the mean of distribution 1
   * @param mean2 the mean of distribution 2
   * @param var1 the variance of distribution 1
   * @param var2 the variance of distribution 2
   * @returns the probability difference i.e. gaussian_1(x) - gaussian_2(x)
   */
  double getGaussianDifference(double x,double mean1,double mean2,double var1,double var2);

  /** get threshold for two gaussian distributions 
   * returns the value of x at which the two distributions have equal value
   * @param mean1 the mean of distribution 1
   * @param mean2 the mean of distribution 2
   * @param var1 the variance of distribution 1
   * @param var2 the variance of distribution 2
   * @returns the location of equal probability (threshold for segmentation)
   */
  double getGaussianThreshold(double mean1,double mean2,double var1,double var2);

  /** Get random number in range 0..limit (uniform)
   * @param limit the upper bound (included)
   * @returns x  -> 0<= x <= limit
   */
  int getRandom(int limit);

  /** Initializes random seed with current time */
  void initializeRandomSeed();

  /** returns a random number between 0 and 1 (uniform) */
  double getDoubleRandom();

  /** returns a gaussian distributed random variable with mean 0 and sigma=1*/
  double gaussianRandom();


  /** valley function
   * @param x input variable
   * @param sigma standard deviation
   * @returns x2/(x2+sigma*sigma+0.001)  
   */
  double valley(double x,double sigma);
    
  /** valley function
   * @param x input variable
   * @param sigma2  variance
   * @returns x2/(x2+sigma2+0.001)  
   */
  double valley2(double x,double sigma2);

  // Conversion Functions  

  /** convert t-value to p-value
   * @param t t-value
   * @param df number of degrees of freedom 
   * @returns p-value */
    double TvalueToPvalue(double t,int df);
    
  /** convert p-value to t-value
   * @param p p-value
   * @param df number of degrees of freedom 
   * @returns t-value */
   double PvalueToTvalue(double p,int df);
  
  /** convert z-score to p-value
   * @param z z-score
   * @returns p-value */
   double ZscoreToPvalue(double z);

  /** convert p-value to z-score 
   * @param p v-value
   * @returns z-score */
  double PvalueToZscore(double p);

  /** Convert rho to z (i.e. correlation to z-score)
   * @param rho - correlation coefficient
   * @returns the z-score
   */
  double rhoToZConversion(double rho);

}

#endif
