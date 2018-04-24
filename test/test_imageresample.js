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
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');
const assert = require("assert");
const bisimagesmoothreslice=require('bis_imagesmoothreslice');
const BisWebImage=require('bisweb_image');
const bistransforms=require('bis_transformationutil');
const path=require('path');
const numeric=require('numeric');
const libbiswasm=require('libbiswasm_wrapper');

numeric.precision=3;

let repeat=1;

let reslice_matr = [ [  0.866,  -0.525  , 0.000,  68.758 ],
                     [  0.500,   0.909 ,  0.000 ,  9.793 ],
                     [ 0.000,   0.000 ,  1.000 ,  2.250 ],
                     [ 0.000,   0.000,   0.000 ,  1.000  ]];

let reslice_transform=bistransforms.createLinearTransformation();
reslice_transform.setMatrix(reslice_matr);


describe('Testing linear transformation (bis_transformationutil.js) and image resampling/reslicing (bis_imagesmoothresample.js)\n', function() {
    this.timeout(50000);    
    let images = [ new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage() ,new BisWebImage(),new BisWebImage() ];
    let imgnames = [ 'avg152T1_LR_nifti.nii.gz', // 0
                     'avg152T1_LR_nifti_resampled.nii.gz', //1
                     'avg152T1_LR_nifti_normalized.nii.gz', //2
                     'avg152T1_LR_nifti_resampled_resliced.nii.gz', //3
                     'avg152T1_LR_nifti_resampled_resliced_NN.nii.gz', //4
                     'avg152T1_LR_nifti_resampled_resliced_Cubic.nii.gz', //5
                     'simple4dtest.nii.gz',
                     'simple4dtest_frame3.nii.gz'
                   ];
    
    let fullnames = [ '','','','','','','','','' ];
    for (let i=0;i<=7;i++)
        fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    
    before(function(done){
        let p=[ libbiswasm.initialize() ];
        for (let i=0;i<images.length;i++) {
            p.push(images[i].load(fullnames[i]));
        }
        Promise.all(p).then( () => { done(); });
    });
    
    it('test robust range 1',function() {
        let out=bisimagesmoothreslice.arrayRobustRange(images[0].getImageData(),0.01,0.99);
        console.log('++++ robust range = ',out,' vs   3,255');
        assert.equal(true,( Math.abs(out[0]-3)+Math.abs(out[1]-255))<0.01);
    });

    it('test robust range 2',function() {
        let out=bisimagesmoothreslice.arrayRobustRange(images[1].getImageData(),0.10,0.75);
        console.log('++++ robust range = ',out, ' vs 10,143');
        assert.equal(true,( Math.abs(out[0]-10)+Math.abs(out[1]-143))<0.01);
    });



    it('test matrix serialization',function() {

        console.log('\n----mapping =\n',reslice_transform.legacySerialize("; "),"\n");
        let s1=reslice_transform.serializeToText();
        let s2=reslice_transform.legacySerialize();
        console.log('\n serialize 1=\n'+s1);
        console.log('\n serialize 2=\n'+s2);

        let tr=bistransforms.createLinearTransformation();
        tr.parseFromText(s1,'m.json');

        let tr2=bistransforms.createLinearTransformation();
        tr2.parseFromText(s2,'m.matr');


        console.log('\nde-serialize 1=\n'+tr.serializeToText());
        console.log('\nde-serialize 2=\n'+tr2.legacySerialize());
        
        let error0=numeric.norminf(numeric.sub(reslice_transform.getMatrix(),tr.getMatrix()));
        let error1=numeric.norminf(numeric.sub(reslice_transform.getMatrix(),tr2.getMatrix()));

        console.log(' Deserialization errors=',error0,error1);
        assert.equal(true,(error0<0.01 && error1<0.01));
        
        
    });
    
    it('test image reslice linear',function() {
        this.slow(10);
        let ref_image=images[1], targ_image=images[0], true_image=images[3];
        let resliced=new BisWebImage(); resliced.cloneImage(ref_image);
        console.log('\n\n');
        console.log('refImage=',ref_image.getDescription(),'\n\t',ref_image.getFilename());
        console.log('targImage=',targ_image.getDescription(),'\n\t',targ_image.getFilename());
        console.log('trueImage=',true_image.getDescription(),'\n\t',true_image.getFilename());
        console.log('resliceJS=',resliced.getDescription());
        
        for (let i=0;i<repeat;i++)
            bisimagesmoothreslice.resliceImage(targ_image,resliced,reslice_transform,1);

        let dimensions= ref_image.getDimensions();
        let spacing=ref_image.getSpacing();

        
        let resliceW=libbiswasm.resliceImageWASM(targ_image,reslice_transform,
                                                 { "interpolation" : 1,
                                                   "dimensions": dimensions,
                                                   "spacing" : spacing},1);
        console.log('resliceW=',resliceW.getDescription());

        
        let CC=bisimagesmoothreslice.computeCC(true_image.getImageData(),resliced.getImageData());
        let CCWJ=bisimagesmoothreslice.computeCC(resliceW.getImageData(),resliced.getImageData());
        let CCW=bisimagesmoothreslice.computeCC(true_image.getImageData(),resliceW.getImageData());
        assert.equal(true,(CC>0.999 && CCWJ>0.999));

        console.log('++++ Correlation (linear interpolation) JS=',CC.toFixed(4),' WASM=',CCW.toFixed(4),", ( JS vs Wasm = ", CCWJ.toFixed(4),  ")\n");
    });

    it('test image reslice NN',function() {
        this.slow(10);
        let ref_image=images[1], targ_image=images[0];
        let resliced2=new BisWebImage(); resliced2.cloneImage(ref_image);

        let dimensions= resliced2.getDimensions();
        let spacing=resliced2.getSpacing();

        
        let reslicedW=libbiswasm.resliceImageWASM(targ_image,reslice_transform,
                                                  { "interpolation" : 0,
                                                    "dimensions": dimensions,
                                                    "spacing" : spacing},1);
        for (let i=0;i<repeat;i++)
            bisimagesmoothreslice.resliceImage(targ_image,resliced2,reslice_transform,0);


        
        let CC2=bisimagesmoothreslice.computeCC(images[4].getImageData(),resliced2.getImageData());
        let CCWJ=bisimagesmoothreslice.computeCC(resliced2.getImageData(),reslicedW.getImageData());
        
        assert.equal(true,(CC2>0.999 && CCWJ>0.999));
        console.log('+++++ Correlation (NN interpolation)',CC2.toFixed(4)," ( JS vs WASM = ", CCWJ.toFixed(4), ")\n");
    });

    it('test image reslice NN without clone',function() {
        this.slow(10);
        let ref_image=images[1], targ_image=images[0];
        let resliced2=new BisWebImage(); resliced2.createImage({ type : 'uchar',
                                                                 frames :1 ,
                                                                 dimensions : ref_image.getDimensions(),
                                                                 spacing : ref_image.getSpacing() });
        bisimagesmoothreslice.resliceImage(targ_image,resliced2,reslice_transform,0);
        let CC2=bisimagesmoothreslice.computeCC(images[4].getImageData(),resliced2.getImageData());
        assert.equal(true,(CC2>0.999));
        console.log('+++++ Correlation (NN interpolation no clone)',CC2.toFixed(4),"\n");
        let resliced3=new BisWebImage(); resliced3.cloneImage(ref_image);

    });

    it('test image reslice Cubic',function() {
        this.slow(10);
        let ref_image=images[1], targ_image=images[0];
        let resliced3=new BisWebImage(); resliced3.cloneImage(ref_image , { type : 'float' });
        let info_image=new BisWebImage(); info_image.cloneImage(ref_image , { type : 'float' });
        
        let float_targ_image=new BisWebImage(); float_targ_image.cloneImage(targ_image, { type : 'float' });
        let tdata=targ_image.getImageData();
        let ndata=float_targ_image.getImageData();
        for (let i=0;i<tdata.length;i++)
            ndata[i]=tdata[i];
        
        bisimagesmoothreslice.resliceImage(targ_image,resliced3,reslice_transform,3);

        //      let reslicedW=libbiswasm.resliceImageWASM(targ_image,info_image,reslice_transform,3);
        
        let reslicedW=libbiswasm.resliceImageWASM(targ_image,reslice_transform,
                                                  { "interpolation" : 3,
                                                    "backgroundValue" : 0.0,
                                                    "datatype" : "float",
                                                    "dimensions": info_image.getDimensions(),
                                                    "spacing" : info_image.getSpacing()
                                                  },1);
        
        let CC=bisimagesmoothreslice.computeCC(images[5].getImageData(),resliced3.getImageData());
        let CCW=bisimagesmoothreslice.computeCC(images[5].getImageData(),reslicedW.getImageData());
        let CCWJ=bisimagesmoothreslice.computeCC(resliced3.getImageData(),reslicedW.getImageData());

        console.log('++++ Correlation (Cubic interpolation) JS=',CC.toFixed(4),' WASM=',CCW.toFixed(4),", ( JS vs Wasm = ", CCWJ.toFixed(4),  ")\n");
        assert.equal(true,(CC>0.999 && CCWJ>0.999));



    });


    it('run resample',function() {
        let newspa = [ 2.5,4.5,6.5];
        let out=bisimagesmoothreslice.resampleImage(images[0],newspa,1);
        let CC=bisimagesmoothreslice.computeCC(images[1].getImageData(),out.getImageData());

        let outW=libbiswasm.resampleImageWASM(images[0],{ spacing : newspa ,
                                                          interpolaton : 1},1);
        
        
        let CCW=bisimagesmoothreslice.computeCC(images[1].getImageData(),outW.getImageData());

        let CCWJ=bisimagesmoothreslice.computeCC(outW.getImageData(),out.getImageData());
        
        console.log('+++++ Resampling (via Image Reslice): JS=' ,CC.toFixed(4), ' WASM=', CCW.toFixed(4) , ' (JS vs WASM=' , CCWJ.toFixed(4) , ')\n');
        
        assert.equal(true,(CC>0.999));

    });




    it('test image normalization',function() {
        //console.log('norm inp=',images[0].printinfo(''),'\n\n');
        let out=bisimagesmoothreslice.imageNormalize(images[0],0.10,0.75,255);
        let w_out=libbiswasm.normalizeImageWASM(images[0],{
            perlow : 0.10,
            perhigh :0.75,
            outmaxvalue :255},1);
        
        //      console.log('norm out=',out.printinfo(''));
        let error0=numeric.norminf(numeric.sub(out.getImageData(),images[2].getImageData()));
        let error1=numeric.norminf(numeric.sub(w_out.getImageData(),images[2].getImageData()));
        console.log('max difference: JS=',error0,' WASM=', error1);
        assert.equal(true,(error0<2));
    });
    

    /*
      it('wasm test 4x4 matrix creation',function() {
      
      const complex =  [ [  0.866,   -0.610,  0.000,   115.438],
      [  0.500,   1.057,   0.000,   -51.108],
      [  0.000,   0.000,   1.000,   2.250  ],
      [  0.000,   0.000,   0.000,   1.000  ]];
      const pvector=new Float32Array([15*2.5,0,0,
      0,0,30,
      1.0,1.22,1.0,
      0.0,0.0,0.0]);
      
      const ref_image=images[1];
      const targ_image=images[0];
      const dim_ref = ref_image.getDimensions(),spa_ref=ref_image.getSpacing();
      const dim_targ = targ_image.getDimensions(),spa_targ=targ_image.getSpacing();
      console.log('Images = ',dim_ref,spa_ref,' and ',dim_targ,spa_targ);
      
      const tr_js=bistransforms.createLinearTransformation(2);
      tr_js.setShifts(dim_ref,spa_ref,dim_targ,spa_targ);
      tr_js.setParameterVector(pvector);
      console.log('\nparams = ',tr_js.getParameterVector());
      const error_js=numeric.norminf(numeric.sub(tr_js.getMatrix(),complex));
      console.log('matrix js  =[ ',tr_js.legacySerialize("; "),'] error_js=',error_js.toFixed(5));
      

      const tr_wasm=libbiswasm.test_create_4x4matrix(ref_image,targ_image,pvector, { 'mode': 2},1);

      const error_wasm=numeric.norminf(numeric.sub(tr_wasm.getMatrix(),complex));
      const error_js_wasm=numeric.norminf(numeric.sub(tr_wasm.getMatrix(),tr_js.getMatrix()));
      console.log('wasm=',tr_wasm.getMatrix(),' js=',tr_js.getMatrix());

      
      console.log('matrix wasm = [ ',tr_wasm.legacySerialize("; "),'], error_wasm=',error_wasm.toFixed(5));
      
      console.log('matrix wasm-js =',error_js_wasm.toFixed(5));
      

      assert.equal(true,(error_js<0.01 && error_wasm < 0.01 && error_js_wasm < 0.001 ));
      
      });*/

    it('run old extract frame',function() {

        let out=bisimagesmoothreslice.imageExtractFrame(images[6],3);
        let out2=bisimagesmoothreslice.imageExtractFrame(images[6],4);

        let w_out=libbiswasm.extractImageFrameWASM(images[6],{ "frame" : 3},1);
        let w_out2=libbiswasm.extractImageFrameWASM(images[6],{ "frame" : 4},1);
        
        let error0=numeric.norminf(numeric.sub(out.getImageData(),images[7].getImageData()));
        let error1=numeric.norminf(numeric.sub(out2.getImageData(),images[7].getImageData()));

        let error2=numeric.norminf(numeric.sub(w_out.getImageData(),images[7].getImageData()));
        let error3=numeric.norminf(numeric.sub(w_out2.getImageData(),images[7].getImageData()));

        console.log('+++++ Extract frame: JS=' ,error0,' WASM=',error2);
        console.log('+++++     false positives extract frame: JS=' ,error1,' WASM=',error3);
        assert.equal(true,(error0<0.0001 && error1>50));

    });


});
