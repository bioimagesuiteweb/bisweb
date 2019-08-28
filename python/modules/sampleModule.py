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

# from PIL import Image

import pdb

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
                    "description": "The input image (blue) to preprocess",
                    "varname": "blue",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input image (uv) to preprocess",
                    "varname": "uv",
                    "required": True
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

    # def rotate(self,angle):
        

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        debug=self.parseBoolean(vals['debug']);
        blueMovie = self.inputs['blue'].get_data()
        uvMovie = self.inputs['uv'].get_data()
        mask = self.inputs['mask'].get_data()


        # Jackson to add
        #data=
        
        # Input of of type bis_image
        # .data
        # .spacing [ spx, spy, spz, spt, 1 ]
        # .dimensions [ 256 256 1 1000 1 ]
        # .affine [ [ sx 0 0 0 ] [ 0 sy 0 0 ] [ 0 0 sz 0 ] [ 0 0 0 1 ] ]

        # other place is to look at is bisImage.load
        outputEveryStep = False
        rotatedSize3D = blueMovie.shape
        # Your code here
        topHat = 300
        # Mask (spatial), resize, and rotate
        # mask = np.array(Image.open('mask.tif').resize(downsampledSize, Image.BILINEAR).rotate(rotationAngle,Image.NEAREST,True))

        # Reshape 
        blueMovie = blueMovie.reshape((blueMovie.shape[0]*blueMovie.shape[1], blueMovie.shape[2]))
        uvMovie = uvMovie.reshape((uvMovie.shape[0]*uvMovie.shape[1], uvMovie.shape[2]))
        mask = mask.reshape((mask.shape[0]*mask.shape[1]))
        mask = mask>0

        # Creating time padding (invert time)
        bluePadding = np.concatenate([-blueMovie[mask,topHat:0:-1]+2*blueMovie[mask,0][:,np.newaxis], blueMovie[mask,:]],axis=1)
        uvPadding = np.concatenate([-uvMovie[mask,topHat:0:-1]+2*uvMovie[mask,0][:,np.newaxis], uvMovie[mask,:]],axis=1)

        # from skimage.morphology import white_tophat
        import skimage.morphology

        se = skimage.morphology.rectangle(1,topHat) #(1, x) shape important!
        blueFiltered = np.empty((mask.sum(), rotatedSize3D[2]+topHat))
        uvFiltered = np.empty((mask.sum(), rotatedSize3D[2]+topHat))
        for i in range(mask.sum()):
            blueFiltered[i,np.newaxis] = skimage.morphology.white_tophat(bluePadding[i,np.newaxis],se)
            uvFiltered[i,np.newaxis] = skimage.morphology.white_tophat(uvPadding[i,np.newaxis],se)

        blueMovieFiltered = np.zeros(blueMovie.shape)
        uvMovieFiltered = np.zeros(uvMovie.shape)

        mask_indices = np.squeeze(np.argwhere(mask))
        blueMovieFiltered[mask_indices,:] = blueFiltered[:,topHat:]
        uvMovieFiltered[mask_indices,:] = uvFiltered[:,topHat:]
        

        blueMovieFiltered = blueMovieFiltered.reshape(rotatedSize3D)
        uvMovieFiltered = uvMovieFiltered.reshape(rotatedSize3D)

        if outputEveryStep:
            out = bis.bisImage().create(blueMovieFiltered,[1,1,1,1,1],np.eye(4))
            out.save('calcium_down_blue_movie_mc_rot_filt.nii.gz')
            out = bis.bisImage().create(uvMovieFiltered,[1,1,1,1,1],np.eye(4))
            out.save('calcium_down_uv_movie_mc_rot_filt.nii.gz')

        #### Two-wavelength Regression
        from scipy import linalg

        blueMovieFiltered = blueMovieFiltered.reshape((blueMovieFiltered.shape[0]*blueMovieFiltered.shape[1], blueMovieFiltered.shape[2]))
        uvMovieFiltered = uvMovieFiltered.reshape((uvMovieFiltered.shape[0]*uvMovieFiltered.shape[1], uvMovieFiltered.shape[2]))

        blueBase = blueMovie - blueMovieFiltered
        uvBase = uvMovie - uvMovieFiltered

        blueRec = blueMovieFiltered + np.tile(blueBase.mean(axis=1)[:,np.newaxis],(1,rotatedSize3D[2]))
        uvRec = uvMovieFiltered + np.tile(uvBase.mean(axis=1)[:,np.newaxis],(1,rotatedSize3D[2]))

        beta = np.zeros((len(mask_indices)))
        blueReg = np.zeros(blueBase.shape)

        for i in range(mask.sum()):
            beta[i] = linalg.lstsq(uvRec[mask_indices[i],:][:,np.newaxis], blueRec[mask_indices[i],:][:,np.newaxis])[0][0][0]
            blueReg[mask_indices[i],:] = blueMovieFiltered[mask_indices[i],:] - beta[i]*uvMovieFiltered[mask_indices[i],:]

        if outputEveryStep:
            out = bis.bisImage().create(blueReg.reshape(rotatedSize3D),[1,1,1,1,1],np.eye(4))
            out.save('calcium_down_blue_movie_mc_rot_filt_regress.nii.gz')

        #### dF/F

        # pdb.set_trace()
        #blue
        blueF = blueMovie[mask,topHat:].mean(axis=1)
        blueDFF = np.zeros(blueMovie.shape)
        blueDFF[mask,:] = np.divide(blueReg[mask,:],np.tile(blueF[:,np.newaxis],(1,rotatedSize3D[2])))

        #uv
        uvF = uvMovieFiltered[mask,topHat:].mean(axis=1)
        uvDFF = np.zeros(uvMovieFiltered.shape)
        uvDFF[mask,:] = np.divide(uvMovieFiltered[mask,:],np.tile(uvF[:,np.newaxis],(1,rotatedSize3D[2])))

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

if __name__ == '__main__':
    import bis_commandline;
    import bis_commandline; sys.exit(bis_commandline.loadParse(sampleModule(),sys.argv,False));



    
