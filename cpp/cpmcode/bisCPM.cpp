
#include "bisJSONParameterList.h"
#include "bisDataObjectFactory.h"
#include "bisCPM.h"

#include <iostream>
#include "predictory.hpp"
#include "tools.hpp"
#include "Group.hpp"
#include "CPM.hpp"

#include <algorithm>


// -------------------------------------------------------------
// Main Function
// -------------------------------------------------------------


unsigned char* computeCPMWASM(unsigned char* stackedmatrix, unsigned char* behaviorvector,const char* jsonstring,int debug)
{
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  int ok=params->parseJSONString(jsonstring);
  if (!ok) 
    return 0;

  if (debug)
    params->print();

  std::unique_ptr<bisSimpleMatrix<double> > inp_matrix(new bisSimpleMatrix<double>("inp_matrix"));
  if (!inp_matrix->linkIntoPointer(stackedmatrix)) {
    std::cerr << "Failed to parse inp_matrix" << std::endl;
    return 0;
  }

  std::unique_ptr<bisSimpleMatrix<double> > beh_vec(new bisSimpleMatrix<double>("beh_vector"));
  if (!beh_vec->linkIntoPointer(behaviorvector)) {
    std::cerr << "Failed to parse beh_vector" << std::endl;
    return 0;
  }
  
  int numrows=inp_matrix->getNumRows();
  int numcols=inp_matrix->getNumCols();
  int numsubjects=beh_vec->getLength();

  if (debug)
    std::cout << "Numbers= " << numrows << "," << numcols << "," << numsubjects << std::endl;
  
  if (numrows!=numsubjects) {
    std::cerr << "Bad Input Data " << numrows << "*" << numcols << " vs " << numsubjects << std::endl;
    return 0;
  }
  
  cpm_options opc = {};
  opc.threshold=params->getFloatValue("threshold",0.5);
  opc.k=params->getFloatValue("kfold",3);
  opc.lambda=params->getFloatValue("lambda",0.001);

  group_options opg = {};
  opg.num_task = params->getIntValue("numtasks",0);
  opg.num_node = params->getIntValue("numnodes",268);
  opg.num_subj = numsubjects;
  opg.num_edges= numcols;

  if (debug)
    std::cout << "Done with Parameters= " << opg.num_task << "," << opg.num_node << "," << opc.threshold << std::endl;
  
  if (opg.num_edges != (opg.num_node*(opg.num_node-1)/2 * (opg.num_task+1))) {
    std::cerr << "Bad Connectome Data " << opg.num_edges << " vs " << opg.num_node << " and num_task " << opg.num_task << std::endl; 
    return 0;
  }
  
  double* phenotype=new double[opg.num_subj];

  if (debug)
    std::cout << "Numbers= " << numrows << "," << numcols << "," << numsubjects << std::endl;

  double *matrixdata=inp_matrix->getData();
  
  for (int i=0;i<15;i++)
    std::cout << "matrixdata=" << i << " = " << matrixdata[i] << std::endl;
  

  
  for (int i=0;i<opg.num_subj;i++)
    {
      phenotype[i]=beh_vec->getData()[i];
      cout<<phenotype[i]<<endl;
    }


  if (debug)
    std::cout << "Calling CPM " << std::endl;
  Group group = Group(matrixdata,opg);
  CPM* c = new CPM(group,phenotype,opc); 
  c->run();
  c->evaluate();

  if (debug)
    std::cout << "Done with CPM" << std::endl;

  std::unique_ptr<bisSimpleVector<double> > results(new bisSimpleVector<double>());
  results->allocate(opg.num_subj);
  double* resdata=results->getData();

  for (int i=0;i<opg.num_subj;i++)
    resdata[i]=c->getPredicted(i);

  delete [] phenotype;
  delete c;

  return results->releaseAndReturnRawArray();

}
