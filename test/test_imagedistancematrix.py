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

my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.insert(0,os.path.abspath(my_path+'/../'));
sys.path.insert(0,os.path.abspath(my_path+'/../biswebpython/modules'));

from biswebpython.core.bis_objects import *
import biswebpython.core.bis_baseutils as bis_baseutils;

libbis=bis_baseutils.getDynamicLibraryWrapper();


gold = [ bisMatrix(), bisMatrix() ];
matnames = [ 'sparse.matr',   'radius.matr' ];

gold[1].load(my_path+'/../test/testdata/distancematrix/'+matnames[1]);
gold[0].load(my_path+'/../test/testdata/distancematrix/'+matnames[0]);


affine=np.eye(4,dtype=np.float32);
affine[0][0]=2.0;
affine[1][1]=2.0;
affine[2][2]=2.0;

idat=np.zeros([5,5],dtype=np.float32);
objdat=np.zeros([5,5],dtype=np.int16);
indexdat=np.zeros([5,5],dtype=np.int16);

print('Creating data');
index=1;
for j in range(0,5):
    for i in range(0,5):
        idat[i][j]=j*5+i;
        if (i>=1 and i<4 and j>=1 and j<4):
            objdat[i][j]=1;
            indexdat[i][j]=index;
            index=index+1;
            
print(idat);
print(objdat);
print(indexdat);

img=bisImage().create(idat,[2.0,2.0,2.0],affine);
objectmap=bisImage().create(objdat,[2.0,2.0,2.0],affine);
indexmap=bisImage().create(indexdat,[2.0,2.0,2.0],affine);

print(img.getDescription());
print(objectmap.getDescription());
print(indexmap.getDescription());

def computeNorm2(data1,data2):
    A=data1.flatten();
    B=data2.flatten();
    return np.linalg.norm(A-B);


class TestImageDistanceMatrix(unittest.TestCase):

    def test_indexmap(self):

        out=libbis.computeImageIndexMapWASM(objectmap,True);
        result=computeNorm2(out.data_array,indexmap.data_array);

        if result<1:
            testpass=True
        else:
            testpass=False;
        
        print('----------------------------------------------------------')
        print('__ indexmap computation diff=',result, 'pass=',testpass);
        print('----------------------------------------------------------')
        
        self.assertEqual(testpass,True);

    def test_radiusmatrix(self):

        print(img.getDescription());
        print(objectmap.getDescription());
        
        out2=libbis.computeImageDistanceMatrixWASM(img,objectmap,{ "useradius" : True,
                                                                   "radius" : 3.0,
                                                                   "numthreads" : 1 },0);
        result=computeNorm2(gold[0].data_array,out2);
        if result<1:
            testpass=True
        else:
            testpass=False;
        
        print('----------------------------------------------------------')
        print('__ radius distance matrix computation diff=',result, 'pass=',testpass);
        print('----------------------------------------------------------')
        
        self.assertEqual(testpass,True);

    def test_sparsematrix(self):

        print(img.getDescription());
        print(objectmap.getDescription());
        
        out2=libbis.computeImageDistanceMatrixWASM(img,objectmap,{ "useradius" : False,
                                                                   "sparsity" : 0.1,
                                                                   "numthreads" : 1 },0);
        result=computeNorm2(gold[1].data_array,out2);
        if result<1:
            testpass=True
        else:
            testpass=False;
        
        print('----------------------------------------------------------')
        print('__ sparse distance matrix computation diff=',result, 'pass=',testpass);
        print('----------------------------------------------------------')
        
        self.assertEqual(testpass,True);

    def test_sparsematrixmulti(self):

        print(img.getDescription());
        print(objectmap.getDescription());
        
        out2=libbis.computeImageDistanceMatrixWASM(img,objectmap,{ "useradius" : False,
                                                                   "sparsity" : 0.1,
                                                                   "numthreads" : 2 },0);
        result=computeNorm2(gold[1].data_array,out2);
        if result<1:
            testpass=True
        else:
            testpass=False;
        
        print('----------------------------------------------------------')
        print('__ multi sparse distance matrix computation diff=',result, 'pass=',testpass,' ',out2.dtype);
        print('----------------------------------------------------------')
        
        self.assertEqual(testpass,True);

    def test_loadsparse(self):

        fname=(my_path+'/../test/testdata/distancematrix/sample.binmatr');
        print(' ... loading',fname);
        binM = bisMatrix();
        binM.load(fname);

        with tempfile.TemporaryDirectory() as tempdname:
            out=tempdname+'/test.binmatr';
            binM.save(out);

            binM2 = bisMatrix();
            binM2.load(out);
            print('Loaded back from ',out);

        
            result=computeNorm2(gold[1].data_array,binM.data_array);
            result2=computeNorm2(gold[1].data_array,binM2.data_array);

            
            if result<1 and result2<1:
                testpass=True
            else:
                testpass=False;
        
        print('----------------------------------------------------------')
        print('__ bin load sparse matrix=',result, 'pass=',testpass);
        print('----------------------------------------------------------')
        
        self.assertEqual(testpass,True);

        self.assertEqual(True,True);
        

if __name__ == '__main__':
    TestResample().main()        
