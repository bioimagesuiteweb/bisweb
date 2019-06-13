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
const BisWebMatrix=require('bisweb_matrix');
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

    let dim=img.getDimensions();

    let numvoxels=dim[1]*dim[0]*dim[2];
    let numframes=dim[3];

    
    let mat=new BisWebMatrix();
    mat.zero(numframes,numvoxels);
    console.log('Matrix created',mat.getDescription());
                
    let imgdata=img.getImageData();
    
    for (let frame=0;frame<numframes;frame++) { 
        for (let i=0;i<numvoxels;i++) {
            mat.setElement(frame,i,imgdata[i+frame*numvoxels]);
        }
    }
    let outname=inpfilename+'.csv';
    mat.save(outname).then( () => {
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

