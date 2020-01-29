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


  double determ( bisUtil::mat44 m )   /* determinant of 3x3 matrix */
  {
    // Using only lower diagoal of 3x3
    
    double r11,r12,r13,r21,r22,r23,r31,r32,r33 ;
    /*  INPUT MATRIX:  */
    r11 = 1.0+m[0][0]; r12 = 0.5*(m[1][0]+m[0][1]); r13 = 0.5*(m[2][0]+m[0][2]);  /* [ r11 r12 r13 ] */
    r21 = r12;         r22 = 1.0+m[1][1];           r23 = 0.5*(m[1][2]+m[2][1]);  /* [ r21 r22 r23 ] */
    r31 = r13;         r32 = r23;                   r33 = 1.0+ m[2][2];  /* [ r31 r32 r33 ] */
      
    return r11*r22*r33-r11*r32*r23-r21*r12*r33+r21*r32*r13+r31*r12*r23-r31*r22*r13 ;
  }

  std::unique_ptr<bisSimpleImage<float> > computeJacobian(bisAbstractTransformation* transformation, int dim[3],float spa[3],int nonlinearonly=0) {




    // If Combo then set linear component to identity --> nonlinearonly!
    bisUtil::mat44 linear;
    int nonlinearcombo=0;
    
    if (transformation->getClassName()=="bisComboTransformation" && nonlinearonly>0) {
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
    
    int o_dim[5] = { dim[0],dim[1],dim[2],3,1};
    float o_spa[5] = { spa[0],spa[1],spa[2],1.0,1.0};
    std::string n1="jacobian";
    std::unique_ptr<bisSimpleImage<float > > out(new bisSimpleImage<float>(n1));
    out->allocate(o_dim,o_spa);
    out->fill(0.0);
    
    
    
    
    // ------------------------------- Compute Jacobian -----------------------------------------
    int offsets[4]= {  1,dim[0],dim[0]*dim[1],dim[0]*dim[1]*dim[2]  };

    bisUtil::mat44 temp;
    float* idata=dispfield->getImageData();
    float* odata=out->getImageData();

    float sum=0.0;
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

          for (int comp=0;comp<=2;comp++) {
            int C=comp*offsets[3];

            temp[comp][0]= 0.5*( idata[K  + J  + IP + C] - idata[K  + J  + IM + C] );
            temp[comp][1]= 0.5*( idata[K  + JP + I  + C] - idata[K  + JM + I  + C] );
            temp[comp][2]= 0.5*( idata[KP + J  + I  + C] - idata[KM + J  + I  + C] );
          }
          float d=float(determ(temp));
          odata[I+J+K]=d;

          sum+=d;
          num+=1;
        }
      }
    }

    if (nonlinearonly>0 && nonlinearcombo==0) {
      
      // remove mean
      float mean=sum/float(num);
      
      for (int ka=1;ka<dim[2]-1;ka++) {
        int K=ka*offsets[2];
        for (int ja=1;ja<dim[1]-1;ja++) {
          int J=ja*offsets[1];
          for (int ia=1;ia<dim[0]-1;ia++) {
            int I=ia;
            odata[I+J+K]=odata[I+J+K]-mean;
          }
        }
      }
      
    }
    return std::move(out);
  }


  
  // BIS: { 'computeJacobianImageWASM', 'bisImage', [ 'bisTransformation', 'ParamObj',  'debug' ] }
  unsigned char* computeJacobianImageWASM(unsigned char* xform,const char* jsonstring,int debug) {
   
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
    
    int dim[3];
    float spa[3];
    int nonlinearonly=params->getBooleanValue("nonlinearonly",0);
    
    for (int ia=0;ia<=2;ia++)
      {
        dim[ia]=params->getIntValue("dimensions",64,ia);
        spa[ia]=params->getFloatValue("spacing",1.0,ia);
      }
    
    if (debug)
      {
        std::cout << "Computing Jacobian Image nonlinearonly=" << nonlinearonly << ", dim=" << dim[0] << "," << dim[1] << "," << dim[2];
        std::cout << "  spa=" << spa[0] << "," << spa[1] << "," << spa[2] << " with " << dispXform->getClassName() << std::endl;
      }
    
    std::unique_ptr< bisSimpleImage<float> > output(computeJacobian(dispXform.get(),dim,spa,nonlinearonly));
    return output->releaseAndReturnRawArray();
                                                    
    
  }

  }
