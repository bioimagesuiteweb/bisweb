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

const baseutils=require("baseutils");
const BaseModule = require('basemodule.js');
const BisWebMatrix   =require('bisweb_matrix');
const BisWebImage = require('bisweb_image.js');
const util=require('bis_util');
const imageutils=require('bis_imageutils');
const fmrimatrix   =require('bis_fmrimatrixconnectivity');
const baseLargeImage=require('baseLargeImage');
/**
 * Takes an input time series and object map detailing regions of interest (ROIs) and returns the mean activation for the region.
 */
class ComputeROILargeModule extends BaseModule {
    constructor() {
        super();
        this.name = 'computeROILarge';

    }

    createDescription() {
        let des={
            "name": "Compute ROILarge",
            "description": "Takes an input time series and ROI map and returns the mean intensity in the roi as a matrix of frames(rows)*roiindex(columns)",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs": [],
            "outputs":  baseutils.getMatrixToMatrixOutputs(),
            "buttonName": "Calculate",
            "shortname" : "roi",
            "params": [
                {
                    "name": "input",
                    "description": "This is the input filename",
                    "priority": 0,
                    "advanced": false,
                    "varname": "input",
                    "shortname" : "i",
                    "type": 'string',
                    "default": '',
                },
                {
                    "name": "loadall",
                    "description": "If true (default=false), load all images first, then process",
                    "priority": 10,
                    "advanced": true,
                    "gui": "check",
                    "varname": "loadall",
                    "type": 'boolean',
                    "default": true,
                },
                baseutils.getDebugParam()
            ]
        };
        des.inputs.push({
            'type': 'image',
            'name': 'Load Regions of Interest',
            'description': 'parcellation/regions of interest to compute signal averages for',
            'varname': 'roi',
            'shortname' : 'r'
        });
        
        return des;
    }

    async processFrame(frame,frameImage) {

        let roidata= this.roi.getImageData();
        let numrois=this.num.length;
        let inpdata=frameImage.getImageData();
        
        if (frame % 50 ===0) 
            console.log('++++ Computing Streaming ROI: frame=',frame);

        for (let i=0;i<numrois;i++)
            this.num[i]=0;
        
        for (let voxel=0;voxel<inpdata.length;voxel++) {
            let region=Math.floor(roidata[voxel])-1;
            if (region>=0) {
                this.num[region]=this.num[region]+1;
                this.matrix[frame][region]=this.matrix[frame][region]+inpdata[voxel];
            }
        }
    
        for (let region=0;region<numrois;region++) {
            if (this.num[region]>0)
                this.matrix[frame][region]=this.matrix[frame][region]/this.num[region];
        }

        return false;
    }
    

    async computeROIArray(inputname,roi,numrois) {

        try {
            let arr=await imageutils.readImageAsArray(inputname,false);
            
            console.log("___ Read",arr.length,"Frames");
            for (let i=0;i<arr.length;i++) {
                let out=fmrimatrix.roimean(arr[i],roi,false)['means'];

                for (let j=0;j<numrois;j++) {
                    this.matrix[i][j]=out[0][j];
                }
                arr[i]=null;
            }
            return Promise.resolve('All set');
        } catch (e) {
            console.log('Error=',e);
            return Promise.reject(e);
        }
        
    }
        
    
    
    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: computeROILarge with values', JSON.stringify(vals));

        let debug=super.parseBoolean(vals.debug);
        let loadall=super.parseBoolean(vals.loadall);        
        this.roi=this.inputs['roi'];
        let inputname = vals['input'];
        let input=new BisWebImage();

        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            return Promise.reject('Failed to read the header in computeROILarge '+inputname);
        }
        
        
        if (!input.hasSameOrientation(this.roi,'input image','roi image',true))
            return Promise.reject('Failed');
        
        
        this.roi.computeIntensityRange();
        let r=this.roi.getIntensityRange();

        if (r[1]>999 || r[0] < -3 ) 
            throw new Error('Bad ROI Image. It has largest value > 999 (max='+r[1]+') or min value <-3 ( min='+r[0]+')');

        let dims=input.getDimensions();
        
        let numrois=Math.floor(r[1]);
        let numframes = dims[3]*dims[4];
        
        this.outputs['output']=new BisWebMatrix();
        this.matrix=util.zero(numframes,numrois);
        this.num=new Int32Array(numrois);
        
        if (loadall) {
            await this.computeROIArray(inputname,this.roi,numrois);
        } else {
            try {
                console.log('\n\n calling baseLargeImage.readAndProcessLargeImage',inputname);
                await baseLargeImage.readAndProcessLargeImage(inputname,this);
            } catch(e) {
                return Promise.reject(e);
            }
        }
        this.outputs['output'].setFromNumericMatrix(this.matrix);
        return Promise.resolve('Done');
    }
}

module.exports = ComputeROILargeModule;
