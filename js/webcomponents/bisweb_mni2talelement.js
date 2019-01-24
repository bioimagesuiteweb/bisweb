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
const webcss=require('bisweb_css');
const userPreferences = require('bisweb_userpreferences.js');
const bisdbase = require('bisweb_dbase');

class Mni2TalElement extends HTMLElement {


    constructor() {
        super();
        this.viewer=null;

    }
    
    // Fires when an instance was inserted into the document.
    connectedCallback() {

        webcss.setAutoColorMode();
        
        let main=document.querySelector("#viewer");
        this.viewer=new bisweb_mni2talbase.OrthoViewer(main);
        this.viewer.initialize();

        let rs=function() {
            
            let width=window.innerWidth;
            let height=window.innerHeight;
            if (width<600) {
                $("#bottomright").css( { 'top' : '95vmin',
                                         'width':'80vmin',
                                         'left': '2vmin'});
            } else if (height<600) {
                $("#bottomright").css( { 'top' : '2vmin',
                                         'width':'80vmin',
                                         'left': '95vmin'});
            } else {
                $("#bottomright").css( { 'top' :  '47vmin',
                                         'width': '50vmin',
                                         'left':  '47vmin'});
            }
        };

        let imagepath=webutil.getWebPageImagePath();
        $('#blogo').append(`<a href="./index.html" target="_blank"><img src="${imagepath}/bioimagesuite.png" height="50px" id="bislogo" style="margin-top:0px;margin-right:20px;margin-left:15px"></a>`);
        
        
        window.addEventListener( 'resize', rs);
        webutil.runAfterAllLoaded(rs);

        userPreferences.initialize(bisdbase).then( () => {
            userPreferences.safeGetItem('darkmode').then( (m) => {
                let s=webcss.isDark();
                if (m!==s) 
                    webcss.toggleColorMode();
            });
        });
    }
    
    getviewer() { return this.viewer;}
}

// register element

module.exports=Mni2TalElement;
webutil.defineElement('bisweb-mni2tal', Mni2TalElement);
