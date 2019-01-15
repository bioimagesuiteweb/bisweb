"use strict";

/* global $,document,window */

// Get access to the computational tools 
const bisweb=window.bioimagesuiteweb;

let extra="test/testdata/tfjs64";
// In development mode
//if (window.BIS) {
//    extra="../"+extra;
//}

let getScope=function() {

    return 'https://bioimagesuiteweb.github.io/';
    
    /*    let scope=window.document.URL;

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
    }*/
};

let run_tf_module=async function(img) {

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
    tfrecon.execute( { input : img }, {  padding : 8, batchsize : batchsize, modelname : URL, forcebrowser : true }).then( () => { 
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
        bisweb.webutil.createAlert(e,true);
    });
};


window.onload = function() {

    if (bisweb.getEnvironment() === "electron") {
        window.BISELECTRON.remote.getCurrentWindow().toggleDevTools();
        $('.navbar-fixed-bottom').remove();
    }
    
    // Print the functionality
    
    console.log('==========================================================');
    console.log('BISWeb Environment = ',bisweb.getEnvironment());    
    // The viewer is optional, just remove the
    const viewer=document.querySelector("#viewer");

    let URL=getScope()+extra;
    
    // Load an image --> returns a promise so .then()
        /*    let URL=getScope()+extra;
    if (bisweb.getEnvironment()==='electron')  {
    let start=8;
    if (bisweb.genericio.getpathmodule().sep==='/')
    start=7;
    URL=URL.substr(start,URL.length-start);
    }*/

    
    let fn=( (name) => {

        //        console.clear();
        console.log('Loading object=',URL);
        bisweb.loadObject(`${URL}/${name}.nii.gz`,'image').then( (img) => {

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

    if (window.BIS) { 
        $('#compute3d').click( () => {
            fn('sample3d');
        });
    } else {
        $('#compute3d').remove();
    }

};
