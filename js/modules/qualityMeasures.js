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
const BisWebTextObject = require('bisweb_textobject.js');
const BisWebMatrix = require('bisweb_matrix.js');

/**
   * Quality Control class
   * @author: Javid Dadashkarimi
   * structural metrics: signal to noise ratio (snr) , contrast-to-noise ratio (cnr), coefficient of joint variation (cjv),  entropy focus criterion (efc)
**/
class QualityMeasuresModule extends BaseModule {
  constructor() {
    super();
    this.name = 'Quality Control';
    this.outputmask=false;
    this.maskedImage= new BisWebImage();
    this.reslicedImage = new BisWebImage();
    this.segmentedImage = new BisWebImage();
    this.segmentedMaskedImage = new BisWebImage();
  }

  createDescription() {

    let m=this.outputmask;
    return {
      "name": "QC",
        "description": "This module uses data from the openfmri project to deface an image by first affinely registering it to a template",
        "author": "Javid Dadashkarimi",
        "version": "1.0",
        "inputs": baseutils.getImageToImageInputs(),
        "outputs": [
            {
                'type': 'matrix',
                'name': 'Output Matrix',
                'description': 'The results matrix',
                'varname': 'output',
                'shortname': 'o',
                'required': false,
                'extension' : '.matr'
            },
            {
                'type' : 'text',
                'name' : 'Results',
                'description': 'log file',
                'varname': 'logoutput',
                'required': true,
                'extension': '.bistext'
            },
            {
                'type': 'image',
                'name': 'Output Image',
                'description': 'Segmentation image',
                'varname': 'segm',
                'required': false,
                'extension': '.nii.gz',
                'guiviewertype' : 'overlay',
                'guiviewer'  : 'viewer1',
            }
        ],
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

  /***
    * takes array=arr and returns mean of it. 
  ***/
  mean(arr){
    if(arr.length){
      return arr.reduce(function(a, b) { return a + b; })/arr.length;
    }else{
      return 0;
    }
  }

  /***
    * takes array=arr and returns varience of it.
  ***/
  variance(arr){
    var mu = this.mean(arr);
    return this.mean(arr.map(function(num) {
          return Math.pow(num - mu, 2);
          }));
  }

  /***
    * image segmentation: takes masked image and segemnt it into
    * k=3 classes based on white matter, grey matter, and background.
  ***/
  segmentImage(maskedImage, vals, k){
    return biswrap.segmentImageWASM(maskedImage, {
        "frame" : 0,
        "component" : 0,
        "numclasses" : k,
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
    

  }

  /***
    * computes quality control metrics and set output
    * input: vals
    * output: [snr,cnr,cjv,efc]
  ***/
  getQualityMeasures(maskedImage,segmentedImage,segmentedMaskedImage) {
    let indims=maskedImage.getDimensions();
    //let spa=maskedImage.getSpacing();
    let idata=maskedImage.getImageData();
    let sdata=segmentedMaskedImage.getImageData(); // masked image 
    let bdata=segmentedImage.getImageData(); // background and non-background image
    let islicesize=indims[0]*indims[1];
    
    this.outputs['segm']=segmentedMaskedImage;
    
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

    signal.push(0.01);
    noise.push(0.01);
    bm.push(0.01);
    wm.push(0.01);
    gm.push(0.01);
    x_j.push(0.01);

    for (let k=0;k<indims[2];k++) {
      for (let j=0;j<indims[1];j++) {
        for (let i=0;i<indims[0];i++) {
          let inindex= i+j*indims[0]+k*islicesize;

          if(idata[inindex])
            x_j.push(idata[inindex]);
          x_max +=Math.pow(idata[inindex],2); 

          if(idata[inindex] > imageMean){
            signal.push(idata[inindex]);
          }

          if(sdata[inindex]==1){
            wm.push(idata[inindex]);
          }else if(sdata[inindex]==2){
            gm.push(idata[inindex]);
          } else if(bdata[inindex]==0){ // from two-class segmentation
            bm.push(idata[inindex]);
          } 

        }
      }
    }

    x_max = Math.sqrt(x_max);
    
    let snr = this.mean(signal)/(Math.sqrt(this.variance(bm))); // higher better
    let cjv = (Math.sqrt(this.variance(wm))+Math.sqrt(this.variance(gm)))/Math.abs(this.mean(wm)-this.mean(gm)); // lower better
    let cnr = Math.abs(this.mean(gm)-this.mean(wm))/Math.sqrt(this.variance(bm)+this.variance(wm)+this.variance(gm)); // higher better
      let efc = -x_j.map(function(v){ return v/x_max*Math.log(v/x_max);}).reduce((a,b)=>a+b); // lower better

    console.log('xj.length:',x_j.length);
    console.log('x_max:',x_max);
    console.log('signal.length:',signal.length);
    console.log('bm.length:',bm.length);
    console.log('wm.length:',wm.length);
    console.log('gm.length:',gm.length);
    console.log('image mean:',imageMean);
    console.log('image var:',imageVar);
    console.log('mean wm:',this.mean(wm));
    console.log('mean gm:',this.mean(gm));
    console.log('mean bm:',this.mean(bm));
    console.log('var gm:',this.variance(gm));
    console.log('var bm:',this.variance(bm));
    console.log('var wm:',this.variance(wm));
    console.log('snr:',snr);
    console.log('cjv:',cjv);
    console.log('cnr:',cnr);
    console.log('efc:',efc);
    return [snr,cnr,cjv,efc];
  }


  /*
   * input: images, vals= images[0]: structural mask, images[1]: brain mask
   * output: linear registered image
   *
   */
  /*registeration(images,vals){
    let img = this.inputs['input'];
    let initial=0;
    let idat=img.getImageData();
    let o1=img.getOrientationName();
    let o2=images[0].getOrientationName();
    let centeronrefonly=false;
    let snr = this.mean(signal)/(Math.sqrt(this.variance(noise))); // higher better
    let cjv = (Math.sqrt(this.variance(wm))+Math.sqrt(this.variance(gm)))/Math.abs(this.mean(wm)-this.mean(gm)); // lower better
    let cnr = Math.abs(this.mean(gm)-this.mean(wm))/Math.sqrt(this.variance(bm)+this.variance(wm)+this.variance(gm)); // higher better
    let efc = -x_j.map(function(v){ return v/x_max*Math.log(v/x_max)}).reduce((a,b)=>a+b); // lower better
    return [snr,cnr,cjv,efc];
  }*/


  /*
   * input: images, vals= images[0]: structural mask, images[1]: brain mask
   * output: linear registered image
   *
   */
  registeration(images,vals){
    let img = this.inputs['input'];
    let initial=0;
    //let idat=img.getImageData();
    let o1=img.getOrientationName();
    let o2=images[0].getOrientationName();
    let centeronrefonly=false;

    if (o1!==o2) {
      centeronrefonly=true;
      initial=xformutil.computeHeaderTransformation(img,images[0],false);
    }

    return biswrap.runLinearRegistrationWASM(img, images[0], initial, {
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
        'resolution' : parseFloat(vals.resolution),
        'normalize' : true,
        'debug' : true,
        'return_vector' : false}, this.parseBoolean(vals.debug));
  }

  /*
   * input: img, vals
   * output: masked image = setting areas outside of the mask as zero
   */
  maskImage(img,vals){
    if (this.parseBoolean(vals.outputmask)) {
      let tdat=this.reslicedImage.getImageData();
      let l=tdat.length;


      for (let i=0;i<l;i++) {
        if (tdat[i]<1)
          tdat[i]=0;
        else
          tdat[i]=1;
      }
    } else {
      this.maskedImage.cloneImage(img);
      let odat=this.maskedImage.getImageData();

      let idat=img.getImageData();
      let tdat=this.reslicedImage.getImageData();

      let dm=this.maskedImage.getDimensions();
      let volumesize=dm[0]*dm[1]*dm[2];
      let numframes=dm[3]*dm[4];

      let count=0;
      for (let i=0;i<volumesize;i++) {
        let v=tdat[i];
        if (v<1) {
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
    }
    return this.maskedImage;
  }

  /*
   * input: img, vals
   * output: BisWebTextObject of quality controls
   */
  printQualityControl(maskedImage,segmentImage,segmentedMaskedImage){
    //let mode=vals.mode;
    //let fdata=img.getImageData();
    //let dim = img.getDimensions();
    var snr,cnr,cjv,ecf;// measures 
    [snr,cnr,cjv,ecf] = this.getQualityMeasures(maskedImage,segmentImage,segmentedMaskedImage);

    let message = "<p>  Image Quality Metrics</p><p>SNR= <span style=\"color:green\">"+snr.toFixed(4).toString()+"</span></p>"+
      "<p>CNR= <span style=\"color:green\">"+cnr.toFixed(4).toString()+"</span><a href=\"https://mriqc.readthedocs.io/en/stable/iqms/t1w.html#magnota2006\"/></p>"+
      "<p>CJV= <span style=\"color:green\">"+cjv.toFixed(4).toString()+"</span></p>"+
      "<p>ECF= <span style=\"color:green\">"+ecf.toFixed(4).toString()+"</span></p>";

    this.outputs['logoutput']=new BisWebTextObject(message);
    let mat=new BisWebMatrix();
    mat.zero(4,1);
    mat.setElement(0,0,snr);
    mat.setElement(1,0,cnr);
    mat.setElement(2,0,cjv);
    mat.setElement(3,0,ecf);
    this.outputs['output']=mat;

  }

  /***
   * the main function for quality control
   * input: vals, image
   * output: BisWebTextObject(message)
   ***/

  qualityCtrlProcess(img,vals){
    let images = [ new BisWebImage(), new BisWebImage() ];
    let imagepath = genericio.getimagepath();
    console.log('imagepath:',imagepath);
    return new Promise((resolve, reject) => { // defacing
        Promise.all( [
            images[0].load(`${imagepath}/mean_reg2mean.nii.gz`),
            images[1].load(`${imagepath}/brain_mask_for_qc.nii.gz`),
            biswrap.initialize()
        ]).then( () => {

          /*
           * step 1: linear registeration
           */
          var matr = this.registeration(images,vals); 

          /*
           * step 2: reslice registered image
           */
          this.reslicedImage=baseutils.resliceRegistrationOutput(biswrap,img,images[1],matr,1,0);

          /*
           * step 3: mask resliced Image
           */
          this.maskedImage = this.maskImage(img,vals);
          //this.maskedImage = maskedImage;

          /*
           * step 4: segmentImage
           */
          this.segmentedImage = this.segmentImage(img, vals , 2); // Step 3 image segmentation 
          this.segmentedMaskedImage =  this.segmentImage(this.maskedImage, vals , 3); // Step 3 image segmentation 
          //var segmentedBackgroundImage =  this.segmentImage(maskedImage, vals , 2); // Step 3 image segmentation 

          /*
           * step 5: compute quality control metrics
           */
          this.printQualityControl(this.maskedImage,this.segmentImage,this.segmentedMaskedImage);

          resolve();

        }).catch( (e) => {
          reject(e.stack);
          });
    });

  }

  directInvokeAlgorithm(vals) {
    console.log('oooo invoking: defaceImage with vals', JSON.stringify(vals));
    let img = this.inputs['input'];
    return this.qualityCtrlProcess(img,vals);
  }

}

module.exports = QualityMeasuresModule;
