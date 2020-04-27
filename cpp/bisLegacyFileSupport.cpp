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

#include "bisUtil.h"
#include "bisLegacyFileSupport.h"
#include "bisEigenUtil.h"
#include <Eigen/Dense>
#include "bisImageAlgorithms.h"
#include "bisComboTransformation.h"
#include <vector>

namespace bisLegacyFileSupport {

  std::vector<std::string> splitString(const std::string& str, const std::string& delim)
  {
    std::vector<std::string> tokens;
    size_t prev = 0, pos = 0;
    do
      {
        pos = str.find(delim, prev);
        if (pos == std::string::npos) pos = str.length();
        std::string token = str.substr(prev, pos-prev);
        if (!token.empty()) tokens.push_back(token);
        prev = pos + delim.length();
      }
    while (pos < str.length() && prev < str.length());
    return tokens;
  }

  // Store Data in String
  bisSimpleVector<char>* storeStringInSimpleVector(std::string& s)
  {
    bisSimpleVector<char>*  outvect=new bisSimpleVector<char>();

    const char* outstring=s.c_str();
    int len=strlen(outstring);
    outvect->allocate(len+1);
    outvect->fill(0);
    
    char* outdata=outvect->getData();
    strcpy(outdata,outstring);

    return outvect;

  }

  /** return a matrix from a .matr file (either octave style or straight up 4x4 matrix)
   * @param input string containing text file
   * @param output the output matrix
   * @param debug if > 0 print debug messages
   * @returns 1 if success 0 if failed
   */
  int parseMatrixTextFile(const char* text,Eigen::MatrixXf& output,int debug)
  {
    
    std::string s=text;
    const std::string d="\n";
    std::vector<std::string> lines=splitString(s,d);
    
    if (debug)
      std::cout << "Number of lines=" << lines.size() << " first line=[" << lines[0] << "]" << std::endl;

    if (lines[0]=="#vtkpxMatrix File")
      {
	int np1,np2;
	sscanf(lines[3].c_str(),"# rows: %d",&np1);
	sscanf(lines[4].c_str(),"# columns: %d",&np2);
	if (debug) 
	  std::cout << "Matrix Size=" << np1 << "*" << np2 << "\n";
	output=Eigen::MatrixXf::Zero(np1,np2);
	for (int ia=0;ia<np1;ia++)
	  {
	    std::vector<std::string> numbers=splitString(lines[ia+5]," ");
	    for (int ib=0;ib<np2;ib++)
	      output(ia,ib)=std::stof(numbers[ib]);
	  }
	return 1;
      }

    if (lines.size()==4 || lines.size()==5) // 5 just in case
      {
	if (debug)
	  std::cout << "Trying to read legacy 4x4 matrix file" << std::endl;
	int np1=4,np2=4;
	output=Eigen::MatrixXf::Zero(np1,np2);
	for (int ia=0;ia<np1;ia++)
	  {
	    std::vector<std::string> numbers=splitString(lines[ia]," ");
	    for (int ib=0;ib<np2;ib++)
	      output(ia,ib)=std::stof(numbers[ib]);
	  }
	return 1;
      }
    return 0;
  }



  std::string writeMatrixTextFile(Eigen::MatrixXf& input,std::string name,int mode4x4,int  debug)
  {

    int dim[2]; bisEigenUtil::getMatrixDimensions(input,dim);

    std::stringstream output;
    output.precision(5);
    
    if (mode4x4==1 && dim[0]==4 && dim[1]==4)
      {
	if (debug)
	  std::cout << "Outputing legacy 4x4 matrix file" << std::endl;
      }
    else
      {
	output << "#vtkpxMatrix File" << std::endl;
	output << "# name: " << name <<  std::endl;
	output << "# type: matrix " << std::endl;
	output << "# rows: " << dim[0] << std::endl;
	output << "# columns: " << dim[1] << std::endl;
      }

    for (int ia=0;ia<dim[0];ia++)
      {
	for (int ib=0;ib<dim[1];ib++) 
	  output << input(ia,ib) << " ";
	output << std::endl;
      }
    
    std::string out=output.str();
    return out;
  }


  /** return a combo transformation from a .grd file 
   * @param input string containing text file
   * @param output the combo transformation
   * @param debug if > 0 print debug messages
   * @returns 1 if success 0 if failed
   */
  int parseLegacyGridTransformationFile(const char* text,bisComboTransformation* output,int debug)
  {
    const std::string d="\n";
    std::vector<std::string> lines=splitString(text,d);
    int offset=0;
    return output->textParse(lines,offset,debug);
  }


