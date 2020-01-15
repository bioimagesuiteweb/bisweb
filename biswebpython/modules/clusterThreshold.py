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

class clusterThreshold(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='clusterThreshold';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('clusterThreshold');

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: clusterThresholdImage with vals', (vals));
        input = self.inputs['input'];
        libbis=self.getDynamicLibraryWrapper();

        sz=vals['size'];
        if (self.parseBoolean(vals['keeplargest'])):
            sz=-1;
        
        try:
            self.outputs['output'] =libbis.clusterThresholdImageWASM(input, {
                "threshold": vals['threshold'],
                "clustersize": sz,
                "oneconnected" : self.parseBoolean(vals['oneconnected']),
                "outputclusterno" : self.parseBoolean(vals['outclustno']),
                "frame" : vals['frame'], 
                "component" : vals['component'],
                "datatype" : -1
            }, self.parseBoolean(vals['debug']));
                                                                     
        except:
            print('---- Failed to invoke algorithm');
            return False
        
        return True;

