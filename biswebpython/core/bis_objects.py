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
import ctypes
import struct
import json
import nibabel as nib
import biswebpython.core.bis_wasmutils as biswasm
import biswebpython.core.bis_baseutils as bis_baseutils;
import biswebpython.utilities.surface_utils as surutil



# --------------------------------------
# bisBaseObject
# --------------------------------------

class bisBaseObject:

    def __init__(self):
        self.data_array=0;
        self.filename='';

    def serializeWasm(self):
        raise ValueError('serializeWasm Not Implemented');

    def deserializeWasm(self,wasm_pointer,offset=0):
        raise ValueError('deSerializeWasm Not Implemented');

    def getRawSize():
        raise ValueError('getRawSize Not Implemented');


    def deserializeWasmAndDelete(self,wasm_pointer):
        ok=self.deserializeWasm(wasm_pointer,0);
        biswasm.release_pointer(wasm_pointer);
        return ok;

    def is_bis_object(self):
        return 1;

    def get_data(self):
        return self.data_array;

# --------------------------------------
# bisVector
# --------------------------------------
class bisVector(bisBaseObject):

    def __init__(self):
        super().__init__();
        self.isbinary=False;

    def create(self,arr):
        s=arr.shape;
        l=len(s);
        if l!=1:
            raise ValueError('Can only use an one dimensional vector in bisVector')
        self.data_array=arr;
        self.isbinary=False;
        return self;

    def create_from_bytes(self,arr):
        self.data_array=arr;
        self.isbinary=True;
        return self;

    def getRawSize():
        return 16+np.dtype(self.data_array).itemsize*len(self.data_array);


    def serializeWasm(self):
        if (self.isbinary==False):
            return biswasm.serialize_simpledataobject(self.data_array);

        top_header=np.zeros([4],dtype=np.int32);
        top_header[0]=biswasm.getVectorMagicCode();
        top_header[1]=biswasm.get_nifti_code(np.uint8);
        top_header[2]=0;
        top_header[3]=len(self.data_array)
        return top_header.tobytes()+self.data_array;


    def deserializeWasm(self,wasm_pointer,offset=0):
        out=biswasm.deserialize_simpledataobject(wasm_pointer,offset=0,debug=0)
        self.data_array=out['data'];
        return 1;

    def getString(self):
        if (self.data_array.dtype==np.int8):
            return self.data_array.tostring().decode('ascii');
        return "--not a string--";

# --------------------------------------
# bisMatrix
# --------------------------------------

class bisMatrix(bisBaseObject):

    def __init__(self):
        super().__init__();

    def getRawSize():
        return 24+np.dtype(self.data_array).itemsize*len(self.data_array);

    def create(self,arr):
        s=arr.shape;
        l=len(s);
        if l!=2:
            raise ValueError('Can only use a two dimensional matrix in bisMatrix')
        self.data_array=arr;
        return self;

    def serializeWasm(self):
        return biswasm.serialize_simpledataobject(self.data_array);


    def deserializeWasm(self,wasm_pointer,offset=0):
        out=biswasm.deserialize_simpledataobject(wasm_pointer,offset=offset,debug=0)
        self.data_array=out['data'];
        return 1;

    def load(self,fname):

        try:
            file = open(fname)
        except IOError as e:
            raise ValueError('---- Bad input file '+fname+'\n\t ('+str(e)+')')
            return False

        text=file.read()
        ext=os.path.splitext(fname)[1]
        if (ext==".csv"):
            self.data_array = np.genfromtxt(fname, delimiter= ",")
        elif (ext==".matr"):
            libbis=bis_baseutils.getDynamicLibraryWrapper();
            self.data_array=libbis.parseMatrixTextFileWASM(text,0);
        self.filename=fname;
        return True;

    def save(self,fname):

        ext=os.path.splitext(fname)[1]
        s=self.data_array.shape;

        if (ext==".matr"):
            sz=self.data_array.shape;
            if (len(sz)>1):
                out = '#vtkpxMatrix File\n# name: matrix\n# type: matrix\n# rows: '+str(sz[0])+'\n# columns: '+str(sz[1])+'\n';
            else:
                out = '#vtkpxMatrix File\n# name: vector\n# type: vector\n# rows: '+str(sz[0])+'\n# columns: 1\n';
            if (len(sz)>1):
                for row in range(0,sz[0]):
                    for col in range(0,sz[1]):
                        out=out+str(self.data_array[row][col])+" ";
                    out=out+"\n";
            else:
                    for row in range(0,sz[0]):
                        out=out+str(self.data_array[row])+"\n";
            try:
                with open(fname, 'w') as fp:
                    fp.write(out);
                print('++++\t saved in ',fname,len(out));
            except:
                e = sys.exc_info()[0]
                print('----\t failed to save image',e);
                return False

            self.filename=fname;
            return True

        try:
            np.savetxt(fname, self.data_array, delimiter=',')
            self.filename=fname;
        except:
            return False

        return True


