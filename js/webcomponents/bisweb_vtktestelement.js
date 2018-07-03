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
    
    
    const BisWebImage = require('bisweb_image');
    const webutil=require('bis_webutil');
    const FastClick=require('fastclick');
    const $=require('jquery'); 	
    const bootbox=require('bootbox');
    const numeric=require('numeric');
    const util=require('bis_util');
    const webfileutil = require('bis_webfileutil');
    const ViewerApplicationElement = require('bisweb_mainviewerapplication');
    /**
     * A Application Level Element that creates a Connectivity Application
     * 
     * @example
     *   <bisweb-connectivityapplication
     *      bis-menubarid="#viewer_menubar"
     *      bis-connectivitycontrolid="#conncontrol"
     *      bis-viewerid="#viewer">
     *   </bisweb-connectivityapplication>
     *
     * Attributes
     *     bis-menubarid : theid a <bisweb-topmenubar> element
     *     bis-connectivitycontrolid : the id of an optional  <bisweb-connectivitycontrolelement>
     *     bis-viewerid : the id of the underlying <bisweb-orthogonalviewer>  element
     */
    class VTKTestElement extends HTMLElement {
    

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

            webutil.createMenuItem(VTKMenu,'View Plane Example',function() { 
                $(location).attr('href', './VTKPlane.html');
            });
            
            // ------------------------------------ Load File Menu ----------------------------
            
            var VTKMenu=webutil.createTopMenuBarMenu("Load Sample",menubar);
            webutil.createMenuItem(VTKMenu,'VTK to VTI Test',function() { 
                readTextFile('./images/test.vti')
            });
            webutil.createMenuItem(VTKMenu,'VTK Head ACII',function() { 
                readTextFile('https://data.kitware.com/api/v1/item/59de9d418d777f31ac641dbe/download')
            });
            webutil.createMenuItem(VTKMenu,'VTK Head Binary',function() { 
                readTextFile('https://data.kitware.com/api/v1/item/59de9dc98d777f31ac641dc1/download')
            });
            webutil.createMenuItem(VTKMenu,'VTK Head Binary Zip',function() { 
                readTextFile('https://data.kitware.com/api/v1/item/59e12e988d777f31ac6455c5/download')
            });

    
            
            // ------------------------------------ Initialize ---------------------------
            
            new FastClick(document.body);   
            
        }
    }
    
    webutil.defineElement('bisweb-vtktest', VTKTestElement);
    
    
    
    