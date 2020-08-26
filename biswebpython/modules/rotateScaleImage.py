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
import biswebpython.utilities.rotNscale as rtsc


class rotateScaleImage(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='rotateScaleImage';

    def createDescription(self):
        return {
            "name": "rotateScaleImage",
            "description": "rotate and scale the image",
            "author": "An Qu",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input image",
                    "description": "input image",
                    "varname": "input",
                    "shortname": "i",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Input image2",
                    "description": "input image2(optional)",
                    "varname": "input2",
                    "shortname": "i2",
                    "required": False
                },
                {
                    "type": "image",
                    "name": "Input mask",
                    "description": "input mask(optional)",
                    "varname": "input_mask",
                    "shortname": "imsk",
                    "required": False
                }
            ],
            "outputs": [
                {
                    "type": "image",
                    "name": "Output image",
                    "description": "output image",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".nii.gz"
                },
                {
                    "type": "image",
                    "name": "Output image2",
                    "description": "output image2(optional). If input image2 is true, then the output image2 is required.",
                    "varname": "output2",
                    "shortname": "o2",
                    "required": False,
                    "extension": ".nii.gz"
                },
                {
                    "type": "image",
                    "name": "Output mask",
                    "description": "output mask(optional). If input mask is true, then the output mask is required.",
                    "varname": "output_mask",
                    "shortname": "omsk",
                    "required": False,
                    "extension": ".nii.gz"
                }
            ],
            "params": [
                {
                    "name": "Debug",
                    "description": "Toggles debug logging.",
                    "varname": "debug",
                    "type": "boolean",
                    "default": False
                },
                {
                    "name": "rotations",
                    "description": "Determines how the i,j,k-axis rotates. Example: [19, 0, 5]",
                    "varname": "rotate",
                    "shortname": "r",
                    "type": "list",
                    "default": [0, 0, 0]
                },
                {
                    "name": "scaling",
                    "description": "Determines how the i,j,k-axis scales. Example: [0.9, 1, 1]",
                    "varname": "scale",
                    "shortname": "sc",
                    "type": "list",
                    "default": [1, 1, 1]
                }
            ]
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug = self.parseBoolean(vals['debug'])
        rotations = vals['rotate']
        scalings = vals['scale']

        inp_img = self.inputs['input']

        if self.inputs['input2']:
            inp_img2 = self.inputs['input2']
        if self.inputs['input_mask']:
            inp_mask = self.inputs['input_mask']

        try:
            if self.inputs['input_mask']:
                if self.inputs['input2']:
                    img, mask, img2, sfx = rtsc.rotNsc(inp_img, inp_mask=inp_mask, inp_img2=inp_img2, \
                    rotation = rotations, scaling = scalings)
                    self.outputs['output'] = img
                    self.outputs['output2'] = img2
                    self.outputs['output_mask'] = mask

                else:
                    img, mask, sfx = rtsc.rotNsc(inp_img, inp_mask=inp_mask, \
                    rotation = rotations, scaling = scalings)
                    self.outputs['output'] = img
                    self.outputs['output_mask'] = mask
            else:
                img, sfx = rtsc.rotNsc(inp_img, rotation = rotations, scaling = scalings)
                self.outputs['output'] = img

        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm ----',e);
            return False

        return True


if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(rotateScaleImage(),sys.argv,False));
