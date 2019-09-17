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



import sys
try:
    import bisweb_path;
except ImportError:
    bisweb_path=0;

import biswebpython.core.bis_basemodule as bis_basemodule;
import biswebpython.core.bis_objects as bis_objects;
import biswebpython.utilities.smoothInflationOperator as infopr


class inflateSurface(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='inflateSurface';

    def createDescription(self):
        return {
            "name": "inflateSurface",
            "description": "inflate the cortical surface",
            "author": "An Qu",
            "version": "1.0",
            "inputs": [
                {
                    "type": "surface",
                    "name": "Input Surface",
                    "description": "The input surface to inflate",
                    "varname": "input",
                    "shortname": "i",
                    "required": True
                },
            ],
            "outputs": [
                {
                    "type": "surface",
                    "name": "Output Surface",
                    "description": "The output inflated surface",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".ply"
                },
            ],
            "params": [
                {
                    "name": "Inflate",
                    "description": "Do inflate?",
                    "varname": "inflate",
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
        inflate=self.parseBoolean(vals['inflate'])
        input=self.inputs['input']
        self.outputs['output']=bis_objects.bisSurface();

        try:
            vertices = infopr.relaxationOperator(input.vertices, input.faces, input.labels, debug)

        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm ----',e);
            return False


        self.outputs['output'].create(vertices,input.faces,input.labels);

        return True


if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(inflateSurface(),sys.argv,False));




