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

class patchReformatImage(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='patchReformatImage';
   
    def createDescription(self):
        obj=self.getModuleDescriptionFromFile('patchReformatImage');
        obj['params'].append(
            {
                "name": "NumThreads",
                "description": "The number of threads to use",
                "type": "int",
                "default": 1,
                "lowbound": 1,
                "highbound": 10,
                "varname": "numthreads"
            },
        );
        return obj;

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);
        paramobj= {
            'numthreads' : vals['numthreads'],
            'increment' : vals['increment'],
            'radius' : vals['radius']
        };

        self.outputs['output']=bis_baseutils.getDynamicLibraryWrapper().createPatchReformatedImage(self.inputs['input'],
                                                                                                   paramobj,
                                                                                                   self.parseBoolean(vals['debug']));
        return True




