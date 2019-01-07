"use strict";

/* global $ */


let extra="/images/tfjsexample";
extra="../test/testdata/tfjs64";



let getScope=function() {
    
    let scope=window.document.URL;

    let index=scope.indexOf(".html");
    if (index>0) {
        index=scope.lastIndexOf("/");
        scope=scope.substr(0,index+1);
    } else {
        let index=scope.indexOf("#");
        if (index>0) {
            index=scope.lastIndexOf("/");
            scope=scope.substr(0,index+1);
        }
    }

    return scope;
};

let run_tf_module=async function(img) {

    const bisweb=document.querySelector("#bis").export;
    const viewer=document.querySelector("#viewer");
    const URL=getScope()+extra;

    let tfrecon=bisweb.createModule('tfrecon');
    if (viewer)
        viewer.disable_renderloop();

    console.log('Looking for URL=',URL);

    let batchsize=1;
    if (window.BISELECTRON) {
        batchsize=64;
    }
    tfrecon.execute( { input : img }, {  padding : 8, batchsize : batchsize, modelname : URL }).then( () => { 
        let output=tfrecon.getOutputObject('output');
        
        if (viewer) {
            viewer.enable_renderloop();
            viewer.renderloop();
            viewer.setobjectmap(output);
        } else {
            output.save('recon.nii.gz');
        }
    }).catch( (e) => {
        console.log('Failed to invoke module',e);
    });
};


window.onload = function() {
    
    // Get access to the computational tools via the export element
    const bisweb=document.querySelector("#bis").export;
    
    // Print the functionality
    console.log('==========================================================');
    console.log('BISWeb Environment = ',bisweb.genericio.getenvironment());    
    // The viewer is optional, just remove the
    const viewer=document.querySelector("#viewer");
    
    // Load an image --> returns a promise so .then()
    let URL=getScope()+extra;
    if (bisweb.genericio.getenvironment()==='electron') 
        URL=URL.substr(8,URL.length-8);


    let fn=( (name) => {
        
        console.log('Loading object=',URL);
        bisweb.loadObject(`${URL}/${name}.nii.gz`,'image').then( (img) => {
            console.log('Image Loaded = ',img.getDescription());

            setTimeout( () => {
                run_tf_module(img);
                
                // Set the image to the viewer
                if (viewer)
                    viewer.setimage(img);
            },1000);
        }).catch( (e) => {
            console.log(e,e.stack);
        });
    });

    $('#compute').click( () => {
        fn('sample1');
    });
    
    $('#compute3d').click( () => {
        fn('sample3d');
    });

};
