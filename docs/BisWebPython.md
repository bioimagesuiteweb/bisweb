This document contains [developer documentation](README.md) for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). 

---

# Programming In Python within the BisWeb Environment

The BioImage Suite web Python code has significantly fewer features than the [JavaScript codebase](BisWebJS.md). The JS-code includes fully-fledged Web and Desktop applications while Python code primarily focuses on supporting the C++ code through Python modules. 

The Python modules are only a subset of the available JS-modules — they are written primarily for features where the complex logic is implemented in C++. 

The Python code base consists of code in the `python` subdirectory. The most important are:

* `bis_objects.py`
* `bis_wasmutils.py`

The first defines classes to match the JavaScript data-objects. The second contains code to serialize and deserialize Python objects to C-style arrays. The modules themselves are in `biswebpython/modules`.

## BisWeb Python Classes

These can be found in `biswebpython/core/bis_objects.py`. They are written to mirror the `BisWeb` classes from the JS side. They derive from a common parent class `bisBaseObject` and consist of:

* `bisVector`
* `bisMatrix` — this mimics `BisWebMatrix`.
* `bisImage` — this mimics `BisWebImage`.
* `bisLinearTransformation` — this mimics `BisWebLinearTransformation`.
* `bisGridTransformation` — this mimics `BisWebGridTransformation`.
* `bisComboTransformation` — this mimics `BisWebComboTransformation`.

### A Quick Look at bisBaseObject

The code here is simple and consists of wrappers around [numpy](http://www.numpy.org/) arrays. For example, consider the common interface defined in `bisBaseObject`.

The raw-data for each class is stored in `self.data_array` which is a numpy n-dimensional array of appropriate dimensions.

    class bisBaseObject:

        def __init__(self):
            self.data_array = 0;


Then come two functions, `serializeWasm` and `deserializeWASM`, which serialize the data to C-style arrays. The use of WASM here is misleading as the C++ code is actually compiled to native shared libraries. The 'WASM' name is kept for two reasons: 
* (i) it creates symmetry with the better documented JS code and 
* (ii) hopefully WebAssembly will support Python in the near future and the Python codebase will be able to use the cross-platform binary as well.

        def serializeWasm(self):
            raise ValueError('serializeWasm Not Implemented');
        
        def deserializeWasm(self, wasm_pointer, offset = 0):
            raise ValueError('deserializeWasm Not Implemented');

This returns the size in bytes of the WASM-serialized array.

        def getRawSize():
            raise ValueError('getRawSize Not Implemented');

Finally, some common functions for all code:
        
        def deserializeWasmAndDelete(self, wasm_pointer):
            ok = self.deserializeWasm(wasm_pointer, 0);
            biswasm.release_pointer(wasm_pointer);
            return ok;

        def is_bis_object(self):
            return 1;

        def get_data(self):
            return self.data_array;
    

### A Quick Look at bisImage

`bisImage` is the Python equivalent of the JS-class `BisWebImage`. 

The constructor defines the key elements:

    class bisImage(bisBaseObject):

        def __init__(self):
            super().__init__();
            self.spacing = [ 1.0,1.0,1.0,1.0,1.0 ];
            self.dimensions = [ 1,1,1,1,1 ];
            self.affine = 0;

We can create an image from a numpy array `imagedata` as follows:


        def create(self, imagedata, imagespacing, imagematrix):
            s = imagedata.shape;
            l = len(s);

            if l < 2 or l >= 5:
                raise ValueError('Can only use 2D to 5D matrices in bisImage' + str(s));
            self.data_array = imagedata;
            self.affine = imagematrix;

            
            l_s = len(imagespacing);
            for i in range(0, 5):
                if i < l:
                    self.dimensions[i] = int(s[i]);
                if i < l_s:
                    self.spacing[i] = float(imagespacing[i]);

            return self;

`load` and `save` depend on the `nibabel` library:

        def load(self, fname):
            try:
                tmp = nib.load(fname);
                self.create(tmp.get_data(), tmp.header.get_zooms(), tmp.affine);
                return self;
            except:
                e = sys.exc_info()[0]
                print('----\t Failed to read image from', fname, e);
                return False;

            return self;

        def save(self, fname):

            try:
                if (self.affine == 0):
                    self.affine = np.identity(4, dtype = np.float32);
            except ValueError as e:
                f = e;

                
            try:
                out_image = nib.Nifti1Image(self.data_array, self.affine);
                nib.save(out_image, fname)
                print('++++\t saved image in ', fname);
            except:
                e = sys.exc_info()[0]
                print('----\t error saving', e);
                return False;
            
            return True


The reader may notice that `bisImage` is relatively small compared to `BisWebImage`. This is because it is not meant to be a core component of an application, but simply a bridge data structure that transfers data from a Python legible format to a C++ legible format. The components of `BisWebImage` that focus on image processing and rendering are stripped out.

---

## Calling C++ Code from Python

Bisweb's C++ code is compiled as a native shared library and invoked from Python using the [ctypes](https://docs.python.org/3/library/ctypes.html) module in Python 3. This is not discussed in detail here but, similar to the JavaScript setup, the C++ scripts generate a Python interface as well as the `.dll`/`.so`/`.dylib` binary (see `compiletools/bis_create_wrappers.js`).

Paralleling the discussion in [JStoWASM.md](JStoWASM.md), the code for calling the `gaussianSmoothImageWASM` C++ function defined in the module `biswrapper.py` is discussed in detail.

First the module must be initialized by calling its `initialize_module` function. This loads the library by calling `ctypes.CDLL(name)`. The library can be accessed as `wasmutil.Module()` (`wasmutil` refers to the companion module `python\bis_wasmutil.py`.) 
    
The rest of the code is very similar to the JS code
 
    def gaussianSmoothImageWASM(image1, paramobj, debug = 0):

        Module = wasmutil.Module();

        if debug != True and debug !=1 and debug !=2:
            debug = 0;
        elif debug != 2:
            debug = 1;

Serialize `paramobj` to a JSON string using `json.dumps`

        jsonstring_0 = json.dumps(paramobj);
        jsonstring = str.encode(json.dumps(paramobj));

Serialize the image using code in `bis_wrapperutil` (more on this later)

        # Serialize objects and encode strings
        image1_ptr = wasmutil.wrapper_serialize(image1);

Next call the C++ code using `ctypes` to specify the arguments. Pointers are defined as `ctypes.c_void_p`. Both the argument types must be specified using `.argtypes` and the return type of the function must be specified using `.restype` before actually calling the function. This is very similar in-spirit to the Emscripten `Module.ccall` used in the JS-version.

        if debug:
            print('++++ Calling WASM Function:gaussianSmoothImageWASM with ', jsonstring, '\n++++');

        Module.gaussianSmoothImageWASM.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int];
        Module.gaussianSmoothImageWASM.restype = ctypes.POINTER(ctypes.c_ubyte);

        wasm_output = Module.gaussianSmoothImageWASM(image1_ptr, jsonstring, debug);

