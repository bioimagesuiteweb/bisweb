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
            let tr = parseInt(obj.data.tr), units = parseInt(obj.data.units), offset = parseInt(obj.data.offset), frames = parseInt(obj.data.frames);
            if (frames && frames < chartRanges.highRange) { chartRanges.highRange = frames; }

            resolve({ 'runs' : parsedRuns, 'range' : chartRanges, 'tr' : tr, 'units' : units, 'offset' : offset, 'rawdata' : parsedData });
        }).catch( (e) => { reject(e); });
    });
};

module.exports = {
    parseEntry : parseEntry,
    parseFile : parseFile
};