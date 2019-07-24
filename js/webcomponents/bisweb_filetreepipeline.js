const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');

const moduleIndex = require('moduleindex.js');
const bisweb_custommodule = require('bisweb_custommodule.js');

const bis_genericio = require('bis_genericio.js');
const bootbox = require('bootbox');
const $ = require('jquery');

//TODO: When Xenios gets back have him update biswebnode
class FileTreePipeline extends HTMLElement {
    
    constructor() {
        super();
        this.panel = null;
        this.pipelineModal = null;
        this.modules = [];
        this.savedParameters = null;
        this.pipelineInputs = null;
    }

    connectedCallback() {
        let algocontrollerid = this.getAttribute('bis-algocontrollerid');
        bis_webutil.runAfterAllLoaded( () => {     
            this.algocontroller = document.querySelector(algocontrollerid);
        });
    }

    /**
     * Opens a modal that will allow a user to create a pipeline from the full set of BioImageSuite Web Modules. Should be called by outside scope!
     */
    openPipelineCreationModal() {
        if (!this.pipelineModal) {

            let pipelineModal = bis_webutil.createmodal('Create a pipeline', 'modal-lg modal-scrollable');
            pipelineModal.footer.empty();

            pipelineModal.dialog.find('.modal-content').addClass('bisweb-capped-modal');

            let infoButton = $(`<button type='button' class='btn-sm btn-link' style='float: right'>
                                    <span class='glyphicon glyphicon-info-sign'></span>&nbspFile Info
                                </button>`);

            let removeButton = $(`<button type='button' class='btn-sm btn-link' style='float: right'> 
                                    <span class='glyphicon glyphicon-remove'></span>&nbspRemove
                                </button>`);

            //create bootstrap layout for pipeline creation modal 
            let layout = $(`
                <div class='container-fluid bisweb-scrollable-container'>
                    <div class='row'>
                        <div class='col-lg-8'>
                            <div class='bisweb-pipeline-module-list'>
                            </div>
                        </div>
                        <div class='col-lg-4 bisweb-sticky-container'>
                            <div class='bisweb-pipeline-input-list'>
                                <ul>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `);

            $(pipelineModal.body).append(layout);
            $(pipelineModal.body).find('.bisweb-pipeline-input-list').append(removeButton, infoButton);

            let bottomButtons = $(layout).find('.btn-link');
            bottomButtons.css('visibility', 'hidden');

            let addModuleButton = bis_webutil.createbutton({ 'name' : 'Add module', 'type' : 'success' });

            addModuleButton.on('click', () => {
                let moduleIndexKeys = moduleIndex.getModuleNames();
                let moduleIndexArray = [];
                
                for (let key of moduleIndexKeys) {
                    moduleIndexArray.push({ 'text' : moduleIndex.getModule(key).getDescription().name, 'value' : key });
                }

                bootbox.prompt({
                    'size' : 'small', 
                    'title' : 'Choose a module',
                    'inputType' : 'select',
                    'inputOptions' : moduleIndexArray,
                    'callback' : (moduleName) => {
                        if (moduleName) {
                            let mod = moduleIndex.getModule(moduleName);

                            let width = pipelineModal.body.width() / 3;
                            let customModule = bisweb_custommodule.createCustom(null, this.algocontroller, mod, { 'numViewers': 0, 'dual' : false, 'paramsMargin' : '5px', 'buttonsMargin' : '0px', 'width' : width });
                            customModule.createOrUpdateGUI({ 'width' : width });
                            centerCustomElement($(customModule.panel.widget));

                            let id = bis_webutil.getuniqueid();
                            this.modules.push({ 'name' : moduleName, 'module' : customModule, 'id' : id});

                            let moduleLocation = this.modules.length - 1; //index of module in array at time of adding
                            let prettyModuleName = moduleIndex.getModule(moduleName).getDescription().name;

                            //add 'remove' button to modal button bar
                            let removeButton = bis_webutil.createbutton({ 'name': 'Remove', 'type' : 'danger' });
                            removeButton.on('click', () => {
                                bootbox.confirm({
                                    'message' : `Remove module ${prettyModuleName}?`,
                                    'size' : 'small',
                                    'callback' : (result) => {
                                        if (result) {
                                            this.modules.splice(moduleLocation, 1);
                                            pipelineModal.body.find(`#${id}`).remove();
                                        }
                                    }
                                });
                            });

                            //put label and element inside a containing div
                            let moduleLabel = $(`<span>${prettyModuleName}</span>`);

                            $(customModule.panel.widget).find('.bisweb-customelement-footer').append(removeButton);
                            $(customModule.panel.widget).prepend(moduleLabel);
                            $(customModule.panel.widget).attr('id', id);
                            
                            this.addArrowButtons(id, this.pipelineModal, $(customModule.panel.widget).find('.dg.main') );
                            $(layout).find('.bisweb-pipeline-module-list').append(customModule.panel.widget);
                        }
                    }
                });
            });

            let saveModulesButton = bis_webfileutil.createFileButton({ 
                'name': 'Save Pipeline',
                'type': 'primary',
                'callback': (f) => { this.savePipelineToDisk(f); pipelineModal.dialog.modal('hide'); },
                }, {
                    'title': 'Save Pipeline to Disk',
                    'save': true,
                    'filters': [{ name: 'JSON Files', extensions: ['json'] }],
                    'suffix': 'json',
                    'initialCallback': () => {
                        return 'pipeline.json';
                    }
            });

            let importInputsButton = bis_webfileutil.createFileButton({
                'name': 'Import Inputs',
                'type': 'info',
                'callback': (f) => { this.importInputsFromDisk(f); $(bottomButtons).css('visibility', 'visible'); },
                }, {
                    'title': 'Import inputs from disk',
                    'save': false,
                    'filters': 'NII',
                    'suffix': 'NII',
                    'altkeys' : true
            });

            removeButton.on('click', () => {
                //use partial filename to find the full entry in the internal list
                let inputList = $(layout).find('.bisweb-pipeline-input-list');
                let filename = this.getActiveItemName(inputList); 
                let selectedItem = inputList.find('.active');

                if (!filename) { return; }

                for (let i = 0; i < this.pipelineInputs.length; i++) {
                    if (this.pipelineInputs[i].includes(filename)) {
                        this.pipelineInputs.splice(i, 1);
                        i = this.pipelineInputs.length;
                    }
                }

                $(selectedItem).remove();
            });

            infoButton.on('click', () => {
                let inputList = $(layout).find('.bisweb-pipeline-input-list');
                let filename = this.getActiveItemName(inputList);

                if (!filename) { return; }

                let fullname;
                for (let item of this.pipelineInputs) {
                    if (item.includes(filename)) {
                        fullname = item;
                    }
                }

                this.getFileInfo(fullname).then( (info) => {

                    //format size to be a readable format 
                    let fileSize = info.size, i = 0, fileSizeString;
                    while (fileSize > 1024) {
                        fileSize = fileSize / 1024;
                        i = i + 1;
                    }

                    let suffix = 'B';
                    switch (i) {
                        case 1 : suffix = 'kB'; break;
                        case 2 : suffix = 'MB'; break;
                        case 3 : suffix = 'GB'; break;
                        case 4 : suffix = 'TB'; break;
                    }

                    fileSizeString = '' + fileSize + suffix;

                    let modalText = `File size: ${fileSizeString}<br>Created: ${info.stats.ctime}<br>Last accessed: ${info.stats.atime}`;
                    bootbox.alert(modalText);
                });
            });

            //set pipeline modal to update its modules when it's hidden and shown, so long as no settings are saved so far.
            pipelineModal.dialog.on('show.bs.modal', () => {
                if (!this.savedParameters) {
                    for (let obj of this.modules) {
                        obj.module.createOrUpdateGUI();
                    }
                }
            });

            pipelineModal.footer.append(addModuleButton);
            pipelineModal.footer.append(saveModulesButton);
            pipelineModal.footer.append(importInputsButton);
            this.pipelineModal = pipelineModal;
        }

        this.pipelineModal.dialog.modal('show');
    }

