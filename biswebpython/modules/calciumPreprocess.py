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
import numpy as np
import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_objects as bis_objects
import biswebpython.utilities.calcium_image as calcium_image;
import biswebpython.utilities.calcium_analysis as calcium_analysis;


# from PIL import Image

import pdb

class calciumPreprocess(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='calciumPreprocess';
   
    def createDescription(self):
        return {
            "name": "Calcium Preprocess",
            "description": "Preprocesses calcium images. Top-hat filter, two-wavelength regression, then dF/F",
            "author": "Jackson Zhaoxiong Ding",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input image (blue) to preprocess",
                    "varname": "blue",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input image (uv) to preprocess",
                    "varname": "uv",
                    "required": False
                },
                {
                    "type": "image",
                    "name": "Input Mask",
                    "description": "The mask input",
                    "varname": "mask",
                    "required": True
                }
            ],
            "outputs": [
                {
                    "type": "image",
                    "name": "Output Image",
                    "description": "The output image",
                    "varname": "blueout",
                    "shortname": "bo",
                    "required": True,
                    "extension": ".nii.gz"
                },
                {
                    "type": "image",
                    "name": "Output Image",
                    "description": "The output image",
                    "varname": "uvout",
                    "shortname": "uo",
                    "required": True,
                    "extension": ".nii.gz"
                }
            ],
            "params": [
                {
                    "name": "Top Hat Window",
                    "description": "The number of frames for the top hat filter",
                    "type": "int",
                    "varname": "tophat",
                    "default": 300,
                    "low": 1,
                    "high": 1000
                },
                {
                    "name": "Dual Channel?",
                    "description": "Is the input dual channel?",
                    "varname": "dual",
                    "type": "boolean",
                    "default": True
                },
                {
                    "name": "Rotation Angle",
                    "description": "Angle of rotation (deg), counter-clockwise",
                    "varname": "rotation",
                    "type": "float",
                    "default": 0,
                    "low": -180,
                    "high": 180
                },
                {
                    "name": "Downsample Ratio",
                    "description": "Downsample ratio. 1=same size, 0.1=smaller, 10=larger",
                    "varname": "downsample",
                    "type": "float",
                    "default": 1,
                    "low": 0,
                    "high": 10
                },
                {
                    "name": "Debug",
                    "description": "Toggles debug logging. Will also output intermediate steps (similar name to Xilin's MATLAB code)",
                    "varname": "debug",
                    "type": "boolean",
                    "default": False
                }
            ],
        }
        

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug=self.parseBoolean(vals['debug'])
        # blueMovie = self.inputs['blue'].get_data()
        # uvMovie = self.inputs['uv'].get_data()
        inputMovie = self.inputs['blue'].get_data()
        blueMovie,uvMovie = calcium_image.channelSeparate(inputMovie)
        mask = self.inputs['mask'].get_data()

        # Parameters
        dualChannel = self.parseBoolean(vals['dual'])
        # topHatWindow = self.params['tophat']
        # rotationAngle = self.params['rotation']
        # downsampleRatio = self.params['downsample']
        topHatWindow = vals['tophat']
        rotationAngle = vals['rotation']
        downsampleRatio = vals['downsample']


        # Downsample, rotation

        blueMovie = calcium_image.resize(blueMovie,(int(blueMovie.shape[0]*downsampleRatio),
                                                    int(blueMovie.shape[1]*downsampleRatio)))
        uvMovie = calcium_image.resize(uvMovie,(int(uvMovie.shape[0]*downsampleRatio),
                                                int(uvMovie.shape[1]*downsampleRatio)))
        mask = calcium_image.resize(mask,(int(mask.shape[0]*downsampleRatio),
                                        int(mask.shape[1]*downsampleRatio)))
        blueMovie = calcium_image.rotate(blueMovie,rotationAngle)
        uvMovie = calcium_image.rotate(uvMovie,rotationAngle)
        mask = calcium_image.rotate(mask,rotationAngle)

        # other place is to look at is bisImage.load
        outputEveryStep = debug
        rotatedSize3D = blueMovie.shape

        # Top Hat filter
        blueMovieFiltered,uvMovieFiltered = calcium_analysis.topHatFilter(blueMovie,uvMovie,mask)

        if outputEveryStep:
            out = bis.bisImage().create(blueMovieFiltered,[1,1,1,1,1],np.eye(4))
            out.save('calcium_down_blue_movie_mc_rot_filt.nii.gz')
            out = bis.bisImage().create(uvMovieFiltered,[1,1,1,1,1],np.eye(4))
            out.save('calcium_down_uv_movie_mc_rot_filt.nii.gz')

        #### Two-wavelength Regression
        blueReg = calcium_analysis.twoWavelengthRegression(blueMovieFiltered,uvMovieFiltered,blueMovie,uvMovie,mask)
        
        if outputEveryStep:
            out = bis.bisImage().create(blueReg.reshape(rotatedSize3D),[1,1,1,1,1],np.eye(4))
            out.save('calcium_down_blue_movie_mc_rot_filt_regress.nii.gz')

        #### dF/F

        # pdb.set_trace()
        #blue
        blueDFF,uvDFF = calcium_analysis.dFF(blueMovie,uvMovieFiltered,blueReg,mask)

        if outputEveryStep:
            out = bis.bisImage().create(blueDFF.reshape(rotatedSize3D),[1,1,1,1,1],np.eye(4))
            out.save('calcium_down_blue_movie_mc_rot_filt_regress_dff.nii.gz')
            out = bis.bisImage().create(uvDFF.reshape(rotatedSize3D),[1,1,1,1,1],np.eye(4))
            out.save('calcium_down_uv_movie_mc_rot_filt_regress_dff.nii.gz')
        
        # for memory
        blueMovie = []
        uvMovie = []
        out = bis_objects.bisImage().create(blueDFF.reshape(rotatedSize3D),[1,1,1,1,1],np.eye(4))
        # out.save('calcium_down_blue_movie_mc_rot_filt_regress_dff.nii.gz')
        self.outputs['blueout']=out
        out = bis_objects.bisImage().create(uvDFF.reshape(rotatedSize3D),[1,1,1,1,1],np.eye(4))
        self.outputs['uvout']=out
        # out.save('calcium_down_uv_movie_mc_rot_filt_regress_dff.nii.gz')
        

        # out=bisImage();
        # imagedata = numpy array with the voxel intensities (order is i,j,k,t,c)
        # [ frame 1 ][ frame 2 ][ frame 3 ]
        # out.create(imagedata,imagespacing,imagematrix)

        
        
        return True




