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

/* jshint node:true */
/*global describe, it, before */
"use strict";

require('../config/bisweb_pathconfig.js');

const assert = require("assert");
const util=require('bis_util');
const fmrimatrix   =require('bis_fmrimatrixconnectivity');
const path=require('path');
const numeric=require('numeric');
const libbiswasm=require('libbiswasm_wrapper');
const BisWebMatrix=require('bisweb_matrix');
const BisWebImage=require('bisweb_image');
numeric.precision = 3;


const timeseries_fname=path.resolve(__dirname, 'testdata/simple4dtest.nii.gz');
const roi_fname=path.resolve(__dirname, 'testdata/simpleroi.nii.gz');
const result_name = path.resolve(__dirname, 'testdata/simpleroi_result.csv');
const regress_name = path.resolve(__dirname, 'testdata/simpleregress.csv');

const buterworth_inname = path.resolve(__dirname, 'testdata/ButterWorthInput.csv');
const buterworth_outname = path.resolve(__dirname, 'testdata/ButterWorthOutput.csv');

let gold=null, gold_regress=null, FILT_INP=null, FILT_OUT=null,CORR_INP=null;


const gold_correlation = [ [ 1, -0.154144869,   0.643850872 ],
                           [ -0.154144869,      1,      0.174130224 ],
                           [ 0.643850872,       0.174130224,    1   ]];
const gold_zscore = [ [ 6.1 , -0.155, 0.773 ],
                      [ -0.155, 6.1 , 0.176 ],
                      [ 0.773, 0.176, 6.1 ] ];

