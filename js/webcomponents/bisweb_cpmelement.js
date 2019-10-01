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
const $ = require('jquery');
const bootbox = require('bootbox');
const dat = require('bisweb_datgui');

const libbiswasm = require('libbiswasm_wrapper');
const bis_genericio = require('bis_genericio.js');
const bis_webutil = require('bis_webutil.js');
const bis_bidsutils = require('bis_bidsutils.js');
// const moduleIndex = require('moduleindex.js');

const bis_webfileutil = require('bis_webfileutil.js');
const bisweb_connectivityvis = require('bisweb_connectivityvis.js');
const bisweb_popoverhandler = require('bisweb_popoverhandler.js');
const bisweb_scatterplot = require('bisweb_scatterplot.js');

const bis_dbase = require('bisweb_dbase');
const bisweb_userprefs = require('bisweb_userpreferences.js');
const bisweb_serverutils = require('bisweb_serverutils.js');
const BiswebMatrix = require('bisweb_matrix.js');

//const connmatrixModule = moduleIndex.getModule('makeconnmatrixfile');

class CPMElement extends HTMLElement {

    constructor() {
        super();
        this.connFiles = null;
        this.cpmDisplayPanel = null;
        this.cpmComputationPanel = null;
        this.fileInputForm = null;
        this.madeSettingsMenu = false;
        this.madeCPMButtons = false;

        bisweb_connectivityvis.initialize();

        bisweb_userprefs.initialize(bis_dbase).then( () => {
            bis_dbase.getItem('showCPMExportWarning').then( (obj) => {
                this.showExportWarning  = (obj === null || obj === true) ?  true : false;
            });

            bis_dbase.getItem('showMatrixConcatWarning').then( (obj) => {
                this.showMatrixConcatWarning = (obj === null || obj === true) ? true : false;
            });

            bis_webfileutil.initializeFromUserPrefs();
        }); 

        //default settings for CPM
        this.settings = {
            'filename' : '',
            'threshold' : 0.01,
            'kfold' : '3',
            'numtasks' : '0',
            'numnodes' : '268',
            'lambda' : 0.001
        };
    }

    connectedCallback() {
        this.menubarid = this.getAttribute('bis-menubarid');
        this.layoutelementid = this.getAttribute('bis-layoutelementid');
        this.cardbarid = this.getAttribute('bis-cardbarid');
        this.initializeWasm = libbiswasm.initialize();

        bis_webutil.runAfterAllLoaded( () => {
            this.layoutElement = document.querySelector(this.layoutelementid);
            let menubar = document.querySelector(this.menubarid).getMenuBar();
            let cardbar = document.querySelector(this.cardbarid);
            let dockbar = this.layoutElement.elements.dockbarcontent;

            cardbar.createTab('Scatter plot', $(), { 'save' : true }).then( (scatterobj) => {
                this.createCPMGUIManager(scatterobj.content[0]);

                //resizing function for card bar pane
                cardbar.setResizingFunction( () => {
                    scatterobj.content.width(this.layoutElement.viewerwidth / 3 + 20); //add a little bit to the width to accomodate buttons on the right
                    scatterobj.content.height(this.layoutElement.viewerheight / 2);
                });
            });

            this.createMenubarItems(menubar, dockbar);
            this.createCPMPanel(dockbar);
        });

        bisweb_popoverhandler.addPopoverDismissHandler();
    }

