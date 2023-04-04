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


class dualImageRegression(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='dualImageRegression';
   
    def createDescription(self):
        return {
            "name": "dual Image Regression Preprocess",
            "description": "Regresses out a regressor image from an input image. This was designed as part of the preprocessing of dual channel calcium images. Optionally also computes dF/F",
            "author": "Jackson Zhaoxiong Ding",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input image (blue) to preprocess",
                    "varname": "input",
                    "shortname" : "i",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input image (uv) to preprocess",
                    "varname": "regressor",
                    "shortname" : "r",
                    "required": False
                }
            ],
            "outputs": [
                {
                    "type": "image",
                    "name": "Output Image",
                    "description": "The output image",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".nii.gz"
                }
            ],
            "params": [
                {
                    "name": "Debug",
                    "description": "Toggles debug logging. Will also output intermediate steps (similar name to Xilin's MATLAB code)",
                    "varname": "debug",
                    "type": "boolean",
                    "default": False
                }

            ],
        }
        

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug=self.parseBoolean(vals['debug'])
        input=self.inputs['input'];
        sz=input.get_data().shape;
        
        idata = np.reshape(self.inputs['input'].get_data(),[ sz[0]*sz[1]*sz[2],sz[3] ]);
        rdata = np.reshape(self.inputs['regressor'].get_data(),[ sz[0]*sz[1]*sz[2],sz[3] ]);
        print(idata.shape,rdata.shape);
        
        outdata=self.dualRegress(idata,rdata,debug);
        outdata=np.reshape(outdata,sz);

        self.outputs['output'] = bis_objects.bisImage().create(outdata,input.spacing,input.affine);
        
        return True


    def dualRegress(self,idata,rdata,debug=False):

        print('Regressing');
        
        output=np.zeros(idata.shape,idata.dtype)
        numvoxels=idata.shape[0]
        for voxel in range(0,numvoxels):
            blue=idata[voxel,:];
            uv=rdata[voxel,:];
            alpha=np.dot(uv,blue)/np.dot(uv,uv)
            residual=blue-alpha*uv
            output[voxel,:]=residual

                
        return output
    
