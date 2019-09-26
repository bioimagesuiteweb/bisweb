#!/usr/bin/env node

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



// -----------------------------------------------------------------
// Header and requirements for node.js
'use strict';

// -----------------------------------------------------------------
// Create command line
// -----------------------------------------------------------------

require('../../config/bisweb_pathconfig.js');
const program=require('commander');
const BisWebImage=require('bisweb_image');

var help = function() {
    console.log('\n');
};

program.version('1.0.0')
    .option('-i, --input <s>','filename of the input image')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let inpfilename=program.input || null;
let img=new BisWebImage();

img.load(inpfilename).then( async () => {


    console.log(' = = = = = = = = = = = = = = = = = = = = = =');
    console.log('Image Loaded from=',img.getDescription());

    let range=img.getIntensityRange();
    let scale=1.0/(range[1]-range[0]);
    console.log('Range =',range);
    console.log('Shift = ',range[0],' scale=',scale);
    let img2=new BisWebImage();
    img2.cloneImage(img,{ 'type' : 'float' });
    let idat=img.getImageData();
    let odat=img2.getImageData();
    for (let i=0;i<idat.length;i++)
        odat[i]=(idat[i]-range[0])*scale;

    let outname=inpfilename+'_scaled.nii.gz';
    img2.save(outname).then( () => {
        console.log('Output saved in',outname);
        process.exit(0);
    }).catch( (e) => {
        console.log(e);
        process.exit(1);
    });
    
}).catch( (e) => {
    console.log(e.stack);
    console.log(e);
    process.exit(1);
});

