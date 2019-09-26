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
    
class computeROI(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='computeROI';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('computeROI');

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: computeROI with vals', vals);

        input = self.inputs['input'];
        roi  = self.inputs['roi']

        if (roi.hasSameOrientation(input,'ROI','Input',True)==False):
            return False

        print('oooo');
        print('oooo Input=',input.getDescription());
        print('oooo ROI=',roi.getDescription());
        libbis=self.getDynamicLibraryWrapper();
        
        try:
            out = libbis.computeROIWASM(input, roi, {
                'storecentroids' :      self.parseBoolean(vals['storecentroids'])
                },self.parseBoolean(vals['debug']));
            a=out.shape;
            if (a[0]*a[1]<1):
                print(' ----- Bad Input Images');
                return False;

            self.outputs['output']=bis_objects.bisMatrix();
            self.outputs['output'].create(out);


        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm '+str(e));
            return False

        return True

