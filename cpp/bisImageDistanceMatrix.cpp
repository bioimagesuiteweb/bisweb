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


#include "bisImageDistanceMatrix.h"
#include "bisJSONParameterList.h"
#include "bisUtil.h"
#include <algorithm>


namespace bisImageDistanceMatrix {

  float SelectKthLargest(unsigned long k0offset, unsigned long n, float* arr0offset)
  {

    std::nth_element(arr0offset,arr0offset+k0offset,arr0offset+n);
    return arr0offset[k0offset];
  }

  std::unique_ptr<bisSimpleImage<int> > createIndexMap(bisSimpleImage<short>* objectmap) {

    std::unique_ptr<bisSimpleImage<int> > temp(new bisSimpleImage<int>("indexmap"));

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

    double r1[2];
    temp->getRange(r1);
    std::cout << "+++++ ImageDistanceMatrix: Index Map range=(" << r1[0] << ":" << r1[1] << ")" << std::endl;
    return std::move(temp);
  }


  int CheckInputs(bisSimpleImage<float>* Input,bisSimpleImage<short>* ObjectMap,bisSimpleImage<int>* IndexMap) {
    
    int dim[5]; Input->getDimensions(dim);
    float spa[5]; Input->getSpacing(spa);
    
    int dim2[5]; IndexMap->getDimensions(dim2);
    int dim1[5]; ObjectMap->getDimensions(dim2);
  
    int sum=0;
    for (int i=0;i<=2;i++)
      {
        sum+=abs(dim[i]-dim2[i]);
        sum+=abs(dim[i]-dim1[i]);
      }
    if (sum>0)
      {
        std::cerr <<"Input, ObjectMap IndexMap must have the same dimensions. Cannot run sum=" << sum << std::endl;
        return 0;
      }


  
    double r1[2]; ObjectMap->getRange(r1);
    if (r1[1]<1)
      {
        std::cerr <<"Input Object Map has no postive values " << r1[0] << ":" << r1[1] << std::endl;
        return 0;
      }
    
  
    return 1;
  }

  // ------------------------------------------------------------------------------------------------------
  // Threaded Version Of Code
  // ------------------------------------------------------------------------------------------------------
  std::unique_ptr<bisSimpleMatrix<double> > CombineArrays(std::vector<double> output_array[VTK_MAX_THREADS],int nc,int NumberOfThreads)
  {
    int nt=0;

    fprintf(stdout,"+++++\n+++++ Threads completed, combining %d arrays (comp=%d): ",NumberOfThreads,nc);
    for (int i=0;i<NumberOfThreads;i++)
      {
        int n=output_array[i].size()/nc;
        nt+=n;
        std::cout << n << " ";
      }

    std::cout << ", total rows=" << nt << std::endl;
  
    std::unique_ptr<bisSimpleMatrix<double> > combined( new bisSimpleMatrix<double>("combined"));
    combined->zero(nt,nc);

    double* c_dat=combined->getData();

    int index=0;
    for (int i=0;i<NumberOfThreads;i++)
      {
        int num=output_array[i].size();
        if (num>0)
          {
            for (int j=0;j<num;j++)
              c_dat[index+j]=output_array[i][j];
            index+=num;
          }
      }
    return combined;
  }

  bisImageDistanceMatrixThreadStructure* CreateThreadStructure(bisSimpleImage<float>* Input,
                                                               bisSimpleImage<short>* ObjectMap,
                                                               bisSimpleImage<int>* IndexMap,
                                                               int NumberOfThreads,float Sparsity,long NumBest=-1)
  {
    bisImageDistanceMatrixThreadStructure* ds=  new bisImageDistanceMatrixThreadStructure();
    int dim[5]; IndexMap->getDimensions(dim);
    float spa[3]; IndexMap->getImageSpacing(spa);
    ds->img_dat=Input->getData();
    ds->wgt_dat=ObjectMap->getData();
    ds->index_dat=IndexMap->getData();
    ds->numvoxels=dim[0]*dim[1]*dim[2];
    ds->numframes=dim[3]*dim[4];
    ds->numgoodvox=0;

    for (int i=0;i<ds->numvoxels;i++)
      {
        if (ds->index_dat[i]>0)
          ++ds->numgoodvox;
      }

    int numc=3;
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


    if (NumberOfThreads>0)
      {
        int piecesize=2*(ds->numgoodvox*ds->numbest)/NumberOfThreads;
        for (int i=0;i<NumberOfThreads;i++)
          {
            ds->output_array[i].clear();
            ds->output_array[i].reserve(piecesize);
            ds->numcols=numc;
          }
      }
    else
      std::cout << "+++++ Single thread, not allocating thread sub-matrix" << std::endl;

    return ds;
  }

