#include <memory>
#include <algorithm>
#include <vector>
#include <queue>
#include <unordered_map>
#include <functional>
#include "Eigen/Dense"
#include "Eigen/Sparse"
using Eigen::MatrixXd;
using Eigen::VectorXd;
using Eigen::VectorXi;
using Eigen::Map;
#include "igl/slice.h"
#include "igl/colon.h"
#include "igl/mat_min.h"
#include "igl/mat_max.h"
#include "igl/find.h"
using igl::slice;
using igl::colon;
using igl::mat_min;
using igl::mat_max;
using igl::find;


#include "bisJSONParameterList.h"
#include "bisDataObjectFactory.h"
#include "bisIndividualizedParcellation.h"

namespace bisIndividualizedParcellation {

  bool isAnyFalse(std::vector<bool> &v)
  {
    for (unsigned int i=0; i<v.size(); i++)
      if (v[i] == false)
        return true;
    return false;
  }
  

  // Remember to pass dim not image
  int  ComputeMRFIncrements(int dim[5],int incr[6])
  {
    int slicesize=dim[0]*dim[1];
    int index=0;

    
    for (int ic=-1;ic<=1;ic++)
      {
        for (int ib=-1;ib<=1;ib++)
          {
            for (int ia=-1;ia<=1;ia++)
              {
                if ((ia+ib+ic==1 || ia+ib+ic==-1) && (ia==0 || ib==0 || ic==0))
                  {
                    incr[index]=ia+ib*dim[0]+ic*slicesize;
                    ++index;
                  }
              }
          }
      }
    
    
    return 1;
  }
  
  bool ismember(VectorXi V, int p)
  {
    for (int i=0;i<V.size();i++)
      {
        if (V(i)==p)
          return 1;
      }
    return 0;
  }
  
