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
import biswebpython.core.bis_wasmutils as wasmutil
import biswebpython.core.bis_baseutils as bis_baseutils;
libbiswasm=bis_baseutils.getDynamicLibraryWrapper();

# ----------------------------------------------------------------------------------------------
images=[0,0];
imgnames = [ 'prep.nii.gz',  'prep_sm.nii.gz' ];
print('------------------ Loading Images --------------------------')
for i in range(0,2):
    name=my_path+'/../test/testdata/indiv/'+imgnames[i];
    images[i]=bis.bisImage().load(name)
            

def smooth():

    paramobj = {
            "sigmas" : [1.6988,1.6988,1.6988 ],
            "radiusfactor" : 2.0,
            "inmm" : True,
            "vtkboundary" : True,
            "debug" : True
        };

       
    out_obj=libbiswasm.gaussianSmoothImageWASM(images[0],paramobj,debug=2);
    cc=np.corrcoef(images[1].get_data().flatten(),out_obj.get_data().flatten())[0,1];

    if cc>0.999:
        testpass=True
    else:
        testpass=False;
        
    print('----------------------------------------------------------')
    print('__ post smoothing correlation out v true=',cc, 'pass=',testpass);
        
    return testpass;

# ----------------------------------------------------------------------------------------------

class TestLargeMem(unittest.TestCase):

    def test_smooth_small(self):
      
        print('')
        print('________________________________________________________________');
        print('')
        print('Using Memory model=',0);
        wasmutil.set_force_large_memory(0);
        testpass=smooth();
        self.assertEqual(testpass,True);

    def test_smooth_mixed(self):
        print('')
        print('________________________________________________________________');
        print('')
        print('Using Memory model=',1);
        wasmutil.set_force_large_memory(1);
        testpass=smooth();
        self.assertEqual(testpass,True);

    def test_smooth_flipmixed(self):
        print('')
        print('________________________________________________________________');
        print('')
        print('Using Memory model=',2);
        wasmutil.set_force_large_memory(2);
        testpass=smooth();
        self.assertEqual(testpass,True);

    def test_smooth_large(self):
        print('')
        print('________________________________________________________________');
        print('')
        print('Using Memory model=',3);
        wasmutil.set_force_large_memory(3);
        testpass=smooth();
        self.assertEqual(testpass,True);


if __name__ == '__main__':
    TestLargeMem().main()        
