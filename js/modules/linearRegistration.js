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

const biswrap = require('libbiswasm_wrapper');
const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const genericio = require('bis_genericio.js');
const bisutil=require('bis_util');
const numeric=require('numeric');
const BisWebLinearTransformation = require('bisweb_lineartransformation.js');


/**
 * Runs linear registration on an image set given a reference image and returns the set of transformations required
 * to align the image set to the reference image. Applies only affine (linear) transformations (no stretch/shear). 
 */
class LinearRegistrationModule extends  BaseModule {
    constructor() {
        super();
        this.name = 'linearRegistration';
        this.useworker=true;
    }

    createDescription() {
        let des={
            "name": "Linear Registration",
            "description": "Computes a linear registration between the reference image and target image. Returns a matrix transformation.",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs" : baseutils.getRegistrationInputs(),
            "outputs" : baseutils.getRegistrationOutputs(),
            "buttonName": "Run",
            "shortname" : "lrg",
            "params": baseutils.getRegistrationParams(),
        };

        des.params.push(baseutils.getLinearMode("mode"));
        des.params.push({
            "name": "Header Orient",
            "description": "use header orientation for initial matrix",
            "priority": 10,
            "advanced": false,
            "type": "boolean",
            "default": true,
            "varname": "useheader"
        });
  
        return des;
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: linearRegistration', JSON.stringify(vals),'\noooo'); 
        let target = this.inputs['target'];
        let reference = this.inputs['reference'];
        let transform = this.inputs['initial'] || 0;

        if (genericio.getenvironment()!=='node') {
            vals.doreslice=true;
            vals.debug=true;
        }

        let useheader=this.parseBoolean(vals.useheader);

        if (useheader) {

            if (transform)
                console.log('Transform = ',transform.getDescription());
            
            // Create transformation
            //transform=new BisWebLinearTransformation();

            let h = [ reference.getHeader(), target.getHeader() ];
            let dm = [ reference.getDimensions(), target.getDimensions() ];
            let sp = [ reference.getSpacing(), target.getSpacing() ];
            let mat = [ null,null];
            
            let names=[ "srow_x", "srow_y", "srow_z" ];
            for (let i=0;i<h.length;i++) {
                mat[i]=numeric.identity(4);

                let tm=numeric.identity(4);
                
                for (let j=0;j<names.length;j++) {
                    let row=h[i].struct[names[j]];
                    for (let k=0;k<=2;k++)
                        tm[j][k]= row[k];
                }

                let s=numeric.identity(4);
                for (let j=0;j<=2;j++) {
                    s[j][j]=1.0/sp[i][j];
                }

                //                console.log('-----\n----- Image ',i,'----------\n-----',dm[i],sp[i]);
                //              console.log('Orig Matrix',tm,s);
                mat[i]=numeric.dot(tm,s);

                //                console.log('Orient Matrix=',mat[i]);
            }
            let comb=numeric.dot(numeric.inv(mat[1]),mat[0]);
//            console.log('Initial combined=',comb,'\n\n\n');
            let center=[ bisutil.zero(4,1),bisutil.zero(4,1) ];
            for (let i=0;i<=1;i++) {
                for (let j=0;j<=2;j++) { 
                    center[i][j]=0.5* (dm[i][j]-1)*sp[i][j];
                }
  //              console.log('Center=',center[i],'\n\n');
            }
            let shift=numeric.dot(comb,center[0]);
            let newmat=numeric.identity(4);
            console.log('Shift = ',shift);
            for (let i=0;i<=2;i++)
                newmat[i][3]=(center[1][i]-shift[i]);

            let finalcombo=numeric.dot(newmat,comb);
            
            //        console.log('Combo=',finalcombo);

            let shift2=numeric.dot(finalcombo,center[0]);
            console.log('Shift2=',shift2, '\ncenter2=',center[1]);
            transform=new BisWebLinearTransformation();
            transform.setMatrix(finalcombo);
            console.log('oooo Using Header, I created an initial transformation = ',transform.getDescription());
            

        }
        
        return new Promise( (resolve, reject) => {
            biswrap.initialize().then( () => {

                let temptarget=target;
                let initial=transform;
                if (useheader) {
                    temptarget=baseutils.resliceRegistrationOutput(biswrap,reference,target,transform);
                    initial=0;
                    
                    console.log('oooo Using header to initialize to first reslicing for orientation');
                }
                
                let matr = biswrap.runLinearRegistrationWASM(reference, temptarget, initial, {
                    'intscale' : parseInt(vals.intscale),
                    'numbins' : parseInt(vals.numbins),
                    'levels' : parseInt(vals.levels),
                    'smoothing' : parseFloat(vals.imagesmoothing),
                    'optimization' : baseutils.getOptimizationCode(vals.optimization),
                    'stepsize' : parseFloat(vals.stepsize),
                    'metric' : baseutils.getMetricCode(vals.metric),
                    'steps' : parseInt(vals.steps),
                    'iterations' : parseInt(vals.iterations),
                    'mode' : baseutils.getLinearModeCode(vals.mode), 
                    'resolution' : parseFloat(vals.resolution),
                    'normalize' : this.parseBoolean(vals.norm),
                    'debug' : this.parseBoolean(vals.debug),
                    'return_vector' : true}, this.parseBoolean(vals.debug));

                if (initial===0 && useheader) {
                    let m1=transform.getMatrix();
                    let m2=matr.getMatrix();
                    let m3=numeric.dot(m1,m2);
                    matr.setMatrix(m3);
                    console.log('oooo Post combining matrix with header adjustment',m2,'--->',m3)
                } 
                this.outputs['output'] = matr;
                
                if (vals.doreslice) 
                    this.outputs['resliced']=baseutils.resliceRegistrationOutput(biswrap,reference,target,this.outputs['output']);
                else 
                    this.outputs['resliced']=null;
                
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });

}}

module.exports = LinearRegistrationModule;
