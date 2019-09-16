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
import biswebpython.core.bis_baseutils as bis_baseutils
import biswebpython.core.bis_objects as bis_objects


class nonlinearRegistration(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='nonlinearRegistration';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('nonlinearRegistration');

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: nonLinearRegistration', (vals));	
        target = self.inputs['target'];
        reference = self.inputs['reference'];
        transform = self.inputs['initial'];
        linearmode = bis_baseutils.getLinearModeCode(vals['linearmode']);

        if (reference.hasSameOrientation(target,'Reference Image','Target Image',True)==False):
            return False;


        libbis=self.getDynamicLibraryWrapper();
        
        initial=transform;
        if (linearmode>=0):
            try:
                mat=libbis.runLinearRegistrationWASM(reference, target, transform, {
                    'intscale' : vals['intscale'],
                    'numbins' : vals['numbins'],
                    'levels' : vals['levels'],
                    'smoothing' : vals['imagesmoothing'],
                    'optimization' : bis_baseutils.getOptimizationCode(vals['optimization']),
                    'stepsize' : vals['stepsize'],
                    'metric' : bis_baseutils.getMetricCode(vals['metric']),
	            'steps' : vals['steps'],
                    'iterations' : vals['iterations'],
                    'normalize' : self.parseBoolean(vals['norm']),
                    'debug' : self.parseBoolean(vals['debug']),
                    'mode' : linearmode,
                    'resolution' : vals['resolution'],
                    'return_vector' : False}, self.parseBoolean(vals['debug']));

                initial=bis_objects.bisLinearTransformation();
                initial.create(mat);
            except:
                print('Failed to invoke linear registration algorithm.');
                return False;

        try:
            self.outputs['output']=libbis.runNonLinearRegistrationWASM(reference, target, initial, {
		'cps' : vals['cps'],
                'appendmode': self.parseBoolean(vals['append']),
                'lambda' : vals['lambda'],
                'intscale' : vals['intscale'],
                'numbins' : vals['numbins'],
                'levels' : vals['levels'],
                'smoothing' : vals['imagesmoothing'],
                'optimization' : bis_baseutils.getOptimizationCode(vals['optimization']),
                'stepsize' : vals['stepsize'],
                'debug' : self.parseBoolean(vals['debug']),
                'normalize' : self.parseBoolean(vals['norm']),
                'metric' : bis_baseutils.getMetricCode(vals['metric']),
	        'steps' : vals['steps'],
                'iterations' : vals['iterations'],
                'resolution' : vals['resolution']}, self.parseBoolean(vals['debug']));
            
            if (self.parseBoolean(vals['doreslice'])==True):
                self.outputs['resliced']=bis_baseutils.resliceRegistrationOutput(libbis,reference,
                                                                                 target,self.outputs['output']);
        except:
            print('---- Failed to invoke nonlinear registration algorithm.');
            return False

        return True

