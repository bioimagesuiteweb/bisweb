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
const BisWebSurface=require('bisweb_image');
const path=require('path');
const os=require('os');
const tempfs = require('temp').track();
console.log('tmp=',os.tmpdir());


const tmpDirPath=tempfs.mkdirSync('test_image');
const tmpFname=path.resolve(tmpDirPath,'save2.nii.gz');


describe('Testing BisWebSurface (from bisweb_surface.js) a class that reads Surfaces\n', function() {

    this.timeout(50000);

    let initial_fname=path.resolve(__dirname, 'testdata/rpm/brain_pure.json');
    let surface=new BisWebSurface();


    before( async () => { 

        
        
            shortimage.load(gold_fname).then( ()=> { done();});
        });
        
        it('check it has correct dimensions '+gold_dim,function() {
            let dim=shortimage.getDimensions();
            console.log('dim=',dim);
            let dim_error=0;
            for (let i=0;i<=3;i++) {
                dim_error+=Math.abs(gold_dim[i]-dim[i]);
            }
            console.log('_____ actual dim=',dim,' dim_error=',dim_error);
            
            
            assert.equal(0,dim_error);
        });


        it('check if it read correct intensities at '+gold_loc+' = '+ gold_intensity,function() {
            let imgdata=shortimage.getImageData();
            let dim=shortimage.getDimensions();
            let act_intensity=imgdata[gold_loc[0] + gold_loc[1]*dim[0]+ gold_loc[2]*dim[0]*dim[1]];
            console.log('_____ actual intensity=',act_intensity);
            assert.equal(0,act_intensity-gold_intensity);
        });


    });
});