  int runIndividualizedParcellation(bisSimpleImage<float>* FMRIImage, bisSimpleImage<short>* groupparcellation, bisSimpleImage<short>* indiv,
                                    int numexemplars)
  {
    // Zero everything
    indiv->fill(0);
    
    
    int dim[5], dim2[5];
    FMRIImage->getDimensions(dim);
    groupparcellation->getDimensions(dim2);
    std::cout << "++++ Beginning Indiv Parc internal " << std::endl;
    std::cout << "++++ \t fMRI Image dim = " << dim[0] << "," << dim[1] << "," << dim[2] << "  " << dim[3] << std::endl;
    std::cout << "++++ \t Group Parcellation Image dim2 = " << dim2[0] << "," << dim2[1] << "," << dim2[2] << "  " << dim2[3] << std::endl;

    int sum=0;
    for (int ia=0;ia<=2;ia++)
      sum+=abs(dim[ia]-dim2[ia]);
    if (sum>0)
      {
        std::cerr << "---- Bad FMRI Input to runIndividualizedParcelllation sum = " << sum << " > 0 " << std::endl;
        return 0;
      }
    
    //    vtkDataArray* group=input->GetPointData()->GetScalars(); 
    int N=dim2[0]*dim2[1]*dim2[2];
    
    const int t=dim[3];//this->FMRIImage->GetNumberOfScalarComponents(); //nc
    
    double range[2]; 
    groupparcellation->getRange(range);
  
    int Pmax = numexemplars;
    int RangeMax=int(range[1]);
    
    if (Pmax != RangeMax) {
      std::cerr << "---- Bad Group Parcellation Input to vtkbisIndividualizeParcellation pmax = " << Pmax << "range[1] = " << RangeMax << std::endl;
      return 0;
    }

    std::cout << "++++ \t number of frames is " << t << std::endl;
    std::cout << "++++ \t number of voxels is " << dim[0] << "x" << dim[1] << "x" << dim[2] << " = " << N << std::endl;
    std::cout << "++++ \t number of exemplars is " << Pmax << std::endl;
    //    fprintf(stdout,"lambda is %f\n",lambda);
    
    //fprintf(stdout,"START: the elapsed time is = %f s \n",float(clock()-begin_time)/CLOCKS_PER_SEC);

  

    // Copying data to matrixXd and VectorXd
    
    int count=0;

    short* group=groupparcellation->getImageData();
    
    for (int voxel=0;voxel<N;voxel++) {
      if(group[voxel]>0) {
        count++;
      }
    }
    
    MatrixXd X(t,count);
    count=0;
    //double position[3];

    float* fmri=FMRIImage->getImageData();
    
    for (int voxel=0;voxel<N;voxel++) {
      if(group[voxel]>0) {
        for (int frame=0;frame<t;frame++) {
          X(frame,count) = fmri[N*frame+voxel];
        }
        count++;
      }
    }
  
    VectorXd parcel(count);
    std::unordered_map<int,int> ntoNvoxel;
    std::unordered_map<int,int> Ntonvoxel;
    count=0;
    for (int voxel=0;voxel<N;voxel++)
      if (group[voxel]>0)
        {
          parcel(count) = group[voxel]; // this is the group label for all the nonzero voxels
          ntoNvoxel.insert( std::make_pair(count,voxel) );
          Ntonvoxel.insert( std::make_pair(voxel,count) );
          count++;
        }
    
    int n = count;
    
    std::cout << "++++ COPYING DATA TO EIGEN MATRIX & VECTOR" << std::endl;
    std::cout << "++++ \t number of non-zero voxels n = " << n << std::endl;
    
    VectorXd mean_subtract(t);
    mean_subtract = (X.rowwise().sum())/double(n);
    

    // Normalizing data points to 0 mean
    //double newValue;
    MatrixXd V = MatrixXd(t,n);
    V = X.colwise()-mean_subtract; // mean of V is all 0 [VERIFIED]
    
    
    
    // Calculating the l2-norm
    VectorXd twoNorm(n);
    twoNorm =V.colwise().norm();
    VectorXd inverse_twoNorm(n);
    inverse_twoNorm = twoNorm.array().inverse();
    
    ////////////////////////////////////////////////  1- Dividing with the maximum norm 
    //// finding the maximum value in the array
    //  double maxValue = twoNorm.maxCoeff();
    ////  Normalizing data points to a unit ball sphere
    //  MatrixXd v = V/maxValue;
    //  fprintf(stdout,"NORMALIZATION INTO UNIT SPHERE (DIVIDE BY MAX NORM): the elapsed time is = %f s \n",float(clock()-timebegin11)/CLOCKS_PER_SEC);
    
    ////////////////////////////////////////////////  2- Normalizing to the unit norm (all vectors norm = 1)
    MatrixXd v = V.array().rowwise()* inverse_twoNorm.transpose().array();
    twoNorm = v.colwise().norm(); // twoNorm is all 1 [VERIFIED]
    
    //  VectorXd test_ii(t);
    //  test_ii = (V.rowwise().sum())/double(n);
    //  for (int ii=0; ii<t; ii++)
    //	  fprintf(stdout,"V norm = %f\n",twoNorm(ii)); 
    
    std::cout << "++++ NORMALIZATION ONTO UNIT SPHERE (ALL NORM=1)" << std::endl;
    
    
    ////////// Finding the voxels within each parcel ///////////////
    
    std::vector< std::vector<int> > indice_p;
    std::vector<int> p_vector;
    for (int p=0;p<Pmax;p++)
      {	
	for (int voxel=0;voxel<n;voxel++)
          if (parcel(voxel) == p+1)
            p_vector.push_back(voxel);
	indice_p.push_back(p_vector);
	p_vector.clear(); // p_vector's size is 0 [VERIFIED]
      }
    
    std::cout << "++++ FINDING VOXELS:" << std::endl;

    // Calculating the squared distance matrix between voxels within each parcel
    std::vector<MatrixXd> sqrDist;
    MatrixXd D;
    VectorXi R(t);
    
    colon(0,1,t-1,R);
    
    
    for (int p=0;p<Pmax;p++) {
      int psize = indice_p[p].size();
      MatrixXd sqrMatrix(psize,psize);
      int* ptr = &indice_p[p][0];
      Map<VectorXi> C(ptr,psize);
      MatrixXd vP(t,psize);
      slice(v,R,C,vP);		
      sqrMatrix = ((vP.transpose()*vP*-2).colwise() + vP.colwise().squaredNorm().transpose()).rowwise() + vP.colwise().squaredNorm();
      sqrDist.push_back( sqrMatrix );
    }
    
    std::cout << "++++ SQUARED DISTANCES" << std::endl;

    
    // Calculating the distance between auxiliary exemplar and the rest of the voxels
    std::vector<VectorXd> e0sqrDist;
    VectorXd e0 = VectorXd::Zero(t);
    e0(0) = 3;

    for (int p=0;p<Pmax;p++) {
      int psize = indice_p[p].size();
      VectorXd sqrArray(psize);
      int* ptr = &indice_p[p][0];
      Map<VectorXi> C(ptr,psize);
      MatrixXd vP(t,psize);
      slice(v,R,C,vP);		
      sqrArray = ((vP.transpose()*e0*-2).colwise() + vP.colwise().squaredNorm().transpose()).rowwise() + e0.colwise().squaredNorm();	
      e0sqrDist.push_back( sqrArray );
      
      
      //	delete [] sqrArray;
    }
    //	for (int pp1=0;pp1<indice_p[p].size();pp1++)
    //		for (int pp2=0;pp2<indice_p[p].size();pp2++)
    //			fprintf(stdout,"p=%d, pp1=%d, pp2=%d, sqrDist[p][pp1][pp2] = %f\n",p,pp1,pp2,sqrDist[p][pp1][pp2]);
    
    
    std::cout << "++++ AUXILIARY DISTANCES" << std::endl;

    //  Calculating the exemplar within each parcel
    VectorXi Sopt(Pmax);
    VectorXi SoptN(Pmax);
    //double loss;
    for (int p=0;p<Pmax;p++) {
      int psize = indice_p[p].size();
      double sumd0 = e0sqrDist[p].sum();
      MatrixXd::Index maxFindex;
      VectorXd sumD(psize);	
      sumD = sqrDist[p].colwise().sum();

      
      VectorXd pFunc(psize);
      pFunc = sumd0 - sumD.array();  // we should divide by n but does not matter as it does not change the maximum!
      pFunc.maxCoeff(&maxFindex);
      Sopt(p) = indice_p[p][maxFindex];
      std::unordered_map<int,int>::const_iterator voxelN = ntoNvoxel.find (Sopt(p));
      if (voxelN != ntoNvoxel.end())
        SoptN(p) = voxelN->second;
    }
    
    std::cout << "++++ EXEMPLAR IDENTIFICATION" << std::endl;
    
    //  for (int p=0; p<Pmax; p++)
    //	fprintf(stdout,"Sopt(%f) = %d, ", group->GetComponent(SoptN(p),0),SoptN(p));
    
    // Assigning each voxel to the closest exemplar using the priority queue algorithm
    
    
    std::vector<double> label(n,-1);
    
    // minDistIndexR and minDistIndexL need to be double, otherwise the result differs from MATLAB. It is perhaps because of the SetComponent() command.
    
    MatrixXd vSopt(t,Pmax);
    slice(v,R,Sopt,vSopt);
    
    MatrixXd distvSopt(n,Pmax);
    
    distvSopt = ((v.transpose()*vSopt*-2).colwise() + v.colwise().squaredNorm().transpose()).rowwise() + vSopt.colwise().squaredNorm();	
    
    
    const int neighbors = 6;
    int incr[neighbors]; ComputeMRFIncrements(dim,incr);
    
    int sumVisited = 0;
    std::vector<int> VISITED(n,0);
    
    
    // Assigning labels to exemplars and marking them as visited
    for (int p=0; p<Pmax; p++){
      label[Sopt(p)] = p;
      VISITED[Sopt(p)] = 1;
      sumVisited ++;		
    }
    
    std::vector<std::priority_queue<std::pair<double, int> , std::vector<std::pair<double,int> >, std::greater<std::pair<double, int> > > > exemplar_min_heaps (Pmax);
    for (int p=0; p<Pmax; p++)
      {
	int exemplarN = SoptN(p);
        //	if (NONBOUNDARY[exemplarN] == 1)
        for (int ia=0;ia<neighbors;ia++)
          {	
            int currVoxN = exemplarN+incr[ia]; 
            if (group[currVoxN]>0)
              {
                std::unordered_map<int,int>::const_iterator voxeln = Ntonvoxel.find (currVoxN);
                if (voxeln != Ntonvoxel.end())
                  {
                    int currVox = voxeln->second; 
                    exemplar_min_heaps[p].push(std::make_pair(distvSopt(currVox,p),currVox));
                  }
              }
          }  
      }
    
    
    while (sumVisited < n)
      {
        int min_idx = -1;
        double min_val = 10000000;
        for (int p=0; p<Pmax; p++)
          {
            if (!exemplar_min_heaps[p].empty())
              {
		std::pair<double,int> curNode = exemplar_min_heaps[p].top();		
		if (curNode.first < min_val)
                  {
                    min_val = curNode.first; // all distances <=4 [VERIFIED]
                    min_idx = p;
                  }
              }	
            
          }
        // selected exemplar queue (min_idx) is correct [VERIFIED]
        // fprintf(stdout,"\n(selected queue,min_val)=(%d,%f)\n",min_idx,min_val);
        
        if (min_idx >=0)
          {
            std::pair<double,int> chosenNode = exemplar_min_heaps[min_idx].top();
            exemplar_min_heaps[min_idx].pop();
            int chosenVoxel = chosenNode.second;
            if (VISITED[chosenVoxel] == 0)
              {
                label[chosenVoxel] = min_idx;
                VISITED[chosenVoxel] = 1;
                sumVisited ++;
                //      fprintf(stdout,"number of visited = %d\n", sumVisited);
                std::unordered_map<int,int>::const_iterator voxelN = ntoNvoxel.find (chosenVoxel);
                if (voxelN != ntoNvoxel.end())
                  {
                    int chosenVoxelN = voxelN->second; 
                    //      if(NONBOUNDARY[chosenVoxelN] == 1)
                    for (int ia=0;ia<neighbors;ia++)
                      {
                        int currVoxN = chosenVoxelN + incr[ia];
                        if (group[currVoxN]>0)
                          {
                            std::unordered_map<int,int>::const_iterator voxeln = Ntonvoxel.find (currVoxN);
                            if (voxeln != Ntonvoxel.end())
                              {
				int currVox = voxeln->second;
				if (VISITED[currVox] == 0){
                                  exemplar_min_heaps[min_idx].push(std::make_pair(distvSopt(currVox,min_idx),currVox));
				}
                              }
                          }
                      }
                  }
              }

          } 
	/* testing the order of elements in the priority queue is from smallest dist to largest dist [VERIFIED]
           std::queue<std::pair<double, int> > tteesstt;	
           for (int ii=0;ii<exemplar_min_heaps[min_idx].size();ii++)
           {
           std::pair<double,int> testNode = exemplar_min_heaps[min_idx].top();
           tteesstt.push(testNode);
           exemplar_min_heaps[min_idx].pop();
           fprintf(stdout,"(%d,%f), ",testNode.second,testNode.first);
           }
           fprintf(stdout,"next...\n");
	*/

        if (min_idx < 0)
          break;
      }

    std::cout << "++++ Finally ASSIGNING VOXELS TO EXEMPLARS" << std::endl;
    //int Voxel_indices[N];
    count = 0;

    short* indivdata=indiv->getImageData();
    
    for (int voxel=0;voxel<N;voxel++)
      {
	if(group[voxel]>0) { 
          std::unordered_map<int,int>::const_iterator voxeln = Ntonvoxel.find (voxel);
          if (voxeln != Ntonvoxel.end()) {
            int finalvoxeln = voxeln->second; 
            indivdata[voxel]=label[finalvoxeln]+1;
          }
        }
      }
    return 1;
  }
}