  // --------------------------------------------------------------------------------------------------------
  // Helper Function
  // --------------------------------------------------------------------------------------------------------
  void bisImageDistanceMatrix_ComputeFraction(int thread,int numthreads,int numvoxels,int range[2])
  {
    int step=numvoxels/numthreads;
    range[0]=step*thread;
    range[1]=range[0]+step;
    if (thread==numthreads-1)
      range[1]=numvoxels;
  }
  // --------------------------------------------------------------------------------------------------------
void bisImageDistanceMatrix_SparseThreadFunction(vtkMultiThreader::ThreadInfo *data)
  {
    bisImageDistanceMatrixThreadStructure   *ds = (bisImageDistanceMatrixThreadStructure *)(data->UserData);
    int thread=data->ThreadID;
    int numthreads=data->NumberOfThreads;

  
    int voxelrange[2];
    bisImageDistanceMatrix_ComputeFraction(thread,numthreads,ds->numvoxels,voxelrange);
    fprintf(stdout,"+++++ Sparse Matrix Thread(%d) output_array numvoxels=%ld * numbest=%ld, numframes=%d computing %d->%d.\n",thread,
            ds->numgoodvox,ds->numbest,ds->numframes,voxelrange[0],voxelrange[1]);

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
    int first=0;
  
    for (int voxel1=voxelrange[0];voxel1<voxelrange[1];voxel1++)
      {
        if ((voxel1-voxelrange[0])%voxelfraction==0 && voxel1>voxelrange[0])
          {
            std::cout << "_____ Thread (" << thread << " <<  Processed " << 100.0*double(voxel1-voxelrange[0])/double(dvoxel) << "%, " <<
              "(voxel " << voxel1 << " of " << voxelrange[0] << "->" << voxelrange[1] << ")." << std::endl;
          }
        int v1=ds->index_dat[voxel1];
        short w1=ds->wgt_dat[voxel1];
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

          
            double thr=SelectKthLargest(ds->numbest,num_used,d_tmp);
            ++first;
            if (first<3)
              fprintf(stdout,"***** Thread(%d) thr=%f ds->numbest=%ld num_used=%d numgood=%ld nvox=%ld\n",thread,thr,ds->numbest,num_used,ds->numgoodvox,ds->numvoxels);
	  
            for (int ia=0;ia<num_used;ia++)
              {
                if (d_dist[ia]<thr)
                  {
                    double v[3];
                    v[0]=ds->index_dat[voxel1];
                    v[1]=ds->index_dat[d_index[ia]];
                    v[2]=d_dist[ia];
                    ds->output_array[thread].push_back(v[0]);
                    ds->output_array[thread].push_back(v[1]);
                    ds->output_array[thread].push_back(v[2]);
                  }
              }
            // This adds itself as a zero
            double v[3];
            v[0]=ds->index_dat[voxel1];
            v[1]=v[0];
            v[2]=0.0;
            // this one
            ds->output_array[thread].push_back(v[0]);
            ds->output_array[thread].push_back(v[1]);
            ds->output_array[thread].push_back(v[2]);

	  
          }
      }