    /**
     * Creates the scatter plot and relevant event listeners to display it.
     * 
     * @param {ViewerLayoutElement} layoutElement - The canvas associated with displaying graphics and charts. 
     * @param {HTMLElement} scatterElement - The DOM element to append the scatter plot to.
     * @param {HTMLElement} histoElement - The DOM element to append the histogram plot to.
     */
    createCPMGUIManager(scatterElement) {
        let dims = [this.layoutElement.viewerwidth / 3, this.layoutElement.viewerheight / 2];
        let pos = [0 , this.layoutElement.viewerheight - 10];

        let scatterplot = new bisweb_scatterplot(scatterElement, dims, pos);

        //resizing function for charts
        $(window).on('resize', () => {
            dims = [this.layoutElement.viewerwidth / 3 , this.layoutElement.viewerheight / 2];
            pos = [0 , this.layoutElement.viewerheight - 10];
            scatterplot.resize(dims, pos);
        });
    }

    
    importFileCallback (f)  {
        bis_webutil.createAlert('Loading from ' + f, false, 0, 0, {'makeLoadSpinner' : true });
        this.importFiles(f).then( (filenames) => {
            bis_webutil.dismissAlerts();
            bis_webutil.createAlert('' + f + ' loaded successfully.', false, 0, 3000);
            this.cpmDisplayPanel.find('.btn-group').children().css('visibility', 'visible');
            
            $(this.importButton).remove();
            this.updateSettingsMenu(filenames); 
            if (!this.madeCPMButtons) { this.createCPMButtons(); }
        });
    }

    
    /**
     * Creates the Connectivity Files panel and adds the CPM menubar item to the top of the page. 
     * 
     * @param {JQuery} menubar - The top menubar of the BioImage Suite page.
     * @param {JQuery} dockbar - The right panel on the BioImage Suite page.
     */
    createMenubarItems(menubar) {

        let topmenu = bis_webutil.createTopMenuBarMenu('File', menubar);
        let importFileCallback = (f) => { this.importFileCallback(f);};  

        let importFileItem = bis_webfileutil.createFileButton({
            'callback' : importFileCallback
        }, {
            'title': 'Import connectivity index file',
            'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
            'suffix' : 'json'
        });
        let importDirectoryItem = bis_webfileutil.createFileButton({
            'callback' : importFileCallback
        }, {
            'mode' : 'directory',
            'title': 'Import connectivity files from directory',
            'filters' : [ { 'name': 'Connectivity data files', 'extensions': ['.tsv', '.csv']}],
        });
        let exportFileItem = bis_webfileutil.createFileButton({
            'callback' : this.exportCPMFile.bind(this)
        }, {
            'save' : true,
            'title' : 'Export connectivity file',
            'filters' : [ {'name': 'Connectivity save files', 'extensions' : ['.json'] } ]
        });

        bis_webutil.createMenuItem(topmenu, 'Import From CPM File', () => {  importFileItem.click(); });
        bis_webutil.createMenuItem(topmenu, 'Import From Directory', () => {  importDirectoryItem.click(); });
        bis_webutil.createMenuItem(topmenu, '');
        bis_webutil.createMenuItem(topmenu, 'Export to CPM File', () => { exportFileItem.click(); });
        bis_webutil.createMenuItem(topmenu, '');

        if (bis_webutil.inElectronApp()) {
            bis_webutil.createMenuItem(topmenu, ''); // separator
            bis_webutil.createMenuItem(topmenu, 'Show JavaScript Console',
                                       function () {
                                           window.BISELECTRON.remote.getCurrentWindow().toggleDevTools();
                                       });
        } else {
            bis_webfileutil.createFileSourceSelector(topmenu);
        }
    }


    /**
     * Creates the CPM panel in its initial state in the dockbar. 
     * 
     * @param {JQuery} dockbar - The right panel on the BioImageSuite page.  
     */
    createCPMPanel(dockbar) {
        if (!this.cpmDisplayPanel) {
            let panelGroup = bis_webutil.createpanelgroup(dockbar);
            this.cpmDisplayPanel = bis_webutil.createCollapseElement(panelGroup, 'Calculate CPM', true, true);

            let helpButton = this.cpmDisplayPanel.parent().parent().find('.bisweb-span-button');
            this.setHelpText(helpButton);

            this.fileListForm = $(`
            <div>
                <div class='btn-group' role='group'>
                    <button class='btn btn-sm btn-info'>View</button>
                    <button class='btn btn-sm btn-success'>Run CPM</button>
                </div>
            </div>
            `);

            this.importButton = this.createCPMPopoverButton();
            this.cpmDisplayPanel.append(this.importButton);
        }
    }

