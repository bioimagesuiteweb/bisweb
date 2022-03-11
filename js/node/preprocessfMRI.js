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
    let sums=new Float32Array(numcols);
    let sums2=new Float32Array(numcols);
    let bad=new Array(numcols);
    for (let i=0;i<numcols;i++) {
        sums[i]=0.0;
        sums2[i]=0.0;
        bad[i]=false;

    }

    
    for (let frame=0;frame<numframes;frame++) {

        let inframe=frame;
        if (inframe>=paramlist.length)
            inframe=paramlist.length-1;

        //console.log(paramlist[frame]);
        let obj=JSON.parse(paramlist[inframe].data);
        for (let col=0;col<numcols;col++) {
            let v=obj.parameters[col];
            if (isNaN(v))
                v=0.0;
            mat[frame][col]=v;
            sums[col]+=v;
            sums2[col]+=v*v;
        }
    }

    let numbad=0;

    for (let i=0;i<numcols;i++) {
        sums[i]=sums[i]/numframes;
        sums2[i]=Math.sqrt(sums2[i]/numframes-sums[i]*sums[i]);

        if (sums2[i]<0.01) {
            bad[i]=true;
            numbad=numbad+1;
            console.log('---- Column ',i,' is bad mean=',sums[i],' std=',sums2[i]);
        } else {
            console.log('++++ Column ',i,' is good mean=',sums[i],' std=',sums2[i]);
        }
    }

    for (let i=0;i<numcols-1;i++) {
        if (bad[i]===false) {
            for (let j=i+1;j<numcols;j++) {
                if (bad[j]===false) {
                    let sum=0.0;
                    for (let k=0;k<numframes;k++) {
                        sum+=mat[k][i]*mat[k][j];
                    }
                    console.log('\t\t checking for parallel parameters dot(',i,',',j,')=',sum);
                    if (Math.abs(sum)<0.001) {
                        bad[j]=true;
                        console.log('---- Marking column',j,' as bad ... ');
                        numbad+=1;
                    }
                }
            }
        }
    }
            
    

    if (numbad===numcols) {
        console.log('All motion parameters are bad. Not regressing motion');
        return null;
    }

    if (numbad>0) {
        let numgood=numcols-numbad;
        let newmat=util.zero(numframes,numgood);
        console.log('Beginning to remove columns total=',numcols,' numbad=',numbad,' numgood=',numgood);
        let good=new Array(numgood);
        for (let i=0;i<numgood;i++) {
            good[i]=-1;
        }

        for (let i=0;i<numgood;i++) {
            let nextj=0;
            //console.log('Starting',i,' nj=',nextj, 'bad=',bad);
            while (good[i]<0) {
                if (bad[nextj]===false) {
                    good[i]=nextj;
                    bad[nextj]=true;
                } else {
                    nextj=nextj+1;
                }
            }
            //console.log('Done i=',i,good);
        }

        console.log('Mapping to remove bad columns numgood=',good,' numbad=',numbad,' mapping=',good);
        for (let i=0;i<numgood;i++) {
            let j=good[i];
            console.log('copying column ',j,' to column ',i);
            for (let frame=0;frame<numframes;frame++) {
                newmat[frame][i]=mat[frame][j];
            }
        }

        const output=new BisWebMatrix('matrix',newmat);
        return output;
    } 

    const output=new BisWebMatrix('matrix',mat);
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
                    "description": "Temporal resolution of image (in s)",
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
                    "description": "The gaussian kernel standard deviation (in fwhmax) If <0.01 no smoothing is done",
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
                    "description": "The filename to load motion parameters from (specify csv or .json. If not specified, try to infer from image filename .nii.gz --> .json)",
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
                    "description": "Polynomial order to regress for drift correction (0=just mean term, -1=ignore)",
                    "priority": 10,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "polynomial",
                    "default": 0,
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
                    "default": 0.008,
                    "type": 'float',
                    "low":  0.001,
                    "high": 5.0,
                    "step": 0.001,
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
                    "low":  0.001,
                    "high": 5.0,
                    "step": 0.001,
                },
                {
                    "name": "threshold",
                    "description": "Fractional Threshold to create mask",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "threshold",
                    "default": 0.1,
                    "type": 'float',
                    "low":  0.0,
                    "high": 0.5,
                    "step": 0.01,
                },


                baseutils.getDebugParam(),
            ],

        };

        des['outputs'].push({            
            'type': 'matrix',
            'name': 'Motion Matrix',
            'description': 'The filename for saving the motion matrix',
            'varname': 'outmotionmat',
                'required': false,
            'extension' : '.csv'
        },{            
            'type': 'matrix',
            'name': 'GSR Matrix',
            'description': 'The filename for saving the GSR Signal Matrix',
            'varname': 'outgsrvector',
            'required': false,
            'extension' : '.csv'
        },{            
            'type': 'image',
            'name': 'Output Mask',
            'description': 'The filename for saving the Output Mask',
            'varname': 'outputmask',
            'required': false,
            'extension' : '.nii.gz'
        });

        return des;
    }

    async directInvokeAlgorithm(vals) {
        console.log('PreprocessfMRI invoking with vals', JSON.stringify(vals));

        let input = this.inputs['input'];
        let idata=input.getImageData();
        let debug=vals['debug'];
        let current_output=input;

        let maskimage = this.inputs['mask'] || null;
        if (maskimage) {
            if (!input.hasSameSizeAndOrientation(maskimage,0.01,true))
                return Promise.reject("Input Image and mask have different sizes");
        }

        console.log('___ Beginning=',input.getDescription(),'range=',input.getIntensityRange());
        
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
            console.log('___ Spatial smoothing output=',current_output.getDescription(),'range=',current_output.getIntensityRange());
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
            let ext=fname.split('.').pop().toLowerCase();
            if (ext==="csv" || ext==="binmatr" || ext==="matr") {
                this.outputs['outmotionmat'] = new BisWebMatrix();
                try {
                    await this.outputs["outmotionmat"].load(fname);
                    console.log('= = = Loaded motion matrix'+this.outputs['outmotionmat'].getDescription());
                } catch(e)  {
                    return Promise.reject('Failed to load motion parameters from'+fname+' '+e);
                }
                let l=this.outputs['outmotionmat'].getDimensions();
                if (l[0]!==input.getDimensions()[3] || l[1]>50) {
                    return Promise.reject('Bad motion parameters nframes='+l.join(',')+' vs '+input.getDimensions()[3]);
                }
            } else {
                let mparam=null;
                try {
                    let obj=await genericio.read(fname);
                    mparam=JSON.parse(obj.data).itemlist;
                    console.log('= = = Loaded ',mparam.length,' frames of motion parameters');
                    
                } catch(e) {
                    return Promise.reject('Failed to load motion parameters from'+fname+' '+e);
                }
                
                
                let l=mparam.length;
                if (l!==input.getDimensions()[3]) {
                    console.log('Bad motion parameters nframes='+mparam.length+' vs '+input.getDimensions()[3]);
                }
                this.outputs['outmotionmat']=create_matrix(mparam,input.getDimensions()[3]);
            }
            if (this.outputs['outmotionmat']===null) {
                this.outputs['outmotionmat'] = new BisWebMatrix();
            } else {
                let regress_1=new regressOutImage();
                try {
                    console.log('Regress matrix=',this.outputs['outmotionmat'].getDescription());
                    await regress_1.execute({
                        'input' : current_output,
                        'regressor' : this.outputs['outmotionmat'],
                    }, {
                        'debug' : debug
                    });
                } catch(e) {
                    return Promise.reject('Failed to regress motion parameters'+e);
                }
                current_output=regress_1.getOutputObject('output');
                console.log('___ Motion regress output=',current_output.getDescription(),'range=',current_output.getIntensityRange());
            }
        } else {
            this.outputs['outmotionmat'] = new BisWebMatrix();
        }

        if (vals['dobandpass']) {
            console.log('\n\n\n');
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log(' = = = Bandpass filtering='+vals['blow']+':'+vals['bhigh']+' TR=',vals['tr']);

            current_output.computeIntensityRange();
            console.log('Range = ',            current_output.getIntensityRange());
            
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
            console.log('Range = ',            current_output.getIntensityRange());
            
            //let imdata=current_output.getImageData();
            current_output.computeIntensityRange();
            console.log('___ Bandpass output=',current_output.getDescription(),'range=',current_output.getIntensityRange());
            this.outputs['bandpassoutput'] = current_output;

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
            console.log('___ Drift Correction output=',current_output.getDescription(),'range=',current_output.getIntensityRange());
        }
        

        console.log('\n\n\n');
        let roiimage=new BisWebImage();
        roiimage.cloneImage(current_output,{ type: 'uchar', numframes : '1' });
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
            let m=vals['threshold'];
            threshold=r[0]*(1-m)+m*r[1];
        }
        let numvoxels=rdata.length;
        for (let i=0;i<numvoxels;i++) {
            if (mdata[i]>=threshold)
                rdata[i]=1;
            else
                rdata[i]=0;
        }
        
        this.outputs['outputmask'] = roiimage;

        if (vals['dogsr']) {
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
            this.outputs['outgsrvector'] = globalsignal;
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
            console.log('___ GSR regress output=',current_output.getDescription(),'range=',current_output.getIntensityRange());
        } else {
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            console.log(' = = = Not running GSR.');
            this.outputs['outgsrvector'] =  new BisWebMatrix();
        }
        
        console.log(' = = = = = = = = = = = = = = = = = = = = = =');
        console.log(' = = = Done');
        this.outputs['output'] = current_output;
        this.outputs['output'].computeIntensityRange();
        console.log('___ Final Output=',this.outputs['output'].getDescription(),'range=',this.outputs['output'].getIntensityRange());

        return Promise.resolve('Done');
    } 
    
}

module.exports = PreprocessfMRIModule;

