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


class TestTensorGrid(unittest.TestCase):

    def setUp(self):
        print(' --------------------------------------------------')
        self.imgnames = [ 'MNI_2mm_orig.nii.gz', 
	                  'MNI_2mm_scaled.nii.gz',
	                  'MNI_6mm.nii.gz',
	                  'MNI_6mm_scaleddispfield.nii.gz'
        ];

        self.images = [0,0,0,0];
        for i in range(0,4):
            name=my_path+'/../test/testdata/'+self.imgnames[i];
            self.images[i]=bis.bisImage().load(name)
            print('__ loaded image',i, 'from ', name,'dims=',self.images[i].dimensions,self.images[i].spacing,self.images[i].dimensions,self.images[i].get_data().dtype);
            print('----------------------------------------------------------')



    def test_grid_combo(self):
        print(' --------------------------------------------------')
        print('test_grid/combo');

        filename=os.path.abspath(my_path+"/../test/testdata/MNI_2mm_scaled.grd");

        combo=bis.bisComboTransformation();
        combo.load(filename);
        
        bsplinegrid=combo.grids[0];
        
        pt370=[ -1.5743, -0.0616, -1.1677 ];
        g=bsplinegrid.get_data();
        
        n=bsplinegrid.getNumberOfControlPoints();
        disp = [ g[370],g[370+n],g[370+2*n]];
        error=0.0;

        print('pt370=',pt370,' disp=',disp);
        for k in range(0,3):
            error+=abs(disp[k]-pt370[k]);
        print("++++ checking bspline grid loading error0=",error);


        obj = { "dimensions" : self.images[2].dimensions,
	        "spacing" : self.images[2].spacing,
        };


        wasm_out_g=libbiswasm.computeDisplacementFieldWASM(combo.grids[0],obj,1);
        wasm_out_c=libbiswasm.computeDisplacementFieldWASM(combo,obj,1);
        
        print('wasm_out_g=',wasm_out_g.dimensions);
        print('wasm_out_c=',wasm_out_c.dimensions);
        print('gold=',self.images[3].dimensions);
        
        x=wasm_out_g.get_data()-self.images[3].get_data();
        err_g=max(-x.min(), x.max());
        x=wasm_out_c.get_data()-self.images[3].get_data();
        err_c=max(-x.min(), x.max());
        
        x=wasm_out_c.get_data()-wasm_out_g.get_data();
        err_cg=max(-x.min(), x.max());
        print('error: grid=',err_g, 'combo=', err_c,' combo-grid=',err_cg);

        success=False;
        if err_g<0.01 and err_c<0.01 and err_cg<0.01 and error<0.001:
            success=True;

        self.assertEqual(success,True);

    def test_grid_combo_loadwasm(self):
        print(' --------------------------------------------------')
        print('test_grid/combo load wasm');

        filename=os.path.abspath(my_path+"/../test/testdata/complex.grd");

        with open(filename, 'r') as file:
            text=file.read()
        print('read file length=',len(text));

        data = [ [ 20, 0.5250, 1.5128, 0.2732 ],
                 [ 47, -0.6805, 1.3356, 0.6628 ],
                 [ 9850, -0.3057, -1.4673, -0.1346 ]];

        linear = np.array([
            [ 0.999, -0.044, -0.021,  2.691  ],
            [ 0.045,  0.998,  0.035, -0.860 ],
            [ 0.020, -0.036,  0.999,  0.552 ],
            [ 0.000,  0.000,  0.000,  1.000 ]]);

        
        combo=libbiswasm.parseComboTransformTextFileWASM(text,0);

        dl=combo.linear.data_array.flatten()-linear.flatten();
        error=max(np.amax(dl),-np.amin(dl));
        print('abs max error of linear=',error);

        
        bsplinegrid=combo.grids[0];
        g=bsplinegrid.get_data();
        
        n=bsplinegrid.getNumberOfControlPoints();

        print('lendata=',len(data));
        error=0.0;
        
        for i in range(0,len(data)):
            cp=int(data[i][0]);
            
            i_data = [ data[i][1],data[i][2],data[i][3] ];
            o_data = [ g[cp],g[cp+n],g[cp+2*n]];
            error=0.0;

            print('pt',cp,' gold=',i_data,' grd=',o_data);
            for k in range(0,3):
                error+=abs(i_data[k]-o_data[k]);
                
        print("++++ checking bspline grid loading error0=",error);

        success=False;
        if (error<0.001):
            success=True;

        self.assertEqual(success,True);

    def test_grid_combo_savewasm(self):

        filename=os.path.abspath(my_path+"/../test/testdata/complex.grd");

        with open(filename, 'r') as file:
            text=file.read()
        print('=====================================================');
        print('read file length=',len(text));
        
        combo=bis.bisComboTransformation();
        combo.load(filename);

        s=libbiswasm.createComboTransformationTextFileWASM(combo);

        combo2=libbiswasm.parseComboTransformTextFileWASM(s);


        bsplinegrid=combo.grids[0];
        bsplinegrid2=combo2.grids[0];
        n=bsplinegrid.getNumberOfControlPoints();

        grid_data1=bsplinegrid.get_data();
        grid_data2=bsplinegrid2.get_data();
        
        error=0.0;
        data = [ 5,77,104,2100 , 5747 ];
        
        for i in range(0,len(data)):
            cp=int(data[i]);
            
            i_data = [ grid_data2[cp],grid_data2[cp+n],grid_data2[cp+2*n]];
            o_data = [ grid_data1[cp],grid_data1[cp+n],grid_data1[cp+2*n]];
            error=0.0;

            print('pt',cp,' gold=',i_data,' grd=',o_data);
            for k in range(0,3):
                error+=abs(i_data[k]-o_data[k]);
                
        print("++++ checking bspline grid loading serializing and deserializing error0=",error);

        success=False;
        if (error<0.001):
            success=True;

        self.assertEqual(success,True);


if __name__ == '__main__':
    TestTensorGrid().main()        


