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



#   ndaEleGen.py
#
#   Created on: August 8, 2020
#   Authors:   An Qu
#             {an.qu} <at> yale.edu
#

import os
import csv
import sys
import math
import json
import numpy as np
from copy import deepcopy as dp
import biswebpython.utilities.bidsUtils as bids_utils
import biswebpython.utilities.bidsObjects as bids_objects



def getLUTele(imgSubj, demogrC, tpl, LUT, appx):
    f_row = ['' for i in tpl]
    demogr = demogrC.data
    appx_c = appx.constant
    appx_v = appx.variable
    errorm = []
    chklist = []

    jfile = imgSubj.file_path.replace('.nii.gz', '.json')
    if not os.path.isfile(jfile):
        if imgSubj.datatype == 'anat':
            if 'ses-' in imgSubj.filename and 'run-' in imgSubj.filename:
                cname = imgSubj.filename.split('_')[3].replace('.nii.gz', '.json')
            elif 'ses-' not in imgSubj.filename and 'run-' not in imgSubj.filename:
                cname = imgSubj.filename.split('_')[1].replace('.nii.gz', '.json')
            else:
                cname = imgSubj.filename.split('_')[2].replace('.nii.gz', '.json')
            jfile = imgSubj.root + cname
        elif imgSubj.datatype == 'func':
            if 'run-' not in imgSubj.filename:
                cname = imgSubj.filename[imgSubj.filename.index('task-'):].replace('.nii.gz', '.json')
            else:
                cname = imgSubj.filename[imgSubj.filename.index('task-'):imgSubj.filename.index('run-')] + 'bold.json'
            jfile = imgSubj.root  + cname
        else:
            errorm.append(['Error: scan type of  ' + imgSubj.file_path + ' is not in coded field, therefore all the elements cannot be written.'])
            return None, errorm, []

        if not os.path.isfile(jfile):
            jfile = imgSubj.root + imgSubj.subj + '/' + imgSubj.subj + '_' + cname

            if not os.path.isfile(jfile):
                errorm.append(['Warning: cannot find the json file of : ' + imgSubj.file_path])

    if os.path.isfile(jfile):
        temp_sen = imgSubj.filename + ' ---> '+ jfile.replace(imgSubj.root, '')
        chklist.append(temp_sen)


    for ele in LUT:
        temp_var = None
        if 'ALL' in ele[1] or ele[1] in imgSubj.scan_type:

            if 'appx' in ele[3]:
                if ele[0] in appx_c:
                    if len(appx_c[ele[0]]) == 1:
                        try:
                            temp_var = appx_c[ele[0]][0]
                        except:
                            errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file! '])

                    else:
                        try:
                            keywords = appx_c[ele[0]][1::2]
                            for kw in keywords:
                                if kw in imgSubj.filename:
                                    temp_var = appx_c[ele[0]][appx_c[ele[0]].index(kw)-1]
                        except:
                            errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file! '])


                elif ele[0] in appx_v:
                    try:
                        temp_var = vars(imgSubj)[appx_v[ele[0]][0]]
                    except:
                        errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file! '])


            elif 'json' in ele[3]:
                if os.path.isfile(jfile):
                    if ele[2] == 'NULL':
                        print("The matched-element: ", ele[0], " of the subject: ", imgSubj.subj, " in the look up table is missing! Please correct it and then run again!")
                        sys.exit()

                    jdict = bids_utils.jsonread(jfile)
                    try:
                        temp_var = jdict[ele[2]]
                    except:
                        errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file! '])




            elif 'demogr' in ele[3]:
                if ele[2] == 'NULL':
                    print("The matched-element: ", ele[0], " of the subject: ", imgSubj.subj, " in the look up table is missing! Please double check!")
                    sys.exit()

                try:
                    didx = demogr[demogrkey].index(vars(imgSubj)[demogrkey])
                    res = demogr[ele[2]][didx]
# *********************************************************************************************************
                    if res != 'NA':
# *********************************************************************************************************
                        temp_var = res
                except:
                    errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file!'])

            else:
                print("Source file of the subject: ", imgSubj.subj, " element: ", ele[0], " in look up table is wrong! Please double check!")
                sys.exit()


            if temp_var == None:
                errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file!'])

            else:
                if ele[4] == 'string':
                    f_row[tpl.index(ele[0])] = str(temp_var)
                elif ele[4] == 'integer':
                    f_row[tpl.index(ele[0])] = int(temp_var)
                elif ele[4] == 'float':
                    f_row[tpl.index(ele[0])] = float(temp_var)
                else:
                    print("Data type of the subject: ", imgSubj.subj, " element:", ele[0], " in look up table is not in coded field! Please double check!")
                    sys.exit()


            if '&demogr' in ele[3]:
                demogrkey = ele[2]

    return f_row, errorm, chklist










def eleGenarator(TPL, LUT, appx, dgr, BIDS_path, debug):
    tpl = TPL.rawdata[1]
    oup_data = dp(TPL.rawdata)
    oup_elog = []
    oup_chkl = []

    for root, dirs, files in os.walk(BIDS_path, topdown=True):
        if dirs == [] and files != []:
            for file in files:
                if '.nii.gz' in file:
                    animg = bids_objects.imgSubj()
                    try:
                        r_str = root.rsplit('/', 3)
                        animg.subj = r_str[1]
                        animg.ses = r_str[2]
                        animg.datatype = r_str[3]
                    except:
                        continue

                    animg.root = BIDS_path
                    if 'sub-' in animg.ses:
                        animg.subj = animg.ses
                        animg.ses = ''
                    animg.img03_path = root.replace(BIDS_path, '') + '/' + file
                    animg.file_path = root + '/' +file
                    animg.filename = file

                    animg.basicParas()

                    f_row, errorm, chklist = getLUTele(animg, dgr, tpl, LUT, appx)

                    if f_row:
                        oup_data.append(f_row)

                    if chklist:
                        oup_chkl.append(chklist)

                    if errorm:
                        for ele in errorm:
                            oup_elog.append(ele)

                else:
                    continue

    return oup_data, oup_elog, oup_chkl
