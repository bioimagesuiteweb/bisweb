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
const path=require('path');
const BisWebImage=require('bisweb_image');

      
var help = function() {
    console.log('\nThis program prints the header for a set of images');
};

program.version('1.0.0')
    .option('-i, --input <s>','input functional image')
    .option('-r, --roi <s>','roi image')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);



let inpfilename=program.input || null;
let roifilename=program.roi || null;

if (inpfilename===null || roifilename===null) {
    console.log('No input or roi filename specified');
    process.exit(1);
}



let img=new BisWebImage();
let voi=new BisWebImage();

let bname=roifilename.substr(0,roifilename.length-7);

Promise.all( [
    img.load(inpfilename),
    voi.load(roifilename)
]).then( () => {

    console.log('Loaded  Image=',img.getDescription(),'\n\t  VOI : ',voi.getDescription(),' range=',voi.getIntensityRange(),'\n');
    
    let data=img.getImageData();
    let data2=voi.getImageData();

    let output= [ new BisWebImage(), new BisWebImage() ];
    let outdata= [ null,null ];
    for (let ia=0;ia<=1;ia++) {
        output[ia].cloneImage(img);
        outdata[ia]=output[ia].getImageData();
    }
    
    let mean=[0,0],sigma=[0,0],sum=[0,0],sum2=[0,0],num=[0,0];
    
    if (data.length !== data2.length) {
        console.log('Images have different dimensions');
        process.exit(1);
    }

    for (let i=0;i<data.length;i++) {
        let r=Math.round(data2[i]);
        if (r>0 && r<3) {
            r=r-1;
            let v=data[i];
            sum[r]+=v;
            sum2[r]+=v*v;
            num[r]+=1;
            outdata[r][i]=v;
        }
    }

    for (let j=0;j<=1;j++) {
        if (num[j]<0.01)
            num[j]=0.01;
                
        mean[j] = sum[j]/(num[j]);
        sigma[j] = Math.sqrt(sum2[j]/(num[j])-mean[j]*mean[j]);
        console.log(`*Result*,${inpfilename},${roifilename},${j},${num[j]},${mean[j]},${sigma[j]},${sigma[j]/mean[j]}`);
    }

    let fname=[ null,null ];
    for (let ia=0;ia<=1;ia++) {
        fname[ia]=path.join("masked",path.basename(bname)+`_region${ia+1}.nii.gz`);
    }

    Promise.all( [
        output[0].save(fname[0]),
        output[1].save(fname[1])
    ]).then( () => {

        console.log('All Saved ',fname.join('\n\t'));
        process.exit(0);
    });
});
