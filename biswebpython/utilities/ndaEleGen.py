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

    for ele in LUT:
        temp_var = None
        if 'ALL' in ele[1] or imgSubj.scan_type in ele[1]:

            jfile = imgSubj.file_path.replace('.nii.gz', '.json')
            if not os.path.exists(jfile):
                if imgSubj.datatype == 'anat':
                    cname = imgSubj.filename.split('_')[2].replace('.nii.gz', '.json')
                    jfile = imgSubj.root + '/' + cname
                elif imgSubj.datatype == 'func':
                    cname = imgSubj.filename[imgSubj.filename.index('task-'):].replace('.nii.gz', '.json')
                    jfile = imgSubj.root + '/' + cname
                else:
                    errorm.append(['Not able to write all the required elements of : ' + imgSubj.file_path + ' to the output file as its scan_type is not in coded field.'])
                    return None, errorm

                if not os.path.exists(jfile):
                    jfile = imgSubj.root + '/' + imgSubj.subj + '/' + imgSubj.subj + '_' + cname

                    if not os.path.exists(jfile):
                        errorm.append(['Not able to write all the required elements of : ' + imgSubj.file_path + ' to the output file as its json file cannot be found.'])
                        return None, errorm






            if 'appx' in ele[3]:
                if ele[0] in appx_c:
                    if len(appx_c[ele[0]]) == 1:
                        try:
                            temp_var = appx_c[ele[0]][0]
                        except:
                            errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file! '])

                    else:
                        try:
                            temp_var = appx_c[ele[0]][appx_c[ele[0]].index(imgSubj.description)-1]
                        except:
                            errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file! '])


                elif ele[0] in appx_v:
                    try:
                        temp_var = vars(imgSubj)[appx_v[ele[0]][0]]
                    except:
                        errorm.append(['Failed to write element: ' + ele[0] + ' of the file: ' + imgSubj.file_path + ' into the output file! '])


            elif 'json' in ele[3]:
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
                print("Finding-source of the subject: ", imgSubj.subj, " element: ", ele[0], " in look up table is wrong! Please double check!")
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

    return f_row, errorm










def eleGenarator(TPL, LUT, appx, dgr, BIDS_path, debug):
    # tpl_cp = cpFile(image03_tpl, output)
    #
    # clearFile(error_log)
    #
    # try:
    #     dgr = bidsDemogr()
    #     dgr.read(image03_demogr)
    # except:
    #     print ("Error: cannot read demographics file!")
    #     sys.exit()
    #
    # try:
    #     tpl = csvread(tpl_cp)[1]
    # except:
    #     print("Error: cannot read template file!")
    #     sys.exit()
    #
    # try:
    #     LUT = csvread(image03_LUT, bids_demogr=True, id='---')
    # except:
    #     print("Error: cannot read look up table!")
    #     sys.exit()
    #
    # try:
    #     constants, variables = img03AppxRead(image03_appx, '---')
    # except:
    #     print("Error: cannot read appendix file!")
    #     sys.exit()



    tpl = TPL.rawdata[1]
    oup_data = dp(TPL.rawdata)
    oup_elog = []

    for root, dirs, files in os.walk(BIDS_path, topdown=True):
        if dirs == [] and files != []:
            for file in files:
                if '.nii.gz' in file:
                    animg = bids_objects.imgSubj()
                    r_str = root.rsplit('/', 3)
                    animg.root = r_str[0]
                    animg.subj = r_str[1]
                    animg.ses = r_str[2]
                    animg.datatype = r_str[3]
                    animg.img03_path = root.replace(BIDS_path, '') + '/' + file
                    animg.file_path = root + '/' +file
                    animg.filename = file

                    animg.basicParas()

                    f_row, errorm = getLUTele(animg, dgr, tpl, LUT, appx)

                    if f_row:
                        oup_data.append(f_row)
                    if errorm:
                        oup_elog.append(errorm[0])

                    # if bool(f_row):
                    #     csvappendaline(tpl_cp, f_row)
                    # if bool(errorm):
                    #     csvappendlines(error_log, errorm)

                else:
                    continue

    return oup_data, oup_elog