Then deserialize the output and clean up the memory on the C++ side. While Python does automatic garbage collection, this does not apply to memory allocated in the C++ shared library which must be cleaned up manually.

        # Deserialize Output
        output = wasmutil.wrapper_deserialize_and_delete(wasm_output, 'bisImage', image1);
        
        # Return
        return output;


## Serialization and Deserialization to C++

The Python code uses the same serialization format as the JS code (see[JStoWASM.ms](JStoWASM.md)). The detailed code is in `biswebpython/core/bis_wasmutils.py`. Consider the parity between the JS and Python code for matrices:

* `bisMatrix.serializeWasm`
* `bis_wasmutils.serialize_simpledataobject`

and

* `bisMatrix.deserializeWasm`
* `bis_wasmutils.deserialize_simpledataobject`

The member functions of `bisMatrix` are:

    def serializeWasm(self):
        return biswasm.serialize_simpledataobject(self.data_array);


    def deserializeWasm(self, wasm_pointer, offset = 0):
        out = biswasm.deserialize_simpledataobject(wasm_pointer, offset = offset, debug = 0)
        self.data_array = out['data'];
        return 1;


First consider `bis_wasmutils.serialize_simpledataobject`. Eliminating all matrix code it simplifies to:

    def serialize_simpledataobject(mat,spa=[1.0,1.0,1.0,1.0,1.0],debug=0,isimage=False):

        shp=mat.shape;
                    
This is the global serialization header:

        top_header=np.zeros([4],dtype=np.int32);
        top_header[0]=Module().getMatrixMagicCode();
        top_header[1]=get_nifti_code(mat.dtype);
        top_header[2]=8;

This is the matrix specific header:

        top_dimensions=np.zeros(2,dtype=np.int32)
        top_dimensions[0]=shp[0]
        top_dimensions[1]=shp[1]
        top_header[3]=shp[0]*shp[1]; 

        itemsize=np.dtype(mat.dtype).itemsize
        top_header[3]=top_header[3]*itemsize;

