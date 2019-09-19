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
import unittest

my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.insert(0,os.path.abspath(my_path+'/../'));
import biswebpython.core.bis_baseutils as bis_baseutils;
libbiswasm=bis_baseutils.getDynamicLibraryWrapper();



class TestEigen(unittest.TestCase):


    def test_optimizer(self):
        print('optimizer test');

        error1=libbiswasm.test_optimizer(1);
        error2=libbiswasm.test_optimizer(2);

        print('error1=',error1,' error2=',error2);
        print(' --------------------------------------------------')
        self.assertEqual(error1+error2,0);



if __name__ == '__main__':
    TestEigen().main()        


