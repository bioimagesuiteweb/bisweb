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

'use strict';

const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const LinearRegistration = require('linearRegistration');
const ResliceImage = require('resliceImage');
const NonlinearRegistration = require('nonlinearRegistration');
const invertTransformation = require('invertTransformation');
const bisimagesmoothreslice = require('bis_imagesmoothreslice');
const BisWebImage = require('bisweb_image');
const genericio= require('bis_genericio');
const bisimagealgo = require('bis_imagealgorithms');
const BisWebTextObject = require('bisweb_textobject.js');


// TODO: Inverse transformation stuff
// Add a module to create inverse xforms as needed.



/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear).
 */
class diffSpectModule extends BaseModule {
    constructor() {
        super();
        this.name = 'diffSPECT';
        this.JSOnly=true;
        this.useworker=false;
        
        this.imageList = [
            'ictal',
            'interictal',
            'tmap',
            'mri',
            'nativetmap'
        ];
        this.xformList = [
            'intertoictal_xform',
            'atlastomri_xform',
            'mritointerictal_xform',
            'atlastointer_xform'
        ];
        this.tempImageList = [
            'inter_in_atlas_reslice',
            'ictal_in_atlas_reslice',
            'ictal_in_inter_reslice',
            'mri_in_atlas_reslice',
            'interictal_in_mri_reslice',
        ];
        this.resultsList = [
            'hyper',
            'hypo'
        ];

        this.atlasList = [
            'ATLAS_spect',
            'ATLAS_mri',
            'ATLAS_stdspect',
            'ALAS_mask'
        ];

        this.saveList = this.imageList.concat(this.xformList).concat(this.resultsList);
        this.typeList = [];
        for (let i=0;i<this.saveList.length;i++) {
            if (i<this.imageList.length) {
                this.typeList.push('image');
            }  else if (i<this.imageList.length+this.xformList.length) {
                this.typeList.push('transform');
            } else
                this.typeList.push('dictionary');
        }

        
        this.allList= this.saveList.concat(this.tempImageList).concat(this.atlasList);
        this.clearList = this.xformList.concat(this.tempImageList).concat(this.resultsList);
        
        this.app_state = {
            patient_name: "No Name",
            patient_number: "0",
            does_have_mri: false,
            nonlinear: false,
        };
        
        for(let i=0;i<this.allList.length;i++) {
            this.app_state[this.allList[i]]=null;
        }

        this.alertCallback=null;
    }
    
    getDescription() {
        let des={
            "name": "diffSPECT",
            "description": "Performs diff SPECT Analaysis for Epilepsy",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "buttonName": "Execute",
            "shortname" : "tmap",
            "inputs":  [ {
                'type': 'image',
                'name': 'Ictal Image',
                'description': 'The ictal image',
                'varname': 'ictal',
                'shortname': 'i',
                'required': true,
                'guiviewerinput' : 'image',
                'guiviewer'  : 'viewer1',
            }, {
                'type': 'image',
                'name': 'Interictal Image',
                'description': 'The incter-ictal image',
                'varname': 'interictal',
                'shortname': 'r',
                'required': true,
                'guiviewerinput' : 'image',
                'guiviewer'  : 'viewer2',
            }, {
                'type': 'image',
                'name': 'MRI Image',
                'description': 'The MRI image',
                'varname': 'mri',
                'shortname': 'm',
                'required': false,
                'guiviewerinput' : 'image',
                'guiviewer'  : 'viewer1',
            }]
        };

        let out= baseutils.getImageToImageOutputs('diff SPECT Tmap in Atlas Space')[0];
        let out2=baseutils.getImageToImageOutputs('diff SPECT Tmap in Native Space')[0];

        out2['required']=false;
        out2['varname']='output2';
        delete out2.shortname;
        des.outputs = [  out,out2];

        des.params= [
            {
                "name": "NonLinear",
                "description": "If true use nonlinear registration",
                "priority": 4,
                "advanced": false,
                "gui": "check",
                "varname": "nonlinear",
                "type": 'boolean',
                "default": false,
            },
            {
                "name": "UseMRI",
                "description": "If true use MRI image",
                "priority": 1,
                "advanced": false,
                "gui": "check",
                "varname": "usemri",
                "type": 'boolean',
                "default": false,
            },
            {
                "name": "Native",
                "description": "If true output tmap in native space",
                "priority": 2,
                "advanced": false,
                "gui": "check",
                "varname": "native",
                "type": 'boolean',
                "default": false,
            }
        ];
        
        des.outputs.push({
            'type' : 'text',
            'name' : 'Results',
            'description': 'log file',
            'varname': 'logoutput',
            'required': false,
            'extension': '.bistext'
        });
        return des;
    }

