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

#include "bisEigenUtil.h"
#include <iostream>
#include <Eigen/Dense>
#include <string.h>

namespace bisEigenUtil {


  Eigen::MatrixXf mapToEigenMatrix(bisSimpleMatrix<float>* m)
  {
    int rows=m->getNumRows();
    int cols=m->getNumCols();
    return Eigen::Map<Eigen::Matrix<float,Eigen::Dynamic,Eigen::Dynamic,Eigen::RowMajor> >(m->getData(),rows,cols);
  }


  Eigen::VectorXf mapToEigenVector(bisSimpleVector<float>* m)
  {
    int rows=m->getLength();
    return Eigen::VectorXf::Map(m->getData(),rows);
  }

  Eigen::MatrixXf mapImageToEigenMatrix(bisSimpleImage<float>* img)
  {
    int dim[5]; img->getDimensions(dim);
    int rows=dim[3]*dim[4];
    int cols=dim[0]*dim[1]*dim[2];
    return Eigen::Map<Eigen::Matrix<float,Eigen::Dynamic,Eigen::Dynamic,Eigen::RowMajor> >(img->getData(),rows,cols);
  }

  // -----------------------------------------------------------------------------------------------------
  // deserialize And Map
  // -----------------------------------------------------------------------------------------------------

  int deserializeAndMapToEigenVector(bisSimpleVector<float>* s_vector,unsigned char* ptr,Eigen::VectorXf& output,int defaultsize,float defaultvalue,int debug)
  {
    if (ptr!=0)
      {
        if (s_vector->linkIntoPointer(ptr))
          {
            if (debug)
              std::cout << "Using external vector " << std::endl;
            
            output=bisEigenUtil::mapToEigenVector(s_vector);
            return 1;
          }
        
        std::unique_ptr<bisSimpleMatrix<float> > s_matrix(new bisSimpleMatrix<float>("vectormatrix"));
        if (!s_matrix->linkIntoPointer(ptr))
          {
            std::cerr << "Failed to deserialize vector" << std::endl;
            return 0;
          }

        int rows=s_matrix->getNumRows();
        int cols=s_matrix->getNumCols();
        if (cols!=1)
          {
            std::cerr << "Failed to deserialize vector multi-col matrix provided." << std::endl;
            return 0;
          }

        std::cout << "wasm- Deserializing vector from single-column matrix." << std::endl;
        output=Eigen::VectorXf::Map(s_matrix->getData(),rows);
        return 1;
      }

    if (defaultsize>0)
      {
        output=Eigen::VectorXf::Zero(defaultsize);
        for (int ia=0;ia<defaultsize;ia++)
          output(ia)=defaultvalue;
      }
    return 2;
  }


  int deserializeAndMapToEigenMatrix(bisSimpleMatrix<float>* s_matrix,unsigned char* ptr,Eigen::MatrixXf& output,int debug)
  {
    if (ptr==0) {
      std::cerr << "Failed to deserialize matrix" << std::endl;
      return 0;
    }

    if (s_matrix->linkIntoPointer(ptr))
      {
        if (debug)
          std::cout << "Using external matrix " << std::endl;

        output=bisEigenUtil::mapToEigenMatrix(s_matrix);
        return 1;
      }


    std::unique_ptr<bisSimpleVector<float> > s_vector(new bisSimpleVector<float>("matrixvector"));
    if (!s_vector->linkIntoPointer(ptr))
      {
        std::cerr << "Failed to deserialize matrix as vector" << std::endl;
        return 0;
      }

    int rows=s_vector->getLength();
    std::cout << "wasm- Deserializing matrix from vector." << std::endl;
    output=Eigen::Map<Eigen::Matrix<float,Eigen::Dynamic,Eigen::Dynamic,Eigen::RowMajor> >(s_vector->getData(),rows,1);
    return 1;
  }

  unsigned char* serializeAndReturn(Eigen::MatrixXf& mat,std::string name)
  {
    std::unique_ptr<bisSimpleMatrix<float> > out(bisEigenUtil::createSimpleMatrix(mat,name));
    out->releaseOwnership();
    return out->getRawArray();
  }

