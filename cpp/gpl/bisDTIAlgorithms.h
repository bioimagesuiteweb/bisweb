/*  License
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._ It is released under the terms of the GPL v2.
 
 ----
     
   This program is free software; you can redistribute it and/or
   modify it under the terms of the GNU General Public License
   as published by the Free Software Foundation; either version 2
   of the License, or (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
   See also  http: www.gnu.org/licenses/gpl.html
   
   If this software is modified please retain this statement and add a notice
   that it had been modified (and by whom).  
 
 Endlicense */



#ifndef _bis_DTI_Algorithms_h
#define _bis_DTI_Algorithms_h

#include "bisDataTypes.h"
#include "bisSimpleDataStructures.h"
#include "bisEigenUtil.h"
#include "bisUtil.h"
#include "math.h"



/**
 * DTI Processing Algorithms
 */
namespace bisDTIAlgorithms {


  /** Computes the tensor fit
   * @param input the input 4D image of all the acquisitions
   * @param t2image the input baseline T2 image
   * @param mask the input mask image (can be NULL,0)
   * @param directions the matrix with directions
   * @param bvalue the bvalue
   * @param output the output tensor
   * @return 1 if pass, 0 if failed
   */
  int computeTensorFit(bisSimpleImage<short>* input,
		       bisSimpleImage<short>* t2image,
		       bisSimpleImage<unsigned char>* mask,
		       Eigen::MatrixXf& directions,
		       float bvalue,
		       bisSimpleImage<float>* output);

  /** Computes Eigenvalues and Eigenvector as a single image of 4 components x 3 frames
   * component 0 = eigenvalues
   * components 1-3 eigenvectors
   * frames are x,y,z
   * @param tensor the input dti tensor (from computeTensorFit)
   * @param mask the input mask image (can be NULL,0)
   * @param eigenSystem the output images as defined above
   * @returns 1 if success, 0 if failed */
  int computeTensorEigenSystem(bisSimpleImage<float>* tensor,
			       bisSimpleImage<unsigned char>* mask,
			       bisSimpleImage<float>* eigenSystem);


  /** Compute Tensor Invariants
   * @param eigenSystem the input eigenSystem as output from computeTensorEigenSystem
   * @param mask the input mask image (can be NULL,0)
   * @param mode 0=FA, 1=RA, 2= VolRatio, 3=MD, 4=SK, 5=All (5 component output)
   * @param output the output image
   * @returns 1 if success, 0 if failed */
  int computeTensorInvariants(bisSimpleImage<float>* eigenSystem,
			      bisSimpleImage<unsigned char>* mask,
			      int mode,
			      bisSimpleImage<float>* output);


  /** Compute Orientation Map based on principal eigenvector
   * @param eigenSystem the input eigenSystem as output from computeTensorEigenSystem
   * @param mask the input mask image (can be NULL,0)
   * @param magnitude the weight image (e.g. FA map)
   * @param scaling extra scale factor
   * @param outputImage the output 3 component color image
   * @returns 1 if success, 0 if failed.
   */
  int computeTensorColormap(bisSimpleImage<float>* eigenSystem,
			    bisSimpleImage<unsigned char>* mask,
			    bisSimpleImage<float>* magnitude,
			    float scaling,
			    bisSimpleImage<unsigned char>* outputImage);

}



  
#endif