    // -------------------------------------------
    // Wrapper for webutil.createAlert effectively
    // -------------------------------------------
    alertFunction(message,mode,offset) {
        console.log(message);
        if (this.alertCallback)
            this.alertCallback(message,mode,offset);
    }
    
    // --------------------------------------------------------------------------------
    // Compute Registrations
    //
    computeLinearRegistration(reference, target,mode='Rigid') {

        let lin_opts = {
            "intscale": 1,
            "numbins": 64,
            "levels": 3,
            "imagesmoothing": 1,
            "optimization": "ConjugateGradient",
            "stepsize": 1,
            "metric": "NMI",
            "steps": 1,
            "iterations": 10,
            "mode": mode,
            "resolution": 1.5,
            "doreslice": true,
            "norm": true,
            "debug": true
        };
        let input = {'reference': reference,
                     'target'   : target}; 
        let linear = new LinearRegistration();
        linear.makeInternal();
        let output = {
            transformation: null,
            reslice: null
        };
        
        return new Promise( (resolve,reject) => {
            linear.execute(input, lin_opts).then( () => {
                output.transformation = linear.getOutputObject('output'); 
                output.reslice = linear.getOutputObject('resliced');
                if (baseutils.getLinearMode(lin_opts["mode"])) {
                    resolve(output);
                }
                resolve();
            }).catch( (e) => {
                console.log('This did not run');
                console.log('error',e,e.stack);
                reject(e);
            });
        });
    }

    /* 
     * computes a nonlinear registration 
     * @param {BISImage} reference- the reference image
     * @param {BISImage} target - the target image
     * @returns {BISTransformation} - the output of the registration
     */
    
    computeNonlinearRegistration(reference, target) {
        
        let nonlinearRegModule = new NonlinearRegistration();
        nonlinearRegModule.makeInternal();
        let input = { 'reference': reference,
                      'target'   : target};
        
        let nonlin_opts = 
            {
                "intscale": 1,
                "numbins": 64,
                "levels": 3,
                "imagesmoothing": 1,
                "optimization": "ConjugateGradient",
                "stepsize": 1,
                "metric": "NMI",
                "steps": 1,
                "iterations": 10,
                "cps": 20,
                "append": true,
                "linearmode": "Affine",
                "resolution": 1.5,
                "lambda": 0.001,
                "cpsrate": 2,
                "doreslice": true,
                "norm": true,
                "debug": true
            };
        let output = { 
            transformation: null,
            reslice: null
        };
        
        return new Promise((resolve, reject) => {
            nonlinearRegModule.execute(input, nonlin_opts).then(() => {
                output.transformation = nonlinearRegModule.getOutputObject('output');
                output.reslice = nonlinearRegModule.getOutputObject('resliced');
                resolve(output);
            }).catch( (e) =>  {
                console.log("ERROR:", e, e.stack);
                reject(e);
            });
            
        });
    }
    
    // --------------------------------------------------------------------------------
    // Custom Registration Methods
    // --------------------------------------------------------------------------------
    registerImages(mode) {

        let speclist = {
            'interictal2ictal' : {
                'reference' :  'interictal',
                'target'    :  'ictal',
                'xform'     :  'intertoictal_xform',
                'output'    :  'ictal_in_inter_reslice',
                'nonlinear' : false,
            },
            'atlas2mri' : {
                'reference' : 'ATLAS_spect',
                'target'    : 'mri',
                'xform'     : 'atlastomri_xform',
                'output'    : 'mri_in_atlas_reslice',
                'nonlinear' : true,
            },
            'mri2interictal' : {
                'reference' : 'mri',
                'target'    : 'interictal',
                'output'    : 'interictal_in_mri_reslice',
                'xform'     : 'mritointerictal_xform',
                'nonlinear' : false
            },
            'atlas2interictal' : {
                'reference' : 'ATLAS_spect',
                'target'    : 'interictal',
                'output'    : 'inter_in_atlas_reslice',
                'xform'     : 'atlastointer_xform',
                'nonlinear' : true,
            },
        };

        mode=mode || 'inter2ictal';
        let params=speclist[mode];
        let nonlinear = params['nonlinear'];
        let text="nonlinear";
        let linearmode='Rigid';
        if (nonlinear)
            linearmode='Affine';
        if (!this.app_state.nonlinear) {
            nonlinear=false;
        }
        if (nonlinear===false)
            text=linearmode.toLowerCase()+" linear";
        
        
        let reference=this.app_state[params['reference']];
        let target=this.app_state[params['target']];

        if (reference === null || target === null) {
            return Promise.reject('No images in memore (either '+params['reference']+' or '+params['target']+'). Can not execute registration');
            
        }

        
        this.alertFunction('Computing '+mode+' registration, using '+text+' registration',"progress",30);
        
        return new Promise( (resolve,reject) => {

            if (nonlinear) {
                this.computeNonlinearRegistration(reference,target).then( (output) => {
                    this.app_state[params['xform']] = output.transformation;
                    this.app_state[params['output']]= output.reslice;
                    resolve('Done computing nonlinear registration for '+mode);
                }).catch( ()=> { reject('Not computed linear'); });
            } else {
                this.computeLinearRegistration(reference,target,linearmode).then( (output) => {
                    this.app_state[params['xform']] = output.transformation;
                    this.app_state[params['output']]= output.reslice;
                    resolve('Done computing linear registration for '+mode);
                    resolve('Done Linear');
                    
                }).catch( ()=> { reject('Not computed linear'); });
            }
        });
    }
        
