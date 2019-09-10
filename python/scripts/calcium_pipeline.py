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

my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.append(os.path.abspath(my_path+'/../../build/native'));
sys.path.append(os.path.abspath(my_path+'/../../python'));

import biswrapper as libbiswasm;
import bis_objects as bis

### Loading movie
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
rotatedSize3D = blueMovie.shape

# Output
if outputEveryStep:
    out = bis.bisImage().create(blueMovie,[1,1,1,1,1],np.eye(4))
    out.save('calcium_down_blue_movie.nii.gz')
    out = bis.bisImage().create(uvMovie,[1,1,1,1,1],np.eye(4))
    out.save('calcium_down_uv_movie.nii.gz')
    
#### Motion Correction
#TODO

#### Top Hat Filter
topHat = 300
# Mask (spatial), resize, and rotate
mask = np.array(Image.open('mask.tif').resize(downsampledSize, Image.BILINEAR).rotate(rotationAngle,Image.NEAREST,True))

# Reshape (assuming always square)
blueMovie = blueMovie.reshape((blueMovie.shape[0]**2, blueMovie.shape[2]))
uvMovie = uvMovie.reshape((uvMovie.shape[0]**2, uvMovie.shape[2]))
mask = mask.reshape((mask.shape[0]**2))

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

blueMovieFiltered = blueMovieFiltered.reshape((blueMovieFiltered.shape[0]**2, blueMovieFiltered.shape[2]))
uvMovieFiltered = uvMovieFiltered.reshape((uvMovieFiltered.shape[0]**2, uvMovieFiltered.shape[2]))

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

#blue
pdb.set_trace()
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


sys.exit();