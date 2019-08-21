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
const dat = require('bisweb_datgui');

const libbiswasm = require('libbiswasm_wrapper');
const bis_genericio = require('bis_genericio.js');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bisweb_popoverhandler = require('bisweb_popoverhandler.js');
const BiswebMatrix = require('bisweb_matrix.js');

class CPMElement extends HTMLElement {

    constructor() {
        super();
        this.connFiles = null;
        this.cpmDisplayPanel = null;
        this.cpmComputationPanel = null;
        this.fileInputForm = null;
        this.settingsModal = null;
    }

    connectedCallback() {
        this.menubarid = this.getAttribute('bis-menubarid');
        this.layoutelementid = this.getAttribute('bis-layoutelementid');
        this.initializeWasm = libbiswasm.initialize();

        bis_webutil.runAfterAllLoaded( () => {
            let menubar = document.querySelector(this.menubarid).getMenuBar();
            let layoutElement = document.querySelector(this.layoutelementid);
            let dockbar = layoutElement.elements.dockbarcontent;
            this.createMenubarItems(menubar, dockbar);
            this.openCPMSidebar(dockbar);
            //this.openComputationPanel = this.openCPMComputationPanel.bind(this, dockbar);
        });

        bisweb_popoverhandler.addPopoverDismissHandler();
    }

    createMenubarItems(menubar, dockbar) {
        let topmenu = bis_webutil.createTopMenuBarMenu('CPM', menubar);
        bis_webutil.createMenuItem(topmenu, 'Open Connectivity File Loader', () => { this.openCPMSidebar(dockbar); });

    }

    openCPMSidebar(dockbar) {
        if (!this.cpmDisplayPanel) {
            let panelGroup = bis_webutil.createpanelgroup(dockbar);
            this.cpmDisplayPanel = bis_webutil.createCollapseElement(panelGroup, 'Connectivity Files', true);

            this.fileListFormId = bis_webutil.getuniqueid();
            this.fileListForm = $(`
            <div>
                <label for=${this.fileListFormId}>Select an input</label>
                <div class='form-group'>
                    <select class='form-control' id=${this.fileListFormId}>
                    </select>
                </div>
                <div class='btn-group' role='group'>
                    <button class='btn btn-sm btn-info'>View</button>
                    <button class='btn btn-sm btn-success'>Run CPM</button>
                    <button class='btn btn-sm btn-primary'><span class='glyphicon glyphicon-cog'></span></button>
                </div>
            </div>
            `);

            let buttonGroup = bis_webutil.createbuttonbar();
            let inputButton = this.createCPMPopoverButton();
            let exportButton = bis_webfileutil.createFileButton({
                'name' : 'Export CPM File',
                'type' : 'warning',
                'css' :  { 'visibility' : 'hidden' },
                'callback' : (f) => {
                    bis_webutil.createAlert('Saving connectivity index file to ' + f + '...', false, 0, 0, { 'makeLoadSpinner' : true });
                    this.exportFiles(f).then( () => {
                        bis_webutil.createAlert('Saved ' + f + ' successfully', false);
                    }).catch( (e) => {
                        console.log('Error saving CPM file', e);
                        bis_webutil.createAlert('An error occured while saving ' + f, true);
                    });
                }
            }, {
                'title': 'Export connectivity index file',
                'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
                'save' : true,
                'suffix' : 'json'
            });

            this.createFormButtons(buttonGroup, inputButton, exportButton);
            buttonGroup.append(inputButton, exportButton);
            this.cpmDisplayPanel.append(buttonGroup);
        } else {
            this.cpmDisplayPanel.parent().addClass('in');
        }
    }