    /**
     * Returns the currently selected item in the pipeline modal (item with class 'active'), or displays an error message if nothing is selected.
     * 
     * @param {JQuery} list - The pipeline input list.
     * @returns Active item, if any. 
     */
    getActiveItemName(list) {
        let selectedItem = $(list).find('.active');
        if (selectedItem.length === 0) { 
            bootbox.alert('No item selected'); 
            return false; 
        } else { 
            return $(selectedItem).html(); 
        }
    }

    /**
     * Adds arrow buttons that will allow a user to move a module up or down in the pipeline. 
     * 
     * @param {String} id - Id associated with a module currently in the pipeline modal.
     * @param {JQuery} modal - The pipeline modal.
     * @param {JQuery} moduleContainer - The div containing the module to move up or down.
     */
    addArrowButtons(id, modal, moduleContainer) {
        let upButton = $(`<span class='glyphicon glyphicon-chevron-up bisweb-glyphicon-right'></span>`);
        let downButton = $(`<span class='glyphicon glyphicon-chevron-down bisweb-glyphicon-right'></span`);

        upButton.on('click', () => {
            let prevElem, currentElem; 
            for (let i = 0; i < this.modules.length; i++) {
                if (this.modules[i].id === id) { 
                    if (i === 0) { return; } //can't move up if this is the first item in the list
                    prevElem = $(modal.body).find('#' + this.modules[i - 1].id);
                    currentElem = $(modal.body).find('#' + this.modules[i].id);

                    //move module up one in list
                    let moveElem = this.modules.splice(i, 1);
                    this.modules.splice(i - 1, 0, moveElem[0]);
                }
            }

            $(currentElem).detach();
            $(currentElem).insertBefore(prevElem);
        });

        downButton.on('click', () => {
            let nextElem, currentElem; 
            for (let i = 0; i < this.modules.length; i++) {
                if (this.modules[i].id === id) { 
                    if (i === this.modules.length - 1) { return; } //can't move down if this is the last item in the list
                    nextElem = $(modal.body).find('#' + this.modules[i + 1].id);
                    currentElem = $(modal.body).find('#' + this.modules[i].id);

                    //move module down one in list
                    let moveElem = this.modules.splice(i, 1);
                    this.modules.splice(i + 1, 0, moveElem[0]);
                    i = this.modules.length; //needed to avoid double-counting the element after it's moved into place.
                }
            }

            $(currentElem).detach();
            $(currentElem).insertAfter(nextElem);
        });

        $(moduleContainer).prepend(upButton);
        $(moduleContainer).append(downButton);
    }

