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
import numpy as np
import unittest
import tempfile
import json
import math

my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.insert(0,os.path.abspath(my_path+'/../'));
sys.path.insert(0,os.path.abspath(my_path+'/../biswebpython/modules'));

from biswebpython.core.bis_objects import *
import biswebpython.core.bis_baseutils as bis_baseutils;

libbis=bis_baseutils.getDynamicLibraryWrapper();


fname1=my_path+'/../test/testdata/pointlocator/brain.json';


print('____________________________________________________');
file1=open(fname1); text1=file1.read(); brain=json.loads(text1); file1.close();

arr=np.asarray(brain['points'],dtype=np.float32);
print(arr.shape);
l=arr.shape[0];
rows=int(l/3);
cols=3

points=np.reshape(arr,[ rows,cols ]);

arr=np.asarray(brain['triangles'],dtype=np.int32);
print(arr.shape);
l=arr.shape[0];
rows=int(l/3);
cols=3
triangles=np.reshape(arr,[ rows,cols ]);

print('____________________________________________________');
print('Num points= ',points.shape,triangles.shape, ' file=',fname1);
print('____________________________________________________');

class TestPointLocator(unittest.TestCase):

    def test_surface(self):
        sur=bisSurface();
        sur.create(points,triangles);
        print('Description=',sur.getDescription());
        print('______________________');
        print('WASM');
        
        bt=sur.serializeWasm();
        print('Size=',len(bt));
        
        sur2=bisSurface();
        sur2.deserializeWasm(bt,0);
        print('Description=',sur2.getDescription());

        print('______________________');
        self.assertEqual(True,True);
