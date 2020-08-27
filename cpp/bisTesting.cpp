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

#include "bisTesting.h"
#include "bisEigenUtil.h"
#include "bisUtil.h"
#include "bisSimpleDataStructures.h"
#include "bisSurface.h"
#include "bisExportedFunctions.h"
#include "bisJointHistogram.h"
#include "bisJSONParameterList.h"
#include "bisComboTransformation.h"
#include "bisLinearTransformation.h"
#include "bisLegacyFileSupport.h"
#include <iostream>
#include <memory>
#include <iostream>
#include <cstdio>
#include <math.h>
#include <Eigen/Dense>

// Yale was founded in 1701
// If Web Assembly return 1701 , else 1700 (C)
int test_wasm()
{
#ifdef BISWASM
  return 1701;
#else
  return 1700;
#endif
}





int redirect_stdout(const char* fname)
{
#ifdef BISWASM
  std::cout << "+++++ Redirecting output disabled for WASM" << std::endl;
  return 0;
#endif
  
  FILE* fout;
  if (strlen(fname)<1)
    fout=freopen("bislog.txt","w",stdout);
  else
    fout=freopen(fname,"w",stdout);

  if (fout==0)
    {
      std::cerr << "Failed to open " << fname << "for logging " << std::endl;
      return 0;
    }
  
  std::cout << std::endl << "Hello from bisweb" << test_wasm() << std::endl;
  std::cout << "-------------------------------------------" << std::endl;
  return 1;
}
									

// ---------------------------------------------------------------------------
// Optimizer
// ---------------------------------------------------------------------------



// -------------------------------- Matrix 4x4 Stuff ------------------------------------

float test_matrix4x4(unsigned char* ptr,int ) {

  std::unique_ptr<bisSimpleMatrix<float> > matrix(new bisSimpleMatrix<float>("matrix"));
  if (!matrix->linkIntoPointer(ptr))
    {
      std::cerr << "Failed to deserialize matrix" << std::endl;
      return 10000.0;
    }

  bisUtil::mat44 mat;
  matrix->exportMatrix(mat);
  

  //  matrix = (1+row)*10.0+col*col*5.0
  float sum=0.0;
  for (int row=0;row<=3;row++)
    {
      std::cout << " row = " << row << "C [ ";
      for (int col=0;col<=3;col++) {
	std::cout << mat[row][col] << " ";
	sum+=powf( (1.0f+row)*10.0f+col*col*5.0f - mat[row][col],2.0f);
	mat[row][col]+=2.0f;
      }
      std::cout << "]" << std::endl;
    }

  std::cout << "Sum = " << sum << std::endl;
  
  return sum;
}



unsigned char*  test_create_4x4matrix(unsigned char* image1_ptr,
				      unsigned char* image2_ptr,
				      unsigned char* pvector_ptr,
				      const char*  jsonstring,
				      int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;
  
  if (debug)
    params->print();

  int mode=params->getIntValue("mode",2);
  
  std::unique_ptr<bisSimpleImage<short> > image1(new bisSimpleImage<short>("image1"));
  if (!image1->linkIntoPointer(image1_ptr))
    return 0;

  std::unique_ptr<bisSimpleImage<short> > image2(new bisSimpleImage<short>("image2"));
  if (!image2->linkIntoPointer(image2_ptr))
    return 0;


  std::unique_ptr<bisSimpleVector<float> > p_vect(new bisSimpleVector<float>("p_vect"));
  if (!p_vect->linkIntoPointer(pvector_ptr))
    return 0;

  // ---------------- now the real work ----------------

  int dim1[3],dim2[3];
  image1->getImageDimensions(dim1);
  image2->getImageDimensions(dim2);

  float spa1[3],spa2[3];
  image1->getImageSpacing(spa1);
  image2->getImageSpacing(spa2);


  std::vector<float> p_v(12);
  if (debug)
    std::cout << "____ param vector = [ ";
  for (int ia=0;ia<12;ia++) {
    if (debug)
      std::cout << p_vect->getData()[ia] << " ";
    p_v[ia]=p_vect->getData()[ia];
  }
  if (debug)
    std::cout << "]" << std::endl << "____ \t creating transformation mode=" << mode << std::endl;

  std::unique_ptr<bisLinearTransformation> xform(new bisLinearTransformation("linear xform"));
  xform->setMode(mode);
  xform->setShifts(dim1,spa1,dim2,spa2);
  xform->setParameterVector(p_v);
  std::cout << "xform: " << xform->getName() << ", " << xform->getClassName() << std::endl;

  if (debug)
    xform->printSelf();

  std::unique_ptr<bisSimpleMatrix<float> > matrix(xform->getSimpleMatrix("outmatrix"));
  return matrix->releaseAndReturnRawArray();
}


