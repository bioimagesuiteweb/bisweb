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
    console.log('\nThis program computes a hash code for a file (read as a binary array)');
};

program.version('1.0.0')
    .option('-i, --input <s>','filename of the input matrix')
    .option('-r, --rows <n>','add rows')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let inpfilename=program.input || null;
let rows= program.rows || 1;
let mat=new BisWebMatrix();

mat.load(inpfilename).then( async () => {


    console.log(' = = = = = = = = = = = = = = = = = = = = = =');
    console.log('Matrix Loaded from=',mat.getDescription());

    let dim=mat.getDimensions();

    let numvoxels=dim[1];
    if (dim[1]===1 && rows>1)
        numvoxels=rows;
    
    let idim=[ numvoxels,numvoxels,1];
    
    let numframes=dim[0];
    console.log('Numframes=',numframes);
    
    let img=new BisWebImage();
    img.createImage({
        dimensions : idim,
        numframes : numframes,
        type : 'float',
    });

    console.log('Image created',img.getDescription());
                
    let imgdata=img.getImageData();
    let matrix=mat.getNumericMatrix();

    let d=img.getDimensions();
    numvoxels=d[0]*d[1]*d[2];

    for (let frame=0;frame<numframes;frame++) { 
        for (let i=0;i<numvoxels;i++) {
            let j=i,scale=1.0;
            if (dim[1]===1) {
                j=0;
                scale=(i+1);
            }
            let index=frame*numvoxels+i;
            imgdata[index]=matrix[frame][j]*scale;
            if (i===0)
                console.log('i=',i,frame,' j=',j,' index=',index,' val=',imgdata[index]);
            ++index;
        }
    }
    let outname=inpfilename+'.nii.gz';
    img.save(outname).then( () => {
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

