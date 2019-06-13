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

"use strict";

/** 
 * @file Browser or Node.js module. Contains {@link BisfMRIMatrixConnectivity}.
 * @author Xenios Papademetris
 * @version 1.0
 */

/**
 * A set of fMRI Matrix Connectivity functions.
 * @namespace BisfMRIMatrixConnectivity
 */


/** A simple 2D array as created using numericjs {@link http://numericjs.com/documentation.html}.
 * @typedef Matrix
 */


const util=require('bis_util');
const numeric=require('numeric');


// ---------------------------------------------------------------------------
// Legendre polynomials
// ---------------------------------------------------------------------------

/** This function computes the Lengendre Polynomial function
 * @alias BisfMRIMatrixConnectivity.legendre
 * @param {number} t - the input value x -> P(x)
 * @param {number} order - the order of the polynomial in the range of 0 to 6
 * @returns {number}
 */

var legendre=function(t,order) {

    order=util.range(order || 0,0,6);
    
    if (order===0)
        return 1;

    if (order ===1) // P_1(x)=x;
        return t;
    
    if (order ===2) // P_2(x)=0.5*(3x^2-1)
        return 1.5*t*t-0.5;
    
    if (order ===3) // P_3(x) =0.5*(5x^3-3x)
        return 2.5*t*t*t-1.5*t;
    
    if (order ===4) // P_4(x) = 1/8*(35x^4-30x^2+3)
        return 0.125*35*t*t*t*t-0.125*30*t*t+0.375;
    
    if (order ===5) // P_5(x) = 1/8*(63*x^5-70*x^3+15x)
        return 0.125*63*t*t*t*t*t-0.125*70*t*t*t+0.125*15*t;
    
    // order === 6
    return (231*t*t*t*t*t*t-315*t*t*t*t+105*t*t-5)/16;
};


// ---------------------------------------------------------------------------
// Drift regressor
// ---------------------------------------------------------------------------
/** This function creates a drift regressor of size numframes * (order+1) for a timeseries
 * @alias BisfMRIMatrixConnectivity.createdriftregressor
 * @param {number} numframes - the number of frames -> rows of matrix
 * @param {number} order - the order of the polynomial -> (order+1 -> cols of matrix)
 * @returns {Matrix}
 */
var createdriftregressor= function(numframes,order) {

    numframes = numframes || 2;
    order = util.range(order || 3,0,6);
    if (numframes<1)
        numframes=1;

    var shift=(numframes-1)*0.5;
    var bot=0.5*(numframes-1);

    var m=util.zero(numframes,order+1);
    for (var i=0;i<numframes;i++) {
        var t=(i-shift)/bot;
        for (var j=0;j<=order;j++)
            m[i][j]=legendre(t,j);
    }
    return m;
};

// ---------------------------------------------------------------------------
// Same size,spacing and same orientation
// ---------------------------------------------------------------------------
var checkimages = function(image1,image2,checksameframes) {

    // We don't care about frames being equal most of the time
    checksameframes = checksameframes || false;

    // Should we check for spacing too? Probably

    if (image1===null || image2===null) {
        console.log('null images in checkimages');
        return false;
    }

    
    var orient1=image1.getOrientationName();
    var orient2=image2.getOrientationName(); 

    if (orient1!==orient2) 
        throw new Error('Cannot process images that have different orientations '+orient1+' vs '+orient2);

    var sum=0,i=0;
    var dim1=image1.getDimensions();
    var dim2=image2.getDimensions();
    var max=3; 
    if (checksameframes)
        max=4;

    for (i=0;i<max;i++) 
        sum+=Math.abs(dim1[i]-dim2[i]);
    if (sum>0.01) 
        throw new Error('Cannot process images that have different dimensions '+dim1.join(",")+' vs '+dim2.join(","));
    

    var spa1=image1.getSpacing();
    var spa2=image2.getSpacing();

    sum=0.0;
    for (i=0;i<=2;i++) 
        sum+=Math.abs(spa1[i]-spa2[i]);
    if (sum>0.01) 
        throw new Error('Cannot process images that have different spacing '+spa1.join(",")+' vs '+spa2.join(","));
    
    return true;
};
// ---------------------------------------------------------------------------
// Compute ROI Mean
// ---------------------------------------------------------------------------
/** This function creates the roi mean timeseries of an input image given an roi definition image
 * @alias BisfMRIMatrixConnectivity.roimean
 * @param {BisImage} input - the input (4D potentially image)
 * @param {BisImage} roi - the input ROI Definition
 * @param {Boolean} debug - if true print messages
 * @returns {Matrix} - numrows=numframes, numcols=numrois
 */
