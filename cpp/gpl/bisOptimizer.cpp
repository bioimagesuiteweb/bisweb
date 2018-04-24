/*  License
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._ It is released under the terms of the GPL v2.
 
 ----
     
   This program is free software; you can redistribute it and/or
   modify it under the terms of the GNU General Public License
   as published by the Free Software Foundation; either version 2
   of the License, or (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
   See also  http: www.gnu.org/licenses/gpl.html
   
   If this software is modified please retain this statement and add a notice
   that it had been modified (and by whom).  
 
 Endlicense */

#include "bisOptimizer.h"
#include "sstream"
#include "math.h"


// This is defined here to keep Doxygen happy
void bisOptimizableAlgorithm::beginIteration(std::vector<float>&  ,int )
{

}


// --------------- 

bisOptimizer::bisOptimizer(bisOptimizableAlgorithm* algorithm,std::string n) : bisObject(n)
{
  this->algorithm=algorithm;
  this->NumDOF=0;
  this->resetStatistics();
  this->class_name="bisOptimizer";
}

bisOptimizer::~bisOptimizer()
{
}



void bisOptimizer::allocateTempArrays(unsigned int sz)
{
  if (sz==this->NumDOF)
    return;

  this->pcom.resize(sz);
  this->xicom.resize(sz);
  this->xtemp.resize(sz);
  this->gradient.resize(sz);
  
  for (unsigned int ia=0;ia<sz;ia++)
    {
      this->pcom[ia]=0.0;
      this->xicom[ia]=0.0;
      this->xtemp[ia]=0.0;
      this->gradient[ia]=0.0;
    }
  
  this->resetStatistics();
  this->NumDOF=sz;
}

void bisOptimizer::resetStatistics()
{
  this->NumEvaluations=0;
  this->NumGradients=0;
}

// Print basically
void bisOptimizer::generateOutput(std::string prefix1,std::string prefix2,std::vector<float>& position,float measure,int iter)
{
  std::stringstream output;
  output.precision(5);

  output << "~~~~ " << prefix1 << ":" << prefix2 << " " << iter << " " << std::fixed;
  if (this->NumDOF<=12) {
    output << ": (";
    for (unsigned int ii=0; ii<this->NumDOF; ii++) 
      output << position[ii] << " ";
    
    output << " ) " << measure;
  } else {
    int step=int(this->NumDOF/7);
    output << this->NumDOF << ":" << step << "(";

    for (unsigned int ii=0; ii<this->NumDOF; ii=ii+step) {
      output << position[ii] << " ";
    }
    output << " ) " << measure;
  }
  this->algorithm->generateFeedback(output.str());
}
	
void bisOptimizer::generateStatistics(std::string method,std::vector<float>& position)
{
  
  this->NumEvaluations+=1;
  float v=this->algorithm->computeValue(position);

  std::stringstream output;
  output.precision(5);
  output << std::fixed;
  output << "~~~~ " << method << " Stats: Nfunc=" << this->NumEvaluations << ", Ngrad=" << this->NumGradients << ", v=" << v;
  this->algorithm->generateFeedback(output.str());
}

float bisOptimizer::lineFunction(float x)
{
  for (unsigned int ia=0;ia<this->xtemp.size();ia++)
    this->xtemp[ia]=this->pcom[ia]+x*this->xicom[ia];

  this->NumEvaluations+=1;
  float v= this->algorithm->computeValue(this->xtemp);
  return v;

}


#define GOLD 1.618034
#define GLIMIT 100.0
#define TINY 1.0e-20
#define ITMAX 100

