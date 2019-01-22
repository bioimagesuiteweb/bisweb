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

---

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


---

## Using the `biswebnode` command line tool(s)

### Global Install

#### 1. Running the Modules

If you install biswebnode as a global package (i.e. npm install -g
biswebnode), then there will an executable in your path called `biswebnode`

Type:

    biswebnode
    
This will print the list of all modules.
    
Usage:

cd .    biswebnode modulename parameters
    
e.g.

    biswebnode smoothImage -i someimage.nii.gz -o output.nii.gz


#### 2. Regression Tests

__Mocha:__

If you would like to run these, first install mocha using:

    sudo npm -g mocha
    
(Omit `sudo` on MS-Windows.)

__Regression Tests:__

To run the regression tests type (this will run tests 0 and 1)

    biswebnode regressionTests --last 2 --run 1
    
For help on running these type:

    biswebnode  regressionTests -h
    

To run ALL the tests simply type (this will take a while):

    biswebnode regressionTests --run 1
   
---   
    
### Local Installation of the Command Line Tools

In this scenario you can use scripts to run the modules directly. The scripts
are located in the directories `biswebnode/bin` (Linux/MacOS) or
`biswebnode/winbin` (MS-Windows). 

To run the scripts:

1. Optionally set your paths

On Mac/Linux type

    source biswebnode/setpaths.sh
    
or more likely

    source node_modules/biswebnode/setpaths.sh

(Use `setpaths.csh` if you are running csh/tcsh)

On MS-Windows type

     biswebnode/setpaths.bat

2. Then execute the tool of your choice. As an example to run the smooth image
script (and get its help page) type:

        bw_smoothImage -h
   
3. For regression testing (assuming `mocha` is installed on your
   system, see above for instructions) type:

        bw_regressionTests -h





