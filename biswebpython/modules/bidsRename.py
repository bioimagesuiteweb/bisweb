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
import biswebpython.utilities.bidsRenaming as bidsRn
import biswebpython.utilities.bidsObjects as bids_objects



class bidsRename(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='bidsRename';

    def createDescription(self):
        return {
            "name": "bidsRename",
            "description": "Renaming files into bids format",
            "author": "An Qu",
            "version": "1.0",
            "inputs": [
                {
                    "type": "bidsdemogr",
                    "name": "Input Demographics file",
                    "description": "Demographics file",
                    "varname": "demographics",
                    "shortname": "dgr",
                    "required": True,
                    "extension": ".txt"
                },
                {
                    "type": "path",
                    "name": "Input file path",
                    "description": "File path of BIDS format dataset",
                    "varname": "bidspath",
                    "shortname": "bp",
                    "required": True
                }
            ],
            "outputs": [
                {
                    "type": "bidstext",
                    "name": "Output Error Log",
                    "description": "Debug logging file",
                    "varname": "errorlog",
                    "shortname": "elog",
                    "required": True,
                    "extension": ".txt"
                },
                {
                    "type": "bidstext",
                    "name": "Output Log",
                    "description": "Debug logging file",
                    "varname": "log",
                    "shortname": "log",
                    "required": True,
                    "extension": ".txt"
                },
                {
                    "type": "bidstext",
                    "name": "Output File Path",
                    "description": "Output file",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
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
            odata, elog, log = bidsRn.Rename(self.inputs['demographics'], self.inputs['bidspath'].path, \
            debug)

        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm ----',e);
            return False

        self.outputs['output'] = bids_objects.bidsText();
        self.outputs['errorlog'] = bids_objects.bidsText();
        self.outputs['log'] = bids_objects.bidsText();

        self.outputs['output'].create(odata)
        self.outputs['errorlog'].create(elog)
        self.outputs['log'].create(log)

        return True



if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(bidsRename(),sys.argv,False));
