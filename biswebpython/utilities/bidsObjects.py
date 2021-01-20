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



#   bidsObjects.py
#
#   Created on: August 8, 2020
#   Authors:   An Qu
#             {an.qu} <at> yale.edu



import re
import sys
import math
import biswebpython.utilities.bidsUtils as bids_utils
import nibabel as nib
from collections import Counter
from dateutil.relativedelta import relativedelta
from datetime import date




class filePath:
    def __init__(self):
        self.path = ''

    def load(self, fname):
        try:
            self.path = fname
            return True
        except:
            return False




class bidsText:

    def __init__(self):
        self.inpname = ''
        self.oupname = ''
        self.rawdata = None


    def getFilename(self):
        return self.filename


    def getRawData(self):
        return self.rawdata


    def load(self, fname):
        try:
            self.inpname = fname
            self.rawdata = bids_utils.csvread(self.inpname)
            return True
        except:
            return False


    def create(self, data):
        self.rawdata = data


    def save(self, fname):
        self.oupname = fname
        try:
            bids_utils.csvwritelines(self.oupname, self.rawdata)
            return True
        except:
            return False






class bidsDemogr(bidsText):

    def __init__(self):
        super().__init__()
        self.taskIntpn = []
        self.keys = []
        self.data = {}
        self.fname = ''


    def getKeys(self):
        return self.keys


    def getData(self):
        return self.data


    def getTasks(self):
        return self.taskIntpn


    def getFilename(self):
        return self.fname



    def readDemogr(self):

        fc = bids_utils.csvread(self.fname, bids_demogr=True, id='---')

        if 'taskIntpn' in fc[0]:
            self.taskIntpn = fc.pop(0)[1].split( )
            self.keys = fc.pop(0)
        else:
            self.keys = fc.pop(0)

        for dky in self.keys:
            self.data[dky] = []

        for ele in fc:
            for i in range(len(self.keys)):
                try:
                    self.data[self.keys[i]].append(ele[i])
                except:
                    print("Error in demographics! Check this subject: ", ele[1], " demographics info!")
                    sys.exit()


    def load(self, fname):
        try:
            self.fname = fname
            self.readDemogr()
            return True
        except:
            return False


    def writeDemogr(self, file, data):
        bids_utils.csvwritelines(file, data)



    def get_timeInterval(self, f_str, l_str, out_str, id = 'year', debug = True):
        new_data = []
        errorm = []

        if self.data == {}:
            raise ValueError("Please read demographics data first!")
        else:
            if f_str not in self.keys:
                raise ValueError("Cannot find the key: " + f_str +  ' in the dempgraphics file!')
            elif l_str not in self.keys:
                raise ValueError("Cannot find the key: " + l_str + ' in the dempgraphics file!')
            else:
                new_data.append(['taskIntpn---' + ' '.join(self.taskIntpn)])
                if out_str not in self.keys:
                    self.data[out_str] = []
                    new_data.append(['---'.join(self.keys) + '---' + out_str])
                else:
                    new_data.append(['---'.join(self.keys)])


                for idx in range(len(self.data[l_str])):
                    res = None
                    temp = []

                    try:
                        f_dstr = self.data[f_str][idx].split('/')
                        l_dstr = self.data[l_str][idx].split('/')

                        f_date = date(int(f_dstr[2]), int(f_dstr[0]), int(f_dstr[1]))
                        l_date = date(int(l_dstr[2]), int(l_dstr[0]), int(l_dstr[1]))
                    except:
                        if debug:
                            errorm.append(['Cannot recongnize line: ' + str(idx+3) + ' string(s): ' + self.data[f_str][idx] + ' and/or ' + self.data[l_str][idx] + ' in the demographics file.'])
                            errorm.append(['Cannot get the timeInterval of the subject in this line!'])
                        continue

                    delta = relativedelta(l_date, f_date)

                    if id == 'year':
                        res = delta.years
                    elif id == 'month':
                        res = delta.years *12 + delta.months
                        if delta.days > 15:
                            res += 1
                    elif id == 'day':
                        res = (l_date - f_date).days
                    else:
                        raise ValueError("Identifier is not in coded field!")


                    interval = str(res)

                    if out_str in self.keys:
                        self.data[out_str][idx] = interval
                        for key in self.keys:
                            temp.append(self.data[key][idx])
                        new_data.append(['---'.join(temp)])
                    else:
                        for key in self.keys:
                            temp.append(self.data[key][idx])
                        temp.append(interval)
                        new_data.append(['---'.join(temp)])

        return new_data, errorm







