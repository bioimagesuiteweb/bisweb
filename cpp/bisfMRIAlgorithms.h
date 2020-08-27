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


#ifndef _bis_fMRI_Algorithms_h
#define _bis_fMRI_Algorithms_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisEigenUtil.h"
#include "bisUtil.h"
#include "math.h"



/**
 * fMRI Processing Algorithms
 */
namespace bisfMRIAlgorithms {

  /** compute GLM inhomogeneity
   * @param input the input image time series
   * @param mask the input mask (compute only where this > 0)
   * @param regressorMatrix  the regressor Matrix (this is post HRF Convolution etc.)
   * @param num_tasks Number of Tasks (last N columns of regressor matrix, first columns are drift, nuisance terms);
   * @returns the 4D beta map image
   */
  bisSimpleImage<float>* computeGLM(bisSimpleImage<float>* input,bisSimpleImage<unsigned char>* mask,bisSimpleMatrix<float>* regressorMatrix,int num_tasks);

  /** Computes legendre polynomial of order in range 0 to 6.
   * @param t the input value
   * @param order the order of the polynomial 
   * @returns the value of the polynomial of order (order) at t
   */
  float legendre(float t,int order=3);

  /** This function creates a drift regressor of size numframes * (order+1) for a timeseries
   * @param  numframes - the number of frames -> rows of matrix
   * @param  order - the order of the polynomial -> (order+1 -> cols of matrix)
   * @returns the matrix
   */
  Eigen::MatrixXf createDriftRegressor(int numframes,int order=3);

  /** This function creates the roi mean timeseries of an input image given an roi definition image
   * @param input - the input (4D potentially image)
   * @param roi - the input ROI Definition
   * @param output - the mean timeseries (rows=frames,cols=roi)
   * @returns an image of dimensions (1,1,numrois,numframes) 
   */
  int computeROIMean(bisSimpleImage<float>* input,bisSimpleImage<short>* roi,Eigen::MatrixXf& output);


  /** Performs high or low pass butterworth filtration
   * @param input the input timeseries matrix (rows=frame)
   * @param output the input timeseries matrix (rows=frame)
   * @param w the weight vector  (BINARY here if > 0.5 use, else ignore)
   * @param temp  a temporary matrix
   * @param passType the filter type either "low" or "high"
   * @param frequency  cuttoff frequency in Hz
   * @param sampleRate Data TR (TR = Time of repetition)
   * @param debug  if > 0 print filter characteristics
   * @return 1 if success, 0 if fail
   */
  int butterworthFilter(Eigen::MatrixXf& input,Eigen::MatrixXf& output,Eigen::VectorXf& w,Eigen::MatrixXf& temp,
                        std::string passType,float frequency,float sampleRate,int debug);


  /** Performs high or low pass butterworth filtration on images
   * @param input the input timeseries matrix (rows=frame)
   * @param output the input timeseries matrix (rows=frame)
   * @param w the weight vector  (BINARY here if > 0.5 use, else ignore)
   * @param temp  a temporary matrix
   * @param passType the filter type either "low" or "high"
   * @param frequency  cuttoff frequency in Hz
   * @param sampleRate Data TR (TR = Time of repetition)
   * @param removeMean  (if > 0 removeMean of time series before filtering)
   * @param debug  if > 0 print filter characteristics
   * @return 1 if success, 0 if fail
   */
  int butterworthFilterImage(bisSimpleImage<float>* input,bisSimpleImage<float>* output,
                             std::string passType,float frequency,float sampleRate,int removeMean,int debug);



  /** Removes components of data parallel to regressors
   * @param input the input timeseries matrix (rows=frame)
   * @param regressors the regressors matrix
   * @param LSQ is the least squares matrix inv(R'R)*R' where R=Regressors
   * @param output the cleaned time series
   * @return 1 if pass, 0 if failed
   */
  int regressOut(Eigen::MatrixXf& input,Eigen::MatrixXf& regressors,Eigen::MatrixXf& LSQ,Eigen::MatrixXf& output);

