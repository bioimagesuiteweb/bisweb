
# Programming In Python within the BisWeb Environment

The BioImage Suite web Python code has significantly fewer features than the [JavaScript codebase](BisWebJS.md). The JS-code includes fully-fledged Web and Desktop applications.  The Python code, by contrast, primarily focusses on supporting the use of C++-implemented functionality from Python modules. These are a subset of the available JS-modules. We create Python modules only for those modules where there is little logic on the JS-side and where all complex functionality is in C++.

The Python code base consists of code in the `python` subdirectory. The most important are:

* bis_objects.py
* bis_wasmutils.py


The first defines classes to match the JavaScript data-objects. The second contains code to serialize and deserialize our Python objects to C-style arrays. The modules themselves are in `python/modules`.

## BisWeb Python Classes

These can be found in `python/bis_objects.py`. These derive from a common parent class `bisBaseObject` and consist of:

* bisVector
* bisMatrix  -- this mimics BisWebMatrix in JS.
* bisImage -- this mimics BisWebImage in JS.
* bisLinearTransformation -- this mimics BisWebLinearTransformation in JS.
* bisGridTransformation -- this mimics BisWebGridTransformation in JS.
* bisComboTransformation -- this mimics BisWebComboTransformation in JS.

### A Quick Look at bisBaseObject

The code here is very simple and consists of simple wrappers around numpy arrays. For example, consider the common interface defined in bisBaseObject.

