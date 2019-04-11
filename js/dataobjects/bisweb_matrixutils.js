'use strict';

const BiswebMatrix = require('bisweb_matrix.js');

const WAVDelayTime = 2.0;
const WAVRiseTime = 4.0; 
const WAVFallTime = 6.0; 
const WAVUndershoot = 0.2;
const WAVRestoreTime = 2.0;
const peak = 1.0;
let tr = 1.0;

/**
 * Creates the matrix of task regions convolved with the hemodynamic response function. 
 * 
 * @param {BiswebMatrix} matrix - Matrix representing the task regions of a given set of runs. 
 * @param {Array} breaks - Array designating where each 'break' in the matrix is, i.e. where each run begins and ends.
 */
let createStackedWaveform = (matrix, breaks) => {

};

/**
 * Convolves a single scanner run with the hemodynamic response function and returns the result. 
 * 
 * @param {BiswebMatrix} task - The matrix corresponding to a single run in a matrix of all runs 
 */
let createWaveform = (task) => {

    task = [0,0,0,0,1,1,1,1,0,0];
    let hdrf = generateHDRF(tr);

    console.log('hdrf', hdrf);

};

/**
 * Returns the hemodynamic response function used in these calculations (WAV)
 * 
 * @param {Number} tr - Time of repetition for the scanner (scanner period), i.e. how many seconds per image taken by the scanner. Used as the width for the HDRF.
 */
let generateHDRF = (tr) => {
    let WAVRiseStart = WAVDelayTime; 
    let WAVFallStart = WAVRiseStart + WAVRiseTime;
    let WAVFallEnd = WAVFallStart + WAVFallTime;
    let WAVRestoreEnd = WAVFallEnd + WAVRestoreTime; 

    let WAVDuration = WAVDelayTime + WAVRiseTime + WAVFallTime +  (WAVUndershoot !== 0 ? WAVRestoreTime : 0);
    let nPoints = 1 + Math.ceil(WAVDuration / tr);

    let WAVArray = [];
    for (let i = 0; i < nPoints; i++) {
        WAVArray.push( [i, peak * getTimepoint(tr * i)]);
    }

    return WAVArray; 

    function getTimepoint(t) {
        if (t < WAVRiseStart) return 0; 
        if (t < WAVFallStart) return ztone( (t - WAVRiseStart) / WAVRiseTime );
        if (t < WAVFallEnd) return  (1 + WAVUndershoot) * ztone( (WAVFallEnd - t)/WAVFallTime) - WAVUndershoot; 
        if (t < WAVRestoreEnd) return (WAVUndershoot * -1) * ztone( (WAVRestoreEnd - t) / WAVRestoreTime);
        return 0;
    }

    //Function that transitions from 0 to 1 over input x in [0,1]
    function ztone(x) {
        const pi = 3.14159265358979323846;
        const zt_fac = 0.50212657;
        const zt_add = 0.99576486;

        if (x <= 0) return 0;
        if (x >= 1) return 1.0; 
        let y = (0.5 * pi) * (1.6 * x - 0.8);

        return zt_fac * ( Math.tanh(Math.tan(y)) + zt_add);
    }
};

module.exports = {
    createStackedWaveform : createStackedWaveform,
    createWaveform : createWaveform,
    generateHDRF : generateHDRF
};