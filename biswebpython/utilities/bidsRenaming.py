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



#   bidsRenaming.py
#
#   Created on: August 8, 2020
#   Authors:   An Qu
#             {an.qu} <at> yale.edu
#

import os
import re
import csv
import sys
import json
from collections import Counter
import biswebpython.utilities.bidsUtils as bids_utils
import biswebpython.utilities.bidsObjects as bids_objects



# bids_path= '/home/an/work/MRRC_working_scripts/dataManagement/bids'
# image03_demogr= '/home/an/work/MRRC_working_scripts/dataManagement/scripts/image03_demographics_temp.txt'
# error_log = '/home/an/work/MRRC_working_scripts/dataManagement/scripts/bids_errors.txt'
# log = '/home/an/work/MRRC_working_scripts/dataManagement/scripts/bids_logs.txt'
# cmd = '/home/an/work/MRRC_working_scripts/dataManagement/scripts/bids_cmd.txt'





def anatBidsRename(bsj):
    xx = '_'
    if 'sub-' in bsj.ses.lower():
        bsj.subj = bsj.ses
        bsj.ses = ''
        xx = ''

    errorm = []
    logm = []
    flag = True
    temp_cmd = []


    splt_f = bsj.splitfiles(bsj.filetype)


    if not splt_f['.nii.gz']:
        errorm.append(['Error: ' + bsj.subj + ' anat folder does not have nifti image. Or .nii images have not been zipped. Please zip all the files to .nii.gz before renaming.'])
        flag = False
    elif splt_f['.json'] and len(splt_f['.json']) != len(splt_f['.nii.gz']):
        errorm.append(['Warning: check ' + bsj.subj + ' anat folder in order to make sure its nifti images and json files matched!'])
        errorm.append(['Error: all the files in ' + bsj.subj + ' anat folder are not able to be renamed!'])
        flag = False
    else:
# -------------------------------------------------------------------------------------------------------------------------------------------------------
# -------------------------------------------------------------------------------------------------------------------------------------------------------
        splt_nii = {}
        splt_nii['T1w'] = [file for file in splt_f['.nii.gz'] if 'mprage' in file.lower() or 't1w' in file.lower()]
        splt_nii['T2w'] = [file for file in splt_f['.nii.gz'] if 't2w' in file.lower() or 'space' in file.lower() ]
        splt_nii['FLASH'] = [file for file in splt_f['.nii.gz'] if 'flash' in file.lower()]

        n_miss_nii = abs(len(splt_f['.nii.gz']) - sum(len(v) for v in splt_nii.values()))
        if n_miss_nii:
            errorm.append(['Error: ' + str(n_miss_nii) + ' nifti file(s) scan type in ' + bsj.subj + ' anat folder is not in coded field, therefore is not able to renamed! Please double check the filename spelling!'])
            flag = False
# -------------------------------------------------------------------------------------------------------------------------------------------------------
# -------------------------------------------------------------------------------------------------------------------------------------------------------
        for st in bsj.scantype:
            newname = ''
            s_nii=[]
            if len(splt_nii[st]) > 1:
# T1W, Unkonw need to be coded-------------------------------------------------------------------------------------------------------------------------------------------------------
# -------------------------------------------------------------------------------------------------------------------------------------------------------
                # if st == 'T1w':
                #     id = 'mprage_?????_defaced'
# -------------------------------------------------------------------------------------------------------------------------------------------------------
# -------------------------------------------------------------------------------------------------------------------------------------------------------

                # else:
                #     id = st.lower() + '_?????_defaced'
                try:
                    # s_nii = bsj.sortfiles(splt_nii[st], id)
                    s_nii = bsj.sortfiles(splt_nii[st], '_run-?????_')

                    for idx in range(len(s_nii)):
                        run_idx = idx + 1
                        newname = bsj.subj + xx + bsj.ses + '_run-' + str(run_idx).zfill(2) + '_' + st + '.nii.gz'
                        temp_cmd.append(['mv ' + bsj.root + '/' + s_nii[idx] + ' ' + bsj.root + '/' + newname])
                except:
                    errorm.append(['Error: Cannot recongnize ' + bsj.subj + ' ' + st + ' nifti file and it is not able to be renamed! Please double check the spelling!'])
                    flag = False
            elif len(splt_nii[st]) == 1:
                newname = bsj.subj + xx + bsj.ses + '_' + st + '.nii.gz'
                temp_cmd.append(['mv ' + bsj.root + '/' + splt_nii[st][0] + ' ' + bsj.root + '/' + newname])



        if splt_f['.json']:
            for jfile in splt_f['.json']:
                try:
                    run_num = bsj.get_substr(jfile, '_run-?????_')
                    bids_utils.jsonupdate(bsj.root + '/' + jfile, {'run_number': run_num})
                except:
                    errorm.append(['ERROR: cannot update'+ bsj.root+ '/'+ jfile+ ' with its run number! Please double check the filename and the metadata content!'])
                    flag = False

