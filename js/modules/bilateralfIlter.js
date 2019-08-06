/*  LICENSE
    
    _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
    
    BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
    
    - you may not use this software except in compliance with the License.
    - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
    
    __Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.__
    
    ENDLICENSE */


// Implemented by Kol Crooks based on original code from
/*
  https://github.com/lipsia-fmri/lipsia
  Gabriele Lohmann, Johannes Stelzer, Eric Lacosse, Vinod J. Kumar, Karsten Mueller, Esther Kuehn, Wolfgang Grodd & Klaus Scheffler 
  LISA improves statistical analysis for fMRI
  Nature Communications : 2018
  https://www.nature.com/articles/s41467-018-06304-z

Original LICENSE

BSD 3-Clause License

Copyright (c) 2017, Max Planck Society All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/



'use strict';

const baseutils = require("baseutils");
const BaseModule = require('basemodule.js');
const BisWebImage = require('bisweb_image');

/**
 * flips an image along any combination of the three axes
 */
class BilateralFilterModule extends BaseModule {
    constructor() {
        super();
        this.name = 'bilateralFilter';
    }
    
    createDescription() {
        return {
            "name": "BilateralFilter",
            "description": 'This algorithm performes a Bilateral Filter. The original code and notes can be found in the original  <a target="_blank" href="https://github.com/lipsia-fmri/lipsia">source code repository</a>.',
            "author": "Kol Crooks",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('Load the image to be Filtered'),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Bilateral Filter",
            "shortname" : "bltrF",
            "params": [
                {
                    "name": "Radius",
                    "description": "radius",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "radius",
                    "type": 'int',
                    "default": 2,
                    "low": 0.0,
                    "high": 10.0,
                },
                {
                    "name": "Spatial",
                    "description": "Spatial mod var",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "svar",
                    "type": 'float',
                    "default": 2.0,
                    "low": 0.5,
                    "high": 10.00,
                },
                {
                    "name": "Radiometric",
                    "description": "radiometric mod var",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "rvar",
                    "type": 'float',
                    "default": 2.0,
                    "low": 0.5,
                    "high": 10.00,
                },
                {
                    "name": "Iterations",
                    "description": "number of iterations that the filter runs",
                    "priority": 4,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "numiter",
                    "type": 'int',
                    "default": 2,
                    "low": 0.0,
                    "high": 10.0,
                },
                baseutils.getDebugParam(),
            ],
            
        };
    }
    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: bilateralfilter with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        this.outputs['output'] = BilateralFilter(input, vals.radius, vals.rvar, vals.svar, vals.numiter);
        return Promise.resolve();
    }
    
    
    
}


/**
 * @param {BisImage} src input image
 * @param {number} radius integer
 * @param {number} rvar double
 * @param {number} svar double
 * @param {number} numiter integer
 * @returns {BisImage} out - smooth image
 */