describe('Testing WASM Matrix Connectivity (from bis_fmrimatrixconnectivity.js and bisfMRIAlgorithms.cpp). Code used for  functional connectivity fMRI analysis\n', function() {
    this.timeout(500000);
    let images = [ new BisWebImage(), new BisWebImage() ];
    
    before(function(done){
        
        Promise.all( [
            BisWebMatrix.loadNumericMatrix(result_name),
            BisWebMatrix.loadNumericMatrix(regress_name),
            BisWebMatrix.loadNumericMatrix(buterworth_inname),
            BisWebMatrix.loadNumericMatrix(buterworth_outname),
            libbiswasm.initialize(),
            images[0].load(timeseries_fname),
            images[1].load(roi_fname)
        ]).then( (arr) => {
            gold=numeric.transpose(arr[0].data);
            gold_regress=(arr[1].data);
            FILT_INP=(arr[2].data);
            FILT_OUT=(arr[3].data);
            console.log('FILT_INP='+FILT_INP);
            CORR_INP=numeric.clone(FILT_OUT);
            done();
        });
    });
    

    it('do roi analysis' ,function() {
        
        let input=images[0];
        let roi=images[1];
        console.log('input size=',input.getDimensions());
        console.log('roi size=',roi.getDimensions());
        
        let out=fmrimatrix.roimean(input,roi);

        let outwasm=libbiswasm.computeROIWASM(input,roi,{},1).getNumericMatrix();
        
        console.log('computed means=\n',numeric.prettyPrint(out.means));
        console.log('gold (BIS)=\n',numeric.prettyPrint(gold));

        console.log('computed means wasm=\n',numeric.prettyPrint(outwasm));
        
        let error=numeric.norm2(numeric.sub(out.means,gold));
        let error2=numeric.norm2(numeric.sub(outwasm,gold));
        console.log('roi computation error=',error,error2);
        assert.equal(true,(error<0.001 && error2<0.001));
    });


    it('test low/high/band_pass pass',function() {
        
        let sz=numeric.dim(FILT_INP);
        let minf=0,df=10;
        console.log('All printing is from ',minf,' to ',minf+df,' points (zero offset). Calculation is done on all '+sz[0]+' frames');
        let input_piece=numeric.getBlock(FILT_INP,[minf,0],[minf+df,0]);
        console.log('Original data=',numeric.prettyPrint(numeric.transpose(input_piece)));
        
        console.log('\n\n ------------------- LOWPASS ---------------------------\n');


        let FILT_INP_MAT=new BisWebMatrix('matrix',FILT_INP);
        
        let olow_mat=libbiswasm.butterworthFilterWASM(FILT_INP_MAT,{ 'type' : 'low',
                                                                     'cutoff' : 0.15,
                                                                     'sampleRate' : 1.0 },1);
        let olow=olow_mat.getNumericMatrix();
        console.log(olow);
        let olow_piece=numeric.getBlock(olow,[minf,0],[minf+df,0]);
        let FLOW=numeric.getBlock(FILT_OUT, [0,0],[sz[0]-1,0]);
        let FLOW_piece=numeric.getBlock(FILT_OUT, [minf,0],[minf+df,0]);

        console.log('\n\noutput WASM LOW =\n',numeric.prettyPrint(numeric.transpose(olow_piece)),'\n');
        console.log('output MAT LOW =\n',numeric.prettyPrint(numeric.transpose(FLOW_piece)),'\n');
        
        let error_low=numeric.norm2(numeric.sub(olow,FLOW));
        console.log('\n\n\n\n\n ErrorLOWPASS=',error_low);
        assert.equal(true,(error_low<0.01));
        
        console.log('\n\n ------------------- HIGHPASS ---------------------------\n');
        let ohigh=libbiswasm.butterworthFilterWASM(FILT_INP_MAT,{ 'type': 'high',
                                                                  'cutoff' : 0.03,
                                                                  'sampleRate': 1.0},true).getNumericMatrix();
        let ohigh_piece=numeric.getBlock(ohigh,[minf,0],[minf+df,0]);
        let FHIGH=numeric.getBlock(FILT_OUT,[0,1],[sz[0]-1,1]);
        let FHIGH_piece=numeric.getBlock(FILT_OUT,[minf,1],[minf+df,1]);
        

        console.log('\n\noutput WASM HIGH =\n',numeric.prettyPrint(numeric.transpose(ohigh_piece)),'\n');
        console.log('output MAT HIGH =\n',numeric.prettyPrint(numeric.transpose(FHIGH_piece)),'\n');
        
        
        let error_high=numeric.norm2(numeric.sub(ohigh,FHIGH));
        console.log('Error (HIGH PASS)=',error_high,numeric.dim(ohigh));
        assert.equal(true,(error_high<0.01));
        
        
        console.log('\n\n ------------------- BANDPASS ---------------------------\n');
        console.log('Not creating a new filter just feeding input of low pass to high pass to simulate bandpass');
        let oband=libbiswasm.butterworthFilterWASM(olow_mat,{ 'type': 'high',
                                                              'cutoff' : 0.03,
                                                              'sampleRate': 1.0},true).getNumericMatrix();
        
        let oband_piece=numeric.getBlock(oband,[minf,0],[minf+df,0]);
        let FBAND=numeric.getBlock(FILT_OUT,[0,2],[sz[0]-1,2]);
        let FBAND_piece=numeric.getBlock(FILT_OUT,[minf,2],[minf+df,2]);
        console.log('\n\noutput WASM BAND =\n',numeric.prettyPrint(numeric.transpose(oband_piece)),'\n');
        console.log('output MAT BAND =\n',numeric.prettyPrint(numeric.transpose(FBAND_piece)),'\n');
        
        let error_band=numeric.norm2(numeric.sub(oband,FBAND));
        console.log('Error (BAND PASS)=',error_band,numeric.dim(oband));
        assert.equal(true,(error_band<0.12));
    });


    it('compute correlation matrix',function() {

        console.log('\n\n ------------------- CORRELATION MATRIX ---------------------------\n');
        let inp=new BisWebMatrix('matrix',CORR_INP);

        let out=libbiswasm.computeCorrelationMatrixWASM(inp,0,{ "toz": false},1).getNumericMatrix();
        console.log('WASM correlations =\n ',numeric.prettyPrint(out));
        console.log('correlations gold =\n ',numeric.prettyPrint(gold_correlation));
        let error_corr=numeric.norm2(numeric.sub(out,gold_correlation));


        let out2=libbiswasm.computeCorrelationMatrixWASM(inp,0,{ "toz" : true},1).getNumericMatrix();
        console.log('WASM correlations z-score =\n ',numeric.prettyPrint(out2));
        console.log('correlations z-score gold =\n ',numeric.prettyPrint(numeric.sub(out2,gold_zscore)));
        let error_z=numeric.norm2(numeric.sub(out2,gold_zscore));
        console.log('zscore error=',error_z);
        
        console.log('Error (CORRELATION)=',error_corr);
        assert.equal(true,(error_corr<0.01) && (error_z <0.01));
    });


    it ('compute weighted correlations',function() {
        console.log('\n\n -----------WEIGHTED CORRELATION MATRIX ---------------------------\n');
        // Test robust correlation
        let t=numeric.dim(CORR_INP);
        let newm=util.zero(t[0],2);
        let w=new Float32Array(t[0]);
        for (let i=0;i<t[0];i++) {
            newm[i][0]=CORR_INP[i][0];
            newm[i][1]=CORR_INP[i][0];
            w[i]=1.0;
        }
        
        newm[4][1]=100000.0;
        w[4]=0.0;

        let wout=libbiswasm.computeCorrelationMatrixWASM(new BisWebMatrix('matrix',newm),
                                                         0,false,1).getNumericMatrix()[0][1];
        let wout2=libbiswasm.computeCorrelationMatrixWASM(new BisWebMatrix('matrix',newm),
                                                          new BisWebMatrix('vector',w),
                                                          false,1).getNumericMatrix()[0][1];
        
        console.log('same series but for one huge outlier');
        console.log('robust (should be close to 1)=',wout2,' vs non-robust',wout);
        assert.equal(true,( Math.abs(wout2-1.0)<0.01 && Math.abs(wout-1.0)>0.5));
    });

    it('do regression',function() {
        console.log('\n\n\n');
        
        let tgold=gold;
        let d=numeric.dim(tgold);
        let drift=fmrimatrix.createdriftregressor(d[0],1);

        console.log('input (tranposed to save lines!)\n',numeric.prettyPrint(numeric.transpose(tgold)));
        console.log('drift (transposed to save lines!)\n',numeric.prettyPrint(numeric.transpose(drift)));

        let out=libbiswasm.weightedRegressOutWASM(new BisWebMatrix('matrix',tgold),
                                                  new BisWebMatrix('matrix',drift),0,true).getNumericMatrix();
        console.log('WASM cleaned (transposed)=\n',numeric.prettyPrint(numeric.transpose(out)));
        console.log('tgold (transposed)=\n',numeric.prettyPrint(numeric.transpose(gold_regress)));
        let error=numeric.norm2(numeric.sub(out,gold_regress));

        
        
        console.log('diff error=',error);
        assert.equal(true,(error<0.01));
        
    });


    it('do weighted regression',function() {
        
        let d=numeric.dim(gold);
        let temp=util.zero(d[0],2);
        let piecegold=util.zero(d[0],2);
        for (let i=0;i<d[0];i++) {
            temp[i][1]=gold[i][3];
            temp[i][0]=gold[i][3];
            piecegold[i][1]=gold_regress[i][3];
            piecegold[i][0]=gold_regress[i][3];
        }
        temp[3][1]=999.0;
        temp[3][0]=999.0;
        
        console.log('newtemp (transposed)\n',numeric.prettyPrint(numeric.transpose(temp)));
        console.log('newgold (transposed)\n',numeric.prettyPrint(numeric.transpose(piecegold)));
        
        
        let w=new Float32Array(d[0]);
        for (let f=0;f<d[0];f++) {
            if (f!==3)
                w[f]=1.0;
            else
                w[f]=0.0;
        }
        console.log('weights=',w);

        
        let drift=fmrimatrix.createdriftregressor(d[0],1);

        let mw=util.zero(w.length,1);
        for (let i=0;i<w.length;i++)
            mw[i]=w[i];
        console.log(mw);
        
        let temp_m=new BisWebMatrix('matrix',temp);
        let drift_m=new BisWebMatrix('matrix',drift);
        let w_m=new BisWebMatrix('vector',w);

        
        let out=libbiswasm.weightedRegressOutWASM(temp_m,drift_m,w_m,1).getNumericMatrix();
        let out2=libbiswasm.weightedRegressOutWASM(temp_m,drift_m,0,1).getNumericMatrix();
        console.log('badly cleaned (transpose)=\n',numeric.prettyPrint(numeric.transpose(out2)));
        console.log('\nwell cleaned (transpose)=\n',numeric.prettyPrint(numeric.transpose(out)));
        let error=numeric.norm2(numeric.sub(out,piecegold));
        let error2=numeric.norm2(numeric.sub(out2,piecegold));
        console.log('diff error=',error,' and bad error=',error2);
        assert.equal(true,(error<0.01 && error2>1000.0));
    });


    it ('compute global signal regression',function() {
        
        console.log('\n\n -----------REMOVE GSR ---------------------------\n');

        let t=numeric.dim(CORR_INP);
        let len=10;
        if (len>t[0])
            len=t[0];
        let newm=util.zero(len,3);
        let w=new Float32Array(len);
        for (let i=0;i<len;i++) {
            newm[i][0]=CORR_INP[i][0];
            newm[i][1]=CORR_INP[i][1];
            newm[i][2]=(CORR_INP[i][1]+CORR_INP[i][0]);
            w[i]=1.0;
        }
        console.log('Input data=',newm);
        console.log('Weights=',w);

        
        let newm_m=new BisWebMatrix('matrix',newm);
        
        let out=libbiswasm.weightedRegressGlobalSignalWASM(newm_m,0,1).getNumericMatrix();
        console.log('wrg output=',numeric.prettyPrint(out));

        let magn=0.0;
        for (let i=0;i<len;i++)
            magn+=Math.pow(out[i][2],2.0);
        magn=Math.sqrt(magn);
        console.log('test if 3rd column -- intentionally made to be mean signal becomes zero. magn=',magn);
        assert.equal(true,(magn<0.0001));

        // now robust
        w[8]=0.0;
        newm[8][0]=1000;
        newm[8][1]=2000;
        newm[8][2]=-1000;
        
        console.log('weights=',w);
        console.log('newm=',numeric.prettyPrint(newm));

        let w_m=new BisWebMatrix('vector',w);
        newm_m.setFromNumericMatrix(newm);
        

        let out1=libbiswasm.weightedRegressGlobalSignalWASM(newm_m,0,1).getNumericMatrix();
        let out2=libbiswasm.weightedRegressGlobalSignalWASM(newm_m,w_m,1).getNumericMatrix();
        console.log('output=',numeric.prettyPrint(out1));
        console.log('robust output=',numeric.prettyPrint(out2));
        let magn1=0.0,magn2=0.0;
        for (let i=0;i<len;i++) {
            magn1+=Math.pow(out1[i][2],2.0);
            magn2+=Math.pow(out2[i][2],2.0);
        }
        magn1=Math.sqrt(magn1);
        magn2=Math.sqrt(magn2);
        console.log('test if 3rd column -- intentionally made to be mean signal becomes zero. magn=',magn1,magn2);
        assert.equal(true,(magn2<0.0001 && magn1>1.0));

    });
});