    /**
     * Creates the button associated with the form in the connectivity file panel. 
     */
    createCPMButtons() {
        let buttonGroup = $(`
            <div>
                <div class='btn-group' role='group'>
                    <button class='btn btn-sm btn-info'>View</button>
                    <button class='btn btn-sm btn-success'>Run CPM</button>
                </div>
            </div>
            `);

        let viewButton = buttonGroup.find('.btn-info');
        let runButton = buttonGroup.find('.btn-success');


        viewButton.on('click', () => {
            this.createViewDialog();
        });

        runButton.on('click', () => {
            this.runCPMFlow().then((results) => {
                let message = '', data = results.data;
                for (let item of data) { message = message.concat(`${item}<br>`); }

                bootbox.dialog({
                    'title': 'CPM Results',
                    'message': `<pre>${message}</pre>`,
                    'buttons': {
                        'save': {
                            'label': 'Save results',
                            'className': 'btn-warning',
                            'callback': () => {

                                //create a file button then click it to mimic the button in the modal being the file button
                                let fileBtn = bis_webfileutil.createFileButton({
                                    'callback': (name) => {
                                        //TODO: bypassing bisweb_matrix save method because of some strangeness with how it handles files (method signature requiring an object causes it to bypass the server client save function)
                                        results.filename = name;
                                        let serializedMat = results.serializeToText({ 'name': name });
                                        bis_genericio.write(name, serializedMat);
                                    }
                                }, {
                                    'title': 'Save CPM results file',
                                    'filters': [{ 'name': 'Matrix files', 'extensions': ['.matr', '.biswebmatr'] }],
                                    'save': true,
                                    'initialCallback': () => { return 'cpmresults.matr'; }
                                });

                                fileBtn.click();
                            }
                        },
                        'cancel': {
                            'label': 'Ok',
                            'className': 'btn-primary'
                        }
                    }
                });
            }).catch((e) => {
                bis_webutil.createAlert('Could not run CPM code. Check your settings and ensure that they are valid for your dataset (more details are in the web console).', true);
                console.log('An error occured while running CPM code', e);
            });
        });

        this.cpmDisplayPanel.append(buttonGroup);
        this.madeCPMButtons = true;
    }

    createViewDialog() {
        const self = this;
        let formName = $('#' + this.fileListFormId).val();

        //sometimes subject numbers contain a leading zero, e.g. 'sub01' vs 'sub1', so check for both.
        let subNumRegex = /^([^\d]*)(\d+)/g;
        let match = subNumRegex.exec(formName);

        console.log('form name', formName, 'match', match);
        let fullName = match[0], subjectName = match[1], subjectNum = match[2], strippedSubjectName;

        if (subjectNum === '') { console.log('Error: No subject number associated with', formName, ', please ensure that your subjects are properly identified.'); return; }
        strippedSubjectName = subjectName + bis_bidsutils.stripLeadingZeroes(subjectNum);

        let subVals = this.connFiles[fullName] || this.connFiles[strippedSubjectName];
        let connFileVal = subVals[formName];

        //if bigger than 10kB, ask whether user is sure they want to display it
        if (getMatrixSize(connFileVal) > 1024 * 10) {
            let dimensions = [100, 100];
            bootbox.dialog({
                'title' : 'Show selected file?',
                'message' : 'The selected file is greater than 10kB, only the top 100 rows and cols will be shown.',
                'onEscape' : true,
                'buttons' : {
                    'confirm' : {
                        'label' : 'Ok',
                        'className' : 'btn-success',
                        'callback' : () => { showConnFile(dimensions); }
                    },
                    'noshow' : {
                        'label' : "Ok, don't show again",
                        'className' : 'btn-primary',
                        'callback' : () => { 
                            this.showMatrixConcatWarning = false;
                            bisweb_userprefs.setItem('showMatrixConcatWarning', false, true);
                            showConnFile(dimensions); 
                        }
                    }
                }
            });
        } else {
            showConnFile();
        }

        function showConnFile(dimensions = ['all', 'all']) {
            let lh = self.layoutElement.getviewerheight() * 0.7;
            let matrix = reformatMatrix(formName, connFileVal); 

            //create bootstrap table
            let table = $(`<table class='table table-dark table-striped'><tbody></tbody></table>`), tableBody = $(table).find('tbody');
            let matrixRows = matrix.split(';');
            let matrSep = ( matrixRows[0].includes(',') ? ',' : '\t'); 

            for (let i = 0; (i < matrixRows.length) && (dimensions[0] === 'all' || i < dimensions[0]); i++) {
                let tableRow = $(`<tr></tr>`);
                let entries = matrixRows[i].split(matrSep);
                for (let j = 0; (j < entries.length) && (dimensions[1] === 'all' || j < dimensions[1]); j++) {
                    let entry = Math.round(entries[j] * 1000)/1000; //round to three decimal places
                    let te = $(`<td>${entry}</td>`);
                    tableRow.append(te);
                }
                $(tableBody).append(tableRow);
            }

            let output = $(`<div class='bisweb-dialog-box' style='max-height: ${lh}px'></div>`);
            output.append(table);
            let matrixDimensions = `(dimensions ${matrixRows[0].split(matrSep).length}x${matrixRows.length})`;
            
            bootbox.alert({
                'title' : `Connectivity file ${matrixDimensions}`,
                'message' : output
            });
        }
    }