var roimean=function(input,roi,debug=true) {

    try { 
        checkimages(input,roi);
    } catch (e) {
        console.log(e);
        throw(e);
    }

    //  var dt=roi.getDataType();
    roi.computeIntensityRange();
    var r=roi.getIntensityRange();

    if (r[1]>999 || r[0] < -3 ) 
        throw new Error('Bad ROI Image. It has largest value > 999 (max='+r[1]+') or min value <-3 ( min='+r[0]+')');
    
    var dim=input.getDimensions();
    var volsize = dim[0]*dim[1]*dim[2];
    var numframes = dim[3];

    //  var output=bisimage();
    // Create a clone of type float and number of frames =1
    //  output.cloneImage(input, { type : 'float',
    //                 numframes : 1});

    var numrois=Math.floor(r[1]);

    // 
    var out=util.zero(numframes,numrois);
    var num=new Int32Array(numrois);
    for (var i=0;i<numrois;i++) {
        num[i]=0;
    }

    var inpdata= input.getImageData();
    var roidata= roi.getImageData();
    var voxel=0,region=0,frame=0;
    if (debug)
        console.log('++++ Computing ROI: volsize=',volsize,' numrois=',numrois,' numframes=',numframes,' range=',r);

    for (voxel=0;voxel<volsize;voxel++) {
        region=Math.floor(roidata[voxel])-1;
        if (region>=0) {
            num[region]=num[region]+1;
            for (frame=0;frame<numframes;frame++)  {
                out[frame][region]=out[frame][region]+inpdata[voxel+frame*volsize];
            }
        }
    }
    for (region=0;region<numrois;region++) {
        for (frame=0;frame<numframes;frame++) 
            if (num[region]>0)
                out[frame][region]=out[frame][region]/num[region];
    }

    return { 
        means : out,
        numvoxels : num,
    };
};

// ---------------------------------------------------------------------------
// Regress out "regressors"
// ---------------------------------------------------------------------------
var createLSQ = function (regressors) {
    var A=regressors;
    var At=numeric.transpose(A);
    var invAtA=numeric.inv(numeric.dot(At,A));
    return numeric.dot(invAtA,At);
};

// Xenios
// Will need to rewrite this for images to 
// avoid memory allocation and deallocation here
var precomputed_regressout = function(input,regressors,LSQ) {
    var bad=numeric.dot(LSQ,input);
    var badT=numeric.dot(regressors,bad);
    return numeric.sub(input,badT);
};


/** This function regresses out a set of regressors from a set of timeseries
 * @alias BisfMRIMatrixConnectivity.regressout
 * @param {Matrix} input - the input timeseries vectors (row=frames)
 * @param {Matrix} regressors - the input regressors matrix
 * @returns {Matrix} cleaned data - numrows=numframes, numcols=numrois
 */
var regressout = function (input,regressors) {

    var sz_inp,sz_reg;
    try {
        sz_inp=numeric.dim(input);
        sz_reg=numeric.dim(regressors);
    } catch(e) {
        throw new Error('Cannot regressout as input matrices are bad inp='+sz_inp+' reg='+sz_reg+' e='+e);
    }

    // step 2
    if (sz_inp[0] !== sz_reg[0]) 
        throw new Error('Bad array sizes for regressout. Data='+sz_inp+', reg='+sz_reg);

    var LSQ;
    try { 
        LSQ=createLSQ(regressors);
    } catch(e) {
        throw new Error(e);
    }
    return precomputed_regressout(input,regressors,LSQ);
};

