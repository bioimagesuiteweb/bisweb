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
import inspect
import sys
import numpy as np
import ctypes 
import struct 
import platform


if (sys.version_info[0]<3):
    print('\n .... this tool is incompatible with Python v2. You are using '+str(platform.python_version())+'. Use Python v3.\n')
    sys.exit(0)
elif (sys.version_info[1]<4):
    print('\n .... this tool needs at least Python version 3.4. You are using '+str(platform.python_version())+'\n')
    sys.exit(0)

__Module=None;
__force_large_memory=False;

    
def load_library(name=''):

    global __Module;

    if name=='':
        my_path=(os.path.dirname(os.path.abspath(inspect.stack()[0][1])))
        name=os.path.abspath(name+'../build/native/libbiswasm.so');
    else:
        name=os.path.abspath(name);

    if not os.path.isfile(name):
        my_path=(os.path.dirname(os.path.dirname(name)));
        name=my_path+'/win32/Release/biswasm.dll';
        print('____ Recomputing name:',name);
        
    m=ctypes.CDLL(name);
    if (m.uses_gpl()):
        print("____ Library Loaded from",name,"result=",m.test_wasm(),' (should be 1700)');
        print('____\t (This includes the GPL plugin addon. See https://github.com/bioimagesuiteweb/gplcppcode.)\n____');
    else:
        print("____ Library Loaded from",name,"result=",m.test_wasm(),' (should be 1700)\n____');

    __Module=m;
    return m;

def Module():
    global __Module;
    return __Module;


# -----------------------------------------------------
# set_force_large_memory
def set_force_large_memory(val=3):


    global __force_large_memory;

    if (val == 1 or val ==3):
        __force_large_memory=True;
    else:
        __force_large_memory=False;

    Module().set_large_memory_mode.argtypes=[ ctypes.c_int];

    if (val >=2):
       Module().set_large_memory_mode(1);
    else:
       Module().set_large_memory_mode(0);

# --------------------------------------------
# Magic Codes
# --------------------------------------------
def getVectorMagicCode():
    return Module().getVectorMagicCode();

def getMatrixMagicCode():
    return Module().getMatrixMagicCode();


def getImageMagicCode():
    return Module().getImageMagicCode();

def getGridTransformMagicCode():
    return Module().getGridTransformMagicCode();

def getComboTransformMagicCode():
    return Module().getComboTransformMagicCode();

def getCollectionMagicCode():
    return Module().getCollectionMagicCode();

def getNameFromMagicCode(magic_code):

    if magic_code==getVectorMagicCode():
        return 'Vector';

    if magic_code==getMatrixMagicCode():
        return 'Matrix';

    if magic_code==getImageMagicCode():
        return 'bisImage';

    if magic_code==getGridTransformMagicCode():
        return 'bisGridTransformation';

    if magic_code==getComboTransformMagicCode():
        return 'bisComboTransformation';

    if magic_code==getCollectionMagicCode():
        return 'bisCollection';
    

# --------------------------------------------
# Type Mapping
# --------------------------------------------

def get_nifti_code(n):

    out=False;

    if n ==  np.uint8:
        out=2;
    elif n ==  np.int16:
        out=4;
    elif n ==  np.int32:
        out=8;
    elif n ==  np.float32:
        out=16;
    elif n ==  np.float64:
        out=64;
    elif n ==  np.int8:
        out=256;
    elif n ==  np.uint16:
        out=512;
    elif n ==  np.uint32:
        out=768;
        
    return out

def get_dtype(n):

    out=False;
    
    if n == 2:
        out=np.uint8;
    elif n == 4:
        out=np.int16;
    elif n == 8:
        out=np.int32;
    elif n == 16:
        out=np.float32;
    elif n == 64:
        out=np.float64;
    elif n == 256:
        out=np.int8;
    elif n == 512:
        out=np.uint16;
    elif n == 768:
        out=np.uint32;

    return out

# --------------------------------------------
# Pointer release
# --------------------------------------------

def release_pointer(ptr):
    Module().jsdel_array(ptr);