    /**
     * Reads the value from the form input then attempts to run CPM calculations based on which file is selected.
     * For example, if the file is a behavior file, it will try to find a subject file correlating to the same subject. If there's more than one it will prompt the user to select one.
     */
    runCPMFlow() {
        let form = $(this.cpmDisplayPanel).find('#' + this.fileListFormId);
        let formVal = form.val();

        let subjectKey = formVal.split('_')[0];
        let numRegex = /0*(\d+)/g, subjectNum = numRegex.exec(subjectKey)[1], foundKey = null;
        const self = this;

        return new Promise( (resolve, reject) => {
            //subject keys may be zero padded, so search for they key with the same number as the one in the formVal
            for (let key of Object.keys(this.connFiles)) {
                let numRegex = /0*(\d+)/g;
                let num = numRegex.exec(key)[1];
                if (num === subjectNum) {
                    foundKey = key;
                }
            }

            //create secondary list for cpm files for the given subject if behavior is specified
            if (formVal.includes('behavior')) {
                let filenameForm = $(this.cpmDisplayPanel).find('#' + this.fileListFormId);
                let formOptions = filenameForm.find('option'), valsList = [];
                for (let option of formOptions) {
                    let numRegex = /0*(\d+)/g;
                    if (numRegex.exec(option.value)[1] === subjectNum && !option.value.includes('behavior')) { valsList.push(option.value); }
                }

                //list of length one means the behavior file could only correlate to one file
                if (valsList.length === 1) {
                    let subjectFileKey, subjectFiles = this.connFiles[foundKey];
                    let subjectFilesKeys = Object.keys(subjectFiles);

                    for (let file of subjectFilesKeys) {
                        if (!file.includes('behavior')) { subjectFileKey = file; }
                    }

                    runCPM(this.connFiles[foundKey][subjectFileKey], this.connFiles[foundKey][formVal]);
                } else { //create a modal that'll allow the user to select a file manually 

                    let inputOptions = [];
                    for (let item of valsList) { inputOptions.push({ 'text': item, 'value': item }); }

                    bootbox.prompt({
                        'title': 'Choose a connectivity file',
                        'size': 'small',
                        'inputType': 'select',
                        'inputOptions': inputOptions,
                        'callback': (result) => {
                            if (result) {
                                runCPM(this.connFiles[foundKey][result], this.connFiles[foundKey][formVal]);
                            } else {
                                reject('No result selected');
                            }
                        }
                    });
                }
            } else {
                let subjectBehaviorKey;
                for (let key of Object.keys(this.connFiles[foundKey])) {
                    if (key.includes('behavior')) {
                        subjectBehaviorKey = key;
                    }
                }
                runCPM(this.connFiles[foundKey][formVal], this.connFiles[foundKey][subjectBehaviorKey]);
            }

            function runCPM(cpmFile, behaviorFile) {
                self.initializeWasm.then(() => {
                    //cast any string values to numbers before feeding the input to computeCPM
                    for (let key of Object.keys(self.settings)) {
                        if (typeof self.settings[key] === 'string') { self.settings[key] = parseFloat(self.settings[key]); }
                    }

                    try {
                        let cpmResults = libbiswasm.computeCPMWASM(cpmFile, behaviorFile, self.settings, 0);
                        let data = [];
                        let d = cpmResults.getDimensions();
                        for (let i = 0; i < d[0]; i++) {
                            data.push([behaviorFile.data[i], cpmResults.data[i]]);
                        }

                        $('.bis-scatterplotchart').trigger('changeData', {scatterData: data});
                        resolve(cpmResults);
                    } catch (e) { 
                        reject(e);
                    }

                    //TODO: Send to scatter plot
                });
            }
        });
    }

