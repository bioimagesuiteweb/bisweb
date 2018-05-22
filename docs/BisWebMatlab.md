This document contains [developer documentation](README.md) for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). 

---

# Programming In Matlab within the BisWeb Environment

## Introduction

The BioImage Suite web Matlab code is primitive compared to the  [JavaScript codebase](BisWebJS.md) and even the [Python codebase](BisWebPython.md). It is more of a proof of concept at its current stage rather than a serious fully-fledged interface for production use. In particular, there are no Matlab-based regression tests. However the C++ library used with Matlab is identical to library used with Python so at least the C++ code is implicitly regression tested via Python. 

The Matlab code can be found in the `matlab` subdirectory. The interface consists of a single file

* [bis_wasmutils.m](../matlab/bis_wasmutils.m)

This works in conjuction with an automatically generated file called `biswrapper.m` (created as part of the Python native build if the option `BIS_A_MATLAB` is set to `ON` in CMake.)

This implements all the serialization and deserialization functionality and the calling of the C++ code. A number of other `.m` files in the same directory provide examples. 

---

## An Example

Here is one example, abbreviated from `matlab\test_wrap.m`. This is very similar to the example in [BisWebPython.md](BisWebPython.md).

This first line loads the C++ library by internally calling `bis_wasmutils.loadlib()`. (This function will some fixing for multi-platform support.)

    lib=biswrapper();

Then we create a list of image filenames:

    imagenames= {};
    imagenames{1}='avg152T1_LR_nifti_resampled.nii.gz';
    imagenames{2}='avg152T1_LR_nifti.nii.gz';
    imagenames{3}='avg152T1_LR_nifti_resampled_resliced.nii.gz'