# --------------------------------------
# bisImage
# --------------------------------------
class bisImage(bisBaseObject):

    def __init__(self):
        super().__init__();
        self.spacing = [ 1.0,1.0,1.0,1.0,1.0 ];
        self.dimensions = [ 1,1,1,1,1];
        self.affine = np.eye(4);

    def getRawSize():
        return 16+40+np.dtype(self.data_array).itemsize*len(self.data_array);

    def create(self,imagedata,imagespacing,imagematrix):
        s=imagedata.shape;
        l=len(s);

        if l<2 or l>=5:
            raise ValueError('Can only use 2D to 5D matrices in bisImage'+str(s));
        self.data_array=imagedata;
        self.affine=imagematrix;


        l_s=len(imagespacing);
        for i in range(0,5):
            if i<l:
                self.dimensions[i]=int(s[i]);
            if i<l_s:
                self.spacing[i]=float(imagespacing[i]);

        return self;


    def serializeWasm(self):
        return biswasm.serialize_simpledataobject(mat=self.data_array,spa=self.spacing,debug=0,isimage=True);

    def deserializeWasm(self,wasm_pointer,offset=0):
        out=biswasm.deserialize_simpledataobject(wasm_pointer,offset=offset);
        self.data_array=out['data'];
        self.dimensions=out['dimensions'];
        self.spacing=out['spacing'];
        return 1;

    def deserializeWasmAndDelete(self,wasm_pointer,parent=0):
        out=self.deserializeWasm(wasm_pointer,offset=0);
        if parent!=0:
            self.affine=parent.affine
        biswasm.release_pointer(wasm_pointer);
        return 1;

    def load(self,fname):
        
        try:
            # Jackson to add
            # to add tif or anything
            # check if extension is tif
            # call a different load function
            # call self.create
            fileExtension = fname.split('.')[-1] #kind of hacky? Wouldn't work for .gz
            if fileExtension == 'tif' or fileExtension == 'tiff':

                from PIL import Image, ImageSequence #for TIFF support
                img = Image.open(fname)
                imgl = []
                for page in ImageSequence.Iterator(img):
                    imgl.append(page.convert(mode='F'))

                movie = np.empty((imgl[0].size[1], imgl[0].size[0], len(imgl))) #np arrays have 1st index as rows
                for i in range(len(imgl)):
                    movie[:,:,i] = np.array(imgl[i])
                self.create(movie,[1,1,1,1,1],np.eye(4)); # spacing 5-array affine=4x4
            else :
               tmp = nib.load(fname);
               self.create(tmp.get_data(),tmp.header.get_zooms(),tmp.affine);


            self.filename=fname;
            print('++++ loaded ',self.getDescription());

            return self;
        except:
            e = sys.exc_info()[0]
            print('----\t Failed to read image from',fname,e);
            return False;

        return self;

    def save(self,fname):

        try:
            if (self.affine==0):
                self.affine= np.identity(4,dtype=np.float32);
        except ValueError as e:
            f=e;


        try:
            out_image = nib.Nifti1Image(self.data_array, self.affine);
            nib.save(out_image, fname)
            self.filename=fname;
            print('++++\t saved image in ',fname);
        except:
            e = sys.exc_info()[0]
            print('----\t error saving',e);
            return False;

        return True

    def getOrientationName(self):
        a=nib.aff2axcodes(self.affine);
        b=a[0]+a[1]+a[2];
        return b;
    
    def getDescription(self):
        tp=str(self.data_array.dtype);
        return self.filename+'. dims='+str(self.dimensions)+' spa='+str(self.spacing)+' orientation='+self.getOrientationName()+' tp='+tp;

    def hasSameOrientation(self,otherimage,name1='',name2='',debug=False):

        o1=self.getOrientationName();
        o2=otherimage.getOrientationName();

        same=False;
        if (o1==o2):
            same=True;

        if (debug):
            if (same):
                print('++++ '+name1+' and '+name2+' have the same orientation '+o1+' == '+o2+'. Good!');
            else:
                print('---- '+name1+' and '+name2+' have different orientations '+o1+' vs '+o2);
        return same;
