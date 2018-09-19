/*  LICENSE
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
 
 BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
 
 - you may not use this software except in compliance with the License.
 - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
 
 __Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.__
 
 ENDLICENSE */

/* global  HTMLElement, window,document */

"use strict";


const webutil=require('bis_webutil');
const BisWebImage=require('bisweb_image');
const imagepath=webutil.getWebPageImagePath();

let viewerid=null;
let snapshotid=null;


var startFunction = (() => {

    const viewer = document.querySelector(viewerid);
    const snapshotElement = document.querySelector(snapshotid);
    
    console.log('viewer=',viewer);
    
    let img=new BisWebImage();
    img.load(`${imagepath}/MNI_T1_1mm_stripped_ras.nii.gz`).then( () => {
        webutil.createAlert('Image loaded from ' + img.getDescription());
        console.log('Image=',img);
        console.log('Viewer=',viewer);
        viewer.setimage(img);

        let state=viewer.getElementState(false);
        console.log(JSON.stringify(state,null,2));
        
        console.log('Viewer=',snapshotElement);
        snapshotElement.getTestImage().then( (dat) => {
            console.log('Creating new image');
            let newimg=snapshotElement.createBisWebImageFromCanvas(dat);
            viewer.setimage(newimg);

            setTimeout( () => {

                let url=imagepath+'/../../test/testdata/display/disptest1.png';
                console.log(url);
                snapshotElement.createBisWebImageFromImageElement(url).then( (newimg2) => {
                    console.log(newimg2.getDescription());
                    viewer.setobjectmap(newimg2);

                    let tst=newimg.compareWithOther(newimg2,"maxabs",2);
                    webutil.createAlert(JSON.stringify(tst,null,2));
                });
            },20);
            
        });
    });

    

});


// -----------------------------------------------------------------
/**
 * A web element that runs the regression testing in conjuction with biswebtest.html
 */
class DisplayRegressionElement extends HTMLElement {
    
    // Fires when an instance of the element is created.
    connectedCallback() {
        viewerid = this.getAttribute('bis-viewerid');
        snapshotid = this.getAttribute('bis-snapshotid');
        webutil.runAfterAllLoaded( () => {
            startFunction();
        });
    }
}



webutil.defineElement('bisweb-displayregressionelement', DisplayRegressionElement);