    createFormButtons(fileButtonGroup, inputButton, exportButton) {
        let listButtonGroup = $(this.fileListForm).find('.btn-group');
        let viewButton = listButtonGroup.find('.btn-info');
        let runButton = listButtonGroup.find('.btn-success');
        let settingsButton = listButtonGroup.find('.btn-primary');

        viewButton.on('click', () => {
            let formName = $('#' + this.fileListFormId).val();

            //sometimes subject numbers contain a leading zero, e.g. 'sub01' vs 'sub1', so check for both.
            let subNumRegex = /(sub\d+)/g;
            let subjectName = subNumRegex.exec(formName)[1], strippedSubjectName;
            
            //add two to account for the length of sub
            if (subjectName.indexOf('0') === subjectName.indexOf('sub') + 2 + 1) {
                strippedSubjectName = subjectName.replace(/sub0*/, 'sub');
            }

            let subVals = this.connFiles[subjectName] || this.connFiles[strippedSubjectName];
            let connFileVal = subVals[formName];

            //if bigger than 10kB, ask whether user is sure they want to display it
            if (getMatrixSize(connFileVal) > 1024 * 10) {
                bootbox.confirm({
                    'title' : 'Show selected file?',
                    'message' : 'The selected file is greater than 10kB. Are you sure you want to display the full file?',
                    'callback' : (accept) => {
                        if (accept) {
                            showConnFile();
                        }
                    }
                });
            } else {
                showConnFile();
            }


            $(fileButtonGroup).append(inputButton, exportButton);
            function showConnFile() {
                bootbox.alert({
                    'title' : 'Connectivity file',
                    'message' : $(`<pre>${reformatMatrix(formName, connFileVal)}</pre>`)
                });
            }
        });

        runButton.on('click', () => {
            let formVal = this.fileListForm.find('.form-control').val();

            //create secondary list for cpm files for the given subject if behavior is specified
            if (formVal.includes('behavior')) {
                let formOptions = this.fileListForm.find('option'), valsList = [];
                for (let option of formOptions) {
                    console.log('option', option, option.value);
                    valsList.push(option.value);
                }

                if (valsList.length === 1) {
                    runCPM()
                }
            }
        });

        settingsButton.on('click', () => { this.openSettingsModal(); });

        function runCPM(cpmFile, behaviorFile) {
            this.initializeWasm().then( () => {
                libbiswasm.computeCPMWasm(cpmFile, behaviorFile, { 'numnodes' : 3, 'numtasks' : 0 }, 0);
            });
        }
    }

    //TODO: Implement a separate computation panel if there turn out to be a lot of connectivity processes to run
    /*openCPMComputationPanel(dockbar) {
        let panelGroup = bis_webutil.createpanelgroup(dockbar);
        this.cpmComputationPanel = bis_webutil.createCollapseElement(panelGroup, 'CPM Computation', true);

        let runCPMButton = bis_webutil.createbutton({ 'name' : 'Run CPM', 'type' : 'success'});


        let panelContent = $(`
            <div>

            </div>
        `);
    }*/