# --------------------------------------
# bisLinearTransformation
# --------------------------------------

class bisLinearTransformation(bisMatrix):


    def __init__(self):
        super().__init__();
        self.data_array=np.identity(4,dtype=np.float32);


    def __create(self,arr):
        s=arr.shape;
        if len(s)!=2:
            raise ValueError('Can only use a two dimensional matrix in bisMatrix')

        if s[0]!=4 or s[1]!=4:
            raise ValueError('For bisLinearTransformation Matrix must be 4x4')

        super().create(arr)
        return self;

    def deserializeWasm(self,wasm_pointer,offset=0):
        ok=super().deserializeWasm(wasm_pointer,offset=offset);
        if ok==0:
            return 0;
        s=self.data_array.shape;
        if s[0]!=4 or s[1]!=4:
            self.data_array=0;
            raise ValueError('For bisLinearTransformation Matrix must be 4x4')

        return 1;


    def getRawSize(self):
        return 16+8+4*4*4;

    def parse(self,text):

        lines=text.splitlines()
        if len(lines)<4:
            return 0;

        for i in range(0,4):
            (a, b, c, d) = [t(s) for t,s in zip((float,float,float,float),lines[i].split())]
            self.data_array[i][0]=a;
            self.data_array[i][1]=b;
            self.data_array[i][2]=c;
            self.data_array[i][3]=d;

        return 4;

    def load(self,filename):

        self.data_array=np.identity(4,dtype=np.float32);
        try:
            with open(filename, 'r') as file:
                text=file.read()
                ok=self.parse(text);
                if (ok==4):
                    print('++++\t Loaded matrix transform from ',filename);
                    self.filename=filename;
                    return self;
        except:
            print('Failed to load matrix transformation');

        return False;

    def save(self,filename):
        try:
            np.savetxt(filename, self.data_array, delimiter=' ')
            self.filename=filename;
            print('++++\t saved matrix transformation in ',filename);
        except:
            print('----\t failed to save transformation matrix in',filename);
            return False;
        return True;

# --------------------------------------
# bisGridTransformation
# --------------------------------------

