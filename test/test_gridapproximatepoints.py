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

np.set_printoptions(precision=3)
np.set_printoptions(suppress=True)

my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.insert(0,os.path.abspath(my_path+'/../'));
sys.path.insert(0,os.path.abspath(my_path+'/../biswebpython/modules'));

from biswebpython.core.bis_objects import *
import biswebpython.core.bis_baseutils as bis_baseutils;

libbis=bis_baseutils.getDynamicLibraryWrapper();


fname=my_path+'/../test/testdata/pointlocator/brain.json';
file1=open(fname); text1=file1.read(); brain=json.loads(text1); file1.close();
arr=np.asarray(brain['points'],dtype=np.float32);
print(arr.shape);
l=arr.shape[0];
rows=int(l/3);
cols=3
points=np.reshape(arr,[ rows,cols ]);

m_points=np.ones([rows,cols+1],dtype=np.float32);
print('Size=',points.shape);
print('Size=',m_points.shape);
m_points[:,0:3]=points[:,0:3]

print('____________________________________________________');
print('Num points= ',rows, ' file=',fname);
print("Points 0 & 2 = ",points[0,:], points[2,:])
print("MPoints 0 & 2 = ",m_points[0,:], m_points[2,:])

print('____________________________________________________');


in_matrix = [
    [  0.9380000000000001,  0.38,  0,  -25.44 ],
    [  -0.34600000000000003,  1.032,  0,  27.6 ],
    [  0,  0,  1,  0 ],
    [  0,  0,  0,  1 ]
]

matrix= np.zeros([4,4],dtype=np.float32)
for row in range(0,4):
    for col in range(0,4):
        matrix[row][col]=in_matrix[row][col];
print('Matrix ',matrix)
        
print('____________________________________________________');

t_points=np.transpose(m_points);


class TestPointLocator(unittest.TestCase):

    def test_fit(self):

        print('Matrices=',matrix.shape,t_points.shape);
            
        warped=np.transpose(np.matmul(matrix,t_points))[:,0:3]

        print('In points=', points[0][:], points[4][:]);
        print('In points=', warped[0][:], warped[4][:]);

        d=points-warped;     d=d*d;       e1=np.sum(d,axis=1);   e1=np.sum(np.sqrt(e1))/rows
        print('___ Initial Error=',e1);

        out=libbis.test_landmarkApproximationWASM(points,warped,
                                                  {
                                                      'steps' : 4,
                                                      'stepsize' : 1.0,
                                                      'spacing' : 10,
                                                      'lambda' : 0.1                                                      
                                                  },1);

        
        d=out-warped;     d=d*d;       e2=np.sum(d,axis=1);   e2=np.sum(np.sqrt(e2))/rows
        print('___ Final Error=',e2, ' vs initial=',e1);

        passed=False;
        if (e2<0.1*e1):
            passed=True;
        
        
        self.assertEqual(passed,True);
        
        