    // --------------------------------------------------------------------------------
    // Reslice Images
    //

    resliceImages(operation,force=true) {

        let resliceList = {};

        if (!this.app_state.does_have_mri) {
            resliceList['ictal2Atlas']= {
                'input'    : 'ictal',
                'xforms'   : [ 'atlastointer_xform', 'intertoictal_xform' ],
                'reference': 'ATLAS_spect',
                'output' : 'ictal_in_atlas_reslice',
            };
            resliceList['inter2Atlas']= {
                'input'    : 'interictal',
                'xforms'   : [ 'atlastointer_xform' ],
                'reference': 'ATLAS_spect',
                'output' : 'inter_in_atlas_reslice',
            };

        } else {
            resliceList['ictal2Atlas']=  {
                'input' : 'ictal',
                'xforms' : [ 'atlastomri_xform', 'mritointer_xform', 'intertoictal_xform' ],
                'reference': 'ATLAS_spect',
                'output' : 'ictal_in_atlas_reslice'
            };
            resliceList['inter2Atlas']= {
                'input' : 'interictal',
                'xforms' : [ 'atlastomri_xform', 'mritointer_xform' ],
                'reference': 'ATLAS_spect',
                'output' : 'inter_in_atlas_reslice',
            };
        }

        resliceList['inter2ictal']= {
            'reference' : 'interictal',
            'input' : 'ictal',
            'xforms' : [ 'intertoictal_xform' ],
            'output' : 'ictal_in_inter_reslice',
        };
        
        operation =operation || 'ictal2Atlas';

        let inputKey=resliceList[operation]['input'];
        let refKey=resliceList[operation]['reference'];
        let outputKey=resliceList[operation]['output'];

        if (this.app_state[outputKey] && force===false) {
            return Promise.resolve('Reliced image in '+operation+' exists');
        }

        if (!this.app_state[inputKey] ||  !this.app_state[refKey]) {
            return Promise.reject(`Missing images in reslice ${operation}. ${inputKey}=${this.app_state[inputKey]} ${refKey}=${this.app_state[refKey]}`);
        }
        
        let xformnames= ['xform','xform2', 'xform3' ];
        let xformlist =[];
        let xformKeys=resliceList[operation]['xforms'];
        for (let i=0;i<xformKeys.length;i++) {
            let xform=this.app_state[xformKeys[i]];
            if (!xform) 
                return Promise.reject('Missing Transformation '+xformKeys[i]+' in reslice '+operation);
            xformlist.push(xform);
        }

        return new Promise( (resolve,reject) => {

            let inpObjects = {
                'input'    : this.app_state[inputKey],
                'reference': this.app_state[refKey]
            };
            for (let i=0;i<xformlist.length;i++) {
                inpObjects[xformnames[i]]=xformlist[i];
            }
                
            let reslicer = new ResliceImage();
            reslicer.makeInternal();
            reslicer.execute(inpObjects).then( () => {
                this.app_state[outputKey] = reslicer.getOutputObject('output');
                resolve('Done reslicing');
            }).catch( (e) => {
                console.log(e,e.stack);
                reject(e);
            });
        });
    }
    
