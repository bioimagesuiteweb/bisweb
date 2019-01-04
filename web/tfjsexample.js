"use strict";

/* global tf */

const URL='http://localhost:8080/web/images/tfjsexample';

let run_tf=async function(img) {

    const bisweb=document.querySelector("#bis").export;
    const viewer=document.querySelector("#viewer");

    const model=await bisweb.bistfutil.loadAndWarmUpModel(tf,URL);
    
    viewer.disable_renderloop();
    
    console.log('numTensors (post load): ' + tf.memory().numTensors);
    let complex=true;
    
    let recon=new bisweb.bistfutil.BisWebTensorFlowRecon(img,model,16,-1);
    let output;
    if (complex)
        output=recon.complexRecon(tf,2);
    else
        output=recon.simpleRecon(tf);
    
    tf.disposeVariables();

    console.log('numTensors (post external tidy): ' + tf.memory().numTensors);

    viewer.enable_renderloop();
    viewer.renderloop();
    viewer.setobjectmap(output);
};


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
    img.load(`${URL}/sample1.nii.gz`).then( () => {
        console.log('Image Loaded = ',img.getDescription());
        
        // Set the image to the viewer
        viewer.setimage(img);

        run_tf(img);

        

    }).catch( (e) => {
        console.log(e,e.stack);
    });
};
