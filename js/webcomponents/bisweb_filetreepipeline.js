const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');

const moduleIndex = require('moduleindex.js');
const bisweb_custommodule = require('bisweb_custommodule.js');

const bootbox = require('bootbox');
const $ = require('jquery');

class FileTreePipeline extends HTMLElement {
    
    constructor() {
        super();
        this.panel = null;
        this.pipelineModal = null;
        this.modules = [];
        this.savedParameters = null;
    }

    connectedCallback() {

        let algocontrollerid = this.getAttribute('bis-algocontrollerid');
        bis_webutil.runAfterAllLoaded( () => {
            this.algocontroller = document.querySelector(algocontrollerid);
        });
    }
    
    /**
     * Creates the collapsible HTML element inside a parent object, most typically the left sidebar.
     *  
     * @param {HTMLElement|JQueryElement} parent - The parent element in which to render the menu.
     */
    createPanel(parent) {
        let body = bis_webutil.createCollapseElement(parent, 'Study Tools', false);

        let panelBody = $(`
            <div>
                <div id='bisweb-panel-tasks'>
                    <label>Tasks</label><br>
                </div>
                <div id='bisweb-panel-pipeline'>
                    <label>Pipeline Tools</label><br>
                </div> 
            </div>
        `);

       
        body.append(panelBody);

        let taskButtonBar = this.createTaskElements();
        panelBody.find('#bisweb-panel-tasks').append(taskButtonBar);

        let pipelineButtonBar = this.createPipelineElements();
        panelBody.find('#bisweb-panel-pipeline').append(pipelineButtonBar);
        console.log('panel body', panelBody.find('#bisweb-panel-pipeline'));
        
    }

    /**
     * Create the set of buttons used to manage loading and clearing task files. 
     */
    createTaskElements() {

        let taskButtonBar = bis_webutil.createbuttonbar();

        let importTaskButton = bis_webfileutil.createFileButton({
            'type': 'info',
            'name': 'Import task file',
            'callback': (f) => {
                this.graphelement.chartInvokedFrom = 'task';
                this.loadStudyTaskData(f);
            },
        },
            {
                'title': 'Import task file',
                'filters': [
                    { 'name': 'Task Files', extensions: ['json'] }
                ],
                'suffix': 'json',
                'save': false,
            });

        let clearTaskButton = bis_webutil.createbutton({ 'name': 'Clear tasks', 'type': 'primary' });
        clearTaskButton.on('click', () => {
            bootbox.confirm({
                'message': 'Clear loaded task data?',
                'buttons': {
                    'confirm': {
                        'label': 'Yes',
                        'className': 'btn-success'
                    },
                    'cancel': {
                        'label': 'No',
                        'className': 'btn-danger'
                    }
                },
                'callback': (result) => {
                    if (result) { this.graphelement.taskdata = null; }
                }
            });
            this.graphelement.taskdata = null;
        });

        let plotTasksButton = bis_webutil.createbutton({ 'name': 'Plot task charts', 'type': 'info' });
        plotTasksButton.on('click', () => {
            this.graphelement.chartInvokedFrom = 'task';
            this.filetree.parseTaskImagesFromTree();
        });

        let drawingInterfaceButton = bis_webutil.createbutton({ 'name' : 'Open drawing interface', 'type' : 'primary' });
        drawingInterfaceButton.on('click', () => {
            this.startDrawingInterface();
        });
        
        plotTasksButton.addClass('bisweb-load-enable');
        plotTasksButton.prop('disabled', 'true');

        taskButtonBar.append(importTaskButton);
        taskButtonBar.append(clearTaskButton);
        taskButtonBar.append(plotTasksButton);
        taskButtonBar.append(drawingInterfaceButton);

        return taskButtonBar;
    }

    createPipelineElements() {
        let pipelineButtonBar = bis_webutil.createbuttonbar();

        let pipelineCreationButton = bis_webutil.createbutton({ 'name' : 'Create pipeline', 'type' : 'info'});
        pipelineCreationButton.on('click', () => {
            this.openPipelineCreationModal();
        });

        let pipelineBody = $(`<div></div>`);
        let pipelineTable = $(`
            <ul class='list-group bisweb-pipeline-list'>
            </ul>
        `);

        pipelineButtonBar.append(pipelineCreationButton);
        pipelineBody.append(pipelineButtonBar);
        pipelineBody.append(pipelineTable);

        return pipelineBody;
    }

