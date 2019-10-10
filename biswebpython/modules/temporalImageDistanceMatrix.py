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

class temporalImageDistanceMatrix(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='temporalImageDistanceMatrix';
   
    def createDescription(self):
        
        return {
            "name": "compute sparse temporal Image Distance Matrix",
            "description": "Given an image  the sparse temporal image distance matrix (i.e. similarity between frames)",
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
                }
            ],
            "outputs": bis_baseutils.getMatrixToMatrixOutputs('The output distance matrix','.binmatr'),
            "params": [
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
                    "name": "Sparsity",
                    "description": "The sparsity constraint (if useradius=false)",
                    "type": "float",
                    "default": 0.01,
                    "lowbound": 0.01,
                    "highbound": 0.2,
                    "varname": "sparsity"
                },
                bis_baseutils.getDebugParam()
            ],
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);
        paramobj= {
            'numthreads' : vals['numthreads'],
            'sparsity' : vals['sparsity'],
        };

        out=bis_baseutils.getDynamicLibraryWrapper().computeTemporalImageDistanceMatrixWASM(self.inputs['input'],
                                                                                            paramobj,
                                                                                            self.parseBoolean(vals['debug']));
        self.outputs['output']=bis_objects.bisMatrix();
        self.outputs['output'].create(out);        
        print('Output=',self.outputs['output']);
        return True
    