  // -----------------------------------------------------------------------------------------------------
  bisSimpleMatrix< float>* createSimpleMatrix(Eigen::MatrixXf inp,std::string name)
  {
    bisSimpleMatrix<float>* out=new bisSimpleMatrix<float>(name);
    out->allocate(inp.rows(),inp.cols());
    float* odata=out->getData();
    int index=0;

    for (int row=0;row<inp.rows();row++)
      {
        for (int col=0;col<inp.cols();col++)
          {
            odata[index]=inp(row,col);
            ++index;
          }
      }

    return out;
  }


  bisSimpleVector<float>* createSimpleVector(Eigen::VectorXf inp,std::string name)
  {

    bisSimpleVector<float>* out=new bisSimpleVector<float>(name);

    out->allocate(inp.rows());
    float* odata=out->getData();

    for (int row=0;row<inp.rows();row++)
      odata[row]=inp(row);

    return out;
  }

  // ---------------------------------------------------------
  // Converted from BioImageSuite::vtkpxMatrix
  Eigen::MatrixXf importFromMatlabV6(const unsigned char* bytepointer,int bytearraylength,std::string matrixname,int debug,int& out_ok)
  {
    out_ok=0;
    static unsigned char* indataptr=0;
    static int remaining=0;

#ifdef _WIN32
    long long pt=(long long)bytepointer;
#else
    long pt=(long)bytepointer;
#endif
    indataptr=(unsigned char*)pt;
    remaining=bytearraylength;
    Eigen::MatrixXf outputMatrix=Eigen::MatrixXf::Zero(1,1);

    if (debug>1)
      std::cout << "pointer=" << (long long)indataptr << " numbytes=" << bytearraylength << "\t " << remaining << std::endl;


    struct internal
    {
      static int readdata(void* outbuf,int sizeofelement,int numelements)
      {
        int sz=numelements*sizeofelement;
        if (sz<=remaining)
          {
            std::cout << "Before memcopy" << std::endl;
            //#ifndef _WIN32
            memcpy(outbuf,indataptr,sz);
            /*#else
              unsigned char* out=(unsigned char*)outbuf;
              for (int ia=0;ia<sz;ia++) {
              std::cout << "ia=" << ia << std::endl;
              out[ia]=indataptr[ia];
              }
              #endif*/
            //std::cout << "After memcopy" << std::endl;
            remaining=remaining-sz;
            indataptr+=sz;
            //std::cout << "read " << sz << " elements pointer=" << (int)indataptr << "\t remaining=" << remaining << std::endl;
            return sz;
          }
        return 0;
      }

      static int skipahead(int sz)
      {
        if (sz<remaining)
          {
            indataptr+=sz;
            remaining=remaining-sz;
            //      std::cout << "skipping ahead " << sz << " elements pointer=" << (int)indataptr << "\t remaining=" << remaining << std::endl;
            return sz;
          }
        return 0;
      }

      static int swapint(int input) {
        int a=input;
        unsigned char* bytes=(unsigned char*)&a;
        unsigned char tmp;

        tmp=*bytes;
        *bytes=*(bytes+3);
        *(bytes+3)=tmp;

        tmp=*(bytes+1);
        *(bytes+1)=*(bytes+2);
        *(bytes+2)=tmp;

        return a;
      }

      static float swapfloat(float input) {
        float a=input;
        unsigned char* bytes=(unsigned char*)&a;
        unsigned char tmp;

        tmp=*bytes;
        *bytes=*(bytes+3);
        *(bytes+3)=tmp;

        tmp=*(bytes+1);
        *(bytes+1)=*(bytes+2);
        *(bytes+2)=tmp;

        return a;
      }

      static short swapshort(short input) {
        short a=input;
        unsigned char *bytes=(unsigned char*)&a;
        unsigned char tmp;
        tmp=*bytes;
        *bytes=*(bytes+1);
        *(bytes+1)=tmp;
        return a;
      }

      static double swapdouble(double input) {
        double a=input;
        double b=input;
        unsigned char* ap=(unsigned char*)&a;
        unsigned char* bp=(unsigned char*)&b;

        ap[0]=bp[7];
        ap[1]=bp[6];
        ap[2]=bp[5];
        ap[3]=bp[4];
        ap[4]=bp[3];
        ap[5]=bp[2];
        ap[6]=bp[1];
        ap[7]=bp[0];

        return a;
      }

    };



    unsigned char* buffer=new unsigned char[2000];
    char* name=new char[2000];

    std::cout << "This far\n";

    internal::readdata(buffer,1,116);
    if (debug)
      std::cout << "Description = " << buffer << std::endl;

    internal::readdata(buffer,1,8);
    int ok=1;
    for (int ia=0;ia<=7;ia++)
      {
        int v=int(buffer[ia]);
        if (!(v==0 || v==32))
          {
            std::cerr << "We have a problem with ia=" << ia << std::endl;
            ok=0;
            ia=9;
          }
      }

    if (ok==0)
      {
        delete [] buffer;
        delete [] name;
        return outputMatrix;
      }
    internal::readdata(buffer,1,4);
    if (debug>1)
      std::cout << "All Offset bytes are either zero or space OK!" << std::endl;


    int done=0;
    int totalread=128;
    int count=0;

    while (done==0)
      {
        int dtype[2];
        int n=internal::readdata(dtype,sizeof(int),2);
        totalread+=8;
        if (debug>1)
          std::cout << "n = " << n << " totalread= " << totalread << std::endl << "-----------------------------------------------------" << std::endl;
        if (n<1)
          {
            done=1;
          }
        else
          {
            int swap=0;
            ++count;
            if (dtype[0]<0 || dtype[0]>1024)
              {
                dtype[0]=internal::swapint(dtype[0]);
                dtype[1]=internal::swapint(dtype[1]);
                swap=1;
              }
            if (debug>1)
              std::cout << std::endl << "dtype = " << dtype[0] << " , numbytes = " << dtype[1] << std::endl;
            if (dtype[0]!=14)
              {
                if (debug>1)
                  {
                    std::cout << "Not a matrix skipping ahead " << dtype[1] << " bytes" << std::endl;
                    std::cout << "Seaking ahead  " << dtype[1] << " bytes" << std::endl;
                  }
                int toread=dtype[1];

                // Add padding
                int tmp=8*int(toread/8);
                if (tmp<toread)
                  {
                    toread=8+tmp;
                    //            std::cout  << "Adding padding from " << dtype[1] << " to " << toread << std::endl;
                  }

                while (toread>0)
                  {
                    int n=toread;
                    if (toread>256) n=256;
                    totalread+=internal::readdata(buffer,1,n);
                    toread-=n;
                  }
                if (debug>1)
                  std::cout << "Total read = " << totalread << std::endl;
              }
            else
              {
                if (debug)
                  std::cout << std::endl << "Beginning to read matrix: " << std::endl;
                int bytes_read=internal::readdata(buffer,1,16);
                int cl=(int)buffer[8];
                //            if (swap)
                //              cl=internal::swapint(cl);

                int flags[6],length[1];
                bytes_read+=internal::readdata(flags,sizeof(int),5);
                if (swap)
                  {
                    //              length[0]=internal::swapint(length[0]);
                    for (int ic=0;ic<5;ic++)
                      flags[ic]=internal::swapint(flags[ic]);
                  }


                // Check for use of small element format
                //
                int test=int(flags[4] / 65536 );
                if (debug>1)
                  std::cout << "***************** Is Small Element " << test << std::endl;
                if (test==0)
                  {
                    length[0]=0;
                    bytes_read+=internal::readdata(length,sizeof(int),1);
                    if (swap)
                      length[0]=internal::swapint(length[0]);
                    flags[5]=length[0];
                    if (swap)
                      flags[5]=internal::swapint(flags[5]);
                    bytes_read+=internal::readdata(name,1,flags[5]);
                    name[flags[5]]=(char)0;
                    int rem=8-(flags[5]-int(flags[5]/8)*8);
                    if (debug>1)
                      std::cout << "Remainder " << rem << std::endl;
                    bytes_read+=internal::readdata(buffer,1,rem);
                  }
                else
                  {
                    const int tmp_mask=65535;
                    int nb=(flags[4] & tmp_mask);
                    if (debug>1)
                      std::cout << "Small Element nb=" << nb << " test= " << int(test/65536) << std::endl;
                    bytes_read+=internal::readdata(name,1,4);
                    name[nb]=(char)0;
                    flags[5]=0;
                  }

                int nfl[2];
                bytes_read+=internal::readdata(nfl,sizeof(int),2);
                if (swap)
                  {
                    nfl[0]=internal::swapint(nfl[0]);
                    nfl[1]=internal::swapint(nfl[1]);
                  }
                if (debug>1)
                  std::cout << "Final Flags = " << nfl[0] << "," << nfl[1] << std::endl;


                int numrows=flags[2];
                int numcols=flags[3];
                if (debug)
                  {
                    std::cout << "Dimensions =" << numrows << "x" << numcols << ", class = " << cl << ", length = " << flags[5] << std::endl;
                    std::cout << "Name = " << name << ", (bytes read= " << bytes_read << ")" << std::endl;
                  }
                int toread=dtype[1]-bytes_read;
                if (debug>1)
                  std::cout << "To read (1) = " << toread << std::endl;


                if (strcmp(name, matrixname.c_str())==0 || strlen(matrixname.c_str()) == 0)
                  {
                    if ( (cl==7 || cl==6))
                      {
                        int numbytesneeded=4*numrows*numcols;
                        if (cl==6)
                          numbytesneeded*=2;

                        if (debug)
                          std::cout << "Numbytes needed = " << numbytesneeded << std::endl;

                        if (debug>1)
                          std::cout << "Beginning to read matrix " << numbytesneeded << " < " <<  toread << std::endl;

                        if (numbytesneeded<=toread)
                          {
                            outputMatrix=Eigen::MatrixXf::Zero(numrows,numcols);
                            if (cl==6)
                              {
                                std::unique_ptr<double> rd(new double[numrows]);
                                for (int ib=0;ib<numcols;ib++)
                                  {
                                    bytes_read+=internal::readdata(rd.get(),sizeof(double),numrows);
                                    for (int ia=0;ia<numrows;ia++)
                                      if (swap)
                                        outputMatrix(ia,ib)=float(internal::swapdouble(rd.get()[ia]));
                                      else
                                        outputMatrix(ia,ib)=float(rd.get()[ia]);
                                  }
                              }
                            else
                              {
                                std::unique_ptr<float> rf(new float[numrows]);
                                for (int ib=0;ib<numcols;ib++)
                                  {
                                    bytes_read+=internal::readdata(rf.get(),sizeof(float),numrows);
                                    for (int ia=0;ia<numrows;ia++)
                                      if (swap)
                                        outputMatrix(ia,ib)=(internal::swapfloat(rf.get()[ia]));
                                      else
                                        outputMatrix(ia,ib)=(rf.get()[ia]);
                                  }
                              }

                            out_ok=1;
                            delete [] buffer;
                            delete [] name;
                            return outputMatrix;
                          }
                        else
                          {
                            std::cerr << "\t\t\t can't read data not enough bytes" << std::endl;
                          }
                      }
                    std::cout << "Final To read (2) = " << toread << std::endl;
                  }
                else
                  {
                    if (debug>1)
                      std::cout << "Not the matrix we are looking for" << std::endl;
                  }

                while (toread>0)
                  {
                    int n=toread;
                    if (toread>256) n=256;
                    bytes_read+=internal::readdata(buffer,1,n);
                    toread-=n;
                  }

                totalread+=bytes_read;
              }
          }
      }


    delete [] buffer;
    delete [] name;
    return outputMatrix;

  }


