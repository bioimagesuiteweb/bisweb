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

class computeImageIndexMAP(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='computeImageIndexMap';
   
    def createDescription(self):
        
        return {
            "name": "compute Image Index Map for sparse Matrix distance computations",
            "description": "Given an  objectmap compute the image index map (voxels > 0 indexed)",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
                {
                    "type": "image",
                    "name": "Objectmap Image",
                    "description": "The objectmap/mask image",
                    "varname": "input",
                    "shortname" : "i",
                    "required": True,
                },
            ],
            "outputs": bis_baseutils.getImageToImageOutputs('The indexmap image'),
            "params" : [ 
                bis_baseutils.getDebugParam()
            ],
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: computeImageIndexMap with vals', vals);

        self.outputs['output']=bis_baseutils.getDynamicLibraryWrapper().computeImageIndexMapWASM(self.inputs['input'],
                                                                                   self.parseBoolean(vals['debug']));

        # Propagate Orientation in this weird matrix to image thing
        self.outputs['output'].affine=self.inputs['input'].affine;

        return True
    



