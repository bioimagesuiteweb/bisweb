const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
const bisweb_matrixutils = require('bisweb_matrixutils.js');
const BiswebMatrix = require('bisweb_matrix.js');

const bootbox = require('bootbox');

class FileTreePipeline extends HTMLElement {
    
    constructor() {
        super();
        this.panel = null;
    }

    connectedCallback() {

        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let graphelementid = this.getAttribute('bis-graphelementid');
        let filetreeid = this.getAttribute('bis-filetreepanelid');
        bis_webutil.runAfterAllLoaded( () => {
            this.graphelement = document.querySelector(graphelementid);
            this.layout = document.querySelector(layoutid);      
            this.filetree = document.querySelector(filetreeid);

            console.log('file tree', filetreeid);
        });
    }
    
    /**
     * Creates the collapsible HTML element inside a parent object, most typically the left sidebar.
     *  
     * @param {HTMLElement|JQueryElement} parent - The parent element in which to render the menu.
     */
    createPanel(parent) {
        let body = bis_webutil.createCollapseElement(parent, 'Study Tools', false);
        let taskButtonBar = this.createTaskButtons();

        body.append(taskButtonBar);
    }

    /**
     * Create the set of buttons used to manage loading and clearing task files. 
     */
    createTaskButtons() {

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
        
        plotTasksButton.addClass('bisweb-load-enable');
        plotTasksButton.prop('disabled', 'true');

        taskButtonBar.append(importTaskButton);
        taskButtonBar.append(clearTaskButton);
        taskButtonBar.append(plotTasksButton);


        return taskButtonBar;
    }

    /**
     * Loads the data for each task from a file on disk. 
     * Turns a JSON file into an array of 1's and zeroes denoting regions of task and rest.
     * 
     * @param {String} name - The name of the task file.
     */
    loadStudyTaskData(name) {

        let lowRange = -1, highRange = -1, parsedData;
        bis_genericio.read(name, false).then((obj) => {

            //parse raw task data
            try {
                parsedData = JSON.parse(obj.data);
                let runs = Object.keys(parsedData.runs);

                //parsedRuns is the new 
                let parsedRuns = {};
                for (let key of runs) {

                    //parse data for each run
                    let tasks = Object.keys(parsedData.runs[key]);
                    for (let task of tasks) {
                        let range = parsedData.runs[key][task];
                        if (!parsedRuns[key]) { parsedRuns[key] = {}; }
                        parsedRuns[key][task] = parseEntry(range);
                    }
                }

                let maxFrames = parseInt(parsedData['frames']);
                if (maxFrames) { highRange = maxFrames; }

                //parse ranges into 0 and 1 array
                let parsedRanges = [], labelsArray = [], tasks = [], taskNames = {}, range;
                for (let run of Object.keys(parsedRuns)) {

                    //change label to match the format of the other labels, e.g. 'task_1' instead of 'task1'
                    let reformattedRun = run.replace(/(\d)/, (match, m1) => { return '_' + m1; });

                    range = createArray(parsedRuns[run]);
                    parsedRanges.push(range);
                    labelsArray.push(reformattedRun);

                    //parse regions into their own array 
                    let regions = {};
                    for (let region of Object.keys(parsedRuns[run])) {
                        if (!taskNames[region]) { taskNames[region] = true; }
                        regions[region] = createArray(parsedRuns[run][region]);
                    }

                    parsedRuns[run].parsedRegions = regions;
                    tasks.push({ 'data': range, 'label': reformattedRun, 'regions': parsedData.runs[run] });
                }

                //array to designate that all the arrays are meant to be included while formatting data
                let includeArray = new Array(parsedRanges.length).fill(1);
                let blockChart = this.graphelement.formatChartData(parsedRanges, includeArray, labelsArray, false, false);

                //set the task range for the graph element to use in future images
                let alphabetizedTaskNames = Object.keys(taskNames).sort();
                let taskMatrixInfo = this.parseTaskMatrix(parsedRuns, alphabetizedTaskNames);

                console.log('matrix', taskMatrixInfo.matrix);
                let tr = parseInt(parsedData['TR']);
                let stackedWaveform = bisweb_matrixutils.createStackedWaveform(taskMatrixInfo.matrix, tasks.length, tr, 2);

                let taskObject = { 'formattedTasks': tasks, 'rawTasks': parsedData, 'matrix': taskMatrixInfo.matrix, 'stackedWaveform': stackedWaveform };
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

                console.log('HDRF charts', HDRFCharts);
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
                    'chartSettings' : {
                        'optionalCharts' : Object.keys(HDRFCharts)
                    }
                });

            } catch (e) {
                console.log('An error occured while parsing the task file', e);
            }
        });

        function parseEntry(entry) {

            if (Array.isArray(entry)) {
                let entryArray = [];
                for (let item of entry)
                    entryArray.push(parseEntry(item));

                return entryArray;
            }

            let range = entry.split('-');
            for (let i = 0; i < range.length; i++) { range[i] = parseInt(range[i]); }

            if (lowRange < 0 || lowRange > range[0]) { lowRange = range[0]; }
            if (highRange < range[1]) { highRange = range[1]; }

            return range;
        }

        //Creates an array of 1's and 0's designating whether the task is on or off from either the list of task regions in a run or a single task region in a run
        function createArray(run) {
            let taskArray = new Array(highRange).fill(0);

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
            taskArray = taskArray.slice(parsedData.offset);
            return taskArray;

            function addToArray(range) {
                for (let i = range[0]; i <= range[1]; i++) {
                    taskArray[i] = 1;
                }
            }
        }
    }

    parseTaskMatrix(taskdata, taskNames) {
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
    }


}

bis_webutil.defineElement('bisweb-filetreepipeline', FileTreePipeline);
module.exports = FileTreePipeline;
