## BioImage Suite Web -- Browser Package

This is a Browser package that exports some of the low level
algorithmic and IO functionality in BioImage Suite Web as an npm package. 



### Installation

Simply type

    npm install biswebbrowser

### Using this as a library

In your code (assuming you are doing this via webpack)

    const bisweb=require('biswebbrowser');

Here is some sample js code that uses this:

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

### using this directly in the browser (not via webpack)

#### In the header add the scripts (somehow)

    <script src="./node_modules/jquery/dist/jquery.min.js"></script>
    <script src="./node_modules/bisweb/dist/libbiswasm_wasm.js"></script>
    <script src="./node_modules/bisweb/dist/bislib.js"></script>

#### JS Code

This is the same above but you will need to replace the `require` line with

    const bisweb=window.bioimagesuiteweb();
    