// ---------------------------------------------------------------------------------------------------
// Regress out "regressors" using weight vector `weights' which signifies quality of each frame (row)
// ---------------------------------------------------------------------------------------------------

// Xenios
// Will need to rewrite this for images to 
// avoid memory allocation and deallocation here -- i.e. wI

var precomputed_weightedregressout = function (input,weightedRegressors,weights,LSQ) {
    
    var sz_inp=numeric.dim(input);

    // Basically transform input data and regressors, do ordinary LSQ and scale back
    var wI=util.zero(sz_inp[0],sz_inp[1]);


    // Multiply by weights
    var i,j,w;
    for (i=0;i<sz_inp[0];i++) {
        w=weights[i];
        for(j=0;j<sz_inp[1];j++) 
            wI[i][j]=w*input[i][j];
    }
    var ordinary=precomputed_regressout(wI,weightedRegressors,LSQ);
    for (i=0;i<sz_inp[0];i++) {
        w=weights[i];
        if (Math.abs(w)>0.001) {
            for(j=0;j<sz_inp[1];j++) 
                ordinary[i][j]=ordinary[i][j]/w;
        }
    }
    return ordinary;
};

/** This function regresses out a set of regressors from a set of timeseries using weighted least squares
 * @alias BisfMRIMatrixConnectivity.weightedregressout
 * @param {Matrix} input - the input timeseries vectors (row=frames)
 * @param {Matrix} regressors - the input regressors matrix
 * @param {array} weights - the input regressors vectors (weights for each row)
 * @returns {Matrix} cleaned data - numrows=numframes, numcols=numrois
 */
var weightedregressout = function (input,regressors,weights) {

    weights = weights || null;
    if (weights===null)
        return regressout(input,regressors);

    var sz_inp,sz_reg,sz_w;
    try {
        sz_inp=numeric.dim(input);
        sz_reg=numeric.dim(regressors);
        sz_w=numeric.dim(weights);
    } catch(e) {
        throw new Error('Cannot  compute regressout as matrices are bad inp='+sz_inp+' reg='+sz_reg+' w='+sz_w+' e='+e);
    }

    if ((sz_inp[0] !== sz_reg[0]) || (sz_inp[0]!==sz_w[0])) 
        throw new Error('Bad array sizes for weighted regressout. Data='+sz_inp+', reg='+sz_reg+' w='+sz_w);

    var wR=util.zero(sz_reg[0],sz_reg[1]);

    // Basically transform input data and regressors, do ordinary LSQ and scale back
    // Do regressors here and inputs in precomputed_weightedregressors
    // Multiply by weights
    var i,j,w;
    for (i=0;i<sz_inp[0];i++) {
        w=weights[i];
        for(j=0;j<sz_reg[1];j++) 
            wR[i][j]=w*regressors[i][j];
    }
    var LSQ=createLSQ(wR);
    return precomputed_weightedregressout(input,wR,weights,LSQ);
};

/** This is a type of function that maps raw image scalars to colors. Used by extensively by the viewers.
 * @function 
 * @name BisF.ButterWorthFunction
 * @param {Matrix} input - input data
 * @param {array} weights - the input regressors vectors (weights for each row). This is binary. If weight <0.01 then backfill is applied
 * @return {Matrix} filtered results
 */

/** Factory function to create a new Butterworth Filter function 
 * @alias BisfMRIMatrixConnectivity.createButterworthFilter
 * @param {string} passType : 'high' or 'low'
 * @param {number} frequency : cuttoff frequency in Hz
 * @param {number} sampleRate : Data TR
 * @param {boolean} debug : if true print filter characteristics
 * @return {BisF.ButterWorthFunction} - function to perfom filtering
 */

