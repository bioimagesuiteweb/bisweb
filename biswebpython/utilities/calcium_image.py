from PIL import Image
import numpy as np
import pdb

def rotate(img,angle):
    rotatedArray = np.empty((Image.fromarray(img[:,:,0]).rotate(angle,Image.NEAREST,True).size)+(img.shape[-1],))
    for i in range(img.shape[-1]):
        rotatedArray[:,:,i] = Image.fromarray(img[:,:,i]).rotate(angle,Image.NEAREST,True)
    return rotatedArray

def resize(img,newSize):
    
    if len(img.shape)==3: #3d
        resizedArray = np.empty((newSize[0],newSize[1],img.shape[2]))
        for i in range(img.shape[-1]):
            resizedArray[:,:,i] = Image.fromarray(img[:,:,i]).resize([newSize[1],newSize[0]],Image.BILINEAR)
    else: #2d
        resizedArray = np.empty((newSize[0],newSize[1]))
        resizedArray[:,:] = Image.fromarray(img).resize([newSize[1],newSize[0]],Image.BILINEAR)


    return resizedArray

def channelSeparate(img):
    return img[:,:,0::2],img[:,:,1::2]
