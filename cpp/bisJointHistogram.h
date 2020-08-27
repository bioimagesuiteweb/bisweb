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


#ifndef _bis_JointHistogram_h
#define _bis_JointHistogram_h

#include "bisUtil.h"
#include <vector>
#include "bisSimpleDataStructures.h"

/**
 * Class that stores a joint histogram and computes histogram-based
 * similarity metrics (such as Mutual Information etc.)
 */
class bisJointHistogram : public bisObject {
  
 public:

  /** Constructor
   * @param name used to set class name 
   */
  bisJointHistogram(std::string name="jointhisto");

  /** Destructor */
  virtual ~bisJointHistogram();

  /** Initialize Histogram 
   * @param numbinsx  number of bins for first image
   * @param numbinsy number of bins for second image
   * @param scale use this to divide the input intensity before storing in bins
   */
  void initialize(int numbinsx,int numbinsy,int scale=1);

  /** Back the Histogram (to internal storage) */
  void backup();

  /** Restore the Histogram (from internal storage) */
  void restore();

  /** Set all values of the histogram to zero */
  void zero();

  /** Get Number of Samples in the histogram */
  int getnumsamples();

  /** Get the dimensions of the histogram
   *@param nbins output variable to store the dimensions of the histogram
   */
  void getnumbins(int nbins[2]);

  /** Compute Histogram based Sum of Squared Differences */
  double computeSSD();

  /** Compute Histogram based Cross-correlation coefficient */
  double computeCC();

  /** Compute the marginal entropy for the first image */
  double entropyX();

  /** Compute the marginal entropy for the second image */
  double entropyY();

  /** Compute the joint entropy  */
  double jointEntropy();

  /** Compute the mutual information  */
  double computeMI();

  /** Compute the normalized mutual information (minus one, so in range 0 to 1 instead of 1 to 2)  */
  double computeNMI();

  /** Compute a metric
   * @param mode 0=SSD,1=CC,2=MI,3=NMI
   */
  double computeMetric(int mode);

  /** Weighted Fill Histogram
   * @param arr1 data for image 1
   * @param arr2 data for image 2
   * @param weightarr weights for image 1 (or 0)
   * @param weightarr2 weights for image 2 (or 0)
   * @param num_weights 0 = use no weights, 1 = use weightarr, 2=use both
   * @param factor scalefactor to multiply each count by (use -1 to remove counts)
   * @param reset if > 0 zeros the histogram before operation
   * @param dim dimensions of underlying image
   * @param bounds pice of the image to actually use for this operation
   * @returns 1 if pass or 0 if fail
   */
  int weightedFillHistogram(short* arr1,short* arr2,short* weightarr,short* weightarr2,int num_weights,
			    int factor,int reset,int dim[3],int bounds[6]);
  
  /** Fill Histogram -- calls weightedFillHistogram with weightarr,weightarr2 and num_weights set to zero.
   * @param arr1 data for image 1
   * @param arr2 data for image 2
   * @param factor scalefactor to multiply each count by (use -1 to remove counts)
   * @param reset if > 0 zeros the histogram before operation
   * @param dim dimensions of underlying image
   * @param bounds pice of the image to actually use for this operation
   * @returns 1 if pass or 0 if fail
   */
  int fillHistogram(short* arr1,short* arr2,
		    int factor,int reset,int dim[3],int bounds[6]);
  

  /**
   * Exports the histogram to a matrix
   * @param name used to set the name of the output matrix
   * @returns output matrix
   */
  bisSimpleMatrix<float>* exportHistogram(std::string name="");

  /** print the histogram for debugging purposes */
  void print();

protected:

  /** Stores the current histogram */
  std::vector<int> bins;

  /** Stores the backup histogram */
  std::vector<int> backupbins;

  /** number of bins for Image 1 (or "X") */
  int numbinsx;

  /** number of bins for Image 2 (or "Y") */
  int numbinsy;

#ifndef DOXYGEN_SKIP  
  float maxx,maxx2,maxy,maxy2;
#endif
  
  /** Intensity scale, value to divide input intensity before setting to bins */
  int intscale;

  /** Total number of bins numbinsx*numbinsy */
  int totalbins;

  /** Total number of samples stored */
  int numsamples;

  /** Total number of samples stored in backup histogram */
  int backupnumsamples;

  /** Add "count" counts to bins[a][b] 
   * @param a value of image 1
   * @param b value of image 2
   * @param count number of counts to add
   */
  void modifybin(short a,short b, int count);


  /** Add "count" counts to bins using bilinear interpolation
   * @param x value of image 1
   * @param y value of image 2
   * @param count number of counts to add
   */
  void interpolatemodifybin(short x,short y,int count);

#ifndef DOXYGEN_SKIP  
  static int getWeight0(int j,short* weightarr1,short* weightarr2);
  static int getWeight1(int j,short* weightarr1,short* weightarr2);
  static int getWeight2(int j,short* weightarr1,short* weightarr2);
#endif

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisJointHistogram(const bisJointHistogram&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisJointHistogram&);  
  
};

#endif
