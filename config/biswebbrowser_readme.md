![Logo](https://bioimagesuiteweb.github.io/bisweb-manual/bisweb_newlogo_small.png)

---

## BioImage Suite Web -- Browser Package

This is package exports much of functionality in BioImage Suite Web as an npm
package for use inside a Browser (or Electron). For more on BioImage Suite Web
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

---

## Installation

Simply type:

    npm install biswebbrowser

---

## Including in your application's html header

In the header of your html file include: (Replace `node_modules` with the
relative path from your `.html` file to `node_modules`)

a. The CSS dependencies (only needed if you will use BioImage Suite Web UI Components)

Either the slightly customized BioImage Suite Web `dark` bootstrap style (this
is bootstrap 3.4.0)

    <link rel="stylesheet" type="text/css href="node_modules/biswebbrowser/dist/bootstrap_dark_edited.css">
    
or a standard `light` style:

    <link rel="stylesheet" type="text/css href="node_modules/biswebbrowser/dist/css/bootstrap.min.css">

b. The external JS dependencies (jQuery 3.3.1, THREE.js 0.100.0, Bootstrap 3.4.0 and
the Polymer webcomponents package)

    <script src="node_modules/biswebbrowser/dist/webcomponents-lite.js"></script>
    <script src="node_modules/biswebbrowser/dist/jquery.min.js"></script>
    <script src="node_modules/biswebbrowser/dist/bootstrap.min.js"></script>
    <script src="node_modules/biswebbrowser/dist/three.min.js"></script>
    
c. The BioImage Suite Web Files JS/WASM files

    <script src="node_modules/biswebbrowser/dist/libbiswasm_wasm.js"></script>
    <script src="node_modules/biswebbrowser/dist/bislib.js"></script>

If you would like (for whatever reason) not to include GPL licensed code, then
include the non-GPL WASM code (Apache) script instead of `libbiswasm_wasm.js`.

    <script src="node_modules/bisweb/dist/libbiswasm_nongpl_wasm.js"></script>

---

## Example JS Code

Here is some sample js code that uses this:

    const bisweb=window.bioimagesuiteweb;

    window.onload = function() {
    
        console.log('Bisweb=',bisweb);
    
        let img=new bisweb.BisWebImage();
    
        img.load("https://bioimagesuiteweb.github.io/unstableapp/images/MNI_T1_2mm_stripped_ras.nii.gz").then( () => {
            console.log('Image Loaded = ',img.getDescription());
    
            let mod=bisweb.createModule("resampleImage");
             console.log('Module created=',mod);
    
             mod.execute( { "input" : img   }, { "xsp"  : 2.0, "ysp" : 3.0, "zsp" : 4.0
                                      }).then( () => {
                                          let out=mod.getOutputObject("output");
                                          console.log('OutImage = ',out.getDescription());
                                          out.save();
                                      });
        });
     };

For more, see the [./dist/exportexample.html](./dist/exportexample) that is part of
this npm package or the examples repository linked to above.

----

## Using with Webpack

If you are using Webpack in your own application and you would like to bundle
bioimagesuite web within your bundle you will need to:

1. Add the following to the externals part of your webpack configuration

        externals: {
            "jquery": "jQuery",
            "jQuery": "jQuery",
            "THREE": "THREE", 
        },
        
2. Include bioimagesuiteweb using require (instead of the script tag), e.g.

        const bioimagesuiteweb=require('biswebbrowser');
    
3. You will still need to include the following in the heaeder of your webpage
   -- the only file not needed is `bislib.js`.

        <script src="node_modules/biswebbrowser/dist/webcomponents-lite.js"></script>
        <script src="node_modules/biswebbrowser/dist/jquery.min.js"></script>
        <script src="node_modules/biswebbrowser/dist/bootstrap.min.js"></script>
        <script src="node_modules/biswebbrowser/dist/three.min.js"></script>
        <script src="node_modules/biswebbrowser/dist/libbiswasm_wasm.js"></script>


---

## Electron

If you are planning to use this code in an electron application, you will need
to include the file
[./electron/electronpreload.js](./electron/electronpreload) in your electron
preload script for as to allow access to lower level code. 

You will also need to install the node.js pre-requisites specified in
[./electron/electrondependencies.json](./electron/electrondependencies.json)
appropriately.  The tensorflow package (tfjs-node) is optional.


---
## Regression Testing

I assume that you have some form of web server running. If you do not, you can
use simple-server. See:
[https://www.npmjs.com/package/simple-server](https://www.npmjs.com/package/simple-server)
more information.

Once you have a server up and running, simply navigate to one of
the following:

* [node_modules/biswebbrowser/dist/biswebtest.html](node_modules/biswebbrowser/dist/biswebtest.html) -- module  tests
 
* [node_modules/biswebbrowser/dist/biswebdisplaytest.html](node_modules/biswebbrowser/dist/biswebdisplaytest.html)
  -- display tests I

* [node_modules/biswebbrowser/dist/biswebdisplaytest2.html](node_modules/biswebbrowser/dist/biswebdisplaytest2.html)
  -- display tests II

For more info on the tests see
[https://bioimagesuiteweb.github.io/bisweb-manual/biswebtest.html](https://bioimagesuiteweb.github.io/bisweb-manual/biswebtest.html).
