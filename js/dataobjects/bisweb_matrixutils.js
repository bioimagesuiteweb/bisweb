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
 * @param {Number} runs - Number of runs in the matrix. 
 * @param {Number} period - TR for the scan, i.e. number of seconds per scanner picture (period).
 * @returns BiswebMatrix containing the stacked waveform. 
 */
let createStackedWaveform = (matrix, runs, period) => {

    tr = period;
    let numericMatrix = matrix.getNumericMatrix();

    let runLength = numericMatrix.length / runs;
    let constructedMatrix = [];
    for (let i = 0; i < runs; i++) {
        constructedMatrix = constructedMatrix.concat(createWaveform(numericMatrix.slice(i * runLength, (i + 1) * runLength)));
    }

    let matOut = new BiswebMatrix();
    matOut.setFromNumericMatrix(constructedMatrix);
    return matOut ;
};

/**
 * Convolves a single scanner run with the hemodynamic response function and returns the result. 
 * 
 * @param {Array} task - Array corresponding to a single run in a matrix of all runs.
 */
let createWaveform = (task) => {

    //console.log('task', task);
    let responseFunc = generateHDRF(tr);
    
    let outPoints = task.length +  responseFunc.length; 
    let out = [];
    for (let row = 0; row < outPoints; row++){
        out.push(Array(task[0].length).fill(0));
    }
        
    for (let col = 0; col < task[0].length; col++) {
        for (let j = 0; j < task.length; j++) {
            let val = task[j][col];
            if (val === 0 || Math.abs(val) >= 33333.0) {
                continue;
            }

            for (let i = 0; i < responseFunc.length && (i + j) < outPoints; i++) {
                out[i+j][col] = out[i+j][col] + responseFunc[i] * val;
            }
        }

        for (let j = 0; j < task.length; j++) {
            let val = task[j][col];
            if ( Math.abs(val) >= 33333.0 ) {
                out[col][j] = 99999.0;
            }
        }
    } 

    return out;
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
        WAVArray.push( peak * getTimepoint(tr * i));
    }

    return WAVArray; 

    //Generates a point for a WAV style HDRF. This array will be WAVDuration / TR entries long.
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