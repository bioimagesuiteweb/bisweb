import numpy as np
import pdb
from scipy.optimize import curve_fit 

def topHatFilter(blueMovie,uvMovie,mask,topHat=300):
    # Mask (spatial), resize, and rotate
    # mask = np.array(Image.open('mask.tif').resize(downsampledSize, Image.BILINEAR).rotate(rotationAngle,Image.NEAREST,True))
    rotatedSize3D = blueMovie.shape
    
    # Reshape 
    blueMovie = blueMovie.reshape((blueMovie.shape[0]*blueMovie.shape[1], blueMovie.shape[2]))
    uvMovie = uvMovie.reshape((uvMovie.shape[0]*uvMovie.shape[1], uvMovie.shape[2]))
    mask = mask.reshape((mask.shape[0]*mask.shape[1]))
    mask = mask>0
    mask_indices = np.squeeze(np.argwhere(mask))

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

    blueMovieFiltered[mask_indices,:] = blueFiltered[:,topHat:]
    uvMovieFiltered[mask_indices,:] = uvFiltered[:,topHat:]
    

    blueMovieFiltered = blueMovieFiltered.reshape(rotatedSize3D)
    uvMovieFiltered = uvMovieFiltered.reshape(rotatedSize3D)
    return blueMovieFiltered,uvMovieFiltered

def expRegression(blueMovie,uvMovie,mask):

    # Import bis_objects and drift correction script
    #from biswebpython.modules.driftCorrectImage import driftCorrectImage
    #import biswebpython.core.bis_objects as bis_objects
    

    # Make sure we have a time dimension in the input data
    blueShape = blueMovie.shape
    uvShape = uvMovie.shape
    maskShape = mask.shape

    

    if (len(blueShape) == 3) and (len(uvShape) == 3):
        print('Both input images are 3D, assuming third dimension is time and reshaping')
        blueMovie=np.reshape(blueMovie,[blueShape[0]*blueShape[1],blueShape[2]])
        uvMovie=np.reshape(uvMovie,[uvShape[0]*uvShape[1],uvShape[2]])
    elif (len(blueShape) == 4) and (len(uvShape) == 4):
        print('Both input images are 4D, assuming fourth dimension is time and reshaping')
        blueMovie=np.reshape(blueMovie,[blueShape[0]*blueShape[1],blueShape[3]])
        uvMovie=np.reshape(uvMovie,[uvShape[0]*uvShape[1],uvShape[3]])
    else:
        raise Exception('Blue and UV images are not the same dimension and/or are not 3/4 dimensions')


    def exponential_func(t, a, b, c):
        return a*np.exp(-b*t)+c


    if len(maskShape) == 2:
        maskRes=np.reshape(mask,maskShape[0]*maskShape[1])
    else:
        raise Exception('Mask array is wrong shape')

    

    meanTsBlue = np.mean(blueMovie[maskRes,:],axis=0)
    meanTsUv = np.mean(uvMovie[maskRes,:],axis=0)

    numTpsBlue=len(meanTsBlue)
    numTpsUv=len(meanTsUv)

    lintrendBlue=np.linspace(1,-1,numTpsBlue)
    exptrendBlue=np.squeeze(np.exp(lintrendBlue))

    lintrendUv=np.linspace(1,-1,numTpsUv)
    exptrendUv=np.squeeze(np.exp(lintrendUv))

    # Blue Regress

    

    poptBlue,pcovBlue=curve_fit(exponential_func,exptrendBlue,meanTsBlue,p0=(1,1e-6,1),maxfev=10000)
    yfitBlue=exponential_func(exptrendBlue,*poptBlue)
    yfitBlueMin=yfitBlue/np.min(yfitBlue)
    blueMovieRegress=blueMovie.copy()
    blueMovieRegress[maskRes,:]=blueMovie[maskRes,:]/yfitBlueMin
    blueMovieRegress[~maskRes,:] = 0


    # Blue Regress
    poptUv,pcovUv=curve_fit(exponential_func,exptrendUv,meanTsUv,p0=(1,1e-6,1),maxfev=10000)
    yfitUv=exponential_func(exptrendUv,*poptUv)
    yfitUvMin=yfitUv/np.min(yfitUv)
    uvMovieRegress=uvMovie.copy()
    uvMovieRegress[maskRes,:]=uvMovie[maskRes,:]/yfitUvMin
    uvMovieRegress[~maskRes,:] = 0

    

    blueMovieRegress=np.reshape(blueMovieRegress,blueShape)
    uvMovieRegress=np.reshape(uvMovieRegress,uvShape)


    return blueMovieRegress, uvMovieRegress




