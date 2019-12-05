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

def expRegression(blueMovie,uvMovie,mask,debug):

    # Import bis_objects and drift correction script
    from biswebpython.modules.driftCorrectImage import driftCorrectImage
    import biswebpython.core.bis_objects as bis_objects
    
    # Make sure we have a time dimension in the input data
    blueShape = blueMovie.shape
    uvShape = uvMovie.shape

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


    meanTsBlue = np.mean(blueMovie,axis=0)
    meanTsUV = np.mean(uvMovie,axis=0)

    numTps=len(meanTsBlue)

    lintrend=np.linspace(1,-1,numTps)
    exptrend=np.squeeze(np.exp(lintrend))

    # Blue Regress
    poptBlue,pcovBlue=curve_fit(exponential_func,exptrend,meanTsBlue,p0=(1,1e-6,1),maxfev=10000)
    yfitBlue=exponential_func(exptrend,*poptBlue)
    yfitBlueMin=yfitBlue/np.min(yfitBlue)
    blueMovieRegress=blueMovie/yfitBlueMin


    # Blue Regress
    poptUV,pcovUV=curve_fit(exponential_func,exptrend,meanTsUV,p0=(1,1e-6,1),maxfev=10000)
    yfitUV=exponential_func(exptrend,*poptUV)
    yfitUVMin=yfitUV/np.min(yfitUV)
    uvMovieRegress=uvMovie/yfitUVMin


    blueMovieRegress=np.reshape(blueMovieRegress,blueShape)
    uvMovieRegress=np.reshape(uvMovieRegress,uvShape)


    return blueMovieRegress, uvMovieRegress




def twoWavelengthRegression(blueMovieFiltered,uvMovieFiltered,blueMovie,uvMovie,mask):
    from scipy import linalg

    mask = mask.reshape((mask.shape[0]*mask.shape[1]))
    mask = mask>0
    mask_indices = np.squeeze(np.argwhere(mask))
    rotatedSize3D = blueMovie.shape

    blueMovie = blueMovie.reshape((blueMovie.shape[0]*blueMovie.shape[1], blueMovie.shape[2]))
    uvMovie = uvMovie.reshape((uvMovie.shape[0]*uvMovie.shape[1], uvMovie.shape[2]))
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
    return blueReg

def dFF(blueMovie,uvMovieFiltered,blueReg,mask,topHat=300):
    rotatedSize3D = blueMovie.shape
    mask = mask.reshape((mask.shape[0]*mask.shape[1]))
    mask = mask>0

    blueMovie = blueMovie.reshape((blueMovie.shape[0]*blueMovie.shape[1], blueMovie.shape[2]))
    uvMovieFiltered = uvMovieFiltered.reshape((uvMovieFiltered.shape[0]*uvMovieFiltered.shape[1], uvMovieFiltered.shape[2]))

    blueF = blueMovie[mask,topHat:].mean(axis=1)
    blueDFF = np.zeros(blueMovie.shape)
    blueDFF[mask,:] = np.divide(blueReg[mask,:],np.tile(blueF[:,np.newaxis],(1,rotatedSize3D[2])))

    #uv
    uvF = uvMovieFiltered[mask,topHat:].mean(axis=1)
    uvDFF = np.zeros(uvMovieFiltered.shape)
    uvDFF[mask,:] = np.divide(uvMovieFiltered[mask,:],np.tile(uvF[:,np.newaxis],(1,rotatedSize3D[2])))
    return blueDFF,uvDFF
