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

/*
would probably do things in this order
a.	First spatial smoothing
b.	Regress motion parameters
c.	Bandpass filtering
d.	GSR
*/

'use strict';

const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const genericio = require('bis_genericio.js');
const smoothModule = require("smoothImage");
const regressOutImage = require("regressOutImage");
const butterworthFilterImage = require("butterworthFilterImage");
const driftCorrectImage = require("driftCorrectImage");
const computeROI = require("computeROI");
const util = require("bis_util");
const BisWebMatrix=require('bisweb_matrix');
const BisWebImage=require('bisweb_image');


const create_matrix=function(paramlist,numframes=-1) {

    if (numframes<0)
        numframes=paramlist.length;

    let obj=JSON.parse(paramlist[0].data);
    let numcols=obj.parameters.length;
    
    let mat=util.zero(numframes,numcols);

    for (let frame=0;frame<numframes;frame++) {

        let inframe=frame;
        if (inframe>=paramlist.length)
            inframe=paramlist.length-1;

        //console.log(paramlist[frame]);
        let obj=JSON.parse(paramlist[inframe].data);
        for (let col=0;col<numcols;col++)
            mat[frame][col]=obj.parameters[col];

    }

    
    let output=new BisWebMatrix('matrix',mat);
    console.log('Created output matrix=',output.getDescription());
    return output;
};

/**
 * Runs fmri Prperocessing pipeline 
 */

class PreprocessfMRIModule extends BaseModule {
    constructor() {
        super();
        this.name = 'preprocessfMRI';
        this.JSOnly=true;
        this.useworker=false;
    }

    getDescription() {
        let des={
            "name": "Preprocess fMRI",
            "description": "Preprocesses resting state fMRI images",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "preprocess",
            "inputs" : [
                {
                    'type': 'image',
                    'name': 'Input Image',
                    'description': 'The fmri image to preprocess',
                    'varname': 'input',
                    'shortname': 'i',
                    'required': true,
                    'guiviewerinput' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type': 'image',
                    'name': 'Mask Image',
                    'description': 'The mask to determine global signal and zero out parts etc. If not specified, then a 5% threshold is used to generate this.',
                    'varname': 'mask',
                    'shortname': 'm',
                    'required': false,
                    'guiviewertype' : 'overlay',
                    'guiviewer'  : 'viewer1',
                    'colortype'  : 'Orange'
                }
            ],
            "outputs": baseutils.getImageToImageOutputs(),
            "params": [
                {
                    "name": "TR",
                    "description": "Temporaal resolution of image (in s)",
                    "priority": 0,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "tr",
                    "default": 1.0,
                    "type": 'float',
                    "low":  0.0,
                    "high": 8.0,
                    "step": 0.1,
                },
                {
                    "name": "Smooth Sigma",
                    "description": "The gaussian kernel standard deviation (in fwhmax) If <0.01 no smoothing is done.",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 0.0,
                    "type": 'float',
                    "low":  0.0,
                    "high": 8.0,
                    "step": 0.1,
                },
                {
                    "name": "regressmotion",
                    "description": "If true regress motion parameters",
                    "priority": 3,
                    "advanced": false,
                    "gui": "check",
                    "varname": "regressmotion",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "motionparams",
                    "description": "motion parameters file (if not specified, try to infer from image filename .nii.gz --> .json)",
                    "priority": 2,
                    "advanced": true,
                    "type": 'string',
                    "varname" : 'motionparams',
                    "default": '',
                },
                {
                    "name": "dobandbass",
                    "description": "If true performs bandpass filtering",
                    "priority": 4,
                    "advanced": false,
                    "gui": "check",
                    "varname": "dobandpass",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "dogsr",
                    "description": "If true performs bandpass filtering",
                    "priority": 4,
                    "advanced": false,
                    "gui": "check",
                    "varname": "dogsr",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "Polynomial",
                    "description": "polynomial order to regress (-1 =skip)",
                    "priority": 10,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "polynomial",
                    "default": -1,
                    "type": 'int',
                    "low":  -1,
                    "high": 3,
                    "step": 1,
                },
                {
                    "name": "low",
                    "description": "Low pass cutoff Hz",
                    "priority": 10,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "blow",
                    "default": 0.2,
                    "type": 'float',
                    "low":  0.01,
                    "high": 5.0,
                    "step": 0.01,
                },

                {
                    "name": "high",
                    "description": "High pass cutoff Hz",
                    "priority": 11,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "bhigh",
                    "default": 0.2,
                    "type": 'float',
                    "low":  0.01,
                    "high": 5.0,
                    "step": 0.01,
                },
                baseutils.getDebugParam(),
            ],

        };
        return des;
    }

