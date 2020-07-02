//BIOIMAGESUITE_LICENSE  ---------------------------------------------------------------------------------
//BIOIMAGESUITE_LICENSE  This file is part of the BioImage Suite Software Package.
//BIOIMAGESUITE_LICENSE
//BIOIMAGESUITE_LICENSE  X. Papademetris, M. Jackowski, N. Rajeevan, R.T. Constable, and L.H
//BIOIMAGESUITE_LICENSE  Staib. BioImage Suite: An integrated medical image analysis suite, Section
//BIOIMAGESUITE_LICENSE  of Bioimaging Sciences, Dept. of Diagnostic Radiology, Yale School of
//BIOIMAGESUITE_LICENSE  Medicine, http://www.bioimagesuite.org.
//BIOIMAGESUITE_LICENSE
//BIOIMAGESUITE_LICENSE  All rights reserved. This file may not be edited/copied/redistributed
//BIOIMAGESUITE_LICENSE  without the explicit permission of the authors.
//BIOIMAGESUITE_LICENSE
//BIOIMAGESUITE_LICENSE  -----------------------------------------------------------------------------------


#include <bisvtkMultiThreader.h>
#include "bisImageDistanceMatrix.h"
#include "bisJSONParameterList.h"
#include "bisUtil.h"
#include <algorithm>
#include <sstream>
#include <Eigen/Core>
#include <Eigen/SparseCore>
#ifndef _WIN32
#include <Spectra/SymEigsSolver.h>
#include <Spectra/GenEigsSolver.h>
#include <Spectra/MatOp/SparseGenMatProd.h>
#endif


typedef double BISTYPE;

namespace bisImageDistanceMatrix {

  // ------------------------------------------------------------------------------------------------
  // Payload classes

  class bisMThreadStructure {
  public:
    short* wgt_dat;
    int*   index_dat;
    float* img_dat;
    long   numvoxels;
    int    numframes;
    long   numbest;
    long   numgoodvox;
    long   slicesize;

    // Stuff for radius
    int dim[3];
    float spa[3];
    float DistanceRadius;
    double maxintensity;
    double normalization;
    std::vector<double> output_array[VTK_MAX_THREADS];
    int numcols;

    bisMThreadStructure() {
      this->wgt_dat=NULL;
      this->index_dat=NULL;
      this->img_dat=NULL;
      this->numcols=4;
    }

    ~bisMThreadStructure() {
      for (int i=0;i<VTK_MAX_THREADS;i++) {
        this->output_array[i].clear();
        this->output_array[i].shrink_to_fit();
      }
      this->wgt_dat=NULL;
      this->index_dat=NULL;
      this->img_dat=NULL;
      this->numcols=0;
    }
  };

  class bisMImagePair {
  public:
    float* idata;
    float* odata;
    int dim[3];
    int radius[3];
    int increment[3];
    int numframes;
  };


  // ------------------------------------------------------------------------------------------------

  float selectKthLargest(unsigned long k0offset, unsigned long n, float* arr0offset) {
    std::nth_element(arr0offset,arr0offset+k0offset,arr0offset+n);
    return arr0offset[k0offset];
  }

  bisSimpleImage<int>* createIndexMap(bisSimpleImage<short>* objectmap) {

    bisSimpleImage<int>* temp=new bisSimpleImage<int>("indexmap");

    int dim2[5]; objectmap->getDimensions(dim2);
    float spa[5];objectmap->getSpacing(spa);

    dim2[3]=1; dim2[4]=1;
    temp->allocate(dim2,spa);
    temp->fill(0);
    int index=1;
    int nt=temp->getLength();
    int* idata=temp->getData();
    short* obj=objectmap->getData();
    for (int voxel=0;voxel<nt;voxel++)
      {
        if (obj[voxel]>0)
          {
            idata[voxel]=index;
            ++index;
          }
      }

    //    double r1[2];
    //temp->getRange(r1);
    //std::cout << "++++ ImageDistanceMatrix: Index Map range=(" << r1[0] << ":" << r1[1] << ")" << std::endl;
    return temp;
  }


  int checkInputImages(bisSimpleImage<float>* Input,bisSimpleImage<short>* ObjectMap,bisSimpleImage<int>* IndexMap) {

    int dim[5]; Input->getDimensions(dim);
    float spa[5]; Input->getSpacing(spa);

    int dim1[5]; ObjectMap->getDimensions(dim1);
    int dim2[5]; IndexMap->getDimensions(dim2);


    int sum=0;
    for (int i=0;i<=2;i++)
      {
        sum+=abs(dim[i]-dim2[i]);
        sum+=abs(dim[i]-dim1[i]);
      }
    if (sum>0)
      {
        std::cerr << "Dim=" << dim[0] << "," << dim[1] << "," << dim[2] << std::endl;
        std::cerr << "Dim1=" << dim1[0] << "," << dim1[1] << "," << dim1[2] << std::endl;
        std::cerr << "Dim2=" << dim2[0] << "," << dim2[1] << "," << dim2[2] << std::endl;

        std::cerr <<"Input, ObjectMap IndexMap must have the same dimensions. Cannot run sum=" << sum << std::endl;
        return 0;
      }



    double r1[2]; ObjectMap->getRange(r1);
    double r2[2]; IndexMap->getRange(r2);
    if (r1[1]<1)
      {
        std::cerr <<"Input Object Map has no postive values " << r1[0] << ":" << r1[1] << std::endl;
        return 0;
      }

    std::cout << "++++ input checking done " << dim[0] << "," << dim[1] << "," << dim[2] << " maxobj=" << r1[1] << " maxindex=" << r2[1] << std::endl;

    return 1;
  }


  double computeDistance(int index1,int index2,int dim[3],float spa[3]) {

    double dist=0.0;
    int p1[3],p2[3];

    int slicesize=dim[0]*dim[1];
    //    std::cout << "slicesize=" << slicesize << " " << dim[0] << "," << dim[1] << "," << dim[2] << std::endl;
    p1[2]=index1/slicesize;
    p2[2]=index2/slicesize;

    int t1=index1%slicesize;
    int t2=index2%slicesize;

    p1[0]=t1 % dim[0];
    p1[1]=t1 / dim[0];

    p2[0]=t2 % dim[0];
    p2[1]=t2 / dim[0];

    for (int ia=0;ia<=2;ia++)
      dist+=pow(double(p2[ia]-p1[ia])*spa[ia],2.0);

    return dist;
  }