class bidsAppx(bidsText):

    def __init__(self):
        super().__init__()
        self.filename = ''
        self.constant = {}
        self.variable = {}


    def getConstants(self):
        return self.constant


    def getVariables(self):
        return self.variable


    def getFilename(self):
        return self.filename


    def readAppx(self, delimiter = '---'):
        APPX = bids_utils.csvread(self.filename, bids_demogr=True, id=delimiter)
        cidx = APPX.index(['#####Constant'])
        vidx = APPX.index(['#####Variable'])

        for i in range(len(APPX)):
            if i == cidx :
                dict = self.constant
            elif i == vidx:
                dict = self.variable
            else:
                if APPX[i][0] in dict.keys():
                    dict[APPX[i][0]] += APPX[i][1:]
                else:
                    dict[APPX[i][0]] = APPX[i][1:]


    def load(self, fname):
        try:
            self.filename = fname
            self.readAppx()
            return True
        except:
            return False






class bidsLUT(bidsText):

    def __init__(self):
        super().__init__()
        self.filename = ''
        self.data = None


    def getData(self):
        return self.data


    def getFilename(self):
        return self.filename


    def load(self, fname):
        try:
            self.filename = fname
            self.data = bids_utils.csvread(fname, bids_demogr=True, id='---')
            return True
        except:
            return False











class bidsSubj:

    def __init__(self):
        self.filepath = ''
        self.root = ''
        self.subj = ''
        self.ses = ''
        self.datatype = ''
        self.files = []
        self.filetype = ['.nii.gz', '.json', '.tsv']
        self.MRscantype = ['T1w', 'T2w', 'FLASH']


    def splitfiles(self, type, f_l=None):
        if not f_l:
            f_l = self.files
        sf = {}
        for ft in type:
            sf[ft] = [f for f in f_l if ft in f]
        return sf


    def splitfilesbyfiletype(self):
        sf = {}
        for ft in self.filetype:
            sf[ft] = [f for f in self.files if ft in f]
        return sf


    def splitfilesbyMRscantype(self):
        sf = {}
        for ft in self.MRscantype:
            sf[ft] = [f for f in self.files if ft in f]
        return sf


    def sortfiles(self, f_l, id, cs=False):
        if cs:
            str = id.replace('?????', '(.+?)')
            s_fl = sorted(f_l,  key = lambda x: re.search(str, x).group(1))

        else:
            str = id.replace('?????', '(.+?)').lower()
            s_fl = sorted(f_l,  key = lambda x: re.search(str, x.lower()).group(1))
        return s_fl


    def get_substr(self, f, id, cs=False):
        if cs:
            str = id.replace('?????', '(.+?)')
            res = re.search(str, f).group(1)

        else:
            str = id.replace('?????', '(.+?)').lower()
            res = re.search(str, f.lower()).group(1)
        return res


    def load(self, path):
        try:
            self.filepath = path
            return True
        except:
            return False