    /**
     * Creates the 'Import CPM File' button that will prompt the user to import a cpm file either from a directory or a .json file in a popover.
     */
    createCPMPopoverButton() {

        let importButton = $(`<button type='button' class='btn btn-sm btn-primary' data-toggle='popover' data-placement='left'>Import CPM file</button>`);

        let importFileCallback = (f) => { 
            this.importFileCallback(f); 
        };

        //Unattached buttons that are clicked when one of the popover buttons is clicked
        let importFileItem = bis_webfileutil.createFileButton({
            'callback' : importFileCallback
        }, {
            'title': 'Import connectivity index file',
            'filters' : [ { 'name': 'JSON', 'extensions': ['.json', '.JSON']}],
            'suffix' : 'json'
        });

        let importDirectoryItem = bis_webfileutil.createFileButton({
            'callback' : importFileCallback
        }, {
            'mode' : 'directory',
            'title': 'Import connectivity files from directory',
            'filters' : [ { 'name': 'Connectivity data files', 'extensions': ['.tsv', '.csv']}],
        });


        let popoverContent = $(
            `<div>
                <div class='list-group'>
                    <a href='#' class='list-group-item list-group-item-action bisweb-list-group-item' style='font-size: 11pt'>Import from CPM file</a>
                    <a href='#' class='list-group-item list-group-item-action bisweb-list-group-item' style='font-size: 11pt'>Import from directory</a>
                </div>
            </div>`
        );

        $(importButton).popover({
            'title': 'Select input source',
            'trigger': 'click',
            'html': true,
            'placement': 'left',
            'container': 'body',
            'content': popoverContent
        });

        //workaround to make popover appear on first click
        importButton.on('click', () => { $(importButton).popover('toggle'); });

        let popoverFileButton = popoverContent.find('.list-group-item').get(0);
        let popoverDirectoryButton = popoverContent.find('.list-group-item').get(1);

        $(popoverFileButton).on('click', () => { importFileItem.click(); bisweb_popoverhandler.dismissPopover(); });
        $(popoverDirectoryButton).on('click', () => { importDirectoryItem.click(); bisweb_popoverhandler.dismissPopover(); });

        return importButton;
    }

