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
from biswebpython.modules.extractImagePatches import *

class imageDistanceMatrix(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='imageDistanceMatrix';
   
    def createDescription(self):
        
        return {
            "name": "compute sparse Image Distance Matrix",
            "description": "Given an image and an objectmap compute the image distance matrix",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input (timeseries) image",
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
                    "required": False
                },
            ],
            "outputs": bis_baseutils.getMatrixToMatrixOutputs('The output distance matrix','.binmatr'),
            "params": [
                {
                    "name": "useradius",
                    "description": "If true use radius else sparsity",
                    "varname": "useradius",
                    "type": "boolean",
                    "default": True
                },
                {
                    "name": "NumThreads",
                    "description": "The number of threads to use",
                    "type": "int",
                    "default": 1,
                    "lowbound": 1,
                    "highbound": 10,
                    "varname": "numthreads"
                },
                {
                    "name": "Radius",
                    "description": "The radius constraint (if useradius=true)",
                    "type": "float",
                    "default": 4.0,
                    "lowbound": 0.1,
                    "highbound": 10.0,
                    "varname": "radius"
                },
                {
                    "name": "Sparsity",
                    "description": "The sparsity constraint (if useradius=false)",
                    "type": "float",
                    "default": 0.01,
                    "lowbound": 0.01,
                    "highbound": 0.2,
                    "varname": "sparsity"
                },
                {
                    "name": "Numpatches",
                    "description": "Number of patches to extract (default=0 i.e. use whole image as opposed to patches)",
                    "type": "int",
                    "default": 0,
                    "lowbound": 0,
                    "highbound": 65536,
                    "varname": "numpatches"
                },
                {
                    "name": "Patchsize",
                    "description": "Patch size (in voxels) (default=32) if using patches",
                    "type": "int",
                    "default": 32,
                    "lowbound": 2,
                    "highbound": 256,
                    "varname": "patchsize"
                },
                {
                    "name": "3d",
                    "description": "if true 3d patches (default=false) if using patches",
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


        if (vals['numpatches']>0):
            print('_____________________________________________');
            print('____ First extracting patches')

            patchExtractor=extractImagePatches();
            patchExtractor.execute({ 'input' : self.inputs['input'] },
                            { 'numpatches' : vals['numpatches'],
                              'patchsize'  : vals['patchsize'],
                              'threed' : vals['threed'],
                              'ordered' : False
                              });
            self.inputs['input']=patchExtractor.getOutputObject('output');
            self.inputs['mask']=0;
            print('_____________________________________________');
        
        
        paramobj= {
            'numthreads' : vals['numthreads'],
            'sparsity' : vals['sparsity'],
            'radius' : vals['radius'],
            'useradius' : self.parseBoolean(vals['useradius'])
            
        };

        out=bis_baseutils.getDynamicLibraryWrapper().computeImageDistanceMatrixWASM(self.inputs['input'],
                                                                                    self.inputs['mask'],
                                                                                    paramobj,
                                                                                    self.parseBoolean(vals['debug']));
        self.outputs['output']=bis_objects.bisMatrix();
        self.outputs['output'].create(out);        
        return True
    



