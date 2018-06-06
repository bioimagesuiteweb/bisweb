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
import bis_basemodule
import bis_objects
import modules_desc
import biswrapper as libbis;
import bis_baseutils

class resliceImage(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='resliceImage';
   
    def createDescription(self):
        return modules_desc.descriptions['resliceImage'];

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: resliceImage with vals', (vals));
        input = self.inputs['input'];
        reference = self.inputs['reference'];
        if (reference==None):
            reference=input;
        xform = self.inputs['xform'];
            
        spa=reference.spacing;
        dim=reference.dimensions
        dt="-1";
        if (vals['forcefloat']):
            dt="float";

        try:
            self.outputs['output'] = libbis.resliceImageWASM(input, xform, {
                "spacing" : [ spa[0],spa[1],spa[2] ],
                "dimensions" : [ dim[0],dim[1],dim[2] ],
		"datatype" : dt,
                "interpolation" : vals['interpolation']
            },self.parseBoolean(vals['debug']));
        except:
            print('---- Failed to invoke algorithm');
            return False

        return True
            
if __name__ == '__main__':
    import bis_commandline; sys.exit(bis_commandline.loadParse(resliceImage(),sys.argv,False));

    
