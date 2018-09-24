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
const baseutils=require("baseutils");
const BisWebImage = require('bisweb_image.js');
const biswrap = require('libbiswasm_wrapper');
const genericio= require('bis_genericio');
const xformutil=require('bis_transformationutil.js');
/**
 * Combines images
 */
class QualityMeasuresModule extends BaseModule {
  constructor() {
    super();
    this.name = 'combineImages';
    this.outputmask=false;
  }

  createDescription() {

    let m=this.outputmask;
    return {
      "name": "Deface",
        "description": "This module uses data from the openfmri project to deface an image by first affinely registering it to a template",
        "author": "Javid Dadashkarimi",
        "version": "1.0",
        "inputs": baseutils.getImageToImageInputs(),
        "outputs": baseutils.getImageToImageOutputs(null,'viewer1','overlay'),
        "buttonName": "Execute",
        "shortname" : "quality",
        "params": [
        {
          "name": "Resolution",
          "description": "Factor to reduce the resolution prior to registration",
          "priority": 1,
          "advanced": true,
          "gui": "slider",
          "type": "float",
          "varname": "resolution",
          "default": 3.0,
          "low": 1.0,
          "high": 5.0,
        },
        {
          "name": "Iterations",
          "description": "Number of iterations (per level)",
          "priority": 2,
          "advanced": true,
          "gui": "slider",
          "type": "int",
          "varname": "iterations",
          "low": 1,
          "high": 32,
          "step" : 1,
          "default": 5,
        },
        {
          "name": "Levels",
          "description": "Number of levels in multiresolution optimization",
          "priority": 3,
          "advanced": false,
          "default": 2,
          "type": "int",
          "gui": "slider",
          "varname": "levels",
          "low": 1,
          "high": 4,
          "step" : 1,
        },
        {
          "name": "Output Mask",
          "description": "If true output the mask",
          "priority": 5,
          "advanced": true,
          "gui": "check",
          "varname": "outputmask",
          "type": 'boolean',
          "default": m,
        },
        baseutils.getDebugParam()
          ]
    };
  }

  mean(arr){
    if(arr.length){
      return arr.reduce(function(a, b) { return a + b; })/arr.length;
    }else{
      return 0;
    }
  };
  variance(arr){
    var mu = this.mean(arr);
    return this.mean(arr.map(function(num) {
          return Math.pow(num - mu, 2);
          }));
  };

  getSmoothMeasures(input,vals) {

    //let defacedImage = biswrap.segmentImageWASM(img, {});
    let segmentedImage = biswrap.segmentImageWASM(input, {
        "frame" : 0,
        "component" : 0,
        "numclasses" : 3,
        "numbins" : 256,
        "maxsigmaratio" : 0.2,
        "robust" : false,
        "smoothhisto" : true,
        "smoothness" : 0,
        "mrfconvergence" : 0.2,
        "mrfiterations" : 8,
        "internaliterations" : 4,
        "noisesigma2" : 0
        },vals.debug);

    let indims=input.getDimensions();
    let spa=input.getSpacing();
    let idata=input.getImageData();
    let sdata=segmentedImage.getImageData();
    let islicesize=indims[0]*indims[1];

    console.log('segmentedImage',segmentedImage); 
    let imageVar = this.variance(idata);
    let imageMean = this.mean(idata);
    console.log('variance:',imageVar);
    let signal = [];
    let noise = [];
    let wm = []; // white matter
    let gm = []; // gray matter
    let bm = []; // background
    let x_j = []; // voxel intensities
    let x_max = 0;
    for (let k=0;k<indims[2];k++) {
      for (let j=0;j<indims[1];j++) {
        for (let i=0;i<indims[0];i++) {
          let inindex= i+j*indims[0]+k*islicesize;
          if(idata[inindex]){
            x_j.push(idata[inindex]);
            x_max +=Math.pow(idata[inindex],2); 
          }
          if(sdata[inindex]==1){
            wm.push(idata[inindex]);
          }else if(sdata[inindex]==2){
            gm.push(idata[inindex]);
          } else if(sdata[inindex]==0){
            bm.push(idata[inindex]);
          } 

          if(idata[inindex] > imageMean){
            signal.push(idata[inindex]);
          }else{
            noise.push(idata[inindex]);
          }
        }
      }
    }
    x_max = Math.sqrt(x_max);
    console.log('noise.length:',noise.length);
    //let snr = mean(signal)/(variance(noise)*Math.pow(2/(4-Math.PI),0.5)); // higher better
    let snr = this.mean(x_j)/(Math.sqrt(this.variance(x_j))*Math.sqrt(x_j.length/(x_j.length-1))); // higher better
    let cjv = (Math.sqrt(this.variance(wm))+Math.sqrt(this.variance(gm)))/Math.abs(this.mean(wm)-this.mean(gm)); // lower better
    let cnr = Math.abs(this.mean(gm)-this.mean(wm))/Math.sqrt(this.variance(bm)+this.variance(wm)+this.variance(gm)); // higher better
    let ecf = -x_j.map(function(v){ return v/x_max*Math.log(v/x_max)}).reduce((a,b)=>a+b); // lower better
    return [snr,cnr,cjv,ecf];

  };