  // ------------------------------------------------------------------------------------------------------
  // Threaded Version Of Code
  // ------------------------------------------------------------------------------------------------------
  void combineVectorsToCreateSparseMatrix(bisSimpleMatrix<double>* combined,std::vector<double> output_array[VTK_MAX_THREADS],int nc,int NumberOfThreads)
  {
    int nt=0;

    fprintf(stdout,"++++ \n++++ Threads completed, combining %d arrays (comp=%d): ",NumberOfThreads,nc);
    for (int i=0;i<NumberOfThreads;i++)
      {
        int n=output_array[i].size()/nc;
        nt+=n;
        std::cout << n << " ";
      }

    std::cout << ", total rows (pairs)=" << nt << " cols=" << nc <<  std::endl;

    combined->zero(nt,nc);

    double* c_dat=combined->getData();

    int index=0;
    for (int i=0;i<NumberOfThreads;i++)
      {
        int num=output_array[i].size();
        std::cout << "+++ Combining thread=" << i+1 << " num=" << num << " elements=" << num/nc << std::endl;
        if (num>0)
          {
            for (int j=0;j<num;j++)
              c_dat[index+j]=output_array[i][j];
            index+=num;
          }
      }
    return;
  }

  bisMThreadStructure* createThreadStructure(bisSimpleImage<float>* Input,
                                             bisSimpleImage<short>* ObjectMap,
                                             bisSimpleImage<int>* IndexMap,
                                             int NumberOfThreads,float Sparsity,long NumBest=-1)
  {
    bisMThreadStructure* ds=  new bisMThreadStructure();
    int dim[5]; IndexMap->getDimensions(dim);
    float spa[3]; IndexMap->getImageSpacing(spa);
    ds->img_dat=Input->getData();
    ds->wgt_dat=ObjectMap->getData();
    ds->index_dat=IndexMap->getData();
    ds->numvoxels=dim[0]*dim[1]*dim[2];
    ds->numframes=dim[3]*dim[4];
    ds->numgoodvox=0;
    ds->numcols=4;

    for (int i=0;i<ds->numvoxels;i++)
      {
        if (ds->index_dat[i]>0)
          ++ds->numgoodvox;
      }


    if (NumBest<0)
      {
        ds->numbest=(ds->numgoodvox*Sparsity*0.01);
      }
    else
      {
        ds->numbest=NumBest;
      }
    if (ds->numbest<2)
      ds->numbest=2;
    else if (ds->numbest>ds->numgoodvox)
      ds->numbest=ds->numgoodvox;


    int piecesize=2*(ds->numgoodvox*ds->numbest)/NumberOfThreads;
    for (int i=0;i<NumberOfThreads;i++)
      {
        ds->output_array[i].clear();
        ds->output_array[i].reserve(piecesize);
      }
    return ds;
  }

