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

/** 
 * @file Browser ONLY Orthogonal Viewer/Editor main application
 * @author Xenios Papademetris
 * @version 1.0
 */



/*global window, document,HTMLElement */

"use strict";


const bisweb_image = require('bisweb_image');
const webutil=require('bis_webutil');
const FastClick=require('fastclick');
const $=require('jquery');      
const ViewerApplicationElement = require('bisweb_mainviewerapplication');
const userPreferences = require('bisweb_userpreferences.js');
const bisgenericio=require('bis_genericio');
const fs=bisgenericio.getfsmodule();
const path=bisgenericio.getpathmodule();
const internalmode = require('bisextra').hasinternal;

/**
 * A Application Level Element that creates a Paravision Import Application (electron only)
 * 
 * @example
 *   <bisweb-paravisionapplication
 *    bis-menubarid="#viewer_menubar"
 *    bis-paravisionimportid="#connimport"
 *    bis-viewerid="#viewer">
 *   </bisweb-paravisionapplication>
 
 *
 * Attributes
 *     bis-menubarid : theid a <bisweb-topmenubar> element
 *     bis-paravisionimportid : the id of an optional <bisweb-paravisionimportelement> element
 *     bis-viewerid : the id of the underlying <bisweb-orthogonalviewer>  element
 *     bis-modulemanagerid : the id of an optional <bisweb-modulemanager> element that manages processing modules
 */
class ParavisionApplicationElement extends ViewerApplicationElement {
    
    connectedCallback() {

        const self=this;
        
        const menubarid=this.getAttribute('bis-menubarid');
        const importid=this.getAttribute('bis-paravisionimportid');
        const managerid = this.getAttribute('bis-modulemanagerid') || null;

        let modulemanager=null;
        if (managerid!==null)
            modulemanager=document.querySelector(managerid);

        let misactool=null;
        if (internalmode) {
            misactool=document.createElement('bisweb-misactool');
            let algoid=this.getAttribute('bis-algorithmcontrollerid');
            misactool.setAttribute('bis-algorithmcontrollerid','#'+algoid);
            document.body.appendChild(misactool);
        } else {
            console.log('The misac tool only exists in internal mode');
        }

        const PARATOOL=document.querySelector(importid);
        this.findViewers();
        this.VIEWERS[0].finalizeTools();

        let userPreferencesLoaded = userPreferences.webLoadUserPreferences();
        userPreferencesLoaded.then(() => {
            userPreferences.saveUserPreferences();
        });
        
        
        let menubar=document.querySelector(menubarid).getMenuBar();

        this.createApplicationMenu(menubar);
        let editmenu=this.createEditMenu(menubar);
        this.createDisplayMenu(menubar,null);
        this.createFileAndOverlayMenus(menubar,null);
        
        if (modulemanager!==null) 
            modulemanager.initializeElements(menubar,self.VIEWERS,editmenu);

        if (misactool)
            misactool.addtomenubar(menubar);


        // ----------------------------------------------------------
        // Console
        // ----------------------------------------------------------
        this.createHelpMenu(menubar,userPreferencesLoaded);

        // ----------------------------------------------------------

        new FastClick(document.body);
        
        
        let HandleFiles = function(files) {
            let f=files[0].path || null;
            if (f===null)
                return;

            if (f.length<2)
                return;
            
            let ext=f.split('.').pop();
            if (ext=="json") {
                PARATOOL.importjob(f);
            } else if (ext==="gz") {
                loadimage(f,false);
            } else if (fs.lstatSync(f).isDirectory()) {
                PARATOOL.importfiles(f);
            } else if ( path.basename(f)==="2dseq") {
                PARATOOL.importfiles(f);
            } else {
                webutil.createAlert("Can not process file "+f,true);
            }
        };
        webutil.createDragAndCropController(HandleFiles);

        if (this.num_independent_viewers > 1)
            self.VIEWERS[1].setDualViewerMode(0.5);

        
    }
}

webutil.defineElement('bisweb-paravisionapplication', ParavisionApplicationElement);