class bisGridTransformation(bisBaseObject):

    def __init__(self):
        super().__init__();
        self.data_array=0;
        self.grid_dimensions=[0,0,0];
        self.grid_spacing=[10,10,10];
        self.grid_origin=[0,0,0];
        self.grid_usebspline=True;

    def create(self,dim=[4,4,4],spa=[10,10,10],ori=[0,0,0],usebpline=True):
        if len(dim.shape)==3:
            self.grid_dimensions=dim;
        if len(spa.shape)==3:
            self.grid_spacing=spa;
        if len(ori.shape)==3:
            self.grid_origin=ori;
        if usebspline==True or usebspline==1:
            self.grid_usebspline=True;
        else:
            self.grid_usebspline=False;

        sz=self.grid_dimensions[0]*self.grid_dimensions[1]*self.grid_dimensions[2];

        self.data_array=np.zeros([sz,3],dtype=np.float32);
        return self;

    def serializeWasm(self):
        s=self.data_array.shape;
        top_header=np.zeros([4],dtype=np.int32);
        top_header[0]=biswasm.getGridTransformMagicCode();
        top_header[1]=biswasm.get_nifti_code(np.float32);
        top_header[2]=40;
        top_header[3]=s[0]*4; # float!!!

        i_head=np.zeros([4],dtype=np.int32);
        f_head=np.zeros([6],dtype=np.float32);

        if self.grid_usebspline:
            i_head[0]=1;
        else:
            i_head[0]=0;
        for ia in range(0,3):
            i_head[ia+1]=self.grid_dimensions[ia];
            f_head[ia]=self.grid_spacing[ia];
            f_head[ia+3]=self.grid_origin[ia];

        return top_header.tobytes()+i_head.tobytes()+f_head.tobytes()+self.data_array.tobytes('F');


    def deserializeWasm(self,wasm_pointer,offset=0):

        header=struct.unpack('iiii',bytes(wasm_pointer[offset:offset+16]));
        if (header[0]!=biswasm.getGridTransformMagicCode()):
            return 0


        i_head=struct.unpack('iiii',bytes(wasm_pointer[offset+16:offset+32]));
        f_head=struct.unpack('ffffff',bytes(wasm_pointer[offset+32:offset+56]));

        self.grid_usebspline=False;
        if i_head[0]==1:
            self.grid_usebspline=True;
        for ia in range(0,3):
            self.grid_dimensions[ia]=i_head[ia+1];
            self.grid_spacing[ia]=f_head[ia];
            self.grid_origin[ia]=f_head[ia+3];

        beginoffset=header[2]+16+offset;
        total=beginoffset+header[3];

        datatype=biswasm.get_dtype(header[1]);
        sz=self.grid_dimensions[0]*self.grid_dimensions[1]*self.grid_dimensions[2];

        self.data_array=np.reshape(np.fromstring(bytes(wasm_pointer[beginoffset:total]),dtype=datatype),newshape=[sz*3],order='F');
        return 1;

    def getRawSize(self):
        databytes=4*3*self.grid_dimensions[0]*self.grid_dimensions[1]*self.grid_dimensions[2];
        headerbytes=16+40;
        return  databytes+headerbytes;

    def getNumberOfControlPoints(self):
        return self.grid_dimensions[0]*self.grid_dimensions[1]*self.grid_dimensions[2];

    def parse(self,lines,offset=0):

        s1= (lines[offset+0].strip() == "#vtkpxBaseGridTransform2 File" );
        s2= (lines[8].strip() == "#vtkpxBaseGridTransform2 File" );
        if s1==False and s2==False:
            raise ValueError('Cannot parse grid transformation');

        # Line 0 =#vtkpxBaseGridTransform2 File
        # Origin = 2, Spacing=4, Dimenions=6, Mode = 8, Displacements start at 10
        ori=lines[offset+2].strip().split(" ");
        spa=lines[offset+4].strip().split(" ");
        dims=lines[offset+6].strip().split(" ");
        for k in range(0,3):
            self.grid_origin[k]=float(ori[k]);
            self.grid_spacing[k]=float(spa[k]);
            self.grid_dimensions[k]=int(dims[k]);

        interp=int(lines[offset+8].strip());
        if interp==4:
            self.grid_usebspline = True
        else:
            self.grid_usebspline = False
        numcontrolpoints=self.grid_dimensions[0]*self.grid_dimensions[1]*self.grid_dimensions[2];
        self.data_array=np.zeros([numcontrolpoints*3],dtype=np.float32);
        for cp in range(0,numcontrolpoints):
            x=lines[offset+10+cp].strip().split(" ");
            for j in range (0,3):
                self.data_array[cp+j*numcontrolpoints]=float(x[j+1]);

        return 10+offset+numcontrolpoints;

    def save(self,filename):
        p=bisComboTransformation();
        p.linear=bisLinearTransformation().create(np.identity(4,dtype=np.float32));
        p.grids=[ self];
        return p.save(filename);

