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


fname0=my_path+'/../test/testdata/pointlocator/brain.json';
fname1=my_path+'/../test/testdata/pointlocator/result.json';

print('fname0=',fname0);
print('fname1=',fname1);
print('____________________________________________________');
file1=open(fname0); text1=file1.read(); brain=json.loads(text1);
file2=open(fname1); text2=file2.read(); results=json.loads(text2); 


print(results);

arr=np.asarray(brain['points'],dtype=np.float32);
print(arr.shape);
l=arr.shape[0];
rows=int(l/3);
cols=3

points=np.reshape(arr,[ rows,cols ]);

print("Points 0 & 2 = ",points[0,:], points[2,:])
print('____________________________________________________');

numtestpoints=len(results['points']);



class TestPointLocator(unittest.TestCase):

    def test_nearest(self):

        passed=0;
        tested=0;
        
        for i in range(0,numtestpoints):
            print('____________________________________________________');
            print('\n');
            print('Point '+str(i+1)+' (location) = ', results['points'][i]['location']);
            print('\t (nearest) ', results['points'][i]['nearest']);

            out = libbis.testPointLocatorWASM(points,
                                              {
                                                  "mode" : 0,
                                                  "x" : results['points'][i]['location'][0],
                                                  "y" : results['points'][i]['location'][1],
                                                  "z" : results['points'][i]['location'][2],
                                                  "length" : 20.0
                                              },0);

            gold = results['points'][i]['nearest'];
            sum=0.0;
            for ia in range(0,3):
                sum=sum+abs(gold[ia]-out[0][ia]);
            
            print('\t output=',out,' gold=',gold,' diff=',sum);
            if (sum<0.01):
                passed=passed+1;
            tested=tested+1;
            
        self.assertEqual(passed,tested);

    def test_radius(self):

        passed=0;
        tested=0;
        
        for i in range(0,numtestpoints):
            print('____________________________________________________');
            print('\n');
            print('Point '+str(i+1)+' (location) = ', results['points'][i]['location']);
            print('\t (nearest) ', results['points'][i]['nearest']);
            print('\t (numneighbors) ', results['points'][i]['numneighbors']);
            print('\t (neighbors) ', results['points'][i]['neighbors']);
            
            outpoints = libbis.testPointLocatorWASM(points,
                                              {
                                                  "mode" : 1,
                                                  "x" : results['points'][i]['location'][0],
                                                  "y" : results['points'][i]['location'][1],
                                                  "z" : results['points'][i]['location'][2],
                                                  "length" : 20.0,
                                                  "threshold" : results['threshold']
                                              },0);
            outindices = libbis.testPointLocatorWASM(points,
                                                  {
                                                      "mode" : 2,
                                                      "x" : results['points'][i]['location'][0],
                                                      "y" : results['points'][i]['location'][1],
                                                      "z" : results['points'][i]['location'][2],
                                                      "length" : 20.0,
                                                      "threshold" : results['threshold']
                                                  },0);

            gold = results['points'][i]['neighbors'];

            if (results['points'][i]['numneighbors']>0):
            
                output=np.concatenate([ outpoints.astype(np.float64),
                                        outindices.astype(np.float64) ],axis=1);
                
                gold=np.reshape(np.asarray(gold,dtype=np.float64),output.shape);
                
                
                output=output[np.argsort(output[:, 3])];
                gold=gold[np.argsort(output[:, 3])];
                
                
                print('Output=',output);
                print('Gold=',gold);
                
                
                dl=output.flatten()-gold.flatten();
                diff=max(np.amax(dl),-np.amin(dl));
                if (diff<0.001):
                    passed=passed+1;
                    print('Difference',diff);
            else:
                if (outindices[0][0]==-1):
                    passed=passed+1;
                    print('No Neighbors found',outindices)


                    
            tested=tested+1;
            
        self.assertEqual(passed,tested);
        