  // ---------------------------------------------------------------------------------------------
  // Eigen Utilities
  // ---------------------------------------------------------------------------------------------
  void getMatrixDimensions(Eigen::MatrixXf& mat,int sz[2]) {
    sz[0]=mat.rows();
    sz[1]=mat.cols();
  }

  void resizeZeroVector(Eigen::VectorXf& vct,int numrows) {

    if (numrows!=vct.rows())
      {
        vct=Eigen::VectorXf::Zero(numrows);
        return;
      }

    for (int i=0;i<numrows;i++)
      vct(i)=0.0;
  }

  void resizeZeroMatrix(Eigen::MatrixXf& mat,int sz[2]) {

    int dim[2]; getMatrixDimensions(mat,dim);

    if (dim[0]!=sz[0] || dim[1]!=sz[1])
      {
        mat=Eigen::MatrixXf::Zero(sz[0],sz[1]);
        return;
      }

    for (int i=0;i<sz[0];i++)
      for (int j=0;j<sz[1];j++)
        mat(i,j)=0.0;
  }

  Eigen::MatrixXf createLSQMatrix(Eigen::MatrixXf& A) {
    Eigen::MatrixXf At=A.transpose();
    return ((At*A).inverse())*At;
  }


  int inPlaceMultiplyMV(Eigen::MatrixXf& A, Eigen::VectorXf& x, Eigen::VectorXf& b)
  {
    int dim[2]; getMatrixDimensions(A,dim);
    // R * C  * C * 1 = R *1

    //    std::cout << "Dim=" << dim[0] << "," << dim[1] << " x=" << x.rows() << " b=" <<  b.rows() << " " << std::endl;

    if (dim[1]!=x.rows() || dim[0]!=b.rows())
      return 0;

    for (int i=0;i<dim[0];i++)
      {
        float sum=0.0;
        for (int j=0;j<dim[1];j++)
          sum+=A(i,j)*x[j];
        b(i)=sum;
      }

    //    std::cout << "b=" << b << std::endl;

    return 1;
  }


