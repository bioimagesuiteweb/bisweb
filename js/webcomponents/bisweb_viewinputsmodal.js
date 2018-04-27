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
 
/*global document, HTMLElement */
"use strict";

const webutil = require('bis_webutil.js');
const io = require('bis_genericio');
const BiswebImage = require('bisweb_image');
const BiswebMatrix = require('bisweb_matrix');
const transformutil = require('bis_transformationutil');
const $ = require('jquery');

/**
 * Class representing the modal dialog that shows the inputs that have been stored during the user's current session in BISWeb. Inherits from HTMLElement.
 * Must be declared as an element in the document to appear. 
 */
class ViewInputsModal extends HTMLElement {

    constructor() {
        super();
    }

    /**
     * Create a modal dialog that will allow a user to view the inputs that have been saved by Bisweb. 
     */
    connectedCallback() {
        let algoElementId = this.getAttribute('bis-algorithmcontrollerid');
        this.algoElement = document.querySelector(algoElementId);

        //View Inputs Modal should use same database as algorithm controller
        this.database = this.algoElement.database;

        if (!algoElementId) {
            console.log('WARNING: No algorithm controller was found for view inputs modal and it is therefore very unlikely to work as expected!');
        }

        //modal dialog associated with viewing all the inputs loaded into the viewer so far
        //list of items is generated each time the modal is opened and disposed of each time the modal is closed.
        this.modalElement = webutil.createmodal('View Inputs', 'modal-lg');

        //remove close button for this modal
        this.modalElement.footer.find('.btn')[0].remove();

        //-----------------------------------------------------------------------------------
        //create section of input modal that isn't erased when modal is closed
        //-----------------------------------------------------------------------------------
        this.imagetabid = webutil.getuniqueid();
        this.matrixtabid = webutil.getuniqueid();
        this.transformtabid = webutil.getuniqueid();

        let imageButtonBarId = 'imageButtonBar', matrixButtonBarId = 'matrixButtonBar', transformButtonBarId = 'transformButtonBar';
        let modalBody =
            `<div class="container-fluid">
                <ul class="nav nav-tabs">
                    <li class='images-nav active'><a data-toggle='tab' href="#images">Images</a></li>
                    <li class='matrices-nav'><a data-toggle='tab' href="#matrices">Matrices</a></li>
                    <li class='transforms-nav'><a data-toggle='tab' href="#transforms">Transforms</a></li>
                </ul>
            
            
            <div class="tab-content">
                <div id="images" class="tab-pane fade">
                    <h3>Images</h3>
                    <div id=${this.imagetabid}></div>
                    <div id=${imageButtonBarId}></div>
                </div>
                <div id="matrices" class="tab-pane fade">
                    <h3>Matrices</h3>
                    <div id=${this.matrixtabid}></div>
                    <div id=${matrixButtonBarId}></div>
                </div>
                    <div id="transforms" class="tab-pane fade">
                    <h3>Transforms</h3>
                    <div id=${this.transformtabid}></div>
                    <div id=${transformButtonBarId}></div>
                </div>
            </div>
            </div>
            <br>
            `;
        
        let parsedModalBody = $(modalBody);
        let that = this;

        //-----------------------------------------------------------------------------------
        // Set actions for buttons attached to viewInputsModal and create button group
        //-----------------------------------------------------------------------------------
        let createInputButtonBar = function(type) {
            let formattedType = type.slice(0, 1).toUpperCase() + type.slice(1);
            let barTemplate = `<div class="btn-group" role="group" aria-label="Viewer Buttons" style="float: right"></div>`;
            let topBar = $(`<br>` + barTemplate), bottomBar = $(`<br></br>${barTemplate}`);

            let viewInputButton = webutil.createbutton({ 'name': 'View ' + formattedType, 'type': 'success' });
            let deleteInputButton = webutil.createbutton({ 'name': 'Delete', 'type': 'warning' });
            let renameInputButton = webutil.createbutton({ 'name': 'Rename', 'type': 'default'});
            let loadInputButton = webutil.createbutton({ 'name': 'Load ' + formattedType, 'type': 'primary'});
            let saveInputButton = webutil.createbutton({ 'name': 'Save ' + formattedType, 'type': 'info'});
            let deleteAllInputsButton = webutil.createbutton({ 'name' : 'Delete All', 'type' : 'danger' });

            let getActiveElement = function() {
                let activePane = parsedModalBody.find('.tab-pane.active');
                return activePane.find('.active');
            };

            viewInputButton.on('click', (e) => {
                e.preventDefault();
                that.viewInputFromModal();
            });

            deleteInputButton.on('click', (e) => {
                e.preventDefault();

                let activeElement = getActiveElement();
                if (activeElement) {
                    let inputId = activeElement.attr('inputId');
                    that.database.removeItemById(inputId);
                    activeElement.remove();
                }
            });

            renameInputButton.on('click', (e) => {
                e.preventDefault();
                let activeElement = getActiveElement();
                that.renameInput(activeElement);
            });

            loadInputButton.on('click', (e) => {
                e.preventDefault();
                let btn = webutil.createhiddeninputfile('.nii.gz, .json, .matr, .grd', (file) => {      
                    let obj;
                    //create a data object to load into based on the type of the input
                    if (type === 'transform') {
                        //transformations are created by a factory method rather than instantiated directly
                        transformutil.loadTransformation(file).then( (loadedobj) => {
                            console.log('object', loadedobj);
                            let entry = that.database.makeItemAndAdd(loadedobj.filename, loadedobj.data, type);
                            that.createRow(entry, parsedModalBody.find('#' + that.transformtabid));
                        });

                    } else if (type === 'image') {
                        obj = new BiswebImage();
                        obj.load(file).then( () => {
                            let entry = that.database.makeItemAndAdd(obj.filename, obj, type);
                            that.createRow(entry, parsedModalBody.find('#' + that.imagetabid));
                        });

                    } else if (type === 'matrix') {
                        obj = new BiswebMatrix();
                        obj.load(file).then( () => {
                            let entry = that.database.makeItemAndAdd(obj.filename, obj, type);
                            that.createRow(entry, parsedModalBody.find('#' + that.matrixtabid));
                        });
                    }

                }, false);

                btn.click();
            });

            saveInputButton.on('click', (e) => {
                e.preventDefault();
                let activeElement = getActiveElement();

                //data is stored as objects that inherit from bisweb_dataobject
                let obj = that.database.getItemById(activeElement.attr('inputid'));
                obj.data.save(obj.metadata.name);
            });

            deleteAllInputsButton.on('click', (e) => {
                e.preventDefault();
                that.deleteAllInputs().then( (deleted) => {
                    if (deleted) {
                        that.modalElement.dialog.modal('hide');
                    }
                });
            });

            topBar.append(viewInputButton);
            topBar.append(deleteInputButton);
            topBar.append(renameInputButton);
            topBar.append(deleteAllInputsButton);
            bottomBar.append(loadInputButton);
            bottomBar.append(saveInputButton); 

            return { 'topBar' : topBar, 'bottomBar' : bottomBar};
        };

        //-----------------------------------------------------------------------------------
        // Set actions for footer buttons shared by all tabs in modal
        //-----------------------------------------------------------------------------------

        let exportDictionaryButton = webutil.createbutton({ 'name': 'Export to Disk', 'type': 'info'});
        let importDictionaryButton = webutil.createbutton({ 'name': 'Import from Disk', 'type': 'primary'});

        exportDictionaryButton.on('click', (e) => {
            e.preventDefault();
            this.exportSavedItemsToDisk();
        });

        importDictionaryButton.on('click', (e) => {
            e.preventDefault();
            let btn = webutil.createhiddeninputfile( (file) => {
                this.importItemsFromDisk(file);
            }, '.json', false);
            btn.click();
        });

        let buttonGroup = $(`<div class="btn-group" role="group" aria-label="Viewer Buttons" style="float: right"></div>`);
        buttonGroup.append(importDictionaryButton);
        buttonGroup.append(exportDictionaryButton);
        this.modalElement.footer.append(buttonGroup);

        let imageButtonBar = createInputButtonBar('image'), matrixButtonBar = createInputButtonBar('matrix'), transformButtonBar = createInputButtonBar('transform');
    

        parsedModalBody.find('#'+imageButtonBarId).append(imageButtonBar.topBar).append(imageButtonBar.bottomBar);
        parsedModalBody.find('#'+matrixButtonBarId).append(matrixButtonBar.topBar).append(matrixButtonBar.bottomBar);
        parsedModalBody.find('#'+transformButtonBarId).append(transformButtonBar.topBar).append(transformButtonBar.bottomBar);
        this.modalElement.body.append(parsedModalBody);

        this.modalElement.dialog.on('hidden.bs.modal', (e) => {
            e.preventDefault();

            //Delete items in modal on hide
            let tabs = this.modalElement.dialog.find('.tab-content');
            let images = tabs.find('#' + this.imagetabid).children();
            let matrices = tabs.find('#' + this.matrixtabid).children();
            let transforms = tabs.find('#' + this.transformtabid).children();

            for (let image of images) 
                image.remove();
            for (let matrix of matrices)
                matrix.remove();
            for (let transform of transforms) 
                transform.remove();

            //set all nav and content tabs to inactive
            parsedModalBody.find('#images').removeClass('active in');
            parsedModalBody.find('#matrices').removeClass('active in');
            parsedModalBody.find('#transforms').removeClass('active in');
            
            parsedModalBody.find('.images-nav').removeClass('active');
            parsedModalBody.find('.matrices-nav').removeClass('active');
            parsedModalBody.find('.transforms-nav').removeClass('active');
        });

        //--------------------------------------------------------------------------------
        // Attach menubar item
        //--------------------------------------------------------------------------------
        document.addEventListener('mainViewerDone', () => {
            //let menuBarID = this.getAttribute('bis-menubarid');
            //let menuBar = document.querySelector(menuBarID).getMenuBar();
            let menuBar = null;

            console.log('menuBar', menuBar);
            if (menuBar) {
                let viewInputsMenu = webutil.createTopMenuBarMenu('View Inputs', menuBar);
                this.createModalList();

                let openInputModal = function(openTab) {
                    parsedModalBody.find('#' + openTab).addClass('active in');
                    parsedModalBody.find('.' + openTab + '-nav').addClass('active');
                    this.modalElement.dialog.modal('show');
                };

                webutil.createMenuItem(viewInputsMenu, 'View Images', () => {
                    openInputModal('images');
                });

                webutil.createMenuItem(viewInputsMenu, 'View Matrices', () => {
                    openInputModal('matrices');
                });
                
                webutil.createMenuItem(viewInputsMenu, 'View Transforms', () => {
                    openInputModal('transforms');
                });

            }
        });
    }

