This document contains [developer documentation](README.md) for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). 

---
# Aspects of JavaScript

In this section, we will cover some aspects of JavaScript that are
particularly relevant to our needs. This is not meant to be a complete
introduction to the language.  For this the reader is referred to the two books
by Axel Rauschmayer. The first, which covers JavaScript up to version 5
(standard usage until maybe 2016) , is
[Speaking JS](http://speakingjs.com/es5/) by Axel Rauschmayer. Part I -- "A
JavaScript QuickStart" may be all that you need to read to get
started. JavaScript v6 (ES2015) is now fast becoming the new standard. A
second book called [Exploring ES6](http://exploringjs.com/es6/index.html) by
the same author covers some of the changes. I strongly recommend reading
Chapters 1-4 for a clear understanding of all that is new here.


---

## Triple Equals === and !==

Consider the following if ... else if ... else construct:

    if (myvar === 0) {
        // then
    } else if (myvar === 1) {
        // else-if
    } else if (myvar === 2) {
        // else-if
    } else {
        // else
    }

Note that we use __triple__ === (and !==) for comparison. This performs strict comparison. The more C-like == and != perform “sloppy” comparisons. Avoid these unless you really know what you are doing!

---

## Using the logical OR || operator to set default values

Consider the function

    let fn=doSomething(val) {

        val = val || 2;
    }


This old-style JS construct can be used to set the value of val to 2 if no value was specified (and hence set to `undefined`, i.e. the function was called as `doSomething()`. Note that  `||` is the logical OR operator.

The only catch here is that, if val was specified as 0 this will also be mapped to 2 as `0`, `null` and `undefined` all fail the
test. A better way to express this in ES6 is with default arguments as follows:


    let fn=dosomething(val=2) {

    }

If `val` is not specified then it will be set to `2`.

---

## Closures

A closure is a function with its own scope that can also access variables from its enclosing scope. In the example below, what `createIncrementor()` returns is a closure. This is an internal function that also _knows_ about the variable `start` which lives in an external scope.

    let createIncrementor = function(st) {
        let start=st;
        let outfunction=function () {  
                start++;
                return start;
        };
        return outfunction;
    }

    let inc=createIncrementor(5);
    > inc()
    6
    > inc()
    7

Closures are incredibly powerful for simplifying code. The function `createIncrementor` is really a function factory — it creates and returns a new function with a bound scope.

## TypedArrays

### Regular JavaScript Arrays

As you probably know, JavaScript has built-in ``Array`` functionality. (For a
more complete reference take a look at the Mozilla Developer Network (MDN)
description of
[JavaScript arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array).

For example,  we can define an array as:

    let names = [ 'Yale', 'Harvard', 'Princeton' ];

Then `names[0]` -> Yale, `names[1]` -> Harvard etc.

We can then add to our array an element:

    names[5]='Columbia';

At this point names[3] and names[4] are simply empty elements that return
`undefined`. Note that the size of each element in the array is also different
(Yale has 4 letters as opposed to Harvard having 7). This type of construct is
ideal for managing some forms of data but it is completely unsuitable for
storing images as looking up a value in an array can be slow.

The reason for this is that the JavaScript array is more of an associative
array mapping from a set of keys to set of values as opposed to a continuous
raw memory storage (which is what actual images need). So if we look at the
how the actual memory is used, the first element uses up 5 bytes (if we assume
0-terminated strings), the second 8 bytes, the third 10 bytes, etc. So to get
to element 5 we need to compute the offset from the previous elements or to
have a lookup table at the implementation level that points us to
the start of each element. This might be OK for finite number of elements
but in the case of a 3D medical image that has over a million voxels this
becomes problematic.

__What is an Image:__ Consider a 64x64 grayscale image. This images consists
of 4096 voxels. From a programming perspective this is stored  in an array of
size 4096, where each element in the array has a value ranging from 0 (black)
to 255 (white) with intermediate values representing various shades of gray. Elements 0 to 63 store the contents of  the first row the image,
elements 64 to 127 the second row etc. So our two-dimension image I(i,j) is
mapped into an array data[i+j*width] where ``width`` (in this case 64) is the
width of the image.

If we wanted to retrieve the intensity at pixel (7,4) we read the value of
data[7+4*64]=data[263]. However getting to the 264th element of a regular
array can be slow as we have to go through the other elements first. What we
need here is a structure more like a C-style array where each element has a
fixed size so that we can jump forward 264 elements to get to the one we need.

----

### Typed Arrays

In JavaScript the ability to map data directly to raw memory storage (what in
C would have been called pointer-style programming) is provided by
[Typed Arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays). Typed
Arrays provide the ability to map data storage directly into raw memory which
allows for faster read/write; however, there is a trade-off. Typed Arrays
are of fixed size once allocated and can not be dynamically resized or have
extra elements inserted later.

The key to understanding Typed Arrays is that they work on a data/view
model. First we allocate the data (raw memory in bytes) using the ArrayBuffer
class.

    let buffer= new ArrayBuffer(16);

This is the C equivalent of:

    void* buffer=malloc(16);

This allocates a 16-byte long memory buffer. We can confirm the size of the
allocate buffer by looking at its ``byteLength`` property as:

    let sizeInBytes=buffer.byteLength; // should return 16

The next step is to cast the buffer
to something more useful. To do this we have to have to use
one of the types (hence typed-array) of data available to us. The table below
(modified from the MDN page) lists the core types.

Type    | Size in bytes	| Description	| Equivalent C type
--------|---------------|---------------|-------------------------
Int8Array	| 1	| 8-bit two's complement signed integer		| int8_t or char
Uint8Array	| 1	| 8-bit unsigned integer	| uint8_t or unsigned char
Int16Array	| 2	| 16-bit two's complement signed integer	| int16_t or short
Uint16Array	| 2	| 16-bit unsigned integer	| uint16_t or unsigned short
Int32Array	| 4	| 32-bit two's complement signed integer	| int32_t or int
Uint32Array	| 4	| 32-bit unsigned integer	| uint32_t or unsigned int
Float32Array	| 4	| 32-bit IEEE floating point number	|  float
Float64Array	| 8	| 64-bit IEEE floating point number	|  double

So if we wanted to store 4 byte float numbers (4 bytes each) we can create a view on
the buffer (or in C-terminology cast it) as follows

    let floatarray=new Float32Array(buffer);
    
which again is the C-equivalent of

    float* floatarray=(float*)buffer;

Now we can get the size of the array as

    let arrlength = floatarray.length; // should return 4 (16 bytes/4 bytes per element)

(Note that the ordinary JavaScript array also has an exact same ``.length``
property).

Now we can access values in floatarray using standard array syntax, e.g.

    floatarray[2]=3.0;
    let v=floatarray[1];
    
You can also create the array and the buffer in one step:

    let floatarray=new Float32Array(4);

The cast method is useful when reading complex data structures from files,
where the structure is read as one chunk of memory and different parts of it
can be cast to different types to simulate a C ``struct``.

The following is also valid JavaScript:

    let datatype=Float32Array;
    let c=new datatype(10);
    
This allocates a Float32Array of size 10. This type of construct is useful if
the type of the array (i.e. the type of the image) is something that can only
be known at runtime. Images are commonly of type unsigned char, short or
float and less frequently other types. When loading an image from a file, the
type information is in the image header and hence the type of the array is
only known once the header is read. 

#### Node.js Buffers

Node.js has a type called ``Buffer`` which is mostly analogous to the the
``ArrayBuffer`` type described in the previous section, though ArrayBuffers
are  zero-filled on creation whereas Buffers are not. As the Node.js
[documentation](https://nodejs.org/api/buffer.html#buffer_buffer) states

> Prior to the introduction of TypedArray in ECMAScript 2015 (ES6), the JavaScript language had no mechanism for reading or manipulating streams of binary data. The Buffer class was introduced as part of the Node.js API to make it possible to interact with octet streams in the context of things like TCP streams and file system operations.

In our use cases, Buffers appear as the result of reading/writing binary files
in Node.js. You can copy back and forth as follows: (these actually __copy the
memory__; they are __not__ cast operations)

    let intarray=new Int16Array(buffer);
    let buffer=new Buffer(intarray);

Buffers are useful in many Node.js server operations but we will for the most
part abstract them away in this text and rely on standard JavaScript
Typed Arrays and ArrayBuffers for our work.

---

## Asynchronous Programming   

In general, interactive software programs operate in one of two modes — "command line" or "GUI-driven". In command line mode, a
program typically follows pre-set path whereas in GUI mode the program will respond to a user's input in whatever order the user specifies. Consider for example a program that smooths an image. In
command line mode this can take the form:

* Parse the command line to get the input and output filenames
* Load the input image from input filename
* Smooth the image 
* Save the smoothed image to the output filename
* Exit
    
Translated into "pseudo-code" this takes the form:

    input_filename = getinputfilename();
    output_filename = getoutputfilename();
    input_image = load_image(input_filename);
    output_image = smooth_image(input_image);
    save_image(output_image,output_filename);
    exit();
    
In Node.js style command line code, one key distinction is that File I/O is
_should_ be an asynchronous operation. In synchronous mode, a
program interacts with the underlying operating system/interpreter by issuing
one request at a time and then waiting for the result before proceeding to the
next step. When ``load_image`` is called, in synchronous mode, the function
does not return until the image _has been loaded_.

### Using Callback Functions Directly

In asynchronous mode, however, this paradigm is no longer valid. Instead our
program and the underlying system operate more like ordering something
on-line. You place your order, Amazon (or your favorite store) accepts the order, and sends it to you once your order is ready. You resume your daily tasks while waiting for the order to ship rather than waiting until the package arrives. In software terms,
this is effectively means that load_image returns immediately as it is less of
a command __load this image__ and more of a request __when it is convenient
please load this image and let me know__. In pseudo code this takes the form:

    let input_filename = getinputfilename();
    let output_filename = getoutputfilename();
    
    let imagesaved=function() {
        exit();
    };
    
    let imageloaded=function(loaded_image) {
        let output_image = smooth_image(input_image);
        save_image(output_image,output_filename,imagesaved);
    };
    
    load_image(input_filename,imageloaded);
    
Here we supply a callback function ``imageloaded`` to the load_image
function. This essentially means that when the image is eventually loaded the
I/O code will call ``imageloaded`` (with the image as an argument in this
case). When this is called, it performs the smoothing operation and then calls
``save_image`` which is also an asynchronous operations that takes a callback
function (``imagesaved`` in this case) as an argument. When the image has been
saved, it calls ``imagesaved()`` which then simply calls ``exit`` to end the
program.

In proper JavaScript we could also use anonymous callbacks to rewrite this
in nested fashion as follows:

    let input_filename = getinputfilename();
    let output_filename = getoutputfilename();

    load_image(input_filename, function(input_image) {
        output_image = smooth_image(input_image);
        save_image(output_image,output_filename,function() { 
            exit();
        });
    });
    
In this case the callback functions are defined ``in-place'' which
sometimes makes for more readable code as internal functions do
not have to be named or placed outside where they are actually called.


### Using Promises

JavaScript now has support for two more styles of asynchronous
programming. The first is Promises. 

        let prom=img.load(fname)
            .then(function() {
                // Do something if success
                });
            .catch( (e) => {  
                //do something if failure
            });


The function `img.load` returns a Promise. If the operation succeeds then the
function inside `.then` is called else the error is handled as an exception
using the `.catch` construct.

This is no different than using the nested callback structure from above, but the Promise template is more standard and requires less code than programming callback and errorback behavior manually.

Old-style callback behavior can be Promisified as well. Consider the following
function of the bisweb_image object (in _js/bisweb_image.js_)

    load(fobj,forceras=false) {

      const vol=this._legacy_image;

      return new Promise( function(resolve,reject) {

        let loaded = function(vol) {
             console.log('+++++ loaded image from '+fobj+'. Dim=',vol.getDimensions())
            resolve();
        };
        let failedtoload = function(e) {
            console.log('failed to load'+e);
            reject(e);
        };
        
        vol.readbinaryfile(fobj,forceras,loaded,failedtoload);
      });
    }

This calls an old-style function (readbinaryfile) that takes two callbacks
(loaded,failedtoload) as arguments. This is wrapped inside a Promise which
is returned to the calling function. The `loaded` callback calls the Promise's `resolve`
function and similarly `failedtoload` calls the Promise's `reject` function.

`load` is now a Promise exposing `.then` and `.catch` functions to the caller. 

One possible use of this setup is to ensure that a number of operations have
been completed when invoked in parallel. For example, if we are loading 2
images we can now:

    let promise1= img1.load('f1.nii.gz',true);
    let promise2= img2.load('f2.nii.gz',true);

    Promise.all([ promise1,promise2])
       .then(do_something)
       .catch( (e) => { console.log('something failed',e); });

The `Promise.all` function takes an array of Promises and returns a single Promise. Its `.then` construct is
called only if _all_ asynchronous operations supplied to it, in this case `promise1` and `promise2`, have finished. 



### Asynchronous vs Synchronous Programming

While the asynchronous style of development sounds unnecessarily complicated,
it has some significant advantages. Primarily, your program does not block while a file is being read or written (think GUI or
Server). That operation is handled by a separate thread — even though JavaScript is single-threaded in
concept, the underlying Browser or Node.js interpreter does fork other threads
for these types of operations. This makes the underlying program more
responsive. Node.js may optionally perform synchronous I/O, but this is generally considered bad practice because it decreases program responsiveness.

---

## The two meanings of `$`

A potentially confusing aspect of the latest version of JavaScript is the $ operator. This when used in conjunction with the new string delimiter ` operator allows for value substitution inside strings. For example consider the case:

    let a=2;
    console.log(`The value of a is ${a}`);

This will print

    The value of a is 2.

The other common use of the $ character is as a shortcut for [JQuery](https://jquery.com/
), which is probably the most common JS library. It may be invoked as follows:

    // Import JQuery
    const $ = require('jquery');
    // Use JQuery to create an element
    let bbar= $("<div></div>");

This can be confusing to many. In general if you see a $ inside a back-quote delimited string

    ` I am a string ${a]}`

it performs value substitution. Otherwise it is most likely being used to call JQuery.

_Note: [The '$' character is used for JQuery as a matter of convention and carries no special meaning.](https://stackoverflow.com/questions/205853/why-would-a-javascript-variable-start-with-a-dollar-sign) In theory the `require('jquery')` statement in the code block could assign the library to any key, but '$' is by far the most commonly used key._

---

## Classes and Objects in JavaScript

First some terms:

* Class — a new complex type (e.g. Button)
* Object — an instance of a class (e.g. a specific Button)
* Inherited Class — a class that extends a parent or super class.

Rather confusingly, the concept of class is also used to prescribe the appearance characteristics of an element on the web page via [CSS styling](https://developer.mozilla.org/en-US/docs/Web/CSS).

Historically JavaScript had a prototype-based implementation of object-oriented programming. This is extremely flexible. Effectively in this setup an object can inherit from an actual instance of another object. With ES6 JavaScript introduced an actual class constructor that creates syntax that looks more familiar to programmers used to C++ or Python class-definitions instead.

### Objects

Objects in JavaScript are essentially dictionaries containing both variables and functions. For example

    let point = {
        x : 4,
        y: 5
    };
    point.x        // returns 4
    point.y=0;  // sets point.y to 0

We can also add members to an object, e.g.
    
    point.z=3  
    
adds an element called `z` to the object and sets its value to 3. Objects can also contain functions (or methods). For example:

    let pair = {
        add : function(x,y) { return x+y;},
        multiply: function(x,y) { return x*y;}
    };

Calling pair.add(3,4) returns 7. We can also add functions to an object later e.g.

    pair.subtract=function(x,y) { return x-y;};

Then calling pair.subtract(8,5) returns 3;

We often used objects defined in this way like C++ namespaces to collect functionality in one place. Objects are also incredibly useful in functions that need to return more than one thing. It is trivial to "on-the-fly" create an object and return it. For example consider the function below:

    let fn=addsubtract(a,b) {
        return {
            sum : a+b,
            difference : a-b;
        };  
    };

This function computes both the sum of and the difference between two numbers. It returns an object with two members (sum, difference) that contain the two values.

### Classes

As of 2015, JavaScript has more formal Object-Oriented class definitions.

The pair example before would be rewritten as:

    class PointType {

        constructor() {
            this.x=4;
            this.y=5;
        }
    };

We could then instantiate a new object of type PointType as 

    let point=new PointType();

JavaScript classes can inherit from other classes too. For example, we can make a complex point as follows:

    class Point3DType extends PointType {
        constructor() {
            super();
            this.z=3;
        }
    };

The keyword `extends` defines the new Point3DType class as deriving from PointType. The keyword `super` (as in Python) calls the parent class constructor.


## This, that and a big mess

In Javascript __this does not always mean this__. In general, in most object-oriented languages, the keyword "this" (or "self" in Python) refers to the current object. Hence above we can call `this.z` to set the value of the member variable z of this class. However, in JS, this refers to the _current context_ which often __but not always__ the current object. This becomes a problem particularly in callback functions from the GUI.

Consider the following simple case:

    class Hello {
        print() {
            this.name = “John”;   
            let callback =function() { 
                console.log(“My name is“, this.name);
            };
        setTimeout(callback,1000);
    }; 

Here we use the set timeout

To drive this code 

    let myobj=new Hello();
    myobj.print(); 

`print` calls the internal function callback 1000 ms after it is invoked (see documentation for [`setTimeout`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout).) As it stands this code will fail because inside the function callback, `this` refers to the scope of the function and not the object. 

There are two ways around the problem (one is tempted to say _this problem_). The first is the "that" approach:

    class Hello {
        print() {
        this.name = “John”;   
        const that=this;
        let callback =function() { 
            console.log(“My name is“, that.name);
        };

        setTimeOut(callback,1000);
    }

The above version of the code works by taking advantage of the fact that callback is a closure. The variable `that` stores the value of `this`, which at that point of the code is the current object. When `callback` is invoked, it uses `that` to refer to the object which enables it to access its member variables.

The second solution uses "fat-arrow" functions. These are special functions introduced in ES6 that __DO NOT__ create a new context. A traditional JS-function can be defined as:

    let fn=function(a1,a2,a3) {
        console.log(a1,a2,a3); 
    };

By contrast a "fat-arrow" function has the syntax:

    let fn = ( ( a1,a2,a3) => {
        console.log(a1,a2,a3) ;
    });

The two are equivalent other than for the fact that fat arrow functions do not create a new context. Hence the code below will work:

    class Hello {
        print() {
            this.name = “John”;
            let callback =( () => {
                console.log("My name=",this.name);
            });

            setTimeOut(callback,1000);
    } 

_Note: Most anytime one is in a callback situation (whether via button presses, promises, setTimeout etc.) the `this` problem may arise. This is one of the most common forms of bugs in JS-code._


### From Objects to JSON and back

[JSON](https://www.json.org/) is the standard file object notation from JavaScript. JSON makes storing "database-like" files very easy. We use JSON strings (and ultimately files) extensively within BioImage Suite Web. For example, consider an object dictionary of the form:

    let obj = {
        weight: 80
        height: 1.75,
        ismetric: true
    }

This will be serialized to text (JSON) as:

    {"weight":"80","height":"1.75","ismetric":true}

As you can see this is more or less the same thing, which is why JSON is such a hugely popular format.
You can have nested dictionaries, arrays etc. The one missing aspect of this is binary data which we often get around by Base-64 encoding (and optionally compressing). More on this later.

Object to JSON:

    let output_text=JSON.stringify(obj);

JSON to Object (note that the text has to be properly formatted):

    let obj= JSON.parse(input);

The best practice is to surround this with a `try ... catch` block to catch any possible parsing errors

    let obj = {}; // Empty object
    try {
        obj= JSON.parse(f.data);
    }  catch(e) {
        console.log(“Some Error”);
    }

Strategies of this kind are often referred to as __Defensive Programming__

#### A Python aside

Python also supports JSON very nicely. This example is from _test/test_module.py_.

    import json
    import os
    import sys

    testlistfilename = os.path.abspath(my_path+"/module_tests.json");
    try:
        json_data=open(testlistfilename).read()
        obj = json.loads(json_data)
    except:
        e = sys.exc_info()[0]
        print('---- Failed to read ',testfilename,e);
        sys.exit(1);

Take a look at the [json package](https://docs.python.org/3/library/json.html) documentation for more details.

---
## Modules

### Node.js modules
Originally JavaScript had no concepts of modules. The most popular "third-party" module architecture was probably the Node.js module style of module. These are known as [CommonJS Modules](http://www.commonjs.org/specs/modules/1.0/). These modules depend on two extensions to JS that are not supported by browsers:

* the statement require
* the magic variable module.exports

There are tools in the Web ecosystem designed to correct this, e.g. Webpack. Consider the following example (in Node.js). First our module that provides two functions that check if the extension of a filename is `csv` or `txt`.


    let isfilenamecsv = function(fname) {
        let ext=fname.split('.').pop();   
        if (ext!="csv") 
            return false;
        return true;
    };

    let isfilenametxt = function(fname) {
        let ext=fname.split('.').pop();   
        if (ext!="txt") 
            return false;
        return true;
    };

So far this is normal JS code. The next statement is the module.exports extension which determines the functionality that this module provides to the outside world. This often a dictionary object containing a collection of functions and/or variables as in this case:

    module.exports = {
        istxt : isfilenametxt,
        iscsv : isfilenamecsv
    };

The main file is as follows. First we use the __require__ keyword to import the functionality from our module (called nodemodule)

    let fnameutils=require('./nodemodule');

__'fnameutils' takes the value of 'module.exports' from above.__ The rest is simple JS code that calls functionality inside this object.

    let fnames = [ 'a.csv', 'b.txt', 'c.xls' ];
    let length=fnames.length;

    for (let i=0;i<length;i++) {
        let iscsv=fnameutils.iscsv(fnames[i]);
        let istxt=fnameutils.istxt(fnames[i]);
        console.log('Filename : '+fnames[i]+' istxt='+istxt+'\t iscsv='+iscsv);
    }


### ES6 Modules

This is is the formal JavaScript Module system introduced with v6 of the languge in 2015. Take a look at this document [linked to by the Webpack documentation](https://auth0.com/blog/javascript-module-systems-showdown/) for more information.

### Webpack

[Webpack](https://webpack.github.io/) is a very commonly used tool that parses JS files to create single file bundles. It parses require/module.exports statements and replaces them with browser-compatible code. We use this extensively in BisWeb to bundle both our web and command-line applications. 

In the bisweb build process Webpack is invoked via gulp. The configuration files for this (for both the web applications and commandline applications) can be found in the `config` directory -- see the files that begin with `webpack.config` (web applications) and `app.config` (commandline applications) respectively.

---

## Regression Testing with Mocha

 [Mocha](https://mochajs.org) is used for regression testing. Writing tests in Mocha is straight-forward. Consider the following simple example (let's call this `test.js )

First we import the assert package

    const assert = require('assert');

Then we use the `describe` function to create a family of tests:

    describe('simple math', function() {

Then we wuse the `it` function to create an individual test:

        it('2+2 = 4' , function() {

Inside this we write some code and end with a call to `assert` to test that the result is true or false

            assert.equal(4, 2+2);
        });

Here is a second, more complicated test:

        it('2+2 != 5', function() {

            let sum=2+2;
            let pass=true;
            if (sum!==5)
                pass=false;

            assert.equal(pass,false);
        });
    });

To run this test simply type

    mocha test.js

This  produces the output:

    simple math
        ✓ 2+2 = 4
        ✓ 2+2 != 5

    2 passing (10ms)

Things get more complicated with asynchronous operations etc. Take a look at the tests in the `tests` subdirectory for more examples.

---

## Interfacing with the Web Page

JavaScript when running in the Browser can interface with the [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction). It can be used to create elements, find elements and modify elements as needed. We can also use JavaScript to define custom elements (more below) as well.

## Native vs JQuery

In the old days of web browsers, the interface to the DOM was very "variable" among browsers. JQuery was created to (in part) solve this problem and provide a uniform interface to the DOM regardless of the browser one was using. While this situation has significantly improved, there are two common ways to manipulate the DOM. One is the native way using methods of the JavaScript `document` object and the other is via JQuery. A good set of examples can be found at the [you might not need jquery webpage](http://youmightnotneedjquery.com/).

Either is fine and you will see examples of both in our code. A point of confusion comes in converting between the two:

Consider the case of looking for an element with id  = viewerid

    let viewer = document.querySelector(viewerid);

or

    let jqueryviewer = $(viewerid);

The two are almost equivalent. JQuery returns an array (you will see this marked in our documentation as `JQueryElement`) by default as it could have found multiple items. To get the equivalent viewer you need to call:

    viewer=jqueryviewer[0];


## Creating HTML Elements in JS

We will use JQuery here. The easiest way to do this is to create an HTML multiline string (using the back-quote ` delimiter) and then parse it using JQuery. For example:

    const $=require('jquery');

    const formtext=`
      <form class="form">
        <div class="form-group">
            <label for="weight">Weight</label>
            <input type="number" step="any" class="form-control" name="weight" placeholder="70.0">
        </div>
        <div class="form-group">
            <label for="height">Height</label>
            <input type="number" step="any" class="form-control" name="height" placeholder="1.70">
        </div>
        <div class="checkbox">
            <label>
                <input type="checkbox" name="metric" checked="true"> Using Metric Units
            </label>
        </div>
        <button class="btn btn-primary" type="submit" name="compute">Compute BMI</button>
      </form>`;
    

    let htmlform=$(formtext);
    $(body).append(htmlform);

This takes the HTML text, parses it via JQuery and appends it to the WebPage. Some of the class descriptions inside the HTML code use Bootstrap CSS classes.

## Custom Web Elements

We use custom web elements extensively in our software. Here is simple example of creating a menubar using bootstrap

![Menu bar](figures/menubar.png)

This is from a set of examples that I wrote for a Yale class. The JS Code is as follows (this uses JQuery and Bootstrap):

    const $=require('jquery');
    // The next two lines are needed for bootstrap
    window.jQuery=$;
    require('bootstrap');


    const menubartext=`
        <nav class="navbar navbar-default navbar-fixed-top">
            <div class="container-fluid" id="bismenucontainer">
                <!-- Brand and toggle get grouped for better mobile display -->
                <div class="navbar-header" id="bismenuheader" >
                    <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bismenu">
                        <span class="sr-only">Toggle navigation</span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>
                    <img src="images/logo.png" height="50px" style="margin-top:5px">
                </div>  <!-- Collect the nav links, forms, and other content for toggling -->
                <div class="collapse navbar-collapse" id="bismenu">
                  <ul class="nav navbar-nav" id="bismenuparent" name="menubar">
                  </ul>
                </div><!-- /.navbar-collapse -->
            </div><!-- /.container-fluid -->
        </nav>`;


        // -----------------------------------------------------------------
        /**
        * A web element that creates a top menu bar (using BootStrap <nav class="navbar navbar-default navbar-fixed-top">
        *
        * to access simply include this file into your code and then add this as an element to your html page
        *
        * @example
        *  <custom-menubar   id="viewer_menubar"></custom-menubar> 
        *
        */
        class MenuBarElement extends HTMLElement {

            constructor() {
                super();
                this.menubar = null;
            }

            // Fires when an instance of the element is created.
            connectedCallback() {

                // Create the html elements
                let elem=$(menubartext);

                // Append to the web page -- remeber elem is JQueryElement and this.appendChild needs native hence [0]
                this.appendChild(elem[0]);

                // Keep a pointer to the actual menubar
                this.menubar=elem.find("[name='menubar']");
            }

            // returns the menubar div to which one can add a boostrap style menu -- see
            getMenuBar() {
                return this.menubar || null;
            }
        }


    // Register the element
    window.customElements.define('custom-menubar', MenuBarElement);


A few points worth mentioning here.

1. A custom web element must extend (directly or indirectly) HTMLElement. 
2. The constructor must call the parent class constructor ( hence the call __super()__).
3. When the element is attached to the page, the method _connectedCallback()_ is invoked. This is the real constructor in many ways.
4. We create our web-page content inside connectedCallback and attach it to the page.
5. The element must be registered with the browser using window.customElements.define. Its name _must contain a hyphen._

Then we can insert our element in the browser as:

    <body>
        <custom-menubar   id="menubar"></custom-menubar>
        ...
    </body>


__A component may take attributes__. For example:

    <custom-mainapplication menubar="#menubar" form="#mainwidget"></custom-mainapplication>

Here menubar and form are attributes of our component. Inside the code we can look for the menubar as:

	const menubarid = this.getAttribute('menubar');

We can then use the value of the attribute to get a pointer to the actual element as:

    let menu = document.querySelector(menubarid);

and call its methods as in any JS-class

    let menubar=menu.getMenuBar();

This is the core of how the BioimageSuite Web web applications are constructed. We place a set of custom components on the page and then link them to each other via attributes.

----
