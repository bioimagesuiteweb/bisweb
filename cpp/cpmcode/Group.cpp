/*
 * Javid Dadashkarimi
 * jd2392
 *
 */

#include "Group.hpp"
Group::Group(Subject* subjects, group_options op){

  this-> subjects = subjects;
  this->num_node = op.num_node;
  this->num_edges = op.num_edges;
  this->group_size = op.num_subj;
  this->num_task = op.num_task;
  this-> X =  new double[this->group_size*this->num_edges];
  int n = this->group_size;
  int p = this->num_edges;
  std::cout << "Creating Group subj=" << n << " \t edges=" << this->num_edges << "\n";
  for(int i=0;i<n;i++){
    double* s = subjects[i].getConnectome();
    for(int j=0;j<p;j++){
      X[i*p+j] = s[j];
    }
    // Extremely dangerous
    delete [] s;
  }
}

Group::Group(double* stacked_connectome, group_options op){
  this->num_node = op.num_node;
  this->num_edges = op.num_edges;
  this->group_size = op.num_subj;
  this->num_task = op.num_task;
  this-> X =  stacked_connectome;
}

Group::Group(){
}

double* Group::getX(){
	return this->X;
}
int Group::getSize(){
	return this->group_size;
}

int Group::getNumEdges(){
	return this->num_edges;
}