  // --------------------------------------------------------------------------------------------------------
  // Helper Function
  // --------------------------------------------------------------------------------------------------------
  void bisImageDistanceMatrix_ComputeFraction(int thread,int numthreads,int numvoxels,int range[2]) {
    int step=numvoxels/numthreads;
    range[0]=step*thread;
    range[1]=range[0]+step;
    if (thread==numthreads-1)
      range[1]=numvoxels;
  }
  // --------------------------------------------------------------------------------------------------------
  static void sparseThreadFunction(bisvtkMultiThreader::vtkMultiThreader::ThreadInfo *data)
  {

    bisMThreadStructure   *ds = (bisMThreadStructure *)(data->UserData);
    int thread=data->ThreadID;
    int numthreads=data->NumberOfThreads;

    int voxelrange[2];
    bisImageDistanceMatrix_ComputeFraction(thread,numthreads,ds->numvoxels,voxelrange);
    std::cout << "++++ Sparse Matrix Thread (" << thread << ") output_array numvoxels= " << ds->numgoodvox << " * " << ds->numbest << ", numframes=" << ds->numframes <<
      ". Computing " << voxelrange[0] << ":" << voxelrange[1] << std::endl;

    float* d_dist=new float[ds->numgoodvox+10];
    float* d_tmp =new float[ds->numgoodvox+10];
    int*   d_index=new  int[ds->numgoodvox+10];


    int voxelfraction=(voxelrange[1]-voxelrange[0])/5;
    int dvoxel=voxelrange[1]-voxelrange[0];
    if (dvoxel<1)
      dvoxel=1;
    if (voxelfraction<1)
      voxelfraction=1;
    if (voxelfraction>2500)
      voxelfraction=2500;
    //    int first=0;

    for (int voxel1=voxelrange[0];voxel1<voxelrange[1];voxel1++)
      {
        /*if ((voxel1-voxelrange[0])%voxelfraction==0 && voxel1>voxelrange[0])
          {
            std::cout << "_____ Thread (" << thread << "). Processed " << 100.0*double(voxel1-voxelrange[0])/double(dvoxel) << "%, " <<
              "(voxel " << voxel1 << " of " << voxelrange[0] << "->" << voxelrange[1] << ")." << std::endl;
              }*/
        int v1=ds->index_dat[voxel1];
        short w1=ds->wgt_dat[voxel1];
        //std::cout << "voxel1=" << voxel1 << " (" << v1 << "," << w1 << ")" << std::endl;
        if (v1>0)
          {
            int num_used=0;
            for (int voxel2=0;voxel2<ds->numvoxels;voxel2++)
              {
                if (voxel2!=voxel1)
                  {
                    short w2=ds->wgt_dat[voxel2];
                    int v2=ds->index_dat[voxel2];
                    if (v2>0 && (w1==w2))
                      {
                        int index1=voxel1*ds->numframes;
                        int index2=voxel2*ds->numframes;
                        double sum=0.0;
                        for (int frame=0;frame<ds->numframes;frame++)
                          {
                            sum+=pow(ds->img_dat[index1]-ds->img_dat[index2],2.0f);
                            ++index1;
                            ++index2;
                          }
                        d_dist[num_used]=sum;
                        d_tmp[num_used]=sum;
                        d_index[num_used]=voxel2;
                        ++num_used;
                      }
                  }
              }

            //std::cout << "voxel1=" << voxel1 << ", v1=" << v1 << " " << w1 << " num_used=" << num_used << std::endl;

            double thr=selectKthLargest(ds->numbest,num_used,d_tmp);
            //            ++first;
            //            if (first<3)
            //  std::cout << "***** Thread ("<< thread << ") thr=" << thr << ", numbest=" << ds->numbest
            //        << "num_used=" << num_used << " numgood=" << ds->numgoodvox << " nvox=" << ds->numvoxels << std::endl;

            for (int ia=0;ia<num_used;ia++)
              {
                if (d_dist[ia]<thr)
                  {
                    int index1=ds->index_dat[voxel1];
                    int index2=ds->index_dat[d_index[ia]];
                    //std::cout << index1 << "," << index2 << std::endl;
                    double dist=computeDistance(index1,index2,ds->dim,ds->spa);
                    //std::cout << index1 << "," << index2 << ":" << dist << std::endl;
                    ds->output_array[thread].push_back(index1);
                    ds->output_array[thread].push_back(index2);
                    ds->output_array[thread].push_back(d_dist[ia]);
                    ds->output_array[thread].push_back(dist);
                  }
              }
            // This adds itself as a zero
            int index=ds->index_dat[voxel1];
            ds->output_array[thread].push_back(index);
            ds->output_array[thread].push_back(index);
            ds->output_array[thread].push_back(0.0);
            ds->output_array[thread].push_back(0.0);
          }
      }

    std::cout << "++++      Thread (" << thread << ") done numpairs=" << ds->output_array[thread].size()/ds->numcols << std::endl;

    delete [] d_dist;
    delete [] d_index;
    delete [] d_tmp;
  }
  // ---------------------------------------------------------------------------
  static void radiusThreadFunction(bisvtkMultiThreader::vtkMultiThreader::ThreadInfo *data)
  {
    bisMThreadStructure   *ds = (bisMThreadStructure *)(data->UserData);
    int thread=data->ThreadID;
    int numthreads=data->NumberOfThreads;

    int slicerange[2];
    bisImageDistanceMatrix_ComputeFraction(thread,numthreads,ds->dim[2],slicerange);
    if (slicerange[1]==0)
      slicerange[1]=1;

    std::cout << "++++ Radius Matrix Thread(" << thread << ") radius=" << ds->DistanceRadius << " computing slices " << slicerange[0] << "->" << slicerange[1] << std::endl;

    float DistanceRadius2=ds->DistanceRadius*ds->DistanceRadius;
    int slicesize=ds->dim[0]*ds->dim[1];
    int dslice=(slicerange[1]-slicerange[0])/5;
    if (dslice<1)
      dslice=1;
    // Normalize maxintensity
    for (int k=slicerange[0];k<slicerange[1];k++)
      {
        int kmin=k-int(ds->DistanceRadius/ds->spa[2]); if (kmin<0) kmin=0;
        int kmax=k+int(ds->DistanceRadius/ds->spa[2]); if (kmax>=ds->dim[2]) kmax=ds->dim[2]-1;
        for (int j=0;j<ds->dim[1];j++)
          {
            int jmin=j-int(ds->DistanceRadius/ds->spa[1]); if (jmin<0) jmin=0;
            int jmax=j+int(ds->DistanceRadius/ds->spa[1]); if (jmax>=ds->dim[1]) jmax=ds->dim[1]-1;
            for (int i=0;i<ds->dim[0];i++)
              {
                int imin=i-int(ds->DistanceRadius/ds->spa[0]); if (imin<0) imin=0;
                int imax=i+int(ds->DistanceRadius/ds->spa[0]); if (imax>=ds->dim[0]) imax=ds->dim[0]-1;
                int vox_index=i+j*ds->dim[0]+k*slicesize;
                double v[3];
                v[0]=ds->index_dat[vox_index];
                short w0=ds->wgt_dat[vox_index];
                int index1=vox_index*ds->numframes;

                if (v[0]>0.0)
                  {
                    v[1]=v[0];
                    v[2]=0.0;
                    //		  v[3]=0.0;
                    ds->output_array[thread].push_back(v[0]);
                    ds->output_array[thread].push_back(v[1]);
                    ds->output_array[thread].push_back(0.0);
                    ds->output_array[thread].push_back(0.0);


                    for (int ka=kmin;ka<=kmax;ka++)
                      for (int ja=jmin;ja<=jmax;ja++)
                        for (int ia=imin;ia<=imax;ia++)
                          {
                            int sec_index=ia+ja*ds->dim[0]+ka*slicesize;
                            v[1]=ds->index_dat[sec_index];
                            short w1=ds->wgt_dat[sec_index];

                            if (v[1]>0.0 && w1==w0)
                              {
                                double dist=
                                  pow(double(ka-k)*ds->spa[2],2.0)+
                                  pow(double(ja-j)*ds->spa[1],2.0)+
                                  pow(double(ia-i)*ds->spa[0],2.0);
                                if (dist<=DistanceRadius2 && dist>0.01)
                                  {
                                    int index2=sec_index*ds->numframes;
                                    v[2]=0.0;
                                    for (int frame=0;frame<ds->numframes;frame++)
                                      v[2]+=pow(ds->img_dat[index1+frame]-ds->img_dat[index2+frame],2.0f);
                                    v[2]=(v[2])*ds->normalization;
                                    //  v[3]=dist;
                                    ds->output_array[thread].push_back(v[0]);
                                    ds->output_array[thread].push_back(v[1]);
                                    ds->output_array[thread].push_back(v[2]);
                                    ds->output_array[thread].push_back(dist);
                                  }
                              }
                          }
                  }
              }
          }
      }
    std::cout << "++++      Thread (" << thread << ") done numpairs=" << ds->output_array[thread].size()/ds->numcols << std::endl;

  }


  // --------------------------------------------------------------------------------------------------------
  static void temporalSparseThreadFunction(bisvtkMultiThreader::vtkMultiThreader::ThreadInfo *data)
  {
    bisMThreadStructure *ds = (bisMThreadStructure *)(data->UserData);
    int thread=data->ThreadID;
    int numthreads=data->NumberOfThreads;
    int framerange[2];

    bisImageDistanceMatrix_ComputeFraction(thread,numthreads,ds->numframes,framerange);
    std::cout << "++++ Temporal Sparse Matrix Thread (" << thread << "). Computing " << framerange[0] << ":" << framerange[1] << std::endl;
    float* d_dist=new float[ds->numframes];
    float* d_tmp =new float[ds->numframes];

    for (int frame1=framerange[0];frame1<framerange[1];frame1++)
      {
        d_tmp[frame1]=0.0;
        d_dist[frame1]=0.0;

        for (int frame2=0;frame2<ds->numframes;frame2++)
          {
            if (frame2!=frame1)
              {
                int index1=frame1*ds->numvoxels;
                int index2=frame2*ds->numvoxels;
                double sum=0.0;
                for (int voxel=0;voxel<ds->numvoxels;voxel++)
                  sum+=pow(ds->img_dat[index1+voxel]-ds->img_dat[index2+voxel],2.0f);
                d_dist[frame2]=sum;
                d_tmp[frame2]=sum;
              }
          }

        double thr=selectKthLargest(ds->numbest,ds->numframes,d_tmp);

        for (int frame2=0;frame2<ds->numframes;frame2++)
          {
            if (d_dist[frame2]<thr)
              {
                ds->output_array[thread].push_back(frame1);
                ds->output_array[thread].push_back(frame2);
                ds->output_array[thread].push_back(d_dist[frame2]);
              }
          }
      }

    std::cout << "++++      Thread (" << thread << ") done numpairs=" << ds->output_array[thread].size()/ds->numcols << std::endl;

    delete [] d_dist;
    delete [] d_tmp;
  }