// -------------------------------------------------------------
// Main Function
// -------------------------------------------------------------
// individualizeParcellation adjust parcellation for a specific input fmri image 

unsigned char* individualizeParcellationWASM(unsigned char* input, unsigned char* groupparcellation,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if (debug)
    params->print();

  std::unique_ptr<bisSimpleImage<float> > inp_image(new bisSimpleImage<float>("inp_image"));
  if (!inp_image->linkIntoPointer(input))
    return 0;

  std::unique_ptr<bisSimpleImage<short> > parc_image(new bisSimpleImage<short>("parc_image"));
  if (!parc_image->linkIntoPointer(groupparcellation))
    return 0;

  int numexemplars=params->getIntValue("numberofexemplars",268);
  
  if (debug)  {
    std::cout << "........................" << std::endl;
    std::cout << ".... Beginning actual individualizedparcellation : numexemplars=" << numexemplars <<   std::endl;
    int dim[5]; inp_image->getDimensions(dim);
    std::cout << ".... \t Input  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    parc_image->getDimensions(dim);
    std::cout << ".... \t Parc  dimensions=" << dim[0] << "," << dim[1] << "," << dim[2] << "," << dim[3] << "," << dim[4] << std::endl;
    std::cout << "........................" << std::endl << std::endl;
  }

  std::unique_ptr<bisSimpleImage<short> > out_image(new bisSimpleImage<short>("out_parc"));
  out_image->copyStructure(parc_image.get());
  
  int result=bisIndividualizedParcellation::runIndividualizedParcellation(inp_image.get(),parc_image.get(),out_image.get(),numexemplars);
  
  if (debug)
    std::cout << "individualized Parcellation Done " <<  result << " " << std::endl;

  if (result==0)
    return NULL;

  return out_image->releaseAndReturnRawArray();

}