# -------------------------------------------------------------------------------------------------------------------------------------------------------
# -------------------------------------------------------------------------------------------------------------------------------------------------------
            splt_jf = {}
            splt_jf['T1w'] = [file for file in splt_f['.json'] if 'mprage' in file.lower() or 't1w' in file.lower()]
            splt_jf['T2w'] = [file for file in splt_f['.json'] if 'space' in file.lower() or 't2w' in file.lower()]
            splt_jf['FLASH'] = [file for file in splt_f['.json'] if 'flash' in file.lower()]

            n_miss_jf = abs(len(splt_f['.json']) - sum(len(v) for v in splt_jf.values()))
            if n_miss_jf:
                errorm.append(['Error: ' + str(n_miss_jf) + ' json file(s) scan type in ' + bsj.subj + ' anat folder is not in coded field, therefore is not able to renamed! Please double check the filename spelling!'])
                flag = False
# -------------------------------------------------------------------------------------------------------------------------------------------------------
# -------------------------------------------------------------------------------------------------------------------------------------------------------

            for st in bsj.scantype:
                newname = ''
                s_jf=[]
                if len(splt_nii[st]) > 1:
                    try:
                        s_jf = bsj.sortfiles(splt_jf[st], '_run-?????_')

                        for idx in range(len(s_jf)):
                            run_idx = idx + 1
                            newname = bsj.subj + xx + bsj.ses + '_run-' + str(run_idx).zfill(2) + '_' + st + '.json'
                            temp_cmd.append(['mv ' + bsj.root + '/' + s_jf[idx] + ' ' + bsj.root + '/' + newname])
                    except:
                        errorm.append(['Error: Cannot recongnize ' + bsj.subj + ' ' + st + ' json file and it is not able to be renamed! Please double check the spelling!'])
                        flag = False
                elif len(splt_nii[st]) == 1:
                    newname = bsj.subj + xx + bsj.ses + '_' + st + '.json'
                    temp_cmd.append(['mv ' + bsj.root + '/' + splt_jf[st][0] + ' ' + bsj.root + '/' + newname])

    if flag:
        logm = ['ANAT Completed!']

    return temp_cmd, logm, errorm