    /**
     * Creates or alters the CPM settings menu.
     * 
     * @param {Array} filenames - The list of filenames to put in the filename list of the settings menu.
     */
    updateSettingsMenu(filenames) {
        
        if (!this.madeSettingsMenu) {

            let listObj = {
                'kfold': ['3', '4', '5', '6', '8', '10'],
                'numtasks': ['0', '1', '2', '3'],
                'numnodes': ['3', '9', '268'],
                'filenames' : filenames
            };

            let container = new dat.GUI({ 'autoPlace': false });
            let filenameController = container.add(this.settings, 'filename', listObj.filenames);
            container.add(this.settings, 'threshold', 0, 1);
            container.add(this.settings, 'kfold', listObj.kfold);
            container.add(this.settings, 'numtasks', listObj.numtasks);
            container.add(this.settings, 'numnodes', listObj.numnodes),
            container.add(this.settings, 'lambda', 0.0001, 0.01);

            this.cpmDisplayPanel.append(container.domElement);
            $(container.domElement).find('.close-button').remove();

            //attach an id to the filename select so that the view button can find it later
            this.fileListFormId = bis_webutil.getuniqueid();
            $(filenameController.domElement).find('select').attr('id', this.fileListFormId);

            this.controllerUpdateFn = regenerateFilenameList.bind(this, filenameController);
            this.madeSettingsMenu = true;
        } else {
            this.controllerUpdateFn(filenames);
        }

        function regenerateFilenameList(controller, flist) {
            console.log('regenerate fname', controller, flist);
            controller.setValue(controller, flist);
        }

         /*let confirmButton = bis_webutil.createbutton({ 'name': 'Confirm', 'type': 'btn-success' });
            confirmButton.on('click', () => {
                console.log('settings obj', settingsObj);
                this.settings = Object.assign({}, settingsObj);
            });*/

            /*let cancelButton = bis_webutil.createbutton({ 'name': 'Close', 'type': 'btn-default' });
            cancelButton.on('click', () => {
                for (let key of Object.keys(settingsObj)) {
                    settingsObj[key] = this.settings[key];
                }
                    for (let i in container.__controllers) {
                        container.__controllers[i].updateDisplay();
                    }

                settingsModal.dialog.modal('hide');
            });*/
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
                bisweb_serverutils.runCPMMatrixFileModule({ 'indir': f, 'writeout': false }).then( (obj) => {
                    this.formatLoadedConnData(obj.output.file);
                    let trimmedOutlist = obj.output.filenames.map( element =>  bis_genericio.getBaseName(element) );
                    resolve(trimmedOutlist);
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

                    this.formatLoadedConnData(rawConnFiles);
                    resolve(flist);
                }).catch( (e) => { reject(e); });
            } else {
                console.log('Unrecognized extension', extension, 'for cpm file');
                bis_webutil.createAlert('Unrecognized extension ' + extension + ' for cpm file', true);
                reject('Unrecognized extension ' + extension);
            }
        });
        
    }

    exportCPMFile(f) {
        const self = this;
        if (this.showExportWarning) {
            bootbox.dialog({
                'title' : 'Ensure files are exportable',
                'message' : 'Some CPM files may be too large to export without running node with extra memory, i.e. invoking \'node\' in your terminal with the --max-old-space-size=[size in MB] flag.',
                'buttons' : {
                    'noshow' : {
                        'label' : "Ok, don't show again",
                        'className' : 'btn-success' ,
                        'callback' : () => {
                            this.showExportWarning = false;
                            bisweb_userprefs.setItem('showCPMExportWarning', false, true);
                            exportFlow(f);
                        }
                    },
                    'ok' : {
                        'label' : 'Ok',
                        'className' : 'btn-info',
                        'callback' : () => {
                            exportFlow(f);
                        }
                    },
                    'cancel' : {
                        'label' : 'Cancel',
                        'className' : 'btn-primary',
                        'callback' : () => {
                            return true;
                        }
                    }
                }
            });
        } else {
            exportFlow(f);
        }

        function exportFlow(f) {
            bis_webutil.createAlert('Saving connectivity index file to ' + f + '...', false, 0, 0, { 'makeLoadSpinner' : true });
            self.exportFiles(f).then( () => {
                bis_webutil.createAlert('Saved ' + f + ' successfully', false);
            }).catch( (e) => {
                console.log('Error saving CPM file', e);
                bis_webutil.createAlert('An error occured while saving ' + f, true);
            });
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

    setHelpText(button) {
        button.on('click', () => {
            bootbox.alert(`
                This panel controls how connectivity files are loaded and how CPM computational code is run.<br>
                The 'Import CPM file' button will allow you to load connectivity file data from either a .json file containing the full data for a connectivity study, or from a directory containing these files.<br>
                The 'Export CPM file' button will export an injested file to one of these .json files for later use. <br>
                The input select will let a user choose a file to either view or run the CPM code on. If a behavior file is chosen, the user may need to specify which connectivity file from the study to associate it with, should there be more than one.<br>
                The gear icon will allow the user to specify what settings the CPM code is run with. For more information about this, consult the documentation for computeCPMWASM.
                `
            );
        });
    }
}

/**
 * Reformats a matrix containing CPM data to be a tsv or csv formatted file. Used while saving or displaying a matrix file. 
 * 
 * @param {String} filename - Name of the connectivity file. 
 * @param {BiswebMatrix} matrix - The matrix associated with a connectivity file.
 */
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
    return reformattedEntry.join(';');
};

/**
 * Returns the size of a a BiswebMatrix in bytes. 
 * 
 * @param {BiswebMatrix} matrix - The matrix associated with a connectivity file.
 */
let getMatrixSize = (matrix) => {
    return matrix.data.BYTES_PER_ELEMENT * matrix.data.length;
};

bis_webutil.defineElement('bisweb-cpmelement', CPMElement);

