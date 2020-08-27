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


  int isPointSetValid(bisSimpleMatrix<float>* Points,
                      int minrows,
                      int numcols,
                      int debug) {
    
    if (Points==NULL) {
      if (debug)
        std::cout << "__ NULL input matrix set " << std::endl;
      return 0;
    }
    
    int N_PTS = Points->getNumRows();
    int N_COLS= Points->getNumCols();
    if (N_PTS < minrows ||    N_COLS != numcols  ) {
      if (debug) 
        std::cout << "Update: Matrix not valid " << N_PTS << "*" << N_COLS << std::endl;
      return 0;
    }
    
    return N_PTS;
  }
  
  int computeCentroid(bisSimpleMatrix<float>* Points,
                      float centroid[3],
                      int debug) {
    

    for (int ia=0;ia<=2;ia++)
      centroid[ia]=0.0;
    
    int N_PTS=isPointSetValid(Points,2,3,debug);
    if (N_PTS<1)
      return 0;

    float* inp=Points->getData();
    for (int pt=0;pt<N_PTS;pt++) {
      for (int ia=0;ia<=2;ia++)
        centroid[ia]=centroid[ia]+inp[pt*3+ia];
    }

    for (int ia=0;ia<=2;ia++)
      centroid[ia]/=float(N_PTS);
    
    return 1;
  }


  // ----------------------------------------------------------------------------------------------------
  // transform Points by transformation
  // ----------------------------------------------------------------------------------------------------
  bisSimpleMatrix<float>* transformPoints(bisSimpleMatrix<float>* Input,
                                          bisAbstractTransformation* Transformation,
                                          int debug) {

    if (Transformation == NULL) {
      std::cout << "NULL transformation in transformPoints " << std::endl;
        return NULL;
      }
    
    int N_PTS=isPointSetValid(Input);
    if (N_PTS==0) {
      std::cout << "Bad points =" << N_PTS << std::endl;
      return NULL;
    }
    
    if (debug) {
      std::cout << "___ Transforming " << N_PTS << " points with " << Transformation->getClassName() << std::endl;
      std::cout << "___ Transforming " << N_PTS << " points with " << Input->getNumRows() << "*" << Input->getNumCols() << std::endl;
    }
    
    bisSimpleMatrix<float>* Output=new bisSimpleMatrix<float>();
    Output->zero(N_PTS,3);
    float* inp=Input->getData();
    float* out=Output->getData();

    for (int pt=0;pt<N_PTS;pt++)
      {
        int index=pt*3;
        float x[3],y[3];
        for (int ia=0;ia<=2;ia++)
          x[ia]=inp[index+ia];
        //if (pt>930)
        //std::cout << "pt=" << pt << " x=" << x[0] << "," << x[1] << "," << x[2] << " " << std::endl;
        Transformation->transformPoint(x,y);
        //if (pt>930) {
        //          std::cout << "--> y=" << y[0] << "," << y[1] << "," << y[2] << std::endl;
        //          std::cout << std::endl;
        //        }
        for (int ia=0;ia<=2;ia++)
          out[index+ia]=y[ia];
      }

    std::cout << "___ Transforming " << N_PTS << " points with " << Transformation->getClassName() << " done." << std::endl;
    
    return Output;
  }

  // ----------------------------------------------------------------------------------------------------
  float distance2(float x[3],float y[3]) {

    return powf(x[0]-y[0],2.0)+
      powf(x[1]-y[1],2.0)+
      powf(x[2]-y[2],2.0);
  }
  
    // ----------------------------------------------------------------------------------------------------
  // transform Points by transformation
  // ----------------------------------------------------------------------------------------------------
  float computeMappingError(bisSimpleMatrix<float>* Input,
                            bisSimpleMatrix<float>* Output,
                            bisAbstractTransformation* Transformation,
                            int debug) {
    
    if (Transformation == NULL) {
      std::cout << "NULL transformation in transformPoints " << std::endl;
      return -1.0;
    }

    int N_PTS=isPointSetValid(Input);
    if (N_PTS==0) {
       std::cerr << "Bad input point set" << std::endl;
       return -1.0;
    }
    
    if (!isPointSetValid(Output,N_PTS,3,0)) {
      std::cerr << "Bad target point set" << std::endl;
      return -1.0;
    }
    
    
    if (debug) 
      std::cout << "___ Transforming " << N_PTS << " points with " << Transformation->getClassName() << std::endl;
    
    float* inp=Input->getData();
    float* out=Output->getData();
    float sumdist2=0.0;
    
    for (int pt=0;pt<N_PTS;pt++) {
      float x[3],tx[3],y[3];
      for (int ia=0;ia<=2;ia++) {
        x[ia]=inp[pt*3+ia];
        y[ia]=out[pt*3+ia];
      }
      Transformation->transformPoint(x,tx);
      sumdist2+=distance2(tx,y);
    }

    return sqrt(sumdist2/float(N_PTS));
  }


  // ----------------------------------------------------------------------------------------------------
  // Compute Lnadmark Transform
  // ----------------------------------------------------------------------------------------------------
  int computeLandmarkTransformation(bisSimpleMatrix<float>* RawSourceLandmarks,
                                    bisSimpleMatrix<float>* RawTargetLandmarks,
                                    int mode,
                                    bisMatrixTransformation* OutputTransformation,
                                    bisSimpleVector<float>* RawWeights,
                                    int debug)
    
  {
    OutputTransformation->identity();

    if (!RawSourceLandmarks  || !RawTargetLandmarks) {
      std::cout << "Bad Inputs " << std::endl;
      return 0;
    }

    int N_PTS = RawSourceLandmarks->getNumRows();
    int N_COLS= RawSourceLandmarks->getNumCols();

    if (N_PTS != RawTargetLandmarks->getNumRows() ||
        N_COLS != RawTargetLandmarks->getNumCols() ||
        N_COLS !=3 ||
        N_PTS < 4) {
      std::cout << "Update: Source and Target Landmarks contain a different number of points or not enough points (" << N_PTS << "," << N_COLS <<")" << std::endl;
      return 0;
    }

    if (RawWeights) {
      if (RawWeights->getLength()!=N_PTS) {
        std::cout << "Bad Weights specified " << std::endl;
        return 0;
      }
    }
    
    if (debug) {
      std::cout << "___ Compute Landmark Transform: Source and Target Landmarks have the same number of points  (" << N_PTS << "," << N_COLS <<")" << std::endl;
      std::cout << "___ Mode = " << mode << std::endl;
      if (RawWeights)
        std::cout << "___ Using Weights " << std::endl;
    }
  
    Eigen::MatrixXf Source=bisEigenUtil::mapToEigenMatrix(RawSourceLandmarks);
    Eigen::MatrixXf Target=bisEigenUtil::mapToEigenMatrix(RawTargetLandmarks);
    Eigen::VectorXf Weights;
    if (RawWeights) {
      Weights=bisEigenUtil::mapToEigenVector(RawWeights);
    } else {
      Weights=Eigen::VectorXf::Zero(N_PTS);
      for (int i=0;i<N_PTS;i++)
        Weights(i)=1.0;
      std::cout << "___ Setting all weights to 1.0" << std::endl;
    }
      
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
    float sumw=0.0;
    for (int i = 0; i < N_PTS; i++) {
      float w=Weights(i);
      for (int ia=0;ia<=2;ia++) {
        source_centroid[ia] += Source(i,ia)*w;
        target_centroid[ia] += Target(i,ia)*w;
      }
      sumw+=w;
    }

    for (int ia=0;ia<=2;ia++) {
      source_centroid[ia] = source_centroid[ia]/ sumw;
      target_centroid[ia] = target_centroid[ia]/ sumw;
    }


    if (debug) {
      std::cout << "___ Source Centroid = " << source_centroid[0] << "," << source_centroid[1] << "," << source_centroid[2] << std::endl;
      std::cout << "___ Target Centroid = " << target_centroid[0] << "," << target_centroid[1] << "," << target_centroid[2] << std::endl;
      std::cout << "___ sumw = " << sumw << " N_PTS = " << N_PTS << std::endl;
    }
    
    // -- build the 3x3 matrix M --
  

    float M[3][3];
    float AAT[3][3];
    for (int i = 0; i < 3; i++)  {
      AAT[i][0] = M[i][0] = 0.0F; // fill M with zeros
      AAT[i][1] = M[i][1] = 0.0F;
      AAT[i][2] = M[i][2] = 0.0F;
    }
    
    float a[3], b[3];
    float sa = 0.0F, sb = 0.0F;
    for (int pt = 0; pt < N_PTS; pt++) {

      float wgt=Weights(pt);
      
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
        M[i][0] += wgt * a[i] * b[0];
        M[i][1] += wgt * a[i] * b[1];
        M[i][2] += wgt * a[i] * b[2];
        
        // for the affine transform, compute ((a.a^t)^-1 . a.b^t)^t.
        // a.b^t is already in M.  here we put a.a^t in AAT.
        if (mode == 2 ) { 
          AAT[i][0] += wgt * a[i] * a[0];
          AAT[i][1] += wgt * a[i] * a[1];
          AAT[i][2] += wgt * a[i] * a[2];
        }
      }
    // accumulate scale factors (if desired)
      sa += wgt*(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
      sb += wgt*(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]);
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
      OutputTransformation->setMatrix(Mat44);

      return 1;
    }

    Eigen::MatrixXf E_M=Eigen::MatrixXf(3,3);
    Eigen::MatrixXf E_AAT=Eigen::MatrixXf(3,3);
    for (int i=0;i<=2;i++) {
      for (int j=0;j<=2;j++) {
        E_M(i,j)=M[i][j];
        E_AAT(i,j)=AAT[i][j];
      }
    }
    
    Eigen::MatrixXf OutputMatrix(4,4);
    OutputMatrix(3,3)=1;
    
  
    if (mode == 2)
      {
        E_M=E_AAT.inverse()*E_M;
        // Matrix = M^t
        for (int i = 0; i < 3; ++i)
          for (int j = 0; j < 3; ++j)
            OutputMatrix(i,j) = E_M(j,i);
      }
    else
      {
        // compute required scaling factor (if desired)
        float scale = (float)sqrt(sb / sa);
        if (debug)
          std::cout << "___ Scale=" << scale << std::endl;
        
        float N[4][4];
        for (int i = 0; i < 4; i++) {
          N[i][0] = 0.0F; // fill N with zeros
          N[i][1] = 0.0F;
          N[i][2] = 0.0F;
          N[i][3] = 0.0F;
        }
        // on-diagonal elements
        N[0][0] = M[0][0] + M[1][1] + M[2][2];
        N[1][1] = M[0][0] - M[1][1] - M[2][2];
        N[2][2] = -M[0][0] + M[1][1] - M[2][2];
        N[3][3] = -M[0][0] - M[1][1] + M[2][2];
        // off-diagonal elements
        N[0][1] = N[1][0] = M[1][2] - M[2][1];
        N[0][2] = N[2][0] = M[2][0] - M[0][2];
        N[0][3] = N[3][0] = M[0][1] - M[1][0];
        
        N[1][2] = N[2][1] = M[0][1] + M[1][0];
        N[1][3] = N[3][1] = M[2][0] + M[0][2];
        N[2][3] = N[3][2] = M[1][2] + M[2][1];
        
        // -- build the 4x4 matrix N --
        Eigen::MatrixXf NMat(4,4);
        for (int i=0;i<=3;i++)
          for (int j=0;j<=3;j++)
            NMat(i,j)=N[i][j];
          
      
        Eigen::SelfAdjointEigenSolver<Eigen::MatrixXf> eigensolver(NMat);
        Eigen::MatrixXf eigenvectors=eigensolver.eigenvectors();
        Eigen::VectorXf eigenvalues=eigensolver.eigenvalues();

        if (debug) { 
          std::cout << "___ Eigenvalues=" << eigenvalues << std::endl << std::endl;
          std::cout << "___ Eigenvectors=" << eigenvectors << std::endl;
        }

        float maxeigen=eigenvalues(0);
        int maxindex=0;
        for (int i=1;i<=3;i++) {
          if (eigenvalues(i)>maxeigen) {
            maxeigen=eigenvalues(i);
            maxindex=i;
          }
        }

        if (debug) 
          std::cout << "___ Max Eigen value=" << maxeigen << "( at index=" << maxindex << ")" << std::endl;
        
        
        // the eigenvector with the largest eigenvalue is the quaternion we want
        // (they are sorted in decreasing order for us by JacobiN)
        // Find largest eigenvalue
        float w = eigenvectors(0,maxindex);
        float x = eigenvectors(1,maxindex);
        float y = eigenvectors(2,maxindex);
        float z = eigenvectors(3,maxindex);
      
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
      
        OutputMatrix(0,0) = ww + xx - yy - zz;
        OutputMatrix(1,0) = 2.0 * (wz + xy);
        OutputMatrix(2,0) = 2.0 * (-wy + xz);
      
        OutputMatrix(0,1) = 2.0 * (-wz + xy);
        OutputMatrix(1,1) = ww - xx + yy - zz;
        OutputMatrix(2,1) = 2.0 * (wx + yz);
      
        OutputMatrix(0,2) = 2.0 * (wy + xz);
        OutputMatrix(1,2) = 2.0 * (-wx + yz);
        OutputMatrix(2,2) = ww - xx - yy + zz;

        if (mode != 0) {
          std::cout << "___ Adding Scale=" << scale << std::endl;
          // add in the scale factor (if desired)
          for (int i = 0; i < 3; i++)
            {
              OutputMatrix(i,0) *= scale;
              OutputMatrix(i,1) *= scale;
              OutputMatrix(i,2) *= scale;
            }
        }
      }
  
    // the translation is given by the difference in the transformed source
    // centroid and the target centroid
    float sx = OutputMatrix(0,0) * source_centroid[0] +    OutputMatrix(0,1) * source_centroid[1] +    OutputMatrix(0,2) * source_centroid[2];
    float sy = OutputMatrix(1,0) * source_centroid[0] +    OutputMatrix(1,1) * source_centroid[1] +    OutputMatrix(1,2) * source_centroid[2];
    float sz = OutputMatrix(2,0) * source_centroid[0] +    OutputMatrix(2,1) * source_centroid[1] +    OutputMatrix(2,2) * source_centroid[2];
  
    OutputMatrix(0,3) = target_centroid[0] - sx;
    OutputMatrix(1,3) = target_centroid[1] - sy;
    OutputMatrix(2,3) = target_centroid[2] - sz;

    // fill the bottom row of the 4x4 matrix
    OutputMatrix(3,0) = 0.0;
    OutputMatrix(3,1) = 0.0;
    OutputMatrix(3,2) = 0.0;
    OutputMatrix(3,3) = 1.0;

    if (debug)
      std::cout << "___ Output = " << OutputMatrix << std::endl;
    
    bisUtil::mat44 Mat44;
    for (int i=0;i<=3;i++)
      for (int j=0;j<=3;j++)
        Mat44[i][j]=OutputMatrix(i,j);
  
    OutputTransformation->setMatrix(Mat44);
    return 1;
  }

  // ----------------------------------------------------------------------------------------------------------------
  // Print Utilities

  void printTwoPoints(bisSimpleMatrix<float>* pts,std::string name) {
    int rows=pts->getNumRows();
    int cols=pts->getNumCols();
    float* data=pts->getData();
    int index=3*(rows/2);
    std::cout << "Set = " << name << " " << rows << "*" << cols << std::endl;
    if (cols==3) {
      int ia=0;
      std::cout << "       Point " << int(ia) << "=" << data[3*ia] << "," << data[3*ia+1] << "," << data[3*ia+2] << std::endl;
      ia=rows/2;
      std::cout << "       Point " << int(ia) << "=" << data[3*ia] << "," << data[3*ia+1] << "," << data[3*ia+2] << std::endl;
    } else {
      std::cout << "       Point 0=" << data[0] << std::endl;
      std::cout << "       Point " << int(rows/2) << "=" << data[index] << std::endl;
    }
    std::cout << std::endl;
  }

  void printJointPoints(bisSimpleMatrix<float>* pts,bisSimpleMatrix<float>* pts2,bisSimpleVector<float>* wv,std::string name,int incr) {
    int rows=pts->getNumRows();
    int cols=pts->getNumCols();
    float* data=pts->getData();
    float* data2=pts2->getData();
    float* w=wv->getData();
  
    std::cout << "Set = " << name << " " << rows << "*" << cols << std::endl;
    if (cols==3) {
      for (int ia=0;ia<rows;ia+=incr) {
        std::cout << "       Point " << int(ia) << "=" << data[3*ia] << "," << data[3*ia+1] << "," << data[3*ia+2];
        std::cout << "  --> "<< data2[3*ia] << "," << data2[3*ia+1] << "," << data2[3*ia+2] << " (w=" << w[ia] << ")" << std::endl;
      }
    }
    std::cout << std::endl;
  } 
  
  void printTwoElements(bisSimpleVector<float>* pts,std::string name) {
    int rows=pts->getLength();
    float* data=pts->getData();
    std::cout << "Set = " << name << " " << rows << std::endl;
    std::cout << "       Point 0=" << data[0] << std::endl;
    std::cout << "       Point " << int(rows/2) << "=" << data[rows/2] << std::endl;
    std::cout << std::endl;
  }


  void printMatrix(bisMatrixTransformation* xform, std::string name) {
    bisUtil::mat44 m;
    std::cout << " " << name << " = ";
    xform->getMatrix(m);
    for (int ia=0;ia<=3;ia++) {
      std::cout << "[ " ;
      for (int ib=0;ib<=3;ib++) {
        std::cout << m[ia][ib] << " ";
      }
      std::cout << "]" << std::endl << "  ";
    }
    std::cout << std::endl;
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
    std::cout << "___ mode=" << mode << std::endl;

  
  std::unique_ptr<bisSimpleMatrix<float> > source(new bisSimpleMatrix<float>("source_points_json"));
  if (!source->linkIntoPointer(source_ptr))
    return 0;

  if (debug)
    std::cout << "___ Ref Allocated = " << source->getNumRows() << "*" << source->getNumCols() << std::endl;
  
  std::unique_ptr<bisSimpleMatrix<float> > target(new bisSimpleMatrix<float>("target_points_json"));
  if (!target->linkIntoPointer(target_ptr))
    return 0;

  if (debug) 
    std::cout << "___ Target Allocated = " << target->getNumRows() << "*" << target->getNumCols() << std::endl;

  std::unique_ptr<bisMatrixTransformation> output(new bisMatrixTransformation("output_matrix"));

  
  int result=bisPointRegistrationUtils::computeLandmarkTransformation(source.get(),
                                                                      target.get(),
                                                                      mode,
                                                                      output.get(),
                                                                      NULL,
                                                                      debug);

  if (debug)
    std::cout << "___ Computed ok=" << result << std::endl;
  
  if (result==0) {
    return 0;
  }


  std::unique_ptr< bisSimpleMatrix<float> > raw_output (output->getSimpleMatrix());
  return raw_output->releaseAndReturnRawArray();

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
  locator->initialize(source,length,debug);
  
  if (mode<1)
    {
      std::unique_ptr<bisSimpleMatrix<float> > output_points(new bisSimpleMatrix<float>("output_points"));
      float y[3];
      if (debug)
        std::cout << "Looking for nearest point to " << x[0] << "," << x[1] << "," << x[2] << std::endl;

      locator->getNearestPoint(x,y,debug);
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
