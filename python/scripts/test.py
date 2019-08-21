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
#### Downsampling (spatial, bilinear)
originalSize = imgl[0].size
originalLength = len(imgl)
downsampleRatio = 0.5
downsampledSize = (int(originalSize[0]*downsampleRatio), int(originalSize[1]*downsampleRatio))
for i in range(len(imgl)):
    imgl[i] = imgl[i].resize(downsampledSize, Image.BILINEAR)

#### Split Channel (and convert to numpy array)
# TODO: support blue or uv first
blueL = imgl[0::2]
uvL = imgl[1::2]

# blueMovie = np.empty(downsampledSize+(originalLength,))
blueMovie = np.empty((256,250,500))
for i in range(len(blueL)):
    blueMovie[:,:,i] = np.array(blueL[i])
# uvMovie = np.empty(downsampledSize+(originalLength,))
uvMovie = np.empty((256,250,500))
for i in range(len(uvL)):
    uvMovie[:,:,i] = np.array(uvL[i])

# Output
out = bis.bisImage().create(blueMovie,[1,1,1,1,1],np.eye(4))
out.save('calcium_down_blue_movie.nii.gz')
out = bis.bisImage().create(uvMovie,[1,1,1,1,1],np.eye(4))
out.save('calcium_down_uv_movie.nii.gz')
    
#### Motation Correction
#TODO

#### Rotation
#TODO

#### Top Hat Filter

#### Two-wavelength Regression


sys.exit();