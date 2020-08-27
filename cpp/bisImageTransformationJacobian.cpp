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

#include "bisImageTransformationJacobian.h"
#include "bisJSONParameterList.h"
#include "bisSimpleDataStructures.h"
#include "bisAbstractTransformation.h"
#include "bisComboTransformation.h"
#include "bisDataObjectFactory.h"

namespace bisImageTransformationJacobian {


  double determ( bisUtil::mat44 m , int debug=0)   /* determinant of 3x3 matrix */
  {
    // Using only lower diagoal of 3x3
    
    double r11,r12,r13,r21,r22,r23,r31,r32,r33 ;
    /*  INPUT MATRIX:  */

    if (debug) {
      for (int ia=0;ia<=2;ia++) {
        std::cout << "\t [ ";
        for (int ib=0;ib<=2;ib++) {
          std::cout << " " << m[ia][ib] << " ";
        }
      }
    }
    
    r11 = 1.0+m[0][0]; r12 = 0.5*(m[1][0]+m[0][1]); r13 = 0.5*(m[2][0]+m[0][2]);  /* [ r11 r12 r13 ] */
    r21 = r12;         r22 = 1.0+m[1][1];           r23 = 0.5*(m[1][2]+m[2][1]);  /* [ r21 r22 r23 ] */
    r31 = r13;         r32 = r23;                   r33 = 1.0+ m[2][2];  /* [ r31 r32 r33 ] */
    
    if (debug) {
      std::cout << "[ [ " << r11 << "," << r12 << "," << r13 << "]" << std::endl;
      std::cout << "  [ " << r21 << "," << r22 << "," << r23 << "]" << std::endl;
        std::cout << "  [ " << r31 << "," << r32 << "," << r33 << "] ]" << std::endl;
    }
    
    double d=r11*r22*r33-r11*r32*r23-r21*r12*r33+r21*r32*r13+r31*r12*r23-r31*r22*r13 ;
    if (debug)
      std::cout << "Determinant=" << d << std::endl;
    return d;
  }
    