# --------------------------------------
# bisComboTransformation
# --------------------------------------


class bisComboTransformation(bisBaseObject):

    def __init__(self):
        super().__init__();
        self.grids=[];
        self.linear=0;

    def getRawSize(self):
        rawsize=self.linear.getRawSize();
        for ia in range(0,len(self.grids)):
            gsize=self.grids[ia].getRawSize();
            rawsize+=gsize;

        return 20+rawsize;

    def serializeWasm(self):

        if self.linear==0 or len(self.grids)==0:
            raise ValueError('Either no bisLinearTransformation or no Grids in bisComboTransform');

        rawsize=self.getRawSize();
        top_header=np.zeros([4],dtype=np.int32);
        top_header[0]=biswasm.getComboTransformMagicCode();
        top_header[1]=biswasm.get_nifti_code(np.float32);
        top_header[2]=4;
        top_header[3]=rawsize-20; # this is the header

        i_head=np.zeros([1],dtype=np.int32);
        i_head[0]=len(self.grids);

        combo_raw=top_header.tobytes()+i_head.tobytes()+self.linear.serializeWasm();
        for ia in range(0,len(self.grids)):
            combo_raw+=self.grids[ia].serializeWasm();

        return combo_raw;

    def deserializeWasm(self,wasm_pointer,offset=0):

        header=struct.unpack('iiii',bytes(wasm_pointer[offset:offset+16]));

        if (header[0]!=biswasm.getComboTransformMagicCode()):
            return 0;

        i_head=struct.unpack('i',bytes(wasm_pointer[offset+16:offset+20]));

        numgrids=i_head[0];

        offset=offset+20;

        self.linear=bisLinearTransformation();
        self.linear.deserializeWasm(wasm_pointer,offset=offset);
        offset+=self.linear.getRawSize();

        self.grids=[];

        for ia in range(0,numgrids):
            tmp=bisGridTransformation();
            ok=tmp.deserializeWasm(wasm_pointer,offset);
            if ok==1:
                offset=offset+tmp.getRawSize();
                self.grids.append(tmp);

        return 1;


    def load(self,filename):


        with open(filename, 'r') as file:
            lines=file.readlines()
        l=len(lines)

        s1= (lines[0].strip() == "#vtkpxMultiComboTransform File" );
        s2= (lines[0].strip() == "#vtkpxNewComboTransform File" );
        s3= (lines[0].strip() == "#vtkpxBaseGridTransform2 File" );

        if s1==False and s2 ==False and s3==False:
            raise ValueError('Can not load grid from ',filename);

        offset=6;
        if s2==True:
            offset=4;
        if s3==True:
            offset=0;

        self.linear=bisLinearTransformation().create(np.identity(4,dtype=np.float32));

        if s3==False:
            s=lines[offset].strip()+"\n"+lines[offset+1].strip()+"\n"+lines[offset+2].strip()+"\n"+lines[offset+3].strip()+"\n";
            numlines=self.linear.parse(s);
            if numlines==0:
                return 0;
            offset=offset+numlines;

        num=1;
        if s1==True:
            num= int(lines[2].strip());

        self.grids=[];

        for grd in range(0,num):
            ng=bisGridTransformation();
            numlines=ng.parse(lines,offset);
            if numlines>0:
                offset=offset+numlines;
                self.grids.append(ng);
            else:
                return False;

        self.filename=filename;
        return True;

    def save(self,filename):

        try:
            libbis=bis_baseutils.getDynamicLibraryWrapper();
            out=libbis.createComboTransformationTextFileWASM(self,0);
            with open(filename, 'w') as fp:
                fp.write(out);
            print('++++\t Saved ComboTransformation in ',filename);
            self.filename=filename;
            return True;
        except:
            print('---- Failed to save in',filename);

        return False;


