"use strict";

/* global tf */

const URL='http://localhost:8080/web/images/tfjsexample';

let run_tf=async function(img) {

    const bisweb=document.querySelector("#bis").export;
    const viewer=document.querySelector("#viewer");

    const model=await bisweb.bistfutil.loadAndWarmUpModel(tf,URL);

    if (viewer)
        viewer.disable_renderloop();
    
    console.log('numTensors (post load): ' + tf.memory().numTensors);

    
    let recon=new bisweb.bistfutil.BisWebTensorFlowRecon(img,model,16);
    let output=recon.batchRecon(tf,8);

    //tf.disposeVariables();

    console.log('numTensors (post external tidy): ' + tf.memory().numTensors);

    if (viewer) {
        viewer.enable_renderloop();
        viewer.renderloop();
        viewer.setobjectmap(output);
    } else {
        output.save('recon.nii.gz');
    }
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
    img.load(`${URL}/sample3d.nii.gz`).then( () => {
        console.log('Image Loaded = ',img.getDescription());
        
        // Set the image to the viewer
        if (viewer)
            viewer.setimage(img);

        run_tf(img);

        

    }).catch( (e) => {
        console.log(e,e.stack);
    });
};
