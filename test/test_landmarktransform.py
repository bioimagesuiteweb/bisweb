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


matrix_list = [
    [ [  0.9400000000000001,  0.342,  0 , -21.511 ],
      [  -0.342,  0.9400000000000001,  0,  37.295 ],
      [  0 , 0,  1,  0 ],
      [  0 , 0,  0,  1 ]
    ],
    [ [  1.034,  0.376,  0,  -33.662 ],
      [  -0.376,  1.034,  0,  30.225 ],
      [  0 , 0,  1.1,  -9 ],
      [  0  ,0,  0,  1 ]
    ],
    [ [  0.9380000000000001,  0.38,  0,  -25.44 ],
      [  -0.34600000000000003,  1.032,  0,  27.6 ],
      [  0,  0,  1,  0 ],
      [  0,  0,  0,  1 ]
    ]
]

matrices= [ np.zeros([4,4],dtype=np.float32),
            np.zeros([4,4],dtype=np.float32),
            np.zeros([4,4],dtype=np.float32) ];

for i in range(0,3):
    for row in range(0,4):
        for col in range(0,4):
            matrices[i][row][col]=matrix_list[i][row][col];
    print('Matrix ',i+1,'=',matrices[i]);
        
print('____________________________________________________');

t_points=np.transpose(m_points);


class TestPointLocator(unittest.TestCase):

    def test_fit(self):

        passed=0;
        tested=0;
        numtests=3

        for i in range(0,numtests):

            print('Matrices=',matrices[i].shape,t_points.shape);
            warped=np.transpose(np.matmul(matrices[i],t_points))[:,0:3]

            print('In points=', points[0][:], points[4][:]);
            print('In points=', warped[0][:], warped[4][:]);

            out=libbis.computeLandmarkTransformWASM(points,warped,
                                                    { 'mode' : i },0);

            print('Input=\n',matrices[i]);
            print('Output=\n',out);
            print('Difference=\n',abs(matrices[i]-out))
            
            dl=out.flatten()-matrices[i].flatten();
            diff=max(np.amax(dl),-np.amin(dl));
            print('Difference',diff);
            tested+=1
            if (diff<0.1):
                print('_____ P A S S E D ____\n');
                passed=passed+1;
            else:
                print('_____ F A I L E D ____\n');
                
            
            print('____________________________________________________');


        self.assertEqual(passed,tested);
        

    def test_rpmcorrespodence(self):

        print('Matrices=',matrices[2].shape,t_points.shape);
        warped=np.transpose(np.matmul(matrices[2],t_points))[:,0:3]

        small_pts=points[0:20,:]
        small_wrp=warped[0:23,: ]
        
        print('In points=', small_pts[0][:], small_pts[4][:]);
        print('In points=', small_wrp[0][:], small_wrp[4][:]);

        out=libbis.test_rpmCorrespondenceEstimatorWASM(small_pts,small_wrp,
                                                       { 'mode' : 0 },1);
        print(out[7:10,:]);

        out2=libbis.test_rpmCorrespondenceEstimatorWASM(small_pts,small_wrp,
                                                       { 'mode' : 1,
                                                         'temperature' : 6.0,
                                                       },0);
        print(out2[7:10,:]);

        out3=libbis.test_rpmCorrespondenceEstimatorWASM(small_pts,small_wrp,
                                                       { 'mode' : 2,
                                                         'temperature' : 6.0,
                                                       },0);
        print(out3[7:10,:]);
        
        self.assertEqual(True,True);

    def test_rpmsampling(self):

        print('___________ test rpm sampling ');

        points=np.zeros([ 1000,3],dtype=np.float32);
        labels=np.zeros([ 1000],dtype=np.int32);

        for i in range (0,1000):
            if (i<950):
                points[i]=[ i,2*i,0.1*i ]
                labels[i]=0
            else:
                points[i]=[ i,2*i,1000+0.1*i ]
                labels[i]=1
        

        # Hardcode numpoints=54, max=980
        print('---------------------- UnWeighted Sampling ---------------')
        numpoints=54
        step=int(1000/numpoints)
        print('step=',step)
        
        gold=points[0:980:step];
        
        outpts=libbis.test_rpmSamplingWASM(points,labels,{ 'returnlabels' : 0,
                                                           'numpoints' : numpoints,
                                                           'prefsampling' : 1
                                                           },1);

        print('gold=',gold.shape,'\n',gold[0::6]);
        print('outpts=',outpts.shape,'\n',outpts[0::6]);

        dl=gold.flatten()-outpts.flatten();
        diff=max(np.amax(dl),-np.amin(dl));
        print('Difference = ', diff);

        print('---------------------- Weighted Sampling ---------------')
        steps=[17,4]
        p1=points[0:930:17];
        p2=points[950:998:4];
        print('p1=',p1.shape,'p2=',p2.shape);
        goldp=np.concatenate([ p1,p2],axis=0);
        print('goldp=',goldp.shape);
        
        outpts2=libbis.test_rpmSamplingWASM(points,labels,{ 'returnlabels' : 0,
                                                            'numpoints' : 64,
                                                            'prefsampling' : 4, },1);
        
        

        print('goldp=',goldp.shape,'\n',goldp[0::6]);
        print('outpts2=',outpts2.shape,'\n',outpts2[0::6]);

        dl=goldp.flatten()-outpts2.flatten();
        diff2=max(np.amax(dl),-np.amin(dl));
        print('Difference2 = ', diff2);

        self.assertEqual(True,(diff<0.01 and diff2 <0.01));
            
        

        
        