# --------------------------------------------
# Core Serialize/Deserialize
# --------------------------------------------
def serialize_simpledataobject(mat,spa=[1.0,1.0,1.0,1.0,1.0],debug=0,isimage=False):

    global __force_large_memory;

    shp=mat.shape;
    l1=len(shp);

    if (debug>0):
        print('shp=',shp,'l1=',l1);
    
    if l1<1 or l1>5:
        raise ValueError('Bad Matrix shape '+str(shp));

    if l1<5:
        for i in range(l1,5):
            shp=np.append(shp,1);

    l2=len(spa)
    top_spacing=np.zeros(5,dtype=np.float32);
    for i in range(0,5):
        if i<l2:
            top_spacing[i]=spa[i];
        else:
            top_spacing[i]=1.0;
                
    top_header=np.zeros([4],dtype=np.int32);
    if (isimage==True):
        l1=5;

    mode=1;
    tl=1;
    if l1==1:
        top_header[0]=Module().getVectorMagicCode();
        top_header[1]=get_nifti_code(mat.dtype);
        top_header[2]=0;
        top_header[3]=shp[0];
        tl=shp[0];
        top_dimensions=[];
        top_spacing=[];
    elif l1==2:
        top_header[0]=Module().getMatrixMagicCode();
        top_header[1]=get_nifti_code(mat.dtype);
        top_header[2]=8;
        top_dimensions=np.zeros(2,dtype=np.int32)
        top_dimensions[0]=shp[0]
        top_dimensions[1]=shp[1]
        top_spacing=[];
        top_header[3]=shp[0]*shp[1];
        tl=shp[0]*shp[1];
        mode=2;
    else:
        top_header[0]=Module().getImageMagicCode();
        top_header[1]=get_nifti_code(mat.dtype);
        top_header[2]=40;
        top_dimensions=np.zeros(5,dtype=np.int32)
        top_header[3]=1
        tl=1;
        for i in range(0,5):
            top_dimensions[i]=shp[i];
            top_header[3]*=shp[i];
            tl*=shp[i];
            #print('____ Checking Large Image Serialization ', tl,top_header[3],i);
        mode=3;

    # Add more
    itemsize=np.dtype(mat.dtype).itemsize

    if (debug>0):
        print('____ Checking Large Image Serialization ', tl,top_header[3]);
    if (tl>top_header[3] or __force_large_memory == True):
        print('____ Python large image serialization ', tl,top_header[3]);
        top_header[3]=-itemsize;
    else:
        top_header[3]*=itemsize;
        
    
    total=top_header.tobytes();
    if mode>1:
        total+=top_dimensions.tobytes();

    if mode==3:
        total+=top_spacing.tobytes();
        total+=mat.tobytes('F');
    else:
        total+=mat.tobytes('C');
    return total;
    