int test_eigenUtils(unsigned char* m_ptr,unsigned char* v_ptr,int )
{

  int numfailed=0;
  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!s_matrix->linkIntoPointer(m_ptr))
    {
      std::cerr << "Failed to deserialize matrix" << std::endl;
      return -1;
    }

  std::unique_ptr<bisSimpleVector<float> > s_vector(new bisSimpleVector<float>("vector"));
  if (!s_vector->linkIntoPointer(v_ptr))
    {
      std::cerr << "Failed to deserialize vector" << std::endl;
      return -1;
    }

  
  Eigen::MatrixXf mat1=bisEigenUtil::mapToEigenMatrix(s_matrix.get());
  std::cout << "Eigen matrix=" << mat1 << std::endl;


  Eigen::VectorXf vect1=bisEigenUtil::mapToEigenVector(s_vector.get());
  std::cout << "Eigen vector=" << vect1 << std::endl;

  //  matrix = (1+row)*10.0+col*col*5.0
  double sum=0.0;
  for (int row=0;row<=3;row++)
    {
      std::cout << " row = " << row << "C [ ";
      for (int col=0;col<=3;col++) {
	std::cout << mat1(row,col) << " ";
	sum+=powf( (1.0f+row)*10.0f+col*col*5.0f - mat1(row,col),2.0f);
      }
      std::cout << "]" << std::endl;
    }

  std::cout << "Sum = " << sum << std::endl;
  if (sum>0.001)
    numfailed+=1;

  std::cout << "So far numfailed=" << numfailed << std::endl;

  float m[16]= { 3000,   3500,5000,7500,
		 3500,4100,5900,8900,
		 5000,5900,8600,13100,
		 7500,8900,13100,20100};
  
  Eigen::MatrixXf BtB= mat1.transpose()*mat1;
  std::cout << "BtB = " << BtB << std::endl;

  sum=0.0;
  for (int i=0;i<=3;i++)
    for (int j=0;j<=3;j++)
      sum+=fabs(m[i*4+j]-BtB(i,j));

  std::cout << "Sum BtB = " << sum << std::endl;
  if (sum>0.001)
    numfailed+=1;

  std::cout << "So far numfailed=" << numfailed << std::endl;

  Eigen::MatrixXf A=Eigen::MatrixXf::Zero(8,2);
  
  Eigen::VectorXf b=Eigen::VectorXf::Zero(8);
  bisUtil::initializeRandomSeed();
  
  for (int i=0;i<=7;i++)
    {
      A(i,0)=2;
      A(i,1)=i;
      b(i)=(float)(A(i,0)+2*A(i,1)+0.01f*bisUtil::gaussianRandom());
    }

  std::cout << "Initialized A=" << A << std::endl << "b=" << b.transpose() << std::endl;
  Eigen::MatrixXf At=A.transpose();
  Eigen::MatrixXf AtA=At*A;
  Eigen::MatrixXf LSQ= ((At*A).inverse())*At;
  Eigen::VectorXf x=LSQ*b;
  
  std::cout << "Result of LSQ (should be 1,2) = " << x.transpose() << std::endl;

  sum=fabs(x(0)-1.0)+fabs(x(1)-2.0);
  if (sum>0.1)
    numfailed+=1;

  std::cout << "Returning numfailed=" << numfailed << std::endl;

  return numfailed;
    
    
}


