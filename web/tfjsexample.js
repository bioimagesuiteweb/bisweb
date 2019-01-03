"use strict";

const URL='http://localhost:8080/web/images/tfjsexample';

let run_tf=async function(img) {

    const MODEL_URL =  URL+'/tensorflowjs_model.pb';
    const WEIGHTS_URL = URL+'/weights_manifest.json';

    const model = await tf.loadFrozenModel(MODEL_URL, WEIGHTS_URL);
    const bisweb=document.querySelector("#bis").export;
    
    let dims=img.getDimensions();
    console.log('Dimensions=',dims);
    let imagedata=img.getImageData();

    let outimg=new bisweb.BisWebImage();
    outimg.cloneImage(img);
    
    for (let row=0;row<=1;row++) {
        for (let col=0;col<=1;col++) {

            console.log('Working on part ',row,col);
            let offset_j=row*128;
            let offset_i=col*128;
            let newarr=new Float32Array(128*128);
            let index=0;
            for(let i=0;i<128;i++) {
                for (let j=0;j<128;j++) {
                    let ia=i+offset_i;
                    let ja=j+offset_j;
                    if (ia>=dims[0] || ja>=dims[1])
                        newarr[index]=0;
                    else
                        newarr[index]=imagedata[ja*dims[0]+ia] || 0;
                    index++;
                }
            }
        
    
            const tensor= tf.tensor(newarr, [ 1,128,128 ]);
            const output=model.predict(tensor);
            let predict=output.as1D().dataSync();
            let outdata=outimg.getImageData();
            let l=outdata.length;
            index=0;
            for(let i=0;i<128;i++) {
                for (let j=0;j<128;j++) {
                    let ia=i+offset_i;
                    let ja=j+offset_j;
                    if (ia<dims[0] && ja<dims[1])
                        outdata[ia+ja*dims[0]]=predict[index];
                    index++;
                }
            }
        }
    }
    const viewer=document.querySelector("#viewer");
    viewer.setobjectmap(outimg);
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