var BilateralFilter = function(src, radius, rvar, svar, numiter) {
    
    console.log('----- SMOOTHING WITH LISA ALGORITHM -----');
    console.log('----- See Lohmann et al, Nature Communications 2018.');

    let timer = Date.now();

    let dest = new BisWebImage();
    dest.cloneImage(src, { type: 'float' });
    let nx = 0, mx = 0, z = 0;
    let u = 0, x = 0, w = 0, d = 0, s1 = 0, s2 = 0, tiny = 1.0e-10;
    let b, r, c, bb, rr, cc, m, k, l, iter;


    /* ini dest image */
    let dims = src.getDimensions();
    let nbands = dims[2]; //I think that this is the depth of the image
    let nrows = dims[1]; //Height of image
    let ncols = dims[0]; //Width of image

    let image_out = dest.getImageData();

    /* get max neighbourhood size */
    nx = 0;
    let wn = radius - 1;
    for (m = -radius; m <= radius; m++) {
        for (k = -radius; k <= radius; k++) {
            for (l = -radius; l <= radius; l++) {
                if ((Math.abs(m) > wn && Math.abs(k) > wn && Math.abs(l) > wn)) continue;
                nx++;
            }
        }
    }
    let log = [];
    /*r=y c=x b=z*/
    /* loop through voxels */
    for (iter = 0; iter < numiter; iter++) {

        for (b = radius; b < nbands - radius; b++) {
            for (r = radius; r < nrows - radius; r++) {
                for (c = radius; c < ncols - radius; c++) {

                    x = getPixel(src, b, r, c); //Get pixel as float at band b, row r, and column c
                    if (Math.abs(x) < tiny) continue;

                    mx = 0;
                    s1 = s2 = 0;
                    for (m = -radius; m <= radius; m++) {
                        bb = b + m;
                        for (k = -radius; k <= radius; k++) {
                            rr = r + k;
                            for (l = -radius; l <= radius; l++) {
                                cc = c + l;
                                if ((Math.abs(m) > wn && Math.abs(k) > wn && Math.abs(l) > wn)) continue;

                                u = getPixel(src, bb, rr, cc); //Get pixel as float at band bb, row rr, and column cc
                                if (Math.abs(u) < tiny) continue;

                                d = m * m + k * k + l * l;
                                z = (x - u) * (x - u) / rvar + d / svar;

                                w = fastexp(-z);
                                s1 += u * w;
                                s2 += w;
                                mx++;
                            }
                        }
                    }
                    z = 0;

                    /* bilateral filter if local neighbourhood mostly inside the brain */
                    if ((s2 > 0) && (mx / nx > 0.5)) {
                        z = s1 / s2;
                    }

                    /* median filter if local neighbourhood partly outside of brain */
                    else {
                        z = XMedian18(src, b, r, c);
                    }

                    image_out[c + r * ncols + b * ncols * nrows] = z;
                    log.push(c + r * ncols + b * ncols * nrows);
                }
            }
        }
        if (iter < numiter - 1 && numiter > 1){
            console.log(`Ran Bilateral Filter in ${Date.now()-timer} ms or ${(Date.now()-timer)/1000} sec`);
            return dest; //Return the smoothed image
        }
    }
};

/**
 * Approximate an exponential function
 * @param {number} x 
 */
function fastexp(x) {
    x = 1.0 + x / 2048.0;
    x *= x; x *= x; x *= x; x *= x;
    x *= x; x *= x; x *= x; x *= x;
    x *= x; x *= x; x *= x;
    return x;
}

/**
 * Median filter in 18-adj neighbourhood 
 * @param {BisImage} src 
 * @param {number} b integer (band)
 * @param {number} r integer (row)
 * @param {number} c integer (column)
 */
function XMedian18(src, b, r, c) {
    let bb, rr, cc, m, k, l;
    let u = 0, z = 0, tiny = 1.0e-6;
    let data = [];

    let n = 0;
    for (m = -1; m <= 1; m++) {
        bb = b + m;
        for (k = -1; k <= 1; k++) {
            rr = r + k;
            for (l = -1; l <= 1; l++) {
                cc = c + l;
                if (Math.abs(m) > 0 && Math.abs(k) > 0 && Math.abs(l) > 0) continue;
                u = getPixel(src, bb, rr, cc); //Get pixel of source image at band bb, row rr, column cc as float
                if (Math.abs(u) < tiny) continue;
                data[n] = u;
                n++;
            }
        }
    }
    z = 0;

    if (n > 9) z = median(data, n);
    return z;
}

function median(values) {
    if (values.length === 0) return 0;

    values.sort((a, b) => {
        return a - b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

/**
 * 
 * @param {BisImage} src 
 * @param {number} band 
 * @param {number} row 
 * @param {number} column 
 */
function getPixel(src, band, row, column) {
    return src.getVoxel([
        column,
        row,
        band,
        0 //Time will always be 0
    ]);
}


module.exports = BilateralFilterModule;
