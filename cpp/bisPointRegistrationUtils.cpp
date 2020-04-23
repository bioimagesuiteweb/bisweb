// Dervives from VTK

/*=========================================================================

  Program:   Visualization Toolkit
  Module:    vtkLandmarkTransform.cxx

  Copyright (c) Ken Martin, Will Schroeder, Bill Lorensen
  All rights reserved.
  See Copyright.txt or http://www.kitware.com/Copyright.htm for details.

  This software is distributed WITHOUT ANY WARRANTY; without even
  the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
  PURPOSE.  See the above copyright notice for more information.

  =========================================================================*/

#include "bisPointRegistrationUtils.h"
#include "bisJSONParameterList.h"
#include "bisEigenUtil.h"
#include "bisPointLocator.h"
#include <vector>
#include <Eigen/Dense>



namespace bisPointRegistrationUtils {

  int computeLandmarkTransformation(bisSimpleMatrix<float>* RawSourceLandmarks,
                                    bisSimpleMatrix<float>* RawTargetLandmarks,
                                    int mode,
                                    bisMatrixTransformation* Output)
    
  {
    Output->identity();

    if (!RawSourceLandmarks  || !RawTargetLandmarks) 
      return 0;
  
    int N_PTS = RawSourceLandmarks->getNumRows();
    int N_COLS= RawSourceLandmarks->getNumCols();
    if (N_PTS != RawTargetLandmarks->getNumRows() ||
        N_COLS != RawTargetLandmarks->getNumCols() ||
        N_COLS !=3 ||
        N_PTS < 4) {
      std::cerr << "Update: Source and Target Landmarks contain a different number of points or not enough points (" << N_PTS << "," << N_COLS <<")" << std::endl;
      return 0;
    }
  
    Eigen::Matrix4f Source=bisEigenUtil::mapToEigenMatrix(RawSourceLandmarks);
    Eigen::Matrix4f Target=bisEigenUtil::mapToEigenMatrix(RawTargetLandmarks);
  
    // --- compute the necessary transform to match the two sets of landmarks ---

    /*
      The solution is based on
      Berthold K. P. Horn (1987),
      "Closed-form solution of absolute orientation using unit quaternions,"
      Journal of the Optical Society of America A, 4:629-642
    */

    // Original python implementation by David G. Gobbi
    // -- find the centroid of each set --

    float source_centroid[3] = { 0, 0, 0 };
    float target_centroid[3] = { 0, 0, 0 };
    for (int i = 0; i < N_PTS; i++) {
      source_centroid[0] += Source(i,0);
      source_centroid[1] += Source(i,1);
      source_centroid[2] += Source(i,2);
      target_centroid[0] += Target(i,0);
      target_centroid[1] += Target(i,1);
      target_centroid[2] += Target(i,2);
    }
  
    source_centroid[0] /= N_PTS;
    source_centroid[1] /= N_PTS;
    source_centroid[2] /= N_PTS;
    target_centroid[0] /= N_PTS;
    target_centroid[1] /= N_PTS;
    target_centroid[2] /= N_PTS;

    // -- build the 3x3 matrix M --
  
    Eigen::Matrix4f M=Eigen::Matrix4f::Zero(3,3);
    Eigen::Matrix4f AAT=Eigen::Matrix4f::Zero(3,3);

    for (int i = 0; i < 3; i++) {
      AAT(i,0) = M(i,0) = 0.0F; // fill M with zeros
      AAT(i,1) = M(i,1) = 0.0F;
      AAT(i,2) = M(i,2) = 0.0F;
    }
    float a[3], b[3];
    float sa = 0.0F, sb = 0.0F;
    for (int pt = 0; pt < N_PTS; pt++) {
      // get the origin-centred point (a) in the source set
      for (int ia=0;ia<=2;ia++) {
        a[ia]=Source(pt,ia);
        b[ia]=Target(pt,ia);
      }
      a[0] -= source_centroid[0];
      a[1] -= source_centroid[1];
      a[2] -= source_centroid[2];
      // get the origin-centred point (b) in the target set
      b[0] -= target_centroid[0];
      b[1] -= target_centroid[1];
      b[2] -= target_centroid[2];
      // accumulate the products a*T(b) into the matrix M
      for (int i = 0; i < 3; i++) {
        M(i,0) += a[i] * b[0];
        M(i,1) += a[i] * b[1];
        M(i,2) += a[i] * b[2];
      
        // for the affine transform, compute ((a.a^t)^-1 . a.b^t)^t.
        // a.b^t is already in M.  here we put a.a^t in AAT.
        if (mode == 2) {
          AAT(i,0) += a[i] * a[0];
          AAT(i,1) += a[i] * a[1];
          AAT(i,2) += a[i] * a[2];
        }
      }
      // accumulate scale factors (if desired)
      sa += a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
      sb += b[0] * b[0] + b[1] * b[1] + b[2] * b[2];
    }
  
    // if source or destination is degenerate then only report
    // translation
    if (sa == 0.0 || sb == 0.0) {

      bisUtil::mat44 Mat44;
      for (int i=0;i<=3;i++) {
        for (int j=0;j<=3;j++) {
          if (i==j)
            Mat44[i][j]=1.0;
          else
            Mat44[i][j]=0.0;
        }
      }
   
      Mat44[0][3] = target_centroid[0] - source_centroid[0];
      Mat44[1][3] = target_centroid[1] - source_centroid[1];
      Mat44[2][3] = target_centroid[2] - source_centroid[2];
      Output->setMatrix(Mat44);

      return 1;
    }

    Eigen::Matrix4f Matrix=Eigen::Matrix4f::Zero(4,4);
    Matrix(3,3)=1;
    
  
    if (mode == 2)
      {
        M=AAT.inverse()*M;
        // AAT = (a.a^t)^-1
        //vtkMath::Invert3x3(AAT, AAT);
      
        // M = (a.a^t)^-1 . a.b^t
        //vtkMath::Multiply3x3(AAT, M, M);
      
        // Matrix = M^t
        for (int i = 0; i < 3; ++i)
          for (int j = 0; j < 3; ++j)
            Matrix(i,j) = M(j,i);
      }
    else
      {
        // compute required scaling factor (if desired)
        float scale = (float)sqrt(sb / sa);
        Eigen::Matrix4f N=Eigen::Matrix4f::Zero(4,4);
        // -- build the 4x4 matrix N --

        // on-diagonal elements
        N(0,0) = M(0,0) + M(1,1) + M(2,2);
        N(1,1) = M(0,0) - M(1,1) - M(2,2);
        N(2,2) = -M(0,0) + M(1,1) - M(2,2);
        N(3,3) = -M(0,0) - M(1,1) + M(2,2);
        // off-diagonal elements
        N(0,1) = N(1,0) = M(1,2) - M(2,1);
        N(0,2) = N(2,0) = M(2,0) - M(0,2);
        N(0,3) = N(3,0) = M(0,1) - M(1,0);
      
        N(1,2) = N(2,1) = M(0,1) + M(1,0);
        N(1,3) = N(3,1) = M(2,0) + M(0,2);
        N(2,3) = N(3,2) = M(1,2) + M(2,1);
      
        // -- eigen-decompose N (is symmetric) --
      
        Eigen::SelfAdjointEigenSolver<Eigen::Matrix4f> eigensolver(N);
        Eigen::Matrix4f eigenvectors=eigensolver.eigenvectors();
        Eigen::Vector4f eigenvalus=eigensolver.eigenvalues();
      
        // the eigenvector with the largest eigenvalue is the quaternion we want
        // (they are sorted in decreasing order for us by JacobiN)
        // Find largest eigenvalue
        float w = eigenvectors(0,0);
        float x = eigenvectors(1,0);
        float y = eigenvectors(2,0);
        float z = eigenvectors(3,0);
      
        // convert quaternion to a rotation matrix
      
        float ww = w * w;
        float wx = w * x;
        float wy = w * y;
        float wz = w * z;
      
        float xx = x * x;
        float yy = y * y;
        float zz = z * z;
      
        float xy = x * y;
        float xz = x * z;
        float yz = y * z;
      
        Matrix(0,0) = ww + xx - yy - zz;
        Matrix(1,0) = 2.0 * (wz + xy);
        Matrix(2,0) = 2.0 * (-wy + xz);
      
        Matrix(0,1) = 2.0 * (-wz + xy);
        Matrix(1,1) = ww - xx + yy - zz;
        Matrix(2,1) = 2.0 * (wx + yz);
      
        Matrix(0,2) = 2.0 * (wy + xz);
        Matrix(1,2) = 2.0 * (-wx + yz);
        Matrix(2,2) = ww - xx - yy + zz;
      
        if (mode != 0) {
          // add in the scale factor (if desired)
          for (int i = 0; i < 3; i++)
            {
              Matrix(i,0) *= scale;
              Matrix(i,1) *= scale;
              Matrix(i,2) *= scale;
            }
        }
      }
  
    // the translation is given by the difference in the transformed source
    // centroid and the target centroid
    float sx, sy, sz;
  
    sx = Matrix(0,0) * source_centroid[0] +    Matrix(0,1) * source_centroid[1] +    Matrix(0,2) * source_centroid[2];
    sy = Matrix(1,0) * source_centroid[0] +    Matrix(1,1) * source_centroid[1] +    Matrix(1,2) * source_centroid[2];
    sz = Matrix(2,0) * source_centroid[0] +    Matrix(2,1) * source_centroid[1] +    Matrix(2,2) * source_centroid[2];
  
    Matrix(0,3) = target_centroid[0] - sx;
    Matrix(1,3) = target_centroid[1] - sy;
    Matrix(2,3) = target_centroid[2] - sz;
  
    // fill the bottom row of the 4x4 matrix
    Matrix(3,0) = 0.0;
    Matrix(3,1) = 0.0;
    Matrix(3,2) = 0.0;
    Matrix(3,3) = 1.0;

    bisUtil::mat44 Mat44;
    for (int i=0;i<=3;i++)
      for (int j=0;j<=3;j++)
        Mat44[i][j]=Matrix(i,j);
  
    Output->setMatrix(Mat44);
    return 1;
  }

}


