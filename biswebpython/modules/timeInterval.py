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
import biswebpython.utilities.dgrTimeInterval as dgrti;
import biswebpython.utilities.bidsUtils as bids_utils;
import biswebpython.utilities.bidsObjects as bids_objects;



class timeInterval(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='timeInterval';

    def createDescription(self):
        return {
            "name": "timeInterval",
            "description": "Calculate the time interval of two given dates",
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
                    "name": "start date",
                    "description": "Keyword indicates the start dates in the demographics.",
                    "varname": "startdate",
                    "shortname": "sd",
                    "type": "string",
                    "default": "bday"
                },
                {
                    "name": "end date",
                    "description": "Keyword indicates the end dates in the demographics.",
                    "varname": "enddate",
                    "shortname": "ed",
                    "type": "string",
                    "default": "tday"
                },
                {
                    "name": "output key",
                    "description": "Keyword indicates indicates where the outputs saved in the demographics. If the keyword is already existed in the demographics, all of its value will be reaplced by the outputs. If it is not existed in the demographics, this keyword will be added and the outputs will be saved under it.",
                    "varname": "outputkey",
                    "shortname": "oupk",
                    "type": "string",
                    "default": "age"
                },
                {
                    "name": "identifier",
                    "description": "what kind of time interval you want to calculate. Default fields: year, month, day",
                    "varname": "identifier",
                    "shortname": "id",
                    "type": "string",
                    "default": "month",
                    "fields": ["year", "month", "day"]
                },
                {
                    "type": "string",
                    "name": "Output Path",
                    "description": "Output Path. Optional, will save in the same folder as input demographic file if not specified.",
                    "varname": "oupath",
                    "shortname": "o",
                    "required": True,
                    "default": ""
                }

            ]
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);
        debug=self.parseBoolean(vals['debug'])
        oupath = vals['oupath']
        if oupath:
            oupath = bids_utils.pathChk(oupath)
            oup_f = oupath + 'new_demogr_file.txt'
            oup_l = oupath + 'new_demogr_file_error.txt'
        else:
            oup_f = self.inputs['demographics'].getFilename().replace(".txt", "_biswebpy_timeInterval.txt")
            oup_l = self.inputs['demographics'].getFilename().replace(".txt", "_biswebpy_timeInterval_error.txt")
        try:
            odata, elog = dgrti.demogrTimeInterval(self.inputs['demographics'], \
            vals['startdate'], vals['enddate'], vals['outputkey'], vals['identifier'], debug)

        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm ----',e);
            return False


        self.outputs['output'] = bids_objects.bidsText();
        self.outputs['errorlog'] = bids_objects.bidsText();

        self.outputs['output'].create(odata)
        self.outputs['errorlog'].create(elog)

        self.outputs['output'].save(oup_f)
        self.outputs['errorlog'].save(oup_l)

        return True



if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(timeInterval(),sys.argv,False));
