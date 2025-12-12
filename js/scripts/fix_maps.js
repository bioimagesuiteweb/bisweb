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
var fixImages = async function(fnames, offset) {

    if (fnames.length<2) {
        return Promise.reject('Less than two images specified\n');
    }

    
    let images=[];
    let range=[0,0];
    for (let i=0;i<fnames.length;i++) {
        images[i]=new BisWebImage();
        try {
            await images[i].load(fnames[i]);
        } catch(e) {
            return Promise.reject(e);
        }

        let r=images[i].getIntensityRange();

        if (r[0]<range[0])
            range[0]=r[0];
        if (r[1]>range[1])
            range[1]=r[1];
        console.log('++++ Range = ',r,' consolidated=',range)
    }
    
    let m=Math.floor(Math.max(Math.abs(range[0]),Math.abs(range[1]))+1.0);
    console.log('Ranges = ',range, 'final = ',m);
    for (let i=0;i<images.length;i++) {
        images[i].getImageData()[0]=m;
        let f=fnames[i].substr(0,fnames[i].length-8)+'_fixed_'+String(m)+'.nii.gz';
        try {
            await images[i].save(f);
            console.log('Saved in ',f);
        } catch(e) {
            return Promise.reject(e);
        }
    }
    
    return 'all set';
};


var help = function() {
    console.log('\nThis program normalizes two contrast maps to have same range by tweaking one voxel\n');
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







