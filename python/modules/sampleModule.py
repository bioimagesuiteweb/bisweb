#!/usr/bin/env python3

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



import sys
import bis_path;
import math
import numpy as np
import argparse
import bis_basemodule
import bis_objects
import modules_desc;
import biswrapper as libbis;

class sampleModule(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='sampleModule';
   
    def createDescription(self):
        return {
            "name": "Computes something",
            "description": "Calculates the something",
            "author": "Somebody",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input image to preprocess",
                    "varname": "input",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Input Mask",
                    "description": "The mask input"
                    "varname": "mask",
                    "required": True
                }
            ],
            "outputs": [
                {
                    "type": "image",
                    "name": "Output Image",
                    "description": "The output image",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".nii.gz"
                }
            ],
            "params": [
                {
                    "name": "Num Regions",
                    "description": "The number of regions in the original (group) parcellation",
                    "type": "int",
                    "varname": "numregions",
                    "default": 268,
                    "low": 1,
                    "high": 5000
                },
                {
                    "name": "Smoothing",
                    "description": "Kernel size [mm] of FWHM filter size",
                    "type": "float",
                    "varname": "smooth",
                    "default": 4,
                    "low": 0,
                    "high": 20
                },
                {
                    "name": "Save Exemplars?",
                    "description": "Saves exemplars in second frame",
                    "varname": "saveexemplars",
                    "type": "boolean",
                    "default": False
                },
                {
                    "name": "Debug",
                    "description": "Toggles debug logging",
                    "varname": "debug",
                    "type": "boolean",
                    "default": False
                }
            ],
        }


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug=self.parseBoolean(vals['debug']);
        input = self.inputs['input'];
        mask = self.inputs['mask'];

        inputDim = input.dimensions;
        groupDim = mask.dimensions;
        smooth=vals['smooth'];

        # Jackson to add
        #data=
        
        # Input of of type bis_image
        # .data
        # .spacing [ spx, spy, spz, spt, 1 ]
        # .dimensions [ 256 256 1 1000 1 ]
        # .affine [ [ sx 0 0 0 ] [ 0 sy 0 0 ] [ 0 0 sz 0 ] [ 0 0 0 1 ] ]

        # other place is to look at is bisImage.load
        
        # Your code here

        
        

        # out=bisImage();
        # imagedata = numpy array with the voxel intensities (order is i,j,k,t,c)
        # [ frame 1 ][ frame 2 ][ frame 3 ]
        # out.create(imagedata,imagespacing,imagematrix)

        
        self.outputs['output']=None;
        return True

if __name__ == '__main__':
    import bis_commandline;
    import bis_commandline; sys.exit(bis_commandline.loadParse(sampleModule(),sys.argv,False));



    
