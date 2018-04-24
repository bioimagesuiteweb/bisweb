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
    console.log('\nThis program prints the header for a set of images');
};

program.version('1.0.0')
    .option('-i, --input <s>','input file')
    .option('-p, --position <s>','i coordinate',parseInt)
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let inpfilename=program.input || null;

if (inpfilename===null) {
    console.log('No input filename specified');
    process.exit(1);
}

let position=program.position;
let outfilename=inpfilename.substr(0,inpfilename.length-7)+'_'+position+'_added.nii.gz';


console.log('Mapping ',inpfilename,' to ',outfilename, ' adding 6 above',position);

let img=new BisWebImage();
img.load(inpfilename).then( () => {

    let dim=img.getDimensions();
    let data=img.getImageData();
    for (let k=0;k<dim[2];k++) {
        for (let j=0;j<dim[1];j++) {
            let offset=j*dim[0]+k*dim[0]*dim[1];
            for (let i=position;i<dim[0];i++) {
                if (data[i+offset]>0) 
                    data[i+offset]=data[i+offset]+6;
            }
        }
    }

    img.save(outfilename).then( () => {
        console.log('Done ...');
        process.exit(0);
    });
});
