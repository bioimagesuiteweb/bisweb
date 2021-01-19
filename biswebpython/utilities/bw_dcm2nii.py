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



#   bw_dcm2nii.py
#
#   Created on: August 25, 2020
#   Authors:   An Qu
#             {an.qu} <at> yale.edu
#

import os
import biswebpython.utilities.bidsUtils as bids_utils
import biswebpython.utilities.bidsObjects as bids_objects



def ifComplete(path, N):
    fs = os.listdir(path)
    nii = [ele for ele in fs if '.nii.gz' in ele]
    if len(nii) == N:
        return True
    else:
        return False




def bw_dcm2nii(dcm_path, oup_path, debug):
    logm = []

    for root, dirs, files in os.walk(dcm_path, topdown=True):

        print('___ Parsing directory',root)
        cmd = ''
        ok = None
        bids_sbj = bids_objects.bidsSubj()
        try:
            r_str = root.rsplit('/', 3)
            bids_sbj.subj = r_str[1]
            bids_sbj.ses = r_str[2]
            bids_sbj.datatype = r_str[3]
        except:
            continue

        bids_sbj.root = root
        bids_sbj.files = files
        if 'anat' == bids_sbj.datatype or 'func' == bids_sbj.datatype:

            if 'sub-' in bids_sbj.ses:
                bids_sbj.subj = bids_sbj.ses
                bids_sbj.ses = ''
                tmps = ''
            else:
                tmps = '/'

            oup_sbj = oup_path + bids_sbj.subj
            oup_ses = oup_path + bids_sbj.subj + tmps + bids_sbj.ses
            if not os.path.exists(oup_sbj):
                os.mkdir(oup_sbj)
            if not os.path.exists(oup_ses):
                os.mkdir(oup_ses)

            if not os.path.exists(oup_ses + '/' + bids_sbj.datatype):
                os.mkdir(oup_ses + '/' + bids_sbj.datatype)
                cmd = 'biswebnode dicomconversion  -i ' + bids_sbj.root + ' -o ' + oup_ses + '/' + bids_sbj.datatype
                print('\t\t Executing ',cmd);
                os.system(cmd)
                ok = ifComplete(oup_ses + '/' + bids_sbj.datatype + '/', len(dirs))
                if not ok:
                    logm.append([bids_sbj.subj + '   ' + bids_sbj.ses + '   ' + bids_sbj.datatype + '   Failed!'])
                else:
                    logm.append([bids_sbj.subj + '   ' + bids_sbj.ses + '   ' + bids_sbj.datatype + '   Completed!'])

            else:
                ok = ifComplete(oup_ses + '/' + bids_sbj.datatype + '/', len(dirs))
                if not ok:
                    cmd = 'biswebnode dicomconversion -i ' + bids_sbj.root + ' -o ' + oup_ses + '/' + bids_sbj.datatype
                    os.system(cmd)
                    ok = ifComplete(oup_ses + '/' + bids_sbj.datatype + '/', len(dirs))
                    if not ok:
                        logm.append([bids_sbj.subj + '   ' + bids_sbj.ses + '   ' + bids_sbj.datatype + '   Failed!'])
                    else:
                        logm.append([bids_sbj.subj + '   ' + bids_sbj.ses + '   ' + bids_sbj.datatype + '   Completed!'])
                else:
                    logm.append([bids_sbj.subj + '   ' + bids_sbj.ses + '   ' + bids_sbj.datatype + '   Completed!'])
        else:
            print('___\t nothing to do')
    return logm
