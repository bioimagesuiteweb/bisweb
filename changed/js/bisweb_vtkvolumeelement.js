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

    /*global document,HTMLElement */
    
    const webutil=require('bis_webutil');
    const FastClick=require('fastclick');
    const $=require('jquery'); 	
    let load=require("vtkModule.js").load;

    /**
     * A Application Level Element that creates a Connectivity Application
     * 
     * @example
     *   <bisweb-vtkvolume
     *      bis-menubarid="#viewer_menubar">
     *   </bisweb-vtkvolume>
     *
     * Attributes
     *     bis-menubarid : theid a <bisweb-topmenubar> element
     */
    class VTKVolumeElement extends HTMLElement {
    

        connectedCallback() {

            // --------------------------------------------------------------------------------
            // Main Application
            // --------------------------------------------------------------------------------
            
            const menubarid=this.getAttribute('bis-menubarid');
            let menubar=document.querySelector(menubarid).getMenuBar();
            
            
            // ------------------------------------ VTK Menu ----------------------------
            
            var VTKMenu=webutil.createTopMenuBarMenu("VTK",menubar);
            webutil.createMenuItem(VTKMenu,'View Volume Example',function() { 
                $(location).attr('href', './VTKVolume.html');
            });

            // webutil.createMenuItem(VTKMenu,'View Plane Example',function() { 
            //     $(location).attr('href', './VTKPlane.html');
            // });
            
            // ------------------------------------ Load File Menu ----------------------------
            
            webutil.createMenuItem(VTKMenu,'VTK Create Image',function() { 
                load();
            });
    
            
            // ------------------------------------ Initialize ---------------------------
            
            new FastClick(document.body);   
            
        }
    }
    
    webutil.defineElement('bisweb-vtkvolume', VTKVolumeElement);
    
    
    
    