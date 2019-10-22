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

class eigenvectorDenoiseImage(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='eigenvectorDenoiseImage';
   
    def createDescription(self):
        
        return {
            "name": "denoise image using an eigenspace",
            "description": "Given an image and an eigenvector image denoise the input",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input image",
                    "description": "The inputimage",
                    "varname": "input",
                    "shortname" : "i",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Eigenvector Image",
                    "description": "The eigenvector 4d image",
                    "varname": "eigenv",
                    "shortname" : "e",
                    "required": True
                },
            ],
            "outputs": bis_baseutils.getImageToImageOutputs('The output eigenvector image'),
            "params": [
                {
                    "name": "Scale",
                    "description": "A value to scale the eigenvectors by (default=10000)",
                    "type": "float",
                    "default": 10000.0,
                    "lowbound": 1.0,
                    "highbound": 100000.0,
                    "varname": "scale"
                },
                bis_baseutils.getDebugParam()
            ],
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);
        paramobj= {
            'scale' : vals['scale'],
        };
        self.outputs['output']=bis_baseutils.getDynamicLibraryWrapper().computeEigenvectorDenoiseImageWASM(self.inputs['input'],
                                                                                                           self.inputs['eigenv'],
                                                                                                           paramobj,
                                                                                                           self.parseBoolean(vals['debug']));
        
        return True
    