def twoWavelengthRegression(blueMovieFiltered,uvMovieFiltered,blueMovie,uvMovie,mask):
    from scipy import linalg


    # Flatten mask and find nonzero indices
    mask = mask.reshape((mask.shape[0]*mask.shape[1]))
    mask = mask>0
    mask_indices = np.squeeze(np.argwhere(mask))

    # Get shapes of images
    blueShape = blueMovie.shape
    uvShape = uvMovie.shape
    blueFiltShape = blueMovieFiltered.shape
    uvFiltShape = uvMovieFiltered.shape

    # Reshape images to 2D,  space x time
    blueMovie = blueMovie.reshape((blueShape[0]*blueShape[1], blueShape[2]))
    uvMovie = uvMovie.reshape((uvShape[0]*uvShape[1], uvShape[2]))
    blueMovieFiltered = blueMovieFiltered.reshape((blueFiltShape[0]*blueFiltShape[1], blueFiltShape[2]))
    uvMovieFiltered = uvMovieFiltered.reshape((uvFiltShape[0]*uvFiltShape[1], uvFiltShape[2]))

    # Get base(?), which is the images (pre photobleach correction)
    # minus the image after photobleack correction
    blueBase = blueMovie - blueMovieFiltered
    uvBase = uvMovie - uvMovieFiltered
   
    del blueMovie
    del uvMovie

    # Add the mean of the base onto each timepoint, to reconstruct pre photobleach images
    blueRec = blueMovieFiltered + np.tile(blueBase.mean(axis=1)[:,np.newaxis],(1,blueFiltShape[2]))
    uvRec = uvMovieFiltered + np.tile(uvBase.mean(axis=1)[:,np.newaxis],(1,uvFiltShape[2]))

    # Define empty arrays
    beta = np.zeros((len(mask_indices)))
    blueReg = np.zeros(blueBase.shape,dtype = np.float32)

    del blueBase
    del uvBase


    # If UV is different length than blue
    # Shorten it to the length of blue or
    # Duplicate last UV timepoint up to the 
    # same length of blue    
    if uvRec.shape[1] != blueRec.shape[1]:
        diffUv=uvRec.shape[1] - blueRec.shape[1]
        if diffUv > 0:
            uvRec=uvRec[:,:blueRec.shape[1]]
            uvMovieFiltered = uvMovieFiltered[:,:blueRec.shape[1]]

        if diffUv < 0:
            for i in range(0,abs(diffUv)):

                uvRecAdd = np.expand_dims(uvRec[:,-1], axis=1)
                uvRec=np.append(uvRec,uvRecAdd,axis=1)

                uvMovieFiltAdd = np.expand_dims(uvMovieFiltered[:,-1], axis=1)
                uvMovieFiltered = np.append(uvMovieFiltered,uvMovieFiltAdd,axis=1)

    # For each timeseries in the mask, fit "uvRec" to "blueRec" and keep residuals
    # So the fit is calculated on the "reconstructed" (non photobleach corrected) uv and blue, but beta
    # is then applied to the corrected uv and subtracted from the corrected blue
    for i in range(mask.sum()):
        beta[i] = linalg.lstsq(uvRec[mask_indices[i],:][:,np.newaxis], blueRec[mask_indices[i],:][:,np.newaxis])[0][0][0]
        blueReg[mask_indices[i],:] = blueMovieFiltered[mask_indices[i],:] - beta[i]*uvMovieFiltered[mask_indices[i],:]


    blueReg = np.reshape(blueReg,blueShape)

    return blueReg

def dFF(blueMovie,uvMovieFiltered,blueReg,mask):
    blueShape = blueMovie.shape
    uvShape = uvMovieFiltered.shape
    mask = mask.reshape((mask.shape[0]*mask.shape[1]))
    mask = mask>0

    blueMovie = blueMovie.reshape((blueShape[0]*blueShape[1], blueShape[2]))
    uvMovieFiltered = uvMovieFiltered.reshape((uvShape[0]*uvShape[1], uvShape[2]))
    blueReg = blueReg.reshape((blueShape[0]*blueShape[1], blueShape[2]))

    blueF = blueMovie[mask,:].mean(axis=1)
    blueDFF = np.zeros(blueMovie.shape,dtype = np.float32)
    blueDFF[mask,:] = np.divide(blueReg[mask,:],np.tile(blueF[:,np.newaxis],(1,blueShape[2])))
    blueDFF = np.reshape(blueDFF,[512,500,-1])

    #uv
    uvF = uvMovieFiltered[mask,:].mean(axis=1)
    uvDFF = np.zeros(uvMovieFiltered.shape,dtype = np.float32)
    uvDFF[mask,:] = np.divide(uvMovieFiltered[mask,:],np.tile(uvF[:,np.newaxis],(1,uvShape[2])))
    uvDFF = np.reshape(uvDFF,[512,500,-1])
    

    return blueDFF,uvDFF


def bandpassFilt(ipMat,mask):
    from scipy import signal

    sampFreq = 10
    bpVals = np.array([0.08, 0.2])/(sampFreq/2)

    sos = signal.butter(10, bpVals, btype='bandpass', output='sos')
    
    matShape = ipMat.shape
    mask = mask.reshape((mask.shape[0]*mask.shape[1]))
    mask = mask>0

    ipMatRes = ipMat.reshape((matShape[0]*matShape[1], matShape[2]))
    
    filtMat = ipMatRes.copy()
    filtMat[mask,:] = signal.sosfilt(sos,ipMatRes[mask,:],axis=1)

    filtMat = np.reshape(filtMat, matShape)

    return filtMat