  // ---------------------------------------------------------------------------
  int createSparseMatrixParallel(bisSimpleImage<float>* Input,
                                 bisSimpleImage<short>* ObjectMap,
                                 bisSimpleImage<int>* IndexMap,
                                 bisSimpleMatrix<double>* Output,
                                 float sparsity,int numthreads)
  {
    float Sparsity=bisUtil::frange(sparsity,0.001,50.0);
    int NumberOfThreads=bisUtil::irange(numthreads,1,VTK_MAX_THREADS);


    if (!checkInputImages(Input,ObjectMap,IndexMap))
      return 0;

    int d[3]; Input->getImageDimensions(d);
    int nv=d[0]*d[1]*d[2];
    if (nv<NumberOfThreads)
      NumberOfThreads=nv;

    std::cout << "++++ CreateSparseMatrixParallel sparsity=" << Sparsity << " Number Of Threads= "
              << NumberOfThreads << " (max=" << VTK_MAX_THREADS  << ")" << std::endl;
    bisMThreadStructure* ds=  createThreadStructure(Input,ObjectMap,IndexMap,NumberOfThreads,Sparsity);
    Input->getImageDimensions(ds->dim);
    Input->getImageSpacing(ds->spa);


    std::stringstream strss;  strss <<  "Numgoodvox=" << ds->numgoodvox << ", expected total size=" << ds->numgoodvox*ds->numbest;
    bisvtkMultiThreader::runMultiThreader((bisvtkMultiThreader::vtkThreadFunctionType)&sparseThreadFunction,ds,strss.str(),NumberOfThreads,1);
    combineVectorsToCreateSparseMatrix(Output,ds->output_array,ds->numcols,NumberOfThreads);
    double density=100.0*Output->getNumRows()/(double(ds->numgoodvox*ds->numgoodvox));
    std::cout << "++++ Sparse matrix done. Final density: num_rows=" << ds->numgoodvox << " density=" << density << "% (components=" << Output->getNumCols() << ")" << std::endl;


    delete ds;
    return 1;
  }


  int createRadiusMatrixParallel(bisSimpleImage<float>* Input,
                                 bisSimpleImage<short>* ObjectMap,
                                 bisSimpleImage<int>* IndexMap,
                                 bisSimpleMatrix<double>* Output,
                                 float radius,int numthreads)
  {

    int NumberOfThreads=bisUtil::irange(numthreads,1,VTK_MAX_THREADS);
    float DistanceRadius=bisUtil::frange(radius,1.0,4000.0);

    if (!checkInputImages(Input,ObjectMap,IndexMap))
      return 0;


    int d[3]; Input->getImageDimensions(d);
    if (d[2]<NumberOfThreads)
      NumberOfThreads=d[2];

    std::cout << "++++ Beginning CreateRadiusMatrixParallel. Radius=" << DistanceRadius << ", numthreads=" << NumberOfThreads << std::endl;

    float spa[3]; Input->getImageSpacing(spa);

    int nbest=1;
    double meanspa=0.0;
    for (int ia=0;ia<=2;ia++)
      {
        nbest=nbest*(2*int(radius/spa[ia]+0.5)+1);
        meanspa+=spa[ia];
      }
    meanspa=meanspa/3.0;

    double r[2]; Input->getRange(r);
    double minintensity=r[0];
    double maxintensity=r[1];

    maxintensity=maxintensity-minintensity;
    if (maxintensity<0.0001)
      maxintensity=0.0001;

    bisMThreadStructure* ds=createThreadStructure(Input,ObjectMap,IndexMap,NumberOfThreads,0.0,nbest);

    ds->DistanceRadius=DistanceRadius;
    Input->getImageDimensions(ds->dim);
    Input->getImageSpacing(ds->spa);
    ds->maxintensity=maxintensity;
    ds->normalization=1.0;

    std::cout << "++++ Parameters: maxintensity" << ds->maxintensity << ", numframes=" << ds->numframes << " distradius=" <<
      ds->DistanceRadius << std::endl;
    std::cout << "++++ Normalization=" << ds->normalization << " Mean spacing=" << meanspa << std::endl;

    std::stringstream strss;  strss <<  "Numgoodvox=" << ds->numgoodvox << ", expected total size=" << ds->numgoodvox*ds->numbest;
    bisvtkMultiThreader::runMultiThreader((bisvtkMultiThreader::vtkThreadFunctionType)&radiusThreadFunction,ds,strss.str(),NumberOfThreads,1);

    combineVectorsToCreateSparseMatrix(Output,ds->output_array,ds->numcols,NumberOfThreads);
    double density=100.0*Output->getNumRows()/(double(ds->numgoodvox*ds->numgoodvox));
    std::cout << "++++ Radius matrix done. Final density: num_rows=" << ds->numgoodvox << " density=" << density << "% (components=" << Output->getNumCols() << ")" << std::endl;

    delete ds;
    return 1;
  }