void  bisOptimizer::bracketMinimum(optParams& params)
{
  float ulim,u,r,q,fu,temp;
	    
  params.fa=this->lineFunction(params.ax);
  params.fb=this->lineFunction(params.bx);
  if (params.fb > params.fa) {
    temp=params.bx; params.bx=params.ax; params.ax=temp;
    temp=params.fb; params.fb=params.fa; params.fa=temp;
  }

  params.cx=(float)((params.bx)+GOLD*(params.bx-params.ax));
  params.fc=this->lineFunction(params.cx);
  while (params.fb > params.fc) {
    r=(params.bx-params.ax)*(params.fb-params.fc);
    q=(params.bx-params.cx)*(params.fb-params.fa);
    double dq = q-r;
    if (fabs(dq) < TINY)
      {
	float sgn=0.0;
	if (dq<0.0) sgn=-1.0;
	if (dq>0.0) sgn=1.0;
	dq = sgn * TINY;
      }
    u=(float)((params.bx)-((params.bx-params.cx)*q-(params.bx-params.ax)*r)/(2.0*dq));
    ulim=(float)((params.bx)+GLIMIT*(params.cx-params.bx));
    if ((params.bx-u)*(u-params.cx) > 0.0) {
      fu=this->lineFunction(u);
      if (fu < params.fc) {
	params.ax=params.bx;
	params.bx=u;
	params.fa=params.fb;
	params.fb=fu;
	return;
      } else if (fu > params.fb) {
	params.cx=u;
	params.fc=fu;
	return;
      }
      u=(float)((params.cx)+GOLD*(params.cx-params.bx));
      fu=this->lineFunction(u);
    } else if ((params.cx-u)*(u-ulim) > 0.0) {
      fu=this->lineFunction(u);
      if (fu < params.fc) {
	//ShiftValues(bx,cx,&u,u+GOLD*(u-params.cx));
	temp=(float)(u+GOLD*(u-params.cx));
	params.bx=params.cx; params.cx=u; u=temp;
	// ShiftValues(fb,fc,&fu,this->lineFunction(u));
	temp=this->lineFunction(u);
	params.fb=params.fc; params.fc=fu; fu=temp;
      }
    } else if ((u-ulim)*(ulim-params.cx) >= 0.0) {
      u=ulim;
      fu=this->lineFunction(u);
    } else {
      u=(float)((params.cx)+GOLD*(params.cx-params.bx));
      fu=this->lineFunction(u);
    }
    
    //ShiftValues(ax,bx,cx,u);
    params.ax=params.bx; params.bx=params.cx; params.cx=u;
    //   ShiftValues(fa,fb,fc,fu);
    params.fa=params.fb; params.fb=params.fc; params.fc=fu;
  }
}
	
	
float bisOptimizer::minimizeGivenBounds(optParams& params,float tol)
{
// Replacement code from ITK 3.4 (vnl_brent)
// This code has been removed after it was pointed out
// to ITK developers that it was a copy of code from
// Numerical Recipies. January 23 2007
// The distribution license of numerical recipies is not
// compatible with the BSD-License used by ITK.
// 
// ---------------------------------------------
// The following implementation was based on the description
// of the Brent's method presented in the Wikipedia:
//    http://en.wikipedia.org/wiki/Brent%27s_method
  
  float a = params.ax;
  float b = params.cx;
  float ZEPS = tol;
  int mflag=0;
	    
  if( params.ax > params.cx ) {
    a = params.cx;
    b = params.ax;
  }
  
  float x = params.bx;
  float fa = this->lineFunction(a);
  float fb = this->lineFunction(b);
  float fx = this->lineFunction(x);
	    
  if( fa * fb >= 0.0 ) {
    params.xmin = x;
    return fx;
  }
	    
  if( fabs(fa) < fabs(fb) ) {
    float t= a;
    a = b;
    b = t;
    float ft = fa;
    fa = fb;
    fb = ft;
  }
  
  float c = a;
  float d = a;   // it is not clear how to initialize d
  float fc = fa;
  
  float s;
  
  for( int iteration = 1; iteration <= ITMAX; iteration++) {
    if( fabs(fb) <= ZEPS || fabs( a - b ) <= ZEPS ) {
      params.xmin=b;
      return fb;
    }
    
    float fac = fa - fc;
    float fbc = fb - fc;
    float fab = fa - fb;
    
    if( fabs( fac ) < ZEPS || fabs(fbc) < ZEPS ) {
      // Apply secant rule
      s = b - fb * (b - a) / ( fb - fa );
    } else {
      // Inverse quadratic interpolation
      float afbfc = ( a * fb * fc ) / ( fab * fac );
      float bfafc = ( b * fa * fc ) / ( fab * fbc );
      float cfafb = ( c * fa * fb ) / ( fac * fbc );
      s = afbfc - bfafc + cfafb;
    }
    
    if( !( s > ( 3 * a + b ) / 4.0 && s < b ) ||
	(  mflag && ( fabs( s - b ) >= fabs( b - c ) / 2.0 ) ) ||
	( !mflag && ( fabs( s - b ) >= fabs( c - d ) / 2.0 ) )    ) {
      s = ( a + b ) / 2;
      mflag = 1;
    }  else {
      mflag = 0;
    }
    
    float fs = this->lineFunction(s);
    d = c;	c = b;
    
    if( fa * fs < 0.0 ) {
      b = s;
      fb = fs;
    }  else {
      a = s;
      fa = fs;
    }
    
    if( fabs( fa ) < fabs( fb ) ) {
      float temp = a;
      a = b;
      b = temp;
    }
  }
  
  params.xmin = b;
  return fb;
}