float test_matlabParse(unsigned char* f_ptr,unsigned char* m_ptr,const char* name,int debug)
{

  std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("matrix"));
  if (!s_matrix->linkIntoPointer(m_ptr))
    {
      std::cerr << "Failed to deserialize matrix" << std::endl;
      return 1000.0;
    }

  std::unique_ptr<bisSimpleVector<unsigned char> > s_vector(new bisSimpleVector<unsigned char>("mat_vector"));
  if (!s_vector->linkIntoPointer(f_ptr))
    {
      std::cerr << "Failed to deserialize vector from mat stuff" << std::endl;
      return 1000.0;
    }

  std::string name_s=name;
  
  int ok=0;
  Eigen::MatrixXf mat=bisEigenUtil::importFromMatlabV6(s_vector->getData(),s_vector->getLength(),name_s,debug,ok);
  std::cout << "Ok=" << ok << std::endl;
  if (ok==0)
    return 1000.0;

  std::cout << std::endl;
  std::cout << "Matrix = " << mat << std::endl;
  Eigen::MatrixXf mat_orig=bisEigenUtil::mapToEigenMatrix(s_matrix.get());

    std::cout << std::endl;
  std::cout << "Matrix Orig = " << mat_orig << std::endl;

  Eigen::MatrixXf diffmat=(mat_orig-mat);


  std::cout << std::endl;
  std::cout << "Diff Mat = " << diffmat << std::endl;

  float maxv=diffmat.maxCoeff();
  float minv=diffmat.minCoeff();

  std::cout << "Difference Range=" << minv << ":" << maxv << std::endl;
  
  return bisUtil::fmax(-minv,maxv);

}


// ------------------------------
// Grid Transformation Tests
// ------------------------------
int test_bendingEnergy(unsigned char* ptr,int )
{
  std::unique_ptr<bisComboTransformation> combo(new bisComboTransformation("combo_input"));
  if (!combo->deSerialize(ptr))
    return 0;

  std::cout << "Number of Grids = " << combo->getNumberOfGridTransformations() << std::endl;

  std::shared_ptr<bisGridTransformation> grid=combo->getGridTransformation(0);

  //From TCL
  //Bending at 144=0.00138214 , total= 0.512895
  //Bending at 200=0.000366777 , total= 0.512895
  //Bending at 256=0.00116382 , total= 0.512895

  int index[14] = { -1  ,
		    144 ,
		    200 ,
		    256 ,
		    0   ,
		    56  ,
		    112 ,
		    168 ,
		    224 ,
		    27  ,
		    83  ,
		    139 ,
		    195 ,
		    251 };

  float gold_ben[14]= { 0.512895f,
			0.00138214f,
			0.000366777f,
			0.00116382f,
			0.00011539f,
			0.000219315f,
			0.000417532f,
			0.00032968f,
			0.000179131f,
			0.000321876f,
			0.000767743f,
			0.000615692f,
			0.000766792f,
			0.00115052f };

  float results[14];
  results[0]=grid->getTotalBendingEnergy();
  for (int i=1;i<=13;i++)
    results[i]=grid->getBendingEnergyAtControlPoint(index[i]);

  int numfailed=0;
  for (int i=0;i<=13;i++)
    {
      double sum=fabs(gold_ben[i]-results[i]);
      if (sum>0.01)
	++numfailed;
      std::cout << "Test " << i << " index=" << index[i] << " legacy_result=" << gold_ben[i] << " vs n_e_w=" <<  results[i] << " diff=" << sum << std::endl;
    }
      
  return numfailed;
}