Images are loaded one by one using the [Matlab NIFTI package by Jimmy Shen](https://www.mathworks.com/matlabcentral/fileexchange/8797-tools-for-nifti-and-analyze-image) which needs to be installed and in your Matlab path.

    images = { };

    for i = 1:3
    filename=strcat('..\test\testdata\',imagenames{i});
    images{i} = load_untouch_nii(filename,[],[],[],[],[],[]);
    end

Then create the 4x4 matrix:

    reslice_matr = [   0.866,  -0.525  , 0.000,  68.758 ;
                    0.500,   0.909 ,  0.000 ,  9.793 ;
                    0.000,   0.000 ,  1.000 ,  2.250 ;
                    0.000,   0.000,   0.000 ,  1.000 ];


We create the parameter object:

    paramobj = { };
    paramobj.interpolation=1;
    paramobj.dimensions=[ 73,49,28 ];
    paramobj.spacing=[ 2.5,4.5,6.5 ];
    paramobj.datatype='float';
    paramobj.backgroundValue=0.0;

Then call `resliceImageWASM` to perform the reslicing:

    out_img=lib.resliceImageWASM(images{2},reslice_matr,paramobj,2);

This returns the output image structure. The raw intensities can be accessed via `out_img.data`, e.g.

    size(out_img.data)
    out_img.data(37,25,14)
    out_img.data(41,25,14)

---

## Some Additional Comments

### Loading the Library

Bisweb for Matlab uses the Matlab function [loadlibrary](https://www.mathworks.com/help/matlab/ref/loadlibrary.html) to load the C++ library. This takes two arguments:

* the .dll/.so/.dylib library itself
* a header file defining the functions using pure C-style definitions

The header file is created using `compiletools/bis_create_wrappers.js` (invoked via CMake). This consists of the parsed header files from the C++ code, i.e. the header files stripped of conditional statements such as #ifdef, #extern,etc., defining the actual functions. For example, the entry for `gaussianSmoothImageWasm`

    unsigned char*  gaussianSmoothImageWASM(unsigned char* input,const char* jsonstring,int debug);

### Serialization and Deserialization

#### Serialization

The bisweb Matlab code relies heavily on the function [typecast](https://www.mathworks.com/help/matlab/ref/typecast.html?searchHighlight=typecast&s_tid=doc_srchtitle) to create byte arrays. The following shows the code for serializing a Matrix, split into two functions.

The first function contains a bytearray for a matrix — see [BisWebJS.md](BisWebJS.md) for the serialization format. Essentially the byte-array has:

*  4 x `int32` header
*  2 x `int32` matrix header (dimensions)
*  the raw data

Because of Matlab's Fortran root's we need to transpose the matrix prior to serialization to make it 'row-major'.

    function out=serialize_dataobject_bytearray(mat)
     

Get the data type and the matrix dimensions first.

        itemsize = get_type_size(mat);
        shp = size(mat);

Then create the global `int32[4]` header.

        top_header = zeros(1,4,'int32');
        top_header(1) = get_matrix_magic_code();
        top_header(2) = get_nifti_code(mat);
        top_header(3) = 8;
        top_header(4) = itemsize*shp(1)*shp(2);

Next comes the matrix header,

        dimensions=[ shp(1),shp(2) ];

then the transposed and flattened matrix.

        m2=reshape( (mat'), 1, prod(dimensions) );

Next create raw byte arrays for the three parts:

        head_b = typecast(top_header, 'uint8');
        dim_b = typecast(dimensions, 'uint8');
        data_b = typecast(m2, 'uint8');
 
 These are then combined to create a single 1-d byte array
 
        out = cat(2,head_b,dim_b,data_b);
        
    end

The second function calls the first and then creates a pointer using the [libpointer function](https://www.mathworks.com/help/matlab/ref/libpointer.html?searchHighlight=libpointer&s_tid=doc_srchtitle)

    function out = serialize_dataobject(mat)

        ptr = serialize_dataobject_bytearray(mat, spa, debug);
        out = libpointer('voidPtr', ptr);
    end
    
    

#### Deserialization

Deserialization is simplified for a matrix object

    function out = deserialize_pointer(ptr)

This is the offset into the ptr. It may be set to zero here.

        offset = 0;

Extract the first 16-bytes and create the main header. `get_matlab_type` and `get_matlab_type_size` are utility functions inside `bis_wrapper.m`

        reshape(ptr, 16 + offset, 1);
        top_header = typecast(ptr.Value(1 + offset: 16 + offset),'int32');
        typename = get_matlab_type(top_header(2));
        headersize = top_header(3);
        data_bytelength = top_header(4);

        typesize = get_matlab_type_size(typename);
        data_length = data_bytelength / typesize;

        total_length = 16 + headersize + data_bytelength;

Then get the raw data

        reshape(ptr, total_length + offset, 1);
        rawdata = ptr.Value;

In the case that top_header(1) has the type of matrix

        switch(top_header(1))
        case get_matrix_magic_code()

Rxtract the matrix dimensions (bytes 17:24)
            dimensions = typecast(rawdata(17 + offset: 24 + offset, :),'int32');

We extract the raw data

            data = typecast(rawdata(25 + offset: total_length + offset, 1: 1), typename);

We reshape and then transpose back to col-major 'Fortran' style order

            out = reshape(data, dimensions(2), dimensions(1));
        end
        
    end


### Calling the C-function

Again we make use of the wrapper functions. For `gaussianSmoothImageWASM` the Matlab interface function has the form:

    function output = gaussianSmoothImageWASM(image1, paramobj, debug)

        if debug ~= 1 && debug ~= 2
            debug = 0;
        end

`biswasm` has a custom JSON serializer for `paramobj`.

        jsonstring = biswasm.json_stringify(paramobj);

Serialize the image.

        % Serialize objects
        image1_ptr = biswasm.wrapper_serialize(image1, 'bisImage');

We use the [Matlab function calllib](https://www.mathworks.com/help/matlab/ref/calllib.html?searchHighlight=calllib&s_tid=doc_srchtitle) to call the function:

        wasm_output = calllib(biswasm.Module, 'gaussianSmoothImageWASM', image1_ptr, jsonstring, debug);

We then deserialize the output and return

        output = biswasm.wrapper_deserialize_and_delete(wasm_output, 'bisImage');
  
    end

For matrices and vectors the result is a matlab matrix. For images the deserialization creates a structure with members that contain the image dimensions, the image spacing, and the 5-d matrix containing the image data respectively. The following is a snippet from the image deserialization code:

        out = { };
	    dimensions = typecast(rawdata(17 + offset: 36 + offset, :), 'int32');
	    out.dimensions = dimensions;
        out.spacing = typecast(rawdata(37 + offset: 56 + offset, :), 'single');
	    tmp = typecast(rawdata(57 + offset: total_length + offset, 1: 1), typename);
	    out.data = reshape(tmp, dimensions(1), dimensions(2), dimensions(3), dimensions(4), dimensions(5));
