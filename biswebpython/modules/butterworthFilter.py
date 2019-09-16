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

class butterworthFilter(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='butterworthFilter';
   
    def createDescription(self):
        return self.getModuleDescriptionFromFile('butterworthFilter');

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: butterworthFilter with vals', vals);
        input = self.inputs['input'];
        libbis=self.getDynamicLibraryWrapper();        

        try:
            inp = input;
            out = None;
            if (vals['type'] == "low" or vals['type'] == "band"):
                out = libbis.butterworthFilterWASM(input, {
                    "type": "low",
                    "cutoff": vals['low'],
                    "samplerate": vals['tr']
                }, self.parseBoolean(vals['debug']));

                if (vals['type'] == "low"):
                    self.outputs['output']=bis_objects.bisMatrix()
                    self.outputs['output'].create(out);
                    return True
                inp = out;

            out= libbis.butterworthFilterWASM(inp, {
                "type": "high",
                "cutoff": vals['high'],
                "samplerate": vals['tr'],
            }, self.parseBoolean(vals['debug']));

            self.outputs['output']=bis_objects.bisMatrix();
            self.outputs['output'].create(out);
        except:
            return False

        return True

