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

# To enable a module to be executed directly (not as part of biswebpy.py)
#
# 1. Add these lines here to add the grandparent biswebpython folder to path
# first (so that it overrules any global biswebpython file)
#
# my_path=os.path.dirname(os.path.realpath(__file__));
# n=os.path.abspath(my_path+'/../..')
# sys.path.insert(0,n);
#
# 2. See the end of this file

import sys
import biswebpython.core.bis_basemodule as bis_basemodule;

class afniBlurImage(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='afniBlur';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('afniBlurImage');

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: afniBlurImage with vals', vals);
        
        input = self.inputs['input'];
        mask = self.inputs['mask'];
        s = (vals['sigma']);
        usemask=self.parseBoolean(vals['usemask']),


        libbis=self.getDynamicLibraryWrapper();
        try:
            self.outputs['output'] = libbis.afniBlurImageWASM(input,
                                                              mask,
                                                              paramobj={
                                                                  "sigma": s,
                                                                  "usemask" : usemask
                                                              }, debug=self.parseBoolean(vals['debug']))
        except NameError as  f:
            print(f)
            return False
        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm',e);
            return False
        return True

# To enable a module to be executed directly (not as part of biswebpy.py)
# add these lines here
#
#if __name__ == '__main__':
#    import biswebpython.core.bis_commandline as bis_commandline;
#    sys.exit(bis_commandline.loadParse(afniBlurImage(),sys.argv,False));
#



    
