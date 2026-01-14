#!/usr/bin/env node

/*  LICENSE
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
 
 BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
 
 - you may not use this software except in compliance with the License.
 - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
 
 __Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions andX
 limitations under the License.__
 
 ENDLICENSE */



// -----------------------------------------------------------------
// Header and requirements for node.js
'use strict';

// -----------------------------------------------------------------
// Create command line
// -----------------------------------------------------------------

require('../../config/bisweb_pathconfig.js');
const program=require('commander');
const BisWebImage=require('bisweb_image');

//
const VAL=10.0;

var fixImages = async function(fnames, offset) {

    if (fnames.length<1) {
        return Promise.reject('No images specified\n');
    }

    
    for (let i=0;i<fnames.length;i++) {
        let img=new BisWebImage();
        try {
            await img.load(fnames[i]);
        } catch(e) {
            return Promise.reject(e);
        }

        let r=img.getIntensityRange();

        console.log('Image',i,'-->',img.getDescription(),'++++ Range = ',r)
        img.getImageData()[0]=VAL;
        let f=fnames[i].substr(0,fnames[i].length-7)+'_fixed_'+String(VAL)+'.nii.gz';
        try {
            await img.save(f);
            console.log('Saved in ',f);
        } catch(e) {
            return Promise.reject(e);
        }
    }
    
    return 'all set';
};


var help = function() {
    console.log('\nThis program sets the corner value to 10.0');
};

program.version('1.0.0')
    .option('-m, --offset <number>','offset')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);

   
   
let m=parseInt(program.offset || 0 );
let fnames=program.args;

console.log('Reading ',fnames.join(','));

fixImages(fnames,m).then( () => {
    console.log('done');
}).catch( (e) => {
    console.log('Error ',e);
});