int test_PTZConversions(int debug)
{
  // As computed in vtkpxMath
  double pval[15]={0.1, 0.01, 0.05, 0.001, 0.005, 0.1, 0.01, 0.05, 0.001, 0.005, 0.1, 0.01, 0.05, 0.001, 0.005 };
  int dfval[15]= { 10, 10, 10, 10, 10, 100, 100, 100, 100, 100, 1000, 1000, 1000, 1000, 1000 };
  double tval[15] = { 1.80957, 3.17383, 2.23022, 4.58936, 3.58398, 1.66309, 2.62598, 1.98535, 3.38477, 2.87207, 1.64551, 2.5791, 1.96191, 3.30273, 2.81348 };
  double zval[15]= {  1.64551, 2.57324, 1.96191, 3.29102, 2.80762, 1.64551, 2.57324, 1.96191, 3.29102, 2.80762, 1.64551, 2.57324, 1.96191, 3.29102, 2.80762 };
  int num=15;

  int numfailed=0;
  for (int i=0;i<num;i++)
    {
      double p=pval[i];
      int df=dfval[i];

      if (debug)
	std::cout << std::endl << "Beginning " << i+1 << " p=" << p << " df=" << df << ", t=" << tval[i] << std::endl;

      double t=bisUtil::PvalueToTvalue(p,df);
	      
      double pt=bisUtil::TvalueToPvalue(t,df);

      double z=bisUtil::PvalueToZscore(p);
      double pz=bisUtil::ZscoreToPvalue(zval[i]);
      //double z=0.0;
      
      double sum=fabs(t-tval[i])+fabs(pt-p)+fabs(pz-p)+fabs(z- zval[i]);
      std::cout << "Test " << i+1  << ".  p,df=" << p << "," << df << " -t-> " << t << " -->p " << pt << "\t sum=" << sum << std::endl;
      std::cout << "\t  p,df=" << p << "," << df << " -z-> " << z << " -->pz " << pz << "\t\t error1=" << fabs(p-pt) << "\t error=" << sum << std::endl;
      
      if (sum>0.01)
	numfailed+=1;
    }

  std::cout << "Number of Failed=" << numfailed << std::endl;
  
  return numfailed;
}

int test_eigenUtilOperations(int debug)
{
  if (debug)
    std::cout << "Testing Eigen Operations vs actual Eigen" << std::endl;


  int numfailed=0;

  for (int p=0;p<=3;p++)
    {
      if (debug)
	std::cout << "pass = " << p << std::endl;

      Eigen::MatrixXf a = Eigen::MatrixXf::Random(5+p,3);
      Eigen::MatrixXf b = Eigen::MatrixXf::Random(3,2+p);
      Eigen::MatrixXf c = Eigen::MatrixXf::Random(2+p,4+2*p);
      
      
      Eigen::MatrixXf c1;
      Eigen::MatrixXf c2;
      
      c1=a*b;
      bisEigenUtil::inPlaceMultiply(a,b,c2);
      Eigen::MatrixXf diff=(c1-c2);
      
      if (debug && p==0)
	{
	  std::cout << "c1=\t" << c1 << std::endl << std::endl;
	  std::cout << "c2=\t" << c2 << std::endl << std::endl;
	  std::cout << "diff\t" << diff << std::endl << std::endl;
	}

      int sz[2]; bisEigenUtil::getMatrixDimensions(a,sz);
      
      std::cout << "\t Double " << sz[0] << "," << sz[1] << ", diff range=" << diff.minCoeff() << ":" << diff.maxCoeff() << std::endl;

      if (diff.maxCoeff()>0.01 || diff.minCoeff()<-0.01)
	numfailed+=1;
  
      
      Eigen::MatrixXf d1=a*b*c;
      Eigen::MatrixXf d2; bisEigenUtil::inPlaceMultiply3(a,b,c,d2);
      Eigen::MatrixXf diff3=(d1-d2);
      
      if (debug && p==0)
	{
	  std::cout << "d1=\t" << d1 << std::endl << std::endl;
	  std::cout << "d2=\t" << d2 << std::endl << std::endl;
	  std::cout << "diff3\t" << diff3 << std::endl << std::endl;
	}

      std::cout << "\t Triple " << sz[0] << "," << sz[1] << " diff3 range=" << diff3.minCoeff() << ":" << diff3.maxCoeff() << std::endl;
      
      if (diff3.maxCoeff()>0.01 || diff3.minCoeff()<-0.01)
	numfailed+=1;
    }

  if (debug)
    std::cout << "Num Failed = " << numfailed << std::endl;
  return numfailed;

}

