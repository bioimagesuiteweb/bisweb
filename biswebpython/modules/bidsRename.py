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


import os
import sys
try:
    import bisweb_path;
except ImportError:
    bisweb_path=0;

import biswebpython.core.bis_basemodule as bis_basemodule;
import biswebpython.core.bis_objects as bis_objects;
import biswebpython.utilities.bidsRenaming as bidsRn
import biswebpython.utilities.bidsObjects as bids_objects
import biswebpython.utilities.bidsUtils as bids_utils



class bidsRename(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='bidsRename';

    def createDescription(self):
        return {
            "name": "bidsRename",
            "description": "Renaming files into bids format",
            "author": "An Qu",
            "version": "2.0",
            "inputs": [
                {
                    "type": "bidsdemogr",
                    "name": "Input Demographics file",
                    "description": "Demographics file",
                    "varname": "demographics",
                    "shortname": "dgr",
                    "required": True,
                    "extension": ".txt"
                }
            ],
            "outputs": [
            ],
            "params": [
                {
                    "name": "Debug",
                    "description": "Toggles debug logging. ",
                    "varname": "debug",
                    "type": "boolean",
                    "default": True
                },
                {
                    "name": "Execute",
                    "description": "Whether or not to create a new dataset that is orgnized in bids format.",
                    "varname": "execute",
                    "required": False,
                    "shortname": "exe",
                    "type": "boolean",
                    "default": False
                },
                {
                    "type": "string",
                    "name": "Output Directory",
                    "description": "Output directory for the BIDS dataset. Optional, saves in the parent folder of input directory if not specified.",
                    "required": False,
                    "varname": "oupath",
                    "shortname" : "o",
                    "default": ""
                },
                {
                    "type": "string",
                    "name": "Input Directory",
                    "description": "Input File path",
                    "required": True,
                    "varname": "inpath",
                    "shortname": "i",
                    "default": ""
                }
            ]
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);
        debug = self.parseBoolean(vals['debug'])
        exe = self.parseBoolean(vals['execute'])
        inpath = vals['inpath']
        oupath = vals['oupath']

        inpath = bids_utils.pathChk(inpath)
        if not oupath:
            tp = inpath.rsplit('/', 2)
            oupath = tp[0] + '/' + tp[1] + '_biswebpy_bidsRename/'
            if not os.path.exists(oupath):
                os.mkdir(oupath)
            else:
                print ('Output directory: ', oupath, ' already exists. Please move/delete that directory in advance to avoid conflicts.')
                sys.exit(0)
        else:
            oupath = bids_utils.pathChk(oupath)


        try:
            odata, elog, log = bidsRn.Rename(self.inputs['demographics'], inpath, oupath, \
            exe, debug)

        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm ----',e);
            return False


        self.outputs['ren_lut'] = bids_objects.bidsText();
        self.outputs['errorlog'] = bids_objects.bidsText();
        self.outputs['log'] = bids_objects.bidsText();

        self.outputs['ren_lut'].create(odata)
        self.outputs['errorlog'].create(elog)
        self.outputs['log'].create(log)

        self.outputs['ren_lut'].save(oupath  + 'checklist.txt')
        self.outputs['errorlog'].save(oupath + 'errorlog.txt')
        self.outputs['log'].save(oupath + 'log.txt')

        return True



if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(bidsRename(),sys.argv,False));
