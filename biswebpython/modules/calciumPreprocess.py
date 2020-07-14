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
import pdb
import os

sys.path.append('/ca2data/biswebCalcium/')

try:
    import bisweb_path;
except ImportError:
    bisweb_path=0;
    


import numpy as np
import pandas as pd
import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_objects as bis_objects
import biswebpython.utilities.calcium_image as calcium_image;
import biswebpython.utilities.calcium_analysis as calcium_analysis;
from biswebpython.modules.linearRegistration import *
from biswebpython.modules.resliceImage import *
import nibabel as nb

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
                    "required": False
                },
                {
                    "type": "image",
                    "name": "BlueInput Motion Reference",
                    "description": "A blue wavelength reference frame to motion correct the data to",
                    "varname": "mcrefblue",
                    "required": False
                },
                {
                    "type": "image",
                    "name": "UV Input Motion Reference",
                    "description": "A UV wavelength reference frame to motion correct the data to",
                    "varname": "mcrefuv",
                    "required": False
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
                    "type": "str",
                    "name": "Input optical trigger",
                    "description": "The order of the different wavelength images specified in blue",
                    "varname": "opticalorder",
                    "required": True,
                    "default" : 0
                },
                {
                    "type": "int",
                    "name": "Image segment number",
                    "description": "Whether the image is part 1 2 or 3 etc.",
                    "varname": "segnum",
                    "required": True,
                    "default" : 1
                },
                {
                    "name": "Bleach Correction",
                    "description": "Do exponential regression ('expReg') or top hat ('topHat')",
                    "type": "str",
                    "varname": "bleachtype",
                    "default": 'expReg'
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
                },
                {
                    "name": "Working Directory",
                    "description": "",
                    "varname": "workdir",
                    "type": "str",
                    "default": False
                },
                {
                    "name": "Create Motion Reference",
                    "description": "Whether or not to use own motion reference or accept input",
                    "varname": "createmcref",
                    "type": "boolean",
                    "default": True
                },
                {
                    "name": "Create mask",
                    "description": "Whether or not to create own mask or accept input",
                    "varname": "createmask",
                    "type": "boolean",
                    "default": True
                },


            ],
        }
        
    

    def computeMotionCorrection(self,image,regFrame='middle'):
        '''
        Expects an image in the form of an np array of size X x Y x T
        '''
        ipImageShape=image.shape
        if len(ipImageShape) == 3:
            numFrames=ipImageShape[2]
        else:
            numFrames = 1

        opImg=np.zeros(ipImageShape,dtype='int16')
        opTransform=np.zeros([4,4,numFrames])

        if (type(regFrame) == str) and (regFrame.lower() == 'mean'):
            targetFrame=np.mean(image,axis=2)
        elif (type(regFrame) == int) and (regFrame <= numFrames-1):
            targetFrame=image[:,:,regFrame]
        elif (type(regFrame) == str) and (regFrame.lower() == 'middle'):
            midFrame = round(image.shape[2]/2)
            targetFrame=image[:,:,midFrame]
        elif type(regFrame) == np.ndarray:
            targetFrame=regFrame
        else:
            message = '''Variable "regFrame" must be "mean", "middle", an integer
            less than or equal to the number of frames, or a frame to register to'''
            raise Exception(message)

        if len(ipImageShape) == 3:
            initial=0;
            for frame in range(0,numFrames):
                extractedFrame= image[:,:,frame]

                ipRef = bis_objects.bisImage().create(targetFrame,[1,1,1,1,1],np.eye(4))
                ipTar = bis_objects.bisImage().create(extractedFrame,[1,1,1,1,1],np.eye(4))

                LinRegister=linearRegistration()

                fileSpec={ 'reference' : ipRef,                                    
                    'target' :  ipTar,
                    'initial' : initial }

   
                paramSpec={'intscale' : 1,
                'numbins' :  32,
                'levels' :   1,
                'optimization' : 'gradientdescent', # 0 hillclimb, 1 gradient descent, 2 conjugate descent
                'normalize' : True, # True? 
                'steps' : 4,
                'iterations' : 32,
                'mode' : 'rigid', # rigid
                'resolution' : 1.5,
                'return_vector' : "false",
                'metric' : 'NMI', # 1=CC 0,=SSD 3=NMI, 2=MI
                'debug' : True,
                'doreslice' : True}

        
                LinRegister.execute(fileSpec,paramSpec);
    
                initial=LinRegister.getOutputObject('output')
                resliced=LinRegister.getOutputObject('resliced')
                # append resliced.data_array


                opTransform[:,:,frame] = initial.get_data()
                opImg[:,:,frame]=np.squeeze(resliced.get_data())

        else:
            initial=0;
            extractedFrame= image

            ipRef = bis_objects.bisImage().create(targetFrame,[1,1,1,1,1],np.eye(4))
            ipTar = bis_objects.bisImage().create(extractedFrame,[1,1,1,1,1],np.eye(4))

            LinRegister=linearRegistration()

            fileSpec={ 'reference' : ipRef,                                    
                'target' :  ipTar,
                'initial' : initial }
   
            paramSpec={'intscale' : 1,
                'numbins' :  32,
                'levels' :   1,
                'optimization' : 'gradientdescent', # 0 hillclimb, 1 gradient descent, 2 conjugate descent
                'normalize' : True, # True? 
                'steps' : 4,
                'iterations' : 32,
                'mode' : 'rigid', # rigid
                'resolution' : 1.5,
                'return_vector' : "false",
                'metric' : 'NMI', # 1=CC 0,=SSD 3=NMI, 2=MI
                'debug' : True,
                'doreslice' : True}

        
            LinRegister.execute(fileSpec,paramSpec);
    
            initial=LinRegister.getOutputObject('output')
            resliced=LinRegister.getOutputObject('resliced')
            # append resliced.data_array


            opTransform = initial.get_data()
            opImg=np.squeeze(resliced.get_data())



        return opImg,targetFrame,opTransform

    def applyMotionCorrection(self,image,transform,ref=None):
        '''
        Expects an image in the form of an np array of size X x Y x T
        '''

        ipImageShape=image.shape
        xDim,yDim,numFrames=ipImageShape
        #xDimRes = round(xDim/2)
        #yDimRes = round(yDim/2)
        if type(ref) == np.ndarray:
            xDimRes,yDimRes = ref.shape
            opImg=np.zeros([xDimRes,yDimRes,numFrames],dtype='int16')
            ref = bis_objects.bisImage().create(ref,[2,2,2,1,1],np.eye(4))
        else:
            opImg=np.zeros([xDim,yDim,numFrames],dtype='int16')


        for frame in range(0,numFrames):
            extractedFrame= image[:,:,frame]
            frameXfm = transform[:,:,frame]
            ipImg = bis_objects.bisImage().create(extractedFrame,[1,1,1,1,1],np.eye(4))
            doReslice=resliceImage()
            #params = {"dimensions": [xDimRes,yDimRes,1],"spacing": [2.0,2.0,2.0],"interpolation":1}
            fileSpec={'input' :  ipImg,
                    'reference': ref,
                    'xform':frameXfm}
            doReslice.execute(fileSpec)
            opImgObj=doReslice.getOutputObject('output')
            opImg[:,:,frame]=np.squeeze(opImgObj.get_data())

        return opImg

           
    def checkTriggers(ipMovie,expectedStructure=[0,1],ipTriggerFile=None):
        
        import nibabel as nb
        import numpy as np
        from matplotlib import pyplot as plt
        from sklearn.cluster import AgglomerativeClustering

        
        meanSpace=allMovieData.mean(axis=1).mean(axis=0)
        #plt.scatter(np.arange(0,meanSpace.shape[0]),meanSpace)
        #plt.show()
        timeArr=np.arange(0,meanSpace.shape[0]/10000,1/10000)
        timeArr=np.expand_dims(timeArr,axis=1)
        meanSpace=np.expand_dims(meanSpace,axis=1)
        meanSpaceTimeArr=np.stack([meanSpace,timeArr]).squeeze()
        clustering = AgglomerativeClustering(n_clusters=2).fit(meanSpaceTimeArr.T)
        #plt.scatter(np.arange(0,meanSpace.shape[0]),meanSpace,c=clustering.labels_)
        #plt.show()

        nFrames=ipMovie.shape[2]
        nChannels=len(expectedStructure)
        exepectedSeq=np.tile(expectedStructure,nFrame/nChannels)

        clusterLabels=clustering.labels_

        if np.array_equal(expectedSeq,clusterLabels):
            pass
        else:
            raise Exception('Misaligned triggers')




    def makeMask(self,ipdata):

        def dilateIter(img,sem,iters):
            for iter in range(0,iters):
                img = morphology.binary_dilation(img,selem=sem)
            return img

        def erodeIter(img,sem,iters):
            for iter in range(0,iters):
                img = morphology.binary_erosion(img,selem=sem)
            return img


        from skimage import filters, morphology
        val = filters.threshold_otsu(ipdata[~np.isnan(ipdata)])  
        blobImg = ipdata > val
        blobImg = ~blobImg

        sem=morphology.disk(1)
        op = morphology.area_opening(blobImg, area_threshold = 2000, connectivity = 1)
        op1 = morphology.area_closing(op, connectivity = 2)
        op2 = erodeIter(op1,sem,4)
        op3 = morphology.area_opening(op2, area_threshold = 2000, connectivity = 1)
        sem=morphology.disk(1)
        op4 = erodeIter(op3,None,10)
        op5 = dilateIter(op4,None,20)
        

        return op5

    
    def MSEDiffImg(self, ipimg, numFramesToUse = 500, medianFilter = 4, dilationIters = 4):

        '''
        Accepts 3D image, X x Y x Time

        numFramesToUse => How many frames to use in MSE calculation

        medianfilter => cutoff for mask, how many mulitples of the median spatial
        value in the mean image to use

        dilationIters => How many pixels to add onto the blobs created by the median filter
        '''

        from scipy.optimize import curve_fit 
        from scipy.ndimage import morphology
        from sklearn.linear_model import LinearRegression as LinReg
        from skimage import feature

        # Num frames
        dimx,dimy,tslength=ipimg.shape
        
        if numFramesToUse > tslength:
            numFramesToUse = tslength


        # Reshape to space by time
        imgDataBeforeFlat=np.reshape(ipimg,[dimx*dimy,tslength])

        # Shorten image
        meanTSOrig=imgDataBeforeFlat.mean(axis=0)
        imgDataBeforeFlat=imgDataBeforeFlat[:,:numFramesToUse]

        # Mean timeseries before MSE   
        meanTS=imgDataBeforeFlat.mean(axis=0)

        # Spatial mean before MSE
        meanImg=np.mean(imgDataBeforeFlat,axis=1)

        # Standard deviation of image
        stdImg=imgDataBeforeFlat.std(axis=1)

        # Median filter based on mean image to remove beads
        spatialMask=meanImg > np.median(meanImg)*medianFilter

        # Dilate these structures
        struct1 = morphology.generate_binary_structure(2, 2)
        spatialMaskSq = np.reshape(spatialMask,[dimx,dimy])
        spatialMaskSq= morphology.binary_dilation(spatialMaskSq,iterations=dilationIters,structure=struct1)
        spatialMask=spatialMaskSq.flatten()

        # Mask mean image
        meanImgMask=meanImg*~spatialMask

        # Mask all data
        spatialMaskRep=np.tile(np.vstack(spatialMask),numFramesToUse)
        imgDataBeforeFlat=imgDataBeforeFlat*~spatialMaskRep

        # Standard deviation of image
        stdImgMask=imgDataBeforeFlat.std(axis=1)

        # Create normalized timeseries
        imgNormTs=(imgDataBeforeFlat-np.vstack(meanImgMask))/np.vstack(stdImgMask)
        tsmask=np.sum(np.isnan(imgNormTs),axis=1) < 1

        # Mean normalized timeseries
        meantsNorm=np.mean(imgNormTs,axis=0)
        meantsNorm=np.mean(imgNormTs[tsmask,:],axis=0)

        # Look at difference between mean normalized timeseries and 
        # other normalized timeseries
        imgNormDemean=imgNormTs-meantsNorm

        # Mean square error of those differences
        imgNormMSE=np.mean(imgNormDemean**2,axis=1)

        # Reshape to "square" image for display
        meanImgSq=np.reshape(meanImg,[dimx,dimy])
        meanImgMaskSq=np.reshape(meanImgMask,[dimx,dimy])
        imgNormMSESq=np.reshape(imgNormMSE,[dimx,dimy])
        stdImgSq=np.reshape(stdImg,[dimx,dimy])


        # Automated mask
        imgMask = self.makeMask(imgNormMSESq)

        return meanImgSq,imgNormMSESq, spatialMaskSq, meanImgMaskSq, stdImgSq, meanTSOrig, imgMask

    def smoothImage(self, ipImg, width=16):
        import skimage as ski
        from skimage import morphology

        se = morphology.square(width)
        nFrames=ipImg.shape[2]
        opImg=np.zeros(ipImg.shape,dtype='int16')
        print('Applying median filter of width:',width,' to the data, may take a while')
        for i in range(nFrames):
            opImg[:,:,i]=ski.filters.median(ipImg[:,:,i],selem = se)
            

        return opImg

    def writeNiiImg(self,opArr, opname, opDims, opAffine, reshape4D = False):
        
        imgShape = opArr.shape

        if len(imgShape) == 3:
            imgX,imgY,imgT = imgShape

            if reshape4D:
                opArr = np.reshape(opArr,[imgX,imgY,1,imgT])

        elif len(imgShape) == 4:
            imgX,imgY,_,imgT = imgShape      
        else:
            raise Exception('Images to be saved should be 3 or 4D')      

        out = bis_objects.bisImage().create(opArr,opDims,opAffine)
        out.save(opname)
        

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);


        # Parameters
        dualChannel = self.parseBoolean(vals['dual'])
        bleachType = vals['bleachtype']
        debug=self.parseBoolean(vals['debug'])
        workdir=vals['workdir']
        createMask=self.parseBoolean(vals['createmask'])
        createMCRef=self.parseBoolean(vals['createmcref'])
        segnum = vals['segnum']
        outputEveryStep = debug


        # Op nifti configs
        dimsOp = [0.025,0.025,0.025,1]
        aff = np.eye(4)
        aff[1,1] = -1
        aff[2,2] = -1
        aff = aff * 0.025
        aff[3,3] = 1

        
        # Load inputs        
        inputMovie = self.inputs['blue'].get_data().astype(np.float32)
        #if not createMask:
        #    mask = self.inputs['mask'].get_data()
        if not createMCRef:
            MCRefBlue = self.inputs['mcrefblue'].get_data()
            MCRefUv = self.inputs['mcrefuv'].get_data()
        
        if not createMask and ('mask' in self.inputs):
            mask = np.squeeze(self.inputs['mask'].get_data().astype(int))
        elif not createMask and ('mask' not in self.inputs):
            raise Exception('If createMask != True you must give the path to a mask')

        inputTrigs = vals['opticalorder']
        inputTrigs=pd.read_csv(inputTrigs,index_col=0)
        opticalOrder=inputTrigs['opticalOrder'].values

        if outputEveryStep and not os.path.isfile(os.path.join(workdir,'calcium_movie_all.nii.gz')):
            self.writeNiiImg(inputMovie, os.path.join(workdir,'calcium_movie_all.nii.gz'), dimsOp, aff,reshape4D = True)



        # Check triggers!

        #blueMovie,uvMovie = calcium_image.channelSeparate(inputMovie)
        #if segnum == 1:
        #    opticalOrder=opticalOrder[:inputMovie.shape[2]]
        #elif segnum == 2:
        #    opticalOrder=opticalOrder[4179:4179*2]
        #elif segnum == 3:
        #    opticalOrder=opticalOrder[4179*2:]
        
        blueMovie = inputMovie[:,:,opticalOrder == 1]
        uvMovie = inputMovie[:,:,opticalOrder == 2]


        del inputMovie

        #if self.inputs['mask']:
        #    mask = self.inputs['mask'].get_data()



        if bleachType not in ['expReg','topHat']:
            raise Exception(ValueError, 'bleachType must be "expReg" or "topHat" (case sensitive)')

        blueMovieSize = blueMovie.shape
        uvMovieSize = uvMovie.shape

        if outputEveryStep:
            oppath = os.path.join(workdir,'calcium_blue_movie.nii.gz')
            if not os.path.isfile(oppath):
                self.writeNiiImg(blueMovie, oppath, dimsOp, aff, reshape4D = True)

            oppath = os.path.join(workdir,'calcium_uv_movie.nii.gz')
            if not os.path.isfile(oppath):
                self.writeNiiImg(uvMovie, oppath, dimsOp, aff, reshape4D = True)
        #### Smooth Data 16 Filt ######
        
        blueSmoothOppath = os.path.join(workdir,'calcium_blue_movie_smooth16.nii.gz')
        uvSmoothOppath = os.path.join(workdir,'calcium_uv_movie_smooth16.nii.gz')

        if not os.path.isfile(blueSmoothOppath):
            blueSmooth=self.smoothImage(blueMovie)
            self.writeNiiImg(blueSmooth, blueSmoothOppath, dimsOp, aff, reshape4D = True)
        else:
            blueSmoothObj = nb.Nifti1Image.load(blueSmoothOppath)
            blueSmooth = blueSmoothObj.get_fdata(dtype = np.float32).squeeze()

        if not os.path.isfile(uvSmoothOppath):
            uvSmooth=self.smoothImage(uvMovie)
            self.writeNiiImg(uvSmooth, uvSmoothOppath, dimsOp, aff, reshape4D = True)
        else:
            uvSmoothObj = nb.Nifti1Image.load(uvSmoothOppath)
            uvSmooth = uvSmoothObj.get_fdata(dtype = np.float32).squeeze()



        #### Smooth Data 4 Filt ######

        blueSmooth4Oppath = os.path.join(workdir,'calcium_blue_movie_smooth4.nii.gz')
        uvSmooth4Oppath = os.path.join(workdir,'calcium_uv_movie_smooth4.nii.gz')

        if not os.path.isfile(blueSmooth4Oppath):
            blueSmooth4=self.smoothImage(blueMovie,width=4)
            self.writeNiiImg(blueSmooth4, blueSmooth4Oppath, dimsOp, aff, reshape4D = True) 
        else:
            blueSmooth4Obj = nb.Nifti1Image.load(blueSmoothOppath)
            blueSmooth4 = blueSmoothObj.get_fdata(dtype = np.float32).squeeze()

        if not os.path.isfile(uvSmooth4Oppath):
            uvSmooth4=self.smoothImage(uvMovie,width = 4)
            self.writeNiiImg(uvSmooth4, uvSmooth4Oppath, dimsOp, aff, reshape4D = True)
        else:
            uvSmooth4Obj = nb.Nifti1Image.load(uvSmooth4Oppath)
            uvSmooth4 = uvSmooth4Obj.get_fdata(dtype = np.float32).squeeze()


        #### Motion correction of raw data for comparison ####
   

        blueMovieMCPath = os.path.join(workdir,'calcium_blue_movie_mc.nii.gz')
        uvMovieMCPath = os.path.join(workdir,'calcium_uv_movie_mc.nii.gz')
        opTransformBluePath = os.path.join(workdir,'blueMCTransform.npy')
        blueMovieRefPath = os.path.join(workdir,'calcium_blue_movie_mcRef.nii.gz')
        uvMovieRefPath = os.path.join(workdir,'calcium_uv_movie_mcRef.nii.gz')
        opTransformUvPath = os.path.join(workdir,'uvMCTransform.npy')
 

        if not all([os.path.isfile(blueMovieMCPath), os.path.isfile(blueMovieRefPath), os.path.isfile(opTransformBluePath)]):
            blueMovieMC,blueMovieRef,opTransformBlue = self.computeMotionCorrection(blueMovie)
            self.writeNiiImg(blueMovieMC, blueMovieMCPath, dimsOp, aff, reshape4D = True)
            out = bis_objects.bisImage().create(blueMovieRef,dimsOp,aff)
            out.save(blueMovieRefPath)
            np.save(opTransformBluePath, opTransformBlue)
        else:
            blueMovieMCObj = nb.Nifti1Image.load(blueMovieMCPath)
            blueMovieMC = blueMovieMCObj.get_fdata(dtype = np.float32).squeeze()
            blueMovieRefObj = nb.Nifti1Image.load(blueMovieRefPath)
            blueMovieRef = blueMovieRefObj.get_fdata(dtype = np.float32)
            opTransformBlue = np.load(opTransformBluePath)

        del blueMovieMC

        if not all([os.path.isfile(uvMovieMCPath),os.path.isfile(uvMovieRefPath),os.path.isfile(opTransformUvPath)]):
            uvMovieMC,uvMovieRef,opTransformUv = self.computeMotionCorrection(uvMovie)
            self.writeNiiImg(uvMovieMC, uvMovieMCPath, dimsOp, aff, reshape4D = True)
            out = bis_objects.bisImage().create(uvMovieRef,dimsOp,aff)
            out.save(uvMovieRefPath)
            np.save(opTransformUvPath, opTransformUv)
 
        else:
            uvMovieMCObj = nb.Nifti1Image.load(uvMovieMCPath)
            uvMovieMC = uvMovieMCObj.get_fdata(dtype = np.float32).squeeze()
            uvMovieRefObj = nb.Nifti1Image.load(uvMovieRefPath)
            uvMovieRef = uvMovieRefObj.get_fdata(dtype = np.float32)
            opTransformUv = np.load(opTransformUvPath)

        del uvMovieMC

        #### Motion correction  calculaiton on smooth 16 data ####

        blueSmoothMovieMCPath = os.path.join(workdir,'calcium_blue_movie_smooth_mc.nii.gz')
        uvSmoothMovieMCPath = os.path.join(workdir,'calcium_uv_movie_smooth_mc.nii.gz')
        opSmoothTransformBluePath = os.path.join(workdir,'blueMCSmoothTransform.npy')
        blueSmoothMovieRefPath = os.path.join(workdir,'calcium_blue_movie_smooth_mcRef.nii.gz')
        uvSmoothMovieRefPath = os.path.join(workdir,'calcium_uv_movie_smooth_mcRef.nii.gz')
        opSmoothTransformUvPath = os.path.join(workdir,'uvMCSmoothTransform.npy')
 

        if not all([os.path.isfile(blueSmoothMovieMCPath),os.path.isfile(blueSmoothMovieRefPath),os.path.isfile(opSmoothTransformBluePath)]):
            blueSmoothMovieMC,blueSmoothMovieRef,opSmoothTransformBlue = self.computeMotionCorrection(blueSmooth)
            self.writeNiiImg(blueSmoothMovieMC, blueSmoothMovieMCPath, dimsOp, aff, reshape4D = True)
            out = bis_objects.bisImage().create(blueSmoothMovieRef,dimsOp,aff)
            out.save(blueSmoothMovieRefPath)
            np.save(opSmoothTransformBluePath, opSmoothTransformBlue)
       
        else:
            blueSmoothMovieMCObj = nb.Nifti1Image.load(blueSmoothMovieMCPath)
            blueSmoothMovieMC = blueSmoothMovieMCObj.get_fdata(dtype = np.float32).squeeze()
            blueSmoothMovieRefObj = nb.Nifti1Image.load(blueSmoothMovieRefPath)
            blueSmoothMovieRef = blueSmoothMovieRefObj.get_fdata(dtype = np.float32)
            opSmoothTransformBlue = np.load(opSmoothTransformBluePath)

        if not all([os.path.isfile(uvSmoothMovieMCPath),os.path.isfile(uvSmoothMovieRefPath),os.path.isfile(opSmoothTransformUvPath)]):
            uvSmoothMovieMC,uvSmoothMovieRef,opSmoothTransformUv = self.computeMotionCorrection(uvSmooth)
            self.writeNiiImg(uvSmoothMovieMC, uvSmoothMovieMCPath, dimsOp, aff, reshape4D = True) 
            out = bis_objects.bisImage().create(uvSmoothMovieRef,dimsOp,aff)
            out.save(uvSmoothMovieRefPath)
            np.save(opSmoothTransformUvPath, opSmoothTransformUv)
       

        else:
            uvSmoothMovieMCObj = nb.Nifti1Image.load(uvSmoothMovieMCPath)
            uvSmoothMovieMC = uvSmoothMovieMCObj.get_fdata(dtype = np.float32).squeeze()
            uvSmoothMovieRefObj = nb.Nifti1Image.load(uvSmoothMovieRefPath)
            uvSmoothMovieRef = uvSmoothMovieRefObj.get_fdata(dtype = np.float32)
            opSmoothTransformUv = np.load(opSmoothTransformUvPath)


        if not createMCRef:

            MCRefBlueComboPath = os.path.join(workdir,'MCRefBlueCombo.nii.gz')
            MCRefUvComboPath = os.path.join(workdir,'MCRefUvCombo.nii.gz')
            opTransformMCRefBluePath = os.path.join(workdir,'opTransformMCRefBlue.npy')
            opTransformMCRefUvPath = os.path.join(workdir,'opTransformMCRefUv.npy')

            if not all([os.path.isfile(MCRefBlueComboPath), os.path.isfile(opTransformMCRefBluePath)]):
                MCRefBlueCombo,_,opTransformMCRefBlue = self.computeMotionCorrection(blueSmoothMovieRef,regFrame=MCRefBlue)
                self.writeNiiImg(MCRefBlueCombo, MCRefBlueComboPath, dimsOp, aff, reshape4D = True)
                np.save(opTransformMCRefBluePath,opTransformMCRefBlue)

            else:
                MCRefBlueComboObj = nb.Nifti1Image.load(MCRefBlueComboPath)
                MCRefBlueCombo = MCRefBlueComboObj.get_fdata(dtype = np.float32).squeeze()
                opTransformMCRefBlue = np.load(opTransformMCRefBluePath)             

            if not all([os.path.isfile(MCRefUvComboPath), os.path.isfile(opTransformMCRefUvPath)]):
                MCRefUvCombo,_,opTransformMCRefUv = self.computeMotionCorrection(uvSmoothMovieRef,regFrame=MCRefUv)
                self.writeNiiImg(MCRefUvCombo, MCRefUvComboPath, dimsOp, aff, reshape4D = True)
                np.save(opTransformMCRefUvPath,opTransformMCRefUv)
            else:
                MCRefUvComboObj = nb.Nifti1Image.load(MCRefUvComboPath)
                MCRefUvCombo = MCRefUvComboObj.get_fdata(dtype = np.float32).squeeze()
                opTransformMCRefUv = np.load(opTransformMCRefUvPath)

            opSmoothTransformBlueConcat = np.zeros(opSmoothTransformBlue.shape)

            for frameNum in range(0,opSmoothTransformBlue.shape[2]):
                opSmoothTransformBlueConcat[:,:,frameNum]=np.matmul(opSmoothTransformBlue[:,:,frameNum],np.squeeze(opTransformMCRefBlue))

            opSmoothTransformUvConcat = np.zeros(opSmoothTransformUv.shape)

            for frameNum in range(0,opSmoothTransformUv.shape[2]):
                opSmoothTransformUvConcat[:,:,frameNum]=np.matmul(opSmoothTransformUv[:,:,frameNum],np.squeeze(opTransformMCRefUv))

        else:
            MCRefBlueCombo = blueSmoothMovieRef
            MCRefUvCombo = uvSmoothMovieRef
            opSmoothTransformBlueConcat=opSmoothTransformBlue
            opSmoothTransformUvConcat=opSmoothTransformUv

        ##### Apply motion correction to smooth 4 data with reslice and downsample x 2 ####


        blueMovieMCSmXfmPath = os.path.join(workdir,'calcium_blue_movie_mc_smoothXfm.nii.gz')
        uvMovieMCSmXfmPath = os.path.join(workdir,'calcium_uv_movie_mc_smoothXfm.nii.gz')
        
        if not os.path.isfile(blueMovieMCSmXfmPath):
            MCRefComboX, MCRefComboY = MCRefBlueCombo.shape
            MCRefBlueComboDS = calcium_image.resize(MCRefBlueCombo,[round(MCRefComboX/2),round(MCRefComboY/2)])
            blueMovieMCSmXfm = self.applyMotionCorrection(blueSmooth4,opSmoothTransformBlueConcat,ref = MCRefBlueComboDS)
            self.writeNiiImg(blueMovieMCSmXfm, blueMovieMCSmXfmPath, dimsOp, aff, reshape4D = True)
 
        else:
            blueMovieMCSmXfmObj = nb.Nifti1Image.load(blueMovieMCSmXfmPath)
            blueMovieMCSmXfm = blueMovieMCSmXfmObj.get_fdata(dtype=np.float32).squeeze()

        if not os.path.isfile(uvMovieMCSmXfmPath):
            MCRefComboX, MCRefComboY = MCRefUvCombo.shape
            MCRefUvComboDS = calcium_image.resize(MCRefUvCombo,[round(MCRefComboX/2),round(MCRefComboY/2)])
            uvMovieMCSmXfm = self.applyMotionCorrection(uvSmooth4,opSmoothTransformUvConcat,ref = MCRefUvComboDS)
            self.writeNiiImg(uvMovieMCSmXfm, uvMovieMCSmXfmPath, dimsOp, aff, reshape4D = True)
        else:
            uvMovieMCSmXfmObj = nb.Nifti1Image.load(uvMovieMCSmXfmPath)
            uvMovieMCSmXfm = uvMovieMCSmXfmObj.get_fdata(dtype=np.float32).squeeze()

        del blueMovie
        del uvMovie
        del blueSmooth
        del uvSmooth
        
        #### Test different levels of smoothing ####

        #blueMovieMCSmXfmSm3Path = os.path.join(workdir,'calcium_blue_movie_mc_smoothXfmSm3.nii.gz')
        #uvMovieMCSmXfmSm3Path = os.path.join(workdir,'calcium_uv_movie_mc_smoothXfmSm3.nii.gz')

        #blueMovieMCSmXfmSm5Path = os.path.join(workdir,'calcium_blue_movie_mc_smoothXfmSm5.nii.gz')
        #uvMovieMCSmXfmSm5Path = os.path.join(workdir,'calcium_uv_movie_mc_smoothXfmSm5.nii.gz')

        #blueMovieMCSmXfmSm7Path = os.path.join(workdir,'calcium_blue_movie_mc_smoothXfmSm7.nii.gz')
        #uvMovieMCSmXfmSm7Path = os.path.join(workdir,'calcium_uv_movie_mc_smoothXfmSm7.nii.gz')


        #if not os.path.isfile(blueMovieMCSmXfmSm3Path):
        #    blueMovieMCSmXfmSm3=self.smoothImage(blueMovieMCSmXfm,width=3)
        #    out = bis_objects.bisImage().create(blueMovieMCSmXfmSm3,[1,1,1,1,1],np.eye(4))
        #    out.save(blueMovieMCSmXfmSm3Path)
        #    del blueMovieMCSmXfmSm3
        #else:
        #    blueMovieMCSmXfmSm3Obj = nb.Nifti1Image.load(blueMovieMCSmXfmSm3Path)
        #    blueMovieMCSmXfmSm3 = blueMovieMCSmXfmSm3Obj.get_fdata(dtype=np.float32)

        #if not os.path.isfile(uvMovieMCSmXfmSm3Path):
        #    uvMovieMCSmXfmSm3=self.smoothImage(uvMovieMCSmXfm,width=3)
        #    out = bis_objects.bisImage().create(uvMovieMCSmXfmSm3,[1,1,1,1,1],np.eye(4))
        #    out.save(uvMovieMCSmXfmSm3Path)
        #    del uvMovieMCSmXfmSm3
        #else:
        #    uvMovieMCSmXfmSm3Obj = nb.Nifti1Image.load(uvMovieMCSmXfmSm3Path)
        #    uvMovieMCSmXfmSm3 = uvMovieMCSmXfmSm3Obj.get_fdata(dtype=np.float32)


        #if not os.path.isfile(blueMovieMCSmXfmSm5Path):
        #    blueMovieMCSmXfmSm5=self.smoothImage(blueMovieMCSmXfm,width=5)
        #    out = bis_objects.bisImage().create(blueMovieMCSmXfmSm5,[1,1,1,1,1],np.eye(4))
        #    out.save(blueMovieMCSmXfmSm5Path)
        #    del blueMovieMCSmXfmSm5
        #else:
        #    blueMovieMCSmXfmSm5Obj = nb.Nifti1Image.load(blueMovieMCSmXfmSm5Path)
        #    blueMovieMCSmXfmSm5 = blueMovieMCSmXfmSm5Obj.get_fdata(dtype=np.float32)

        #if not os.path.isfile(uvMovieMCSmXfmSm5Path):
        #    uvMovieMCSmXfmSm5=self.smoothImage(uvMovieMCSmXfm,width=5)
        #    out = bis_objects.bisImage().create(uvMovieMCSmXfmSm5,[1,1,1,1,1],np.eye(4))
        #    out.save(uvMovieMCSmXfmSm5Path)
        #    del uvMovieMCSmXfmSm5
        #else:
        #    uvMovieMCSmXfmSm5Obj = nb.Nifti1Image.load(uvMovieMCSmXfmSm5Path)
        #    uvMovieMCSmXfmSm5 = uvMovieMCSmXfmSm5Obj.get_fdata(dtype=np.float32)

        #if not os.path.isfile(blueMovieMCSmXfmSm7Path):
        #    blueMovieMCSmXfmSm7=self.smoothImage(blueMovieMCSmXfm,width=7)
        #    out = bis_objects.bisImage().create(blueMovieMCSmXfmSm7,[1,1,1,1,1],np.eye(4))
        #    out.save(blueMovieMCSmXfmSm7Path)
        #    del blueMovieMCSmXfmSm7
        #else:       
        #    blueMovieMCSmXfmSm7Obj = nb.Nifti1Image.load(blueMovieMCSmXfmSm7Path)
        #    blueMovieMCSmXfmSm7 = blueMovieMCSmXfmSm7Obj.get_fdata(dtype=np.float32)

        #if not os.path.isfile(uvMovieMCSmXfmSm7Path):
        #    uvMovieMCSmXfmSm7=self.smoothImage(uvMovieMCSmXfm,width=7)
        #    out = bis_objects.bisImage().create(uvMovieMCSmXfmSm7,[1,1,1,1,1],np.eye(4))
        #    out.save(uvMovieMCSmXfmSm7Path)
        #    del uvMovieMCSmXfmSm7
        #else:
        #    uvMovieMCSmXfmSm7Obj = nb.Nifti1Image.load(uvMovieMCSmXfmSm7Path)
        #    uvMovieMCSmXfmSm7 = uvMovieMCSmXfmSm7Obj.get_fdata(dtype=np.float32)

        ###########################

        if createMask:
            # Create Mask
            meanImgSq,imgNormMSESq, spatialMaskSq, meanImgMaskSq, stdImgSq, meanTSOrig, mask = self.MSEDiffImg(blueMovieMCSmXfm, numFramesToUse = 1500, medianFilter = 8, dilationIters = 4)
            # Save images
             
            out = bis_objects.bisImage().create(mask.astype('int'),dimsOp,aff)
            out.save(os.path.join(workdir,'MSEMask.nii.gz'))
            out = bis_objects.bisImage().create(imgNormMSESq,dimsOp,aff)
            out.save(os.path.join(workdir,'MSEImage.nii.gz'))

       
        # Photobleach correction
        blueMovieFiltered,uvMovieFiltered = calcium_analysis.expRegression(blueMovieMCSmXfm,uvMovieMCSmXfm,mask)

        if outputEveryStep:
            self.writeNiiImg(blueMovieFiltered, os.path.join(workdir,'calcium_blue_movie_mc_filt.nii.gz'), dimsOp, aff, reshape4D = True)
            self.writeNiiImg(uvMovieFiltered, os.path.join(workdir,'calcium_uv_movie_mc_filt.nii.gz'), dimsOp, aff, reshape4D = True)


        #### Two-wavelength Regression
        blueReg = calcium_analysis.twoWavelengthRegression(blueMovieFiltered,uvMovieFiltered,blueMovieMCSmXfm,uvMovieMCSmXfm,mask)
        #del uvMovieMCSmXfm
        del blueMovieFiltered 
        if outputEveryStep:
            self.writeNiiImg(blueReg, os.path.join(workdir,'calcium_blue_movie_mc_filt_regress.nii.gz'), dimsOp, aff, reshape4D = True)
            out = bis_objects.bisImage().create(blueReg,dimsOp,aff)
            out.save(os.path.join(workdir,'calcium_blue_movie_mc_filt_regress.nii.gz'))

        #### dF/F

        #blue
        #blueBPFilt = calcium_analysis.bandpassFilt(blueReg,mask)

        #if outputEveryStep:
        #    out = bis_objects.bisImage().create(blueBPFilt,[1,1,1,1,1],np.eye(4))
        #    out.save(os.path.join(workdir,'calcium_blue_movie_mc_filt_regress_bpfilt.nii.gz'))
        



       # blueDFF,uvDFF = calcium_analysis.dFF(blueMovieMCSmXfm,uvMovieFiltered,blueBPFilt,mask)

       # if outputEveryStep:
       #     out = bis_objects.bisImage().create(blueDFF,[1,1,1,1,1],np.eye(4))
       #     out.save(os.path.join(workdir,'calcium_blue_movie_mc_filt_regress_bpfilt_dff.nii.gz'))
       #     out = bis_objects.bisImage().create(uvDFF,[1,1,1,1,1],np.eye(4))
       #     out.save(os.path.join(workdir,'calcium_uv_movie_mc_filt_regress_dff.nii.gz'))
        
        # for memory
        blueMovie = []
        uvMovie = []
        out = bis_objects.bisImage().create(blueReg,dimsOp,aff)
        self.outputs['blueout']=out
        out = bis_objects.bisImage().create(uvMovieMCSmXfm,dimsOp,aff)
        self.outputs['uvout']=out
        
        
        return True

if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(calciumPreprocess(),sys.argv,False));



    