    // calls all of the above custom registration methods in correct order and reslices images as necessary
    computeAllRegistrations() {

        // execute registration order if MRI is not uploaded by user
        if (!this.app_state.does_have_mri) {
            return new Promise( (resolve,reject) => {
                this.registerImages('atlas2interictal').then( () => {
                    this.registerImages('interictal2ictal').then( ()=> {
                        resolve('Done computing registrations in no_mri mode');
                    }).catch( (e) => { reject(e); });
                }).catch( (e) => {
                    console.log(e.stack);
                    reject(e);
                });
            });
        }

        
        return new Promise( (resolve,reject) => {
            this.registerImages('atlas2mri').then( () => {
                this.registerImages('mri2interictal').then( () => {
                    this.registerImages('interictal2ictal').then( () => {
                        resolve('Done computing registrations in with_mri mode');
                    }).catch( (e) => { reject(e); });
                }).catch( (e) => { reject(e); });
            }).catch( (e) => {
                console.log(e.stack);
                reject(e);
            });
        });
    }

    // ---------------------------------------------------------------
    
    loadAtlasData() {

        return new Promise( (resolve,reject) => {
            
            let imagepath=genericio.getimagepath();
            let imgnames = [ `${imagepath}/ISAS_SPECT_Template.nii.gz`,
                             `${imagepath}/MNI_T1_2mm_stripped_ras.nii.gz`,
                             `${imagepath}/ISASHN_Standard_Deviation.nii.gz`,
                             `${imagepath}/ISAS_SPECT_Mask.nii.gz`];
                
            let numimages = imgnames.length;
            let images = new Array(numimages);
            
            for (let i = 0; i < numimages; i++)
                images[i] = new BisWebImage();
            
            let p = [];
            for (let i = 0; i < numimages; i++)
                p.push(images[i].load(imgnames[i]));
            Promise.all(p)
                .then( () => { 
                    this.app_state.ATLAS_spect = images[0];
                    this.app_state.ATLAS_mri = images[1];
                    this.app_state.ATLAS_stdspect = images[2];
                    this.app_state.ATLAS_mask = images[3];
                    resolve('The SPECT Tool is now ready. The core data has been loaded.');
                }).catch((e) => {
                    reject(e);
                });
        });
    }

    // ---------------------------------------------------------------
    // Spect Code
    // ---------------------------------------------------------------
        // ---------------------------------------------------------------------------------------
    // SPECT Processing
    /*
     * processes spect images (diff spect)
     * @param {BISImage} interictal - the registered and resliced interictal image
     * @param {BISImage} ictal - the registered and and resliced ictal image
     * @param {BISImage} stdev - the standard deviation image across 12 patients
     * @param {BISImage} stdev - the masking image
     * @param {float} pvalue - p-value
     * @param {float} clustersize - cluster size
     * @returns {object} - the output object
     * @returns {string} obj.hyper - the hyper cluster statistics
     * @returns {string} obj.hypo - the hypo cluster statistics
     * @returns {BISImage} obj.tmap - the tmap image
     */
    processSpect(interictal, ictal, stdev, mask, pvalue, clustersize) {

        let params = {
            pvalue: pvalue || 0.01,
            clustersize: clustersize || 125,
        };
        
        let sigma = 16 * 0.4248, d = {};
        let final = [0, 0];

        let names = ['interictal', 'ictal'];
        let images = [interictal, ictal, stdev, mask];
        
        //  code to verify images all have same size. .getDimensions on each image
        let showerror = false;

        let dim0 = images[0].getDimensions();
        
        // check that dimensions match
        for (let m = 1; m < images.length; m++) {
            let dim1 = images[m].getDimensions();
            let q = Math.abs(dim0[0] - dim1[0]) + Math.abs(dim0[1] - dim1[1]) + Math.abs(dim0[2] - dim1[2]);
            
            if (q > 0) {
                console.log('Image ' + m + ' is different ' + dim0 + ' , ' + dim1);
                showerror = true;
            }
        }
        if (showerror)
            this.alertFunction('Images Not Of Same Size!',true);
        // end code to verify that all images have same size.
        
        
        
        // execute Diff SPECT algorithm
        for (let i = 0; i <= 1; i++) {
            let masked = bisimagealgo.multiplyImages(images[i], images[3]);
            let smoothed = bisimagesmoothreslice.smoothImage(masked, [sigma, sigma, sigma], true, 6.0, d);
            let normalized = bisimagealgo.spectNormalize(smoothed);
            console.log('+++++ normalized ' + names[i]);
            final[i] = normalized;
        }
        
        // display results
        let tmapimage = bisimagealgo.spectTmap(final[1], final[0], images[2], null);
        let outspect = [0, 0];
        
        // format results
        for (let i = 0; i <= 1; i++) {
            outspect[i] = bisimagealgo.processDiffSPECTImageTmap(tmapimage, params.pvalue, params.clustersize, (i === 0));
        }
        
        return {
            tmap: tmapimage, // image
            hyper: outspect[0].stats, // strings
            hypo: outspect[1].stats, // strings
        };
    }

