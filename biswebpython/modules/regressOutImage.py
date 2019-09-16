# LICENSE
# 
# _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
# 
# BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
# 
# - you may not use this software except in compliance with the License.
# - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
# 
# __Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.__
# 
# ENDLICENSE


import sys
import numpy as np
import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_objects as bis_objects

class regressOutImage(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='regressOutImage';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('regressOutImage');

    
    def polynomial(self,t,power):

        if power<0:
            power=0;
        elif power>6:
            power=6;
        
        if power==0:
            return 1.0;

        if power==1:
            return t;

        if power==2:
            return 1.5*t*t-0.5;

        return 2.5*t*t*t-1.5*t;


    def computeTime(self,col, numframes):
        if ((numframes-1)<0.00001):
            return (col)-(numframes-1)*0.5;

        return ((col)-(numframes-1)*0.5)/((numframes-1)*0.5);
    

    
    def createRegressor(self,image,order):

        numframes=image.dimensions[3];
        print('oooo Create Drift Correction Regressor Order=',order,'num columns=',order+1);
        mat=np.zeros([numframes,order+1],dtype=np.float32);

        for i in range (0,numframes):
            t=self.computeTime(i,numframes);
            for  j in range(0,order+1):
                mat[i][j]=self.polynomial(t,j);


        return mat;
    

    
    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: regressOutImage with vals', (vals));
        input = self.inputs['input'];
        weight=self.inputs['weight'];
        regressor = self.inputs['regressor'];
        libbis=self.getDynamicLibraryWrapper();
        
        try:
            self.outputs['output'] = libbis.weightedRegressOutImageWASM(input, regressor,weight, 
                                                                        self.parseBoolean(vals['debug']));
        except:
            print('---- Failed to invoke algorithm');
            return False
        
        return True;