var createButterworthFilter = function(passType,frequency,sampleRate,debug) {

    debug = debug || false;

    // From Xilin: (setting default values)
    // I assume fMRI data has TR = 1.55s, so fs = 0.6452Hz, and bandpass frequency is  [0.02 0.1].
    //So for the highpass filter, frequency / sampleRate = 0.02/0.6452 = 0.03; for the low pass filter, frequency / sampleRate =0.1/0.6452 = 0.15;
    // resonance is the square root of the order, which is sqrt(2).
    // Code mostly adapted from http://stackoverflow.com/questions/8079526/lowpass-and-high-pass-filter-in-c-sharp
    
    // If not high then it is low
    if (passType !=='high')
        passType = 'low';

    sampleRate=sampleRate || 0.6452; // (1.0/1.55s);
    if (passType==='low')
        frequency=frequency || 0.02;
    else
        frequency=frequency || 0.1;
    
    var resonance=Math.sqrt(2.0);
    var c, a1, a2, a3, b1, b2,count=0;
    var inputHistory = new Float32Array(2); 
    var outputHistory = new Float32Array(3);
    
    if (passType==='low') {
        c = 1.0 / Math.tan(Math.PI * frequency / sampleRate);
        a1 = 1.0 / (1.0 + resonance * c + c * c);
        a2 = 2 * a1;
        a3 = a1;
        b1 = 2.0 * (1.0 - c * c) * a1;
        b2 = (1.0 - resonance * c + c * c) * a1;
    } else {
        c = Math.tan(Math.PI * frequency / sampleRate);
        a1 = 1.0 / (1.0 + resonance * c + c * c);
        a2 = -2 * a1;
        a3 = a1;
        b1 = 2.0 * (c * c - 1.0) * a1;
        b2 = (1.0 - resonance * c + c * c) * a1;
    }

    if (debug) {
        console.log('\n\nCreating Butterworth '+passType+' filter.');
        console.log('\t input parameters resonance=',util.scaledround(resonance,1000),'freq=',frequency,' sampleRate=',sampleRate,
                    ' ratio=',util.scaledround(frequency/sampleRate,10000),' type=',passType);
        console.log('\t computed parameters= c=',util.scaledround(c,1000),
                    ', a\'s=',[util.scaledround(a1,1000),util.scaledround(a2,1000),util.scaledround(a3,1000)],
                    'b\'s=',[ util.scaledround(b1,1000),util.scaledround(b2,1000)]);
    }

    var initialize = function() {
        count=0;
    };

    // Compute filter
    // While zero fill is good we need to think harder about this
    var update = function(newInput) {
        var newOutput;

        if (count>1)
            newOutput= a1 * newInput + a2 * inputHistory[0] + a3 * inputHistory[1] -
            b1 * outputHistory[0] - b2 * outputHistory[1];
        else if (count===1)
            newOutput= a1 * newInput + a2 * inputHistory[0]  -
            b1 * outputHistory[0];
        else if (count===0)
            newOutput= a1 * newInput;
        
        ++count;
        inputHistory[1] = inputHistory[0];
        inputHistory[0] = newInput;
        
        outputHistory[2] = outputHistory[1];
        outputHistory[1] = outputHistory[0];
        outputHistory[0] = newOutput;
        return newOutput;
    };


    //
    // If we have bad frames ``backfill'' i.e. replace value in input with next good frame
    // this helps butterworth filter do best job it can
    //
    var backfill = function (input,w) { 

        w=w || null;
        if (w===null)  {
            console.log('no need to backfill');
            return;
        }
        
        var sz=numeric.dim(input);
        var sw=numeric.dim(w);
        if (sz[0]!==sw[0]) 
            throw new Error('Bad array sizes for backfill. Data='+sz+' w='+sw);
        
        var out=numeric.clone(input);
        
        var row=0,nextgoodrow=0,r,c,v;
        while (row< sz[0]) {
            if (w[row]<0.01) {
                nextgoodrow=row+1;
                while (w[nextgoodrow]<0.01 && nextgoodrow < sz[0]) {
                    nextgoodrow++;
                }
                if (nextgoodrow!==sz[0]) {
                    // We found a good one, now back fill
                    for (c=0;c<sz[1];c++) {
                        v=out[nextgoodrow][c];
                        for (r=row;r<nextgoodrow;r++) {
                            out[r][c]=v;
                        }
                    }
                }
            }
            ++row;
        }
        return out;
    };
    
    var filter = function(orig_input,w) { 
        
        w=w || null;
        var input;
        if (w!==null) 
            input=backfill(orig_input,w);
        else
            input=orig_input;
        
        var out,dm=numeric.dim(input),col,row;
        //      console.log('dimensions='+dm);
        //      console.log('inp='+[orig_input[0],input[2]]);
        
        if (dm.length===1)  {
            out=util.zero(dm[0],1);
            initialize();
            for (row=0;row<dm[0];row++)  {
                out[row]=update(input[row]);
            }
            return out;
        }
        
        out=util.zero(dm[0],dm[1]);
        for (col=0;col<dm[1];col++) {
            initialize();
            for (row=0;row<dm[0];row++) {
                out[row][col]=update(input[row][col]);
            }
        }
        return out;
    };
    
    return filter;
};

