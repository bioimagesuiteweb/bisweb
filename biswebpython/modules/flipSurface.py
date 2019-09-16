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

class flipSurface(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='flipSurface';

    def createDescription(self):
        return {
            "name": "flipSurface",
            "description": "flips surface along z-axis",
            "author": "An Qu",
            "version": "1.0",
            "inputs": [
                {
                    "type": "surface",
                    "name": "Input Surface",
                    "description": "The input surface to flip",
                    "varname": "input",
                    "shortname": "i",
                    "required": True
                },
            ],
            "outputs": [
                {
                    "type": "surface",
                    "name": "Output Surface",
                    "description": "The output surface",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".ply"
                },
            ],
            "params": [
                {
                    "name": "Flip",
                    "description": "Do flip?",
                    "varname": "flip",
                    "type": "boolean",
                    "default": True
                },
                {
                    "name": "Debug",
                    "description": "Toggles debug logging. Will also output intermediate steps (similar name to Xilin's MATLAB code)",
                    "varname": "debug",
                    "type": "boolean",
                    "default": False
                }
            ],
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug=self.parseBoolean(vals['debug'])
        flip=self.parseBoolean(vals['flip'])

        print('Debug=',debug,' flip=',flip);

        input=self.inputs['input'];

        # Add code


        self.outputs['output']=bis_objects.bisSurface();
        self.outputs['output'].create(input.vertices,input.faces);
        print(self.outputs);

        return True






