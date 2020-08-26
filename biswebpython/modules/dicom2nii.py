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
import biswebpython.utilities.bw_dcm2nii as d2n
import biswebpython.utilities.bidsObjects as bids_objects;



class dicom2nii(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='dicom2nii';

    def createDescription(self):
        return {
            "name": "dicom2nii",
            "description": "Convert the dicom files to nifti",
            "author": "An Qu",
            "version": "1.0",
            "inputs": [
                {
                    "type": "path",
                    "name": "DICOM File Path",
                    "description": "Path of the DICOM FILES.",
                    "varname": "dpath",
                    "shortname": "dp",
                    "required": True
                },
                {
                    "type": "path",
                    "name": "Output NIFTI File Path",
                    "description": "Path of the output NIFTI files.",
                    "varname": "npath",
                    "shortname": "np",
                    "required": True
                }
            ],
            "outputs": [
                {
                    "type": "bidstext",
                    "name": "Output Log",
                    "description": "Debug logging file",
                    "varname": "log",
                    "shortname": "l",
                    "required": True,
                    "extension": ".txt"
                }
            ],
            "params": [
                {
                    "name": "Debug",
                    "description": "Toggles debug logging. ",
                    "varname": "debug",
                    "type": "boolean",
                    "default": True
                }
            ]
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);
        debug=self.parseBoolean(vals['debug'])

        try:
            log = d2n.bw_dcm2nii(self.inputs['dpath'].path, \
            self.inputs['npath'].path, debug)

        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm ----',e);
            return False


        self.outputs['log'] = bids_objects.bidsText();
        self.outputs['log'].create(log)

        return True



if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(dicom2nii(),sys.argv,False));
