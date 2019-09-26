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

my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.insert(0,os.path.abspath(my_path+'/../'));

import biswebpython.core.bis_objects as bis
import biswebpython.core.bis_baseutils as bis_baseutils;
libbiswasm=bis_baseutils.getDynamicLibraryWrapper();

class TestEigen(unittest.TestCase):

    def test_bis_eigenutils(self):
        print('test_eigenUtils');

        m=np.identity(4,dtype=np.float32);
        for row in range(0,4):
            for col in range(0,4):
                m[row][col]=(1.0+row)*10.0+col*col*5.0
                
            
        xform=bis.bisLinearTransformation().create(m);
        print('First print to check ...\n',xform.get_data());

        vect=bis.bisVector().create(np.array([1,2,3,5,7,11.0]));

        numfailed=libbiswasm.test_eigenUtils(xform,vect,1);
        print('\t From JS to C++, numfailed=',numfailed);
        
        self.assertEqual(numfailed,0);

    def test_bis_matlab_import(self):
        print(' --------------------------------------------------')
        print('test_matlab_import');

        filename=os.path.abspath(my_path+"/../test/testdata/small.mat");
        print("reading ",filename);

        with open(filename, mode='rb') as file: # b is important -> binary
            fileContent = file.read()

        vect=bis.bisVector().create_from_bytes(fileContent);

        matr=libbiswasm.parseMatlabV6WASM(vect,{ 'name' : 'a'},1);

        print(matr);
        self.assertEqual(0,0);

    def test_bis_legacy_import(self):

        matname=os.path.abspath(my_path+"/testdata/glm/Test_bis_glm.matr" );
        with open(matname, 'r') as file:
            text=file.read()
        mat= libbiswasm.parseMatrixTextFileWASM(text,1);
        print('m=',mat[4]);
        print(mat.shape);

        if abs(mat[4][2]-0.979)<0.01:
            ok=True;
        else:
            ok=False;
        self.assertEqual(ok,True);

    def test_bis_legacy_import2(self):

        matname=os.path.abspath(my_path+"/testdata/resample.matr" );
        with open(matname, 'r') as file:
            text=file.read()
        mat= libbiswasm.parseMatrixTextFileWASM(text,1);
        
        print('going to create');
        st= libbiswasm.createMatrixTextFileWASM(mat,"my_matrix",0,1);
        print('st=',st);
        
        print('m=',mat);
        print(mat.shape);
        if (abs(mat[1][1]-0.909)<0.01):
            ok=True;
        else:
            ok=False;
        self.assertEqual(ok,True);

if __name__ == '__main__':
    TestEigen().main()        


