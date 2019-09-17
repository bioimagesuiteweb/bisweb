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


def getOptimizationCode(name="ConjugateGradient"):

    name=name.lower();
    if (name == "hillclimb"):
        return 0;
    if (name == "gradientdescent"):
        return 1;
    return 2;

def getMetricCode(name="NMI"):

    name = name.upper();

    if (name == "SSD"):
        return 0;

    if (name == "CC"):
        return 1;

    if (name == "MI"):
        return 2;

    return 3;

def getLinearModeCode(name="Rigid"):

    name = name.lower();
    if (name == "similarity"):
        return 1;
    if (name == "affine9"):
        return 2;
    if (name == "affine"):
        return 3;
    if (name == "none"):
        return -1;
    return 0;



def resliceRegistrationOutput(libbis, reference, target, transform):

    spa = reference.spacing;
    dim = reference.dimensions;
    return libbis.resliceImageWASM(
	target, transform, {
	    "spacing": [spa[0], spa[1], spa[2]],
	    "dimensions": [dim[0], dim[1], dim[2]],
	    "interpolation": 1
	},0);

def getModuleDescriptionFromFile(classname):

    try:
        import biswebpython.lib.bismodules_desc as bismodules_desc;
    except ImportError:
        my_path=os.path.dirname(os.path.realpath(__file__));
        n=my_path+'/../../build/native';
        l=sys.path;
        if (n not in l):
            sys.path.append(n);

        n=my_path+'/../build/native';
        l=sys.path;
        if (n not in l):
            sys.path.append(n);

        import bismodules_desc;
            
    return bismodules_desc.descriptions[classname];

def getDynamicLibraryWrapper():
    
    try:
        import biswebpython.lib.biswrapper as libbis;
    except ImportError:
        my_path=os.path.dirname(os.path.realpath(__file__));
        n=my_path+'/../../build/native';
        l=sys.path;
        if (n not in l):
            sys.path.append(n);
        import biswrapper as libbis;
            
            
    return libbis;

def downloadIfNeeded(fname,basedir,tempdir):

    inputname=basedir+fname;
    sname=inputname;
    import wget;
    if (inputname.startswith('http')):

        f=fname.replace('://','__');
        f=f.replace('/','_');
        sname=os.path.abspath(tempdir+'/'+f);
        print('.... Downloading ',inputname,': ');
        wget.download(inputname,sname);
        print('\n');
    elif (len(basedir)>0):
        print('.... remapping ',fname,'to',sname);

    return sname;
        
