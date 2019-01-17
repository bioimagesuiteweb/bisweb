![Logo](https://bioimagesuiteweb.github.io/bisweb-manual/bisweb_newlogo_small.png)

---
## BioImage Suite Web -- Node.js Package

This is package exports much of functionality in BioImage Suite Web as an npm
package for use either as a commandline node.js application, or as part of
another Node.js tool. For more on BioImage Suite Web
see:

* The source repository --
  [https://github.com/bioimagesuiteweb/bisweb](https://github.com/bioimagesuiteweb/bisweb)
* The actual web application --
  [https://bioimagesuiteweb.github.io/webapp/](https://bioimagesuiteweb.github.io/webapp/)
  
You may also take a look at the examples repository
[https://github.com/bioimagesuiteweb/examples](https://github.com/bioimagesuiteweb/examples).


BioImage Suite Web (bisweb) is a web-based medical image analysis suite
primarily geared towards Neuroimaging Analysis. We gratefully acknowledge
support from the NIH Brain Initiative under grant R24 MH114805 (Papademetris
X. and Scheinost D. PIs).

### Installation

Simply type:

    npm install biswebnode

This is very similar to the command line distribution of BioImage Suite web
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


### Using the `biswebnode` command line tool(s)

#### Global Install

If you install biswebnode as a global package (i.e. npm install -g
biswebnode), then there will an executable in your path called `biswebnode`

Type:

    biswebnode
    
This will print the list of all modules.
    
Usage:

cd .    biswebnode modulename parameters
    
e.g.

    biswebnode smoothImage -i someimage.nii.gz -o output.nii.gz


#### Local Install

If you install `biswebnode` as a local package you can invoke the same bisweb
tool using

    node cd