    openPipelineCreationModal() {
        if (!this.pipelineModal) {

            let pipelineModal = bis_webutil.createmodal('Create a pipeline', 'modal-lg');
            pipelineModal.footer.empty();

            let addModuleButton = bis_webutil.createbutton({ 'name' : 'Add module', 'type' : 'success' });
            let saveModulesButton = bis_webutil.createbutton({ 'name' : 'Save pipeline', 'type' : 'primary'});
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

                            let width = pipelineModal.body.width() / 4;
                            let customModule = bisweb_custommodule.createCustom(null, this.algocontroller, mod, { 'numViewers': 0, 'dual' : false, 'paramsMargin' : '5px', 'buttonsMargin' : '0px', 'width' : width });
                            customModule.createOrUpdateGUI({ 'width' : width });
                            centerCustomElement($(customModule.panel.widget));

                            this.modules.push({ 'name' : moduleName, 'module' : customModule});

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
                            let id = bis_webutil.getuniqueid();
                            let moduleLabel = $(`<span>${prettyModuleName}</span>`);

                            $(customModule.panel.widget).find('.bisweb-customelement-footer').append(removeButton);
                            $(customModule.panel.widget).prepend(moduleLabel);
                            $(customModule.panel.widget).attr('id', id);
                            pipelineModal.body.append(customModule.panel.widget);
                        }
                    }
                });
            });

            saveModulesButton.on('click', () => {
                let params = [];
                $('.bisweb-pipeline-list').empty();
                for (let i = 0; i < this.modules.length; i++) {
                    let param = {'name' : this.modules[i].name, 'params' : this.modules[i].module.getVars()};
                    params.push(param);

                    //update pipeline list 
                    let moduleName = moduleIndex.getModule(this.modules[i].name).getDescription().name;
                    let listItem = this.createPipelineListItem(moduleName);
                    $('.bisweb-pipeline-list').append(listItem);
                }

                this.savedParameters = params;
                pipelineModal.dialog.modal('hide');

                bis_webutil.createAlert('Pipeline saved.');
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
            this.pipelineModal = pipelineModal;
        }

        this.pipelineModal.dialog.modal('show');
    }

    /**
     * Creates a list item to represent an entry in the current saved pipeline. 
     * 
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
            console.log('width', width);
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
            console.log('module', this.modules[index]);
            modal.dialog.modal('hide');
        });

        let closeButton = bis_webutil.createButton({ 'name' : 'Close'});
        closeButton.on('click', () => {
            modal.dialog.modal('hide');
        });

        modal.footer.prepend(saveButton);
        modal.dialog.modal('show');
    }

    

    /** parseTaskMatrix(taskdata, taskNames) {
        let taskMatrix = new BiswebMatrix();
        let cols = taskNames.length;

        let runNames = Object.keys(taskdata);
        let randomRun = taskdata[runNames[0]].parsedRegions;
        let numRuns = runNames.length, runLength = randomRun[Object.keys(randomRun)[0]].length;
        let rows = numRuns * runLength; // runs get appended as extra rows, so there should be a set of rows for every run

        //sort run names so tasks are created in order
        runNames.sort((a, b) => {
            let aIndex = a.split('_')[1], bIndex = b.split('_')[1];
            if (aIndex && !bIndex) { return a; }
            if (bIndex && !aIndex) { return b; }
            if (!aIndex && !bIndex) { return a.localeCompare(b); }
            else { return aIndex - bIndex; }
        });

        taskMatrix.allocate(rows, cols);
        let currentRun;
        for (let i = 0; i < rows; i++) {
            currentRun = runNames[Math.floor(i / runLength)];
            for (let j = 0; j < cols; j++) {
                //some runs will not have every task defined. in that case just set the entry in the appropriate col to 0;
                let taskArray = taskdata[currentRun].parsedRegions[taskNames[j]];
                let datapoint = taskArray ? taskArray[i % runLength] : 0;
                taskMatrix.setElement(i, j, datapoint);
            }
        }

        return { 'matrix': taskMatrix, 'runs': runNames };
    } */
}

//Adds 'bisweb-centered-customelement' class to custom element
let centerCustomElement = (widget) => { 
    $(widget).find('.bisweb-customelement-body').addClass('bisweb-centered');
    $(widget).find('.bisweb-customelement-footer').addClass('bisweb-centered');
};

bis_webutil.defineElement('bisweb-filetreepipeline', FileTreePipeline);
module.exports = FileTreePipeline;