/** Computes best fit Landmark Transformation (see VTK/VTKLandmarkTransform.cxx) given two sets of points
 * @param RawSourceLandmarks the source points (Nx3)
 * @param RawTargetLandmarks the target points (Nx3)
 * @param mode 0=rigid,1=similarity,2=affine
 * @param Output the output Matrix Transformation
 * @return 1 if success 0 if failed
 */
// BIS: { 'computeLandmarkTransformWASM', 'bisLinearTransformation', [ 'bisMatrix', 'bisMatrix', 'ParamObj', 'debug' ] }
unsigned char* computeLandmarkTransformWASM(unsigned char* source_ptr, unsigned char* target_ptr,const char* jsonstring,int debug) {

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  int mode=params->getIntValue("mode",2);
  if (debug)
    std::cout << "mode=" << mode << std::endl;

  
  std::unique_ptr<bisSimpleMatrix<float> > source(new bisSimpleMatrix<float>("source_points_json"));
  if (!source->linkIntoPointer(source_ptr))
    return 0;

  std::unique_ptr<bisSimpleMatrix<float> > target(new bisSimpleMatrix<float>("target_points_json"));
  if (!target->linkIntoPointer(target_ptr))
    return 0;

  std::unique_ptr<bisMatrixTransformation> output(new bisMatrixTransformation("output_matrix"));

  
  int result=bisPointRegistrationUtils::computeLandmarkTransformation(source.get(),
                                                                      target.get(),
                                                                      mode,
                                                                      output.get());

  if (debug)
    std::cout << "Computed ok=" << result << std::endl;
  
  if (result==0) {
    return 0;
  }

  std::unique_ptr<bisSimpleMatrix<float> > matrix=output->getSimpleMatrix("outmatrix");
  return matrix->releaseAndReturnRawArray();

}