  /** Removes components of data parallel to regressors with weights for the quality of frames
   * @param input the input timeseries matrix (rows=frame)
   * @param weightedRegressors the weighted Regressors matrix
   * @param LSQ is the weighted least squares matrix inv(R'R)*R' where R=w*Regressors
   * @param weights the weights (of each frame) 
   * @param temp a temporary matrix for storing data 
   * @param output the cleaned time series
   * @return 1 if pass, 0 if failed
   */
  int weightedRegressOut(Eigen::MatrixXf& input,Eigen::MatrixXf& weightedRegressors,Eigen::VectorXf& weights,Eigen::MatrixXf& LSQ,
			 Eigen::MatrixXf& temp,
			 Eigen::MatrixXf& output);


  /** Create a weighted LSQ matrix from regressors and weights, M= LSQ(w*R) 
   * @param regressors the regressors matrix
   * @param weights the weights (of each frame) 
   * @param weighted_regressors -- on output stores the w*regressors matrix (needed for weightedRegressOut)
   * @returns the LSQ matrix for weighted regressor removal
   */
  Eigen::MatrixXf createWeightedLSQ(Eigen::MatrixXf& regressors,Eigen::VectorXf& weights,Eigen::MatrixXf& weighted_regressors);

  /** Computes the weighted global signal of a  timeseries
   * @param input the input timeseries matrix (rows=frame,cols=rois)
   * @param weights the weights for each time frame (binary HERE > 0.5 used, else ignored)
   * @param mean the mean global signal
   * @return 1 if pass, 0 if failed
   */
  int computeGlobalSignal(Eigen::MatrixXf& input,Eigen::VectorXf& weights,Eigen::VectorXf& mean);
  
  /** This function regresses out the global mean signal from a set of timeseries as computed using computeGlobalSignal
   * @param input - the input timeseries vectors (row=frames)
   * @param weights - the input weights (weights for each row)
   * @param mean - the global signal 
   * @param output the cleaned time series
   * @return 1 if pass, 0 if failed
   */
  int regressGlobalSignal(Eigen::MatrixXf& input,Eigen::VectorXf& weights,Eigen::VectorXf& mean,Eigen::MatrixXf& output);

  /** Computes the correlation (connectivity) matrix between timeseries
   * @param input the input timeseries matrix (rows=frame,cols=rois)
   * @param toz if 1 conver to z-score
   * @param weights the weights for each time frame (used to filter out bad frames)
   * @param output the cleaned time series
   * @return 1 if pass, 0 if failed
   */
  int computeCorrelationMatrix(Eigen::MatrixXf& input,int toz,Eigen::VectorXf& weights,Eigen::MatrixXf& output);

  /** This function computes a correlation matrix from a set of timeseries. Weights are binary either use or do not use frame (>0.01 = use)
   * @alias BisfMRIMatrixConnectivity.computeSeedMapImage
   * @param {Image} input - the input timeseries vectors as image
   * @param {Matrix} seedtime series -- seed timeseries vectors as matrix (rows = frames);
   * @param {boolean} toz - if true compute r->z transform and return z-values else r's (default = false)
   * @param {array} weights - the input regressors vectors (weights for each row)
   * @returns {Matrix} seed map image
   */
  int computeSeedMapImage(bisSimpleImage<float>* input,Eigen::MatrixXf& roi,int toz,Eigen::VectorXf& weights,bisSimpleImage<float>* output);

  /** This function normalizes a time series image to have unit magnitude and zero mean for each voxel
   * @alias BisfMRIMatrixConnectivity.normalizeTimeSeriesImage
   * @param {Image} input - the input timeseries  image
   * @param {Image} output - the normalized timeseries  image
   */
  int normalizeTimeSeriesImage(bisSimpleImage<float>* input,bisSimpleImage<float>* output);

}



  
#endif