    /**
     * Saves the modules to disk, in order, with the parameters the user specified.
     * Also runs the pipeline module and saves a Makefile for the modules specified and an output directory for the files that will be created by it.
     * 
     * @param {String} filename - Name for the pipeline parameters file. 
     */
    savePipelineToDisk(filename) {
        let params = [];
        for (let i = 0; i < this.modules.length; i++) {
            let param = {'name' : this.modules[i].name, 'params' : this.modules[i].module.getVars()};
            params.push(param);
        }

        this.savedParameters = params;
        
        let sep = this.pipelineInputs[0].includes('\\') ? '\\' : '/';
        
        //format the saved modules to use the pipeline creation tool.
        //TODO: Format this to use biswebnode maybe? 
        let command = ['', 'home', 'zach', 'javascript', 'bisweb', 'js', 'bin', 'bisweb.js'].join(sep);
        let pipeline = { 
            'command' : 'node ' + command,
            'inputs' : [{
                'name' : 'input',
                'files' : this.pipelineInputs
            }],
            'jobs' : []
        };
        for (let i = 0; i < params.length; i++) {
            let inputName = (i === 0 ? 'input' : 'out' + i), outputName = 'out' + (i + 1);
            let entry = {
                'name' : `Command ${i}`,
                'subcommand' : params[i].name,
                'options' : `--input %${inputName}% --output %${outputName}% `,
                'outputs' : [
                    {
                        'name' : outputName,
                        'depends' : [ `%${inputName}%`],
                        'naming' : `${params[i].name}_%${inputName}%.nii.gz`
                    }
                ]
            };

            for (let p of Object.keys(params[i].params)) {
                entry.options = entry.options.concat(`--${p} ${params[i].params[p]} `);
            }

            pipeline.jobs.push(entry);
        }

        let stringifiedPipeline = JSON.stringify(pipeline, null, 2);
        bis_genericio.write(filename, stringifiedPipeline).then( () => {

            //construct default output directory and Makefile names from the user-provided filename
            let splitOutputFilename = filename.split(sep), splitOdirFilename = filename.split(sep);
            splitOutputFilename[splitOutputFilename.length - 1] = 'Makefile', splitOdirFilename[splitOdirFilename.length - 1] = 'FilesCreatedByPipeline';

            let outputFilename = splitOutputFilename.join(sep);
            let odirFilename = splitOdirFilename.join(sep);

            //savemanually flag needed in order to save the output Makefile (modules run directly through the server don't hit the saving hooks from the command line)
            bis_genericio.runPipelineModule({ 'input' : filename, 'output' :  outputFilename, 'odir' : odirFilename }, true).then( () => {
                bis_webutil.createAlert('Pipeline Makefile created.');
            });
        });
    }

    /**
     * Imports a filename or set of filenames from disk and returns them to be listed in the modal.
     * 
     * @param {String} f - A filename or a set of filenames.
     * @returns The set of filenames.
     */
    importInputsFromDisk(f) {

        if (this.pipelineInputs) {
            bootbox.confirm({
                'size': 'small',
                'message': 'There are already inputs defined for this pipeline. Replace the existing inputs with these, or add them to the end?',
                'buttons': {
                    'confirm': {
                        'label': 'Add',
                        'className': 'btn-success'
                    },
                    'cancel': {
                        'label' :  'Replace',
                        'className': 'btn-warning'
                    } 
                },
                'callback' : (add) => {
                    if (add) {
                        this.pipelineInputs = Array.isArray(f) ? this.pipelineInputs.concat(f) : this.pipelineInputs.concat([f]);
                    } else {
                        this.pipelineInputs = Array.isArray(f) ? f : [f];
                    }

                    this.updateInputListElement(this.pipelineInputs);  
                }
            });
        } else {
            this.pipelineInputs = Array.isArray(f) ? f : [f];
            this.updateInputListElement(f);  
        }
  
    }