// ------------------------------------------------------------------------------------------------
// Compute correlation matrix
// ------------------------------------------------------------------------------------------------
var rhoToZConversion = function(rho) {

    //double gValue = 0; 
    //changed to cap at z=6.1030
    //otherwise this returns a value of 
    //0 for a large correlation
    
    //find sign of correlation
    var sign=1.0;
    if (rho<0.0)
        sign=-1.0;

    var gValue = sign*6.1030; 
    
    if(Math.abs(rho)>1.00001) {
        console.log("Input correlation (r=", rho ,") is greater than 1");
        console.log("Returning z=", gValue );
        return gValue;
    }

    if (rho>-0.9999999 && rho<0.9999999)
        gValue = 0.5*Math.log((1+rho)/(1-rho));
    return gValue;
};


// weights are binary
var computeGlobalSignal = function (input,weights) {

    var dm=numeric.dim(input);
    var mean=util.zero(dm[0],1),row,sum;
    for (row=0;row<dm[0];row++) {
        sum=0.0;
        if (weights[row]>0.01) {
            for (var col=0;col<dm[1];col++) {
                sum=sum+input[row][col];
            }
        }
        mean[row]=sum/dm[1];
    }
    
    sum=0.0;
    for (row=0;row<dm[0];row++) {
        sum=sum+mean[row]*mean[row]; 
    }
    var magn=Math.sqrt(sum);
    
    for (row=0;row<dm[0];row++) {
        mean[row]=mean[row]/magn;
    }
    
    return mean;
};

/** This function regresses out the global mean signal from a set of timeseries. Weights are binary either use or do not use frame (>0.01 = use)
 * @alias BisfMRIMatrixConnectivity.regressGlobalSignal
 * @param {Matrix} input - the input timeseries vectors (row=frames)
 * @param {array} weights - the input regressors vectors (weights for each row)
 * @returns {Matrix} cleaned data - numrows=numframes, numcols=numrois
 */
