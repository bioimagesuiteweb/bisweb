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



let iconpath=webutil.getWebPageImagePath();


const bottommenubartext=`
            <nav class="navbar navbar-default navbar-fixed-bottom" style=" min-height:25px; max-height:25px">
            <div style="margin-top:2px; margin-left:5px; 
'padding-right:10px, margin-bot:1px; height:10px; font-size:12px" align="right">
      <img src="${iconpath}/bislogo.png" id="bislogobottom" height="20px"/>
      This application is part of <a href="./index.html" target="_blank">Yale
BioImage Suite</a> (${bisversion.version}, ${bisversion.date}).&nbsp;&nbsp; 
</div>
        </nav>`;


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
        <a href="./index.html" target="_blank"><img src="${iconpath}/bioimagesuite.png" height="50px" id="bislogo" style="margin-top:5px"></a>
    </div>  <!-- Collect the nav links, forms, and other content for toggling -->
    <div class="collapse navbar-collapse" id="bismenu">
        <ul class="nav navbar-nav" id="bismenuparent">
        </ul>
    </div><!-- /.navbar-collapse -->
    </div><!-- /.container-fluid -->
        </nav>`;


// -----------------------------------------------------------------
/**
 * A web element that creates a top menu bar (using BootStrap <nav class="navbar navbar-default navbar-fixed-top">
 *
 * to access simply include this file into your code and then add this as an element to your html page
 *
 * @example
 *  <bisweb-topmenubar   id="viewer_menubar"></bisweb-topmenubar> 
 *
 * Attributes:
 *    bis-content : an HTML string that is included on the menubar
 */
class TopMenuBarElement extends HTMLElement {
    
    // Fires when an instance of the element is created.
    connectedCallback() {
        
        // Move the children out
        let elem=$(topmenubartext);
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
 * <bisweb-botmenubar></bisweb-botmenubar>
 *
 * Attributes:
 *    None
 */
class BottomMenuBarElement extends HTMLElement {
    
    connectedCallback() {
        let elem=$(bottommenubartext);
        this.appendChild(elem[0]);
        webutil.disableDrag(elem);
    }
    
}

/**
 * A main div element that fills the screen
 *
 * to access simply include this file into your code and then add this as an element to your html page
 *
 * @example
 * <bisweb-viewerwidget bis-margin="60px">  
 *        <bisweb-mni2tal></bisweb-mni2tal>
 * </bisweb-viewerwidget>
 *
 * Attributes:
 *    bis-margin : pixel offset from the top
 */
class ViewerWidgetElement extends HTMLElement {
    
    // Fires when an instance of the element is created.
    connectedCallback() {
        let margin=this.getAttribute('bis-margin') || '65px';
        $(this).css({
            'position' : 'relative',
            'width' : '800px',
            'height' : '800px',
            'top' : `${margin}`,
            'left' : '5px',
            '-webkit-user-select': 'none',
            '-moz-user-select': 'none',
            '-ms-user-select': 'none',
            'user-select': 'none',
            '-webkit-app-region': 'no-drag'});
    }
}

webutil.defineElement('bisweb-topmenubar', TopMenuBarElement);
webutil.defineElement('bisweb-botmenubar', BottomMenuBarElement);
webutil.defineElement('bisweb-viewerwidget', ViewerWidgetElement);