# --------------------------------------
# bisSurface
# --------------------------------------

class bisSurface(bisBaseObject):

    def __init__(self):
        super().__init__();
        self.vertices=None;
        self.faces=None;

    def create(self,vertices,faces):
        self.vertices=vertices;
        self.faces=faces;

    def getRawSize():
        raise Exception('----- Not Implemented');

    def serializeWasm(self):
        raise Exception('----- Not Implemented');


    def deserializeWasm(self,wasm_pointer,offset=0):
        raise Exception('----- Not Implemented');

    def getString(self):
        raise Exception('----- Not Implemented');

    def load(self,filename):
        # PLY Reader
        # surutil.loadPly();
        # self.create()
        try:
            vertices,triangles= surutil.readPlyFile(filename);
            self.create(vertices,triangles);
            self.filename=filename;
            print('+++ Surface loaded from',filename,' numverts=',vertices.shape[0])
            return True;
        except:
            print('---- Failed to load surface from',filename);
            return False;

    def save(self,filename):
        try:
            surutil.writePlyFile(self.vertices, self.faces, filename);
            self.filename=filename;
            print('++++ Saved surface in ',filename,' num verts=',self.vertices.shape[0]);
        except:
            print('---- Failed to save surface in ',filename,' num verts=',self.vertices.shape[0]);
            return False;

        return True;




# --------------------------------------
# bisCollection
# --------------------------------------

class bisCollection(bisBaseObject):

    def __init__(self):
        super().__init__();
        self.items=[];

    def getRawSize():
        rawsize=20;
        for ia in range(0,len(self.items)):
            gsize=self.items[ia].getRawSize();
            rawsize+=gsize;
        return rawsize;


    def serializeWasm(self):

        rawsize=self.getRawSize();
        top_header=np.zeros([4],dtype=np.int32);
        top_header[0]=biswasm.getCollectionMagicCode();
        top_header[1]=biswasm.get_nifti_code(np.float32);
        top_header[2]=4;
        top_header[3]=rawsize-20;

        i_head=np.zeros([1],dtype=np.int32);
        i_head[0]=len(self.items);

        combo_raw=top_header.tobytes()+i_head.tobytes();
        for ia in range(0,len(self.items)):
            combo_raw+=self.items[ia].serializeWasm();

        return combo_raw;

    def deserializeWasm(self,wasm_pointer,offset=0):

        header=struct.unpack('iiii',bytes(wasm_pointer[offset:offset+16]));

        if (header[0]!=biswasm.getComboTransformMagicCode()):
            return 0;

        i_head=struct.unpack('i',bytes(wasm_pointer[offset+16:offset+20]));

        numitems=i_head[0];

        offset=offset+20;

        self.items=[];

        for ia in range(0,numitems):
            header=struct.unpack('iiii',bytes(wasm_pointer[offset:offset+16]));
            magic_code=header[0];
            newitem=biswasm.deserialize_object(wasm_pointer,offset);
            self.items.append(newitem);
            offset=offset+newitem.getRawSize();

        return 1;

# -----------------------------
# Load Transformation Factory
# -----------------------------

def loadTransformation(fname):

    combo=bisComboTransformation();
    ok=False
    try:
        ok=combo.load(fname);
    except:
        ok=False

    if (ok!=False):
        return combo

    linear=bisLinearTransformation();
    ok=False;
    try:
        ok=linear.load(fname);
    except:
        ok=False

    if (ok==False):
        return None

    return linear;


