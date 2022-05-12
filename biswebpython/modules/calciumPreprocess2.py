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


dir_path = os.path.dirname(os.path.realpath(__file__))

sys.path.append(dir_path.replace('biswebpython/modules',''))

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
from skimage.transform import resize as skresize
from skimage import img_as_bool

class calciumPreprocess(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='calciumPreprocess';
   
    def createDescription(self):
        return {
            "name": "Calcium Preprocess",
            "description": "Preprocesses calcium images. Smoothing, motion correction, photobleach correction and two-wavelength regression",
            "authors": ["Dave O'Connor","Jackson Zhaoxiong Ding"],
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input image (signal, e.g. cyan wavelength) to preprocess",
                    "varname": "signal",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input image (physio noise, e.g. uv wavelength) to preprocess",
                    "varname": "noise",
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
                    "name": "Signal wavelength Motion Reference",
                    "description": "A reference frame to motion correct the signal data to",
                    "varname": "mcrefsignal",
                    "required": False
                },
                {
                    "type": "image",
                    "name": "Noise wavelength Input Motion Reference",
                    "description": "A UV wavelength reference frame to motion correct the data to",
                    "varname": "mcrefnoise",
                    "required": False
                }
            ],
            "outputs": [
                {
                    "type": "image",
                    "name": "Output Image",
                    "description": "The output image",
                    "varname": "signalout",
                    "shortname": "so",
                    "required": True,
                    "extension": ".nii.gz"
                },
                {
                    "type": "image",
                    "name": "Output Image",
                    "description": "The output image",
                    "varname": "noiseout",
                    "shortname": "no",
                    "required": True,
                    "extension": ".nii.gz"
                }
            ],
            "params": [
                {
                    "type": "str",
                    "name": "Input optical trigger",
                    "description": "The order of the different wavelength images specified in signal",
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
                    "name": "Dual Channel?",
                    "description": "Is the input dual channel?",
                    "varname": "dual",
                    "type": "boolean",
                    "default": True
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
                {
                    "name": "Start Only",
                    "description": "Only run pipeline up to outputting input data as nifti",
                    "varname": "startonly",
                    "type": "boolean",
                    "default": False
                },
                {
                    "type": "str",
                    "name": "pipeline segment run",
                    "description": "Portion of pipeline to run (Spatial/Temporal/Both)",
                    "varname": "runoption",
                    "required": True,
                    "default": 'Both'
                }




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

        opImg=np.zeros(ipImageShape,dtype='float32')
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
            opImg=np.zeros([xDimRes,yDimRes,numFrames],dtype='float32')
            ref = bis_objects.bisImage().create(ref,[2,2,2,1,1],np.eye(4))
        else:
            opImg=np.zeros([xDim,yDim,numFrames],dtype='float32')


        for frame in range(0,numFrames):
            extractedFrame= image[:,:,frame]
            frameXfm = transform[:,:,frame]
            frameXfmBis = bis_objects.bisMatrix()
            frameXfmBis.create(frameXfm)
            ipImg = bis_objects.bisImage().create(extractedFrame,[1,1,1,1,1],np.eye(4))
            doReslice=resliceImage()
            #params = {"dimensions": [xDimRes,yDimRes,1],"spacing": [2.0,2.0,2.0],"interpolation":1}
             
            fileSpec={'input' :  ipImg,
                    'reference': ref,
                    'xform':frameXfmBis}
            paramSpec = {'debug':True}
            doReslice.execute(fileSpec)
            opImgObj=doReslice.getOutputObject('output')
            opImg[:,:,frame]=np.squeeze(opImgObj.get_data())

        return opImg

           
    def checkTriggers(ipMovie,expectedStructure=[0,1],ipTriggerFile=None):
        
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
        opImg=np.zeros(ipImg.shape,dtype='float32')
        print('Applying median filter of width:',width,' to the data, may take a while')
        for i in range(nFrames):
            opImg[:,:,i]=ski.filters.median(ipImg[:,:,i],selem = se)
            

        return opImg

    def writeNiiImg(self,opArr, opname, opDims, opAffine, reshape4D = False):
        
        imgShape = opArr.shape

        if len(imgShape) == 2:
            imgX,imgY = imgShape

            if reshape4D:
                opArr = np.reshape(opArr,[imgX,imgY,1,1])

        elif len(imgShape) == 3:
            imgX,imgY,imgT = imgShape

            if reshape4D:
                opArr = np.reshape(opArr,[imgX,imgY,1,imgT])

        elif len(imgShape) == 4:
            imgX,imgY,_,imgT = imgShape      
        else:
            raise Exception('Images to be saved should be 2, 3 or 4D')      

        out = bis_objects.bisImage().create(opArr,opDims,opAffine)
        out.save(opname)

    def loadNiiImgDiffOrient(self,ipName):
        ipObj = nb.Nifti1Image.load(ipName)

        orient = ''.join(list(nb.aff2axcodes(ipObj.affine))).lower()

        if orient == 'rpi':
            pass
        elif orient == 'lps':
            ipObj = ipObj.slicer[::-1,:,::-1]
        elif orient == 'ras':
            ipObj = ipObj.slicer[:,::-1,::-1]
        else:
            raise Exception('Orientation not set to rpi or lps, may load data array in mis-oriented')


        orientNew = ''.join(list(nb.aff2axcodes(ipObj.affine))).lower()
        assert orientNew == 'rpi'
        imData = ipObj.get_fdata(dtype = np.float32)

        return imData

    def processDictEntry(self, ipDict, opFold = None, dimsOp = None, aff = None, reshape4D = True, fsuffix = '.nii.gz', loadData = False):


        precursor = '_'.join(ipDict['precursor'])

        if opFold != None:
            oppath = os.path.join(opFold,precursor+fsuffix)


        if fsuffix not in ['.nii','.nii.gz','.npy']:
            raise Exception('Function "processDictEntry" can only load/save nifti or numpy file types')  

        if 'data' in ipDict:

            if (fsuffix == '.nii.gz') or (fsuffix == '.nii'):

                if not os.path.isfile(oppath):
                    print('##### writing to: ',oppath)    
                    self.writeNiiImg(ipDict['data'], oppath, dimsOp, aff, reshape4D = True)
                else:
                    print('##### file already exists: ',oppath)

            elif fsuffix == '.npy':
                if not os.path.isfile(oppath):
                    print('##### writing to: ',oppath)    
                    np.save(oppath, ipDict['data'])
                else:
                    print('##### file already exists: ',oppath)


        else:

            if not os.path.isfile(oppath):
                return False

            else:

                if loadData:

                    if '.nii' in fsuffix:
                        print('##### loading: ',oppath)    
                        return self.loadNiiImgDiffOrient(oppath).squeeze()

                    elif fsuffix == '.npy':
                        print('##### loading: ',oppath)    
                        return np.load(oppath, allow_pickle=True)

                else:
                    return True


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        ######## Parsing Parameters
        dualChannel = self.parseBoolean(vals['dual'])
        debug=self.parseBoolean(vals['debug'])
        workdir=vals['workdir']
        createMask=self.parseBoolean(vals['createmask'])
        createMCRef=self.parseBoolean(vals['createmcref'])
        segnum = vals['segnum']
        startOnly = self.parseBoolean(vals['startonly'])
        runoption = vals['runoption'].lower()
        outputEveryStep = debug

        assert runoption in ['spatial','temporal','both']

        #### Desired output nifti configs for data prior to downsampling, would be good to have as input alongside tiff files
        #### Input nifti files can keep the same parameters
        dimsOp = [0.025,0.025,0.025,1]
        aff = np.eye(4)
        aff[1,1] = -1
        aff[2,2] = -1
        aff = aff * 0.025
        aff[3,3] = 1


        dimsOpDs = [0.05,0.05,0.05,1]
        affDs = np.eye(4)
        affDs[1,1] = -1
        affDs[2,2] = -1
        affDs = affDs * 0.05
        affDs[3,3] = 1
        
        #### Ideal Future setup
        ## We may have different neural sensitive wavelengths in future
        ## We wanna do spatial stuff on separate parts, smoothing and moco and d/sampling
        ## We wanna group together image parts for temproal processing


        preprocStepsBlue = ['raw','smooth16','moco','smooth4','photob','wvlthreg']
        preproceStepsUV = ['raw','smooth16','moco','smooth4','photob']

        fileManageDict = {}


        fileManageDict['WLSignal1'] = {}
        fileManageDict['WLNoise1'] = {}


        if not createMCRef and runoption != 'temporal':
            fileManageDict['WLSignal1']['mcref'] = {}
            fileManageDict['WLSignal1']['mcref']['data'] = self.inputs['mcrefsignal'].get_data()
            fileManageDict['WLSignal1']['mcref']['precursor'] = ['raw','mcref']

            fileManageDict['WLNoise1']['mcref'] = {}
            fileManageDict['WLNoise1']['mcref']['data'] = self.inputs['mcrefnoise'].get_data()
            fileManageDict['WLNoise1']['mcref']['precursor'] = ['raw','mcref']


        else:
        
            fileManageDict['WLSignal1']['mcref'] = {}
            fileManageDict['WLSignal1']['mcref']['precursor'] = ['raw','mcref']

            fileManageDict['WLNoise1']['mcref'] = {}
            fileManageDict['WLNoise1']['mcref']['precursor'] = ['raw','mcref']



        if (not createMask) and (self.inputs['mask'] != None):
            fileManageDict['WLSignal1']['mask'] = {}
            fileManageDict['WLNoise1']['mask'] = {}
            
            fileManageDict['WLSignal1']['mask']['data'] = np.squeeze(self.inputs['mask'].get_data().astype(int))
            fileManageDict['WLSignal1']['mask']['precursor'] = ['mask']

            fileManageDict['WLNoise1']['mask']['data'] = np.squeeze(self.inputs['mask'].get_data().astype(int))


        elif (not createMask) and ('mask' not in self.inputs) and (runoption != 'spatial'):
            raise Exception('If createMask != True you must give the path to a mask')

        elif runoption == 'spatial':
            pass



         # Load inputs

        if self.inputs['noise'] == None:


            inputTrigs = vals['opticalorder']
            inputTrigs=pd.read_csv(inputTrigs,index_col=0)
            opticalOrder=inputTrigs['opticalOrder'].values

            inputMovie = self.inputs['signal'].get_data().astype(np.float32)

            inputShape = inputMovie.shape
            inputLen = inputShape[-1]

            opticalOrder = opticalOrder[:inputLen]

            # Check triggers!
            fileManageDict['WLSignal1']['raw'] = {}
            fileManageDict['WLNoise1']['raw'] = {}

            fileManageDict['WLSignal1']['raw']['data'] = inputMovie[:,:,opticalOrder == 1]
            fileManageDict['WLNoise1']['raw']['data'] = inputMovie[:,:,opticalOrder == 2]

            
            fileManageDict['WLSignal1']['raw']['precursor'] = ['rawsignl']
            fileManageDict['WLNoise1']['raw']['precursor'] = ['rawnoise']


            del inputMovie


        else:

            fileManageDict['WLSignal1']['raw'] = {}
            fileManageDict['WLNoise1']['raw'] = {}
            
            fileManageDict['WLSignal1']['raw']['precursor'] = ['rawsignl']
            fileManageDict['WLNoise1']['raw']['precursor'] = ['rawnoise']

            fileManageDict['WLSignal1']['raw']['data'] = self.inputs['signal'].get_data().astype(np.float32).squeeze()
            fileManageDict['WLNoise1']['raw']['data'] = self.inputs['noise'].get_data().astype(np.float32).squeeze()




        signalMovieSize = fileManageDict['WLSignal1']['raw']['data'].shape
        noiseMovieSize = fileManageDict['WLNoise1']['raw']['data'].shape

        if outputEveryStep and self.inputs['noise'] == None:

            self.processDictEntry(fileManageDict['WLSignal1']['raw'], opFold = workdir,dimsOp = dimsOp, aff = aff, reshape4D=True)

            self.processDictEntry(fileManageDict['WLNoise1']['raw'], opFold = workdir,dimsOp = dimsOp, aff = aff, reshape4D=True)


        if startOnly:
            print('Executing start only')
            sys.exit()






        if runoption == 'spatial' or runoption == 'both':
            ##############################################
            ############## Spatial Operations ############
            ##############################################

            #### Smooth Data 16 Filt ######

            
            fileManageDict['WLSignal1']['smooth16'] = {}
            fileManageDict['WLSignal1']['smooth16']['precursor'] = ['rawsignl','smooth16']


            fileManageDict['WLNoise1']['smooth16'] = {}
            fileManageDict['WLNoise1']['smooth16']['precursor'] = ['rawnoise','smooth16']


            fileManageDict['WLSignal1']['moco16'] = {}
            fileManageDict['WLSignal1']['moco16']['precursor'] = ['rawsignl','smooth16','moco']


            fileManageDict['WLNoise1']['moco16'] = {}
            fileManageDict['WLNoise1']['moco16']['precursor'] = ['rawnoise','smooth16','moco']







            if not self.processDictEntry(fileManageDict['WLSignal1']['moco16'], opFold = workdir):

                if not self.processDictEntry(fileManageDict['WLSignal1']['smooth16'], opFold = workdir):

                    fileManageDict['WLSignal1']['smooth16']['data'] = self.smoothImage(fileManageDict['WLSignal1']['raw']['data'])


                    self.processDictEntry(fileManageDict['WLSignal1']['smooth16'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)

                else:

                    fileManageDict['WLSignal1']['smooth16']['data'] = self.processDictEntry(fileManageDict['WLSignal1']['smooth16'], loadData = True, opFold = workdir)


                if not self.processDictEntry(fileManageDict['WLNoise1']['smooth16'], opFold = workdir):

                    fileManageDict['WLNoise1']['smooth16']['data'] = self.smoothImage(fileManageDict['WLNoise1']['raw']['data'])

                    self.processDictEntry(fileManageDict['WLNoise1']['smooth16'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)

                else:

                    fileManageDict['WLNoise1']['smooth16']['data'] = self.processDictEntry(fileManageDict['WLNoise1']['smooth16'], loadData = True, opFold = workdir)

            else:
                fileManageDict['WLSignal1']['smooth16']['data'] = self.processDictEntry(fileManageDict['WLSignal1']['smooth16'], loadData = True, opFold = workdir)
                fileManageDict['WLNoise1']['smooth16']['data'] = self.processDictEntry(fileManageDict['WLNoise1']['smooth16'], loadData = True, opFold = workdir)


            #### Smooth Data 4 Filt ######

            
            fileManageDict['WLSignal1']['smooth4'] = {}
            fileManageDict['WLSignal1']['smooth4']['precursor'] = ['rawsignl','smooth4']


            fileManageDict['WLNoise1']['smooth4'] = {}
            fileManageDict['WLNoise1']['smooth4']['precursor'] = ['rawnoise','smooth4']

            if not self.processDictEntry(fileManageDict['WLSignal1']['smooth4'], opFold = workdir):

                fileManageDict['WLSignal1']['smooth4']['data'] = self.smoothImage(fileManageDict['WLSignal1']['raw']['data'], width = 4)

                self.processDictEntry(fileManageDict['WLSignal1']['smooth4'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
     
            else:
                fileManageDict['WLSignal1']['smooth4']['data'] = self.processDictEntry(fileManageDict['WLSignal1']['smooth4'], loadData = True, opFold = workdir)


            if not self.processDictEntry(fileManageDict['WLNoise1']['smooth4'], opFold = workdir):

                fileManageDict['WLNoise1']['smooth4']['data'] = self.smoothImage(fileManageDict['WLNoise1']['raw']['data'], width = 4)

                self.processDictEntry(fileManageDict['WLNoise1']['smooth4'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
     
            else:
                fileManageDict['WLNoise1']['smooth4']['data'] = self.processDictEntry(fileManageDict['WLNoise1']['smooth4'], loadData = True, opFold = workdir)






            #### Motion correction of raw data for comparison ####
       

            #fileManageDict['WLSignal1']['mocoraw'] = {}
            #fileManageDict['WLSignal1']['mocoraw']['precursor'] = ['rawsignl','moco']
            #fileManageDict['WLSignal1']['mocoraw']['refimg'] = {}
            #fileManageDict['WLSignal1']['mocoraw']['refimg']['precursor'] = ['rawsignl','moco','refimg']
            #fileManageDict['WLSignal1']['mocoraw']['transform'] = {}
            #fileManageDict['WLSignal1']['mocoraw']['transform']['precursor'] = ['rawsignl','moco','xfm']


            #fileManageDict['WLNoise1']['mocoraw'] = {}
            #fileManageDict['WLNoise1']['mocoraw']['precursor'] = ['rawnoise','moco']
            #fileManageDict['WLNoise1']['mocoraw']['refimg'] = {}
            #fileManageDict['WLNoise1']['mocoraw']['refimg']['precursor'] = ['rawnoise','moco','refimg']
            #fileManageDict['WLNoise1']['mocoraw']['transform'] = {}
            #fileManageDict['WLNoise1']['mocoraw']['transform']['precursor'] = ['rawnoise','moco','xfm']

     

            #rawMocoFileCheck = all([self.processDictEntry(fileManageDict['WLSignal1']['mocoraw'], opFold = workdir), 
            #                        self.processDictEntry(fileManageDict['WLSignal1']['mocoraw']['refimg'], opFold = workdir), 
            #                        self.processDictEntry(fileManageDict['WLSignal1']['mocoraw']['transform'], opFold = workdir, fsuffix = '.npy')])


            #if not rawMocoFileCheck:

            #    fileManageDict['WLSignal1']['mocoraw']['data'], \
            #    fileManageDict['WLSignal1']['mocoraw']['refimg']['data'], \
            #    fileManageDict['WLSignal1']['mocoraw']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLSignal1']['raw']['data'])



            #    self.processDictEntry(fileManageDict['WLSignal1']['mocoraw'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
            #    self.processDictEntry(fileManageDict['WLSignal1']['mocoraw']['refimg'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = False)
            #    self.processDictEntry(fileManageDict['WLSignal1']['mocoraw']['transform'], opFold = workdir, fsuffix = '.npy')


            #else:
            #    fileManageDict['WLSignal1']['mocoraw']['data'] = \
            #        self.processDictEntry(fileManageDict['WLSignal1']['mocoraw'], loadData = True, opFold = workdir)

            #    fileManageDict['WLSignal1']['mocoraw']['refimg']['data'] = \
            #        self.processDictEntry(fileManageDict['WLSignal1']['mocoraw']['refimg'], loadData = True, opFold = workdir)

            #    fileManageDict['WLSignal1']['mocoraw']['transform']['data'] = \
            #        self.processDictEntry(fileManageDict['WLSignal1']['mocoraw']['transform'], loadData = True, fsuffix = '.npy', opFold = workdir)

            #del blueMovieMC

            #rawMocoFileCheck = all([self.processDictEntry(fileManageDict['WLNoise1']['mocoraw'], opFold = workdir), 
            #                        self.processDictEntry(fileManageDict['WLNoise1']['mocoraw']['refimg'], opFold = workdir), 
            #                        self.processDictEntry(fileManageDict['WLNoise1']['mocoraw']['transform'], opFold = workdir, fsuffix = '.npy')])


            #if not rawMocoFileCheck:

            #    fileManageDict['WLNoise1']['mocoraw']['data'], \
            #    fileManageDict['WLNoise1']['mocoraw']['refimg']['data'], \
            #    fileManageDict['WLNoise1']['mocoraw']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLNoise1']['raw']['data'])



            #    self.processDictEntry(fileManageDict['WLNoise1']['mocoraw'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
            #    self.processDictEntry(fileManageDict['WLNoise1']['mocoraw']['refimg'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = False)
            #    self.processDictEntry(fileManageDict['WLNoise1']['mocoraw']['transform'], opFold = workdir, fsuffix = '.npy')


            #else:
            #    fileManageDict['WLNoise1']['mocoraw']['data'] = \
            #        self.processDictEntry(fileManageDict['WLNoise1']['mocoraw'], loadData = True, opFold = workdir)

           #     fileManageDict['WLNoise1']['mocoraw']['refimg']['data'] = \
           #         self.processDictEntry(fileManageDict['WLNoise1']['mocoraw']['refimg'], loadData = True, opFold = workdir)

           #     fileManageDict['WLNoise1']['mocoraw']['transform']['data'] = \
           #         self.processDictEntry(fileManageDict['WLNoise1']['mocoraw']['transform'], loadData = True, fsuffix = '.npy', opFold = workdir)


            #del uvMovieMC


            #Memory management: Remove raw data from dict
            del fileManageDict['WLNoise1']['raw']['data']
            del fileManageDict['WLSignal1']['raw']['data']




            #### Motion correction  calculation on smooth 16 data ####


            fileManageDict['WLSignal1']['moco16'] = {}
            fileManageDict['WLSignal1']['moco16']['precursor'] = ['rawsignl','smooth16','moco']
            fileManageDict['WLSignal1']['moco16']['refimg'] = {}
            fileManageDict['WLSignal1']['moco16']['refimg']['precursor'] = ['rawsignl','smooth16','moco','refimg']
            fileManageDict['WLSignal1']['moco16']['transform'] = {}
            fileManageDict['WLSignal1']['moco16']['transform']['precursor'] = ['rawsignl','smooth16','moco','xfm']


            fileManageDict['WLNoise1']['moco16'] = {}
            fileManageDict['WLNoise1']['moco16']['precursor'] = ['rawnoise','smooth16','moco']
            fileManageDict['WLNoise1']['moco16']['refimg'] = {}
            fileManageDict['WLNoise1']['moco16']['refimg']['precursor'] = ['rawnoise','smooth16','moco','refimg']
            fileManageDict['WLNoise1']['moco16']['transform'] = {}
            fileManageDict['WLNoise1']['moco16']['transform']['precursor'] = ['rawnoise','smooth16','moco','xfm']



            smth16MocoFileCheck = all([self.processDictEntry(fileManageDict['WLSignal1']['moco16'], opFold = workdir), 
                                    self.processDictEntry(fileManageDict['WLSignal1']['moco16']['refimg'], opFold = workdir), 
                                    self.processDictEntry(fileManageDict['WLSignal1']['moco16']['transform'], opFold = workdir, fsuffix = '.npy')])


            if not smth16MocoFileCheck:

                fileManageDict['WLSignal1']['moco16']['data'], \
                fileManageDict['WLSignal1']['moco16']['refimg']['data'], \
                fileManageDict['WLSignal1']['moco16']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLSignal1']['smooth16']['data'])



                self.processDictEntry(fileManageDict['WLSignal1']['moco16'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
                self.processDictEntry(fileManageDict['WLSignal1']['moco16']['refimg'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = False)
                self.processDictEntry(fileManageDict['WLSignal1']['moco16']['transform'], opFold = workdir, fsuffix = '.npy')


            else:
                fileManageDict['WLSignal1']['moco16']['data'] = \
                    self.processDictEntry(fileManageDict['WLSignal1']['moco16'], loadData = True, opFold = workdir)

                fileManageDict['WLSignal1']['moco16']['refimg']['data'] = \
                    self.processDictEntry(fileManageDict['WLSignal1']['moco16']['refimg'], loadData = True, opFold = workdir)

                fileManageDict['WLSignal1']['moco16']['transform']['data'] = \
                    self.processDictEntry(fileManageDict['WLSignal1']['moco16']['transform'], loadData = True, fsuffix = '.npy', opFold = workdir)



            smth16MocoFileCheck = all([self.processDictEntry(fileManageDict['WLNoise1']['moco16'], opFold = workdir), 
                                    self.processDictEntry(fileManageDict['WLNoise1']['moco16']['refimg'], opFold = workdir), 
                                    self.processDictEntry(fileManageDict['WLNoise1']['moco16']['transform'], opFold = workdir, fsuffix = '.npy')])


            if not smth16MocoFileCheck:

                fileManageDict['WLNoise1']['moco16']['data'], \
                fileManageDict['WLNoise1']['moco16']['refimg']['data'], \
                fileManageDict['WLNoise1']['moco16']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLNoise1']['smooth16']['data'])



                self.processDictEntry(fileManageDict['WLNoise1']['moco16'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
                self.processDictEntry(fileManageDict['WLNoise1']['moco16']['refimg'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = False)
                self.processDictEntry(fileManageDict['WLNoise1']['moco16']['transform'], opFold = workdir, fsuffix = '.npy')



            else:
                fileManageDict['WLNoise1']['moco16']['data'] = \
                    self.processDictEntry(fileManageDict['WLNoise1']['moco16'], loadData = True, opFold = workdir)

                fileManageDict['WLNoise1']['moco16']['refimg']['data'] = \
                    self.processDictEntry(fileManageDict['WLNoise1']['moco16']['refimg'], loadData = True, opFold = workdir)

                fileManageDict['WLNoise1']['moco16']['transform']['data'] = \
                    self.processDictEntry(fileManageDict['WLNoise1']['moco16']['transform'], loadData = True, fsuffix = '.npy', opFold = workdir)





            if not createMCRef:

                fileManageDict['WLSignal1']['refcombo'] = {}
                fileManageDict['WLSignal1']['refcombo']['precursor'] = ['rawsignl','refcombo']
                fileManageDict['WLSignal1']['refcombo']['transform'] = {}
                fileManageDict['WLSignal1']['refcombo']['transform']['precursor'] = ['rawsignl','refcombo','xfm']

                fileManageDict['WLNoise1']['refcombo'] = {}
                fileManageDict['WLNoise1']['refcombo']['precursor'] = ['rawnoise','refcombo']
                fileManageDict['WLNoise1']['refcombo']['transform'] = {}
                fileManageDict['WLNoise1']['refcombo']['transform']['precursor'] = ['rawnoise','refcombo','xfm']


                comboMocoFileCheck = all([self.processDictEntry(fileManageDict['WLSignal1']['refcombo'], opFold = workdir), 
                            self.processDictEntry(fileManageDict['WLSignal1']['refcombo']['transform'], opFold = workdir, fsuffix = '.npy')])


                if not comboMocoFileCheck:

                    fileManageDict['WLSignal1']['refcombo']['data'], \
                    _, \
                    fileManageDict['WLSignal1']['refcombo']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLSignal1']['moco16']['refimg']['data'], \
                                                                                    regFrame = fileManageDict['WLSignal1']['mcref']['data'])

                    self.processDictEntry(fileManageDict['WLSignal1']['refcombo'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
                    self.processDictEntry(fileManageDict['WLSignal1']['refcombo']['transform'], opFold = workdir, fsuffix = '.npy')


                else:

                    fileManageDict['WLSignal1']['refcombo']['data'] = \
                        self.processDictEntry(fileManageDict['WLSignal1']['moco16'], loadData = True, opFold = workdir)

                    fileManageDict['WLSignal1']['refcombo']['transform']['data'] = \
                        self.processDictEntry(fileManageDict['WLSignal1']['refcombo']['transform'], loadData = True, fsuffix = '.npy', opFold = workdir)            




                comboMocoFileCheck = all([self.processDictEntry(fileManageDict['WLNoise1']['refcombo'], opFold = workdir), 
                            self.processDictEntry(fileManageDict['WLNoise1']['refcombo']['transform'], opFold = workdir, fsuffix = '.npy')])


                if not comboMocoFileCheck:

                    fileManageDict['WLNoise1']['refcombo']['data'], \
                    _, \
                    fileManageDict['WLNoise1']['refcombo']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLNoise1']['moco16']['refimg']['data'], \
                                                                                    regFrame = fileManageDict['WLNoise1']['mcref']['data'])

                    self.processDictEntry(fileManageDict['WLNoise1']['refcombo'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
                    self.processDictEntry(fileManageDict['WLNoise1']['refcombo']['transform'], opFold = workdir, fsuffix = '.npy')


                else:

                    fileManageDict['WLNoise1']['refcombo']['data'] = \
                        self.processDictEntry(fileManageDict['WLNoise1']['refcombo'], loadData = True, opFold = workdir)

                    fileManageDict['WLNoise1']['refcombo']['transform']['data'] = \
                        self.processDictEntry(fileManageDict['WLNoise1']['refcombo']['transform'], loadData = True, fsuffix = '.npy', opFold = workdir)            



                opSmoothTransformSignalConcat = np.zeros(fileManageDict['WLSignal1']['moco16']['transform']['data'].shape)

                for frameNum in range(0,fileManageDict['WLSignal1']['moco16']['transform']['data'].shape[2]):

                    opSmoothTransformSignalConcat[:,:,frameNum] = \
                    np.matmul(fileManageDict['WLSignal1']['moco16']['transform']['data'][:,:,frameNum], \
                    fileManageDict['WLSignal1']['refcombo']['transform']['data'])

                
                fileManageDict['WLSignal1']['refcombo']['transform']['data'] = opSmoothTransformSignalConcat

                opSmoothTransformNoiseConcat = np.zeros(fileManageDict['WLNoise1']['moco16']['transform']['data'].shape)

                for frameNum in range(0,fileManageDict['WLNoise1']['moco16']['transform']['data'].shape[2]):
                    opSmoothTransformNoiseConcat[:,:,frameNum] = \
                    np.matmul(fileManageDict['WLNoise1']['moco16']['transform']['data'][:,:,frameNum], \
                    fileManageDict['WLNoise1']['refcombo']['transform']['data'])

                
                fileManageDict['WLNoise1']['refcombo']['transform']['data'] = opSmoothTransformNoiseConcat

            else:
                fileManageDict['WLSignal1']['refcombo'] = {}
                fileManageDict['WLSignal1']['refcombo']['precursor'] = ['rawsignl','refcombo']
                fileManageDict['WLSignal1']['refcombo']['transform'] = {}
                fileManageDict['WLSignal1']['refcombo']['transform']['precursor'] = ['rawsignl','refcombo','xfm']

                fileManageDict['WLNoise1']['refcombo'] = {}
                fileManageDict['WLNoise1']['refcombo']['precursor'] = ['rawnoise','refcombo']
                fileManageDict['WLNoise1']['refcombo']['transform'] = {}
                fileManageDict['WLNoise1']['refcombo']['transform']['precursor'] = ['rawnoise','refcombo','xfm']

                fileManageDict['WLSignal1']['refcombo']['data'] = fileManageDict['WLSignal1']['moco16']['refimg']['data']
                fileManageDict['WLNoise1']['refcombo']['data'] = fileManageDict['WLNoise1']['moco16']['refimg']['data']
                fileManageDict['WLSignal1']['refcombo']['transform']['data'] = fileManageDict['WLSignal1']['moco16']['transform']['data']
                fileManageDict['WLNoise1']['refcombo']['transform']['data'] = fileManageDict['WLNoise1']['moco16']['transform']['data']

            #Memory management: Remove smooth16 from dict
            del fileManageDict['WLSignal1']['smooth16']['data']
            del fileManageDict['WLNoise1']['smooth16']['data']




            ##### Apply motion correction to smooth 4 data with reslice and downsample x 2 ####


            fileManageDict['WLSignal1']['mocoSmthXfm'] = {}
            fileManageDict['WLSignal1']['mocoSmthXfm']['precursor'] = ['rawsignl','smooth4','mococombo']

            fileManageDict['WLNoise1']['mocoSmthXfm'] = {}
            fileManageDict['WLNoise1']['mocoSmthXfm']['precursor'] = ['rawnoise','smooth4','mococombo']



            
            if not self.processDictEntry(fileManageDict['WLSignal1']['mocoSmthXfm'], opFold = workdir):

                MCRefComboX, MCRefComboY = fileManageDict['WLSignal1']['refcombo']['data'].shape

                MCRefComboDS = calcium_image.resize(fileManageDict['WLSignal1']['refcombo']['data'],[round(MCRefComboX/2),round(MCRefComboY/2)])

                fileManageDict['WLSignal1']['mocoSmthXfm']['data'] = \
                    self.applyMotionCorrection(fileManageDict['WLSignal1']['smooth4']['data'], \
                    fileManageDict['WLSignal1']['refcombo']['transform']['data'], \
                    ref = MCRefComboDS)

                self.processDictEntry(fileManageDict['WLSignal1']['mocoSmthXfm'], opFold = workdir, dimsOp = dimsOpDs, aff = affDs, reshape4D = True)

     
            else:
                fileManageDict['WLSignal1']['mocoSmthXfm']['data'] = \
                    self.processDictEntry(fileManageDict['WLSignal1']['mocoSmthXfm'], loadData = True, opFold = workdir)  



            
            if not self.processDictEntry(fileManageDict['WLNoise1']['mocoSmthXfm'], opFold = workdir):

                MCRefComboX, MCRefComboY = fileManageDict['WLSignal1']['refcombo']['data'].shape

                MCRefComboDS = calcium_image.resize(fileManageDict['WLSignal1']['refcombo']['data'],[round(MCRefComboX/2),round(MCRefComboY/2)])

                xfmToApply = fileManageDict['WLSignal1']['refcombo']['transform']['data']


                while xfmToApply.shape[2] != fileManageDict['WLNoise1']['smooth4']['data'].shape[2]:

                    if xfmToApply.shape[2] < fileManageDict['WLNoise1']['smooth4']['data'].shape[2]:
                        xfmToApply = np.dstack((xfmToApply,xfmToApply[:,:,-1]))

                    elif xfmToApply.shape[2] > fileManageDict['WLNoise1']['smooth4']['data'].shape[2]:
                        xfmToApply = np.delete(xfmToApply,-1,-1)


                fileManageDict['WLNoise1']['mocoSmthXfm']['data'] = \
                    self.applyMotionCorrection(fileManageDict['WLNoise1']['smooth4']['data'], \
                    xfmToApply, \
                    ref = MCRefComboDS)

                self.processDictEntry(fileManageDict['WLNoise1']['mocoSmthXfm'], opFold = workdir, dimsOp = dimsOpDs, aff = affDs, reshape4D = True)

     
            else:
                fileManageDict['WLNoise1']['mocoSmthXfm']['data'] = \
                    self.processDictEntry(fileManageDict['WLNoise1']['mocoSmthXfm'], loadData = True, opFold = workdir)  


            #Memory management: Remove smooth4 from dict
            del fileManageDict['WLSignal1']['smooth4']['data']
            del fileManageDict['WLNoise1']['smooth4']['data']



            if runoption == 'spatial':


                out = bis_objects.bisImage().create(fileManageDict['WLSignal1']['mocoSmthXfm']['data'], dimsOpDs, affDs)
                self.outputs['signalout']=out
                out = bis_objects.bisImage().create(fileManageDict['WLNoise1']['mocoSmthXfm']['data'], dimsOpDs, affDs)
                self.outputs['noiseout']=out


                return True

 
        if runoption == 'temporal' or runoption == 'both':


            if runoption == 'temporal':

                fileManageDict['WLSignal1']['mocoSmthXfm'] = {}
                fileManageDict['WLSignal1']['mocoSmthXfm']['precursor'] = ['rawsignl','smooth4','mococombo']
                fileManageDict['WLSignal1']['mocoSmthXfm']['data'] = fileManageDict['WLSignal1']['raw']['data']

                fileManageDict['WLNoise1']['mocoSmthXfm'] = {}
                fileManageDict['WLNoise1']['mocoSmthXfm']['precursor'] = ['rawsignl','smooth4','mococombo']
                fileManageDict['WLNoise1']['mocoSmthXfm']['data'] = fileManageDict['WLNoise1']['raw']['data']

        
            if createMask:

                fileManageDict['WLSignal1']['mask'] = {}
                fileManageDict['WLSignal1']['mask']['precursor'] = ['mask']

                # Create Mask
                meanImgSq,imgNormMSESq, spatialMaskSq, meanImgMaskSq, stdImgSq, meanTSOrig, fileManageDict['WLSignal1']['mask']['data'] = \
                    self.MSEDiffImg(fileManageDict['WLSignal1']['mocoSmthXfm']['data'], numFramesToUse = 1500, medianFilter = 8, dilationIters = 4)

                # Save images
                 
                out = bis_objects.bisImage().create(fileManageDict['WLSignal1']['mask']['data'].astype('int'),dimsOp,aff)
                out.save(os.path.join(workdir,'MSEMask.nii.gz'))
                out = bis_objects.bisImage().create(imgNormMSESq,dimsOp,aff)
                out.save(os.path.join(workdir,'MSEImage.nii.gz'))



            if not createMask:
                maskX, maskY = fileManageDict['WLSignal1']['mask']['data'].shape

                fileManageDict['WLSignal1']['mask']['data'] = img_as_bool(skresize(fileManageDict['WLSignal1']['mask']['data'].astype(bool),(round(maskX/2),round(maskY/2))))

           
            # Photobleach correction


            fileManageDict['WLSignal1']['photob'] = {}
            fileManageDict['WLSignal1']['photob']['precursor'] = ['rawsignl','smooth4','mococombo','photob']

            fileManageDict['WLNoise1']['photob'] = {}
            fileManageDict['WLNoise1']['photob']['precursor'] = ['rawnoise','smooth4','mococombo','photob']




            fileManageDict['WLSignal1']['photob']['data'], fileManageDict['WLNoise1']['photob']['data'] = \
                calcium_analysis.expRegression(fileManageDict['WLSignal1']['mocoSmthXfm']['data'], \
                                                fileManageDict['WLNoise1']['mocoSmthXfm']['data'], \
                                                fileManageDict['WLSignal1']['mask']['data'])

            if outputEveryStep:
                self.processDictEntry(fileManageDict['WLSignal1']['photob'], opFold = workdir, dimsOp = dimsOpDs, aff = affDs, reshape4D = True)
                self.processDictEntry(fileManageDict['WLNoise1']['photob'], opFold = workdir, dimsOp = dimsOpDs, aff = affDs, reshape4D = True)



            fileManageDict['WLSignal1']['wvlthreg'] = {}
            fileManageDict['WLSignal1']['wvlthreg']['precursor'] = ['rawsignl','smooth4','mococombo','photob','wvlthreg']



            #### Two-wavelength Regression
            fileManageDict['WLSignal1']['wvlthreg']['data'] = \
                calcium_analysis.twoWavelengthRegression(fileManageDict['WLSignal1']['photob']['data'], \
                                                        fileManageDict['WLNoise1']['photob']['data'], \
                                                        fileManageDict['WLSignal1']['mocoSmthXfm']['data'], \
                                                        fileManageDict['WLNoise1']['mocoSmthXfm']['data'], \
                                                        fileManageDict['WLSignal1']['mask']['data'])


            if outputEveryStep:
                self.processDictEntry(fileManageDict['WLSignal1']['wvlthreg'], opFold = workdir, dimsOp = dimsOpDs, aff = affDs, reshape4D = True)


            out = bis_objects.bisImage().create(fileManageDict['WLSignal1']['wvlthreg']['data'], dimsOpDs, affDs)
            self.outputs['signalout']=out
            out = bis_objects.bisImage().create(fileManageDict['WLNoise1']['photob']['data'], dimsOpDs, affDs)
            self.outputs['noiseout']=out

           
            return True



if __name__ == '__main__':
    import biswebpython.core.bis_commandline as bis_commandline;
    sys.exit(bis_commandline.loadParse(calciumPreprocess(),sys.argv,False));



    