  // -----------------------------------------------------------------------------------
  int inPlaceMultiply(Eigen::MatrixXf& A, Eigen::MatrixXf& B, Eigen::MatrixXf& C)
  {
    int s1[2],s2[2],s3[2];
    getMatrixDimensions(A,s1);
    getMatrixDimensions(B,s2);

    if (s1[1]!=s2[0])
      {
        std::cerr << "Cannot multiply matrices bad size! a=" << s1[0] << "x" << s1[1] <<", b=" << s2[0] << "x" << s2[1] << std::endl;
        return 0;
      }

    s3[0]=s1[0];
    s3[1]=s2[1];

    resizeZeroMatrix(C,s3);


    for(int col = 0; col < s3[1]; col++)
      {
        for(int row = 0; row < s3[0]; row++)
          {
            float sum=0.0;
            for(int i = 0; i < s1[1]; i++)
              sum+=A(row,i)*B(i,col);
            C(row,col)=sum;
          }
      }
    return 1;
  }

  int inPlaceMultiply3(Eigen::MatrixXf& a,Eigen::MatrixXf& b,Eigen::MatrixXf& c,Eigen::MatrixXf& result)
  {
    int s1[2],s2[2],s3[2];
    getMatrixDimensions(a,s1);
    getMatrixDimensions(b,s2);
    getMatrixDimensions(c,s3);

    if (s1[1]!=s2[0] || s2[1]!=s3[0])
      {
        std::cerr << "Cannot multiply3 matrices bad sizes " << s1[0]<<"*" << s1[1] <<", " << s2[0] << "*" << s2[1] << ", " << s3[0] << "*" << s3[1] << std::endl;
        return 0;
      }

    int s4[2] = { s1[0],s3[1] };
    resizeZeroMatrix(result,s4);

    for(int col = 0; col < s4[1]; col++)
      {
        for(int row = 0; row < s4[0]; row++)
          {
            float sum=0.0;
            for(int k = 0; k < s1[1] ; k++)
              for (int l=0; l <  s2[1] ; l++ )
                sum+=a(row,k)*b(k,l)*c(l,col);

            result(row,col)=sum;
          }
      }
    return 1;
  }



}
