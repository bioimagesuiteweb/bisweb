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
    
class prepareRegistration(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='prepareRegistration';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('prepareRegistration')

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: prepareRegistration with vals', (vals));

        input = self.inputs['input'];
        libbis=self.getDynamicLibraryWrapper();
        
        try:
            self.outputs['output'] = libbis.prepareImageForRegistrationWASM(input, {
                "numbins" : vals['numbins'],
                "normalize" : self.parseBoolean(vals['normal']),
                "resolution" : vals['resolution'],
                "sigma" : vals['sigma'],
                "intscale" : vals['intscale'],
                "frame" : vals['frame'],
            }, self.parseBoolean(vals['debug']));
        except:
            print('---- Failed to invoke algorithm');
            return False
        
        return True;