    createCPMPopoverButton() {

        //Unattached buttons that are clicked when one of the popover buttons is clicked
        let importFileCallback = (f) => {
            bis_webutil.createAlert('Loading from ' + f, false, 0, 0, {'makeLoadSpinner' : true });
            this.importFiles(f).then( () => {
                bis_webutil.dismissAlerts();
                bis_webutil.createAlert('' + f + ' loaded successfully.', false, 0, 3000);
                if (this.cpmDisplayPanel.find('#' + this.fileListFormId).length === 0) { this.cpmDisplayPanel.append(this.fileListForm); }
                this.cpmDisplayPanel.find('.btn-group').children().css('visibility', 'visible');
            });
        };

        let importFileButton = bis_webfileutil.createFileButton({
            'callback' : importFileCallback
        }, {
            'title': 'Import connectivity index file',
            'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
            'suffix' : 'json'
        });

        let importDirectoryButton = bis_webfileutil.createFileButton({
            'callback' : importFileCallback
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

    /**
     * Opens a modal for the user to change the settings of the CPM computation.
     */
    openSettingsModal() {
        if (!this.settingsModal) {
            let settingsModal = bis_webutil.createmodal('CPM Settings', 'modal-sm');
            let settingsObj = {
                'threshold' : 0.01,
                'kfold' : '3',
                'numtasks' : '0',
                'numnodes' : '3',
                'lambda' : 0.001
            };

            let listObj = {
                'kfold' : ['3', '4', '5', '6', '8', '10'],
                'numtasks' : ['0', '1', '2', '3'],
                'numnodes' : ['3', '268'],
            }

            let container = new dat.GUI({ 'autoPlace' : false });
            container.add(settingsObj, 'threshold', 0, 1);
            container.add(settingsObj, 'kfold', listObj.kfold);
            container.add(settingsObj, 'numtasks', listObj.numtasks);
            container.add(settingsObj, 'numnodes', listObj.numnodes),
            container.add(settingsObj, 'lambda', 0.0001, 0.01);

            settingsModal.body.append(container.domElement);
            $(container.domElement).find('.close-button').remove();

            this.settingsModal = settingsModal;
        }

        this.settingsModal.dialog.modal('show');
    }

    /**
     * Imports .csv files from a CPM matrix file or directory. 
     * 
     * @param {String} f - Filename of the directory or JSON file to load from. 
     * @returns A Promise resolving once the files have been loaded and the form select populated, or rejecting with an error. 
     */
    importFiles(f) {
        return new Promise( (resolve, reject) => {
            let extension = f.split('.')[1];
            if (!extension) { //flow for a directory of .csv or .tsv files
                bis_genericio.runCPMMatrixFileModule({ 'indir': f, 'writeout': false }).then((obj) => {
                    let fileList = this.formatLoadedConnData(obj.output);
                    this.populateFileElementList(fileList);
                    resolve();
                }).catch( (e) => { reject(e); });
            } else if (extension.toLowerCase() === 'json') { //flow for connectome index file
                bis_genericio.read(f).then((obj) => {
                    let rawConnFiles;
                    try {
                        rawConnFiles = JSON.parse(obj.data);
                    } catch (e) {
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

                    let fileList = this.formatLoadedConnData(rawConnFiles);
                    this.populateFileElementList(fileList);
                    resolve();
                }).catch( (e) => { reject(e); });
            } else {
                console.log('Unrecognized extension', extension, 'for cpm file');
                bis_webutil.createAlert('Unrecognized extension ' + extension + ' for cpm file', true);
                reject('Unrecognized extension ' + extension);
            }
        });
        
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
     * Reformats a raw connectivity file from an object containing strings to an object containing BiswebMatrices and assigns this.connFiles to be the parsed data.
     * 
     * @param {Object} rawData - Raw connectivity file data loaded from disk.
     * @returns Array containing all the filenames loaded from disk.
     */
    formatLoadedConnData(rawData) {
        let fileNames = [], formattedData = rawData;
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
                formattedData[key][fileKey] = matr;

                fileNames.push(fileKey);
            }
        }

        this.connFiles = formattedData;
        return fileNames;
    }

    /**
     * Saves the connectivity index file to disk and reformats it to its original file formats (e.g. reverts the internally maintained matrix object to a tab separated string for tsvs)
     * 
     * @param {String} f - Filename for the exported connectivity file. 
     */
    exportFiles(f) {

        return new Promise( (resolve, reject) => {
            if (!this.connFiles) { bis_webutil.createAlert('No connectivity files in memory, cannot save.', false); reject('No conn files'); }

            //revert files to original tab or comma separated form
            let exportedObj = {};
            for (let key of Object.keys(this.connFiles)) {
                exportedObj[key] = {};
                for (let fileKey of Object.keys(this.connFiles[key])) {
                    exportedObj[key][fileKey] = reformatMatrix(fileKey, this.connFiles[key][fileKey]);
                }
            }

            let stringifiedObj = JSON.stringify(exportedObj, null, 2);
            bis_genericio.write(f, stringifiedObj).then(() => {
                resolve();
            }).catch((e) => {
                console.log('An error occured', e);
                reject(e);
            });
        });
    }

    
    /*runCPMModule(matrix, behaviors) {

    }*/
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

let getMatrixSize = (matrix) => {
    return matrix.data.BYTES_PER_ELEMENT * matrix.data.length;
};

bis_webutil.defineElement('bisweb-cpmelement', CPMElement);