  /** return a grd file form a combo transformation
   * @param input the input transformation
   * @param debug if > 0 print debug messages
   * @returns the output string
   */
  std::string writeLegacyGridTransformationFile(bisComboTransformation* input,int debug)
  {
    return input->textSerialize(debug);
  }

  
#undef  ASSIF                                 /* assign v to *p, if possible */
#define ASSIF(p,v) if( (p)!=NULL ) *(p) = (v)

    typedef struct {                   /** 3x3 matrix struct **/
      float m[3][3] ;
    } mat33 ;
    
  
  mat33 nifti_mat33_inverse( mat33 R )   /* inverse of 3x3 matrix */
  {
    double r11,r12,r13,r21,r22,r23,r31,r32,r33 , deti ;
    mat33 Q ;
    /*  INPUT MATRIX:  */
    r11 = R.m[0][0]; r12 = R.m[0][1]; r13 = R.m[0][2];  /* [ r11 r12 r13 ] */
    r21 = R.m[1][0]; r22 = R.m[1][1]; r23 = R.m[1][2];  /* [ r21 r22 r23 ] */
    r31 = R.m[2][0]; r32 = R.m[2][1]; r33 = R.m[2][2];  /* [ r31 r32 r33 ] */
    
    deti = r11*r22*r33-r11*r32*r23-r21*r12*r33
      +r21*r32*r13+r31*r12*r23-r31*r22*r13 ;
    
    if( deti != 0.0l ) deti = 1.0l / deti ;
    
    Q.m[0][0] = deti*( r22*r33-r32*r23) ;
    Q.m[0][1] = deti*(-r12*r33+r32*r13) ;
    Q.m[0][2] = deti*( r12*r23-r22*r13) ;
    
    Q.m[1][0] = deti*(-r21*r33+r31*r23) ;
    Q.m[1][1] = deti*( r11*r33-r31*r13) ;
    Q.m[1][2] = deti*(-r11*r23+r21*r13) ;
    
    Q.m[2][0] = deti*( r21*r32-r31*r22) ;
    Q.m[2][1] = deti*(-r11*r32+r31*r12) ;
    Q.m[2][2] = deti*( r11*r22-r21*r12) ;
    
    return Q ;
  }
  
  typedef struct {                   /** 4x4 matrix struct **/
    float m[4][4] ;
  } mat44 ;
  
  float nifti_mat33_determ( mat33 R )   /* determinant of 3x3 matrix */
  {
    double r11,r12,r13,r21,r22,r23,r31,r32,r33 ;
    /*  INPUT MATRIX:  */
    r11 = R.m[0][0]; r12 = R.m[0][1]; r13 = R.m[0][2];  /* [ r11 r12 r13 ] */
    r21 = R.m[1][0]; r22 = R.m[1][1]; r23 = R.m[1][2];  /* [ r21 r22 r23 ] */
    r31 = R.m[2][0]; r32 = R.m[2][1]; r33 = R.m[2][2];  /* [ r31 r32 r33 ] */
      
    return r11*r22*r33-r11*r32*r23-r21*r12*r33
      +r21*r32*r13+r31*r12*r23-r31*r22*r13 ;
  }
    
  /*----------------------------------------------------------------------*/
  /*! compute the max row norm of a 3x3 matrix
   *//*--------------------------------------------------------------------*/
  float nifti_mat33_rownorm( mat33 A )  /* max row norm of 3x3 matrix */
  {
    float r1,r2,r3 ;
      
    r1 = fabs(A.m[0][0])+fabs(A.m[0][1])+fabs(A.m[0][2]) ;
    r2 = fabs(A.m[1][0])+fabs(A.m[1][1])+fabs(A.m[1][2]) ;
    r3 = fabs(A.m[2][0])+fabs(A.m[2][1])+fabs(A.m[2][2]) ;
    if( r1 < r2 ) r1 = r2 ;
    if( r1 < r3 ) r1 = r3 ;
    return r1 ;
  }
    
  /*----------------------------------------------------------------------*/
  /*! compute the max column norm of a 3x3 matrix
   *//*--------------------------------------------------------------------*/
  float nifti_mat33_colnorm( mat33 A )  /* max column norm of 3x3 matrix */
  {
    float r1,r2,r3 ;
      
    r1 = fabs(A.m[0][0])+fabs(A.m[1][0])+fabs(A.m[2][0]) ;
    r2 = fabs(A.m[0][1])+fabs(A.m[1][1])+fabs(A.m[2][1]) ;
    r3 = fabs(A.m[0][2])+fabs(A.m[1][2])+fabs(A.m[2][2]) ;
    if( r1 < r2 ) r1 = r2 ;
    if( r1 < r3 ) r1 = r3 ;
    return r1 ;
  }
    
