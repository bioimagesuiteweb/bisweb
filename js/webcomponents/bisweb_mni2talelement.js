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

const template_css=`
<style>
#viewer {
  position: relative;
  top: 0.0vh;
  width: 86.4vh;
  min-width: 86.4vh;
  height: 88vh;
  min-height: 88vh;
  margin: 2px;
  background-color: #000000;
}

#xviewer,#yviewer,#zviewer {
  position: absolute;
  z-index:1;
}

#tempviewer {
  position: absolute;
  z-index:4;
  top:5vh;
  left:12.5vh;
  font-size: 16vh;
  width:50vh;
  line-height: 18vh;
  text-align: center;
}

#xlines,#ylines,#zlines {
  position: absolute;
  z-index:3;
}


#xcontrols,#ycontrols,#zcontrols {
  position: absolute;
  z-index:2;
  width: 32.9vh;
}

#xcontrols {
  left:41.6vh;
  top:0vh;
  width:40.0vh;
}

#ycontrols {
  left:2.5vh;
  top:0.0vh;
}

#ylines, #yviewer {
  top: 3vh;
  left: 1vh;
  width:35.9vh;
  height: 35.9vh;
}

#xlines, #xviewer {
  top:3vh;
  left: 40.1vh;
  width:43.0vh;
  height:35.9vh;
}

#zcontrols {
  left:2.5vh;
  top:84.0vh;
}

#zlines, #zviewer {
  left: 1.0vh;
  top: 40.4vh;
  width: 35.9vh;
  height: 43.0vh;
}

#mniframe, #talframe, #overlayframe,  #baframe, #aboutframe,#navframe {
  z-index:1;
  left: 39.5vh;
  width: 43.5vh;
  position: absolute;
  height: 5vh;
}

#overlayframe {
  top: 40.5vh;
}

#navframe {
  top: 44.5vh;
  left: 40.0vh;
  width: 45.1vh;
  height:16.5vh;
  
}

#mniframe {
   top: 46vh;
 }

#talframe {
  top: 51vh;
}
  
#baframe {
  top: 56vh;
    
  
}

#aboutframe {
  font-size: 90%;
  top: 61.0vh;
  height: 27vh;
}

#sumlabel {
}

.labelid, .labelid2 {
  padding-top: 0.75vh;
  float: left;
  position: relative;
}

.labelid2 {
  left: 8.5vh;
}

#mnilabel,#talabel,#balabel {
  width: 8.5vh;
}

.numberid {
  padding-top: 0vh;
  padding-left: 0vh;
  padding-right: 0.2vh;
  vertical-align: text-bottom;
  position: relative;
  font-size: 100%;
  width: 7.5vh;
  background-color: #000000;
  color: #ffffff;
}

.buttonid {
   float:right;
   padding-right:0.5vh;
   font-size: 100%;
   vertical-align: text-top;
   display: inline-block;
   position: relative;  
   width: 8vh;
   background-color : #444444;
   color : #ffffff;
}

#baselectbox {
  font-size:100%;
  width: 25.5vh;
    background-color: #000000;
    color : #ffffff;
}
</style>`;

const template_text=`

      ${template_css}

      <div id="viewer">
	<div id="tempviewer"> Loading Data</div>
	<canvas id="xviewer"></canvas>
	<canvas id="yviewer"></canvas>
	<canvas id="zviewer"></canvas>
	<canvas id="xlines"></canvas>
	<canvas id="ylines"></canvas>
	<canvas id="zlines"></canvas>
        
	<input type="range" id="xcontrols" min="0" max="180"></input>
	<input type="range" id="ycontrols" min="0" max="216"></input>
	<input type="range" id="zcontrols" min="0" max="180"></input>
        
	<div id="navframe"></div>
	<div id="mniframe">
          <label class="labelid" id="mnilabel">MNI:</label>
          <input type="number" class="numberid" id="mnix" value="0" min="-90" max="90" step="1">
          <input type="number" class="numberid" id="mniy" value="0" min="-90" max="90" step="1">
          <input type="number" class="numberid" id="mniz" value="0" min="-72" max="108" step="1">
          <button type="button" class="buttonid" id="mnigo">Go</button>
	</div>
        
	<div id="talframe">
          <label  class="labelid" id="talabel">TAL:</label>
          <input type="number" class="numberid" id="talx" value="0" min="-90" max="90" step="1">
          <input type="number" class="numberid" id="taly" value="0" min="-90" max="126" step="1">
          <input type="number" class="numberid" id="talz" value="0" min="-72" max="108" step="1">
          <button type="button" class="buttonid" id="talgo">Go</button>
	</div>
        
	<div id="overlayframe">
          <div id="showlabel" class="labelid2">
            <input type="checkbox" id="showoverlaybutton" value=false>
            <label>Show Brodmann areas overlay</label></div>
	</div>
	
	<div id="baframe">
          <div class="labelid"  id="balabel">Area:</div>
          <select  id="baselectbox"></select>
          <button type="button" class="buttonid" id="resetbutton">Reset</button>
          
	</div>
        
	<div id="aboutframe">
          
	  <details id="detailsframe"><summary id="sumlabel"><B>About this application</B></summary>
            <p>This application consists of components of the 
              <a href="http://www.bioimagesuite.org" target="_newwindow">Yale BioImage Suite Package</a>. The MNI to Talairach mapping is from 
              <a href="http://www.ncbi.nlm.nih.gov/pmc/articles/PMC2603575/" target="_newwindow">Lacadie et al. NeuroImage 2008</a>.
              The Brodmann area definitions are from the following abstract: C.M. Lacadie, R. K. Fulbright, J. Arora, 
              R.T.Constable, and X. Papademetris. <EM>Brodmann Areas defined in MNI space using a new Tracing Tool in BioImage Suite</EM>.
              Human Brain Mapping, 2008.
	      
            <p>This application works best in <a href="http://www.google.com/chrome" target="_newwindow">Chrome</a> or Safari. 
              (c) Xenios Papademetris, Yale University, 2014-7. </details>
          
	</div>
</div>`;

   
    // ---------- Actual JS Code -----------------------
    
    class Mni2TalElement extends HTMLElement {


	constructor() {
	    super();
	    this.viewer=null;
	    this.shadow=null;
	}
	
	// Fires when an instance was inserted into the document.
	connectedCallback() {
	    this.shadow=this.attachShadow( { mode: 'open'});
	    this.shadow.innerHTML=template_text;
	    this.viewer=new bisweb_mni2talbase.OrthoViewer(this.shadow);
	    this.viewer.initialize();
	    $('body').css({'background' : '#000000' ,
			   'padding-left' : '100px' });



	    let rs=function() {
		let width=window.innerWidth;
		let height=window.innerHeight;

		let wd=0.87*height;
		let pad=0;
		if (width>wd) {
		    pad=Math.round(0.5*(width-wd));
		    wd=width;
		} 

		$('body').css({
		    'padding-left' : `${pad}px`,
		    'min-width' : `${wd}px`,
		});
	    };
		
	    window.addEventListener( 'resize', rs);
	    rs();
	    
	}

	
	
	
	getviewer() { return this.viewer;}
    }

    // register element
    
webutil.defineElement('bisweb-mni2tal', Mni2TalElement);
