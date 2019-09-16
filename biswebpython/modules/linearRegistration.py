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
import biswebpython.core.bis_baseutils as bis_baseutils

class linearRegistration(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='linearRegistration';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('linearRegistration');

    def directInvokeAlgorithm(self,vals):
        
        print('oooo invoking: linearRegistration', (vals));	
        target = self.inputs['target'];
        reference = self.inputs['reference'];
        transform = self.inputs['initial'];

        if (reference.hasSameOrientation(target,'Reference Image','Target Image',True)==False):
            return False;
        
        libbis=self.getDynamicLibraryWrapper();
        try:
            out=libbis.runLinearRegistrationWASM(reference, target, transform, {
                'intscale' : vals['intscale'],
                'numbins' : vals['numbins'],
                'levels' : vals['levels'],
                'smoothing' : vals['imagesmoothing'],
                'optimization' : bis_baseutils.getOptimizationCode(vals['optimization']),
                'stepsize' : vals['stepsize'],
                'metric' : bis_baseutils.getMetricCode(vals['metric']),
	        'steps' : vals['steps'],
                'normalize' : self.parseBoolean(vals['norm']),
                'debug' : self.parseBoolean(vals['debug']),
                'iterations' : vals['iterations'],
                'mode' : bis_baseutils.getLinearModeCode(vals['mode']), 
                'resolution' : vals['resolution'],
                'return_vector' : False}, self.parseBoolean(vals['debug']));

            self.outputs['output']=bis_objects.bisLinearTransformation();
            self.outputs['output'].create(out);

            
            if (self.parseBoolean(vals['doreslice'])==True):
                self.outputs['resliced']=bis_baseutils.resliceRegistrationOutput(libbis,reference,
                                                                                 target,self.outputs['output']);
        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm',e);
            return False

        return True