var regressGlobalSignal = function(input,weights) {

    weights = weights || null;
    var sz=numeric.dim(input);
    
    if (weights===null) {
        weights=util.zero([sz[0],1]);
        for (var ia=0;ia<sz[0];ia++)
            weights[ia]=1.0;
    } else {
        var sw=numeric.dim(weights);
        if (sw[0]!==sz[0]) 
            throw new Error('Bad weight size for global Signal Regression. Mush be a 2D Matrix of dimenion ',sz[0],'*',1,' it is ', sw);
    }
    
    var mean=computeGlobalSignal(input,weights);
    var out=util.zero(sz[0],sz[1]);
    var sum=0.0,row,col;
    
    for (col=0;col<sz[1];col++) {
        sum=0.0;
        for (row=0;row<sz[0];row++)  {
            if (weights[row]>0.01) 
                sum=sum+input[row][col]*mean[row];
        }
        for (row=0;row<sz[0];row++) {
            if (weights[row]>0.01)
                out[row][col]=input[row][col]-sum*mean[row];
        }
    }
    return out;
};


/** This function computes a correlation matrix from a set of timeseries. Weights are binary either use or do not use frame (>0.01 = use)
 * @alias BisfMRIMatrixConnectivity.computeCorrelationMatrix
 * @param {Matrix} input - the input timeseries vectors (row=frames)
 * @param {boolean} toz - if true compute r->z transform and return z-values else r's (default = false)
 * @param {array} weights - the input regressors vectors (weights for each row)
 * @returns {Matrix} correlation matrix
 */
var computeCorrelationMatrix = function (input,toz,weights) {

    toz = toz || false;
    weights = weights || null;


    var sz=numeric.dim(input);
    if (sz.length!==2 || sz[0]<3) 
        throw new Error('Bad matrix sizes for computeCorrelationMatrix. Mush be a 2D Matrix with at least three rows');
    
    if (weights===null) {
        weights=util.zero([sz[0],1]);
        for (var ia=0;ia<sz[0];ia++)
            weights[ia]=1.0;
    } else {
        var sw=numeric.dim(weights);
        if (sw[0]!==sz[0]) 
            throw new Error('Bad weight size for computeCorrelationMatrix. Mush be a 2D Matrix of dimenion ',sz[0],'*',1,' it is ', sw);
    }

    var norm=util.zero(sz[0],sz[1]);
    
    // First normalize
    var row,col,sum,sum2,mean,sigma;
    var sumw=0.0;
    for (row=0;row<sz[0];row++)
        sumw+=weights[row];
    for (row=0;row<sz[0];row++)
        weights[row]=weights[row]/sumw;


    if (sumw<0.00001)
        throw new Error('bad weights, must have a positive sum!');

    for (col=0;col<sz[1];col++) {
        sum=0.0;
        sum2=0.0;

        for (row=0;row<sz[0];row++) {
            var v=input[row][col];
            sum=sum+v*weights[row];
            sum2=sum2+v*v*weights[row];
        }
        mean=sum;
        sigma=Math.sqrt(sum2-mean*mean);
        if (sigma>0.0) {
            for (row=0;row<sz[0];row++) {
                norm[row][col]=(input[row][col]-mean)/sigma;
            }
        }
    }

    // Now compute matrix
    var out=util.zero(sz[1],sz[1]);//numeric.identity(sz[1]);
    var outrow,outcol;
    for (outrow=0;outrow<sz[1];outrow++) {
        for (outcol=0;outcol<sz[1];outcol++) {
            sum=0.0;
            for (row=0;row<sz[0];row++) 
                sum=sum+norm[row][outrow]*norm[row][outcol]*weights[row];
            
            if (toz)
                sum=rhoToZConversion(sum);
            
            out[outrow][outcol]=sum;
            out[outcol][outrow]=sum; // symmetric;
        }
    }
    return out;
};


// ------------------------------
// Bundle & Output
// ------------------------------
const algo = { 
    legendre : legendre,
    createdriftregressor : createdriftregressor,
    checkimages : checkimages,
    roimean : roimean,
    regressout : regressout,
    weightedregressout : weightedregressout,
    createButterworthFilter : createButterworthFilter,
    rhoToZConversion : rhoToZConversion,
    computeCorrelationMatrix : computeCorrelationMatrix,
    regressGlobalSignal : regressGlobalSignal,
};


module.exports = algo;



