const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bisweb_popoverhandler = require('bisweb_popoverhandler.js');

const moduleIndex = require('moduleindex.js');
const bisweb_custommodule = require('bisweb_custommodule.js');

const bis_genericio = require('bis_genericio.js');
const bisweb_serverutils = require('bisweb_serverutils.js');
const bootbox = require('bootbox');
const $ = require('jquery');

const layoutTemplate = `
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
    </div>`;


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
        const managerid = this.getAttribute('bis-modulemanagerid') || null;
        bis_webutil.runAfterAllLoaded( () => {
            let modulemanager = document.querySelector(managerid) || null;
            if (modulemanager)
                this.algocontroller = modulemanager.getAlgorithmController();
            return this.algorithmController;
        });

        bisweb_popoverhandler.addPopoverDismissHandler();
    }

    /**
     * Opens a modal that will allow a user to create a pipeline from the full set of BioImageSuite Web Modules. 
     */
    openPipelineCreationModal() {
        if (!this.pipelineModal) {

            let pipelineModal = bis_webutil.createmodal('Create a pipeline', 'modal-lg');
            this.pipelineModal = pipelineModal;
            pipelineModal.footer.empty();

            //create bootstrap layout for pipeline creation modal 
            let layout = $(layoutTemplate);
            $(pipelineModal.body).append(layout);
            
            this.addInputListButtons(layout);

            let bottomButtons = $(layout).find('.btn-link');
            bottomButtons.css('visibility', 'hidden');

            let addModuleButton = bis_webutil.createbutton({ 
                'name' : 'Add module', 
                'type' : 'success',
                'callback' : () => {
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
                               this.addNewModule(moduleName);
                            }
                        }
                    });
                }
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
        }

        this.pipelineModal.dialog.modal('show');
    }

    /**
     * Creates the UI elements for a new module in the modal, including the dat.gui custom element UI, buttons to move the module up and down in the pipeline, and to perform operations related to the individual module.
     * 
     * @param {String} moduleName - The name of the module to add to the modal. 
     */
    addNewModule(moduleName) {
        let mod = moduleIndex.getModule(moduleName);

        let width = this.pipelineModal.body.width() / 3;
        let customModule = bisweb_custommodule.createCustom(null, this.algocontroller, mod, { 'numViewers': 0, 'dual' : false, 'paramsMargin' : '5px', 'buttonsMargin' : '0px', 'width' : width });
        customModule.createOrUpdateGUI({ 'width' : width });
        centerCustomElement($(customModule.panel.widget));

        let id = bis_webutil.getuniqueid();
        this.modules.push({ 'name' : moduleName, 'module' : customModule, 'id' : id});

        let moduleLocation = this.modules.length - 1; //index of module in array at time of adding
        let prettyModuleName = moduleIndex.getModule(moduleName).getDescription().name;

        //add 'remove' button to modal button bar
        let removeButton = bis_webutil.createbutton({ 
            'name': 'Remove', 
            'type' : 'danger', 
            'callback' : () => {
                bootbox.confirm({
                    'message' : `Remove module ${prettyModuleName}?`,
                    'size' : 'small',
                    'callback' : (result) => {
                        if (result) {
                            this.modules.splice(moduleLocation, 1);
                            this.pipelineModal.body.find(`#${id}`).remove();
                        }
                    }
                });
            }
        });

        let moduleDescription = moduleIndex.getModule(moduleName).getDescription(); 
        if (moduleDescription.inputs.length > 1) {
           this.addInputsButton(id, customModule, moduleDescription.inputs);
        } 

        if (moduleDescription.outputs.length > 1) {
            this.addOutputsButton(id, customModule, moduleDescription.outputs);
        }

        //put label and element inside a containing div
        let moduleLabel = $(`<span>${prettyModuleName}</span>`);

        $(customModule.panel.widget).find('.bisweb-customelement-footer').append(removeButton);
        $(customModule.panel.widget).prepend(moduleLabel);
        $(customModule.panel.widget).attr('id', id);
        
        this.addArrowButtons(id, this.pipelineModal, $(customModule.panel.widget).find('.dg.main'));
        $(this.pipelineModal.body).find('.bisweb-pipeline-module-list').append(customModule.panel.widget);
    }


    /**
     * Adds the 'Add inputs' button to a module with a popover to specify which images or matrices or gradients to use for which input. 
     * 
     * @param {String} id - The id of the module to add the input button for.
     * @param {JQuery} customModule - The html of the custom element to add the input button to.
     * @param {Array} moduleInputs - The list of inputs images, matrices, etc. for the module.
     */
    addInputsButton(id, customModule, moduleInputs) {
        let inputFormSelectId = bis_webutil.getuniqueid(), usePreviousId = bis_webutil.getuniqueid();
        let inputsButton = $(`<button type='button' class='btn btn-sm btn-primary' data-toggle='popover' data-placement='right'>Add inputs</button>`);
        let popoverContent = $(
            `<div>
                <div class='form-group'>
                    <label for=${inputFormSelectId}>Select an input</label>
                    <select class='form-control' id=${inputFormSelectId}>
                    </select>
                </div>
                <div class='list-group' style='visibility: hidden'>
                    <a href='#' class='list-group-item list-group-item-action bisweb-list-group-item' style='font-size: 11pt' data-toggle='dropdown'>Load input from disk</a>
                    <div class='dropright'>
                        <a href='#' id=${usePreviousId} class='list-group-item list-group-item-action bisweb-list-group-item' style='font-size: 11pt'>Use previous input</a>
                        <ul class='dropdown-menu' style='biswebpanel' aria-labeledby=${usePreviousId}>
                        </ul>
                    </div>    
                </div>
            </div>`
        );

        let formSelect = $(popoverContent).find('#' + inputFormSelectId);
        let listGroup = $(popoverContent).find('.list-group');
        formSelect.append(`<option>Select an input...</option>`);
        formSelect.on('change', () => {
            if (formSelect.val() === 'Select an input...') {
                listGroup.css('visibility', 'hidden');
            } else {
                listGroup.css('visibility', 'visible');
            }
        });

        for (let input of moduleInputs) {
            let option = $(`<option>${input.varname}</option>`);
            formSelect.append(option);
        }

        $(inputsButton).popover({
            'title': 'Select input source',
            'trigger': 'click',
            'html': true,
            'placement': 'right',
            'container': 'body',
            'content': popoverContent
        });

        inputsButton.on('click', () => { $(inputsButton).popover('toggle'); });

        console.log('group item', $(listGroup).find('.list-group-item'));
        //add behaviors to popover buttons
        let loadInputButton = $(listGroup).find('.list-group-item').get(0);
        let usePreviousButton = $(listGroup).find('.dropright');

        $(loadInputButton).on('click', () => {
            bisweb_popoverhandler.dismissPopover();
            let varname = formSelect.val();
            bis_webfileutil.genericFileCallback({
                'title': 'Load input for ' + varname,
                'save': false
            }, (f) => {
                //get module from this.modules by id then set the given input 
                for (let mod of this.modules) {
                    if (mod.id === id) {
                        if (!mod.inputs) { mod.inputs = {}; }
                        mod.inputs[varname] = f;
                        return;
                    }
                }
            });
        });

        $(usePreviousButton).on('click', () => {
            let varname = formSelect.val();
            for (let i = 0; i < this.modules.length; i++) {
                if (this.modules[i].id === id) {
                    let mod = this.modules[i];
                    if (!mod.inputs) { mod.inputs = {}; }

                    //if the previous module has multiple outputs, populate a second dropdown list that contains them. otherwise simply use the only output from the last one.
                    let moduleOutputs =  this.modules[i-1] ? this.modules[i-1].module.getDescription().outputs : null;
                    if (this.modules[i-1] && moduleOutputs.length > 1) {
                        generatePreviousInputsDropdown(i, mod);
                    } else {
                        console.log('module outputs', moduleOutputs);
                        mod.inputs[varname] = moduleOutputs ? moduleOutputs[0] : null;
                        bis_webutil.createAlert('Set output to ' + moduleOutputs[0].varname);
                    }

                    return;
                }
            }
        });
        $(customModule.panel.widget).find('.bisweb-customelement-footer').append(inputsButton);

        let modules = this.modules;
        function generatePreviousInputsDropdown(currentModuleIndex, outputMod, inputVarname) {
            $(usePreviousButton).find('.dropdown-menu').empty();
            let previousModule = modules[currentModuleIndex - 1];
            if (!previousModule) { console.log('Error: no previous module'); return; }

            let inputList = $(popoverContent).find('ul');
            let moduleOutputList = previousModule.module.getDescription().outputs;

            for (let output of moduleOutputList) {
                bis_webutil.createDropdownItem(inputList, output.varname, () => {
                    outputMod.inputs[inputVarname] = output.varname;
                });
            }

            let dropdownMenu = $(usePreviousButton).find('.dropdown-menu');
            dropdownMenu.dropdown('toggle');
            let dropdownDismissFn = (e) => {
                console.log('dismiss fn');
                if (!$.contains(dropdownMenu, e.target)) {
                    console.log('unbinding listener');
                    $(usePreviousButton).find('.dropdown-menu').dropdown('toggle');
                    $(document).off('click', dropdownDismissFn);
                }
                
            };
    
            //attach dismiss listener once popover has finished displaying (otherwise the first click will eat the dismiss function)
            $(dropdownMenu).one('shown.bs.dropdown', () => { console.log('attached listener'); $(document.body).on('click', dropdownDismissFn); });
        }
    }

    /**
     * Adds the 'Add outputs' button to a module with a popover to specify which outputs to save.
     * 
     * @param {String} id - The id of the module to add the output button for.
     */
    addOutputsButton(id, customModule, moduleOutputs) {
        let outputFormSelectId = bis_webutil.getuniqueid();
        let outputsButton = $(`<button type='button' class='btn btn-sm btn-primary' data-toggle='popover' data-placement='right'>Add outputs</button>`);
        let popoverContent = $(
            `<div>
                <div class='form-group'>
                    <label for=${outputFormSelectId}>Select an output</label>
                    <select class='form-control' id=${outputFormSelectId}>
                    </select>
                </div>
                <div class='list-group' style='visibility: hidden'>
                    <a href='#' class='list-group-item list-group-item-action bisweb-list-group-item' style='font-size: 11pt'>Save output</a>
                    <a href='#' class='list-group-item list-group-item-action bisweb-list-group-item' style='font-size: 11pt'>Don't save output</a>
                </div>
            </div>`
        );

        let formSelect = $(popoverContent).find('#' + outputFormSelectId);
        let listGroup = $(popoverContent).find('.list-group');
        formSelect.append(`<option>Select an output...</option>`);
        formSelect.on('change', () => {
            if (formSelect.val() === 'Select an output...') {
                listGroup.css('visibility', 'hidden');
            } else {
                listGroup.css('visibility', 'visible');
            }
        });

        for (let output of moduleOutputs) {
            let option = $(`<option>${output.varname}</option>`);
            formSelect.append(option);
        }

        let saveOutputButton = $(listGroup).find('.list-group-item').get(0);
        let dropOutputButton = $(listGroup).find('.list-group-item').get(1);
    
        $(outputsButton).popover({
            'title': 'Select output source',
            'trigger': 'click',
            'html': true,
            'placement': 'right',
            'container': 'body',
            'content': popoverContent
        });
        $(outputsButton).on( 'click', () => { $(outputsButton).popover('toggle'); });

        let setUseOutput = (useOutput) => {
            bisweb_popoverhandler.dismissPopover();
            let varname = $(formSelect).val();
            for (let mod of this.modules) {
                if (mod.id === id) {
                    if (!mod.outputs) { mod.outputs = {}; }
                    mod.outputs[varname] = useOutput;
                }
            }
        };

        $(saveOutputButton).on('click', () => { setUseOutput(true); console.log('outputs', this.modules); });
        $(dropOutputButton).on('click', () => { setUseOutput(false); console.log('outputs', this.modules); });

        $(customModule.panel.widget).find('.bisweb-customelement-footer').append(outputsButton);
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
     * Adds the 'Remove' and 'File info' buttons under the file list.
     * 
     * @param {JQuery} layout - The layout for the modal.
     */
    addInputListButtons(layout) {
        let infoButton = $(`<button type='button' class='btn-sm btn-link' style='float: right'>
                                <span class='glyphicon glyphicon-info-sign'></span>&nbspFile Info
                            </button>`);

        let removeButton = $(`<button type='button' class='btn-sm btn-link' style='float: right'> 
                                <span class='glyphicon glyphicon-remove'></span>&nbspRemove
                            </button>`);
        
        removeButton.on('click', () => {
            //use partial filename to find the full entry in the internal list
            let inputList = $(layout).find('.bisweb-pipeline-input-list');
            let filename = this.getActiveItemName(inputList);

            if (!filename) { return; }

            let selectedItem = inputList.find('.active');
            let selectedItemIndex = $(selectedItem).index();
            this.pipelineInputs.splice(selectedItemIndex, 1);
            $(selectedItem).remove();
        });

        infoButton.on('click', () => {
            let inputList = $(layout).find('.bisweb-pipeline-input-list');
            let filename = this.getActiveItemName(inputList);

            if (!filename) { return; }

            let selectedItem = inputList.find('.active');
            let fullname = this.pipelineInputs[$(selectedItem).index()];

            this.getFileInfo(fullname).then((info) => {

                //format size to be a readable format 
                let fileSize = info.size, i = 0, fileSizeString;
                while (fileSize > 1024) {
                    fileSize = fileSize / 1024;
                    i = i + 1;
                }

                let suffix = 'B';
                switch (i) {
                    case 1: suffix = 'kB'; break;
                    case 2: suffix = 'MB'; break;
                    case 3: suffix = 'GB'; break;
                    case 4: suffix = 'TB'; break;
                }

                fileSizeString = '' + fileSize + suffix;

                let modalText = `File size: ${fileSizeString}<br>Created: ${info.stats.ctime}<br>Last accessed: ${info.stats.atime}`;
                bootbox.alert(modalText);
            });
        });

        $(this.pipelineModal.body).find('.bisweb-pipeline-input-list').append(removeButton, infoButton);
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
     * Saves the modules to disk, in order, with the parameters the user specified.
     * Also runs the pipeline module and saves a Makefile for the modules specified and an output directory for the files that will be created by it.
     * 
     * @param {String} filename - Name for the pipeline parameters file. 
     */
    savePipelineToDisk(filename) {
        let params = [];
        for (let i = 0; i < this.modules.length; i++) {
            let param = {'name' : this.modules[i].name, 'params' : this.modules[i].module.getVars()};
            if (this.modules[i].inputs) { param['inputs'] = this.modules[i].inputs; }
            if (this.modules[i].outputs) { param['outputs'] = this.modules[i].outputs; }
            params.push(param);
        }

        this.savedParameters = params;
        
        let sep = this.pipelineInputs[0].includes('\\') ? '\\' : '/';
        
        //format the saved modules to use the pipeline creation tool.
        let pipeline = { 
            'command' : 'biswebnode',
            'inputs' : [{
                'name' : 'input',
                'files' : this.pipelineInputs
            }],
            'jobs' : []
        };

        let numOutputs = 0;
        for (let i = 0; i < params.length; i++) {
            let inputName = (numOutputs === 0 ? 'input' : 'out' + numOutputs);
            let entry = {
                'name' : `Command ${i}`,
                'subcommand' : params[i].name,
                'options' : '',
                'outputs' : []
            };

            if (params[i].inputs) { 
                for (let inputKey of Object.keys(params[i].inputs)) {
                    let line = '--' + inputKey, inputVal = params[i].inputs[inputKey];
                    
                    if (typeof inputVal === 'number') {
                        line = line.concat(` %${inputName}% `);
                    } else {
                        line = line.concat(` ${inputVal} `);
                    }

                    entry.options = entry.options.concat(line);
                }
            } else {
                entry.options = entry.options.concat(` --input %${inputName}% `);
            }

            if (params[i].outputs) {
                for (let outputKey of Object.keys(params[i].outputs)) {
                    console.log('output key', outputKey, params[i].outputs[outputKey]);

                    if (params[i].outputs[outputKey]) {
                        numOutputs = numOutputs + 1;
                        let outputName = 'out' + numOutputs;
                        entry.options = entry.options.concat(` --${outputKey} %${outputName}% `);
                        entry.outputs.push({
                            'name' : outputName,
                            'depends' : [], //fill in previous inputs!
                            'naming' : `${params[i].name}_%${inputName}%.nii.gz`
                        });
                    }
                }
            } else { //default flow for single-output modules
                numOutputs = numOutputs + 1;
                let outputName = 'out' + numOutputs;
                entry.options = entry.options.concat(` --output %${outputName}% `);
                entry.outputs.push({
                    'name' : outputName,
                    'depends' : [ `%${inputName}%`],
                    'naming' : `${params[i].name}_%${inputName}%.nii.gz`
                });
            }

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
            if (bis_genericio.getenvironment() === 'browser') {
                bisweb_serverutils.runPipelineModule({ 'input' : filename, 'output' :  outputFilename, 'odir' : odirFilename }, true).then( () => {
                    bis_webutil.createAlert('Pipeline Makefile created.');
                });
            } else if (bis_genericio.getenvironment !== 'browser') { //TODO: test this!
                //node-only code is kept separate from the more pure web codebase
                //so in order to run it we have to invoke the command through the command line
                let command = `biswebnode pipeline --input ${filename} --output ${outputFilename} --odir ${odirFilename}`;
                let child_process = bis_genericio.getchildprocessmodule();
                child_process.exec(command);
            } else {
                bis_webutil.createAlert('Cannot run pipeline in browser with no fileserver defined. Please select the fileserver option if you want to perform this operation', null, true);
            }
            
        });
    }

    /**
     * Imports a filename or set of filenames from disk and returns them to be listed in the modal.
     * 
     * @param {String} f - A filename or a set of filenames.
     * @returns The set of filenames.
     */
    importInputsFromDisk(f) {
        //some contexts may return a single string split by commas, so we reformat it to avoid multiple parsings
        if (typeof f === 'string') { f = f.split(','); }
        
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
}

//Adds 'bisweb-centered-customelement' class to custom element
let centerCustomElement = (widget) => { 
    $(widget).find('.bisweb-customelement-body').addClass('bisweb-centered');
    $(widget).find('.bisweb-customelement-footer').addClass('bisweb-centered');
};

bis_webutil.defineElement('bisweb-filetreepipeline', FileTreePipeline);
module.exports = FileTreePipeline;