# wasmarr is ctypes.POINTER(ctypes.c_ubyte)
def deserialize_simpledataobject(wasm_pointer,offset=0,debug=0):

    header=struct.unpack('iiii',bytes(wasm_pointer[offset:offset+16]));
    if (debug>0):
        print('__ deserializing header=',header);

    dims=[];
    spa=[];
    mode=1;
    numbytes=header[3];
    
    if (debug>0):
        print('header=',header);

    if (header[0]==Module().getVectorMagicCode()):
        dims=[ header[3] ];
    elif (header[0]==Module().getMatrixMagicCode()):
        dims=struct.unpack('ii',bytes(wasm_pointer[offset+16:offset+24]));
        mode=2;
        if (header[3]<0):
            numbytes=dims[0]*dims[1]*(-header[3]);
    elif (header[0]==Module().getImageMagicCode()):
        in_dims=struct.unpack('iiiii',bytes(wasm_pointer[offset+16:offset+36]));
        in_spa=struct.unpack('fffff',bytes(wasm_pointer[offset+36:offset+56]));
        done=False
        index=3
        mode=3;
        dims=[ in_dims[0],in_dims[1],in_dims[2] ];
        spa=[ in_spa[0],in_spa[1],in_spa[2] ];
        while index<5 and done==False:
            if in_dims[index]<=1:
                done=True
            else:
                dims.append(in_dims[index]);
                spa.append(in_spa[index]);
            index=index+1;

        if (header[3]<0):
            numbytes=-header[3];
            index=0;
            while (index<len(dims)):
                numbytes*=dims[index];
                index=index+1;
            print('____ Python large image deserialization',dims,numbytes);

            
    datatype=get_dtype(header[1]);
    beginoffset=header[2]+16+offset;
    total=beginoffset+numbytes;

    if (debug>0):
        print('datatype=',datatype,'begin offset=',beginoffset,'total=',total,'bytes=',numbytes,'dimensions=',dims);
    
    if (dims[0]<1 or numbytes<0):
        print('Bad dims=',dims,numbytes);
        raise Exception('----- Zero or Bad Data Length');
    
    if (debug>0):
        itemsize=np.dtype(datatype).itemsize
        print('__ dims=',dims,' spa=',spa,' dtype=',datatype,' totalsize=',total,'datasize=',total-(16+header[2]),itemsize);
        if mode==3:
            print('__ dimsize=',dims[0]*dims[1]*dims[2]);

    order="C";
    if mode==3:
        order="F";

    if (debug):
        print('order=',order,'range=',[beginoffset,total],'dims=',dims);
        
    s=np.reshape(np.fromstring(bytes(wasm_pointer[beginoffset:total]),dtype=datatype),newshape=dims,order=order);
        
    if mode==3 and debug>1:
        mat=s;
        print('__ value post serialization=',[0,0,0],'=',mat[0][0][0]);
        for i in range (36,41):
            print('__ value post serialization=',[i,24,13],'=',mat[i][24][13]);

    if mode==2 and dims[0]==4 and dims[1]==4 and debug>0:
        print('matrix=',s);
    
    
    return {
        'dimensions': dims,
        'spacing': spa,
        'dtype' : datatype,
        'data' : s
    }

def wrapper_serialize(obj):

    if type(obj) is np.ndarray:
        shp=obj.shape;
        l1=len(shp);

        if l1<1 or l1>5:
            raise ValueError('Bad numpy array shape  '+str(shp)+' for direct serialization ...');

        return serialize_simpledataobject(obj);

    out=0;
    try:
        out=obj.serializeWasm();
    except Error:
        raise ValueError('we can only serialize numpy arrays or bis.bisBaseObject derived classes');

    
    return out;

    
def deserialize_object(ptr,datatype='',offset=0,first_input=0):

    import biswebpython.core.bis_objects as bis

    
    if datatype=='':
        datatype=getNameFromMagicCode(magic_code);

    if datatype == 'String':
        output=bis.bisVector();
        output.deserializeWasm(ptr,offset);
        return output.getString();
        
    if  datatype == 'Matrix':
        output=bis.bisMatrix();
        output.deserializeWasm(ptr,offset);
        return output.get_data();


    if datatype == 'Vector':
        output=bis.bisVector();
        output.deserializeWasm(ptr,offset);
        return output.get_data();

    if datatype == 'bisComboTransformation':
        output=bis.bisComboTransformation();
        output.deserializeWasm(ptr,offset);
        return output;
    
    if datatype == 'bisGridTransformation':
        output=bis.bisGridTransformation();
        output.deserializeWasm(ptr,offset);
        return output;

    if datatype == 'bisLinearTransformation':
        output=bis.bisLinearTransformation();
        output.deserializeWasm(ptr,offset);
        return output.get_data();

    if datatype != 'bisImage':
        raise ValueError('Unknown datatype ',datatype);

    # Image from here
    output=bis.bisImage();
    output.deserializeWasm(ptr,offset);
    if type(first_input) is bis.bisImage:
        output.affine=first_input.affine

    return output;

def wrapper_deserialize_and_delete(ptr,datatype,first_input=0):

    out=deserialize_object(ptr,datatype,offset=0,first_input=first_input);
    release_pointer(ptr);    
    return out;
    

