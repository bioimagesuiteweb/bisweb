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
import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_objects as bis_objects

class blankImage(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='blankImage';
   
    def createDescription(self):
        return  self.getModuleDescriptionFromFile('blankImage');

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: blankImage with vals', vals);
        input = self.inputs['input'];
        libbis=self.getDynamicLibraryWrapper();
        try:
            self.outputs['output'] = libbis.blankImageWASM(input,
                                                          paramobj={
                                                              "i0": (vals['i0']),
		                                              "i1": (vals['i1']),
                                                              "j0": (vals['j0']),
		                                              "j1": (vals['j1']),
                                                              "k0": (vals['k0']),
		                                              "k1": (vals['k1'])
                                                          }, debug=self.parseBoolean(vals['debug']))
        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm',e);
            return False

        return True




