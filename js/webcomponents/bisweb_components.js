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

/* global  HTMLElement */
"use strict";

const $=require('jquery');
const webutil=require('bis_webutil');
const bisversion=require('bisdate');
const iconpath=webutil.getWebPageImagePath();


// -----------------------------------------------------------------
/**
 * A web element that creates a top menu bar (using BootStrap <nav class="navbar navbar-default navbar-fixed-top">
 *
 * to access simply include this file into your code and then add this as an element to your html page
 *
 * @example
 *  <bisweb-topmenubar id="viewer_menubar" logo="some.png" logoheight="50px"></bisweb-topmenubar> 
 *
 * Attributes:
 *    content : an HTML string that is included on the menubar
 *    logo  : an image file to use as logo e.g. "images/bioimagesuite.png"
 *    logoheight : the height of the logo e.g. "50px"
 *    logolink : url of link to open when logo is clicked 
 */
class TopMenuBarElement extends HTMLElement {
    
    // Fires when an instance of the element is created.
    connectedCallback() {
        
        // Move the children out


        const logoheight=this.getAttribute('logoheight') || '50px';
        const logo=this.getAttribute('logo') || `${iconpath}/bioimagesuite.png`;
        let logolink=this.getAttribute('logolink') || "./index.html";
        
        const topmenubartext=`
            <nav class="navbar navbar-default navbar-fixed-top">
            <div class="container-fluid" id="bismenucontainer">
      <!-- Brand and toggle get grouped for better mobile display -->
      <div class="navbar-header" id="bismenuheader" >
            <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bismenu">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
      <span class="icon-bar"></span>
      <span class="icon-bar"></span>
            </button>
        <a href="${logolink}" target="_blank"><img src="${logo}" height="${logoheight}" id="bislogo" style="margin-top:5px"></a>
    </div>  <!-- Collect the nav links, forms, and other content for toggling -->
    <div class="collapse navbar-collapse" id="bismenu">
        <ul class="nav navbar-nav" id="bismenuparent">
        </ul>
    </div><!-- /.navbar-collapse -->
    </div><!-- /.container-fluid -->
        </nav>`;

        
        const elem=$(topmenubartext);
        this.appendChild(elem[0]);
        this.menubar=$(".navbar-nav",elem);
        
        let content=this.getAttribute('bis-content') || null;
        if (content!==null) {
            this.menubar.empty();
            this.menubar.append($(content));
        }
        webutil.disableDrag(this.menubar);
    }
    
    /**
     * returns the menubar div to which one can add a boostrap style menu -- see
     * {@link WebUtil.createTopMenuBarMenu}
     */
    getMenuBar() {
        return this.menubar || null;
    }
}

/**
 * A web element that creates a bottom menu (status) bar (using BootStrap <nav class="navbar navbar-default navbar-fixed-bottom">
 *
 * to access simply include this file into your code and then add this as an element to your html page
 *
 * @example
 * <bisweb-botmenubar content="html for bottom text"></bisweb-botmenubar>
 *
 * Attributes:
 *    content : if non blank some html text (in a <div>, <span> or <p>) to put on bottom bar)
 */
class BottomMenuBarElement extends HTMLElement {
    
    connectedCallback() {

        
        const st=`display: inline-block;margin-top:1px; padding-left:2px; padding-right:5px; margin-bottom:1px; height:10px; font-size:14px;`;
        
        const bottommenubar=`<nav class="navbar navbar-default navbar-fixed-bottom" style=" min-height:25px; max-height:25px"></nav>`;
        
        const bottomtext=`<span class="label label-link" style="${st} float:right">This application is part of <a href="./index.html" target="_blank">Yale
BioImage Suite</a> (${bisversion.version}, ${bisversion.date})</span>`;

        let content=this.getAttribute('content') || '';
        if (content.length<3)
            content=bottomtext;
        const elem=$(bottommenubar);
        elem.append($(content));
        this.appendChild(elem[0]);
        webutil.disableDrag(elem);
    }
    
}

// ----------------- Register Elements -------------------------------

webutil.defineElement('bisweb-topmenubar', TopMenuBarElement);
webutil.defineElement('bisweb-botmenubar', BottomMenuBarElement);


