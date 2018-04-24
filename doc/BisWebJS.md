
[NIFTI]: https://nifti.nimh.nih.gov/nifti-1/

# Programming in JavaScript within the BisWeb JavaScript Environment

This document describes some of the core code in BioImage Suite Web and how to use it for your own JavaScript programming both for your own needs and for extending BioImage Suite Web.

We will first describe two core modules:

* `js/core/bis_genericio` -- a set of functions which abstract file input/output
* `js/coreweb/bis_webutil` -- a set of functions for interfacing with the web page

Next we will discuss the core data objects in bisweb which all derive from bisweb_dataobject. This can all be found in `js/dataobjects`.

* BisWebDataObject (`js/dataobjects/bisweb_dataobject.js`) -- this is the abstract class from which all other objects derive.
* BisWebMatrix (`js/dataobjects/bisweb_matrix.js`) -- a class for storing 2D float matrices.
* BisWebImage (`js/dataobjects/bisweb_image.js`) -- a class for storing 2D->5D images. This stores both the image data and a [NIFTI-1](https://nifti.nimh.nih.gov/nifti-1/) image header describing the image metadata (orientation etc.)
* The transformation classes that derive from BisWebBaseTransformation (`js/dataobjects/bisweb_basetransformation.js`). 
    - The linear transformation class BisWebLinearTransformation -- this is used to store the results of linear/affine registrations.
    - The grid transformation class BisWebGridTransformation. This is used to store the results of nonlinear (tensor b-spline grid) registrations.
    - The combo transformation class BisWebComboTransformation. This stores a combination of a linear transformation and a collection of grids. This is the most common output of a nonlinear image registration as this is often preceeded by a linear transformation
    - The class BisWebTransformationCollection which stores arbitrary combinations of transformations (inspired by the VTK class vtkGeneralTransform).
* The collection class BisWebDataObjectCollection (`js/dataobjects/bisweb_dataobjectcollection.js`) which stores and serializes a collection of bisweb_dataobjects.js. It also has some static functions to create any type of BisWebDataObject from a json string or file (for de-serialization).

---

## File I/O (`core/bis_genericio.js`)

### Introduction

File I/O in JavaScript is complicated by the fact that it is different depending on whether it is being performed in a Web Application or a commandline/desktop application.

For desktop (Electron) and commandline applications, file I/O in JS is very similar in spirit to any other language. The only difference here is that (though there are options for synchronous I/O) the bisweb code uses asynchronous file reading and writing which add a small layer of complexity.

On the other hand, Web Applications have no way to directly access the filesystem. File input is restricted to files opened as a result of the user interfacing with an `<input type="file">` element. File output is effectively a download file event. In both cases we have limited information from the system. For example, in file input we actually get an opaque file handle as our input which does not provide full path information (for obvious security reasons). 

For file output, all we can do is request that a file be downloaded. We have no information as to whether the user pressed cancel or as to what the actual filename was (we can provide an initial filename but the user can change it.). One complication of this is that the hard work of creating the output file has to be done before the filename is requested from the user.

See the following [MDN page](https://developer.mozilla.org/en-US/docs/Web/API/File) for more information. Given a file object we can get at least the tail part of the filename using its `.name` member variable.

Our goal in bisweb is to abstract away these details to enable the programmer to write code that will mostly work in all three contexts. One source of confusion is that in the code you will see comments of the form:

    * @param {string} filename - the url or filename or file object

This is because filename may be a string or it may be a [FILE object](https://developer.mozilla.org/en-US/docs/Web/API/File) depending on whether we are in commandline/desktop or web application mode.

### Compressed Files

The Bisweb code can read and write gzipped (`.gz`) compressed files. This is part of the core dependence on the [NIFTI][NIFTI] (`.nii.gz`) as our main image file format. Files ending in `.nii.gz` will be automatically un-gzipped `on read` and filenames ending in `.nii.gz` will be compressed `on save`. A complication is that in web applications we have no way of knowing the final filename. Hence for images changing the extension for .nii.gz to .nii on save will not change the internal compression as this has already been done.

### A quick note on Electron

We use Electron for desktop applications. While Electron is essentially built on node.js, we disable node.js functionality in the "desktop" application by default to ensure better compatibility of web-based code. However we create back-door (described elsewhere) via the use of a preload file (`web/bispreload.js`) that provides access to a select subset of node functionality in our web application (See the document [DesktopAppsWithElectron.md](DesktopAppsWithElectron.md) for more details.)

__To ensure compatibility in node.js and Electron__ if using standard node.js packages such as 'fs', 'path' and 'os', you should always request these through bis_genericio and not directly.

For example, in bisweb we never specify (unless the code will only work in commandline node.js applications)

    let fs=require('fs');

Instead we access fs as:

    let bis_genericio=require('bis_genericio')
    let fs=bis_genericio.getfsmodule();

The same applies to the commonly used 'path', 'os' and 'glob' modules. See the description of bis_genericio next.

### The bis_genericio module

This provides the following exported functions.

    const bisgenericio = {

The first two functions (which are identical) simply return one of `node`, `browser` or `electron`. 

        getmode : function() { return environment;},
        getenvironment : function() { return environment;},

This function creates a node.js style buffer when needed in Electron.

        createBuffer : createBuffer,

The following provide access to four core Node.js modules in node and electron:

        getfsmodule : getfsmodule,
        getpathmodule : getpathmodule,
        getosmodule : getosmodule,
        getglobmodule : getglobmodule,

These two function convert strings to gzipped [base-64](https://www.base64encode.org/) encoded strings and back. These are used to serialize and de-serialize binary data in JSON files.

        tozbase64 : tozbase64,
        fromzbase64 : fromzbase64,

The next two functions convert JS strings to binary strings and back. These are needed for integration with C++/WASM code. 

        string2binary :     string2binary ,
        binary2string :     binary2string ,

The remaining functions are used to perform core I/O operations. We will disucss the last two in more detail as they are the two core functions:

        readtextdatafromurl : readtextdatafromurl, 
        readbinarydatafromurl : readbinarydatafromurl, 
        readJSON : readJSON, // Gloabl ReadJSON
        read  : read, // Global Read data
        write : write // Global Write data
    };

#### bis_genericio.read

This function can be used to read files in arbitrary contexts. One is encouraged to read through the source code to see the full complexity that this entails. On the user-end however this takes two arguments:

* url -- abstract file handle object
* isbinary -- is data binary (false if not specified)

and returns a Promise (see the document [AspectsOfJS.md](AspectsOfJS.md) for more information and also this [MDN Page](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). The `.then` function of the promise has an object with two members data and filename that contain the actual data read and the actual filename read respectively.
 
Here is an example:

    bis_genericio.read(filename,isbinary).then( (obj) => {
        let data=obj.data;
        let filename=obj.filename;
        // do something with this
    }).catch( (e) => { 
        // handle the error e
    });

__Note:__ bis_genericio.read(filename) is the same as bis_genericio.read(filename,false). By default this function will read a text file unless the binary flag is set to true.

#### bis_genericio.write

This is the complementary function to bis_genericio.read. It takes three arguments

 * url -- abstract file handle object
 * data -- the data to save, either a `sting` or a `Uint8Array`
 * isbinary -- is data binary, default=false

 It returns a Promise object which supplies a text message as to what happened. Here is an example of saving some text in the variable `txt` to a file handle `f`.

        bis_genericio.write(f,txt).then( () => {
            console.log('Saved job in',f,'\n',txt);
        });


---

## A Note on Multi-Dimensional Arrays

Many of the core objects below (BisWebImage, BisWebMatrix, BisWebGridTransformation) contain multi-dimensional arrays. These are all stored in 1D TypedArrays (see [AspectsofJS.md](AspectsOfJS.md).). The indexing scheme used is the so-called [raster scan scheme](https://en.wikipedia.org/wiki/Raster_scan) where, in a 2D matrix of dimensions (width=number of columns,height=number of rows), for example we index elements as:

    (row,column) -> row*width+column

This uses ['row-major'](https://en.wikipedia.org/wiki/Row-_and_column-major_order) indexing order, which is the most common order in C/C++. (As an aside Fortran uses column-major storage as any C-code calling Fortran code for matrix operations needs to transpose any matrices at both the input and output stage to convert from row-major to column major mode.)

For images we use five dimensional indexing (i,j,k,frame,component), with corresponding dimensions (width,height,depth,numframes,numcomponents). Here the indexing is:

    slicesize = width*height;
    volumesize= slicesize*depth;
    framesize= volumesize*numframes;
    (i,j,k,frame,component) --> i+j*width+k*slicesize+frame*volumesize+component*framesize;

Confusingly if thing of our coordinates in this order, the storage is effectively "column-major", i.e. the leftmost coordinate (i) iterates first.

---

## BisWebDataObject

All data objects in bisweb derive from BisWebDataObject. This defines the common functionality that all objects need to implement. Here are is annotated description of the (abbreviated) source code for this class:


The constructor creates the four shared members. The jsonformatname member is the magic type to identify this type of object in a JSON string (e.g. for BisWebMatrix it is "BisMatrix"). The filename stores the last filename of this object (as a result of  it being loaded from/saved to a file.). The extension field defines the default extension for saving and the commentlist is an array of strings that contain metadata for this object.

    class BisWebDataObject {

        constructor() {
            this.jsonformatname='';
            this.commentlist=[];
            this.filename='';
            this.extension=".json";
        }


Then we have a number of setter/getter functions:

        getExtension() {  return this.extension;}
        getFilename()  { return this.filename;}
        setFilename(s)  { ...}

The getObjectType function returns a string type for the object (in BisWebMatrix this returns 'matrix'.) This must be overridden in a derived class

        getObjectType() {
            throw new Error('getObjectType not implemented for '+this.constructor.name);
        }

This provides a short description of the object for user info

        getDescription() { return "Object "+this.constructor.name }

This computes a hash-string for the data contained in the object for data verification purposes.

        computeHash() { return "0000";}

This returns the size of the object in memory in bytes.

        getMemorySize() {  return 0;  }


Next we get a set of I/O functions and in particular load and save. Both of these _must be implemented_ in derived classes.

        load(fobj) {
            throw new Error('load not implemented for '+this.constructor.name+' '+fobj);
        }

        save(filename) {
            throw new Error('save not implemented for '+this.constructor.name+' '+filename);
        }

Next come two functions that serialize and parse our object to JSON strings.

        /** serializes object to json  string
            @returns {String} JSON String
        */
        serializeToJSON(pretty=false) {

            let obj=this.serializeToDictionary();
            if (!pretty)
                return JSON.stringify(obj);
            return JSON.stringify(obj,null,4);
            
        }


        /** parses from JSON 
        * @param {String} JSON String
        * @returns {Boolean} true if OK
        */
        parseFromJSON(text) {
            let b;
            try {
                b=JSON.parse(text);
            } catch(e) {
                console.log('Failed to parse text');
                return false;
            }
            if (b.bisformat!==this.jsonformatname)
                return false;
            return this.parseFromDictionary(b);
        }

The function serializeToDictionary maps our object to a JavaScript dictionary object from where it can be mapped to JSON. This function _should be redefined_ in a derived class, though probably also called, i.e. the last line of the new function should probably be `return super.serializeToDictionary()`.

        /** serializes object to a javascript dictionary object
            @returns {Object} dictionary containing all key elements
        */
        serializeToDictionary() {
            return {
                bisformat : this.jsonformatname,
                filename : this.filename,
                comments : this.commentlist,
            };
        }
        
This is the opposite function that parses from a dictionary. Again it should be redefined but called.

        /** parses from Dictionary Object  
        * @param {Object} obj -- dictionary object
        * @returns {Boolean} true if OK
        */
        parseFromDictionary(obj) {
            this.commentlist= obj.comments;
            this.filename=obj.filename;
        }

Then come three functions that interface to Web Assembly code packaged in Emscripten Modules. These must be redefined.

        /** serializes an object to a WASM array
        * @param {EmscriptenModule} Module - the emscripten Module object
        * @returns {Pointer}  -- pointer biswasm serialized array
        */
        serializeWasm(Module) {
            throw new Error('serializeWASM not implemented for '+this.constructor.name+' '+Module);
        }

        /** deserializes an object from WASM array (with an optional second input to help with header stuff)
        * @param {EmscriptenModule} Module - the emscripten Module object
        * @param {Pointer} wasmarr - the unsined char wasm object
        * @param {BisWebDataObject} extra - the extra ``information'' or ``reference'' image (optional)
        */
        deserializeWasm(Module,wasmarr,extra=0) {
            throw new Error('deserializeWASM not implemented for '+this.constructor.name+' '+Module+' '+wasmarr+' ' +extra);
        }

The deserializeWasmAndDelete function calls deserializeWasm and then releases the memory. This does not (should not) be redefined.

        deserializeWasmAndDelete(Module,wasmarr,extra=0) {
            const out=this.deserializeWasm(Module,wasmarr,extra);
            biswasm.release_memory_cpp(Module,wasmarr);
            return out;
        }

Next comes a function that is defined for regression testing purposes. This is used to compare an instance of this class with another instance of this class.

        /** compares an object with a peer object of the same class and returns true if similar or false if different 
        * @param{BisWebDataObject} other - the other object
        * @param{String} method - the comparison method one of maxabs,ssd,cc etc.
        * @param{Number} threshold - the threshold to use for comparison
        * @returns{Object} - { testresult: true or false, value: comparison value, metric: metric name } 
        */
        compareWithOther(other,method="maxabs",threshold=0.01) {
            throw new Error('compareWithOther not implemented for '+this.constructor.name+' '+method+' '+threshold);

        }

Then come three functions for manipulating the comments list element. Note the use of _array.slice_ to create a copy of a JS array.

        /** Adds an element (string or list) to the comment list 
            /* @param {String} txt - the element to add
        */
        addComment(txt) { this.commentlist.push(txt); }

        /** Returns a copy of the comment list
            /* @param {array} - a copy of the comment list
        */
        getCommentList() { return this.commentlist.slice(0); }

        /** Sets the the comment list
        /* @param {array} lst - the list to copy
        */
        setCommentList(lst) {
            try {
                this.commentlist = lst.slice(0);
            } catch(e) {
                this.commentlist=[];
                this.commentlist.push(lst);
            }
        }

Finally there is a method getDetailedDescription which returns a detailed description of the object.

        getDetailedDescription(name='') { ... }

    }

Our module concludes by exporting the BisWebDataObject class as follows:

    module.exports=BisWebDataObject;

To summarize: the following methods must be redefined.

* getObjectType
* load
* save
* serializeToDictionary
* parseFromDictionary

The following must be refined if our object will be an output of a function/module that needs to be regression tested

* compareWithOther

The following must be redefined if this object will be used in WebAssembly operations

* serializeWasm
* deserializeWasm

The following should be refined to make our object a good citizen of the bisweb ecosystem.

* getDescription
* computeHash
* getMemorySize

Finally in the constructor one should specify sane defaults for the four members. For example BisWebMatrix's constructor has the form (in part):

    constructor(dtype,inputmat=null) {

        ...      
        super();
        this.jsonformatname='BisMatrix';
        this.legacyextension="csv";
        this.extensions=".bismatr";
    }

---

## BisWebMatrix

### Introduction

This class stores matrices and vectors. The primary use of this class is to store time-series data and connectivity matrices. We create time-series data by performing VOI-analysis of an image with a parcellation/segmentation map/objectmap image. The average of each region is stored in the matrix. In this scenario the matrix rows represent time points and the matrix columns regions. This type of object is the then processed appropriately to compute functional connectivity information.

Connectivity matrices (or "Connectomes") are square matrices where the element (row,column) represents the strength of connection (often correlation) between two regions row and column.

This class can also be used to store vectors (i.e. 1D matrices).

### Relation to Numeric.js

Originally bisweb used [Numeric.js](http://www.numericjs.com/) style storage for matrices and vectors. This is a very powerful library for any numeric operations. As we switched to using WebAssembly for more operations, however, we have moved away for reliance on Numeric.js. The BisWebMatrix class though still provides functions from mapping back and forth to the 2D JS-style arrays used by Numeric.js. These are the functions

    getNumericMatrix
    setFromNumericMatrix(mat);

### File formats

The default file format for matrices (with extension .bismatr) is a custom JSON format that stores both the matrix and any associated metadata in the comments field. This is the recommened format. The class can also be serialized/saved and loaded to `.csv` and the old-style Octave `.matr` file formats as well. The file format is detected from the extension of the filename specified. 

### Usage

We will not work through the code in detail. We highlight instead a few core methods

To create a matrix

    const matrix=new BisWebMatrix();

The constructor takes two optional arguments. The first is a string (either "Matrix" or "Vector" and the second is a 2D numeric-JS style matrix that is copied internally).

The matrix dimensions are set using the function allocate. The function `zero` calls allocate with the default value of 0.

    allocate(numrows,numcolumns,value=0) 
    zero(numrows,numcolumns)

One can get/set an individual element using

    getElement(row,column)
    setElement(row,column,value)

and access the entire 1-D Float32Array (see Raster-scan storage above) using:

    getDataArray() 

The matrix dimensions can be obtained by simply calling

    getDimensions();


To load a matrix from a file simply use the `load` function as:

    matrix.load(filename).then( () => { })

and similarly for save

    matrix.save(filename)

---

## BisWebImage

BisWebImage is a class that can be used to store and manipulate a 2D to 5D medical image. It stores both the actual image voxel data and the associated metadata. The metadata consists of a full [NIFTI][NIFTI] header. Before we launch into a description of the code, we will provide here some core information on medical images first.

### Image Orientation

3D Medical images are acquired (or reconstructed actually) as a set of 2D
images stacked along a coordinate axis. The orientation of this "stacking"
axis is used to define the orientation of the image as shown in the figure below.

![**Standard Image Acquisition Orientations, Axial or Transverse, Coronal and Sagittal.** The arrows indicate the z-axis direction (which may be inverted depending on the acquisition protocol), the x-axis and the y-axis are perpendicular to this. \textbf{Right:} Axial, coronal and sagittal slices.  Oblique acquisitions are also sometimes used, in which the z-axis is rotated, or \emph{obliqued} away from one of the standard acquisitions, e.g. coronal oblique.](figures/image_orientation.png)


* Axial -- the stacking is done along an axis running from the feet to the
  head -- which is the "axis" of the body.
* Coronal -- the stacking is done along an axis going from the front of the
  body to the back of the body.
* Sagital -- the stacking is done along an axis that goes from the left to the
  right of the body.
* Oblique -- the stacking is done in a direction that is not directly aligned
  with any of the three "axes". However, oblique slices are often
  characterized by the orthogonal orientation they resemble, hence you will
  see terms such as "axial oblique" which means that the slice is close to
  axial but not completely.

The actual image  is an array I(i,j,k) where
i,j,k are internal coordinate axes as follows: (i,j) are the in-plane
orientations and k -> stacking axis. A common notation used is to define the
image orientation by a combination of three letters as reflect the direction
of these internal axes when mapped to the physical world. Many common images
are labeled as **LPS** which stands for

* the first letter (**L** in this case) defines the direction of the
i-axis. In this case L is short for "Left" and in this convention specifies
that the i-axis points __to the left__. Low values of i are on the right end
of the image and high values of i are on the left side of the image.
* the second letter (**P**) stands for posterior. This determines the direction of
  the j-axis which runs anterior to posterior ("front to back").
* the third letter (**S**) stands for superior. This determines the direction of
   the k-axis which runs (in this case) from inferior to superior ("bottom
   to top").
   
Using this convention a coronal acquisition might be labeled as **RIP** (i:
left->**R**ight, j: superior->**I**nferior, k:
anterior->**P**osterior). Similarly a sagital acquisition might be labeled as
(for example) PSR (i: anterior->**P**osterior, j: inferior->**S**uperior, k:
left->**R**ight).

When writing an image viewer one can either try to support all possible
orientations or, alternatively, when the image is loaded reorient it
(i.e. permute the axis and flip appropriately) to a single orientation (most
commonly either LPS or RAS). We will describe this type of usage later.

#### Voxels and Millimeters

Another important issue is the mapping from physical space to image space. As
we noted before an image appears as three-dimensional array I(i,j,k). As an
aside, in some cases such as cardiac imaging we acquire "image movies" and here
we have an image I(i,j,k,t) where t is time. 

Each element of this array has a value which tells us something about the
structural, functional or metabolic properties of the tissue that was located
(at the time of the acquisition) at some physical location
(x,y,z). (x,y,z) are in scanner coordinates with (0,0,0) often being the
center of the scanner's field of view (e.g. the center of the magnet's
cylinder bore in MRI). If we imagine a patient lying on their back on the
scanner bed, the physical z axis runs from the feet of the patient to her
head, the y axis from the front of the patient to the back and the x-axis
from the right of the patient to the left.  This convention, is the default
for
[DICOM](http://dicom.nema.org/medical/dicom/2014c/output/chtml/part03/sect_C.7.6.2.html#sect_C.7.6.2.1.1)
, the clinical medical imaging standard. Hence one can say that DICOM by
default uses an LPS convention for (x,y,z). To add confusion here, most
research neuroimaging and hence the [NIFTI][NIFTI]-format that we will use
most commonly uses a RAS convention for (x,y,z) (effectively an 180 degree
rotation about the z-axis from LPS).

To compute (x,y,z) from (i,j,k) or vice-versa we need to pieces of
information: (i) the orientation of the image and (ii) the voxel-spacing. The
voxel-spacing (s_i,s_j,s_k) is the physical distance between two adjacent
voxels in the i, j and k image axis respectively. If our voxels are
contiguous (i.e. the image is acquired with no gaps) the voxel spacing is
equivalent to image resolution (the size of the individual voxels). Combining
these two operations yields a 4x4 mapping matrix as follows:

First we convert (i,j,k) to millimeters (mm) as follows: I = s_i *i, J=s_j *J, K=s_k*k

Then we map (I,J,K) to scanner coordinates (x,y,z) by first creating the
4x1 vector (I,j,K,1) (this is putting into into "affine coordinates") and then
multiplying this with a 3x4 matrix A of the form

  [ r_{11}, r_{12}, r_{13}, t_1 ] <br>
  [ r_{21}, r_{22}, r_{23}, t_2 ] <br>
  [ r_{31}, r_{32}, r_{33}, t_3 ]

Here the vector [t_1,t_2,t_3] represents the origin of the image and is the
position of the first voxel (i.e.i=0,j=0,k=0) in scanner coordinates.

[r_{11},r_{21},r_{31}] is a vector that represents the orientation of the
i-axis, the second column [r_{12},r_{22},r_{32}]  the orientation of the
j-axis and similarly the third column [r_{13},r_{23},r_{33}] the orientation
of the z-axis.

Naturally these two operations can be combined to a single matrix
multiplication S=A*B where B is a diagonal 4x4 matrix with elements s_i,s_j,s_k,1.0.

Hence a typical LPS formated formatted image stored in [NIFTI][NIFTI] format
which was acquired with a spacing of 2x3x4 mm (unusual but ...) and origin
(-100,-90,-50) would have
a final S matrix as follows

    [ -2.0  0    0 -100 ]
	[    0 -3.0  0  -90 ]
	[    0  0  4.0  -50 ]
	
The minus signs in front of 2.0 and 3.0 reflect the mapping from LPS to RAS
(flip x and flip y).

## Storing and Manipulating 3D Images in JavaScript

### Elements of an image

An image structure consists of the following parts:

* An array (typically one-dimensional) storing the actual pixel intensities
  themselves.
* The image dimensions, typically an array of the form [width,height,depth]
  (to which can be added number of frames, number of elements/per frame in the
  case of a 3D color movie etc.)
* The voxel spacing, which is the distance between two voxels along any given
  axis. Spacing can be the same as resolution though the two can be different
  in certain circumstances.
* The origin which is the position in 3D space of the first voxel. Same
  software defaults to using (0,0,0) for this and not using the origin field.
* Additional metadata to provide more information about the acquisition
  parameters (including the orientation), the equipment used, the patient
  imaged and the physician ordering/supervising the scan. 

The amount of metadata is application dependent. In clinical radiology use where images
are transmitted/stored using the DICOM file format, images come with extensive
metadata defining every possible piece of information about the image. In
other applications, such as the use of realtime ultrasound to guide a biopsy
procedure, there may be almost no metadata other than barest of information
needed. In general, most software, stores the core components of the image
(intensity array, dimensions and spacing) in easy to access data structures
and then maintains a secondary structure with the remaining metadata for later
access as needed.

### The NIFTI Header (bis_header.js)

#### The NifTI File Format

The [NIFTI][NIFTI] file format is popular for research neuroimaging
applications and has become a defacto second standard to DICOM. It has the
advantage that it is a relative simple file format consisting of a

* A 348-byte header containing all image metadata
* 4 empty byes
* Some optional header extensions for additional metadata (often not present) -- we will store the text in the commentslist member of BisWebImage as extensions.
* A binary array containing the image intensities that is attached to the
  header.
  
NIFTI images are often saved in files with a _.nii/.nii.gz_ extension
(.nii.gz) is gzip-compressed versions.  The header is complex structure
defined in a C include file partly as:

	struct nifti_1_header { /* NIFTI-1 usage         */  
        /*************************/  
		int   sizeof_hdr;    /*!< MUST be 348           */  
		char  data_type[10]; /*!< ++UNUSED++            */  
		char  db_name[18];   /*!< ++UNUSED++            */  
		int   extents;       /*!< ++UNUSED++            */  
		short session_error; /*!< ++UNUSED++            */  
		char  regular;       /*!< ++UNUSED++            */  
		char  dim_info;      /*!< MRI slice ordering.   */  
		short dim[8];        /*!< Data array dimensions.*/  
		...
     	char magic[4] ;      /*!< MUST be "ni1\0" or "n+1\0". */
	};
	
#### Complex Binary Structures in JavaScript 
	
In C/C++, reading this type of structure is trivial as one defines a C struct
with the correct order and then executes a single fread command. In JavaScript
things are a little more complicated. Fortunately with the introduction of
typed arrays we can work around this by (i) first reading the whole header as
a single Uint8Array (i.e. straight-up bytes) and then casting portions of it
to the correct type. (Some this code derives from similar code in [XTK](www.xtk.org).)

For example to get the image dimensions (dim in the header above), we first
read the whole thing in an array _arr_ and then cast the appropriate piece of
the underlying ArrayBuffer _arr.buffer_ to a dimensions array as follows

	let dimensions=new Uint16Array(arr.buffer,40,8)
	
Here the "40" refers to the fact that the dim[8] array starts at a 40 byte
offset (you need to count here: int is 4-bytes, short is 2-bytes and char is 1
so adding the sizes of the preceding elements 4+10+18+4+2+1+1=40) and the
dims array itself has 8 elements.

In bisweb there is a module
called `bis_header.js` which encapsulates functionality for reading arbitrary
data structures in general and the NIFTI file format in particular. The curious reader is refered to the source code for this.

### The actual BisWebImage class

To create a new image simply use

    const BisWebImage= require('bisweb_image.js'); // this imports the module

    let img=new BisWebImage();

You may load a .nii.gz formatted file into img using

    img.load('test.nii.gz').then( () => { })

The load function takes an optional second argument 'forceorient'. Bisweb can be move to force reorientation of images on load depending on what the user prefers. (The user-preferences are stored in a text file .bisweb in the user's home directory in the case of commandline/desktop applications and in the web-browser database for web applications). The function begins as follows:

    load(fobj,forceorient) {

        forceorient = userPreferences.sanitizeOrientationOnLoad(forceorient ||  userPreferences.getImageOrientationOnLoad());
        if (this.debug) {
            console.log('..... forceorient in readbinary=',forceorient);
        }

The argument forceorient can take one of three values:

* None -- leave image orientation as is
* RAS -- reslice image to be RAS axial
* LPS -- reslice image to be LPS axial

If forceorient is not specified then the function looks a the user-preferences file to see if the user has specified a global preference.

To save an image simply call
  
    img.save(filename);

In many processing taks we need to clone an image, i.e. to create an image that is similar to an existing image. This operation is performed by the extremely useful `cloneImage` method of BisWebImage. The full documentation for this is:

    /** clones an image with same changes ... this is not a copy but modifying this image to have similar properties (type, header, etc.) to input
     * @param {BisWebImage} inputimage - the input ``information'' or ``reference'' image.
     * @param {object} opts - the options object -- if not set, this function yields an exact clone
     * @param {string} opts.type - type of image e.g. `short'
     * @param {string} opts.numframes - number of frames in clone (null or 0->same)
     * @param {string} opts.numcomponents - number of components in frame in clone (null or 0->same)
     * @param {array} opts.dimensions - new dimensions (null or 'same' ->same). This can be a 3 or a 4-array to also change frames. opts.numframes overrides this.
     * @param {array} opts.spacing - new spacing (null or 'same' ->same)
     */
    cloneImage(inputimage,opts={}) 

For example, if we simply want to create an image that has the exact same dimensions and type as current image we can simply call:

    let newimage=new BisWebImage();
    newimage.cloneImage(img);

If we wanted our new image to  be of type 'float' we modify the second line as

    newimage.cloneImage(img, {
            type : 'float'
    });

Similarly if wanted our new image to only have a single frame (e.g. this image could be the average frame of a multiframe image) we can also add

    newimage.cloneImage(img, {
        type : float,
        numframes : 1,
    })

We can similarly change the dimensions, the spacing and the number of components (5th dimension) as we like.

A similar function to `cloneImage` is `createImage`. This has a very similar signature as follows:

    /** creates an image (allocate data etc.)
     * @param {object} opts - the options object -- if not set, this function yields an exact clone
     * @param {string} opts.type - type of image e.g. `short'
     * @param {string} opts.numframes - number of frames in clone (null or 0->1)
     * @param {string} opts.numcomponents - number of components in frame in clone (null or 0->1)
     * @param {array} opts.dimensions - new dimensions (null or 'same' ->[10,10,10]). This can be a 3 or a 4-array or 5-array to also change frames/components. opts.numframes and opts.numcomponents
     overrides this.
     * @param {array} opts.spacing - new spacing (null or 'same' -> [1.0,1.0,1.0])
     * @param {string} opts.orientation - LPS or RAS -- (if not specified, RAS)
     */
    createImage(opts={});

To create a 3x4x5 image of resolution 2.0 and type float and orientation 'LPS' we type:

    let newimg=new BisWebImage();
    newimg.createImage( {
        dimensions : [ 3,4,5],
        spacing : [ 2.0,2.0,2.0],
        type : 'float',
        orientation : 'LPS',
    });

Other useful functions include:

    // Computes the min and max value of the image
    getIntensityRange() 

    /** getRawPixel Data
        @return {TypedArray} -- the raw image data */
    getImageData() 

    /** get Image Dimensions 
     * @return {array} image dimensions */
    getDimensions()

    /** get Image Spacing 
     * @return {array} image spacing */
    getSpacing();

    /** compare dimensions and spacing, return true if same 
     * @param{BisWebImage} otherimage - the image to compare to
     * @param{number} threshold - spacing comparison threshold (default=0.001)
     * @param{Boolean} spaceonly - if true (default=false) then only x,y,z dims are compared
     @returns {Boolean} true if this image and other image have same dimensions */
    hasSameSizeAndOrientation(otherimage,threshold=0.01,spaceonly=false);

Here is an example, adapted from the module `js/modules/mask_image.js`, that masks an image given another image. The input is two images `input` and `mask`.

First we check if the two images have the same size. The mask need only match image in i,j,k (it does not need to have the same number of frames) so the `spaceonly` argument of hasSameSizeAndOrientation is set to true.

    maskImage(input,mask) {}

        if (!input.hasSameSizeAndOrientation(mask,0.01,true))
            return null;


We get the image dimensions and compute some useful information. For our purposes here components are just "super frames" (if the image is 5D) so we treat them as frames:

        let dim=input.getDimensions();
        let numvoxels=dim[0]*dim[1]*dim[2];
        let numframes=dim[3]*dim[4];

We next create the output image by cloning the input image:

        let output=new BisWebImage();
        output.cloneImage(input);

We next get the actual data arrays (these are JS TypedArrays)
    
        let idata=input.getImageData();
        let mdata=mask.getImageData();
        let odata=output.getImageData();

We now loop through the voxels and either copy the input to the output or set the output to zero depending on whether the mask at this location has value > 0.

        for (let i=0;i<numvoxels;i++) {
            if (mdata[i]>0) {
                for (let f=0;f<numframes;f++) {
                   odata[i+f*numvoxels]=idata[i+f*numvoxels];
                }
            } else {
                for (let f=0;f<numframes;f++) {
                    odata[i+f*numvoxels]=0;
                 }
            }
        }

When done we return the output image

        return output;
    }





---

## Transformations

These classes provide implementations for linear and non-linear (grid-based either linear or b-spline interpolation) transformations. These are generated from the image registration code (implemented in C++/WASM). While the JavaScript implementation of the transformation classes actually have the ability to transform coordinates etc., this functionality is mostly leftover from the pre-Web Assembly version of bisweb in which we actually had JS-based linear and nonlinear registration code. This functionality is not really in use at this point (other than in some regression tests) and while it works, I recommend not using it. The primary use of these classes is to implement serialization/deserialization functionality for file I/O and to serve as storage for the "true" implementations which are on the C++/WebAssembly side of the codebase.

In reality, unless you are interested in writing new file formats for storing the transformations, or implementing new transformation types, you almost need to know nothing about these classes other than how to load and save them. 

### File I/O

Most of the registration and image-reslicing code in bisweb takes multiple types of transformations. Hence we can not always assume we know the actual transformation type (e.g. linear vs nonlinear vs combination) ahead of time. The best way to load a transformation is to use the factory methods defined in the module `legacy/bis_transformationutil.js`. (Legacy is a misnomer here, we should probably move the file!). In particular, the key function is:

    let xform=bis_transformationutil.loadTransformation=function(filename);

This is a factory function and, based on the content of the file, creates the appropriate transformation class.

You can obtain information about the loaded object using its `getDescription` method and manipulate it using the usual methods defined in BisWebDataObject (including serializeWasm and deserializeWASM).

The transformation classes support the following file formats:

* Linear Transformation -- see BisWebLinearTransformation
    - either old-style BioImage Suite .matr file (4x4 matrix stored as four lines of text)
    - or a custom json format
* Combo Transformation (and Grid Transformation)  -- see BisWebGridTransformation and BisWebComboTransformation
    - either old-style BioImage Suite .grd file
    - or a new style json format
* Transformation Collection
    - this is serialized to json style file

The .matr and .grd file formats are there for compatibility with the legacy C++ based [BioImageSuite](www.bioimagesuite.org) tools. 

### A Note on Combining Transformations and Image Reslicing

#### Post-multiply

The transformation collection class uses "post-multiply" style combination. Consider the function transformPoint below. The class has a list of transformations (stored in `this.transformationsList`). These are applied in order as follows:

    transformPoint(X, TX) {

      ...
        
        let tmp = [X[0], X[1], X[2]];
        for (let i = 0; i<this.transformationList.length;i++) {
            this.transformationList.transformPoint(tmp, TX);
            tmp[0] = TX[0];
            tmp[1] = TX[1];
            tmp[2] = TX[2];
        }

If these were all linear transformations represented as 4x4 matrices, i.e. [ A, B, C], this is equivalent to the following matrix multiplication:

       TX= C*B*A*X

where X and TX are 4x1 vectors with their fourth element set to 1.

#### Image reslicing

Consider two images I(x) and J(x') and a mapping T that is used to reslice/wasp image J to match I. Mathematically, T is the operation that:

    T: x->x'

This means that coordinate wise the mapping goes from I to J. The reslicing operation works as follows:

1. Create an empty image that has the same dimensions and resolution as I. Call this J'.
2. For each voxel in J' 
    a. compute its coordinate x.
    b. Use T to map x to a coordinate in the space of the image J. Let's call this x'.
    c. Interpolate image J at location x' (x' need not be an integer) and compute the value v
    d. Set J'(x) =v

__This creates the usual saying that `coordinates move forward` and `images move backwards`.__ Reslicing an image J to match an image I requires a transformation __from__ I __to__ J. When computing this transformation in bisweb, "I" is the reference image and "J" is the target image. In other software the notation of 'moving' and 'fixed' is also used.

Consider now the case of an fMRI experiment where we want to map timeseries data into the space of a reference 3D image (e.g. the MNI template). Here we have (potentially) 3 transformations

1. m1 : from MNI template to the subject's individual 3D isotropic T1-weighted image
2. m2 : from 3D isotropic to thick slice anatomical image acquired on the same slice presciption as the fMRI data
3. m3 : from the thick slice anatomical to the fMRI images

To reslice our fMRI data to MNI we combine these in the order m1,m2,m3, i.e. beginning from the reference (MNI) and moving to the target (fMRI). 

---

## BisWebDataObjectCollection

This is a class that stores an arbitrary collection of objects of type derived from BisWebDataObject. This is useful for both archiving collections of data and for internal data management.

An example of the use of this object can be found in 'js/modules/motionCorrection.js'. Here we use a collection to store the motion correction results (matrix) for each frame.

        let matrices=new BisWebDataObjectCollection();

Then we add items as

        matrices.addItem(xform, { "frame": frame});

We can retrieve items using (where frame is just the index)

    matrices.getItemData(frame)

In general this class stores an array of pairs of `data` and `metadata`. Data is of type `BisWebDataObject`. Metadata can be any simply JavaScript type or dictionary that contains information about the object. A quick look through the core functions illustrates the usage:


    setItem(i,obj,extra={}) {
        if (i<0 || i>=this.itemlist.length)
            return;
        this.itemlist[i]={
            data : obj,
            metadata : extra
        };
    }
    
    addItem(dataobj,extra={}) {
        this.itemlist.push({
            data : dataobj,
            metadata : extra,
        });
    }

    removeItem(i) {
        if (i<0 || i>=this.itemlist.length)
            return false;

        this.itemlist.splice(i,1);
        return true;
    }

    removeAllItems() {
        this.itemlist=[];
    }
    
    getItem(i) {
        if (i<0 || i>=this.itemlist.length)
            return null;
        return this.itemlist[i];
    }

    getItemData(i) {
        if (i<0 || i>=this.itemlist.length)
            return null;
        return this.itemlist[i].data;
    }

    getItemMetaData(i) {
        if (i<0 || i>=this.itemlist.length)
            return null;
        return this.itemlist[i].metadata;
    }

This objects contains some very interesting code for serializing and deserializing arbitrary collections of objects. If interested, the reader is urged to look at the code.

