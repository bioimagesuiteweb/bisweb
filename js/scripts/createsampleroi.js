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
const util=require('bis_util');

var help = function() {
    console.log('\n');
};

program.version('1.0.0')
    .option('-o, --output <s>','filename of the input image')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let outfilename=program.output || null;

let output=new BisWebImage();
output.createImage({
    'dimensions' : [ 5,6,2 ],
    'numframes' : 2,
    'type' : 'short'
});

let odata=output.getImageData();

for (let frame=0;frame<=1;frame++) {
    let offset=frame*5*6*2;

    for (let i=2;i<4;i++)
        odata[i+offset]=1;

    if (frame===0) {
        for (let i=10;i<14;i++)
            odata[i+offset]=2;
    } else {
        for (let i=10;i<12;i++)
            odata[i+offset]=3;
    }
    
    for (let i=17+frame;i<19;i++)
        odata[i+offset]=4;
}

output.save(outfilename+'.nii.gz').then( () => {

    let omat=util.zero(4,3);
    omat[0][0]=1;    omat[0][1]=2; omat[0][2]=2;
    omat[1][0]=2;    omat[1][1]=4; omat[1][2]=0;
    omat[2][0]=3;    omat[2][1]=0; omat[2][2]=2;
    omat[3][0]=4;    omat[3][1]=2; omat[3][2]=1;
    let outmat=new BisWebMatrix();
    outmat.setFromNumericMatrix(omat);
    outmat.save(outfilename+'.csv').then( () => {
        console.log('Done');
        process.exit(0);
    });
});