/** Test Point Locator
 * @param RawPoints the source points (Nx3)
 * @param paramobj { mode 0=nearest,1=threshold, threshold = 5.0, x,y,z = point, l=length }
 * @param Output the output points
 */
// BIS: { 'testPointLocatorWASM', 'Matrix', [ 'Matrix', 'ParamObj', 'debug' ] }
unsigned char* testPointLocatorWASM(unsigned char* source_ptr,const char* jsonstring,int debug) {

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;

  int mode=params->getIntValue("mode",0);
  float threshold=params->getFloatValue("threshold",5.0);
  float x[3];
  x[0]=params->getFloatValue("x",0.0);
  x[1]=params->getFloatValue("y",0.0);
  x[2]=params->getFloatValue("z",0.0);

  float length=params->getFloatValue("length",10.0);
  if (debug)
    std::cout << "mode=" << mode << ", threshold=" << threshold << " target=(" << x[0] << "," << x[1] << "," << x[2] << ")" << " length=" << length <<  std::endl;

  
  std::shared_ptr<bisSimpleMatrix<float> > source(new bisSimpleMatrix<float>("source_points_json"));
  if (!source->linkIntoPointer(source_ptr))
    return 0;



  bisPointLocator* locator=new bisPointLocator();
  locator->initialize(source,length);
  
  if (mode<1)
    {
      std::unique_ptr<bisSimpleMatrix<float> > output_points(new bisSimpleMatrix<float>("output_points"));
      float y[3];
      if (debug)
        std::cout << "Looking for nearest point to " << x[0] << "," << x[1] << "," << x[2] << std::endl;
      int ok=locator->getNearestPoint(x,y,debug);
      output_points->zero(1,3);
      float* out=output_points->getData();
      out[0]=y[0];
      out[1]=y[1];
      out[2]=y[2];
      delete locator;
      return output_points->releaseAndReturnRawArray();
    }
  
  std::vector<int> plist;
  if (debug)
    std::cout << "Looking for point closer than " << threshold << " to " << x[0] << "," << x[1] << "," << x[2] << std::endl;
  
  int np=locator->getPointsWithinRadius(x,threshold,plist,debug);
  if (mode==1)
    {
      std::unique_ptr<bisSimpleMatrix<float> > output_points(new bisSimpleMatrix<float>("output_points"));
      if (np>0) {
        output_points->zero(np,3);
        float* inp=source->getData();
        float* out=output_points->getData();
        for (int i=0;i<np;i++) {
          int index=plist[i];
          for (int ia=0;ia<=2;ia++) 
            out[i*3+ia]=inp[index*3+ia];
        }
      } else {
        output_points->zero(1,1);
      }
      delete locator;
      return output_points->releaseAndReturnRawArray();
    }
  
  std::unique_ptr<bisSimpleMatrix<int> > output_indices(new bisSimpleMatrix<int>("output_indices"));
  if (np>0) {
    output_indices->zero(np,1);
    int* out=output_indices->getData();
    for (int i=0;i<np;i++) 
      out[i]=plist[i];
  } else {
    output_indices->zero(1,1);
    int* out=output_indices->getData();
    out[0]=-1;
  }
  delete locator;
  return output_indices->releaseAndReturnRawArray();
}
