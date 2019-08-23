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
const $ = require('jquery');
const bootbox = require('bootbox');

const bis_genericio = require('bis_genericio.js');
const bis_webutil = require('bis_webutil.js');
const moduleIndex = require('moduleindex.js');
const Scatter = require('bisweb_scatterplot.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bisweb_popoverhandler = require('bisweb_popoverhandler.js');
const BiswebMatrix = require('bisweb_matrix.js');

const connmatrixModule = moduleIndex.getModule('makeconnmatrixfile');

/**
 * 
 * @param {ViewerLayoutElement} layoutwidget 
 */
let cpmGuiManager = function(layoutwidget){
    let dims = [layoutwidget.viewerwidth / 3, layoutwidget.viewerheight / 3];
    let pos = [layoutwidget.viewerwidth * 0.33333333 , 10];

    let plot = new Scatter.scatterplot(layoutwidget, dims, pos);

    $(window).on('resize',()=>{
        let dims = [layoutwidget.viewerwidth / 3, layoutwidget.viewerheight / 3];
        let pos = [layoutwidget.viewerwidth * (1 / 3) , 10];
        plot.resize(dims, pos);
    });
};

class CPMElement extends HTMLElement {

    constructor() {
        super();
        this.connFiles = null;
        this.cpmPanel = null;
        this.fileInputForm = null;
    }

    connectedCallback() {
        this.menubarid = this.getAttribute('bis-menubarid');
        this.layoutelementid = this.getAttribute('bis-layoutelementid');


        bis_webutil.runAfterAllLoaded( () => {
            let menubar = document.querySelector(this.menubarid).getMenuBar();
            let layoutElement = document.querySelector(this.layoutelementid);
            let dockbar = layoutElement.elements.dockbarcontent;

            this.guiManager = cpmGuiManager(layoutElement);

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

            this.fileListFormId = bis_webutil.getuniqueid();
            this.fileListForm = $(`
            <div>
                <label for=${this.fileListFormId}>Select an input</label>
                <div class='form-group'>
                    <select class='form-control' id=${this.fileListFormId}>
                    </select>
                </div>
                <button class='btn btn-success'>View</button>
            </div>
            `);

            let inputButton = this.createCPMPopoverButton();
            let exportButton = bis_webfileutil.createFileButton({
                'name' : 'Export CPM File',
                'type' : 'warning',
                'css' :  { 'visibility' : 'hidden' },
                'callback' : (f) => {
                    this.exportFiles(f);
                }
            }, {
                'title': 'Export connectivity index file',
                'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
                'save' : true,
                'suffix' : 'json'
            });

            let viewButton = this.fileListForm.find('.btn-success');
            viewButton.on('click', () => {
                let formName = $('#' + this.fileListFormId).val();
                console.log('form name', formName);

                //sometimes subject numbers contain a leading zero, e.g. 'sub01' vs 'sub1', so check for both.
                let subNumRegex = /(sub\d+)/g;
                let subjectName = subNumRegex.exec(formName)[1], strippedSubjectName;
                
                //add two to account for the length of sub
                if (subjectName.indexOf('0') === subjectName.indexOf('sub') + 2 + 1) {
                    strippedSubjectName = subjectName.replace(/sub0*/, 'sub');
                }

                let subVals = this.connFiles[subjectName] || this.connFiles[strippedSubjectName];
                let connFileVal = subVals[formName];
                console.log('conn files', this.connFiles, connFileVal);
                bootbox.alert({
                    'title' : 'Connectivity file',
                    'message' : reformatMatrix(formName, connFileVal)
                });
            });

            let buttonGroup = bis_webutil.createbuttonbar();
            $(buttonGroup).append(inputButton, exportButton);
            this.cpmPanel.append(buttonGroup);
        } else {
            console.log('cpm panel parent', this.cpmPanel.parent());
            this.cpmPanel.parent().addClass('in');
        }
    }

    createCPMPopoverButton() {
        let importFileButton = bis_webfileutil.createFileButton({
            'callback' : (f) => {
                if (this.cpmPanel.find('#' + this.fileListFormId).length === 0) { this.cpmPanel.append(this.fileListForm); }
                this.cpmPanel.find('.btn-group').children().css('visibility', 'visible');
                this.importFiles(f);
            }
        }, {
            'title': 'Import connectivity index file',
            'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
            'suffix' : 'json'
        });

        let importDirectoryButton = bis_webfileutil.createFileButton({
            'callback' : (f) => {
                if (this.cpmPanel.find('#' + this.fileListFormId).length === 0) { this.cpmPanel.append(this.fileListForm); }
                this.cpmPanel.find('.btn-group').children().css('visibility', 'visible');
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

        //TODO: Imporve this later
        let extension = f.split('.')[1];

        if (!extension) { //flow for a directory of .csv or .tsv files
            bis_genericio.runCPMModule({ 'indir' : f, 'writeout' : false }).then( (obj) => {
                this.connFiles = this.formatLoadedConnData(obj.output.file);
                this.populateFileElementList(obj.output.filenames);
            });
        } else if (extension.toLowerCase() === 'json') { //flow for connectome index file
            bis_genericio.read(f).then( (obj) => {
                let rawConnFiles;
                try {
                    rawConnFiles = JSON.parse(obj.data);
                } catch(e) {
                    console.log('Encountered an error while parsing', f, e);
                    bis_webutil.createAlert('Encountered an error while parsing ' + f, true);
                }
                
                let flist = [];
                //combine the keys of each subject to get the list of connectivity files
                for (let key of Object.keys(rawConnFiles)) {
                    for (let filenameKey of Object.keys(rawConnFiles[key])) {
                        flist.push(filenameKey);
                    }
                }
                this.populateFileElementList(flist);
                this.connFiles = this.formatLoadedConnData(rawConnFiles);
            });
        } else {
            console.log('Unrecognized extension', extension, 'for cpm file');
            bis_webutil.createAlert('Unrecognized extension ' + extension + ' for cpm file', true);
        } 
    }

    populateFileElementList(fileList) {
        let formSelect = this.fileListForm.find('select');
        formSelect.empty();
        for (let file of fileList) {
            let basename = bis_genericio.getBaseName(file);
            let option = $(`<option value=${basename}>${basename}</file>`);
            formSelect.append(option);
        }
    }

    /**
     * Reformats a raw connectivity file from an object containing strings to an object containing BiswebMatrices.
     * 
     * @param {Object} rawData - Raw connectivity file data loaded from disk.
     * @returns Connectivity file data reformatted as matrices.
     */
    formatLoadedConnData(rawData) {
        for (let key of Object.keys(rawData)) {
            for (let fileKey of Object.keys(rawData[key])) {
                let data = rawData[key][fileKey].trim().split('\n');
                let extension = fileKey.split('.')[1];
                for (let i = 0; i < data.length; i++) {
                    switch (extension) {
                        case 'tsv' : data[i] = data[i].split('\t'); break;
                        case 'csv' : data[i] = data[i].split(','); break;
                        default : console.log('Error: unrecognized extension', extension);
                    }
                }

                let matr = new BiswebMatrix();
                matr.setFromNumericMatrix(data);
                rawData[key][fileKey] = matr;
            }
        }

        return rawData;
    }

    /**
     * Saves the connectivity index file to disk and reformats it to its original file formats (e.g. reverts the internally maintained matrix object to a tab separated string for tsvs)
     * 
     * @param {String} f - Filename for the exported connectivity file. 
     */
    exportFiles(f) {

        if (!this.connFiles) { bis_webutil.createAlert('No connectivity files in memory, cannot save.', false); return; }

        //revert files to original tab or comma separated form
        let exportedObj = {};
        for (let key of Object.keys(this.connFiles)) {
            exportedObj[key] = {};
            for (let fileKey of Object.keys(this.connFiles[key])) {
                exportedObj[key][fileKey] = reformatMatrix(fileKey, this.connFiles[key][fileKey]);
            }
        }

        let stringifiedObj = JSON.stringify(exportedObj, null, 2);
        bis_genericio.write(f, stringifiedObj).then( () => {
            bis_webutil.createAlert('Saved ' + f + ' successfully', false);
        }).catch( (e) => { 
            bis_webutil.createAlert('An error occured while saving ' + f, true); 
            console.log('An error occured', e); 
        });
    }
}

let reformatMatrix = (filename, matrix) => {
    let numericMatr = matrix.getNumericMatrix(), extension = filename.split('.')[1];
    
    let reformattedEntry = [];
    for (let i = 0; i < numericMatr.length; i++) {
        switch (extension) {
            case 'tsv': reformattedEntry.push(numericMatr[i].join('\t')); break;
            case 'csv': reformattedEntry.push(numericMatr[i].join(',')); break;
            default: console.log('Error: unrecognized extension', extension);
        }
    }

    return reformattedEntry.join('\n');
};

bis_webutil.defineElement('bisweb-cpmelement', CPMElement);

