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
const bisweb_popoverhandler = require('bisweb_popoverhandler.js');
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

        bisweb_popoverhandler.addPopoverDismissHandler();
    }

    createMenubarItems(menubar, dockbar) {
        let topmenu = bis_webutil.createTopMenuBarMenu('CPM', menubar);
        bis_webutil.createMenuItem(topmenu, 'Open Connectivity File Loader', () => { this.openCPMSidebar(dockbar); });

    }

    openCPMSidebar(dockbar) {
        if (!this.cpmPanel) {
            let panelGroup = bis_webutil.createpanelgroup(dockbar);
            this.cpmPanel = bis_webutil.createCollapseElement(panelGroup, 'Connectivity Files', true);

            let inputButton = this.createCPMPopoverButton();
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

            this.cpmPanel.append(inputButton, exportButton);
        } else {
            console.log('cpm panel parent', this.cpmPanel.parent());
            this.cpmPanel.parent().addClass('in');
        }
    }

    createCPMPopoverButton() {
        let importFileButton = bis_webfileutil.createFileButton({
            'callback' : (f) => {
                this.importFiles(f);
            }
        }, {
            'title': 'Import connectivity index file',
            'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
            'suffix' : 'json'
        });

        let importDirectoryButton = bis_webfileutil.createFileButton({
            'callback' : (f) => {
                this.importFiles(f);
            }
        }, {
            'mode' : 'directory',
            'title': 'Import connectivity files from directory',
            'filters' : [ { 'name': 'Connectivity data files', 'extensions': ['.tsv', '.csv']}],
        });

        let inputButton = $(`<button type='button' class='btn btn-sm btn-primary' data-toggle='popover' data-placement='left'>Import CPM File</button>`);
        let popoverContent = $(
            `<div>
                <div class='list-group'>
                    <a href='#' class='list-group-item list-group-item-action bisweb-list-group-item' style='font-size: 11pt'>Import from CPM File</a>
                    <a href='#' class='list-group-item list-group-item-action bisweb-list-group-item' style='font-size: 11pt'>Import from directory</a>
                </div>
            </div>`
        );

        $(inputButton).popover({
            'title': 'Select input source',
            'trigger': 'click',
            'html': true,
            'placement': 'left',
            'container': 'body',
            'content': popoverContent
        });

        //workaround to make popover appear on first click
        inputButton.on('click', () => { $(inputButton).popover('toggle'); });

        let popoverFileButton = popoverContent.find('.list-group-item').get(0);
        let popoverDirectoryButton = popoverContent.find('.list-group-item').get(1);

        $(popoverFileButton).on('click', () => { importFileButton.click(); bisweb_popoverhandler.dismissPopover(); });
        $(popoverDirectoryButton).on('click', () => { importDirectoryButton.click(); bisweb_popoverhandler.dismissPopover(); });

        return inputButton;
    }

    importFiles(f) {

    }
}

bis_webutil.defineElement('bisweb-cpmelement', CPMElement);