  mat33 nifti_mat33_polar( mat33 A )
  {
    mat33 X , Y , Z ;
    float alp,bet,gam,gmi , dif=1.0 ;
    int k=0 ;

    X = A ;

    /* force matrix to be nonsingular */

    gam = nifti_mat33_determ(X) ;
    while( gam == 0.0 ){        /* perturb matrix */
      gam = 0.00001 * ( 0.001 + nifti_mat33_rownorm(X) ) ;
      X.m[0][0] += gam ; X.m[1][1] += gam ; X.m[2][2] += gam ;
      gam = nifti_mat33_determ(X) ;
    }

    while(1){
      Y = nifti_mat33_inverse(X) ;
      if( dif > 0.3 ){     /* far from convergence */
        alp = sqrt( nifti_mat33_rownorm(X) * nifti_mat33_colnorm(X) ) ;
        bet = sqrt( nifti_mat33_rownorm(Y) * nifti_mat33_colnorm(Y) ) ;
        gam = sqrt( bet / alp ) ;
        gmi = 1.0 / gam ;
      } else {
        gam = gmi = 1.0 ;  /* close to convergence */
      }
      Z.m[0][0] = 0.5 * ( gam*X.m[0][0] + gmi*Y.m[0][0] ) ;
      Z.m[0][1] = 0.5 * ( gam*X.m[0][1] + gmi*Y.m[1][0] ) ;
      Z.m[0][2] = 0.5 * ( gam*X.m[0][2] + gmi*Y.m[2][0] ) ;
      Z.m[1][0] = 0.5 * ( gam*X.m[1][0] + gmi*Y.m[0][1] ) ;
      Z.m[1][1] = 0.5 * ( gam*X.m[1][1] + gmi*Y.m[1][1] ) ;
      Z.m[1][2] = 0.5 * ( gam*X.m[1][2] + gmi*Y.m[2][1] ) ;
      Z.m[2][0] = 0.5 * ( gam*X.m[2][0] + gmi*Y.m[0][2] ) ;
      Z.m[2][1] = 0.5 * ( gam*X.m[2][1] + gmi*Y.m[1][2] ) ;
      Z.m[2][2] = 0.5 * ( gam*X.m[2][2] + gmi*Y.m[2][2] ) ;

      dif = fabs(Z.m[0][0]-X.m[0][0])+fabs(Z.m[0][1]-X.m[0][1])
        +fabs(Z.m[0][2]-X.m[0][2])+fabs(Z.m[1][0]-X.m[1][0])
        +fabs(Z.m[1][1]-X.m[1][1])+fabs(Z.m[1][2]-X.m[1][2])
        +fabs(Z.m[2][0]-X.m[2][0])+fabs(Z.m[2][1]-X.m[2][1])
        +fabs(Z.m[2][2]-X.m[2][2])                          ;

      k = k+1 ;
      if( k > 100 || dif < 3.e-6 ) break ;  /* convergence or exhaustion */
      X = Z ;
    }

    return Z ;
  }

