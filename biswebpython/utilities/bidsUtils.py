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



#   bidsUtils.py
#
#   Created on: August 8, 2020
#   Authors:   An Qu
#             {an.qu} <at> yale.edu

import os
import csv
import json
from shutil import copy


def csvread(fname, bids_demogr=False, id=None):
    res = []
    if bids_demogr:
        with open(fname, 'r') as fr:
            lines_r = csv.reader(fr)
            for row in lines_r:
                res.append(row[0].split(id))

    else:
        with open(fname, 'r') as fr:
            lines_r = csv.reader(fr)
            for row in lines_r:
                res.append(row)
    return res




def csvappendaline(fname, l_str):
    with open(fname, 'a') as fw:
        f_w = csv.writer(fw, lineterminator="\n")
        f_w.writerow(l_str)





def csvappendlines(fname, l_str):
    with open(fname, 'a') as fw:
        f_w = csv.writer(fw, lineterminator="\n")
        f_w.writerows(l_str)




def csvwritelines(fname, l_str):
    with open(fname, 'w') as f:
        fWriter = csv.writer(f, lineterminator="\n")
        fWriter.writerows(l_str)





def jsonupdate(f, ele):
    with open(f, 'r+') as jf:
        jdict = json.load(jf)
        jdict.update(ele)
        jf.seek(0)
        json.dump(jdict, jf, sort_keys=True, indent=8)





def jsonread(f):
    with open(f, 'r') as jf:
        jdict = json.load(jf)
    return jdict




def img03AppxRead(fname, delimiter):
    constant = {}
    variable = {}
    APPX = csvread(fname, bids_demogr=True, id=delimiter)
    cidx = APPX.index(['#####Constant'])
    vidx = APPX.index(['#####Variable'])
    for i in range(len(APPX)):
        if i == cidx :
            dict = constant
        elif i == vidx:
            dict = variable
        else:
            if APPX[i][0] in dict.keys():
                dict[APPX[i][0]] += APPX[i][1:]
            else:
                dict[APPX[i][0]] = APPX[i][1:]
    return constant, variable



def clearFile(fileId):
    with open(fileId, 'w') as f:
        fWriter = csv.writer(f)



def cpFile(src, dst=None):
    if dst:
        copy(src, dst)

    else:
        pathnname, extension = os.path.splitext(src)
        dst = pathnname + '_copy' + extension
        copy(src, dst)

    return dst




def pathChk(inp):
    oup = os.path.abspath(inp)
    if oup[-1] == '/':
        return oup
    else:
        oup = oup + '/'
        return oup
