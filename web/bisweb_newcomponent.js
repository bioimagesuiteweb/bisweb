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
"use strict";

const bisweb=window.bioimagesuiteweb;

const webutil=bisweb.webutil;
const BisWebPanel = bisweb.biswebpanel;

// -------------------------------------------------------------------------
class NewComponent extends HTMLElement {

    constructor() {
        super(); // Initializes the parent class
        this.panel=null;
    }

    initialize() {
        let btn=$('#example1');

        // JQuery
        btn.click( (e) => {
            console.log('Help',e);
            e.preventDefault();

            let img=new bisweb.BisWebImage();
            img.load("https://bioimagesuiteweb.github.io/unstableapp/images/MNI_T1_2mm_stripped_ras.nii.gz").then( () => {
                this.viewer.setimage(img);
            });
            
        });
    }

    // Gets called by the browser when the element is attached to the web page
    // -----------------------------------------------------------------------
    connectedCallback() {
        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        let layoutcontroller=document.querySelector(layoutid);
        this.viewer=document.querySelector(viewerid);

        this.panel=new BisWebPanel(layoutcontroller,
                                   {  name  : "New Component",
                                      permanent : true,
                                      width : '290',
                                      dual : false,
                                   });
        this.parentDomElement=this.panel.getWidget(); // JQuery Object that you can put your own stuff in


        // Bootstrap 3.x
        
        const html=`
<HR>
<H1>Hello</H1>
This is my favorite application. See <B>HI</B>.

<button type="button" class="btn-alert btn-sm" id="example1">Do Somehting</button>

</HR>`;  // Multiline string use ` delimiter '''

        this.parentDomElement.append(html);
        this.show();
        
        setTimeout( () => {
            this.initialize();
        },1000);

    }
                                

    show() {
        this.panel.show();
    }

    isOpen() {
        return this.panel.isOpen();
    }
}


webutil.defineElement('bisweb-newcomponent', NewComponent);

console.log('Imported New Component');