    delete [] d_dist;
    delete [] d_index;
    delete [] d_tmp;
  }
  // ---------------------------------------------------------------------------
  static void bisImageDistanceMatrix_RadiusThreadFunction(vtkMultiThreader::ThreadInfo *data)
  {
    bisImageDistanceMatrixThreadStructure   *ds = (bisImageDistanceMatrixThreadStructure *)(data->UserData);
    int thread=data->ThreadID;
    int numthreads=data->NumberOfThreads;

    int slicerange[2];
    bisImageDistanceMatrix_ComputeFraction(thread,numthreads,ds->dim[2],slicerange);

    std::cout << "+++++ Radius Matrix Thread(" << thread << ") radius=" << ds->DistanceRadius << " computing slices " << slicerange[0] << "->" << slicerange[1] << std::endl;
  
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
                    ds->output_array[thread].push_back(v[2]);


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
                                  }
                              }
                          }
                  }
              }
          }
      }
  
  }
// ---------------------------------------------------------------------------
std::unique_ptr<bisSimpleMatrix<double> > CreateSparseMatrixParallel(bisSimpleImage<float>* Input,
                                                                     bisSimpleImage<short>* ObjectMap,
                                                                     bisSimpleImage<int>* IndexMap,
                                                                     float sparsity,int numthreads)
  {
    float Sparsity=bisUtil::frange(sparsity,0.001,50.0);
    int NumberOfThreads=bisUtil::irange(numthreads,1,VTK_MAX_THREADS);


    if (CheckInputs(Input,ObjectMap,IndexMap))
      return 0;

    int d[3]; Input->getImageDimensions(d);
    int nv=d[0]*d[1]*d[2];
    if (nv<NumberOfThreads)
      NumberOfThreads=nv;

    std::cout << "+++++ CreateSparseMatrixParallel sparsity=" << Sparsity << " Number Of Threads= "
              << NumberOfThreads << " (max=" << VTK_MAX_THREADS  << ")" << std::endl;
  
    bisImageDistanceMatrixThreadStructure* ds=  CreateThreadStructure(Input,ObjectMap,IndexMap,NumberOfThreads,Sparsity);
    std::cout << "+++++\n+++++ About to launch " << NumberOfThreads << " threads. Numgoodvox=" << ds->numgoodvox <<
      "expected total size=" << ds->numgoodvox*ds->numbest << "\n+++++\n";
  
    vtkMultiThreader* threader=new vtkMultiThreader();
    threader->SetSingleMethod((vtkThreadFunctionType)&bisImageDistanceMatrix_SparseThreadFunction,ds);
    threader->SetNumberOfThreads(NumberOfThreads);
    threader->SingleMethodExecute();


    std::unique_ptr<bisSimpleMatrix<double> > combined(CombineArrays(ds->output_array,ds->numcols,NumberOfThreads));
    double density=100.0*combined->getNumRows()/(double(ds->numgoodvox*ds->numgoodvox));
    std::cout << "+++++ Sparse matrix done. Final density = num_voxels=" << ds->numgoodvox << " density=" << density << std::endl;
  
    delete ds;
    return combined;
  }


  std::unique_ptr<bisSimpleMatrix<double> > CreateRadiusMatrixParallel(bisSimpleImage<float>* Input,
                                                                       bisSimpleImage<short>* ObjectMap,
                                                                       bisSimpleImage<int>* IndexMap,
                                                                       float radius,int numthreads)
  {
    int NumberOfThreads=bisUtil::irange(numthreads,1,VTK_MAX_THREADS);
    float DistanceRadius=bisUtil::frange(radius,1.0,4000.0);

    if (!CheckInputs(Input,ObjectMap,IndexMap))
      return NULL;

    
    int d[3]; Input->getImageDimensions(d);
    if (d[2]<NumberOfThreads)
      NumberOfThreads=d[2];

  
    std::cout << "+++++ Beginning CreateRadiusMatrixParallel radius=" << DistanceRadius << "numthreads=" << NumberOfThreads << std::endl;
  
    float spa[3]; Input->getImageSpacing(spa);
  
    int nbest=1;
    double meanspa=0.0;
    for (int ia=0;ia<=2;ia++)
      {
        nbest*=(2*int(radius/spa[ia]+0.5)+1);
        meanspa+=spa[ia];
      }
    meanspa/=3.0;

    double r[2]; Input->getRange(r);
    double minintensity=r[0];
    double maxintensity=r[1];

    maxintensity=maxintensity-minintensity;
    if (maxintensity<0.0001)
      maxintensity=0.0001;
  
    bisImageDistanceMatrixThreadStructure* ds=  CreateThreadStructure(Input,ObjectMap,IndexMap,NumberOfThreads,0.0,nbest);
    ds->DistanceRadius=DistanceRadius;
    Input->getImageDimensions(ds->dim);
    Input->getImageSpacing(ds->spa);
    ds->maxintensity=maxintensity;
    ds->normalization=1.0;
    std::cout << "+++++ Parameters: maxintensity" << ds->maxintensity << ", numframes=" << ds->numframes << " distradius=" << 
      ds->DistanceRadius << std::endl;
    std::cout << "+++++ Normalization=" << ds->normalization << " Mean spacing=" << meanspa << std::endl;
    std::cout << "+++++\n+++++ About to launch " << NumberOfThreads << " threads. Numgoodvox=" << ds->numgoodvox <<
      "expected total size=" << ds->numgoodvox*ds->numbest << "\n+++++\n";
  

    vtkMultiThreader* threader=new vtkMultiThreader();
    threader->SetSingleMethod((vtkThreadFunctionType)&bisImageDistanceMatrix_RadiusThreadFunction,ds);
    threader->SetNumberOfThreads(NumberOfThreads);
    threader->SingleMethodExecute();

    std::unique_ptr<bisSimpleMatrix<double> > combined(CombineArrays(ds->output_array,ds->numcols,NumberOfThreads));
    double density=100.0*combined->getNumRows()/(double(ds->numgoodvox*ds->numgoodvox));
    std::cout << "+++++ Radius matrix done. Final density = num_voxels=" << ds->numgoodvox << " density=" << density << "% (components=" << combined->getNumCols() << ")" << std::endl;

    delete ds;
    return combined;
  }
}