  // ---------------------------------------------------------------------------
  int createSparseMatrixParallelTemporal(bisSimpleImage<float>* Input,
                                         bisSimpleMatrix<double>* Output,
                                         float sparsity,int numthreads)
  {
    float Sparsity=bisUtil::frange(sparsity,0.001,50.0);
    int NumberOfThreads=bisUtil::irange(numthreads,1,VTK_MAX_THREADS);


    int d[3]; Input->getImageDimensions(d);
    int nv=d[0]*d[1]*d[2];
    if (nv<NumberOfThreads)
      NumberOfThreads=nv;

    std::cout << "++++ CreateSparseMatrixParallel sparsity=" << Sparsity << " Number Of Threads= "
              << NumberOfThreads << " (max=" << VTK_MAX_THREADS  << ")" << std::endl;

    bisMThreadStructure* ds=  new bisMThreadStructure();
    int dim[5]; Input->getDimensions(dim);
    ds->img_dat=Input->getData();
    ds->numvoxels=dim[0]*dim[1]*dim[2];
    ds->numframes=dim[3]*dim[4];
    ds->numbest=int(sparsity*ds->numframes)+1;
    ds->numcols=3;

    int piecesize=2*(ds->numbest*ds->numframes)/NumberOfThreads;
    for (int i=0;i<NumberOfThreads;i++)
      {
        ds->output_array[i].clear();
        ds->output_array[i].reserve(piecesize);
      }

    std::stringstream strss;  strss <<  "Numbest=" << ds->numbest << ", expected total size=" << ds->numframes*ds->numbest;
    bisvtkMultiThreader::runMultiThreader((bisvtkMultiThreader::vtkThreadFunctionType)&temporalSparseThreadFunction,ds,strss.str(),NumberOfThreads,1);
    combineVectorsToCreateSparseMatrix(Output,ds->output_array,ds->numcols,NumberOfThreads);
    std::cout << "Total Rows=" << Output->getNumRows() << " frames=" << ds->numframes << std::endl;
    double density=100.0*Output->getNumRows()/(double(ds->numframes*ds->numframes));
    std::cout << "++++ Sparse matrix done. Final density: num_rows=" << ds->numframes << " density=" << density << "% (components=" << Output->getNumCols() << ")" << std::endl;
    delete ds;
    return 1;
  }






  // ----------------------------------------------------------------------------------
  //
  // -------------------------- reformat Image Code -- make patches into frames


  static void reformatThreadFunction(bisvtkMultiThreader::vtkMultiThreader::ThreadInfo *data) {

    bisMImagePair   *ds = (bisMImagePair *)(data->UserData);
    int thread=data->ThreadID;
    int numthreads=data->NumberOfThreads;

    int slicerange[2];
    bisImageDistanceMatrix_ComputeFraction(thread,numthreads,ds->dim[2],slicerange);
    if (slicerange[1]==0)
      slicerange[1]=1;

    std::cout << "++++ reformatImage Thread(" << thread << ") radius=" << ds->radius[0] << "," << ds->radius[1] << "," << ds->radius[2];
    std::cout << ", computing slices " << slicerange[0] << "->" << slicerange[1] << " numframes=" << ds->numframes << std::endl;


    int volumesize=ds->dim[0]*ds->dim[1]*ds->dim[2];
    int slicesize=ds->dim[0]*ds->dim[1];

    int voxel=slicerange[0]*slicesize;

    for (int k=slicerange[0];k<slicerange[1];k++) {
      for (int j=0;j<ds->dim[1];j++) {
        for (int i=0;i<ds->dim[0];i++) {

          int frame=0;

          for (int ka=-ds->radius[2];ka<=ds->radius[2];ka++) {
            int newk=k+ka*ds->increment[2];
            if (newk<0)
              newk=0;
            else if (newk>=ds->dim[2])
              newk=ds->dim[2]-1;

            //std::cout << "ka = " << ka << "-->" << newk << std::endl;

            for (int ja=-ds->radius[1];ja<=ds->radius[1];ja++) {
              int newj=j+ja*ds->increment[1];
              if (newj<0)
                newj=0;
              else if (newj>=ds->dim[1])
                newj=ds->dim[1]-1;

              //std::cout << "ja = " << ja << "-->" << newj << std::endl;

              for (int ia=-ds->radius[0];ia<=ds->radius[0];ia++) {
                int newi=i+ia*ds->increment[0];
                if (newi<0)
                  newi=0;
                else if (newi>=ds->dim[0])
                  newi=ds->dim[0]-1;



                ds->odata[volumesize*frame+voxel]=ds->idata[newk*slicesize+newj*ds->dim[0]+newi];
                ++frame;
              } //ia
            } //ja
          } //ka
          ++voxel;
        } //i
      } //j
    } //k



  }


  int reformatImage(bisSimpleImage<float>* input, bisSimpleImage<float>* output,int radius[3],int increment[3],int NumberOfThreads=4) {

    // First copy data around
    int numframes=1;
    for (int i=0;i<=2;i++) {
      if (increment[i]<1)
        increment[i]=1;
      if (increment[i]>4)
        increment[i]=4;
      if (radius[i]<1)
        radius[i]=1;
      else if (radius[i]>4)
        radius[i]=4;
      numframes=numframes*(1+2*radius[i]);
    }

    int dim[5]; input->getDimensions(dim);
    dim[3]=numframes; dim[4]=1;
    float spa[5]; input->getSpacing(spa);
    output->allocateIfDifferent(dim,spa);

    std::cout << "++++ Allocating output image " << dim[0] << "*" << dim[1] << "*" << dim[2] << ", numframes=" << numframes << std::endl;
    std::cout << "++++ \t radius = " << radius[0] << "," << radius[1] << "," << radius[2] << std::endl;

    bisMImagePair* ds=  new bisMImagePair();
    ds->idata=input->getImageData();
    ds->odata=output->getImageData();
    for (int i=0;i<=2;i++) {
      ds->dim[i]=dim[i];
      ds->radius[i]=radius[i];
      ds->increment[i]=increment[i];
    }
    ds->numframes=numframes;

    bisvtkMultiThreader::runMultiThreader((bisvtkMultiThreader::vtkThreadFunctionType)&reformatThreadFunction,ds,"Reformat Image",NumberOfThreads);
    delete ds;
    return numframes;
  }

  // End name space
}

// -----------------------------------------------------------------------------------------------------------------------

namespace bisSparseEigenSystem {



  // sparseMatrix is output of createSparseMatrixParallel/createSparseMatrixRadius  4 columns i,j, dist and euc dist

