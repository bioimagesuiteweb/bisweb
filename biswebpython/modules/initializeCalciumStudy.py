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

import os
import sys
import numpy as np
import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_objects as bis_objects
import biswebpython.utilities.calcium_analysis as calcium_analysis;
from PIL import Image
import json

class initializeCalciumStudy(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='initializeCalciumStudy';
   
    def createDescription(self):
        des= {
            "name": "Initialize Calcium Study",
            "description": "Takes as input a study setup json file and creates the initial nifti images",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs" : [],
            "params": [
                {
                    "type": "string",
                    "name": "Setup Name",
                    "description": "The setup filename",
                    "varname": "setupname",
                    "default" : "",
                    "required": True
                },
                {
                    "type": "string",
                    "name": "Output Directory",
                    "description": "The base output directory",
                    "varname": "outdir",
                    "default" : "",
                    "required": True
                },
                {
                    "name": "Debug",
                    "description": "Toggles debug logging. Will also output intermediate steps (similar name to Xilin's MATLAB code)",
                    "varname": "debug",
                    "type": "boolean",
                    "default": False
                }
            ]
        }
        return des;

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug=self.parseBoolean(vals['debug'])
        setupname=vals['setupname'];
        outdir=vals['outdir'];
        self.data={};
        
        try:
            file = open(vals['setupname'])
            text=file.read()
            self.data = json.loads(text)
        except:
            e = sys.exc_info()[0]
            print(e)
            print('---- Bad setup file ('+args['setupname']+')')
            return 0

        try:
            os.mkdir(outdir)
        except:
            e = sys.exc_info()[0]
            print(e)
            print('---- Failed to make directory',outdir)
            return 0
        
        self.convertRuns(self.data,outdir);

        
        return True

    def convertRuns(self,data,outdir):

        n=len(data['runs'])
        r=data['resolution'];
        TR=data['TR']
        orient=data['orientation']
        mat=np.zeros((4,4));
        spa=[ r,r,1.0,TR,1.0 ];
        if (orient[0]=='L'):
            mat[0][0]=-r
        else:
            mat[0][0]=r

        if (orient[1]=='P'):
            mat[1][1]=-r
        else:
            mat[1][1]=r
        mat[2][2]=1
        mat[3][3]=1



        for i in range(0,n):
            run=data['runs'][i]
            parts=run['parts']
            m=len(parts)
            for j in range(0,m):
                oname='{:s}_run{:02d}_part{:02d}.nii.gz'.format(data['subjectname'],i+1,j+1)
                oname=os.path.abspath(os.path.join(outdir,oname))
                print('.... Importing run',i+1,' part', j+1, 'from', parts[j],' to',oname)
                img=bis_objects.bisImage();
                img.load(parts[j])
                img.spacing=spa
                img.affine=mat
                img.save(oname);
                print('+++ saved in',img.getDescription())
        
        