/** Computes a sparse distance matrix among voxels in the image
 * @param input serialized 4D input file as unsigned char array 
 * @param objectmap serialized input objectmap as unsigned char array 
 * @param jsonstring the parameter string for the algorithm 
 * { "useradius" : false, "radius" : 2.0, sparsity : 0.01, numthreads: 4 }
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
  if (!obj_image->linkIntoPointer(objectmap))
    return 0;
  
  int useradius=params->getBooleanValue("useradius",true);
  float radius=params->getFloatValue("radius",2.0);
  float sparsity=params->getFloatValue("sparsity",0.01);
  int numthreads=params->getIntValue("numthreads",4);
  
  if (debug)  {
    std::cout << "........................" << std::endl;
    std::cout << ".... Beginning image distance matrix computation " << std::endl;
    int dim[5]; inp_image->getDimensions(dim);
    std::cout << ".... \t Input  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    obj_image->getDimensions(dim);
    std::cout << ".... \t Objectmap  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    std::cout << "........................" << std::endl << std::endl;
  }

  
  std::unique_ptr<bisSimpleImage<int> > indexmap(bisImageDistanceMatrix::createIndexMap(obj_image.get()));
  
  if (useradius) {
    std::unique_ptr<bisSimpleMatrix<double> > result(bisImageDistanceMatrix::CreateRadiusMatrixParallel(inp_image.get(),obj_image.get(),indexmap.get(),radius,numthreads));
    return result->releaseAndReturnRawArray();
  }

  std::unique_ptr<bisSimpleMatrix<double> > result(bisImageDistanceMatrix::CreateSparseMatrixParallel(inp_image.get(),obj_image.get(),indexmap.get(),sparsity,numthreads));
  return result->releaseAndReturnRawArray();
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
    std::cout << ".... \t Input  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
  }

  std::unique_ptr<bisSimpleImage<int> > result(bisImageDistanceMatrix::createIndexMap(inp_image.get()));
  return result->releaseAndReturnRawArray();
}
