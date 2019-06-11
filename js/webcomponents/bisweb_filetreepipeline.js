const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
const bis_bidsutils = require('bis_bidsutils.js');

const bisweb_taskutils = require('bisweb_taskutils.js');
const bisweb_matrixutils = require('bisweb_matrixutils.js');

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

        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let graphelementid = this.getAttribute('bis-graphelementid');
        let filetreeid = this.getAttribute('bis-filetreepanelid');
        let algocontrollerid = this.getAttribute('bis-algocontrollerid');

        bis_webutil.runAfterAllLoaded( () => {
            this.graphelement = document.querySelector(graphelementid);
            this.layout = document.querySelector(layoutid);      
            this.filetree = document.querySelector(filetreeid);
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
                <!--div id='bisweb-panel-pipeline'>
                    <label>Pipeline Tools</label><br>
                </div--> 
            </div>
        `);


        body.append(panelBody);

        let taskButtonBar = this.createTaskElements();
        panelBody.find('#bisweb-panel-tasks').append(taskButtonBar);

        let pipelineButtonBar = this.createPipelineElements();
        panelBody.find('#bisweb-panel-pipeline').append(pipelineButtonBar);

        this.panel = body;
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

        let convertTSVButton = bis_webfileutil.createFileButton({ 
            'name': 'Convert task file to .tsv', 
            'type' : 'primary', 
            'callback': (f) => {
                this.createTSVParseModal(f);
            },
        },
            {
                'title': 'Choose task file',
                'filters': [
                    { 'name': 'Task Files', extensions: ['json'] }
                ],
                'suffix': 'json',
                'save': false,
            }
        );

        let convertTasksButton = bis_webfileutil.createFileButton({
            'name' : 'Convert .tsvs to task file',
            'type' : 'info',
            'callback' : (f) => {
                let saveFileCallback = (o) => { 
                    bootbox.prompt({
                        'size' : 'small',
                        'title' : 'Enter the TR for the study',
                        'input' : 'number',
                        'callback' : (result) => {
                            bis_bidsutils.parseTaskFileFromTSV(f, o, result);
                        }  
                    });

                };
                    
                setTimeout( () => {
                    bis_webfileutil.genericFileCallback( 
                        {
                            'title' : 'Choose output directory',
                            'filters' : 'DIRECTORY',
                            'save' : false
                        }, saveFileCallback);
                }, 1);
            }
        },
            {
                'title' : 'Choose directory containing .tsv files',
                'filters' : 'DIRECTORY',
                'save' : false
            }
        );

        
        plotTasksButton.addClass('bisweb-load-enable');
        plotTasksButton.prop('disabled', 'true');

        taskButtonBar.append(importTaskButton);
        taskButtonBar.append(clearTaskButton);
        taskButtonBar.append(plotTasksButton);
        taskButtonBar.append(convertTSVButton);
        taskButtonBar.append(convertTasksButton);


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

            let pipelineModal = bis_webutil.createmodal('Create a pipeline');
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

                            //modal is centered to 50% of the width of the modal, so size it to this too
                            let width = pipelineModal.body.width() / 2;
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

    /**
     * Loads the data for each task from a file on disk. 
     * Turns a JSON file into an array of 1's and zeroes denoting regions of task and rest.
     * 
     * @param {String} name - The name of the task file.
     */
    loadStudyTaskData(name) {

        //declared here so they can be accessed by the functions below
        let offset, tr;

        bisweb_taskutils.parseFile(name).then( (data) => {

            let chartRanges = data.range;
            offset = data.offset, tr = data.tr;

            //parse ranges into 0 and 1 array
            let parsedRuns = data.runs, parsedRanges = [], labelsArray = [], tasks = [], taskNames = {}, range;
            for (let run of Object.keys(parsedRuns)) {

                //change label to match the format of the other labels, e.g. 'task_1' instead of 'task1'
                let reformattedRun = run.replace(/(\d)/, (match, m1) => { return '_' + m1; });

                range = createArray(parsedRuns[run], chartRanges);
                parsedRanges.push(range);
                labelsArray.push(reformattedRun);

                //parse regions into their own array 
                let regions = {};
                for (let region of Object.keys(parsedRuns[run])) {
                    if (!taskNames[region]) { taskNames[region] = true; }
                    regions[region] = createArray(parsedRuns[run][region], chartRanges);
                }

                parsedRuns[run].parsedRegions = regions;
                tasks.push({ 'data': range, 'label': reformattedRun, 'regions': data.rawdata.runs[run] });
            }

            //array to designate that all the arrays are meant to be included while formatting data
            let includeArray = new Array(parsedRanges.length).fill(1);
            let blockChart = this.graphelement.formatChartData(parsedRanges, includeArray, labelsArray, false, false);

            //set the task range for the graph element to use in future images
            let alphabetizedTaskNames = Object.keys(taskNames).sort();
            let taskMatrixInfo = bisweb_matrixutils.parseTaskMatrix(parsedRuns, alphabetizedTaskNames);

            console.log('matrix', taskMatrixInfo.matrix);
            let stackedWaveform = bisweb_matrixutils.createStackedWaveform(taskMatrixInfo.matrix, tasks.length, tr, 2);

            let taskObject = { 'formattedTasks': tasks, 'rawTasks': data.rawdata, 'matrix': taskMatrixInfo.matrix, 'stackedWaveform': stackedWaveform };
            this.graphelement.taskdata = taskObject;

            //matrixes are stacked on top of each other for each scanner run in alphabetical order, so slice them up to parse
            let numericStackedWaveform = stackedWaveform.getNumericMatrix();

            let slicedMatrices = [], runLength = numericStackedWaveform.length / taskMatrixInfo.runs.length;
            for (let i = 0; i < taskMatrixInfo.runs.length; i++) {
                let matrixSlice = numericStackedWaveform.slice(i * runLength, (i + 1) * runLength);
                slicedMatrices.push(matrixSlice);
            }

            //construct charts array from matrix where each entry is the HDRF-convolved chart for each task (e.g. motor, visual, etc)
            //note that sliced matrices are already in alphabetical order by run
            let taskChartLabelsArray = taskMatrixInfo.runs, HDRFCharts = {}, taskCharts = {};
            for (let k = 0; k < alphabetizedTaskNames.length; k++) {
                let key = alphabetizedTaskNames[k];
                key = key + '_hdrf';
                HDRFCharts[key] = [];
                for (let i = 0; i < slicedMatrices.length; i++) {
                    HDRFCharts[key].push([]);
                    for (let j = 0; j < slicedMatrices[i].length; j++) {
                        HDRFCharts[key][HDRFCharts[key].length - 1].push(slicedMatrices[i][j][k]);
                    }
                }
            }

            for (let key of Object.keys(HDRFCharts)) {

                //exclude plots of all zeroes
                let includeArray = [];
                for (let i = 0; i < HDRFCharts[key].length; i++)
                    if (HDRFCharts[key][i].every((element) => { return element === 0; })) {
                        includeArray.push(0);
                    } else {
                        includeArray.push(1);
                    }

                HDRFCharts[key] = this.graphelement.formatChartData(HDRFCharts[key], includeArray, taskChartLabelsArray, false, false);
            }

            //now construct non-HDRF matrices
            for (let regionKey of Object.keys(taskNames)) {
                let regions = {};
                for (let key of Object.keys(parsedRuns)) {
                    if (parsedRuns[key].parsedRegions[regionKey]) {
                        regions[key] = parsedRuns[key].parsedRegions[regionKey];
                    }
                }
                let labelsArray = Object.keys(regions).sort(), regionsArray = [];
                console.log('regions', regions);
                for (let i = 0; i < labelsArray.length; i++) { regionsArray.push(regions[labelsArray[i]]); }
                taskCharts[regionKey] = this.graphelement.formatChartData(regionsArray, new Array(labelsArray.length).fill(1), labelsArray, false, false);
            }

            taskCharts = Object.assign(taskCharts, HDRFCharts);
            taskCharts['block_chart'] = blockChart;

            this.graphelement.createChart({
                'xaxisLabel': 'frame',
                'yaxisLabel': 'On',
                'isFrameChart': true,
                'charts': taskCharts,
                'makeTaskChart': false,
                'displayChart': 'block_chart',
                'chartType': 'line',
                'chartSettings': {
                    'optionalCharts': Object.keys(HDRFCharts)
                }
            });
        });


        //Creates an array of 1's and 0's designating whether the task is on or off from either the list of task regions in a run or a single task region in a run
        function createArray(run, chartRange) {
            let taskArray = new Array(chartRange.highRange).fill(0);

            console.log('run', run);
            //the data for each individual run will be formatted as an array while the structure for each task will be an object
            if (Array.isArray(run)) {
                if (Array.isArray(run[0])) {
                    for (let item of run) {
                        addToArray(item);
                    }
                } else {
                    addToArray(run);
                }
            } else if (typeof run === 'object') {
                let keys = Object.keys(run);
                for (let task of keys) {
                    if (Array.isArray(run[task][0])) {
                        for (let item of run[task])
                            addToArray(item);
                    } else {
                        addToArray(run[task]);
                    }
                }
            } else {
                console.log('unrecognized run object', run);
            }

            //take the offset from the front before returning
            taskArray = taskArray.slice(offset);
            //console.log('task array', taskArray);
            return taskArray;

            function addToArray(range) {
                for (let i = range[0]; i < range[1]; i++) {
                    taskArray[i] = 1;
                }
            }
        }
    }

    createTSVParseModal(f) {
        bootbox.confirm({
            'message' : 'Overwrite any existing .tsv files with ones parsed from ' + f + '?',
            'buttons' : {
                'confirm' : {
                    'label' : 'Yes',
                    'className' : 'btn-success'
                },
                'cancel' : {
                    'label' : 'No', 
                    'className' : 'btn-danger'
                }
            },
            'callback' : (result) => {
                if (result) {
                    let baseDirectory = this.filetree.baseDirectory;
                    bis_bidsutils.parseTaskFileToTSV(f, baseDirectory).then( () => {
                        bis_webutil.createAlert('Task parse successful. Please ensure that these files match what you expect!');
                    });
                }
            }
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
