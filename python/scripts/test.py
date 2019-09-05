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
import pdb

from PIL import Image, ImageSequence

my_path=os.path.dirname(os.path.realpath('test.py'));
# my_path=os.path.dirname(os.path.realpath(__file__));
print(__file__);
sys.path.append(os.path.abspath(my_path+'/../../build/native'));
sys.path.append(os.path.abspath(my_path+'/../../python'));

import biswrapper as libbiswasm;
import bis_objects as bis

fmri=bis.bisImage().load('some.nii.gz'); 
print('++++ \t fmri loaded from some.nii.gz, dims=',fmri.dimensions);
pdb.set_trace()
fmri.get_data()
zz = PIL.Image.fromarray
# fmri.save('some2.nii.gz');

#### Loading / File Manipulation
# TIFF (multipage) -> [PIL Images]
img = Image.open('sampleMovie.tiff')
imgl = []
for page in ImageSequence.Iterator(img):
    imgl.append(page.convert(mode='F'))
    # https://pillow.readthedocs.io/en/3.1.x/handbook/concepts.html#concept-modes

# PIL Image -> BisImage
# a = bis.bisImage().create(np.array(iml[0]),[1,1,1],np.array(iml[0]))
imgLB = []
for img in imgl:
    imgLB.append(bis.bisImage().create(np.array(img),[1,1,1],np.array(img)))

# PIL Image -> TIFF (multipage)
# Really slow...
imgl[0].save("sampleMovieBig.tiff",compression="tiff_deflate",save_all=True,append_images=imgl[1:])

# Nifit -> BisImage
fmri=bis.bisImage().load('some.nii.gz') 

# BisImage -> Nifit
# create(self,imagedata,imagespacing,imagematrix):
blue1 = bis.bisImage().create(np.array(blueL[0]),[1,1,1,1,1],np.eye(4))
fmri.save('some2.nii.gz')
# calcium_down_blue_movie1.nii.gz dim=256,250,500,1,1, sp=1,1,1,1,1 orient=RAS type=float
# test_blue1_down.nii.gz          dim=256,250,1,1,1, sp=1,1,1,1,1 orient=RAS type=float

#########################################################################
#########################################################################
#########################################################################
#########################################################################
#########################################################################
#########################################################################
#########################################################################
img = Image.open('sampleMovie.tiff')
imgl = []
for page in ImageSequence.Iterator(img):
    imgl.append(page.convert(mode='F'))

outputEveryStep = True

#### Downsampling (spatial, bilinear) and Rotation
originalSize = imgl[0].size
originalLength = len(imgl)
downsampleRatio = 0.5
rotationAngle = -43
downsampledSize = (int(originalSize[0]*downsampleRatio), int(originalSize[1]*downsampleRatio))
for i in range(len(imgl)):
    imgl[i] = imgl[i].resize(downsampledSize, Image.BILINEAR).rotate(rotationAngle,Image.NEAREST,True)
rotatedSize = imgl[0].shape

#### Split Channel (and convert to numpy array)
# TODO: support blue or uv first
blueL = imgl[0::2]
uvL = imgl[1::2]

blueMovie = np.empty((blueL[0].size[1], blueL[0].size[0], len(blueL))) #np arrays have 1st index as rows
# blueMovie = np.empty((256,250,500))
for i in range(len(blueL)):
    blueMovie[:,:,i] = np.array(blueL[i])

uvMovie = np.empty((uvL[0].size[1], uvL[0].size[0], len(uvL)))
# uvMovie = np.empty((256,250,500))
for i in range(len(uvL)):
    uvMovie[:,:,i] = np.array(uvL[i])

# Output
if outputEveryStep:
    out = bis.bisImage().create(blueMovie,[1,1,1,1,1],np.eye(4))
    out.save('calcium_down_blue_movie.nii.gz')
    out = bis.bisImage().create(uvMovie,[1,1,1,1,1],np.eye(4))
    out.save('calcium_down_uv_movie.nii.gz')
    
#### Motation Correction
#TODO

#### Top Hat Filter
# Mask (spatial), resize, and rotate
mask = np.array(Image.open('mask.tif').resize(downsampledSize, Image.BILINEAR).rotate(rotationAngle,Image.NEAREST,True))
mask = np.argwhere(mask)

# Reshape (assuming always square)
blueMovie = blueMovie.reshape((blueMovie.shape[0]**2, blueMovie.shape[2]))
uvMovie = uvMovie.reshape((uvMovie.shape[0]**2, uvMovie.shape[2]))
mask = mask.reshape((mask.shape[0]**2))

# Creating time padding (invert time)
bluePadding = np.concatenate([-blueMovie[mask,300:0:-1]+2*blueMovie[mask,0][:,np.newaxis], blueMovie[mask,:]],axis=1)
uvPadding = np.concatenate([-uvMovie[mask,300:0:-1]+2*uvMovie[mask,0][:,np.newaxis], uvMovie[mask,:]],axis=1)

# from skimage.morphology import white_tophat
import skimage.morphology

se = skimage.morphology.rectangle(1,300) #(1, x) shape important!
blueFiltered = np.empty(rotatedSize)
uvFiltered = np.empty(rotatedSize)
for i in range(mask.sum()):
    blueFiltered[i,np.newaxis] = skimage.morphology.white_tophat(bluePadding[i,np.newaxis],se)
    uvFiltered[i,np.newaxis] = skimage.morphology.white_tophat(uvPadding[i,np.newaxis],se)

blueMovieFiltered = np.zeros(blueMovie.shape)
uvMovieFiltered = np.zeros(uvMovie.shape)

mask_indices = np.squeeze(np.argwhere(mask))
blueMovieFiltered[mask_indices,:] = blueFiltered[:,300:]
uvMovieFiltered[mask_indices,:] = uvFiltered[:,300:]

blueMovieFiltered = blueMovieFiltered.reshape(rotatedSize)
uvMovieFiltered = uvMovieFiltered.reshape(rotatedSize)

if outputEveryStep:
    out = bis.bisImage().create(blueMovieFiltered,[1,1,1,1,1],np.eye(4))
    out.save('calcium_down_blue_movie_mc_rot_filt.nii.gz')
    out = bis.bisImage().create(uvMovieFiltered,[1,1,1,1,1],np.eye(4))
    out.save('calcium_down_uv_movie_mc_rot_filt.nii.gz')

#### Two-wavelength Regression


sys.exit();