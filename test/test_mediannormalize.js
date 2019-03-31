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
/*global describe, it,before */
"use strict";

require('../config/bisweb_pathconfig.js');

const assert = require("assert");
const BisWebImage=require('bisweb_image');
const numeric=require('numeric');
const libbiswasm=require('libbiswasm_wrapper');


describe('Testing MedianImageNormalization',function() {

    before(function(done) {

        libbiswasm.initialize().then( () => { done(); });
    });
    
    it ('test image 1', () => {
        let img=new BisWebImage();
        img.createImage({ dimensions: [ 10,10,1 ]});
        let imgdata=img.getImageData();
        for (let i=0;i<imgdata.length;i++) {
            imgdata[i]=2*(99-i);
        }

        let out2=new BisWebImage();
        out2.cloneImage(img, { 'type' : 'float' });
        let odata2=out2.getImageData();

        for (let i=0;i<odata2.length;i++) {
            odata2[i]=(imgdata[i]-100.0)/100.0;
        }
        console.log("JS Norm:",odata2[25],odata2[50],odata2[75]);
        
        let out3=libbiswasm.medianNormalizeImageWASM(img,2);
        let odata3=out3.getImageData();
        console.log("Wasm Norm:",odata3[25],odata3[50],odata3[75]);
        
        let error0=numeric.norminf(numeric.sub(odata2,odata3));
        console.log('Max error=',error0);
        let flag=false;
        if (error0<0.001)
            flag=true;
        
        assert.equal(true, flag);
    });


    it ('test image 1', () => {
        let img=new BisWebImage();
        img.createImage({ dimensions: [ 9,9,1 ]});
        let imgdata=img.getImageData();
        for (let i=0;i<imgdata.length;i++) {
            imgdata[i]=80-i;
        }

        let out2=new BisWebImage();
        out2.cloneImage(img, { 'type' : 'float' });
        let odata2=out2.getImageData();

        for (let i=0;i<odata2.length;i++) {
            odata2[i]=(imgdata[i]-40.0)/40.0;
        }
        console.log("JS Norm:",odata2[20],odata2[40],odata2[60]);
        
        let out3=libbiswasm.medianNormalizeImageWASM(img,2);
        let odata3=out3.getImageData();
        console.log("Wasm Norm:",odata3[20],odata3[40],odata3[60]);
        
        let error0=numeric.norminf(numeric.sub(odata2,odata3));
        console.log('Max error=',error0);
        let flag=false;
        if (error0<0.001)
            flag=true;
        
        assert.equal(true, flag);
    });
});

