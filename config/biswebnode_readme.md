## BioImage Suite Web -- Node

This is a Node.js _only_ package that exports some of the low level
algorithmic and IO functionality in BioImage Suite Web as an npm package. This
is very similar to the command line distribution of BioImage Suite web
available from [this download page](http://bisweb.yale.edu/binaries).

If you have not installed this via npm then see the file
[README_js.txt](README_js.txt) in this directory.

### Installation

Simply type

    npm install biswebnode

### Using this as a library

In your code add

    const bisweb=require('biswebnode');
    
To load, resample, and save an image, for example, do

     let img=new bisweb.BisWebImage();

     img.load("someimage.nii.gz").then( () => {
         console.log('Image Loaded = ',img.getDescription());

         let mod=bisweb.createModule("resampleImage");
         console.log('Module created=',mod);
     
         mod.execute( { "input" : img   }, { "xsp"  : 2.0, "ysp" : 3.0, "zsp" : 4.0
           }).then( () => {
              let out=mod.getOutputObject("output");
              console.log('OutImage = ',out.getDescription());
              out.save("outputimage.nii.gz");
         });


### Using the command line tools as executables

Type:

    biswebnode
    
This will print the list of all modules.
    
Usage:

    biswebnode modulename parameters
    
e.g.

    biswebnode smoothImage -i someimage.nii.gz -o output.nii.gz
