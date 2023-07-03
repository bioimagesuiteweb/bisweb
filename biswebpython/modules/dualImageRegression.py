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
            "author": "Xenios Papademetris",
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
                    "name": "Regressor Image",
                    "description": "The input image (uv) to preprocess",
                    "varname": "regressor",
                    "shortname" : "r",
                    "required": True
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
                },
                {
                    "name": "df over f",
                    "description": "Computes df/f normalization",
                    "varname": "dff",
                    "type": "boolean",
                    "default": False
                },
                {
                    "name": "regress",
                    "description": "if true regress out second image from first else just normalization",
                    "varname": "doregress",
                    "type": "boolean",
                    "default": True
                }
            ],
        }
        

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: dualImageRegression with vals', vals);

        debug=self.parseBoolean(vals['debug'])
        df=self.parseBoolean(vals['dff'])
        doregress=self.parseBoolean(vals['doregress'])
        input=self.inputs['input'];
        sz=input.get_data().shape;

        if len(sz)==3:
            sz=[ sz[0],sz[1],1,sz[2] ];
            print('Fixed shape to',sz);
    
        
        
        idata = np.reshape(self.inputs['input'].get_data(),[ sz[0]*sz[1]*sz[2],sz[3] ]);

        if (doregress):
            rdata = np.reshape(self.inputs['regressor'].get_data(),[ sz[0]*sz[1]*sz[2],sz[3] ]);

        if (debug):
            print('Input Shape=',sz,' Reshaped=', idata.shape)

        if (df):
            mean=np.mean(idata,axis=1)
            if (debug):
                print('Mean shape=',mean.shape);
                print('Mean=',mean[0:5]);
                print('Pre mean:',idata[0,0:5])
            idata=np.transpose(np.transpose(idata)-mean)
            if (debug):
                print('Post mean',idata[0,0:5])

            if (doregress):
                rmean=np.mean(rdata,axis=1);
                rdata=np.transpose(np.transpose(rdata)-rmean)
                if (debug):
                    print('R-Mean shape=',rmean.shape);

        if (doregress):
            print('.... computing dual image regression')
            outdata=self.dualRegress(idata,rdata,debug);
        else:   
            print('.... not computing dual image regression')
            outdata=idata;

        if (df):
            print('.... computing df/f')
            outdata=np.transpose((np.transpose(outdata)+mean)/mean)
        else:
            print('.... not computing df/f')

        outdata=np.reshape(outdata,sz);
        self.outputs['output'] = bis_objects.bisImage().create(outdata,input.spacing,input.affine);
        
        return True


    def dualRegress(self,idata,rdata,debug=False):

        output=np.zeros(idata.shape,idata.dtype)
        numvoxels=idata.shape[0]
        for voxel in range(0,numvoxels):
            blue=idata[voxel,:];
            uv=rdata[voxel,:];
            alpha=np.dot(uv,blue)/np.dot(uv,uv)
            residual=blue-alpha*uv
            output[voxel,:]=residual

                
        return output
    
