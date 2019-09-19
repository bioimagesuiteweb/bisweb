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
import biswebpython.core.bis_baseutils as bis_baseutils
import biswebpython.core.bis_objects as bis_objects


class timeseriesNormalizeImage(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='timeseriesNormalizeImage';
   
    def createDescription(self):
        return {
            "name": "Timeseries normalize image",
            "description": "Given 4d image normalize it so that each voxel timeseries has mean 0 and sigma=1",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input timeseries image",
                    "varname": "input",
                    "shortname" : "i",
                    "required": True
                }
            ],
            "outputs": [
                {
                    "type": "matrix",
                    "name": "Output Matrix",
                    "description": "The output correlation matrix",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".matr"
                }

            ],
            "params": [
                {
                    "name": "Debug",
                    "description": "Toggles debug logging",
                    "varname": "debug",
                    "type": "boolean",
                    "default": False
                }
            ],
        }
        

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug=self.parseBoolean(vals['debug'])
        input = self.inputs['input'];

        lib=bis_baseutils.getDynamicLibraryWrapper();
        self.outputs['output']=lib.timeSeriesNormalizeImageWASM(input,debug);
        return True




