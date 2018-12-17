"use strict";

// ------------------------------------------------------------------------------------------
// Boilerplate at top
// -----------------------------------------------------------------------------
/** 
 * @file Browser or Node.js module. Contains {@link BisJointHistogram}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const util=require('./bis_util');

/** 
 * A class for constructing histograms 
 * @constructs BisHeader
 */

class BisWebHistogram {

    constructor(numbins=64,origin=0.0,scale=1.0) { 

        this.numbins=Math.floor(util.range(numbins,2,1024));
        this.max=this.numbins-1.000;
        this.bins=new Uint32Array(this.numbins);
        this.scale=scale;
        this.origin=origin;
        this.zero();
    }

    zero() { 
        for (let i=0;i<this.numbins;i++)
            this.bins[i]=0;
        this.numsamples=0;
    }


    getnumsamples() {
        return this.numsamples;
    }
    

    /** Computes mean and stdev
     * @returns{Array} - [ mean, stdev ]
     */
    computeStats() {
        
        let sum=0,sum2=0;
        let numscalars=0;

        for (let i=0; i<this.numbins; i++) {
            let w=this.bins[i];
            let v=this.origin+this.scale*i;
            sum += w*v;
            sum2 += (w*v*v);
            numscalars += w;
        }

        if (numscalars<0.01)
            numscalars=0.01;
                
        let mean = sum/(numscalars);
        let sigma = sum2/(numscalars)-mean*mean;
        if (sigma<0.00001)
            sigma=0.00001;

        return [ mean,sigma ];
    }

    /** Computes Entropy of histogram
     * returns {number} - entropy value
     */
    entropy() {
        
        let out=0.0;
        
        for (let i=0;i<this.numbins;i++) {
            let tmp=this.bins[i];
            if (tmp > 0)
                out += tmp * Math.log(tmp);
        }
        return (- out / this.numsamples + Math.log(this.numsamples));
    }


    fill(arr,reset=true) {

        // If reset, do reset
        if (reset) {
            this.zero();
        }

        for (let i=0;i<arr.length;i++) {
            let v=Math.round( (arr[i]-this.origin)/this.scale);
            if (v>=0 && v<this.numbins)
                this.bins[v]+=1;
        }

        this.numsamples=0;
        for (let i=0;i<this.numbins;i++) {
            this.numsamples+=this.bins[i];
        }
    }
}


module.exports=BisWebHistogram;



