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
const libbiswasm=require('libbiswasm_wrapper');
const numeric=require('numeric');


let images = [ new BisWebImage(),new BisWebImage(),new BisWebImage(),new BisWebImage() ];
let imgnames = [ 'MNI_2mm_orig.nii.gz', 
                 'MNI_2mm_scaled.nii.gz',
                 'MNI_6mm.nii.gz',
                 'MNI_6mm_scaleddispfield.nii.gz'
               ];

let tname=path.resolve(__dirname, 'testdata/MNI_2mm_scaled.grd' );

let fullnames = [ '','','','','' ];
for (let i=0;i<=3;i++) {
    fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
    console.log(i+':',fullnames[i]);
}

let bsplinecombo_inp=bistransforms.createComboTransformation();


describe('Testing New Style Bspline Grid Code\n', function() {

    this.timeout(50000);
    

    before(function(done){

        let p = [ libbiswasm.initialize() ];
        for (let i=0;i<=3;i++)
            p.push( images[i].load(fullnames[i]));
        p.push( bsplinecombo_inp.load(tname));
        Promise.all(p).then( () => { done();});
    });


    it('test loading of spline grid from.grd',function() {

        let totalerror=0.0;
        let fnames = [ "a.grd", "a.json" ];
        for (let mode=1;mode>=0;mode=mode-1) {
            
            let bsplinecombo=bistransforms.createComboTransformation();
            let lines="";
            if (mode===1)
                lines=bsplinecombo_inp.serializeToText();
            else
                lines=bsplinecombo_inp.legacySerialize();
            bsplinecombo.parseFromText(lines,fnames[mode]);
            
            let pt370=[ -1.5743, -0.0616, -1.1677 ];
            let bsplinegrid=bsplinecombo.getGridTransformation(0);
            let g=bsplinegrid.getDisplacementField();
            let n=bsplinegrid.getNumberOfControlPoints();
            let disp = [ g[370],g[n+370],g[2*n+370]];
            let error0=numeric.norminf(numeric.sub(disp,pt370));
            console.log("++++ checking bspline grid loading mode=",mode,'('+fnames[mode]+') error0=',error0.toFixed(4));
            totalerror+=error0;
        }
        assert(true,totalerror<0.0001);
    });


    it('test loading of spline grid from.grd via factory',function() {

        let totalerror=0.0;
        let fnames = [ "a.grd", "a.json" ];
        for (let mode=1;mode>=0;mode=mode-1) {
            
            let lines="";
            if (mode===1)
                lines=bsplinecombo_inp.serializeToText();
            else
                lines=bsplinecombo_inp.legacySerialize();

            let bsplinecombo=bistransforms.parseTransformationFromText(lines,fnames[mode],console.log);
            
            let pt370=[ -1.5743, -0.0616, -1.1677 ];
            let bsplinegrid=bsplinecombo.getGridTransformation(0);
            let g=bsplinegrid.getDisplacementField();
            let n=bsplinegrid.getNumberOfControlPoints();
            let disp = [ g[370],g[n+370],g[2*n+370]];
            let error0=numeric.norminf(numeric.sub(disp,pt370));
            console.log("++++ checking bspline grid loading mode=",mode,'('+fnames[mode]+') error0=',error0.toFixed(4));
            totalerror+=error0;
        }
        assert(true,totalerror<0.0001);
    });


    it ('test linear loading via factory',function() {
        let reslice_matr = [ [  0.866,  -0.525  , 0.000,  68.758 ],
                             [  0.500,   0.922 ,  0.000 ,  9.793 ],
                             [ 0.000,   0.020 ,  1.000 ,  2.250 ],
                             [ 0.000,   0.000,   0.000 ,  1.000  ]];

        let orig=bistransforms.createLinearTransformation();
        let omat=orig.getMatrix();
        orig.setMatrix(reslice_matr);

        let totalerror=0.0;
        let fnames = [ "a.matr", "a.json" ];
        for (let mode=1;mode>=0;mode=mode-1) {
            
            let lines="";
            if (mode===1)
                lines=orig.serializeToText();
            else
                lines=orig.legacySerialize();

            let newxform=bistransforms.parseTransformationFromText(lines,fnames[mode],console.log);
            let nmat=newxform.getMatrix();

            let error0=numeric.norm2(numeric.sub(omat,nmat));
            
            console.log("++++ checking matrix loading mode=",mode,'('+fnames[mode]+') error0=',error0.toFixed(4));
            totalerror+=error0;
        }
        assert(true,totalerror<0.0001);
    });


    

    it('test displacement field for bspline',function() {

        let s1=new Date().getTime();
        let out=bisimagesmoothreslice.computeDisplacementField(images[2],bsplinecombo_inp);
        let s2=new Date().getTime();
        let error2=bisimagesmoothreslice.computeImageSSD(out,images[3]);
        let s3=new Date().getTime();
        let l=images[3].getImageData().length;
        let error1=Math.sqrt(numeric.norm2Squared(numeric.sub(out.getImageData(),images[3].getImageData()))/l);
        console.log('+++++ Displacement Field average sqrt(SSD) error=',error1.toFixed(4),'diff2=',error2.toFixed(4),'time=',s2-s1,s3-s2);
        assert.equal(true,(error1<0.2 && (Math.abs(error1-error2)<0.1)));
    });


    it('test displacement field for bspline',function() {
        
        let js_grid=bsplinecombo_inp.getGridTransformation(0);
        let js_out=bisimagesmoothreslice.computeDisplacementField(images[2],js_grid);
        const dim=images[2].getDimensions();
        const spa=images[2].getSpacing();
        const obj = { "dimensions" : [ dim[0],dim[1],dim[2] ],
                      "spacing" : [ spa[0],spa[1],spa[2] ]
                    };

        let out=bisimagesmoothreslice.computeDisplacementField(images[2],js_grid);
        let out2=bisimagesmoothreslice.computeDisplacementField(images[2],bsplinecombo_inp);
        let error3=bisimagesmoothreslice.computeImageSSD(out,out2);
        console.log('js grid v combo',error3);

        let wasm_out=libbiswasm.computeDisplacementFieldWASM(js_grid,
                                                             obj,1);
        console.log('wasm=',wasm_out.getDescription());

        let wasm_out2=libbiswasm.computeDisplacementFieldWASM(bsplinecombo_inp,
                                                              obj,1);
        console.log('wasm2=',wasm_out2.getDescription());

        let TX=[0,0,0]; js_grid.transformPoint([20,20,20],TX);
        console.log(' Grid 20,20,20=',TX);
        let TY=[0,0,0]; bsplinecombo_inp.transformPoint([20,20,20],TY);
        console.log(' Combo 20,20,20=',TY);
        
        let error2=bisimagesmoothreslice.computeImageSSD(js_out,wasm_out);
        let error1=bisimagesmoothreslice.computeImageSSD(js_out,images[3]);
        let error0=bisimagesmoothreslice.computeImageSSD(wasm_out,images[3]);
        let error4=bisimagesmoothreslice.computeImageSSD(out2,wasm_out2);
        console.log('+++++ Displacement Field average sqrt(SSD)  JS v WASM =',error2.toFixed(4),' JS v GOLD=',error1.toFixed(4),' WASM v GOLD=',error0.toFixed(4));
        console.log('+++++ Grid-Combo (since combo linear=identity)= ',error4.toFixed(8));
        

        assert.equal(true,(error0<0.1 && error1<0.1 && error2  < 0.1 && error4<0.00001));
    });

    it('test wasm bending energy',function() {

        let debug=1;
        let numfailed=libbiswasm.test_bendingEnergy(bsplinecombo_inp,debug);
        console.log('\n Back to JS. numfailed=',numfailed);
        assert.equal(0,numfailed);

    });


    it('fit displacement field with bspline and compare',function() {
        console.log('\n\n\n\n');
        
        let dispfield=images[3];

        let newgrid=bistransforms.createGridTransformation([ 8,8,8],[30,30,30],[0,0,0]);
        newgrid.initializeFromDisplacementField(dispfield);

        let outgrid=libbiswasm.approximateDisplacementFieldWASM(dispfield,newgrid,
                                                                { stepsize : 0.5,
                                                                  steps : 1,
                                                                  lambda : 0.1, 
                                                                  iterations : 10,
                                                                  tolerance : 0.0001,
                                                                  optimization :2,
                                                                  windowsize : 2.0,
                                                                  levels : 2,
                                                                  resolution : 2.0,
                                                                  inverse : false,
                                                                },true);
        

        let wasm_field=libbiswasm.computeDisplacementFieldWASM(outgrid,
                                                               {
                                                                   "dimensions" : dispfield.getDimensions(),
                                                                   "spacing" : dispfield.getSpacing()
                                                               },1);
        

        let new_grid=bisimagesmoothreslice.computeDisplacementField(dispfield,outgrid);
        let error0=bisimagesmoothreslice.computeImageSSD(new_grid,dispfield);
        let error1=bisimagesmoothreslice.computeImageSSD(wasm_field,dispfield);
        console.log('+++++ Displacement Field average sqrt(SSD) WASM v GOLD=',error0.toFixed(4),error1.toFixed(4));

        assert.equal(true,(error0<0.2 && error1<0.2));
    });

    it('fit displacement field with bspline and compare inverse',function() {
        console.log('\n\n\n\n');

        let compute_error=function(inverse) {
            
            let forward_dispfield=bisimagesmoothreslice.computeDisplacementField(images[2],bsplinecombo_inp);
            
            let newgrid=bistransforms.createGridTransformation([ 8,8,8],[30,30,30],[0,0,0]);
            newgrid.initializeFromDisplacementField(forward_dispfield,inverse);

            let iter=10;
            let steps=1;
            if (inverse) {
                iter=20;
                steps=2;
            }
            
            let inverse_grid=libbiswasm.approximateDisplacementFieldWASM(forward_dispfield,newgrid,
                                                                         { stepsize : 1.0,
                                                                           steps : steps,
                                                                           lambda : 0.01, 
                                                                           iterations : iter,
                                                                           tolerance : 0.0001,
                                                                           optimization :2,
                                                                           windowsize : 2.0,
                                                                           levels : 1,
                                                                           resolution : 2.0,
                                                                           inverse : inverse,
                                                                         },false);
            
            
            
            let error=0.0;
            let num=0.0;
            for (let x=30;x<=90;x+=30) {
                for (let y=30;y<=90;y+=30) {
                    for (let z=30;z<=90;z+=30) {
                        let X= [ x,y,z ];
                        let TX=[ 0,0,0 ];
                        let Y= [ 0,0,0 ];
                        
                        let d=0.0;
                        bsplinecombo_inp.transformPoint(X,TX);
                        if (inverse) {
                            inverse_grid.transformPoint(TX,Y);
                            d=Math.sqrt(Math.pow(X[0]-Y[0],2.0)+
                                        Math.pow(X[1]-Y[1],2.0)+
                                        Math.pow(X[2]-Y[2],2.0));
                        } else {
                            inverse_grid.transformPoint(X,Y);
                            d=Math.sqrt(Math.pow(TX[0]-Y[0],2.0)+
                                        Math.pow(TX[1]-Y[1],2.0)+
                                        Math.pow(TX[2]-Y[2],2.0));
                        }
                        error+=d;
                        num+=1.0;
                        for (let ia=0;ia<=2;ia++) {
                            TX[ia]=parseFloat(TX[ia].toFixed(3));
                            Y[ia]=parseFloat(Y[ia].toFixed(3));
                        }
                        console.log("X=",X," --> TX=" , TX, "---> Y =" , Y,' ---> d=',d.toFixed(3));
                        
                    }
                }
            }
            let error0=error/num;
            console.log("Average error (inverse=" , inverse,")=" ,error0);
            return error0;
        };

        let error_for=compute_error(false);
        let error_inv=compute_error(true);

        console.log("\n\n Done forward=", error_for.toFixed(3), " rev_error=" , error_inv.toFixed(3));
        assert.equal(true,(error_for<0.2 && error_inv<0.2));
    });


});

