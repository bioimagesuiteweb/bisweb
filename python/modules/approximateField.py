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
import math
import numpy as np
import argparse
import bis_basemodule
import bis_objects
import modules_desc;
import biswrapper as libbis;

class approximateField(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='approximateField';
   
    def createDescription(self):
        return modules_desc.descriptions['approximateField'];

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: approximateField with vals', vals);
        input = self.inputs['input'];

        print('This far',libbis);
        try:
            self.outputs['output'] = libbis.approximateDisplacementFieldWASM2(input, {
                "spacing": vals['spacing'],
                "steps":  vals['steps'],
                "stepsize": vals['stepsize'],
                "lambda": vals['lambda'],
                "iterations": vals['iterations'],
                "tolerance": vals['tolerance'],
                'optimization': vals['optimization'],
                "windowsize": vals['windowsize'],
                "levels": vals['levels'],
                "resolution": vals['resolution'],
                "inverse": self.parseBoolean(vals['inverse']),
            }, self.parseBoolean(vals['debug']));
        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm',e);
            return False

        return True

if __name__ == '__main__':
    import bis_commandline; sys.exit(bis_commandline.loadParse(approximateField(),sys.argv,False));



    
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
import math
import numpy as np
import argparse
import bis_basemodule
import bis_baseutils
import bis_objects
import modules_desc
import biswrapper as libbis;

class approximateField(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='approximateField';
   
    def createDescription(self):
        return modules_desc.descriptions['approximateField'];

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: approximateField', (vals));
        inputImg = self.inputs['input'];

        try:
            self.outputs['output'] = libbis.approximateDisplacementFieldWASM2(inputImg, {
                "spacing": (vals['spacing']),
                "steps": (vals['steps']),
                "stepsize": (vals['stepsize']),
                "lambda": (vals['lambda']),
                "iterations": (vals['iterations']),
                "tolerance": (vals['tolerance']),
                'optimization': bis_baseutils.getOptimizationCode(vals['optimization']),
                "windowsize": (vals['windowsize']),
                "levels": (vals['levels']),
                "resolution": (vals['resolution']),
                "inverse": self.parseBoolean(vals['inverse']),
            }, self.parseBoolean(vals['debug']));
        except:
            print('---- Failed to invoke algorithm nonlinear component of module');
            return False

        return True

if __name__ == '__main__':
    import bis_commandline; sys.exit(bis_commandline.loadParse(approximateField(),sys.argv,False));
    
    
