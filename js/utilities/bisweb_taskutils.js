//TODO: Strip the matrix parsing stuff out of filetree pipeline so I can write regression tests
'use strict'; 

const bis_genericio = require('bis_genericio.js');
/**
 * Parses an entry in a .json formatted task file into a tuple of values. 
 * 
 * @param {String|Array} entry -  A single entry in the task file. If it's an array, parseEntry will be called on every element.
 * @param {Object} range - Object containing the range of values seen by whatever context is calling parseEntry. 
 * @returns The parsed tuple. 
 */
let parseEntry = (entry, range) => {

    if (Array.isArray(entry)) {
        let entryArray = [];
        for (let item of entry)
            entryArray.push(parseEntry(item, range));

        return entryArray;
    }

    let entryRange = entry.split('-');
    for (let i = 0; i < entryRange.length; i++) { entryRange[i] = parseInt(entryRange[i]); }

    if (range.lowRange < 0 || range.lowRange > entryRange[0]) { range.lowRange = entryRange[0]; }
    if (range.highRange < entryRange[1]) { range.highRange = entryRange[1]; }

    return entryRange;
};

let parseFile = (filename) => {
    return new Promise( (resolve, reject) => {
        let chartRanges = { 'lowRange' : -1, 'highRange' : -1}, parsedData, parsedRuns = {};
        bis_genericio.read(filename, false).then((obj) => {

            //parse raw task data
            try {
                parsedData = JSON.parse(obj.data);
                let runs = Object.keys(parsedData.runs);

                for (let run of runs) {

                    //parse data for each run
                    let tasks = Object.keys(parsedData.runs[run]);
                    for (let task of tasks) {
                        let range = parsedData.runs[run][task];
                        if (!parsedRuns[run]) { parsedRuns[run] = {}; }
                        parsedRuns[run][task] = parseEntry(range, chartRanges);
                    }
                }
            } catch(e) {
                console.log('An error occured in parseFile', e);
                reject(e);
            }

            //return results with relevant metadata
            let tr = parseInt(obj.data.tr), offset = parseInt(obj.data.offset), frames = parseInt(obj.data.frames);
            if (frames && frames < chartRanges.highRange) { chartRanges.highRange = frames; }

            let tasks = parseRegionsFromRuns(parsedRuns, chartRanges, parsedData, offset);
            let resObj = Object.assign(tasks, { 'runs' : parsedRuns, 'range' : chartRanges, 'tr' : tr, 'offset' : offset });
            resolve(resObj);
        }).catch( (e) => { reject(e); });
    });
};

let parseRegionsFromRuns = (runs, chartRange, rawdata, offset) => {
    let parsedRanges = [], labelsArray = [], tasks = [], taskNames = {}, range;
    for (let run of Object.keys(runs)) {

        //change label to match the format of the other labels, e.g. 'task_1' instead of 'task1'
        let reformattedRun = run.replace(/(\d)/, (match, m1) => { return '_' + m1; });

        range = createArray(runs[run], chartRange);
        parsedRanges.push(range);
        labelsArray.push(reformattedRun);

        //parse regions into their own array 
        let regions = {};
        for (let region of Object.keys(runs[run])) {
            if (!taskNames[region]) { taskNames[region] = true; }
            regions[region] = createArray(runs[run][region], chartRange);
        }

        runs[run].parsedRegions = regions;
        tasks.push({ 'data': range, 'label': reformattedRun, 'regions': rawdata.runs[run] });
    }

    return { 'taskArrays' : parsedRanges, 'taskLabels' : labelsArray, 'formattedTasks' : tasks, 'taskNames' : Object.keys(taskNames).sort() };

    //Creates an array of 1's and 0's designating whether the task is on or off from either the list of task regions in a run or a single task region in a run
    function createArray(run, chartRange) {
        let taskArray = new Array(chartRange.highRange).fill(0);

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
};

module.exports = {
    parseEntry : parseEntry,
    parseFile : parseFile
};