The headers are chained to the actual data. Matrices are stored in 'C-style' [row-major order](https://en.wikipedia.org/wiki/Row-_and_column-major_order).

        total = top_header.tobytes();
        total += top_dimensions.tobytes();
        total += mat.tobytes('C');
    return total;

The deserialize function is below — again simplified for matrices only:

    # wasmarr is ctypes.POINTER(ctypes.c_ubyte)
    def deserialize_simpledataobject(wasm_pointer, offset = 0, debug = 0):
        

First unpack the 4-integer header, `iiii`:

        header = struct.unpack('iiii', bytes(wasm_pointer[offset: offset + 16]));
        dims=[];


Make sure it is a matrix: 

        if (header[0] == Module().getMatrixMagicCode()):
            dims = struct.unpack('ii', bytes(wasm_pointer[offset + 16: offset + 24]));
            mode = 2;
        else
            return;

Get the data type and the offset into the data:

        datatype = get_dtype(header[1]);
        beginoffset = header[2] + 16 + offset;
        total = beginoffset + header[3];
        

This is "C-style" row major:

        order = "C";

Extract and reshape the data from the raw `wasm_pointer`:

        s = np.reshape(np.fromstring(bytes(wasm_pointer[beginoffset: total]), dtype = datatype), newshape = dims, order = order);
            
Return a dictionary with all info:

        return {
            'dimensions' : dims,
            'dtype' : datatype,
            'data' : s
        }

The data element of this is the desired numpy array.

---

## A Python Regression Test Example

This is adapted from `tests/test_imageresample.py` and uses the Python [unittest](https://docs.python.org/3/library/unittest.html) package.

First import common objects:

    import math
    import os
    import sys
    import numpy as np
    import unittest

Then import the BioImage Suite web modules


    my_path = os.path.dirname(os.path.realpath(__file__));
    sys.path.append(os.path.abspath(my_path + '/../biswebpython/modules'));
    import resliceImage;

    import biswrapper as libbis;
    import bis_objects as bis


Unittest regression tests are methods beginning with the word `test` of classes deriving from `unittest.TestCase`:

    class TestResample(unittest.TestCase):

### A first test using raw C++ code calls

The test will be to reslice an image using a linear 4x4 matrix using the C++ code.

        def test_resample(self):

First define the images and load them:

            imgnames = [ 'avg152T1_LR_nifti_resampled.nii.gz', 
                    'avg152T1_LR_nifti.nii.gz', 
                        'avg152T1_LR_nifti_resampled_resliced.nii.gz']
            images = [ 0,0,0 ];
            names=[ 'reference', 'target', 'true' ];

            for i in range(0, 3):
                name = my_path + '/../test/testdata/' + imgnames[i];
                images[i] = bis.bisImage().load(name);
            
            reference_image = images[0];
            target_image = images[1];
            true_image = images[2];


Next define the matrix as a numpy array. The wrappers will automatically encapsulate a numpy matrix as a `bisLinearTransformation` if one is passed. 

            reslice_matr = [ [  0.866,  -0.525  , 0.000,  68.758 ],
                    [  0.500,   0.909 ,  0.000 ,  9.793 ],
                    [ 0.000,   0.000 ,  1.000 ,  2.250 ],
                    [ 0.000,   0.000,   0.000 ,  1.000  ] ];
            
            matr = np.zeros( [4,4], dtype = np.float32);
            for row in range(0,4):
                for col in range(0,4):
                    matr[row][col] = reslice_matr[row][col];

Now the code can be called. First the parameters are specified as a dictionary:
            
            paramobj = {
                "interpolation" : 1,
                "dimensions" : reference_image.dimensions,
                "spacing" : reference_image.spacing,
                "datatype" : "float",
                "backgroundValue" : 0.0,
            };

Next the actual function call:

            out_obj = libbis.resliceImageWASM(images[1], matr, paramobj, debug = 2);

Then compute the correlation coefficient between the output image `out_obj` and the expected result `images[2]`.

            cc = np.corrcoef(images[2].get_data().flatten(), out_obj.get_data().flatten())[0,1];

If this is > 0.999 then the test passes.

            if cc > 0.999:
                testpass = True
            else:
                testpass = False;
            
            self.assertEqual(testpass,True);

### A second regression test using the bisweb Python resliceImage module

This is very similar in spirit to the above; however, this test uses the full bisweb module architecture (described in [ModulesInPython.md](ModulesInPython.md))
instead of direct calls to the C++ code.


        def test_resample_module(self):

            imgnames = [ 'avg152T1_LR_nifti_resampled.nii.gz', 
                    'avg152T1_LR_nifti.nii.gz', 
                        'avg152T1_LR_nifti_resampled_resliced.nii.gz']
            images = [ 0,0,0 ];
            names=[' reference', 'target', 'true'];

          
            for i in range(0,3):
                name = my_path + '/../test/testdata/' + imgnames[i];
                images[i] = bis.bisImage().load(name)
                print('__ loaded ', names[i], 'from ', name, 'dims=', images[i].dimensions, images[i].spacing,images[i].dimensions, images[i].get_data().dtype);
         

Here the actual loading of the transformation from a file using `bisLinearTransformation` is highlighted. 

            xformname = my_path + '/testdata/newtests/reslice_transform.matr';
            xform = bis.bisLinearTransformation();
            xform.load(xformname);
            
            module = resliceImage.resliceImage();
            reference_image = images[0];
            target_image = images[1];
            true_image = images[2];
            
Invoke the module the inputs and parameters below. The signature for the modules's execute function is `module.execute(inputs, parameters)`:

            module.execute({
                'input' : target_image,
                'reference' : reference_image,
                'transform' : xform
            },{
                'interpolation' : 1,
                'debug' : True
            });

Get the output object from module.getOutputObject:

            out_obj = module.getOutputObject('output');


As before compare the expected result to the actual

            cc = np.corrcoef(images[2].get_data().flatten(), out_obj.get_data().flatten())[0,1];

            if cc > 0.999:
                testpass = True
            else:
                testpass = False;
            
            self.assertEqual(testpass, True);
        
