
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

/* global window,document,$ */
"use strict";

/**
 * @file A Broswer module. Contains {@link WebCSS}.
 * @author Xenios Papademetris
 * @version 1.0
 */



const internal = {
    darkmode : true,
    cssstyle : null,
    cssapplied : false,
};

const darkcolors= {
    "name" : "dark",
    "activecolor" : "#440000",
    "background" : "#000000",
    "background2" : "#202020",
    "background3" : "#505050",
    "background4" : "#444444",
    "foreground" : "#ffffff",
    "passivecolor" : "#303030",
    "passivecolor0" : "#282828",
    "passivecolor2" : "#383838",
    "canvascolor" : "#000000",
    "indexbg" : "rgb(28,45,64)",
    "carouselbg" : "#000011",
};

const brightcolors = {
    "name" : "bright",
    "activecolor" : "#ffcfcf",
    "background" : "#ffffff",
    "background2" : "#dddddd",
    "background3" : "#cecece",
    "background4" : "#bbbbbb",
    "foreground" : "#111111",
    "passivecolor" : "#e8dfdf",
    "passivecolor0" : "#f8f0f0",
    "passivecolor2" : "#e0d7d7",
    "canvascolor" : "rgb(219,219,224)",
    "indexbg" : "rgb(228,210,192)",
    "carouselbg" : "#222211",
};