  qualityControlAlgorithm(vals,img){
    let images = [ new BisWebImage(), new BisWebImage() ];
    let imagepath = genericio.getimagepath();
    return new Promise((resolve, reject) => { // defacing
        Promise.all( [
            images[0].load(`${imagepath}/mean_reg2mean.nii.gz`),
            images[1].load(`${imagepath}/facemask_char.nii.gz`),
            biswrap.initialize()
        ]).then( () => {

          let img = this.inputs['input'];
          let initial=0;
          let idat=img.getImageData();
          let o1=img.getOrientationName();
          let o2=images[0].getOrientationName();
          let centeronrefonly=false;

          if (o1!==o2) {
          centeronrefonly=true;
          initial=xformutil.computeHeaderTransformation(img,images[0],false);
          }

          console.log('initial:',initial); 
          console.log('images',images[0]);
         
          let matr = biswrap.runLinearRegistrationWASM(img, images[0], initial, {
              'intscale' : 1,
              'numbins' : 64,
              'levels' : parseInt(vals.levels),
              'centeronrefonly' : this.parseBoolean(centeronrefonly),
              'smoothing' : 1.0,
              'optimization' : 2,
              'stepsize' : 1.0,
              'metric' : 3,
              'steps' : 1,
              'iterations' : parseInt(vals.iterations),
              'mode' : 3,
              'resolution' : parseFloat(vals.resolution)/2,
              'normalize' : true,
              'debug' : true,
              'return_vector' : false}, this.parseBoolean(vals.debug));

          let temp=baseutils.resliceRegistrationOutput(biswrap,img,images[1],matr,1,0);

          if (this.parseBoolean(vals.outputmask)) {
            let tdat=temp.getImageData();
            let l=tdat.length;
            for (let i=0;i<l;i++) {
              if (tdat[i]<50)
                tdat[i]=0;
              else
                tdat[i]=1;
            }
            this.outputs['output']=temp;
          } else {
            let output=new BisWebImage();
            output.cloneImage(img);

            let idat=img.getImageData();
            let odat=output.getImageData();
            let tdat=temp.getImageData();

            let dm=output.getDimensions();
            let volumesize=dm[0]*dm[1]*dm[2];
            let numframes=dm[3]*dm[4];

            let count=0;

            for (let i=0;i<volumesize;i++) {
              let v=tdat[i];
              if (v<50) {
                count=count+1;
                for (let f=0;f<numframes;f++) {
                  odat[f*volumesize+i]=0;
                }
              } else {
                for (let f=0;f<numframes;f++) {
                  odat[f*volumesize+i]=idat[f*volumesize+i];
                }
              }
            }

            console.log('Done masked=',count,'/',volumesize,' voxels');
            this.outputs['output']= output;
          }

          let mode=vals.mode;
          let fdata=img.getImageData();
          let dim = img.getDimensions();
          var snr,cnr,cjv,ecf;// measures;
          //[snr,cnr,cjv,ecf] = this.getSmoothMeasures(this.outputs['output'],vals);//.toFixed(10).toString();
          [snr,cnr,cjv,ecf] = this.getSmoothMeasures(img,vals);//.toFixed(10).toString();

          let message = "<p>  Image Quality Metrics</p><p>SNR= <span style=\"color:green\">"+snr.toFixed(4).toString()+"</span></p>"+
            "<p>CNR= <span style=\"color:green\">"+cnr.toFixed(4).toString()+"</span></p>"+
            "<p>CJV= <span style=\"color:green\">"+cjv.toFixed(4).toString()+"</span></p>"+
            "<p>ECF= <span style=\"color:green\">"+ecf.toFixed(4).toString()+"</span></p>";



          const bootbox=require('bootbox');
          bootbox.dialog({
    message: message,
    closeButton: false,
    buttons: {
    ok: {
    label: 'close',
    className: 'btn-info',
    callback: function(){
    }
    }
    }});

    resolve();

    }).catch( (e) => {
      reject(e.stack);
      });
    });

}

directInvokeAlgorithm(vals) {
  console.log('oooo invoking: defaceImage with vals', JSON.stringify(vals));

  //let input = this.inputs['input'];

  let img = this.inputs['input'];
  let  a= this.qualityControlAlgorithm(vals,img);


  return a;

}

}

module.exports = QualityMeasuresModule;