    mapTmapToNativeSpace() {

        return new Promise( (resolve,reject) => {

            if (this.app_state.tmap === null) {
                console.log('No tmap in memory');
                reject('No tmap in memory. Compute this first.');
                return;
            }
            
            let hasmri=this.app_state.does_have_mri;
            
            let inputs= {};
            if (hasmri) {
                inputs['input']=this.app_state['atlastomri_xform'];
                inputs['xform2']=this.app_state['mritointer_xform'];
                inputs['ref']=this.app_state.mri;
            } else {
                inputs['input']=this.app_state['atlastointer_xform'];
                inputs['ref']=this.app_state.interictal;
            }
            
            let invModule=new invertTransformation();
            invModule.execute(inputs).then( () => {

                let inverse=invModule.getOutputObject('output');
                let reslicer = new ResliceImage();
                reslicer.makeInternal();
                reslicer.execute({ 'input' : this.app_state.tmap ,
                                   'reference' : inputs['ref'],
                                   'xform' : inverse
                                 },{ 'interpolation' : 1 }).then(
                                     () => {
                                         this.app_state['nativetmap'] = reslicer.getOutputObject('output');
                                         this.outputs['output2']=this.app_state['nativetmap'];
                                         resolve('Mapped tmap to native space done');
                                     }).catch( (e) => {  console.log(e,e.stack);         reject(e);          });
            }).catch( (e) => {  console.log(e,e.stack);         reject(e);          });
        });
    }
    
    // button callback for computing diff spect data
    computeSpect() {

        return new Promise( (resolve,reject) => {
            this.resliceImages('ictal2Atlas').then( () => {
                this.resliceImages('inter2Atlas').then( () => {
                    this.alertFunction('Computing diff SPECT analysis',"progress",30);
                    let resliced_inter = this.app_state.inter_in_atlas_reslice;
                    let resliced_ictal = this.app_state.ictal_in_atlas_reslice;
                    let results = this.processSpect(resliced_inter, resliced_ictal, this.app_state.ATLAS_stdspect, this.app_state.ATLAS_mask);
                    
                    this.app_state.hyper = results.hyper;
                    this.app_state.hypo = results.hypo;
                    this.app_state.tmap = results.tmap;

                    resolve('Compute diff SPECT analysis done');
                });
            }).catch( (e) => {
                console.log(e.stack);
                reject(e);
            });
        });
    }


    // ---------------------------------------------------------------
    //create log output
    createTables() {

        let arr =[ { name: 'hypo', table:this.app_state.hypo },
                   { name:'hyper', table:this.app_state.hyper }
                 ];

        let txt='type, #, X,Y,Z, ClusterP, CorrectP, MaxT\n';
        for (let i=0;i<arr.length;i++) {
            let obj=arr[i].table;
            for (let j=0;j<obj.length;j++) {
                let l=obj[j].string.trim().replace(/\t/g,',');
                txt+=arr[i].name+','+l+'\n';
            }
        }
        console.log(txt);
        return txt;
    }

    
    // ---------------------------------------------------------------
    // Master Function
    // ---------------------------------------------------------------


    
    directInvokeAlgorithm(vals) {
        console.log('diffSpect invoking with vals', JSON.stringify(vals));
        if (vals['native']) {
            console.log('Will do native');
        }

        // Set Inputs
        this.app_state.interictal=this.inputs['interictal'];
        this.app_state.ictal=this.inputs['ictal'];
        if (vals['usemri']) {
            this.app_state.mri=this.inputs['mri'];
            this.app_state.does_have_mri=true;
        }
        this.app_state.nonlinear=vals['nonlinear'];

        // Step 2 loadatlases
        return new Promise( (resolve,reject) => {
            this.loadAtlasData().then( () => {
                this.computeAllRegistrations().then( () => {
                    this.computeSpect().then( () => {
                        this.outputs['output']=this.app_state.tmap;
                        console.log('Hyper=',this.app_state.hyper);
                        this.outputs['logoutput']=new BisWebTextObject(this.createTables());
                        console.log('-----------------------------------------');
                        console.log('-----------------------------------------');
                        console.log('Out2=',this.outputs['output2']);
                        if (vals['native']) {
                            this.mapTmapToNativeSpace().then( (m) => {
                                console.log('Mapped',m);
                                console.log('Out2=',this.outputs['output2'].getDescription());
                                resolve();
                            }).catch( (e) => { reject(e); });
                        } else {
                            resolve();
                        }
                    }).catch( (e) => { reject(e); });
                }).catch( (e) => { reject(e); });
            }).catch( (e) => { reject(e); });
        });
    }
}

module.exports = diffSpectModule;