  int computeEigenVectors(bisSimpleMatrix<double>* sparseMatrix,
                          bisSimpleImage<int>*     indexMap,
                          bisSimpleImage<float>*   eigenVectors,
                          int maxeigen=10,
                          double sigma=1.0, double lambda=0.0,double tolerance=0.001,int maxiter=50,float scale=10000) {


#ifndef _WIN32

    int nt=sparseMatrix->getNumRows();
    int nc=sparseMatrix->getNumCols();

    if (nc!=4 || nt< 4) {
      std::cerr << "Bad Distance Matrix " << nt << "*" << nc << std::endl;
      return 0;
    }

    double* inp_dat=sparseMatrix->getData();
    double r[2]; indexMap->getRange(r);
    int numrows=int(r[1]);

    std::cout << "+++++ Beginning sparse eigensystem: numelements=" << nt << " numrows=" << numrows << std::endl;

    // Assume I have exponentiated and normalized
    // 1. Compute Median
    // 2. Exponentiate

    // Inp_dat is an array of size nt*3



    // Compute The Median
    // Take every nth value to compute the median (for now n=1)
    int samplerate=1;
    int numvalues=int(nt/samplerate);
    float* values=new float[numvalues];
    for(int i=0;i<numvalues;i++) {
      int offset=i*(nc*samplerate);
      values[i]=inp_dat[offset+2]+lambda*inp_dat[offset+3];
    }
    float median=bisImageDistanceMatrix::selectKthLargest(numvalues/2,numvalues,values);
    delete [] values;
    if (median<0.00001)
      median=0.00001;
    if (sigma<0.0001)
      sigma=0.0001;
    double factor=1.0/(median*sigma);


    std::cout << "+++++ Computing Degree ... median= " << median << "factor= " << factor << " lamda=" << lambda << " sigma=" << sigma << std::endl;


    // remember row,col in input sparse matrix triple are 1-offset so subtract 1 for row,col
    BISTYPE* D=new BISTYPE[numrows];
    for (int i=0;i<numrows;i++)
      D[i]=0.0;
    int index=0;

    int minrow=(int)inp_dat[0],maxrow=(int)inp_dat[0];


    for (int i=0;i<nt;i++)
      {
        int row=(long)inp_dat[index]-1;
        double v2=inp_dat[index+2]+lambda*inp_dat[index+3];
        double v=exp(-v2*factor);

        //        inp_dat[index+2]=v;
        //      if (row%step==0 && abs(col-row)<10 )
        //fprintf(stdout,"Reporting %d,%d = \t %f->%f\n",row,col,v2,v);

        D[row]+=v;
        if (row<minrow)
          minrow=row;
        else if (row>maxrow)
          maxrow=row;
        index+=nc;
      }

    std::cout << "++++ Minrow=" << minrow << "\t maxrow=" << maxrow << std::endl;

    // Compute Dinv plus regularizer
    int step=numrows/7;
    for (int row=0;row<numrows;row++)
      {
        D[row]=1.0/sqrt(D[row]+1.0);
        if (row%step == 0 || row==numrows-1)
          std::cout << "+++++ 1.0/sqrt(Degree) row=" << row+1 << " D=" << D[row] << std::endl;
      }


    std::cout << "+++++ Storing in Sparse matrix " << numrows << "*" << numrows << std::endl;
    // Store in Sparse Matrix
    // remember row,col in input sparse matrix triple are 1-offset so subtract 1 for row,col -- Ignore

    typedef Eigen::Triplet<BISTYPE> T;
    std::vector<T> tripletList;
    tripletList.reserve(nt*2);
    index=0;
    std::cout << "+++++ Allocated in Sparse matrix " << std::endl;
    for(int i = 0; i < nt; i++) {
      long row=(long)inp_dat[index]-1;
      long col=(long)inp_dat[index+1]-1;
      double v0=inp_dat[index+2]+lambda*inp_dat[index+3];
      double v1=exp(-v0*factor);

      if (row==col)
	{
	  // Add 0.5 regularizer to diagonal ...
	  BISTYPE v=D[row]*D[row]*(v1+0.5);
	  tripletList.push_back(T(row,col,v));
	}
      else
	{
	  BISTYPE v=0.5*D[row]*D[col]*v1;
	  tripletList.push_back(T(row,col,v));
	  tripletList.push_back(T(col,row,v));
	}
      index+=nc;
    }

    delete [] D;

    std::cout << "+++++ Beginning eigendecomposition num triplets=" << tripletList.size() << std::endl;
    // Now On To Solver from Spectra
    Eigen::SparseMatrix<BISTYPE> M(numrows,numrows);
    M.setFromTriplets(tripletList.begin(),tripletList.end());
    std::cout << "+++++ Compressed Matrix created" << std::endl;


    Spectra::SparseGenMatProd<BISTYPE> op(M);
    Spectra::SymEigsSolver< BISTYPE, Spectra::LARGEST_ALGE, Spectra::SparseGenMatProd<BISTYPE> > eigs(&op,  maxeigen, maxeigen*2);

    eigs.init();
    std::cout << "+++++ Init Done on to Compute " << maxeigen << " Eigenvalues (tolerance=" << tolerance << " maxiter=" << maxiter << ")" << std::endl;

    int nconv = eigs.compute(maxiter,tolerance);

    // Retrieve results
    if(eigs.info() != Spectra::SUCCESSFUL) {
      std::cerr << "---- Eigen decomposition failed " << std::endl;
      return 0;
    }

    int numeigen=eigs.eigenvalues().size();
    std::cout << "+++++ Done with Eigendecomposition (numeigen=" << numeigen << "), nconv=" << nconv << std::endl;

    int tenth=numeigen/10;
    if (tenth<1)
      tenth=1;
    for (int ia=0;ia<numeigen;ia+=tenth) {
      float l=eigs.eigenvalues().coeff(ia);
      std::cout << "+++++\t Eigenvalue " << ia+1 << "/" << numeigen << " = " << l << std::endl;
    }

    int numeigenrows=eigs.eigenvectors().rows();
    int numeigencols=eigs.eigenvectors().cols();

    std::cout << "+++++ numeigenrows*numeigencols=" << numeigenrows << "*" << numeigencols << std::endl;
    std::cout.flush();

    int dim[5];   indexMap->getDimensions(dim);
    dim[3]=numeigen; dim[4]=1;
    float spa[5]; indexMap->getSpacing(spa);

    eigenVectors->allocateIfDifferent(dim,spa);
    eigenVectors->fill(0.0);
    float* eig_dat=eigenVectors->getImageData();

    int* ind_dat=indexMap->getImageData();
    BISTYPE *eigcolmajor=eigs.eigenvectors().data();

    int volumesize=dim[0]*dim[1]*dim[2];
    int eleventh=volumesize/11;
    int numgood=0;
    for (int voxel=0;voxel<volumesize;voxel++)
      {
        int index=ind_dat[voxel]-1;
        if (voxel%eleventh==0 || (index>=0 && numgood < 10 ))
          std::cout << "voxel=" << voxel << "\t" << index << std::endl;

        if (index>=0) {
          numgood++;
          for (int frame=0;frame<numeigen;frame++) {
            int ia=voxel+frame*volumesize;
            int ib=frame*numeigenrows+index;
            eig_dat[ia]=eigcolmajor[ib]*scale;
          }
        }
      }

    std::cout << "++++ Done Assigning numgood=" << numgood << " vs " << volumesize << std::endl;
    double range[2];
    eigenVectors->getRange(range);
    std::cout << "+++++ Range of eigenvector image =" << range[0] << ":" << range[1] << " Numeigen=" << numeigen << std::endl;
    return numeigen;
#else
    return 0;
#endif
  }

  // ----------------------------------------------------------------------------------

