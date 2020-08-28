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



#   rotNscale.py
#
#   Created on: August 19, 2020
#   Authors:   An Qu
#             {an.qu} <at> yale.edu


import os
import sys
import numpy as np
import random as rd
import biswebpython.core.bis_baseutils as bis_baseutils;
import biswebpython.core.bis_objects as bis;
libbis=bis_baseutils.getDynamicLibraryWrapper();



def rotNsc(inp_img, inp_mask=False, rotation=[0, 0, 0], scaling=[1, 1, 1], inp_img2=False):
    mri = inp_img
    if inp_mask:
        mask = inp_mask;
        mask.data_array = mask.data_array * 10

    if inp_img2:
        mri2=inp_img2;


    dim=mri.dimensions;
    spa=mri.spacing;


    if len(rotation) != len(scaling):
        raise ValueError('Roation and/or Scaling should be 3 dimensinal.')

    rot = rotation
    scale = scaling

    if rot == [0, 0, 0] and scale ==[1, 1, 1]:
        print("No operation performed!")
        print("Rotation: ", rot, ", Scaling: ", scale)
        print("The rotated and scaled image will be the same as the original images with the rotation and sclaing parameters above.")
    else:
        pvector=np.array([0,0,0,
                          rot[0],rot[1],rot[2],
                          scale[0],scale[1],scale[2],
                          0,0,0],
                          dtype=np.float32);

        tr_wasm=libbis.test_create_4x4matrix(mri,mri,pvector, { 'mode': 3},1);

        output_mri = libbis.resliceImageWASM(mri, tr_wasm, {
        "spacing" : [ spa[0],spa[1],spa[2] ],
        "dimensions" : [ dim[0],dim[1],dim[2] ],
        "interpolation" : 1 ,
        },True);

        suffix = "_x_r"+str(rot[0])+"s"+str(scale[0])+"_y_r"+str(rot[1])+"s"+str(scale[0])+"_z_r"+str(rot[2])+"s"+str(scale[0])


        if inp_mask:
            output_mask = libbis.resliceImageWASM(mask, tr_wasm, {
            "spacing" : [ spa[0],spa[1],spa[2] ],
            "dimensions" : [ dim[0],dim[1],dim[2] ],
            "interpolation" : 1 ,
            },True);

            new_mask=output_mask.cloneImage()
            for i in range(new_mask.dimensions[0]):
                for j in range(new_mask.dimensions[1]):
                    for k in range(new_mask.dimensions[2]):
                        if new_mask.data_array[i][j][k] < 5:
                            new_mask.data_array[i][j][k] = 0
                        else:
                            new_mask.data_array[i][j][k] = 1


        if inp_img2:
            output_mri2 = libbis.resliceImageWASM(mri2, tr_wasm, {
            "spacing" : [ spa[0],spa[1],spa[2] ],
            "dimensions" : [ dim[0],dim[1],dim[2] ],
            "interpolation" : 1 ,
            },True);


    if inp_mask:
        if inp_img2:
            return output_mri, new_mask, output_mri2, suffix
        else:
            return output_mri, new_mask, suffix
    else:
        return output_mri, suffix
