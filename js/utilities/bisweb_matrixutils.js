'use strict';

const numeric = require('numeric');
const BiswebMatrix = require('bisweb_matrix.js');

const WAVDelayTime = 2.0;
const WAVRiseTime = 4.0; 
const WAVFallTime = 6.0; 
const WAVUndershoot = 0.2;
const WAVRestoreTime = 2.0;
const peak = 1.0;
let tr = 1.0;

let parseTaskMatrix = (taskdata, taskNames) => {
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
};

/**
 * Creates the matrix of task regions convolved with the hemodynamic response function. 
 * 
 * @param {BiswebMatrix} matrix - Matrix representing the task regions of a given set of runs. 
 * @param {Number} runs - Number of runs in the matrix. 
 * @param {Number} period - TR for the scan, i.e. number of seconds per scanner picture (period).
 * @param {Number} order - Polynomial order for the drift regressors. If less than zero, it will not add regressors. 
 * @returns BiswebMatrix containing the stacked waveform. 
 */
let createStackedWaveform = (matrix, runs, period, order = -1) => {

    tr = period;
    let numericMatrix = matrix.getNumericMatrix();

    let runLength = numericMatrix.length / runs;
    let constructedMatrix = [];
    for (let i = 0; i < runs; i++) {
        constructedMatrix = constructedMatrix.concat(createWaveform(numericMatrix.slice(i * runLength, (i + 1) * runLength)));
    }

    constructedMatrix = addDriftTerms(constructedMatrix, runs, order);
    let matOut = new BiswebMatrix();
    matOut.setFromNumericMatrix(constructedMatrix);
    return matOut;
};

/**
 * Convolves a single scanner run with the hemodynamic response function and returns the result. 
 * 
 * @param {Array} task - Array corresponding to a single run in a matrix of all runs.
 */
let createWaveform = (task) => {

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

    //trim extra data off the end
    let trimmedWaveform = out.slice(0, task.length);
    return trimmedWaveform;
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

/**
 * Adds Legendre polynomials as nuisance terms to the raw HDRF matrix created by createStackedWaveform.
 * 
 * @param {Array} matrix - numeric.js style matrix to add drift regressors to.  
 * @param {Number} runs - Number of runs contained by the input matrix.
 * @param {Number} order - The polynomial order of the regressors. Linear by default.
 */
let addDriftTerms = (matrix, runs, order = 1) => {
    if (!matrix) {
        console.log('Cannot add drift terms to invalid matrix', matrix); return;
    }

    if (order < 0) {
        return matrix;
    } else if (order > 3) {
        order = 3;
    }

    let dim = numeric.dim(matrix);
    let runLength = matrix.length / runs;

    let numTerms = order + 1;
    let numExtra = runs * numTerms; 

    let out = [];
    //copy matrix by copying rows
    for (let i = 0; i < dim[0]; i++) {
        let matRow = matrix[i]; 
        let zeroPad = new Array(numExtra).fill(0);
        matRow = matRow.concat(zeroPad);
        out.push(matRow);
    } 

    for (let i = 0; i < runs; i++) {
        let minRow = i * runLength, maxRow = (i + 1) * runLength; 
        let region = out.slice(minRow, maxRow);
        let minCol = dim[1] + i * numTerms;
        
        for (let row = 0; row < runLength; row++) {
            let t0 = minRow;
            let t1 = maxRow;
            let dt = 0.5 * (t1 - t0);
            let t = (row - t0)/dt - 1;
            let t2 = t * t;
            let t3 = t * t * t;

            //needed to match AFNI exactly
            let afniOffset = 0.5/dt;

            //Array.slice makes region a shallow copy of out, so modifying it will modify out. 
            for (let pol = 0; pol < numTerms; pol++) {
                switch (pol) {
                    case 0 : region[row][minCol + pol] = 1.0; break;
                    case 1 : region[row][minCol + pol] = t; break;
                    case 2 : region[row][minCol + pol] = 1.5 * t2 - 0.5 - afniOffset; break;
                    case 3 : region[row][minCol + pol] = 2.5 * t3 - 1.5 * t; break;
                }
            }
        }
    }

    return out;
};

/**
 * Compresses a symmetrical matrix by taking the upper-right 'triangle' out of it. 
 * 
 * @param {Numeric.js} mat - Numeric.js matrix taken from BiswebMatrix
 * @returns The compressed matrix.
 */
let compressSymmetricMatrix = (mat) => {
    console.log('mat', mat);
    let sym = [];
    for (let i = 0; i < mat.length; i++) {
        sym.push(mat[i].slice(0, i + 1));
    }

    console.log('sym', sym);
    return sym;
};

let compareRawAndSymmetricMatrices = (mat, sym) => {
    for (let i = 0; i < sym.length; i++) {
        for (let j = 0; j < sym[i].length; j++) {
            if (mat[i][j] !== sym[i][j]) { return false; }
        }
    }

    return true;
};

module.exports = {
    parseTaskMatrix : parseTaskMatrix,
    createStackedWaveform : createStackedWaveform,
    createWaveform : createWaveform,
    generateHDRF : generateHDRF,
    addDriftTerms : addDriftTerms,
    compressSymmetricMatrix : compressSymmetricMatrix,
    compareRawAndSymmetricMatrices : compareRawAndSymmetricMatrices
};