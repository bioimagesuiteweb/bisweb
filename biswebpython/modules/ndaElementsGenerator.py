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
import biswebpython.utilities.ndaEleGen as eleGen
import biswebpython.utilities.bidsObjects as bids_objects
import biswebpython.utilities.bidsUtils as bids_utils



class ndaElementsGenerator(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='ndaElementsGenerator';

    def createDescription(self):
        return {
            "name": "ndaElementsGenerator",
            "description": "Generate the data submission template elements of NDA standard data structure",
            "author": "An Qu",
            "version": "1.0",
            "inputs": [
                {
                    "type": "bidstext",
                    "name": "Input Template File",
                    "description": "Input data submission template file of NDA standard data structure",
                    "varname": "template",
                    "shortname": "tpl",
                    "required": True,
                    "extension": ".csv"
                },
                {
                    "type": "bidslut",
                    "name": "Input Lookup Table",
                    "description": "Meta data of all the required elements in the template file",
                    "varname": "lookuptable",
                    "shortname": "lut",
                    "required": True,
                    "extension": ".txt"
                },
                {
                    "type": "bidsappx",
                    "name": "Input Appendix",
                    "description": "Meta data of some required elements in the template file",
                    "varname": "appendix",
                    "shortname": "appx",
                    "required": True,
                    "extension": ".txt"
                },
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
                    "type": "string",
                    "name": "Output Directory",
                    "description": "Output directory. Optional, saves in the parent folder of input directory if not specified.",
                    "required": False,
                    "varname": "oupath",
                    "shortname" : "o",
                    "default": ""
                },
                {
                    "type": "string",
                    "name": "Input path of bids dataset",
                    "description": "File path of BIDS format dataset",
                    "varname": "bidspath",
                    "shortname": "bp",
                    "required": True,
                    "default": ""
                }
            ]
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);
        debug=self.parseBoolean(vals['debug'])
        bidspath = vals['bidspath']
        oupath = vals['oupath']

        bidspath = bids_utils.pathChk(bidspath)
        if not oupath:
            tp = bidspath.rsplit('/', 2)
            oupath = tp[0] + '/' + tp[1] + '_biswebpy_ndaElementsGenerator/'
            if not os.path.exists(oupath):
                os.mkdir(oupath)
        else:
            oupath = bids_utils.pathChk(oupath)


        try:

            odata, elog, ochk = eleGen.eleGenarator(self.inputs['template'], self.inputs['lookuptable'].data, self.inputs['appendix'], \
            self.inputs['demographics'], bidspath, \
            debug)

        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm ----',e);
            return False

        self.outputs['outputfile'] = bids_objects.bidsText();
        self.outputs['errorlog'] = bids_objects.bidsText();
        self.outputs['checklist'] = bids_objects.bidsText();

        self.outputs['outputfile'].create(odata)
        self.outputs['errorlog'].create(elog)
        self.outputs['checklist'].create(ochk)

        self.outputs['outputfile'].save(oupath + 'data_dictionary_file.txt')
        self.outputs['errorlog'].save(oupath + 'errors.txt')
        self.outputs['checklist'].save(oupath + 'checklist.txt')


        return True



if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(ndaElementsGenerator(),sys.argv,False));