unsigned char* test_mirrorComboTransformTextFileWASM(const char* input,int debug)
{

  std::unique_ptr<bisComboTransformation> combo(new bisComboTransformation());
  int ok=bisLegacyFileSupport::parseLegacyGridTransformationFile(input,combo.get(),debug);

  if(debug)
    std::cout << " Parsed file for combo transformation status=" << ok << std::endl;

  std::string s=bisLegacyFileSupport::writeLegacyGridTransformationFile(combo.get(),debug);

  std::unique_ptr<bisSimpleVector<char> > outvect(bisLegacyFileSupport::storeStringInSimpleVector(s));
  return outvect->releaseAndReturnRawArray();

}

// -------------------------------- Matrix 4x4 Stuff ------------------------------------
// Compute Joint Histogram Metrics
// jsonstring = { numbinsx: 64, numbinst: 64, intscale:1, metric:3 } (3=NMI)
unsigned char*  test_compute_histo_metric(unsigned char* image1_ptr,
					  unsigned char* image2_ptr,
					  unsigned char* weight1_ptr,
					  unsigned char* weight2_ptr,
					  int num_weights,
					  const char* jsonstring,
					  int return_histogram,
					  int debug)
{

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList("params"));
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if (debug)
    params->print();
  std::unique_ptr<bisSimpleImage<short> > image1(new bisSimpleImage<short>("image1"));
  if (!image1->linkIntoPointer(image1_ptr))
    return 0;

  std::unique_ptr<bisSimpleImage<short> > image2(new bisSimpleImage<short>("image2"));
  if (!image2->linkIntoPointer(image2_ptr))
    return 0;

  std::unique_ptr<bisSimpleImage<short> > weight1(new bisSimpleImage<short>());
  std::unique_ptr<bisSimpleImage<short> > weight2(new bisSimpleImage<short>());

  short* weight1_data=0;
  short* weight2_data=0;
  
  if (num_weights>0) 
    {
      if (!weight1->linkIntoPointer(weight1_ptr))
	return 0;
      weight1_data=weight1->getData();
    }


  if (num_weights>1)
    {
      if (!weight2->linkIntoPointer(weight2_ptr))
	return 0;
      weight2_data=weight2->getData();
    }

  std::cout << "num_weights=" << num_weights << std::endl;


  if (debug)
    std::cout << "Data= " << weight1_data << "," << weight2_data << " num_weights=" << num_weights << std::endl;
  

  int numbinsx=params->getIntValue("numbinsx",64);
  int numbinsy=params->getIntValue("numbinsy",64);
  //  int metric=params->getIntValue("metric",3);
  int intscale=params->getIntValue("intscale",1);

  int dim[3]; image1->getImageDimensions(dim);
  int bounds[6];
  for (int ia=0;ia<=2;ia++)
    {
      bounds[2*ia]=0;
      bounds[2*ia+1]=dim[ia]-1;
    }

  if (debug) {
    std::cout << "Image Dims = " << dim[0] << "," << dim[1] << "," << dim[2] << std::endl;
    std::cout << "Image Bounds = " << bounds[0] << ":" << bounds[1] << ", " << bounds[2] << ":" << bounds[3]
	      << ", " << bounds[4] << ":" << bounds[5] << std::endl;
    std::cout << " values at 55=" << image1->getData()[55] << "," << image2->getData()[55] << std::endl;
  }
  std::unique_ptr<bisJointHistogram> histo(new bisJointHistogram());
  if (debug)
    std::cout << "Allocating histogram " << numbinsx << "*" << numbinsy << " with scale=" << intscale << std::endl;
  
  histo->initialize(numbinsx,numbinsy,intscale);

  if (num_weights==0)
    {
      if (debug)
	std::cout << "Calling unweighted" << std::endl;
      histo->fillHistogram(image1->getData(),image2->getData(),1.0,1,dim,bounds);
    }
  else
    {
      if (debug)
	std::cout << "Calling weighted " << num_weights << std::endl;
      histo->weightedFillHistogram(image1->getData(),image2->getData(),
				   weight1_data,weight2_data,num_weights,
				   1.0,1,dim,bounds);
    }

  if (!return_histogram)
    {
      std::unique_ptr<bisSimpleMatrix<float> > results(new bisSimpleMatrix<float>());
      results->allocate(1,8);
  
      float* data=results->getData();
      
      data[0]=(float)histo->computeSSD();
      data[1]=(float)histo->computeCC();
      data[2]=(float)histo->computeNMI();
      data[3]=(float)histo->computeMI();
      data[4]=(float)histo->entropyX();
      data[5]=(float)histo->entropyY();
      data[6]=(float)histo->jointEntropy();
      data[7]=(float)histo->getnumsamples();
      
      // if (debug) {
      std::cout.precision(3);
      std::cout << "Computed metrics: SSD=" << data[0] << ", CC=" << data[1] << ", MI=" << data[2] << ", NMI=" << data[3] << std::endl;
      std::cout << "Partials: e1=" << data[4] << ", e2=" << data[5] << ", joint=" << data[6] << ", numsamples=" << data[7] << std::endl;
      //      }

      return results->releaseAndReturnRawArray();
    }

  std::unique_ptr<bisSimpleMatrix<float> > outmat(histo->exportHistogram("histo_matrix"));
  return outmat->releaseAndReturnRawArray();
}