#undef ITMAX
#undef CGOLD
#undef ZEPS

float bisOptimizer::lineMinimization(std::vector<float>& p,std::vector<float>& xi,int iterno,float tolerance,std::string method)
{
  if (method=="")
    method = "Some";

  for (unsigned int ia=0;ia<p.size();ia++) {
    this->pcom[ia]=p[ia];
    this->xicom[ia]=xi[ia];
  }
	    
  optParams params;
  params.ax=0.0;
  params.bx=1.0;
  params.cx=1.0;
  params.fa=0.0;
  params.fb=0.0;
  params.fc=0.0;
  params.xmin=0.0;
	    
  this->bracketMinimum(params);
  float fret=this->minimizeGivenBounds(params,tolerance);

  for (unsigned int ia=0;ia<xi.size();ia++)
    p[ia]=p[ia]+params.xmin*xi[ia];
    
  if (iterno>=0)
    this->generateOutput(method, "Lmin",p,fret,iterno);
	    
  return fret;
}


    
float bisOptimizer::computeGradientDescent(std::vector<float>& position,int iterations,float tolerance)
{
  unsigned int numdof=position.size();
  this->allocateTempArrays(numdof);
  this->algorithm->beginIteration(position,0);
  
  this->NumEvaluations+=1;
  float old_similarity=this->algorithm->computeValue(position);
  this->generateOutput("GD", "Beginning",position,old_similarity,0);

  this->algorithm->computeGradient(position,this->gradient);
  this->NumGradients+=1;
  
  float best=old_similarity;
  int done=0;
  int iter=1;
		
  while (done==0 && iter<iterations) {  
    this->algorithm->beginIteration(position,iter);
    best=this->lineMinimization(position,this->gradient,iter,tolerance,"\t GD");
    if (fabs(best-old_similarity)<tolerance) {
      done=1;
    } else {
      this->NumEvaluations+=1;
      old_similarity=this->algorithm->computeValue(position);
      this->NumGradients+=1;
      this->algorithm->computeGradient(position,this->gradient);
      iter=iter+1;
    }
  }
  
  this->generateOutput("\t GD", "Done",position,best,iter);
  this->generateStatistics("\t GD",position);


  return best;
}

