"use strict";

/* global tf */

const URL='http://localhost:8080/web/images/tfjsexample';

let run_tf=async function(img) {

    const MODEL_URL =  URL+'/tensorflowjs_model.pb';
    const WEIGHTS_URL = URL+'/weights_manifest.json';
    const model = await tf.loadFrozenModel(MODEL_URL, WEIGHTS_URL);
    const bisweb=document.querySelector("#bis").export;

    let shape=model.inputs[0].shape;
    let patchsize=shape[1];
        
    let recon=new bisweb.bistfutil.BisWebTensorFlowRecon(img,patchsize,patchsize-16);
    let output=recon.simpleRecon(tf,model);

    const viewer=document.querySelector("#viewer");
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
