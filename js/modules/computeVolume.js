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
const util=require('bis_util');

/**
 * Takes an input time series and object map detailing regions of interest (Volumes) and returns the mean activation for the region.
 */
class ComputeVolumeModule extends BaseModule {
    constructor() {
        super();
        this.name = 'computeVolume';

    }

    createDescription() {
        let des={
            "name": "Compute Volume",
            "description": "Takes an input objectmap and computes the volumes of the various regions",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs('Objectmap'),
            "outputs":  baseutils.getMatrixToMatrixOutputs(),
            "buttonName": "Calculate",
            "shortname" : "Volume",
            "params": [
                {
                    "name": "Keep Region 0",
                    "description": "If true store the volume of the background region (0)",
                    "priority": 7,
                    "advanced": true,
                    "gui": "check",
                    "varname": "keepzero",
                    "type": 'boolean',
                    "default": false,
                },
                baseutils.getDebugParam(),
                
            ]
        };
        return des;
    }


    computeFrameROIVolume(output,imagedata,offset,volumesize,keepzero=false) {

        for (let i=offset;i<offset+volumesize;i++) {
            let val=Math.round(imagedata[i]);
            if (!( val===0 && keepzero===false))
                output[val]=(output[val] || 0)+1;
        }
    }

    createVolumeMatrix(out,dim,threed,range=[0,1]) {
        let keys=Object.keys(out);
        if (threed && keys.length===1) {

            let obj=out[keys[0]];
            let inner=Object.keys(obj);
            let numrows=inner.length;

            let matr=util.zero(numrows,2);
            for (let i=0;i<numrows;i++) {
                matr[i][0]=inner[i];
                matr[i][1]=obj[inner[i]];
            }
            let output=new BisWebMatrix();
            output.setFromNumericMatrix(matr);
            return output;
        }

        let numcols=keys.length+1;
        let numrows=range[1]-range[0]+1;
        let matr=util.zero(numrows,numcols);
        for (let i=0;i<numrows;i++) {
            let index=Math.floor(range[0]+i);
            matr[i][0]=index;
            for (let j=0;j<numcols-1;j++) {
                matr[i][j+1]=out[keys[j]][index] || 0;
            }
        }
        let output=new BisWebMatrix();
        output.setFromNumericMatrix(matr);
        return output;
    }
    
    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: computeVolume with values', JSON.stringify(vals));

        let debug=super.parseBoolean(vals.debug);
        let keepzero=super.parseBoolean(vals.keepzero);
        
        let input = this.inputs['input'];
        input.computeIntensityRange();
        let r=input.getIntensityRange();
        let dim=input.getDimensions();
        
        if (r[1]>999 || r[0] < 0 ) 
            return Promise.reject('Bad ROI Image. It has largest value > 999 (max='+r[1]+') or min value <0 ( min='+r[0]+')');

        if (dim[4]>1) 
            return Promise.reject('Bad ROI Image. Can only handle 4d images');
            
        if (debug) {
            console.log('Dimensions=',dim.join(','),' Range=',r.join(':'));
        }

        if (!keepzero) {
            if (r[0]<1)
                r[0]=1;
        }
        let out = { };
        let imagedata=input.getImageData();
        
        let threed=false;
        if (dim[4]<2 && dim[3]<2) {
            threed=true;
        }

        if (dim[3]<1)
            dim[3]=1;

        let volumesize=dim[0]*dim[1]*dim[2];
        
        if (!threed) {
            for (let frame=0;frame<dim[3];frame++) {
                let key=`${frame}`;
                let offset=frame*volumesize;
                out[key]={};
                this.computeFrameROIVolume(out[key],imagedata,offset,volumesize);
            }
        } else {
            out['single']={};
            this.computeFrameROIVolume(out['single'],imagedata,0,volumesize);
        }
            
        this.outputs['output']=this.createVolumeMatrix(out,dim,threed,r,keepzero);
        return Promise.resolve('Done');
    }
}

module.exports = ComputeVolumeModule;