float bisOptimizer::computeSlowClimb(std::vector<float>& position,float step,int iterations)
{
  this->NumDOF=position.size();
  this->algorithm->beginIteration(position,0);
  this->NumEvaluations+=1;
  float old_similarity=this->algorithm->computeValue(position);
  float similarity=old_similarity;


  std::stringstream line;
  line << "SC " << step;
  this->generateOutput(line.str(), "Beginning",position,old_similarity,0);

  std::stringstream line2;
  line2 << "\t SC " << step;

  
  for (int iter=1;iter<=iterations;iter++)
    {
      int j = 0,k = 0;
      float best_similarity=old_similarity;
      this->algorithm->beginIteration(position,iter);
      
      for (unsigned int i = 0; i < this->NumDOF; i++)
	{
	  float orig=position[i];
	  position[i]=orig + step;
	  this->NumEvaluations+=2;
	  similarity=this->algorithm->computeValue(position);
	  if (similarity < best_similarity)
	    {
	      best_similarity = similarity;
	      j =  i;
	      k =  1;
	    }
	  position[i]=orig-step;
	  similarity=this->algorithm->computeValue(position);
	  if (similarity < best_similarity)
	    {
	      best_similarity = similarity;
	      j =  i;
	      k = -1; 
	    }
	  position[i]=orig;
	}
      
      if (best_similarity < old_similarity)
	{
	  float oldv=position[j];
	  float updatedv=oldv+k*step;
	  position[j]=updatedv;
	  old_similarity=best_similarity;
	}
      else
	iter=iterations+1; // Break Out	

      this->generateOutput(line2.str(), "It",position,old_similarity,iter);
    }

  this->generateStatistics(line2.str(),position);
  return old_similarity;
}
 
float bisOptimizer::computeConjugateGradient(std::vector<float>& position,int iterations,float tolerance)
{
  unsigned int numdof=position.size();
  
  this->allocateTempArrays(numdof);
  if (gradient.size()<numdof)
    gradient.resize(numdof);
		
  std::stringstream line;
  line << "Beginning (it=" << iterations << "), tol=" <<  tolerance << ", st=" << this->algorithm->getCurrentStepSize() << " ";
		
  this->algorithm->beginIteration(position,0);
  this->NumEvaluations+=1;
  float funcval=this->algorithm->computeValue(position);
  this->generateOutput("CG",line.str(),position,funcval);

  this->NumGradients+=1;
  float norm=this->algorithm->computeGradient(position,this->gradient);

  if (norm<tolerance) {
    std::stringstream line;
    line << "\t\t norm " << norm << " tolerance " << tolerance << std::endl;
    this->algorithm->generateFeedback(line.str());
    this->generateOutput("\t CG", "Done",position,funcval,0);  
    this->generateStatistics("\t CG",position);
    return funcval;
  }

  std::vector<float> g(numdof);
  std::vector<float> h(numdof);

  for (unsigned int ia=0;ia<numdof;ia++) {
    g[ia]=-1.0f*this->gradient[ia];
    h[ia]=g[ia];
    this->gradient[ia]=h[ia];
  }
		
  int iter=1;
  int done=0;
		
  while (iter<=iterations && done == 0 ) {
    
    this->algorithm->beginIteration(position,iter);
    float updatedval=this->lineMinimization(position,this->gradient,iter,tolerance,"\t CG");
    done=1;
    if (fabs(funcval-updatedval)>tolerance)
      {
	this->NumEvaluations+=1;
	funcval=this->algorithm->computeValue(position);
	this->NumGradients+=1;
	this->algorithm->computeGradient(position,this->gradient);
	float dgg=0.0,gg=0.0;
	for (unsigned int j=0;j<numdof;j++) {
	gg += g[j]*g[j];
	dgg += (this->gradient[j]+g[j])*this->gradient[j];
      }
      if (gg > 0.000001)  {
	float gam=dgg/gg;
	for (unsigned int ia=0;ia<numdof;ia++)
	  {
	    g[ia]=-1.0f*this->gradient[ia];
	    h[ia]=h[ia]*gam+g[ia];
	    this->gradient[ia]=h[ia];
	  }
	done=0;
      }
    }
    //    this->generateOutput("\t CG", "Done",position,funcval,iter);  
    ++iter;
  }
  
  this->generateOutput("\t CG", "Done",position,funcval,iter);  
  this->generateStatistics("\t CG",position);
  
  return funcval;
}