    /**
     * Regenerates the list of input elements in the pipeline modal with a new set of inputs.
     * 
     * @param {Array} fileList - List of filenames to regenerate the list with.
     */
    updateInputListElement(fileList) {
        let fileListElement = $(this.pipelineModal.body).find('.bisweb-pipeline-input-list ul');
        $(fileListElement).empty();

        fileList = Array.isArray(fileList) ? fileList : [fileList];

        for (let item of fileList) {
            let sep = item.includes('\\') ? '\\' : '/';
            let splitFilename = item.split(sep), filename = splitFilename[splitFilename.length - 1];

            let listItem = $(`<a href='#' class='list-group-item list-group-item-action bisweb-list-group-item'>${filename}</a>`);
            fileListElement.append(listItem);
        }

        //set on click behavior for new elements
        let groupItems = fileListElement.find('.list-group-item');
        groupItems.on('click', (e) => { groupItems.removeClass('active'); $(e.target).addClass('active'); });
    }

    /**
     * Gets the size and stats for a given file. Simply a combination of bis_genericio.getFileSize and bis_genericio.getFileStats.
     * 
     * @param {String} f - Name of a file on disk. 
     * @returns Promise resolving the file size and stats, or rejecting with an error.
     */
    getFileInfo(f) {
        return new Promise( (resolve, reject) => {
            bis_genericio.getFileSize(f).then( (size) => {
                bis_genericio.getFileStats(f).then( (stats) => {
                    resolve({ 'stats' : stats, 'size' : size});
                }).catch( (e) => { reject(e); });
            }).catch( (e) => { reject(e); });
        });
    }

    /**
     * Creates a list item to represent an entry in the current saved pipeline. 
     * 
     * @param {String} moduleName - The name of a BioImageSuite Web module. 
     * @returns A formatted bootstrap list item.
     */
    createPipelineListItem(moduleName) {
        let listItemId = bis_webutil.getuniqueid();
        let listItem = $(`<li id='${listItemId}' class='list-group-item bisweb-pipeline-list-item'>${moduleName}</li>`);
        listItem.on('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            this.openModuleEditingModal(listItem);
        });

        return listItem;
    }

    /**
     * Opens a small bootstrap modal to edit the parameters of a module in the currently saved pipeline. 
     * 
     * @param {JQuery} item - A Bootstrap-formatted list item containing the name of a BioImageSuite Web module.
     */
    openModuleEditingModal(item) {
        let name = $(item).html();
        let modal = bis_webutil.createmodal(`Change parameters for ${name}`, 'modal-sm');

        //generate custom element gui with current params 
        //note that index in visual list will match index in internal list, so we can determine which internal list item to use by finding this element in the visual list
        let listItems = $('#bisweb-panel-pipeline').find('.bisweb-pipeline-list').children();
        let index = null;

        for (let i = 0; i < listItems.length; i++) {
            if ($(listItems[i]).attr('id') === $(item).attr('id')) { index = i; i = listItems.length; }
        }

        let baseMod = moduleIndex.getModule(this.modules[index].name);
        let customModule;

        //modal has to be displayed before width can be read.
        modal.dialog.on('shown.bs.modal', () => {
            //modal body padding is 20px by default
            let width = $(modal.body).outerWidth() - 40;
            customModule = bisweb_custommodule.createCustom(null, this.algocontroller, baseMod, { 'numViewers' : 0, 'dual' : false, 'paramsMargin' : '0px', 'buttonsMargin' : '0px', 'width' : width });
            modal.body.append(customModule.panel.widget);
            customModule.createOrUpdateGUI( {'width' : width});
            customModule.updateParams(this.savedParameters[index]);
        });
        

        //add save button to modal
        modal.footer.empty();
        let saveButton = bis_webutil.createbutton({ 'name' : 'Save', 'type' : 'btn-primary' });
        saveButton.on('click', () => {
            this.modules[index].module = customModule;
            modal.dialog.modal('hide');
        });

        let closeButton = bis_webutil.createButton({ 'name' : 'Close'});
        closeButton.on('click', () => {
            modal.dialog.modal('hide');
        });

        modal.footer.prepend(saveButton);
        modal.dialog.modal('show');
    }
}

//Adds 'bisweb-centered-customelement' class to custom element
let centerCustomElement = (widget) => { 
    $(widget).find('.bisweb-customelement-body').addClass('bisweb-centered');
    $(widget).find('.bisweb-customelement-footer').addClass('bisweb-centered');
};

bis_webutil.defineElement('bisweb-filetreepipeline', FileTreePipeline);
module.exports = FileTreePipeline;
