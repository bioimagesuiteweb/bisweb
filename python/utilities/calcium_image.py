from PIL import Image
import numpy as np

def rotate(img,angle):
    rotatedArray = np.empty(Image.fromarray(img[:,:,0]).rotate(angle,Image.NEAREST,True).size)
    for i in img.shape[-1]:
        rotatedArray[:,:,i] = Image.fromarray(img[:,:,i]).rotate(angle,Image.NEAREST,True)
    return rotatedArray

def resize(img,newSize):
    resizedArray = np.empty(newSize)
    for i in img.shape[-1]:
        resizedArray[:,:,i] = Image.fromarray(img[:,:,i]).resize(newSize,Image.BILINEAR)
    return resizedArray


def channelSeparate(img):
    return img[:,:,0::2],img[:,:,1::2]