    /**
     * Creates a single row in the view inputs modal representing an entry in the underlying database. 
     * 
     * @param {Object} input - Database entry for a given input
     * @param {HTMLElement} parent - Parent element on which to append the row
     */
    createRow(input, parent) {
        let row = 
        `<div class="row" inputId=${input.metadata.id}> 
            <div class="col-sm-4 modal-name">${input.metadata.name}</div>
            <div class="col-sm-1 modal-divider"></div>
            <div class="col-sm-7 modal-description">${input.metadata.description}</div>
        </div>`;

        let parsedRow = $(row).on('click', function () {
            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
            } else {
                $(this).addClass('active').siblings().removeClass('active');
            }
        });

        let nameCol = parsedRow.find('.modal-name');
        nameCol.on('dblclick', (e) => {
            e.preventDefault();
            this.renameInput(parsedRow);
        });

        let descCol = parsedRow.find('.modal-description');
        descCol.on('dblclick', (e) => {
            e.preventDefault();
            this.viewInputFromModal(parsedRow);
        });

        parent.append(parsedRow);
    }

    /**
     * Creates the table of inputs that appears in the view inputs modal. Calls createRow for each entry in the database. 
     */
    createModalList() {
        let imageDiv = this.modalElement.body.find('#' + this.imagetabid);
        let matrixDiv = this.modalElement.body.find('#' + this.matrixtabid);
        let transformDiv = this.modalElement.body.find('#' + this.transformtabid);

        for (let input of this.database.getItems()) {
            switch(input.metadata.type) {
                case 'image': this.createRow(input, imageDiv); break;
                case 'matrix': this.createRow(input, matrixDiv); break;
                case 'transform': 
                case 'transformation': this.createRow(input, transformDiv); break;
                default: console.log('Could not create list item for ambigous type', input.metadata.type);
            }
        }
    }

    
    /**
     * Displays an input selected from the view inputs modal in a way appropriate to the input type, e.g. on the viewer for an image. 
     * 
     * @param {JQuery<HTMLObject>} row - The row in the modal that was selected
     */
    viewInputFromModal(row = null) {
        //if a row is specified use that row
        //otherwise select active element and use the id embedded in the HTML to reference the relevant entry in the database
        let selectedElement = row;
        if (!row) {
            //find the currently displayed tab in the view inputs modal and get the active element from it
            let activePane = this.modalElement.body.find('.tab-pane.active');
            selectedElement = activePane.find('.active');
        }

        if (row || selectedElement.length > 0) {

            let inputId = selectedElement.attr('inputId');
            for (let input of this.database.getItems()) {
                if (input.metadata.id === inputId) {

                    //display input using method appropriate to its type
                    let type = input.metadata.type;
                    if (type === 'image') {
                        this.algoElement.update(input.data, input.metadata.type, {
                            'viewername': 'image',
                            'viewersource': 'image',
                            'colortype': 'Auto',
                            'autosave': false,
                            'existingItemId': input.metadata.id,
                            'inputinfo': input.metadata
                        });
                    } else if (type === 'matrix') {
                        console.log('Display matrix to come...');
                    } else if (type === 'transform') {
                        this.algoElement.currentTransform = input;
                        webutil.createAlert('Updated current transform', false);
                    } else {
                        console.log('Trying to display input with unrecognized type', type);
                    }

                    return;
                }
            }
        } else {
            webutil.showErrorModal('An error occured', 'No element selected');
        }
    }

    /**
     * Renames the input signified by a given row of the view inputs modal. 
     * 
     * Invokes but does not return a promise.
     * @param {JQuery<HTMLElement>} row - A row of the view inputs modal. Expected to contain the property 'inputid' which signifies an entry in the database.
     */
    renameInput(row) {
       webutil.createRenameInputModal( (obj) => {
           if (obj.name) {
                let nameCol = $(row).find('.modal-name');
                nameCol[0].innerHTML = obj.name;
            }
       });
    }

    /**
     * Pops up a confirm dialog asking the user whether they want to delete the entire contents of the database. If they confirm, contents are deleted, otherwise nothing happens.
     * 
     * Returns a promise.
     */
    deleteAllInputs() {
        return new Promise((resolve) => {
            let modalObj = webutil.createPopupModal('Delete all inputs?', 'Yes', 'No');
            let modal = modalObj.modal;

            modalObj.confirmButton.on('click', (e) => {
                e.preventDefault();

                //let contents = this.database.removeAllItems();
                modal.dialog.modal('hide');
                resolve(true);
            });

            modalObj.cancelButton.on('click', (e) => {
                e.preventDefault();
                modal.dialog.modal('hide');
                resolve(false);
            });

            modal.dialog.modal('show');
        });
    }
    /**
     * Saves all the items contained in database to the disk in JSON format. 
     */
    exportSavedItemsToDisk() {
        let dict = this.database.serializeToDictionary();
        let formattedDict = JSON.stringify(dict);
        let filename = 'Exports from ' + webutil.createTimestamp() + '.json';
        console.log('filename', filename);
        io.write(filename, formattedDict);
    }

    /**
     * TODO: Loads a JSON formatted dictionary from disk and populates the database with its entries.
     */
    importItemsFromDisk() {
        //let data = io.read();
    }

}

webutil.defineElement('bisweb-viewinputsmodal', ViewInputsModal);