    async directInvokeAlgorithm(vals) {
        console.log('PreprocessfMRI invoking with vals', JSON.stringify(vals));

        let input = this.inputs['input'];
        let debug=vals['debug'];
        let current_output=input;

        let maskimage = this.inputs['mask'] || null;
        if (maskimage) {
            if (!input.hasSameSizeAndOrientation(maskimage,0.01,true))
                return Promise.reject("Input Image and mask have different sizes");
        }

        if (vals['sigma']>0.01) {
            console.log('\n\n\n');
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log(' = = = Smoothing fwhmx='+vals['sigma' ]);
            let smooth_mod=new smoothModule();
            smooth_mod.makeInternal();
            try {
                await smooth_mod.execute( {
                    'input' : current_output
                }, {
                    'sigma' :  vals['sigma'] ,
                    'inmm' : true ,
                    'debug' :debug
                });
            } catch(e) {
                return Promise.reject('Failed to smooth image'+e);
            }
            current_output=smooth_mod.getOutputObject('output');
        }
        
        
        if (vals['regressmotion'] === true ) {
            console.log('\n\n\n');
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log(' = = = Regressing motion parameters');
            let fname='';
            if (vals['motionparams'].length>1) {
                fname=vals['motionparams'];
            } else {
                let ind= input.getFilename().lastIndexOf('.nii.');
                console.log('Ind=',ind);
                fname=input.getFilename().substring(0,ind)+'.json';
            }

            console.log(' = = = Loading motion parameters from '+fname);
            let mparam=null;
            try {
                let obj=await genericio.read(fname);
                mparam=JSON.parse(obj.data).itemlist;
                console.log('= = = Loaded ',mparam.length,' frames of motion parameters');
                
            } catch(e) {
                return Promise.reject('Failed to load motion parameters from'+fname+' '+e);
            }


            // XENIOS -- this should be an error!!!!
            let l=mparam.length;
            if (l!==input.getDimensions()[3])
                console.log('Bad motion parameters nframes='+mparam.length+' vs '+input.getDimensions()[3]);
            let mat=create_matrix(mparam,input.getDimensions()[3]);

            
            let regress_1=new regressOutImage();
            try {
                await regress_1.execute({
                    'input' : current_output,
                    'regressor' : mat
                }, {
                    'debug' : debug
                });
            } catch(e) {
                return Promise.reject('Failed to regress motion parameters'+e);
            }
            current_output=regress_1.getOutputObject('output');
            console.log('___ Motion regress output=',current_output.getDescription());
        }

        if (vals['dobandpass']) {
            console.log('\n\n\n');
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log(' = = = Bandpass filtering='+vals['blow']+':'+vals['bhigh']+' TR=',vals['tr']);
            
            let bandpass_mod=new butterworthFilterImage();
            try {
                await bandpass_mod.execute({
                    'input' : current_output,
                }, {
                    'type' : 'band',
                    'low' : vals['blow'],
                    'high' : vals['bhigh'],
                    'tr' : vals['tr'],
                    'debug' : debug
                });
            } catch(e) {
                return Promise.reject('Failed to regress bandpass filter image'+e);
            }
            current_output=bandpass_mod.getOutputObject('output');
            console.log('___ Bandpass output=',current_output.getDescription());
                                    
        }

        if (vals['polynomial']>-1) {
            console.log('\n\n\n');
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log(' = = = Drift Correction: polynomial order='+vals['polynomial']);
            
            let polynomial_mod=new driftCorrectImage();
            try {
                await polynomial_mod.execute({
                    'input' : current_output,
                }, {
                    'order' : vals['polynomial'],
                    'debug' : debug
                });
            } catch(e) {
                return Promise.reject('Failed to regress polynomial'+e);
            }
            current_output=polynomial_mod.getOutputObject('output');
            console.log('___ Drift Correction output=',current_output.getDescription());
        }
        

        if (vals['dogsr']) {
            console.log('\n\n\n');
            let roiimage=new BisWebImage();
            roiimage.cloneImage(input,{ type: 'uchar', numframes : '1' });
            let rdata=roiimage.getImageData();
            let mdata=null;
            let threshold=0.5;
            let name='specified';
            if (maskimage) {
                mdata=maskimage.getImageData();
            } else {
                name='auto';
                mdata=input.getImageData();
                let r=input.getIntensityRange();
                threshold=r[0]*0.95+0.05*r[1];
            }
            let numvoxels=rdata.length;
            for (let i=0;i<numvoxels;i++) {
                if (mdata[i]>=threshold)
                    rdata[i]=1;
                else
                    rdata[i]=0;
            }

            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log(' = = = GSR. Using '+name+' mask. Threshold='+threshold);

            let roi=new computeROI();
            try {
                await roi.execute({ 'input' : current_output,
                                    'roi' : roiimage
                                  }, {
                                      'debug' : debug,
                                      'storecentroids' : false,
                                      'usejs' : false,
                                  });
            } catch(e) {
                return Promise.reject('Failed to compute Global Signal'+e);
            }

            let globalsignal=roi.getOutputObject('output');
            console.log('___ Global Signal Output=',globalsignal.getDescription());

            let regress_2=new regressOutImage();
            try {
                await regress_2.execute({
                    'input' : current_output,
                    'regressor' : globalsignal,
                }, {
                    'debug' : debug
                });
            } catch(e) {
                return Promise.reject('Failed to regress motion parameters'+e);
            }
            current_output=regress_2.getOutputObject('output');
            console.log('___ GSR regress output=',current_output.getDescription());
        }

        console.log(' = = = = = = = = = = = = = = = = = = = = = =');
        console.log(' = = = Done');
        this.outputs['output'] = current_output;
        return Promise.resolve('Done');
    } 
    
}

module.exports = PreprocessfMRIModule;

