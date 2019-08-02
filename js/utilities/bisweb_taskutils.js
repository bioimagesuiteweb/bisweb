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
            entryArray.push(parseEntry(item, range)[0]); //parse entry returns an array of arrays by default, so unwrap it in this case

        return entryArray;
    }

    let entryRange = entry.split('-');
    for (let i = 0; i < entryRange.length; i++) { entryRange[i] = parseInt(entryRange[i]); }

    if (range.lowRange < 0 || range.lowRange > entryRange[0]) { range.lowRange = entryRange[0]; }
    if (range.highRange < entryRange[1]) { range.highRange = entryRange[1]; }

    return [entryRange];
};

/**
 * Parses a .biswebtask file, then formats and stores the contents in memory to use for future plotting tasks. Also displays the tasks on screen.
 * 
 * @param {String|Object} taskfile - The name of a task file to be loaded from disk, or an already parsed array of runs to be formatted further.
 * @returns A promise resolving the fully-formatted 
 */
let parseFile = (taskfile) => {

    return new Promise( (resolve, reject) => {

        let formatJson = (parsedData) => {
            let chartRanges = { 'lowRange' : -1, 'highRange' : -1}, parsedRuns = {};
            
            //parse raw task data
            try {
                console.log('parsed data', parsedData);
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
                return;
            }
    
            //return results with relevant metadata
            let offset = parsedData.offset || 0;
            let frames = parsedData.frames || null;
            if (parseInt(frames) && parseInt(frames) < chartRanges.highRange) { chartRanges.highRange = parseInt(frames); }
            
            let tasks = parseRegionsFromRuns(parsedRuns, chartRanges, parsedData, offset);
            let resObj = Object.assign(tasks, { 'runs' : parsedRuns, 'range' : chartRanges, 'offset' : offset });
            resolve(resObj);
        };

        if (typeof taskfile !== 'string') { formatJson(taskfile); return; }

        bis_genericio.read(taskfile, false).then( (obj) => {
            let parsedJSON;
            try {
                parsedJSON = JSON.parse(obj.data);
            } catch (e) {
                console.log('An error occured while parsing JSON from disk', e);
                reject(e);
            }

            formatJson(parsedJSON);

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
        if (Array.isArray(run) && Array.isArray(run[0])) {
            for (let item of run) 
                addToArray(item);
        } else if (Array.isArray(run) && typeof run[0] === 'number') {
            addToArray(run);
        } else if (typeof run === 'object') {
            let keys = Object.keys(run);
            for (let task of keys) {
                for (let item of run[task])
                    addToArray(item);
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