The raw-data for each class is stored in `self.data_array` which is a [numpy](http://www.numpy.org/) n-dimensional array of appropriate dimensions.

    class bisBaseObject:

        def __init__(self):
            self.data_array=0;


Then come two functions called serializeWasm and deserializeWASM which serialize the data to C-style arrays. The use of WASM here is misleading as the C++ code is actually compiled to native shared libraries. We keep the 'WASM' name for two reasons: (i) it creates symmetry with the better documented JS code and (ii) we hope that soon Python will acquire WebAssembly support and we will be able to use this cross-platform binary for Python as well.

        def serializeWasm(self):
            raise ValueError('serializeWasm Not Implemented');
        
        def deserializeWasm(self,wasm_pointer,offset=0):
            raise ValueError('deSerializeWasm Not Implemented');

This returns the raw size in bytes of the WASM-serialized array.

        def getRawSize():
            raise ValueError('getRawSize Not Implemented');

Finally some common functions for all code:
        
        def deserializeWasmAndDelete(self,wasm_pointer):
            ok=self.deserializeWasm(wasm_pointer,0);
            biswasm.release_pointer(wasm_pointer);
            return ok;

        def is_bis_object(self):
            return 1;

        def get_data(self):
            return self.data_array;
    

### A Quick Look at bisImage

This is the Python-equivalent to the JS-class BisWebImage. This, is more minimal implementation as its goal is simply to get one quickly from a numpy array to the C++ code and back with minimal overhead. It is meant more as a bridge data-structure than one used as a core data-structure in an application.

The constructor defines the key elements:

    class bisImage(bisBaseObject):

        def __init__(self):
            super().__init__();
            self.spacing = [ 1.0,1.0,1.0,1.0,1.0 ];
            self.dimensions = [ 1,1,1,1,1];
            self.affine = 0;

We can create an image from a numpy array imagedata as follows:


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

Load and Save depend on the `nibabel` library:

        def load(self,fname):
            try:
                tmp = nib.load(fname);
                self.create(tmp.get_data(),tmp.header.get_zooms(),tmp.affine);
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
                print('++++\t saved image in ',fname);
            except:
                e = sys.exc_info()[0]
                print('----\t error saving',e);
                return False;
            
            return True
            
---

## Calling C++ Code from Python

Our C++ code is compiled as a native shared library and invoked from Python using the [ctypes](https://docs.python.org/3/library/ctypes.html) module in Python 3. We will not discuss this in detail here but, similar to the JS case, in addition to the actual .dll/.so/.dylib library we automatically generate an interface python library (`biswrapper.py`) using the script `compiletools/bis_create_wrappers.js` is used (invoked via CMake).

Paralleling the discussion in [JStoWASM.md](JStoWASM.md) we will examine here the code for calling the gaussianSmoothImageWASM C++ function defined in the module biswrapper.py.

First the module must be initialized by calling its initialize_module function. This loads the library by eventually calling `ctypes.CDLL(name)`. The library can be accessed as `wasmutil.Module()` (wasmutil refers to the companion module `python\bis_wasmutil.py`.) 
    
The rest of the code is very similar to the JS code
 
    def gaussianSmoothImageWASM(image1,paramobj,debug=0):

        Module=wasmutil.Module();

        if debug!=True and debug!=1 and debug!=2:
            debug=0;
        elif debug!=2:
            debug=1;

We serialize here the paramobj to a JSON string using `json.dumps`

        jsonstring_0=json.dumps(paramobj);
        jsonstring=str.encode(json.dumps(paramobj));

We serialize the image using code in `bis_wrapperutil` (more on this later)

        # Serialize objects and encode strings
        image1_ptr=wasmutil.wrapper_serialize(image1);

We next call the C++ code using ctypes to specify the arguments. Pointers are defined as `ctypes.c_void_p`. We must specify both the argument types (using .argtypes) and the return type of the function (using .restype) before actually calling the function. This is very similar 'in-spirit' to the Emscripten `Module.ccall` used in the JS-version.

        if debug:
            print('++++ Calling WASM Function:gaussianSmoothImageWASM with ',jsonstring,'\n++++');

        Module.gaussianSmoothImageWASM.argtypes=[ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int];
        Module.gaussianSmoothImageWASM.restype=ctypes.POINTER(ctypes.c_ubyte);

        wasm_output=Module.gaussianSmoothImageWASM(image1_ptr, jsonstring, debug);

We then deserialize the output and clean up the memory on the C++ side. Again while Python does automatic garbage collection, this does not apply to memory allocated in the C++ shared library which must be cleaned up manually.

        # Deserialize Output
        output=wasmutil.wrapper_deserialize_and_delete(wasm_output,'bisImage',image1);
        
        # Return
        return output;


## Serialization and Deserialization to C++

We use the same exact serialization format as the JS code (see again [JStoWASM.ms](JStoWASM.md)). The detailed code is in `python/bis_wasmutils.py`. The interested reader should follow the code trace from, e.g. for matrices

* bisMatrix.serializeWasm
* bis_wasmutils.serialize_simpledataobject

and

* bisMatrix.deserializeWasm
* bis_wasmutils.deserialize_simpledataobject

Let's examine these briefly. The member functions of bisMatrix are:

    def serializeWasm(self):
        return biswasm.serialize_simpledataobject(self.data_array);


    def deserializeWasm(self,wasm_pointer,offset=0):
        out=biswasm.deserialize_simpledataobject(wasm_pointer,offset=offset,debug=0)
        self.data_array=out['data'];
        return 1;


First let's examine bis_wasmutils.serialize_simpledataobject. If we eliminate all non-matrix code it simplifies to:

    def serialize_simpledataobject(mat,spa=[1.0,1.0,1.0,1.0,1.0],debug=0,isimage=False):

        shp=mat.shape;
                    
This is the global serialization header

        top_header=np.zeros([4],dtype=np.int32);
        top_header[0]=Module().getMatrixMagicCode();
        top_header[1]=get_nifti_code(mat.dtype);
        top_header[2]=8;

This is the matrix specific header

        top_dimensions=np.zeros(2,dtype=np.int32)
        top_dimensions[0]=shp[0]
        top_dimensions[1]=shp[1]
        top_header[3]=shp[0]*shp[1]; 

        itemsize=np.dtype(mat.dtype).itemsize
        top_header[3]=top_header[3]*itemsize;

We chain the headers and the actual data. Matrices are stored in 'C' style [row-major order](https://en.wikipedia.org/wiki/Row-_and_column-major_order).

        total=top_header.tobytes();
        total+=top_dimensions.tobytes();
        total+=mat.tobytes('C');
    return total;

The deserialize function is below (again simplified for matrices only, we eliminate if statements etc.)

    # wasmarr is ctypes.POINTER(ctypes.c_ubyte)
    def deserialize_simpledataobject(wasm_pointer,offset=0,debug=0):
        

First we unpack our 4-integer header ('iiii').

        header=struct.unpack('iiii',bytes(wasm_pointer[offset:offset+16]));
        dims=[];


Make sure it is a matrix 

        if (header[0]==Module().getMatrixMagicCode()):
            dims=struct.unpack('ii',bytes(wasm_pointer[offset+16:offset+24]));
            mode=2;
        else
            return;

Get the data type and the offset into the data

        datatype=get_dtype(header[1]);
        beginoffset=header[2]+16+offset;
        total=beginoffset+header[3];
        

This is "C"-style row major

        order="C";

Extract and reshape the data from the raw wasm_pointer

        s=np.reshape(np.fromstring(bytes(wasm_pointer[beginoffset:total]),dtype=datatype),newshape=dims,order=order);
            
Return a dictionary with all info

        return {
            'dimensions': dims,
            'dtype' : datatype,
            'data' : s
        }

The data element of this is the numpy array we want.

---

## A Python Regression Test Example

This is adapted from `tests/test_imageresample.py` and uses the Python [unittest](https://docs.python.org/3/library/unittest.html) package.

First we import common objects:

    import math
    import os
    import sys
    import numpy as np
    import unittest

Then we import the BioImage Suite web modules


    my_path=os.path.dirname(os.path.realpath(__file__));
    sys.path.append(os.path.abspath(my_path+'/../python/modules'));
    import resliceImage;

    import biswrapper as libbis;
    import bis_objects as bis


Unittest regression tests are methods beginning with the word `test` of classes deriving from unittest.TestCase

    class TestResample(unittest.TestCase):

### A first test using raw C++ code calls

Here is our test. It will reslice an image using a linear 4x4 matrix using our C++ code.

        def test_resample(self):

First we define the images and load them

            imgnames = [ 'avg152T1_LR_nifti_resampled.nii.gz',
                    'avg152T1_LR_nifti.nii.gz',
                        'avg152T1_LR_nifti_resampled_resliced.nii.gz']
            images = [0,0,0];
            names=[' reference','target','true'];

            for i in range(0,3):
                name=my_path+'/../test/testdata/'+imgnames[i];
                images[i]=bis.bisImage().load(name)
            
            reference_image=images[0];
            target_image=images[1];
            true_image=images[2];


We next define the matrix as a numpy array. The wrappers are smart enough so if we pass a numpy matrix instead of a bisLinearTransformation they will encapsulate this automatically

            reslice_matr = [ [  0.866,  -0.525  , 0.000,  68.758 ],
                    [  0.500,   0.909 ,  0.000 ,  9.793 ],
                    [ 0.000,   0.000 ,  1.000 ,  2.250 ],
                    [ 0.000,   0.000,   0.000 ,  1.000  ]];
            
            matr=np.zeros([4,4],dtype=np.float32);
            for row in range(0,4):
                for col in range(0,4):
                    matr[row][col]=reslice_matr[row][col];

We are now ready to call the code. First the parameters specified as a dictionary
            
            paramobj = {
                "interpolation" : 1,
                "dimensions" : reference_image.dimensions,
                "spacing" : reference_image.spacing,
                "datatype" : "float",
                "backgroundValue" : 0.0,
            };

Next the actual function call

            out_obj=libbis.resliceImageWASM(images[1],matr,paramobj,debug=2);

Then we compute the correlation coefficient between our output image `out_obj` and the expected result `images[2]`.

            cc=np.corrcoef(images[2].get_data().flatten(),out_obj.get_data().flatten())[0,1];

If this is >0.999 then return True

            if cc>0.999:
                testpass=True
            else:
                testpass=False;
            
            self.assertEqual(testpass,True);

### A second regression test using the bisweb Python resliceImage module

This is very similar in spirit to the above. Here we use the full bisweb module architecture (described in [ModulesInPython.md](ModulesInPython.md))
instead of direct calls to the C++ code.


        def test_resample_module(self):

            imgnames = [ 'avg152T1_LR_nifti_resampled.nii.gz',
                    'avg152T1_LR_nifti.nii.gz',
                        'avg152T1_LR_nifti_resampled_resliced.nii.gz']
            images = [0,0,0];
            names=[' reference','target','true'];

          
            for i in range(0,3):
                name=my_path+'/../test/testdata/'+imgnames[i];
                images[i]=bis.bisImage().load(name)
                print('__ loaded ',names[i], 'from ', name,'dims=',images[i].dimensions,images[i].spacing,images[i].dimensions,images[i].get_data().dtype);
         

Here we illustrate actually loading the transformation from a file using bisLinearTransformation. 

            xformname=my_path+'/testdata/newtests/reslice_transform.matr';
            xform=bis.bisLinearTransformation();
            xform.load(xformname);
            
            module=resliceImage.resliceImage();
            reference_image=images[0];
            target_image=images[1];
            true_image=images[2];
            
We invoke the module the inputs and parameters below. The signature for the modules's execute function is module.execute(inputs,parameters):

            module.execute({
                'input': target_image,
                'reference' : reference_image,
                'transform' : xform
            },{
                'interpolation' : 1,
                'debug' : True
            });

We get the output object from module.getOutputObject

            out_obj=module.getOutputObject('output');


As before we compare the expected result to the actual

            cc=np.corrcoef(images[2].get_data().flatten(),out_obj.get_data().flatten())[0,1];

            if cc>0.999:
                testpass=True
            else:
                testpass=False;
            
            self.assertEqual(testpass,True);
        