  void nifti_mat44_to_quatern( mat44 R ,
                               float *qb, float *qc, float *qd,
                               float *qx, float *qy, float *qz,
                               float *dx, float *dy, float *dz, float *qfac )
  {
    double r11,r12,r13 , r21,r22,r23 , r31,r32,r33 ;
    double xd,yd,zd , a,b,c,d ;
    mat33 P,Q ;

    /* offset outputs are read write out of input matrix  */

    ASSIF(qx,R.m[0][3]) ; ASSIF(qy,R.m[1][3]) ; ASSIF(qz,R.m[2][3]) ;

    /* load 3x3 matrix into local variables */

    r11 = R.m[0][0] ; r12 = R.m[0][1] ; r13 = R.m[0][2] ;
    r21 = R.m[1][0] ; r22 = R.m[1][1] ; r23 = R.m[1][2] ;
    r31 = R.m[2][0] ; r32 = R.m[2][1] ; r33 = R.m[2][2] ;

    /* compute lengths of each column; these determine grid spacings  */

    xd = sqrt( r11*r11 + r21*r21 + r31*r31 ) ;
    yd = sqrt( r12*r12 + r22*r22 + r32*r32 ) ;
    zd = sqrt( r13*r13 + r23*r23 + r33*r33 ) ;

    /* if a column length is zero, patch the trouble */

    if( xd == 0.0l ){ r11 = 1.0l ; r21 = r31 = 0.0l ; xd = 1.0l ; }
    if( yd == 0.0l ){ r22 = 1.0l ; r12 = r32 = 0.0l ; yd = 1.0l ; }
    if( zd == 0.0l ){ r33 = 1.0l ; r13 = r23 = 0.0l ; zd = 1.0l ; }

    /* assign the output lengths */

    ASSIF(dx,xd) ; ASSIF(dy,yd) ; ASSIF(dz,zd) ;

    /* normalize the columns */

    r11 /= xd ; r21 /= xd ; r31 /= xd ;
    r12 /= yd ; r22 /= yd ; r32 /= yd ;
    r13 /= zd ; r23 /= zd ; r33 /= zd ;

    /* At this point, the matrix has normal columns, but we have to allow
       for the fact that the hideous user may not have given us a matrix
       with orthogonal columns.

       So, now find the orthogonal matrix closest to the current matrix.

       One reason for using the polar decomposition to get this
       orthogonal matrix, rather than just directly orthogonalizing
       the columns, is so that inputting the inverse matrix to R
       will result in the inverse orthogonal matrix at this point.
       If we just orthogonalized the columns, this wouldn't necessarily hold. */

    Q.m[0][0] = r11 ; Q.m[0][1] = r12 ; Q.m[0][2] = r13 ; /* load Q */
    Q.m[1][0] = r21 ; Q.m[1][1] = r22 ; Q.m[1][2] = r23 ;
    Q.m[2][0] = r31 ; Q.m[2][1] = r32 ; Q.m[2][2] = r33 ;

    P = nifti_mat33_polar(Q) ;  /* P is orthog matrix closest to Q */

    r11 = P.m[0][0] ; r12 = P.m[0][1] ; r13 = P.m[0][2] ; /* unload */
    r21 = P.m[1][0] ; r22 = P.m[1][1] ; r23 = P.m[1][2] ;
    r31 = P.m[2][0] ; r32 = P.m[2][1] ; r33 = P.m[2][2] ;

    /*                            [ r11 r12 r13 ]               */
    /* at this point, the matrix  [ r21 r22 r23 ] is orthogonal */
    /*                            [ r31 r32 r33 ]               */

    /* compute the determinant to determine if it is proper */

    zd = r11*r22*r33-r11*r32*r23-r21*r12*r33
      +r21*r32*r13+r31*r12*r23-r31*r22*r13 ;  /* should be -1 or 1 */

    if( zd > 0 ){             /* proper */
      ASSIF(qfac,1.0) ;
    } else {                  /* improper ==> flip 3rd column */
      ASSIF(qfac,-1.0) ;
      r13 = -r13 ; r23 = -r23 ; r33 = -r33 ;
    }

    /* now, compute quaternion parameters */

    a = r11 + r22 + r33 + 1.0l ;

    if( a > 0.5l ){                /* simplest case */
      a = 0.5l * sqrt(a) ;
      b = 0.25l * (r32-r23) / a ;
      c = 0.25l * (r13-r31) / a ;
      d = 0.25l * (r21-r12) / a ;
    } else {                       /* trickier case */
      xd = 1.0 + r11 - (r22+r33) ;  /* 4*b*b */
      yd = 1.0 + r22 - (r11+r33) ;  /* 4*c*c */
      zd = 1.0 + r33 - (r11+r22) ;  /* 4*d*d */
      if( xd > 1.0 ){
        b = 0.5l * sqrt(xd) ;
        c = 0.25l* (r12+r21) / b ;
        d = 0.25l* (r13+r31) / b ;
        a = 0.25l* (r32-r23) / b ;
      } else if( yd > 1.0 ){
        c = 0.5l * sqrt(yd) ;
        b = 0.25l* (r12+r21) / c ;
        d = 0.25l* (r23+r32) / c ;
        a = 0.25l* (r13-r31) / c ;
      } else {
        d = 0.5l * sqrt(zd) ;
        b = 0.25l* (r13+r31) / d ;
        c = 0.25l* (r23+r32) / d ;
        a = 0.25l* (r21-r12) / d ;
      }
      if( a < 0.0l ){ b=-b ; c=-c ; d=-d; a=-a; }
    }

    ASSIF(qb,b) ; ASSIF(qc,c) ; ASSIF(qd,d) ;
    return ;
  }

  int convertMat44ToQuatern(Eigen::MatrixXf& input,Eigen::MatrixXf& output,int) {

    float qb,qc,qd,qx,qy,qz,dx,dy,dz,qfac;
    mat44 M;
    for (int ia=0;ia<=3;ia++)
      for (int ja=0;ja<=3;ja++)
        M.m[ia][ja]=input(ia,ja);

    nifti_mat44_to_quatern(M,&qb,&qc,&qd,&qx,&qy,&qz,&dx,&dy,&dz,&qfac);

    
    output=Eigen::MatrixXf::Zero(10,1);
    output(0,0)=qb;  output(1,0)=qc;   output(2,0)=qd;
    output(3,0)=qx;  output(4,0)=qy;   output(5,0)=qz;
    output(6,0)=dx;  output(7,0)=dy;   output(8,0)=dz;
    output(9,0)=qfac;
    return 1;
  }
}