  int eigenvectorDenoiseImage(bisSimpleImage<float>* Input,
                              bisSimpleImage<float>* Eigenvectors,
                              bisSimpleImage<float>* Output,
                              float scale)
  {


    int dim[5]; Input->getDimensions(dim);
    int dim2[5]; Eigenvectors->getDimensions(dim2);
    float* idata=Input->getData();
    float* edata=Eigenvectors->getImageData();

    Output->copyStructure(Input);
    float* odata=Output->getImageData();



    int numinputframes=dim[3]*dim[4];
    int numeigenvectors=dim2[3]*dim2[4];

    std::cout << "++++ denoiseImageParallel scale=" << scale << " numeigenvectors=" << numeigenvectors << std::endl;

    int volumesize=dim[0]*dim[1]*dim[2];
    double* coeff=new double[numeigenvectors];

    for (int frame=0;frame<numinputframes;frame++) {

      int i_offset=frame*volumesize;
      std::cout << "Frame=" << frame << " off=" << i_offset << std::endl;

      for (int c=0;c<numeigenvectors;c++) {
        coeff[c]=0.0;
        int e_offset=c*volumesize;
        for (int voxel=0;voxel<volumesize;voxel++) {
          coeff[c]+=idata[i_offset+voxel]*edata[e_offset+voxel];
        }
        coeff[c]/=(scale*scale);
        std::cout << "Coeff=" << c << " = " << coeff[c] << " e_offset=" << e_offset << std::endl;
      }

      for (int voxel=0;voxel<volumesize;voxel++) {
        odata[voxel]=0.0;
        for (int c=0;c<numeigenvectors;c++)
          odata[voxel]+=edata[c*volumesize+voxel]*coeff[c];
      }
    }
    delete [] coeff;
    return 1;
  }

  // -----------------------------------------------------------------------------------------------------------------------
  // End of namespace
}

// -----------------------------------------------------------------------------------------------------------------------

// --------------- External stufff --------------------------------------

/** Computes a sparse distance matrix among voxels in the image
 * @param input serialized 4D input file as unsigned char array
 * @param objectmap serialized input objectmap as unsigned char array
 * @param jsonstring the parameter string for the algorithm
 * { "useradius" : false, "radius" : 2.0, sparsity : 0.01, numthreads: 4}
 * @param debug if > 0 print debug messages
 * @returns a pointer to the sparse distance matrix serialized
 */
// BIS: { 'computeImageDistanceMatrixWASM', 'bisImage', [ 'bisImage', 'bisImage', 'ParamObj', 'debug' ], {"checkorientation" : "all"} }
unsigned char* computeImageDistanceMatrixWASM(unsigned char* input, unsigned char* objectmap,const char* jsonstring,int debug) {

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok)
    return 0;

  if (debug)
    params->print();

  std::unique_ptr<bisSimpleImage<float> > inp_image(new bisSimpleImage<float>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<short> > obj_image(new bisSimpleImage<short>("obj_image"));
  if (objectmap) {
    if (!obj_image->linkIntoPointer(objectmap))
      return 0;
  } else {
    std::cout << "++++ creating mask as none was provided" << std::endl;
    int dim[5];   inp_image->getDimensions(dim);
    float spa[5]; inp_image->getSpacing(spa);
    dim[3]=1; dim[4]=1;
    obj_image->allocate(dim,spa);
    obj_image->fill(1);
  }


  int useradius=params->getBooleanValue("useradius",true);
  float radius=params->getFloatValue("radius",2.0);
  float sparsity=params->getFloatValue("sparsity",0.01);
  int numthreads=params->getIntValue("numthreads",4);
#ifdef _WIN32
  if (numthreads>1) {
	std::cout << ".... Windows: forcing numthreads=" << 1 << std::endl;
	numthreads=1;
  }
#endif

  if (debug)  {
    std::cout << "........................" << std::endl;
    std::cout << ".... Beginning image distance matrix computation " << std::endl;
    int dim[5]; inp_image->getDimensions(dim);
    std::cout << "....      Input  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    obj_image->getDimensions(dim);
    std::cout << "....      Objectmap  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    std::cout << "........................" << std::endl << std::endl;
  }


  std::unique_ptr<bisSimpleImage<int> > indexmap(bisImageDistanceMatrix::createIndexMap(obj_image.get()));
  std::unique_ptr<bisSimpleMatrix<double> > Output(new bisSimpleMatrix<double>("combined"));

  if (useradius) {
    bisImageDistanceMatrix::createRadiusMatrixParallel(inp_image.get(),obj_image.get(),indexmap.get(),Output.get(),radius,numthreads);
  } else {
    bisImageDistanceMatrix::createSparseMatrixParallel(inp_image.get(),obj_image.get(),indexmap.get(),Output.get(),sparsity,numthreads);
  }

  return Output->releaseAndReturnRawArray();
}


/** Computes a sparse temporal distance matrix among frames in the image (patches perhaps)
 * @param input serialized 4D input file as unsigned char array
 * @param jsonstring the parameter string for the algorithm
 * { sparsity : 0.01, numthreads: 4 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to the sparse distance matrix serialized
 */
// BIS: { 'computeTemporalImageDistanceMatrixWASM', 'Matrix', [ 'bisImage', 'ParamObj', 'debug' ], {"checkorientation" : "all"} }
unsigned char* computeTemporalImageDistanceMatrixWASM(unsigned char* input,const char* jsonstring,int debug) {

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok)
    return 0;

  if (debug)
    params->print();

  std::unique_ptr<bisSimpleImage<float> > inp_image(new bisSimpleImage<float>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  float sparsity=params->getFloatValue("sparsity",0.01);
  int numthreads=params->getIntValue("numthreads",4);

#ifdef _WIN32
  if (numthreads>1) {
	std::cout << ".... Windows: forcing numthreads=" << 1 << std::endl;
	numthreads=1;
  }
#endif


  if (debug)  {
    std::cout << "........................" << std::endl;
    std::cout << ".... Beginning temporal image distance matrix computation " << std::endl;
    int dim[5]; inp_image->getDimensions(dim);
    std::cout << "....      Input  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
  }


  std::unique_ptr<bisSimpleMatrix<double> > Output(new bisSimpleMatrix<double>("combined"));
  bisImageDistanceMatrix::createSparseMatrixParallelTemporal(inp_image.get(),Output.get(),sparsity,numthreads);
  return Output->releaseAndReturnRawArray();
}

/** Creates an indexmap image
 * @param input objectmap
 * @param debug if > 0 print debug messages
 * @returns a pointer to the serialized index map image (int)
 */
