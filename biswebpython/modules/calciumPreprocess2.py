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
import yaml
from matplotlib import pyplot as plt

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
                },
                {
                    "type": "str",
                    "name": "config file",
                    "description": "Path to preprocessing configuration file",
                    "varname": "configfile",
                    "required": True,
                    "default": ''
                }




            ],
        }
        
    

    def computeMotionCorrection(self,image,paramSpec, regFrame='middle'):
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

    def applyMotionCorrection(self,image,transform,ref=None,downsample = 2):
        '''
        Expects an image in the form of an np array of size X x Y x T
        '''



        ipImageShape=image.shape
        xDim,yDim,numFrames=ipImageShape

        if type(ref) == np.ndarray:
            xDimRes,yDimRes = ref.shape
            opImg=np.zeros([xDimRes,yDimRes,numFrames],dtype='float32')
            ref = bis_objects.bisImage().create(ref,[downsample,downsample,downsample,1,1],np.eye(4))
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


    def makeQcPlotImg(self,img1,img2,opname,stitle):
        # Raw Data 

        blueData = img1.squeeze()

        if type(img2) != bool:
            uvData = img2.squeeze()
        else:
            uvData = np.zeros(blueData.shape)
            uvData[uvData == 0] = np.nan

        blueShape = blueData.shape
        uvShape = uvData.shape

        blueTS = blueData.reshape([blueShape[0]*blueShape[1],blueShape[2]]).mean(axis=0)
        uvTS = uvData.reshape([uvShape[0]*uvShape[1],uvShape[2]]).mean(axis=0)

        fig = plt.figure(figsize=[10,8])
        plt.suptitle(stitle)
        gs = fig.add_gridspec(2,3)
        ax1 = fig.add_subplot(gs[0, 0])
        ax1.imshow(blueData.mean(axis=2))
        ax2 = fig.add_subplot(gs[0, 1])
        ax2.imshow(blueData.std(axis=2))
        ax3 = fig.add_subplot(gs[0, 2])
        ax3.imshow(uvData.mean(axis=2))
        ax4 = fig.add_subplot(gs[1, 0])
        ax4.imshow(uvData.std(axis=2))
        ax5 = fig.add_subplot(gs[1, 1:])

        ax5.scatter(np.linspace(1,blueShape[2],blueShape[2]),blueTS,c='b',alpha=0.3, marker = '.')
        ax5.scatter(np.linspace(1,uvShape[2],uvShape[2]),uvTS,c='y',alpha=0.3, marker = '.')


        plt.savefig(opname)
        plt.close()
        plt.clf()


    def makeQcPlotMotion(self,blueTransform,uvTransform,opname,stitle):

        blueLen = blueTransform.shape[2]
        uvLen = uvTransform.shape[2]

        blueXmot = blueTransform[0,3,:]
        blueYmot = blueTransform[1,3,:]

        blueAbs = np.sqrt(blueXmot**2 + blueYmot**2)

        blueAbsMean = blueAbs.mean()
        blueAbsMax = blueAbs.max()
        blueFrm2Frm = np.diff(blueAbs)
        blueFrm2FrmMean = blueFrm2Frm.mean()
        blueFrm2FrmMax = blueFrm2Frm.max()

        uvXmot = uvTransform[0,3,:]
        uvYmot = uvTransform[1,3,:]

        uvAbs = np.sqrt(uvXmot**2 + uvYmot**2)

        uvAbsMean = uvAbs.mean()
        uvAbsMax = uvAbs.max()
        uvFrm2Frm = np.diff(uvAbs)
        uvFrm2FrmMean = uvFrm2Frm.mean()
        uvFrm2FrmMax = uvFrm2Frm.max()

        if blueLen == uvLen:
            blueUvCorr =np.corrcoef(blueAbs,uvAbs)[0,1]
        elif blueLen > uvLen:
            blueUvCorr =np.corrcoef(blueAbs[:uvLen],uvAbs)[0,1]
        elif blueLen < uvLen:
            blueUvCorr =np.corrcoef(blueAbs,uvAbs[:blueLen])[0,1]

        dfArray = np.vstack([blueAbsMean,blueAbsMax,blueFrm2FrmMean,blueFrm2FrmMax,uvAbsMean,uvAbsMax,uvFrm2FrmMean,uvFrm2FrmMax,blueUvCorr]).T


        opDf = pd.DataFrame(dfArray,columns=['blueAbsMean','blueAbsMax','blueFrm2FrmMean','blueFrm2FrmMax','uvAbsMean','uvAbsMax','uvFrm2FrmMean','uvFrm2FrmMax','blueUvCorr'],index=[0])
        opDf.to_csv(opname.split('.')[0]+'.csv')

        plt.figure(figsize = [8,16])

        plt.suptitle(stitle)
        plt.subplot(9,1,1)
        plt.title('Blue X Displacement')
        plt.scatter(np.linspace(1,blueLen,blueLen),blueXmot, marker = '.',s=0.5)

        plt.subplot(9,1,2)
        plt.title('Blue Y Displacement')
        plt.scatter(np.linspace(1,blueLen,blueLen),blueYmot, marker = '.',s=0.5)

        plt.subplot(9,1,3)
        plt.title('Blue Abs Displacement')
        plt.scatter(np.linspace(1,blueLen,blueLen),blueAbs, marker = '.',s=0.5)

        plt.subplot(9,1,4)
        plt.title('Blue Frame to Frame Displacement')
        plt.scatter(np.linspace(1,blueLen-1,blueLen-1),blueFrm2Frm, marker = '.',s=0.5)

        plt.subplot(9,1,5)
        plt.title('UV X Displacement')
        plt.scatter(np.linspace(1,uvLen,uvLen),uvXmot, marker = '.',s=0.5)

        plt.subplot(9,1,6)
        plt.title('UV X Displacement')
        plt.scatter(np.linspace(1,uvLen,uvLen),uvYmot, marker = '.',s=0.5)

        plt.subplot(9,1,7)
        plt.title('UV Abs Displacement')
        plt.scatter(np.linspace(1,uvLen,uvLen),uvAbs, marker = '.',s=0.5)

        plt.subplot(9,1,8)
        plt.title('UV Frame to Frame Displacement')
        plt.scatter(np.linspace(1,uvLen-1,uvLen-1),uvFrm2Frm, marker = '.',s=0.5)


        plt.subplot(9,1,9)

        iptext=''

        for col in opDf.columns:
            iptext = iptext + col + ': \t\t\t'.expandtabs() + str(round(opDf[col].values[0],5)) + '\n'

        plt.axis('off')
        plt.text(0.1, 0.9,iptext, ha='left', va='center')

        plt.tight_layout()

        plt.savefig(opname)
        plt.close()
        plt.clf()


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        ######## Parsing Parameters

        # Currently the switch for outputing intermediate steps
        outputEveryStep=True


        # Where to output data
        workdir=vals['workdir']

        # directory to output qc figs
        figDir = os.path.join(workdir,'qcFigs')

        # If the qc fig directory doesnt exist create it
        if not os.path.isdir(figDir):
            os.makedirs(figDir)

        # Switch for whether or not to motion correct within current data only, or some other scan
        createMCRef=self.parseBoolean(vals['createmcref'])

        # Run only start of pipeline, for debug, should delete
        startOnly = self.parseBoolean(vals['startonly'])

        # Switch for running spatial preproc, temporal preproc, or both
        runoption = vals['runoption'].lower()

        # load config file with some options specified
        configPath = vals['configfile']

        with open(configPath) as f:
            configDct = yaml.load(f,Loader = yaml.Loader)

        # Assign motion correction parameters
        mocoParamSpec = configDct['mocoParams']

        # How big a kernel to use for smoothing for moco calculation
        mocoSmooth = configDct['smooth']['mocoSmooth']
        # How big a kernel to use for actually smoothing the data which will be output
        downsampleSmooth = configDct['smooth']['downsampleSmooth']

        # Assign downsample factor, one value, applied to both dimensions
        downsampleFactor = configDct['downsample']

        ### Moco parameters usually used
        #mocoParamSpec = {'intscale' : 1,
        #        'numbins' :  32,
        #        'levels' :   1,
        #        'optimization' : 'gradientdescent', # 0 hillclimb, 1 gradient descent, 2 conjugate descent
        #        'normalize' : True, # True? 
        #        'steps' : 4,
        #        'iterations' : 32,
        #        'mode' : 'rigid', # rigid
        #        'resolution' : 1.5,
        #        'return_vector' : "false",
        #        'metric' : 'NMI', # 1=CC 0,=SSD 3=NMI, 2=MI
        #        'debug' : True,
        #        'doreslice' : True}



        assert runoption in ['spatial','temporal','both']


        

        # These are the preproc steps that will be applied to the signal sensitive cyan wavelength
        preprocStepsBlue = ['raw','smooth16','moco','smooth4','photob','wvlthreg']
        # These are the preproc steps that will be applied to the signal insensitive photobleach wavelength
        preproceStepsUV = ['raw','smooth16','moco','smooth4','photob']


        # This dictionary, "fileManageDict", will be used in conjunction with "processDictEntry" function
        # to read/write different intermediate steps
        fileManageDict = {}


        # Define parent keys for signl sensitive and insensitive data streams
        fileManageDict['WLSignal1'] = {}
        fileManageDict['WLNoise1'] = {}



        # Define moco reference files in file manage dict
        if runoption == 'spatial' and createMCRef == False:
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


        # Define mask in file manage dict
        if self.inputs['mask'] != None:
            fileManageDict['WLSignal1']['mask'] = {}
            fileManageDict['WLNoise1']['mask'] = {}
            
            fileManageDict['WLSignal1']['mask']['data'] = np.squeeze(self.inputs['mask'].get_data().astype(int))
            fileManageDict['WLSignal1']['mask']['precursor'] = ['mask']

            fileManageDict['WLNoise1']['mask']['data'] = np.squeeze(self.inputs['mask'].get_data().astype(int))
        elif 'mask' not in self.inputs and runoption == 'temporal':
            raise Exception('If run option is "temporal" you must give the path to a mask')
        elif runoption == 'spatial':
            pass



        # Load inputs to file manage dict

        fileManageDict['WLSignal1']['raw'] = {}
        fileManageDict['WLNoise1']['raw'] = {}
        
        fileManageDict['WLSignal1']['raw']['precursor'] = ['rawsignl']
        fileManageDict['WLNoise1']['raw']['precursor'] = ['rawnoise']

        fileManageDict['WLSignal1']['raw']['data'] = self.inputs['signal'].get_data().astype(np.float32).squeeze()
        fileManageDict['WLNoise1']['raw']['data'] = self.inputs['noise'].get_data().astype(np.float32).squeeze()

        # Make qc fig for input data
        self.makeQcPlotImg(fileManageDict['WLSignal1']['raw']['data'],fileManageDict['WLNoise1']['raw']['data'],os.path.join(figDir,'rawdata.png'),'Raw Data')
        

        #### Desired output nifti configs for data prior to downsampling, would be good to have as input alongside tiff files
        #### Input nifti files can keep the same parameters
        aff = self.inputs['signal'].affine

        affDs = aff.copy()
        for itr in range(0,3):
            affDs[itr,itr] = affDs[itr,itr]*downsampleFactor

        dimsOp = self.inputs['signal'].spacing.copy()
        dimsOpDs = self.inputs['signal'].spacing.copy()
        dimsOpDs[:3] =  list(map(lambda x : x * downsampleFactor,dimsOpDs[:3]))


        # Keep input image sizes
        signalMovieSize = fileManageDict['WLSignal1']['raw']['data'].shape
        noiseMovieSize = fileManageDict['WLNoise1']['raw']['data'].shape

        # Legacy code which will output raw data, from when we split the data inside the pipeline
        # can prob delete
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

            # Setup file manage dict keys for smoothing & moco
            fileManageDict['WLSignal1']['smooth16'] = {}
            fileManageDict['WLSignal1']['smooth16']['precursor'] = ['rawsignl','smooth16']


            fileManageDict['WLNoise1']['smooth16'] = {}
            fileManageDict['WLNoise1']['smooth16']['precursor'] = ['rawnoise','smooth16']


            fileManageDict['WLSignal1']['moco16'] = {}
            fileManageDict['WLSignal1']['moco16']['precursor'] = ['rawsignl','smooth16','moco']


            fileManageDict['WLNoise1']['moco16'] = {}
            fileManageDict['WLNoise1']['moco16']['precursor'] = ['rawnoise','smooth16','moco']

       
            ### Run spatial smoothing with larger kernel
            if not self.processDictEntry(fileManageDict['WLSignal1']['moco16'], opFold = workdir):

                if not self.processDictEntry(fileManageDict['WLSignal1']['smooth16'], opFold = workdir):

                    fileManageDict['WLSignal1']['smooth16']['data'] = self.smoothImage(fileManageDict['WLSignal1']['raw']['data'], width=mocoSmooth)


                    self.processDictEntry(fileManageDict['WLSignal1']['smooth16'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)

                else:

                    fileManageDict['WLSignal1']['smooth16']['data'] = self.processDictEntry(fileManageDict['WLSignal1']['smooth16'], loadData = True, opFold = workdir)


                if not self.processDictEntry(fileManageDict['WLNoise1']['smooth16'], opFold = workdir):

                    fileManageDict['WLNoise1']['smooth16']['data'] = self.smoothImage(fileManageDict['WLNoise1']['raw']['data'], width=mocoSmooth)

                    self.processDictEntry(fileManageDict['WLNoise1']['smooth16'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)

                else:

                    fileManageDict['WLNoise1']['smooth16']['data'] = self.processDictEntry(fileManageDict['WLNoise1']['smooth16'], loadData = True, opFold = workdir)

                self.makeQcPlotImg(fileManageDict['WLSignal1']['smooth16']['data'],fileManageDict['WLNoise1']['smooth16']['data'],os.path.join(figDir,'mocoSmooth.png'),'Pre Moco Smoothing')

            else:
                fileManageDict['WLSignal1']['smooth16']['data'] = self.processDictEntry(fileManageDict['WLSignal1']['smooth16'], loadData = True, opFold = workdir)
                fileManageDict['WLNoise1']['smooth16']['data'] = self.processDictEntry(fileManageDict['WLNoise1']['smooth16'], loadData = True, opFold = workdir)


            #Setup keys in file manage dict for smaller kernel smoothing       
            fileManageDict['WLSignal1']['smooth4'] = {}
            fileManageDict['WLSignal1']['smooth4']['precursor'] = ['rawsignl','smooth4']


            fileManageDict['WLNoise1']['smooth4'] = {}
            fileManageDict['WLNoise1']['smooth4']['precursor'] = ['rawnoise','smooth4']

            # Perform smoothing with smaller kernel
            if not self.processDictEntry(fileManageDict['WLSignal1']['smooth4'], opFold = workdir):

                fileManageDict['WLSignal1']['smooth4']['data'] = self.smoothImage(fileManageDict['WLSignal1']['raw']['data'], width = downsampleSmooth)

                self.processDictEntry(fileManageDict['WLSignal1']['smooth4'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
     
            else:
                fileManageDict['WLSignal1']['smooth4']['data'] = self.processDictEntry(fileManageDict['WLSignal1']['smooth4'], loadData = True, opFold = workdir)


            if not self.processDictEntry(fileManageDict['WLNoise1']['smooth4'], opFold = workdir):

                fileManageDict['WLNoise1']['smooth4']['data'] = self.smoothImage(fileManageDict['WLNoise1']['raw']['data'], width = downsampleSmooth)

                self.processDictEntry(fileManageDict['WLNoise1']['smooth4'], opFold = workdir, dimsOp = dimsOp, aff = aff, reshape4D = True)
     
            else:
                fileManageDict['WLNoise1']['smooth4']['data'] = self.processDictEntry(fileManageDict['WLNoise1']['smooth4'], loadData = True, opFold = workdir)


            # create qc figs for smaller kernel smoothing
            self.makeQcPlotImg(fileManageDict['WLSignal1']['smooth4']['data'],fileManageDict['WLNoise1']['smooth4']['data'],os.path.join(figDir,'smooth.png'),'Lighter smooth')



            #Memory management: Remove raw data from file manage dict
            del fileManageDict['WLNoise1']['raw']['data']
            del fileManageDict['WLSignal1']['raw']['data']




            #### Motion correction  calculation on smooth 16 data ####
         
            # Setup keys in file manage dict for moco corrected data and reference images
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


            # perform motion corrected on data smoothed with larger kernel

            # CHeck if steps run already and run if no, load if yes
            smth16MocoFileCheck = all([self.processDictEntry(fileManageDict['WLSignal1']['moco16'], opFold = workdir), 
                                    self.processDictEntry(fileManageDict['WLSignal1']['moco16']['refimg'], opFold = workdir), 
                                    self.processDictEntry(fileManageDict['WLSignal1']['moco16']['transform'], opFold = workdir, fsuffix = '.npy')])


            if not smth16MocoFileCheck:

                fileManageDict['WLSignal1']['moco16']['data'], \
                fileManageDict['WLSignal1']['moco16']['refimg']['data'], \
                fileManageDict['WLSignal1']['moco16']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLSignal1']['smooth16']['data'], mocoParamSpec)

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
                fileManageDict['WLNoise1']['moco16']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLNoise1']['smooth16']['data'], mocoParamSpec)




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


            # qc fig for data smooth with large kernel & moco applied            
            self.makeQcPlotMotion(fileManageDict['WLSignal1']['moco16']['transform']['data'], \
                            fileManageDict['WLNoise1']['moco16']['transform']['data'], \
                            os.path.join(figDir,'mocoParams.png'), \
                            'Motion Correction Parameters')



            # If another motion correction reference is provide, co register the current ref img to that one
            # and then concat the transforms and apply to current dara
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
                    fileManageDict['WLSignal1']['refcombo']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLSignal1']['moco16']['refimg']['data'],mocoParamSpec, \
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
                    fileManageDict['WLNoise1']['refcombo']['transform']['data'] = self.computeMotionCorrection(fileManageDict['WLNoise1']['moco16']['refimg']['data'],mocoParamSpec, \
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

                MCRefComboDS = calcium_image.resize(fileManageDict['WLSignal1']['refcombo']['data'],[round(MCRefComboX/downsampleFactor),round(MCRefComboY/downsampleFactor)])

                fileManageDict['WLSignal1']['mocoSmthXfm']['data'] = \
                    self.applyMotionCorrection(fileManageDict['WLSignal1']['smooth4']['data'], \
                    fileManageDict['WLSignal1']['refcombo']['transform']['data'], \
                    ref = MCRefComboDS, downsample = downsampleFactor)

                self.processDictEntry(fileManageDict['WLSignal1']['mocoSmthXfm'], opFold = workdir, dimsOp = dimsOpDs, aff = affDs, reshape4D = True)

     
            else:
                fileManageDict['WLSignal1']['mocoSmthXfm']['data'] = \
                    self.processDictEntry(fileManageDict['WLSignal1']['mocoSmthXfm'], loadData = True, opFold = workdir)  



            
            if not self.processDictEntry(fileManageDict['WLNoise1']['mocoSmthXfm'], opFold = workdir):

                MCRefComboX, MCRefComboY = fileManageDict['WLSignal1']['refcombo']['data'].shape

                MCRefComboDS = calcium_image.resize(fileManageDict['WLSignal1']['refcombo']['data'],[round(MCRefComboX/downsampleFactor),round(MCRefComboY/downsampleFactor)])

                xfmToApply = fileManageDict['WLSignal1']['refcombo']['transform']['data']


                while xfmToApply.shape[2] != fileManageDict['WLNoise1']['smooth4']['data'].shape[2]:

                    if xfmToApply.shape[2] < fileManageDict['WLNoise1']['smooth4']['data'].shape[2]:
                        xfmToApply = np.dstack((xfmToApply,xfmToApply[:,:,-1]))

                    elif xfmToApply.shape[2] > fileManageDict['WLNoise1']['smooth4']['data'].shape[2]:
                        xfmToApply = np.delete(xfmToApply,-1,-1)


                fileManageDict['WLNoise1']['mocoSmthXfm']['data'] = \
                    self.applyMotionCorrection(fileManageDict['WLNoise1']['smooth4']['data'], \
                    xfmToApply, \
                    ref = MCRefComboDS, downsample = downsampleFactor)

                self.processDictEntry(fileManageDict['WLNoise1']['mocoSmthXfm'], opFold = workdir, dimsOp = dimsOpDs, aff = affDs, reshape4D = True)

     
            else:
                fileManageDict['WLNoise1']['mocoSmthXfm']['data'] = \
                    self.processDictEntry(fileManageDict['WLNoise1']['mocoSmthXfm'], loadData = True, opFold = workdir)  


            self.makeQcPlotImg(fileManageDict['WLSignal1']['mocoSmthXfm']['data'],fileManageDict['WLNoise1']['mocoSmthXfm']['data'],os.path.join(figDir,'postMoco.png'),'Motion Corrected & Downsampled Data')

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

        
            #if createMask:

            #    fileManageDict['WLSignal1']['mask'] = {}
            #    fileManageDict['WLSignal1']['mask']['precursor'] = ['mask']

            #    # Create Mask
            #    meanImgSq,imgNormMSESq, spatialMaskSq, meanImgMaskSq, stdImgSq, meanTSOrig, fileManageDict['WLSignal1']['mask']['data'] = \
            #        self.MSEDiffImg(fileManageDict['WLSignal1']['mocoSmthXfm']['data'], numFramesToUse = 1500, medianFilter = 8, dilationIters = 4)

                # Save images
                 
            #    out = bis_objects.bisImage().create(fileManageDict['WLSignal1']['mask']['data'].astype('int'),dimsOp,aff)
            #    out.save(os.path.join(workdir,'MSEMask.nii.gz'))
            #    out = bis_objects.bisImage().create(imgNormMSESq,dimsOp,aff)
            #    out.save(os.path.join(workdir,'MSEImage.nii.gz'))



            #if not createMask:
            maskX, maskY = fileManageDict['WLSignal1']['mask']['data'].shape

            fileManageDict['WLSignal1']['mask']['data'] = img_as_bool(skresize(fileManageDict['WLSignal1']['mask']['data'].astype(bool),(round(maskX/downsampleFactor),round(maskY/downsampleFactor))))

           
            # Photobleach correction


            fileManageDict['WLSignal1']['photob'] = {}
            fileManageDict['WLSignal1']['photob']['precursor'] = ['rawsignl','smooth4','mococombo','photob']

            fileManageDict['WLNoise1']['photob'] = {}
            fileManageDict['WLNoise1']['photob']['precursor'] = ['rawnoise','smooth4','mococombo','photob']

           


            fileManageDict['WLSignal1']['photob']['data'], fileManageDict['WLNoise1']['photob']['data'] = \
                calcium_analysis.expRegression(fileManageDict['WLSignal1']['mocoSmthXfm']['data'], \
                                                fileManageDict['WLNoise1']['mocoSmthXfm']['data'], \
                                                fileManageDict['WLSignal1']['mask']['data'])

            self.makeQcPlotImg(fileManageDict['WLSignal1']['photob']['data'],fileManageDict['WLNoise1']['photob']['data'],os.path.join(figDir,'photobleach.png'),'Photobleach corrected data')

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

            self.makeQcPlotImg(fileManageDict['WLSignal1']['wvlthreg']['data'],False,os.path.join(figDir,'wavelengthReg.png'),'Wavelength regressed data')


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



    
