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

/*global window,document,setTimeout,HTMLElement */

"use strict";

const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const moduleIndex = require('moduleindex.js');

const connmatrixModule = moduleIndex.getModule('makeconnmatrixfile');
class CPMElement extends HTMLElement {

    constructor() {
        super();
        this.cpmPanel = null;
    }

    connectedCallback() {
        this.menubarid = this.getAttribute('bis-menubarid');
        this.layoutelementid = this.getAttribute('bis-layoutelementid');
        bis_webutil.runAfterAllLoaded( () => {
            let menubar = document.querySelector(this.menubarid).getMenuBar();
            let layoutElement = document.querySelector(this.layoutelementid);
            let dockbar = layoutElement.elements.dockbarcontent;
            this.createMenubarItems(menubar, dockbar);
        });
    }

    createMenubarItems(menubar, dockbar) {
        let topmenu = bis_webutil.createTopMenuBarMenu('CPM', menubar);
        bis_webutil.createMenuItem(topmenu, 'Open Connectivity File Loader', () => { this.openCPMSidebar(dockbar); });

    }

    openCPMSidebar(dockbar) {
        if (!this.cpmPanel) {
            let panelGroup = bis_webutil.createpanelgroup(dockbar);
            this.cpmPanel = bis_webutil.createCollapseElement(panelGroup, 'Connectivity Files', true);

            let importButton = bis_webfileutil.createFileButton({
                'name' : 'Import CPM File',
                'type' : 'primary',
                'callback' : (f) => {
                    this.importFiles(f);
                }
            }, {
                'title': 'Import connectivity index file',
                'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
                'suffix' : 'json'
            });

            let exportButton = bis_webfileutil.createFileButton({
                'name' : 'Export CPM File',
                'type' : 'warning',
                'callback' : (f) => {
                    this.exportFiles(f);
                }
            }, {
                'title': 'Export connectivity index file',
                'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
                'save' : true,
                'suffix' : 'json'
            });

            this.cpmPanel.append(importButton, exportButton);
        } else {
            console.log('cpm panel parent', this.cpmPanel.parent());
            this.cpmPanel.parent().addClass('in');
        }
    }

    importFiles(f) {

    }
}

bis_webutil.defineElement('bisweb-cpmelement', CPMElement);

