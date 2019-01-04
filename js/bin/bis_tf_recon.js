
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
const bistfutil = require('bis_tfutil');

const path=require('path');

var help = function() {
    console.log('\nThis program prints the header for a set of images');
};


// -------------------------------------------------------------------------

let reconAndSave=function(img,modelname,batchsize,padding,usegpu,outname) {

    const tf=require('bis_loadtf')(usegpu); // flag to look for GPU version
    
    return new Promise( async (resolve,reject) => {
	
	let URL='file://'+path.normalize(path.resolve(modelname));

	let model=null;
	try {
	    model=await bistfutil.loadAndWarmUpModel(tf,URL);
	} catch(e) {
	    console.log('--- Failed load model from',URL,e);
	    reject();
	}

	console.log('--- numTensors (post load): ' + tf.memory().numTensors);
	console.log('----------------------------------------------------------');
	console.log(`--- Beginning padding=${padding}`);
	let recon=new bistfutil.BisWebTensorFlowRecon(img,model,padding);
	let output=recon.reconstructImage(tf,batchsize);
	console.log('----------------------------------------------------------');
	console.log('--- Recon finished :',output.getDescription());
	
	output.save(outname).then( () => {
	    console.log('--- \t file saved in',outname);
	    resolve();
	}).catch( (e) => {
	    console.log('--- Failed to save in',outname,e);
	    reject();
	});
    });
};



// -------------------------------------------------------------------------

program.version('1.0.0')
    .option('-i, --input <s>','filename of the image to segment')
    .option('-o, --output <s>','filename to save recon in')
    .option('-m, --modelname <s>','model directory')
    .option('-b, --batchsize <s>','batch size')
    .option('-p, --padding <s>','padding')
    .option('-g, --usegpu','try to use GPU for processing if possible')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let inpfilename=program.input || null;
let outfilename=program.output || null;
let modelname = program.modelname || null;
let batchsize = parseInt(program.batchsize || 1);
let padding = parseInt(program.padding || 8);
let usegpu = program.usegpu || false;
let debug=program.debug || 0;

if (program.input===null || program.output===null || program.modelname === null) {
    console.log('Must specify filenames/model directory');
    process.exit(1);
}

let input=new BisWebImage();
console.log('----------------------------------------------------------\n---');
input.load(inpfilename).then( () => { 
    console.log('----------------------------------------------------------');
    reconAndSave(input,modelname,batchsize,padding,usegpu,outfilename).then( () => {
	process.exit(0);
    }).catch( () => {
	process.exit(1);
    });
}).catch( (e) => {
    console.log(e.stack);
    process.exit(1);
});




