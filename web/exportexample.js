"use strict";

/* global window,document */

window.onload = function() {
    
    // Get access to the computational tools via the export element
    const bisweb=document.querySelector("#bis").export;
    
    // Print the functionality
    console.log('Bisweb=',bisweb);
    
    // The viewer is optional, just remove the
    const viewer=document.querySelector("#viewer");
    
    // Create an image
    let img=new bisweb.BisWebImage();
    
    // Load an image --> returns a promise so .then()
    img.load("https://bioimagesuiteweb.github.io/unstableapp/images/MNI_T1_2mm_stripped_ras.nii.gz").then( () => {
        console.log('Image Loaded = ',img.getDescription());
        
        // Set the image to the viewer
        viewer.setimage(img);
        
        // Create a module ('resampleImage')
        let mod=bisweb.createModule("resampleImage");
        
        // Execute module (which also returns a promise
        mod.execute(
            { "input" : img   }, // first argument is the input objects (just the image)
            { "xsp"  : 4.0, "ysp" : 5.0, "zsp" : 7.0 } // second argument are the parameters
        ).then( () => {
            // Get the output of the module when it is done
            let out=mod.getOutputObject("output");
            // print the description
            console.log('OutImage = ',out.getDescription());

            // Send this to the viewer
            viewer.setimage(out);
            
            // If uncommented this will save the image
            //out.save();
            
        });
    });
};
