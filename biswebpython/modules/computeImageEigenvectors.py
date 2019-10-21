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

import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_baseutils as bis_baseutils
import biswebpython.core.bis_objects as bis_objects
import numpy as np;

class computeImageEigenvectors(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='computeImageEigenvectors';
   
    def createDescription(self):
        
        return {
            "name": "compute sparse Image Distance Matrix",
            "description": "Given an image and an objectmap compute the image distance matrix",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "inputs": [
                {
                    "type": "matrix",
                    "name": "Input Distance matrix",
                    "description": "The input distance matrix",
                    "varname": "input",
                    "shortname" : "i",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Objectmap Image",
                    "description": "The objectmap/mask image",
                    "varname": "mask",
                    "shortname" : "m",
                    "required": False,
                },
            ],
            "outputs": bis_baseutils.getImageToImageOutputs('The output eigenvector image'),
            "params": [
                {
                    "name": "Maxeigen",
                    "description": "The maximum number of eigenvectors to compute",
                    "type": "int",
                    "default": 10,
                    "lowbound": 1,
                    "highbound": 1000,
                    "varname": "maxeigen"
                },
                {
                    "name": "Sigma",
                    "description": "The normalization constant for exponentiating the distance matrix",
                    "type": "float",
                    "default": 1.0,
                    "lowbound": 0.1,
                    "highbound": 10.0,
                    "varname": "sigma"
                },
                {
                    "name": "Lambda",
                    "description": "The eucliden smoothness factor",
                    "type": "float",
                    "default": 0.0,
                    "lowbound": 0.0,
                    "highbound": 100.0,
                    "varname": "lambda"
                },
                {
                    "name": "Scale",
                    "description": "A value to scale the eigenvectors by (default=10000)",
                    "type": "float",
                    "default": 10000.0,
                    "lowbound": 1.0,
                    "highbound": 100000.0,
                    "varname": "scale"
                },
                {
                    "name": "Max Iterations",
                    "description": "The maximum number of iterations",
                    "type": "int",
                    "default": 5000,
                    "lowbound": 1,
                    "highbound": 10000,
                    "varname": "maxiter"
                },
                {
                    "name": "Patchsize",
                    "description": "If no mask is specified, this is used to create it",
                    "type": "int",
                    "default": 32,
                    "lowbound": 2,
                    "highbound": 256,
                    "varname": "patchsize"
                },
                {
                    "name": "3d",
                    "description": "if true 3d patches (default=false)",
                    "priority": 1000,
                    "advanced": False,
                    "gui": "check",
                    "varname": "threed",
                    "type": 'boolean',
                    "default": False,
                },
                bis_baseutils.getDebugParam()
            ],
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);
        paramobj= {
            'maxeigen' : vals['maxeigen'],
            'lambda' : vals['lambda'],
            'sigma' : vals['sigma'],
            'maxiter' : vals['maxiter'],
            'scale' : vals['scale'],
        };
        print('Paramobj=',paramobj);
        if (self.inputs['mask'] is None):
            print('____ creating mask (all ones)');
            ps=vals['patchsize'];
            t=self.parseBoolean(vals['threed']);
            p=[ ps,ps,ps];
            if (not t):
                p[2]=1;
            dat = np.zeros(p, dtype=np.int32)+1;
            self.inputs['mask']=bis_objects.bisImage();
            self.inputs['mask'].create(dat,[ 1.0,1.0,1.0,1.0,1.0],np.eye(4) );
        
        indexmap=bis_baseutils.getDynamicLibraryWrapper().computeImageIndexMapWASM(self.inputs['mask'],
                                                                                   self.parseBoolean(vals['debug']));

        self.outputs['output']=bis_baseutils.getDynamicLibraryWrapper().computeSparseImageEigenvectorsWASM(self.inputs['input'],
                                                                                        indexmap,
                                                                                        paramobj,
                                                                                        self.parseBoolean(vals['debug']));

        # Propagate Orientation in this weird matrix to image thing
        self.outputs['output'].affine=self.inputs['mask'].affine;

        return True
    