const biswebcss= {


    // -----------------------------------------------------------
    // Common css stuff
    // -----------------------------------------------------------
    commoncss : function(colors) {

        
        let st=`

/* biswebinternal ${colors.name} */


.biswebmniviewer {
    background-color : ${colors.canvascolor};
}


.biswebindexbg { 
    background-color : ${colors.indexbg};
}

.biswebcarousel {
    color : ${colors.foreground};
    background-color : ${colors.carouselbg};
}

.biswebdock {
  background-color: ${colors.passivecolor0};
}

.biswebpanel {
  background-color: ${colors.passivecolor};
}

.biswebpanel2 {
  background-color: ${colors.passivecolor2};
}

.biswebactive {
  background-color: ${colors.activecolor};
}

.biswebelement {
  color : ${colors.foreground};
  background-color : ${colors.background2};
  font-size:11px;
}

.biswebselect { 
  background-color : ${colors.background3};
  color : ${colors.foreground};
}

.biswebdropdownitem {
  font-size: 13px; 
  margin-bottom: 2px;
}

.bisweb-file-dialog {
  color : ${colors.foreground};
  background-color": ${colors.background4};
}

.dg {
	 font: 11px "Helvetica Neue",Helvetica,Arial,sans-serif;
}
`;
        return st;

        

    },

    // -----------------------------------------------------------
    // Override dat.gui css styles and some other changes
    // -----------------------------------------------------------
    brightmode : function() {


        // fixed rom data.gui source
        return `

body {
    background-color : #cccccc;
}

.biswebmnislider {
    background-color : #888888;
}

.navbar-default {
     background-color : #375a7f;
}

/** Main type */
 .dg {
	 color: #111;
	 font: 11px "Helvetica Neue",Helvetica,Arial,sans-serif;
     text-shadow: 0 0px 0 #eeeeee;
	/** Auto place */
	/* Controller row, 
 */
	/** Controllers */
}
 .dg.main {
	/** Scrollbar */
}
 .dg.main::-webkit-scrollbar {
	 width: 5px;
	 background: #e5e5e5;
}
 .dg.main::-webkit-scrollbar-corner {
	 height: 0;
	 display: none;
}
 .dg.main::-webkit-scrollbar-thumb {
	 border-radius: 5px;
	 background: #fff;
}
 .dg li:not(.folder) {
	 background: #e5e5e5;
	 border-bottom: 1px solid #d3d3d3;
}
 .dg li.save-row {
	 line-height: 25px;
	 background: #252a34;
	 border: 0;
}
 .dg li.save-row select {
	 margin-left: 5px;
	 width: 108px;
}
 .dg li.save-row .button {
	 margin-left: 5px;
	 margin-top: 1px;
	 border-radius: 2px;
	 font-size: 9px;
	 line-height: 7px;
	 padding: 4px 4px 5px 4px;
	 background: #3a4252;
	 color: #fff;
	 box-shadow: 0 -1px 0 #252a34;
	 cursor: pointer;
}
 .dg li.save-row .button.gears {
	 background: #3a4252;
	 height: 7px;
	 width: 8px;
}
 .dg li.save-row .button:hover {
	 background-color: #303643;
	 box-shadow: 0 -1px 0 #252a34;
}
 .dg li.folder {
	 border-bottom: 0;
}
 .dg li.title {
	 padding-left: 16px;
    background: #c8c8c8 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;
	 cursor: pointer;
}

 .dg .cr.boolean {
	 border-left: 3px solid #7f9878;
}
 .dg .cr.color {
	 border-left: 3px solid;
}
 .dg .cr.function {
	 border-left: 3px solid #19e2a0;
}
 .dg .cr.number {
	 border-left: 3px solid #2fa1d6;
}

 .dg .cr.number input[type=text] {
	 color: #000022;
}
 .dg .cr.string {
	 border-left: 3px solid #e12c90;
}
 .dg .cr.string input[type=text] {
	 color: #e12c90;
}
 .dg .cr.function:hover, .dg .cr.boolean:hover {
	 background: #e0e0e0;
}
 .dg .c input[type=text] {
	 background: #cfcfcf;
	 outline: none;
}
 .dg .c input[type=text]:hover {
	 background: #dcdcdc;
}
 .dg .c input[type=text]:focus {
	 background: #e9e9e9;
	 color: #fff;
}
 .dg .c .slider {
	 background: #cfcfcf;
	 cursor: ew-resize;
}
 .dg .c .slider-fg {
	 background: #2fa1d6;
	 max-width: 100%;
}
 .dg .c .slider:hover {
	 background: #dcdcdc;
}
 .dg .c .slider:hover .slider-fg {
	 background: #2fa1d6;
}


.dg .c select {
    background-color: #dddddd;
    color : #111111;
}

.bistoggle {
    background-color : #efefef;
    float : right;
    border : 2px;
    border-color : rgb(211,211,211);
    border-style : solid;
    color : rgb(0,0,0);
    position : relative;
    font-size : 17px;
    margin-left : 5px;
}

.bisweb-file-list {
    border-color : rgb(229, 229, 229);
    border-style : solid;
    border-width : 1px; 
}

.bisweb-favorite-bar {
    border-color : rgb(229, 229, 229);
    border-style : solid;
    border-width : 1px; 
}

.bisweb-file-dialog {
    color : hsl(160, 70%, 40%);
}

.jstree-node {
    color : hsl(160, 70%, 40%);
}

body {
    background-color: #f0e8e8;
}
`;                              
    },

    // ------------------------------- darmode -------------------
    // Mostly defaults here so only minor changes
    // -----------------------------------------------------------

    darkmode : function() {

        return `

.dg .c select {
    background-color: #222222;
}

.dg .cr.number input[type=text] {
    color : #dddddd;
}

.biswebmnislider {
    background-color : #000000;
}


.bistoggle {
    background-color : rgb(72,72,72);
    float : right;
    border : 2px;
    border-color : rgb(24,24,24);
    border-style : solid;
    color : rgb(255,255,255);
    position : relative;
    font-size : 17px;
    margin-left : 5px;
}

.bisweb-file-dialog {
    color : #0ce3ac;
}

.jstree-node {
    color : #0ce3ac;
}


`;

    },

    
    /**
     * @param {Boolean} darkmode - if true set darkmode
     */
    
    getDarkModeCSSString : function(darkmode) {
        
        let st='';
        
        if (darkmode)
            st=this.commoncss(darkcolors)+this.darkmode();
        else
            st=this.commoncss(brightcolors)+this.brightmode();
        
        return st;
    },


    /**
     * apply css styles in string css
     * @param{String} css - a multiplne css file as a string
     */
    applycss : function(css) {

        if (internal.cssstyle!==null) {
            document.head.removeChild(internal.cssstyle);
        }
        
        let style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.innerHTML = css;
        document.head.appendChild(style);
        internal.cssstyle=style;
    },


    /** set color mode
     * @param{Boolean} d - if true use dark mode (default) , else bright mode
     */
    setDarkMode : function(d=true,force=false) {

        if (internal.cssapplied && !force)
            return;

        //        console.log('.... setting css mode=',d);
        internal.darkmode = d;
        this.applycss(this.getDarkModeCSSString(d));
        internal.cssapplied=true;
    },

    isDark : function() {
        return internal.darkmode;
    },
    
    /** Auto detect color mode based on background color */
    setAutoColorMode : function() {
        
        if (internal.cssapplied) {
            //console.log('.... css already applied');
            return internal.darkmode;
        }
        let style = getComputedStyle(document.body);
        let bg=style['background-color'];
        if (bg.indexOf('255')>0)
            this.setDarkMode(false);
        else
            this.setDarkMode(true);
        return internal.darkmode;            
    },

    /** Toggle color mode  from dark to bright and back*/
    toggleColorMode() {

        let isDark=this.isDark();
        let needbootstrap=false;
        let toremove=null;
        let lst=$('link');

        for (let i=0;i<lst.length;i++) {
            let href=lst[i].href;
            if (href.indexOf('css')>0) {
                if (href.indexOf('bootstrap')>=0) {
                    needbootstrap=true;
                    toremove=lst[i];//.remove();
                }
                if (href.indexOf('bislib')>=0) {
                    toremove=lst[i];//.remove();
                    needbootstrap=false;
                }
            }
        }
        let url="";
        if (needbootstrap) {
            url="../lib/css/bootstrap_dark.css";
            if (isDark) {
                url="../lib/css/bootstrap_bright.css";
            }
        } else {
            url="bislib.css";
            if (isDark) {
                url="bislib_bright.css";
            }
        }

        let newmode=!isDark;
        let apiTag = document.createElement('link');
        apiTag.rel  = 'stylesheet';
        apiTag.type = 'text/css';
        apiTag.href = url;
        
        return new Promise( (resolve,reject) => {
            apiTag.onload = ( () => {
                if (toremove) 
                    toremove.remove();
                this.setDarkMode(newmode,true);
                resolve(internal.darkmode);
            });
            apiTag.onerror=( (e) => {
                console.log("Error ="+e);
                reject(internal.darkmode);
            });
            document.head.appendChild(apiTag);
        });
        
    }
};

module.exports=biswebcss;
