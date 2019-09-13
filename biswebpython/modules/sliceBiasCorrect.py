#!/usr/bin/env python3

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

import bis_path
import sys
import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_objects as bis_objects;

class sliceBiasCorrect(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='sliceBiasCorrect';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('sliceBiasCorrect');

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: sliceBiasCorrect with vals', (vals));

        mode=vals['axis'];
        axis=3;
        if (mode=="x"):
            axis=0;
        elif (mode=="y"):
            axis=1;
        elif (mode=="z"):
            axis=2;
	
        input = self.inputs['input'];
        libbis=self.getDynamicLibraryWrapper();
        
        try:
            self.outputs['output'] = libbis.sliceBiasFieldCorrectImageWASM(input, {
		"axis" : axis,
		"threshold" : vals['threshold'],
		"returnbiasfield" : self.parseBoolean(vals['returnbiasfield'])
            }, self.parseBoolean(vals['debug']));
        except:
            print('---- Failed to invoke algorithm');
            return False
        
        return True;

if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(sliceBiasCorrect(),sys.argv,False));