  bisSimpleImage<float>* computeJacobian(bisAbstractTransformation* transformation, int dim[3],float spa[3],int nonlinearonly=0,int enabledebug=0) {

    // If Combo then set linear component to identity --> nonlinearonly!
    bisUtil::mat44 linear;
    int nonlinearcombo=0;
    
    if (transformation->getClassName()=="bisComboTransformation" && nonlinearonly>0) {
      std::cout << ".... nonlinear combo" << std::endl;
      //
      nonlinearcombo=1;
      bisComboTransformation* combo=(bisComboTransformation*)(transformation);
      combo->getInitialTransformation(linear);

      bisUtil::mat44 identity;
      for (int i=0;i<=3;i++) {
        for (int j=0;j<=3;j++) {
          if (i==j)
            identity[i][j]=1.0;
          else
            identity[i][j]=0.0;
        }
      }
      combo->setInitialTransformation(identity);
    }

    // COmpute Displacement Field
    std::unique_ptr< bisSimpleImage<float> > dispfield(transformation->computeDisplacementField(dim,spa));
    
    
    // Restore combo if needed
    if (nonlinearcombo) { 
      bisComboTransformation* combo=(bisComboTransformation*)(transformation);
      combo->setInitialTransformation(linear);
    }


    
    int o_dim[5] = { dim[0],dim[1],dim[2],1,1};
    float o_spa[5] = { spa[0],spa[1],spa[2],1.0,1.0};
    std::string n1="jacobian";
    bisSimpleImage<float >* out=new bisSimpleImage<float>(n1);
    out->allocate(o_dim,o_spa);
    out->fill(0.0);
    
    
    
    
    // ------------------------------- Compute Jacobian -----------------------------------------
    int offsets[4]= {  1,dim[0],dim[0]*dim[1],dim[0]*dim[1]*dim[2]  };

    bisUtil::mat44 temp;
    float* idata=dispfield->getImageData();
    float* odata=out->getImageData();

    double sum=0.0;
    int   num=0;
    
    for (int ka=1;ka<dim[2]-1;ka++) {
      int KM=(ka-1)*offsets[2];
      int KP=(ka+1)*offsets[2];
      int K=ka*offsets[2];
      
      for (int ja=1;ja<dim[1]-1;ja++) {
        
        int JM=(ja-1)*offsets[1];
        int JP=(ja+1)*offsets[1];
        int J=ja*offsets[1];
        
        for (int ia=1;ia<dim[0]-1;ia++) {
          
          int IM=ia-1;
          int IP=ia+1;
          int I=ia;

          int debug=0;
          if (ia==dim[0]/2 && ja==dim[1]/2 && ( ka == dim[2]/2 || ka==dim[2]/4 || ka==3*dim[2]/4) && enabledebug>0) {
              debug=1;
              std::cout << std::endl << "       IJK=" << ia << "," << ja << "," << ka << std::endl;
            }

            for (int comp=0;comp<=2;comp++) {
              int C=comp*offsets[3];
            
              temp[comp][0]= 0.5*( idata[K  + J  + IP + C] - idata[K  + J  + IM + C] )/spa[0];
              temp[comp][1]= 0.5*( idata[K  + JP + I  + C] - idata[K  + JM + I  + C] )/spa[1];
              temp[comp][2]= 0.5*( idata[KP + J  + I  + C] - idata[KM + J  + I  + C] )/spa[2];

              if (debug)  {
                std::cout << " [ " <<idata[K  + J  + IP + C] << " ," << idata[K  + J  + IM + C] << "-->" <<  temp[comp][0] << "] ,";
                std::cout << " [ " <<idata[K  + JP + I  + C] << " ," << idata[K  + JM + I  + C] << "-->" <<  temp[comp][1] << "] ,";
                std::cout << " [ " <<idata[KP + J  + I  + C] << " ," << idata[KM + J  + I  + C] << "-->" <<  temp[comp][2] << "]" << std::endl;
              }
            }
            
            float d=float(determ(temp,debug));
            odata[I+J+K]=d-1.0;

            sum+=d;
            num+=1;
        }
      }
    }

    float mean=0.0;
    
    if (nonlinearonly>0 && nonlinearcombo==0) {

      // remove mean
      mean=sum/float(num);
      std::cout << ".... nonlinear non-combo mean=" << sum << "/" << num << "=" << mean  << std::endl;
    }

      
    for (int ka=1;ka<dim[2]-1;ka++) {
      int K=ka*offsets[2];
      for (int ja=1;ja<dim[1]-1;ja++) {
        int J=ja*offsets[1];
        for (int ia=1;ia<dim[0]-1;ia++) {
          int I=ia;
          odata[I+J+K]=100.0*(odata[I+J+K]-mean);
          if (ia==dim[0]/2 && ja==dim[1]/2 && ( ka == dim[2]/2 || ka==dim[2]/4 || ka==3*dim[2]/4) && enabledebug>0) {
            std::cout << "Final d  IJK=" << ia << "," << ja << "," << ka << " d=" << odata[I+J+K] << std::endl;
          }
        }
      }
    }

    return out;
  }

}
  
// BIS: { 'computeJacobianImageWASM', 'bisImage', [ 'bisTransformation', 'ParamObj',  'debug' ] }
unsigned char* computeJacobianImageWASM(unsigned char* input,unsigned char* xform,const char* jsonstring,int debug) {


  std::unique_ptr<bisSimpleImage<short> > in_image(new bisSimpleImage<short>("input"));
  if (!in_image->linkIntoPointer(input))
    return 0;

  
  if (debug)
    std::cout << "_____ Beginning computeJacobianImageJSON" << std::endl;
  
  std::unique_ptr<bisJSONParameterList> params(new bisJSONParameterList());
  if (!params->parseJSONString(jsonstring))
    return 0;
  
  if(debug)
    params->print("from computeJacobianImage","_____");
  
  
  
  std::shared_ptr<bisAbstractTransformation> dispXform=bisDataObjectFactory::deserializeTransformation(xform,"jacxform");
  if (dispXform.get()==0) {
    std::cerr << "Failed to deserialize transformation " << std::endl;
    return 0;
  }
  
  int dim[3];   in_image->getImageDimensions(dim);
  float spa[3]; in_image->getImageSpacing(spa);
  int nonlinearonly=params->getBooleanValue("nonlinearonly",0);
  
  if (debug)
    {
      std::cout << "Computing Jacobian Image nonlinearonly=" << nonlinearonly << ", dim=" << dim[0] << "," << dim[1] << "," << dim[2];
      std::cout << "  spa=" << spa[0] << "," << spa[1] << "," << spa[2] << " with " << dispXform->getClassName() << std::endl;
    }
  
  std::unique_ptr< bisSimpleImage<float> > output(bisImageTransformationJacobian::computeJacobian(dispXform.get(),dim,spa,nonlinearonly,debug));
  return output->releaseAndReturnRawArray();
  
  
}