// BIS: { 'computeImageIndexMapWASM', 'bisIamage', [ 'bisImage', 'debug' ]
unsigned char* computeImageIndexMapWASM(unsigned char* input,int debug) {


  std::unique_ptr<bisSimpleImage<short> > inp_image(new bisSimpleImage<short>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  if (debug)  {
    std::cout << "........................" << std::endl;
    std::cout << ".... Beginning image indexmap computation " << std::endl;
    int dim[5]; inp_image->getDimensions(dim);
    std::cout << "....      Input  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
  }

  std::unique_ptr<bisSimpleImage<int> > result(bisImageDistanceMatrix::createIndexMap(inp_image.get()));
  return result->releaseAndReturnRawArray();
}

/** Creates a reformatted image where a patch is mapped into frames. This is so as to recycle the ImageDistanceMatrix code for
 * patch distances as opposed to frame comparisons
 * @param input serialized 3D input file as unsigned char array
 * @param jsonstring the parameter string for the algorithm
 * { "radius" : 2,  numthreads: 4 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to the reformated image
 */
// BIS: { 'createPatchReformatedImage', 'bisImage', [ 'bisImage', 'ParamObj',  'debug' ] }
unsigned char* createPatchReformatedImage(unsigned char* input,const char* jsonstring,int debug) {

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok)
    return 0;

  if (debug)
    params->print();

  std::unique_ptr<bisSimpleImage<float> > inp_image(new bisSimpleImage<float>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  int radius=params->getIntValue("radius",2);
  int numthreads=params->getIntValue("numthreads",4);
  int increment=params->getIntValue("increment",1);

#ifdef _WIN32
  if (numthreads>1) {
	std::cout << ".... Windows: forcing numthreads=" << 1 << std::endl;
	numthreads=1;
  }
#endif

  if (debug)  {
    std::cout << "........................" << std::endl;
    std::cout << ".... Beginning reformatted image " << std::endl;
    int dim[5]; inp_image->getDimensions(dim);
    std::cout << "....      Input  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    std::cout << "........................" << std::endl << std::endl;
  }

  int rad[3] = { radius,radius,radius };
  int incr[3] = { increment,increment,increment };

  std::unique_ptr<bisSimpleImage<float> > out_image(new bisSimpleImage<float>("output"));
  bisImageDistanceMatrix::reformatImage(inp_image.get(),out_image.get(),rad,incr,numthreads);
  return out_image->releaseAndReturnRawArray();
}



/** Compute sparse Eigen Vectors based on distance Matrix and IndexMap
 * @param sparseMatrix the sparse Matrix (output of computeImageDistanceMatrix)
 * @param indexMap the indexMap image (output of computeImageIndexMap)
 * @param eigenVectors the output eigenVector image
 * @param jsonstring the parameter string for the algorithm
 * { "maxeigen" : 10, "sigma" : 1.0, "lambda" : 0.0, "tolerance" : 0.00001 , "maxiter" : 500, "scale" : 10000 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to the reformated image
 */
// BIS: { 'computeSparseImageEigenvectorsWASM', 'bisImage', [ 'Matrix', 'bisImage', 'ParamObj',  'debug' ] }
unsigned char* computeSparseImageEigenvectorsWASM(unsigned char* input, unsigned char* indexmap,const char* jsonstring,int debug) {

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok)
    return 0;

  if (debug)
    params->print();

  std::unique_ptr<bisSimpleMatrix<double> > dist_matrix(new bisSimpleMatrix<double>("inp_matrix"));
  if (!dist_matrix->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<int> > obj_image(new bisSimpleImage<int>("indexmap_image"));
  if (!obj_image->linkIntoPointer(indexmap))
    return 0;

  int   maxeigen=params->getIntValue("maxeigen",10);
  float  sigma=params->getFloatValue("sigma",1.0);
  float  lambda=params->getFloatValue("lambda",0.0);
  float  tolerance=params->getFloatValue("tolerance",1.0e-5);
  int iter=params->getIntValue("maxiter",500);
  float scale=params->getFloatValue("scale",10000);

  if (debug)  {
    std::cout << "........................" << std::endl;
    std::cout << ".... Beginning image distance matrix computation " << std::endl;
    int rows=dist_matrix->getNumRows();
    int cols=dist_matrix->getNumCols();

    std::cout << "....      Input  Matrix=" << rows << "*" << cols << std::endl;
    int dim[5]; obj_image->getDimensions(dim);
    std::cout << "....      Indexmap  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    std::cout << "........................" << std::endl << std::endl;
  }


  std::unique_ptr<bisSimpleImage<float> > Output(new bisSimpleImage<float>("eigenvect"));
  bisSparseEigenSystem::computeEigenVectors(dist_matrix.get(),obj_image.get(),Output.get(),
                                            maxeigen,sigma,lambda,tolerance,iter,scale);
  return Output->releaseAndReturnRawArray();
}




/** Eigenvector denoise image -- project image into eigenspace
 * @param input serialized 3D input file as unsigned char array
 * @param 4D eigenvector image
 * @param jsonstring the parameter string for the algorithm
 * { "scale" : 10000 , numthreads: 4 }
 * @param debug if > 0 print debug messages
 * @returns a pointer to the denoise image
 */
// BIS: { 'computeEigenvectorDenoiseImageWASM', 'bisImage', [ 'bisImage', 'bisImage', 'ParamObj',  'debug' ], {"checkorientation" : "all"} }
unsigned char* computeEigenvectorDenoiseImageWASM(unsigned char* input, unsigned char* eigenvectors,const char* jsonstring,int debug) {

  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok)
    return 0;

  if (debug)
    params->print();

  std::unique_ptr<bisSimpleImage<float> > inp_image(new bisSimpleImage<float>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<float> > eig_image(new bisSimpleImage<float>("obj_image"));
  if (!eig_image->linkIntoPointer(eigenvectors))
    return 0;

  float scale=params->getFloatValue("scale",10000.0);

  if (debug)  {
    std::cout << "........................" << std::endl;
    std::cout << ".... Beginning image eigenvector denoising " << std::endl;
    int dim[5]; inp_image->getDimensions(dim);
    std::cout << "....      Input  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    eig_image->getDimensions(dim);
    std::cout << "....      Eigenvector  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    std::cout << "........................" << std::endl << std::endl;
  }

  std::unique_ptr<bisSimpleImage<float> > Output(new bisSimpleImage<float>("output"));
  bisSparseEigenSystem::eigenvectorDenoiseImage(inp_image.get(),eig_image.get(),Output.get(),scale);
  return Output->releaseAndReturnRawArray();

}
