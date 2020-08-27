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
sys.path.insert(0,os.path.abspath(my_path+'/../biswebpython/modules'));

import biswebpython.modules.resliceImage as resliceImage;
import biswebpython.core.bis_objects as bis
import biswebpython.core.bis_baseutils as bis_baseutils;

libbis=bis_baseutils.getDynamicLibraryWrapper();



class TestResample(unittest.TestCase):

    def test_resample(self):
        imgnames = [ 'avg152T1_LR_nifti_resampled.nii.gz',
	             'avg152T1_LR_nifti.nii.gz',
                     'avg152T1_LR_nifti_resampled_resliced.nii.gz']
        images = [0,0,0];
        names=[' reference','target','true'];

        print('\n\n');
        print('----------------------------------------------------------')
        for i in range(0,3):
            name=my_path+'/../test/testdata/'+imgnames[i];
            images[i]=bis.bisImage().load(name)
            print('__ loaded ',names[i], 'from ', name,'dims=',images[i].dimensions,images[i].spacing,images[i].dimensions,images[i].get_data().dtype);
        print('----------------------------------------------------------')
        
        reslice_matr = [ [  0.866,  -0.525  , 0.000,  68.758 ],
		         [  0.500,   0.909 ,  0.000 ,  9.793 ],
		         [ 0.000,   0.000 ,  1.000 ,  2.250 ],
		         [ 0.000,   0.000,   0.000 ,  1.000  ]];
        
        matr=np.zeros([4,4],dtype=np.float32);
        for row in range(0,4):
            for col in range(0,4):
                matr[row][col]=reslice_matr[row][col];

        reference_image=images[0];
        target_image=images[1];
        true_image=images[2];

        paramobj = {
            "interpolation" : 1,
            "dimensions" : reference_image.dimensions,
            "spacing" : reference_image.spacing,
            "datatype" : "float",
            "backgroundValue" : 0.0,
            "numthreads" : 4
        };


        print(paramobj);
        print('----------------------------------------------------------');
        
        out_obj=libbis.resliceImageWASM(images[1],matr,paramobj,debug=2);
        cc=np.corrcoef(images[2].get_data().flatten(),out_obj.get_data().flatten())[0,1];

        if cc>0.999:
            testpass=True
        else:
            testpass=False;
        
        print('----------------------------------------------------------')
        print('__ post reslicing correlation out v true=',cc, 'pass=',testpass);
        print('----------------------------------------------------------')
        
        self.assertEqual(testpass,True);


    def otest_resample_module(self):

        imgnames = [ 'avg152T1_LR_nifti_resampled.nii.gz',
	             'avg152T1_LR_nifti.nii.gz',
                     'avg152T1_LR_nifti_resampled_resliced.nii.gz']
        images = [0,0,0];
        names=[' reference','target','true'];

        print('\n\n');
        print('----------------------------------------------------------')
        for i in range(0,3):
            name=my_path+'/../test/testdata/'+imgnames[i];
            images[i]=bis.bisImage().load(name)
            print('__ loaded ',names[i], 'from ', name,'dims=',images[i].dimensions,images[i].spacing,images[i].dimensions,images[i].get_data().dtype);
        print('----------------------------------------------------------')


        xformname=my_path+'/testdata/newtests/reslice_transform.matr';
        xform=bis.bisLinearTransformation();
        xform.load(xformname);
        
        module=resliceImage.resliceImage();
        reference_image=images[0];
        target_image=images[1];
        true_image=images[2];
        
        module.execute({
            'input': target_image,
            'reference' : reference_image,
            'xform' : xform
        },{
            'debug' : True
        });
        out_obj=module.getOutputObject('output');
        cc=np.corrcoef(images[2].get_data().flatten(),out_obj.get_data().flatten())[0,1];

        if cc>0.999:
            testpass=True
        else:
            testpass=False;
        
        print('----------------------------------------------------------------------')
        print('__ post module reslicing correlation out v true=',cc, 'pass=',testpass);
        print('----------------------------------------------------------------------')

        
        
        self.assertEqual(testpass,True);
        

if __name__ == '__main__':
    TestResample().main()        
