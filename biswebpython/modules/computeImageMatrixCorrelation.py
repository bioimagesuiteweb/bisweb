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


class computeImageMatrixCorrelation(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='computeImageMatrixCorrelation';
   
    def createDescription(self):
        return {
            "name": "Image Matrix Correlation",
            "description": "Given an image and an roi map compute the correlation matrix",
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
                },
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The roi mask image",
                    "varname": "roi",
                    "shortname" : "r",
                    "required": True
                },
            ],
            "outputs": bis_baseutils.getMatrixToMatrixOutputs('The output correlation matrix','.binmatr'),
            "params": [
                {
                    "name": "Zscore",
                    "description": "Should the output be zscore normalized",
                    "varname": "zscore",
                    "type": "boolean",
                    "default": True
                },
                bis_baseutils.getDebugParam()
            ],
        }
        

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug=self.parseBoolean(vals['debug'])
        input = self.inputs['input'];
        roi   = self.inputs['roi'];

        if (input.hasSameOrientation(roi,'Input Image','ROI Image',True)==False):
            return False;

        lib=bis_baseutils.getDynamicLibraryWrapper();
        timeseries=lib.computeROIWASM(input,roi,{},debug);
        print('___ Timeseries roi mean done',timeseries.shape);

        zscore=self.parseBoolean(vals['zscore']);
        cc=lib.computeCorrelationMatrixWASM(timeseries,0, { 'toz' : zscore },debug);
        print('___ Done',cc.shape);

        mat=bis_objects.bisMatrix();
        mat.create(cc);

        self.outputs['output']=mat;
        
        return True