// ------- Surface ------- Surface ------- Surface ------- Surface ------- Surface ------- Surface 
unsigned char* test_shiftSurfaceWASM(unsigned char* input,const char* jsonstring,int debug) {

  std::cout << "Starting test_ShiftSurface" << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;
  
  params->print();

  float shiftpoints=params->getFloatValue("shiftpoints",2.0);
  int shiftindices=params->getIntValue("shiftindices",3);
  std::cout << "Shift_points=" << shiftpoints << ", Shift_indices=" << shiftindices << std::endl;

  std::unique_ptr<bisSurface > surface(new bisSurface("surface"));
  if (!surface->deSerialize(input))
    {
      std::cerr << "Failed to deserialize surface" << std::endl;
      return 0;
    }

  std::shared_ptr<bisSimpleMatrix<float> > pts=surface->getPoints();
  float* ptdata=pts->getData();
  int rows=pts->getNumRows();
  int cols=pts->getNumCols();
  if (debug)
    std::cout << "Deserialized Points:" << rows << "*" << cols << " points." << std::endl;
  for (int ia=0;ia<rows;ia++) {
    ptdata[ia*3+0]=ptdata[ia*3+0]+shiftpoints;
    ptdata[ia*3+1]=ptdata[ia*3+1]+shiftpoints+1.0;
    ptdata[ia*3+2]=ptdata[ia*3+2]+shiftpoints+2.0;
  }

  std::shared_ptr<bisSimpleMatrix<int> > tris=surface->getTriangles();
  int* tridata=tris->getData();
  int rows2=tris->getNumRows();
  int cols2=tris->getNumCols();
  std::cout << "Deserialized Triangles:" << rows2 << "*" << cols2 << " indices." << std::endl;
  for (int ia=0;ia<rows2;ia++) {
    tridata[ia*3+0]=tridata[ia*3+0]+shiftindices;
    tridata[ia*3+1]=tridata[ia*3+1]+shiftindices+1;
    tridata[ia*3+2]=tridata[ia*3+2]+shiftindices+2;
  }


  unsigned char* pointer=surface->serialize();
  return pointer;
}