def funcBidsRename(bsj, bidsDgr):
    xx = '_'
    if 'sub-' in bsj.ses.lower():
        bsj.subj = bsj.ses
        bsj.ses = ''
        xx = ''


    errorm = []
    logm = []
    ord = []
    cmd_temp = []
    flag = True
    demogr = bidsDgr.data
    tskrg = range(0, len(bidsDgr.taskIntpn))

    try:
        ord = demogr['taskOrder'][demogr['subj'].index(bsj.subj)]
    except:
        errorm.append(['Error: Can not find ' + bsj.subj + ' task order info in demographics! All the files in its func folder are not able to be renamed!'])
        flag = False

    if ord == 'NA':
        errorm.append(['Error: Can not find ' + bsj.subj + ' task order info in demographics! All the files in its func folder are not able to be renamed!'])
        flag = False

    if ord and ord != 'NA':
        s_files = []
        try:
            s_files = bsj.sortfiles(bsj.files, '_run-?????_')
        except:
            errorm.append(['Error: There are run number(s) of the file(s) in '+ bsj.subj + ' func folder wrong! Please double check!'])
            errorm.append(['Error: all the files in ' + bsj.subj + ' func folder are not able to be renamed!'])
            flag = False

        if s_files:
            splt_f = bsj.splitfiles(bsj.filetype, f_l = s_files)

            if not splt_f['.nii.gz']:
                errorm.append(['Error: ' + bsj.subj + ' func folder does not have nifti image. Or .nii images have not been zipped. Please zip all the files to .nii.gz before renaming.'])
                flag = False

            elif (splt_f['.json'] and len(splt_f['.json']) != len(splt_f['.nii.gz'])) or (splt_f['.tsv'] and len(splt_f['.tsv']) != len(splt_f['.nii.gz'])):
                errorm.append(['Warning: check ' + bsj.subj + ' func folder in order to make sure its nifti images, json files / tsv files matched!'])
                errorm.append(['Error: all the files in ' + bsj.subj + ' func folder are not able to be renamed!'])
                flag = False
            else:

                N = len(splt_f['.nii.gz'])

                ordl = ord.split( )
                # if N != len(ordl) + 2:
                if N != len(ordl):
                    errorm.append(['Error: taskOrder of ' + bsj.subj + ' in demographics does not match the files in its func folder, and all the func images are not able to be renamed!'])
                    flag = False

                else:
                    tskrn = {}
                    tskrp = Counter(ordl)
                    for idx in range(N):
                        nfile = splt_f['.nii.gz'][idx]
                        newname = ''
                        taskn = ''

                        if int(ordl[idx]) not in tskrg:
                            cmd_temp.append(['rm ' + bsj.root + '/' + nfile])
                        elif tskrp[ordl[idx]] == 1:
                            taskn = bidsDgr.taskIntpn[int(ordl[idx])]
                            newname = bsj.subj + xx + bsj.ses + '_task-' + taskn + '_bold.nii.gz'
                        else:
                            taskn = bidsDgr.taskIntpn[int(ordl[idx])]
                            if ordl.index(ordl[idx]) == idx:
                                tskrn[ordl[idx]] = 1
                            else:
                                tskrn[ordl[idx]] += 1
                            newname = bsj.subj + xx + bsj.ses + '_task-' + taskn + '_run-' + str(tskrn[ordl[idx]]).zfill(2) + '_bold.nii.gz'

                        if newname:
                            cmd_temp.append(['mv ' + bsj.root + '/' + nfile + ' ' + bsj.root + '/' + newname])


                        for ft in bsj.filetype:
                            if splt_f[ft] and ft != '.nii.gz':
                                jfile = nfile.replace('.nii.gz', ft)
                                if not newname:
                                    cmd_temp.append(['rm ' + bsj.root + '/' + nfile.replace('.nii.gz', ft)])
                                else:
                                    cmd_temp.append(['mv ' + bsj.root + '/' + nfile.replace('.nii.gz', ft) + ' ' + bsj.root + '/' + newname.replace('.nii.gz', ft)])

                                if ft == '.json':
                                    try:
                                        run_num = bsj.get_substr(jfile, '_run-?????_')
                                        bids_utils.jsonupdate(bsj.root + '/' + jfile, {'run_number': run_num})
                                    except:
                                        errorm.append(['ERROR: cannot update'+ bsj.root+ '/'+ jfile+ ' with its run number! Please double check the filename and the metadata content!'])
                                        flag = False
    if flag:
        logm = ['FUNC Completed!']

    return cmd_temp, logm, errorm







def Rename(dgr, bids_path, debug = True):

    logm = []
    cmdm = []
    elogm = []


    for root, dirs, files in os.walk(bids_path, topdown=True):

        bids_sbj = bids_objects.bidsSubj()
        r_str = root.rsplit('/', 3)
        bids_sbj.subj = r_str[1]
        bids_sbj.ses = r_str[2]
        bids_sbj.datatype = r_str[3]
        bids_sbj.root = root
        bids_sbj.files = files

        if 'anat' in  dirs or 'func' in dirs:
            logm.append(['--------'+ bids_sbj.ses +'--------'])

        if 'anat' == bids_sbj.datatype:

            cmds, logs, errors = anatBidsRename(bids_sbj)
            logm.append(logs)

            if cmds != []:
                for ele1 in cmds:
                    cmdm.append(ele1)
            if errors != []:
                for ele2 in errors:
                    elogm.append(ele2)


        if 'func' == bids_sbj.datatype:

            cmds, logs, errors = funcBidsRename(bids_sbj, dgr)
            logm.append(logs)

            if cmds != []:
                for ele1 in cmds:
                    cmdm.append(ele1)
            if errors != []:
                for ele2 in errors:
                    elogm.append(ele2)


    return cmdm, elogm, logm
