#include <iostream>
#include "tools.hpp"
#include "Group.hpp"
#include "CPM.hpp"
#include <algorithm>
using namespace std;
void run(); // main function
Group buildGroup(double* phenotype,const group_options opg);
/*
 *  aurhor: Javid Dadashkarimi
 *  BioImageSuit Web
 */
int main(int argc, char *argv[]){
	banner();
	run();  
	bye();  
	return 0;
}

void run(){ // main function
	cpm_options opc = {};
	group_options opg = {};
	opc.threshold = 0.01;
	opc.k=3;
	opc.seed=870;
	opc.lambda = 0.0001;

	opg.num_task = 0;
	opg.num_node = 268;
	opg.num_edges = 5;//268*268;
	opg.num_subj = 10;

	double phenotype[opg.num_subj];
	Group group = buildGroup(phenotype,opg);

	CPM* c = new CPM(group,phenotype,opc); 
	c->run();
	c->evaluate();
}

Group buildGroup(double* phenotype,const group_options opg){
	//ofstream myfile ("connectome.txt");
	//ofstream phenfile ("phenotype.txt");
	ifstream inFile1;
	ifstream inFile2;
	inFile1.open("phenotype.txt");
	inFile2.open("connectome.txt");
	/*while (inFile1 >> x) {
		phenotype[i] =(int)x;// (rand() % static_cast<int>(20 + 1));
	}
	inFile1.close();
	inFile2.open("connectome.txt");
	while (inFile2 >> x) {
		phenotype[i] =(int)x;// (rand() % static_cast<int>(20 + 1));
	}
	inFile2.close();
	*/
	/*if (myfile.is_open())
	  {
	  myfile << "This is a line.\n";
	  myfile << "This is another line.\n";
	  myfile.close();
	  }*/

	Subject subjects[opg.num_subj];
	for(int i=0;i<opg.num_subj;i++){
		//phenfile<< (rand() % static_cast<int>(20 + 1))<<endl;
		string y;
		inFile1>>y;
		//cout<<y<<" ";
		cout<<(rand() % static_cast<int>(20 + 1))<<" ";
		phenotype[i]=stoi(y);//(rand() % static_cast<int>(20 + 1));
	}
	//phenfile.close();
	for(int i=0;i<opg.num_subj;i++){
		double* xi = new double[opg.num_edges]; 
		//inFile2>>line;
		//vector <string> tokens; 

		// stringstream class check1 
		/*stringstream check1(line); 

		string intermediate; 

		// Tokenizing w.r.t. space ' ' 
		while(getline(check1, intermediate, ' ')) 
		{ 
			tokens.push_back(intermediate); 
		} 

		// Printing the token vector 
		cout<<tokens.size()<<endl;
		*/
		//for(int i = 0; i < tokens.size(); i++) 
		//	cout << tokens[i] << '\n';
		for(int j=0;j<opg.num_edges;j++){
			//myfile<<(rand() % static_cast<int>(4 + 1))<<" ";
			string edge;
			inFile2>>edge;
			xi[j]=(rand() % static_cast<int>(4 + 1));
			//cout<<xi[j]<<" ";
		}	
		//cout<<endl;
		//myfile<<endl;
		subjects[i].setConnectome(xi);
	}
	//myfile.close();

	return Group(subjects,opg);
}