class imgSubj:
    def __init__(self):
        self.file_path = ''
        self.filename = ''
        self.img03_path = ''
        self.root = ''
        self.subj = ''
        self.ses = ''
        self.datatype = ''
        self.file_format = ''
        self.scan_type = ''
        self.dim = ''
        self.description = ''
        self.fov = ''
        self.hdr = None
        self.dim = None
        self.Ndim = None
        self.pix = None
        self.Npix = None
        self.units = None



    def get_img_header(self):
        img = nib.load(self.file_path)
        self.hdr = img.header


    def get_dim_info(self):
        if not self.hdr:
            self.get_img_header()
        self.dim = self.hdr.get_data_shape()
        self.Ndim = len(self.dim)
        for i in range(self.Ndim):
            vars(self)['dim'+str(i+1)] = self.dim[i]


    def get_pix_info(self):
        if not self.hdr:
            self.get_img_header()
        self.pix = self.hdr.get_zooms()
        self.Npix = len(self.pix)
        for i in range(self.Npix):
            vars(self)['pix'+str(i+1)] = self.pix[i]


    def get_units(self):
        if not self.hdr:
            self.get_img_header()
        self.units = self.hdr.get_xyzt_units()
        xyzU = self.units[0]
        if xyzU == 'mm':
            vars(self)['xyz_unit'] = 'Millimeters'
        elif xyzU == 'cm':
            vars(self)['xyz_unit'] = 'Centimeters'
        elif xyzU == 'm':
            vars(self)['xyz_unit'] = 'Meters'
        else:
            vars(self)['xyz_unit'] = xyzU
            print("Warning: the full name of the xyz units are not in the coded field! Only abbreviations are written in the output file.")
            print('Image that raised the warning:', self.file_path)

        if len(self.units) > 1:
            timeU = self.units[1]
            if timeU == 'sec':
                vars(self)['time_unit'] = 'Seconds'
            elif 'ms' in timeU:
                vars(self)['time_unit'] = 'Miliseconds'
            else:
                vars(self)['time_unit'] = timeU
                print("Warning: the full name of the time units are not in the coded field! Only abbreviations are written in the output file.")
                print('Image that raised the warning:', self.file_path)


    def get_img_fov(self):
        if not self.dim:
            self.get_dim_info()
        if not self.pix:
            self.get_pix_info()

        dim_in_plane = [ele for ele, count in Counter(self.dim).items() if count > 1]
        pix_in_plane = [ele for ele, count in Counter(self.pix).items() if count > 1]

        if len(dim_in_plane) != 1 or len(pix_in_plane) != 1:
# fov calculation need to be improved--------------------------------------------------------------------------------------------------------------------------
            print('Error: calculation of image fov is not in coded field! Please remove fov element from the look up table & appendix and run the code again.')
            print('Image that raised the error:', self.file_path)
            print('Error: input fov element manually!')
            sys.exit()
        else:
            length = math.ceil(dim_in_plane[0] * pix_in_plane[0])
            self.fov = str(length) + 'x' + str(length) + self.units[0] + '^2'


    def get_scan_type(self):
        if self.datatype == 'anat':
            if 't1w' in self.filename.lower():
                self.scan_type = 'MR structural (T1)'
            elif 'mprage' in self.filename.lower():
                self.scan_type = 'MR structural (MPRAGE)'
            elif 't2' in self.filename.lower():
                self.scan_type = 'MR structural (T2)'
            elif 'flash' in self.filename.lower():
                self.scan_type = 'MR structural (FLASH)'
            elif 'fspgr' in self.filename.lower():
                self.scan_type = 'MR structural (FSPGR)'
            elif 'fisp' in self.filename.lower():
                self.scan_type = 'MR structural (FISP)'
            elif 'tse' in self.filename.lower():
                self.scan_type = 'MR structural (TSE)'
            elif 'mpnrage' in self.filename.lower():
                self.scan_type = 'MR structural (MPnRAGE)'
            else:
                self.scan_type = 'MR structural'

        elif self.datatype == 'func':
            self.scan_type = 'fMRI'

        elif self.datatype == 'dwi':
            self.scan_type = 'MR diffusion'

        else:
            print('Error: the scan_type of ', self.datatype , ' files is not in coded field! Please remove scan_type element from the look up table & appendix and run the code again.')
            print('Image that raised the error:', self.file_path)
            print('Error: input scan_type element manually!')
            sys.exit()


    def get_file_format(self):
        if '.nii.gz' in self.filename.lower():
            self.file_format = 'NIFTI'
        else:
            print('Error: the image_file_format is not in coded field! Please remove image_file_format element from the look up table & appendix and run the code again.')
            print('Image that raised the error:', self.file_path)
            print('Error: input image_file_format element manually!')
            sys.exit()

    def get_img_description(self):
        if 't1w' in self.filename.lower():
            self.description = 'T1w'
        elif 'flash' in self.filename.lower():
            self.description = 'FLASH'
        elif 't2w' in self.filename.lower():
            self.description = 'T2w'
        elif '_bold' in self.filename.lower():
            self.description = 'fMRI'
        else:
            print('Error: the image_description is not in coded field! Please remove image_description element from the look up table & appendix and run the code again.')
            print('Image that raised the error:', self.file_path)
            print('Error: input image_description element manually!')
            sys.exit()


    def basicParas(self):
        self.get_file_format()
        self.get_scan_type()
        self.get_img_description()
        self.get_units()
        self.get_dim_info()
        self.get_pix_info()
        self.get_img_fov()
