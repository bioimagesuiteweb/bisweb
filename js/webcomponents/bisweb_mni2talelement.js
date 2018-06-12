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

/* global HTMLElement */
"use strict";

// ------------------------------------------------------------------------------------------
// Boilerplate at top
// ------------------------------------------------------------------------------------------
const $ = require('jquery');
const bisweb_mni2talbase=require('bisweb_mni2talbase');
const webutil=require('bis_webutil');


class Mni2TalElement extends HTMLElement {


    constructor() {
        super();
        this.viewer=null;

    }
    
    // Fires when an instance was inserted into the document.
    connectedCallback() {
        
        let main=document.querySelector("#viewer");
        console.log(main);
        this.viewer=new bisweb_mni2talbase.OrthoViewer(main);
        this.viewer.initialize();

        let rs=function() {
            
            let width=window.innerWidth;
            let height=window.innerHeight;
            let vr=$("#viewer");
            
            let wd=parseInt(vr.width());
            let ht=parseInt(vr.height());
            let extra=120;
            let pady=Math.round(0.125*((height-extra)-ht));
            if (pady<0)
                pady=0;
            let pad=Math.round(0.25*(width-wd));
            if (pad<0)
                pad=0;
            vr.css({ 'left' : `${pad}px`,
                     'top' : `${pady+70}px`});
            
        };
        
        window.addEventListener( 'resize', rs);
        rs();
        
    }
    
    getviewer() { return this.viewer;}
}

// register element

webutil.defineElement('bisweb-mni2tal', Mni2TalElement);
