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
const fs=require('fs');
const zlib=require('zlib');
const imageutils=require('bis_imageutils');
const fmrimatrix   =require('bis_fmrimatrixconnectivity');
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

    computeROI(roi,matrix,num,frame,inpdata) {

        let roidata= roi.getImageData();
        let numrois=num.length;

        if (frame % 50 ===0) 
            console.log('++++ Computing Streaming ROI: frame=',frame);

        for (let i=0;i<numrois;i++)
            num[i]=0;
        
        for (let voxel=0;voxel<inpdata.length;voxel++) {
            let region=Math.floor(roidata[voxel])-1;
            if (region>=0) {
                num[region]=num[region]+1;
                matrix[frame][region]=matrix[frame][region]+inpdata[voxel];
            }
        }
    
        for (let region=0;region<numrois;region++) {
            if (num[region]>0)
                matrix[frame][region]=matrix[frame][region]/num[region];
        }
    }
    
    processFrame(params,buffer,matrix,roiimage) {

        let newbuf=new Uint8Array(buffer);
        let len=newbuf.length;
        
        
        let storeData=(in_offset,out_offset,length) => {
            for (let i=0;i<length;i++)
                params['temp'][out_offset+i]=newbuf[i+in_offset];
        };

        // How much can we add
        let done=false;

        while (!done) {
            let available=len-params['offset'];
            let maxneeded=params['volumebytesize']-params['added'];
            let length=available;
            let in_offset=params['offset'];
            
            if (maxneeded<available) {
                length=maxneeded;
                params['offset']+=length;
            } else {
                params['offset']=0;
            }

            storeData(in_offset,params['added'],length);
            params['added']=params['added']+length;
            let extraneeded=params['volumebytesize']-params['added'];

            if (extraneeded<1) {
                this.computeROI(roiimage,matrix,params['num'],params['frame'],new params['arraytype'](params['temp'].buffer));
                params['frame']+=1;
                params['added']=0;
            }
                           
            available=available-length;
            if (available<1) {
                params['offset']=0;
                done=true;
            }
        }
    }


    readAndProcessFile(filename,inpimage,params,matrix,roiimage) {

        let gzip=false;
        if (filename.split('.').pop()==='gz') {
            gzip=true;
        }
    
            params['frame']=0;
        params['offset']=params['headersize'];
        params['added']=0;
        params['leftover']=0;

        let readstream = fs.createReadStream(filename).on('error', (e) => {
            console.log('Error=',e);
            return Promise.reject('error'+e);
        });

        
        return new Promise( (resolve,reject) => {
            
            if (gzip) {

                const gunzip = zlib.createGunzip();
                readstream.pipe(gunzip).on('finish', () => {
                    resolve('Done');
                });
                
                gunzip.on('data', (chunk) => {
                    this.processFrame(params,chunk,matrix,roiimage);
                });
                gunzip.on('error', () => {
                    reject('Done');
                });
            } else {
                
                readstream.on('end',  () => {
                    resolve('Done');
                });
                
                readstream.on('readable',  () => {
                    let done=false;
                    while (!done) {
                        let chunk = readstream.read();
                        if (chunk) {
                            this.processFrame(params,chunk,matrix,roiimage);
                        } else {
                            done=true;
                        }
                    }
                });
            }
        });
    }

    async computeROIArray(inputname,roi,numrois,matrix) {

        try {
            let arr=await imageutils.readImageAsArray(inputname,false);
            
            console.log("___ Read",arr.length,"Frames");
            for (let i=0;i<arr.length;i++) {
                let out=fmrimatrix.roimean(arr[i],roi,false)['means'];

                for (let j=0;j<numrois;j++) {
                    matrix[i][j]=out[0][j];
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
        let roi=this.inputs['roi'];
        let inputname = vals['input'];
        let input=new BisWebImage();
        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            return Promise.reject('Failed to read '+inputname);
        }
        
        
        if (!input.hasSameOrientation(roi,'input image','roi image',true))
            return Promise.reject('Failed');
        
        
        roi.computeIntensityRange();
        let r=roi.getIntensityRange();

        if (r[1]>999 || r[0] < -3 ) 
            throw new Error('Bad ROI Image. It has largest value > 999 (max='+r[1]+') or min value <-3 ( min='+r[0]+')');

        let dims=input.getDimensions();
        
        let numrois=Math.floor(r[1]);
        let numframes = dims[3];
        
        this.outputs['output']=new BisWebMatrix();
        let matrix=util.zero(numframes,numrois);

        if (loadall) {
            await this.computeROIArray(inputname,roi,numrois,matrix);
        } else {
            let data= {
                numframes : numframes,
                numrois : numrois,
                num : new Int32Array(numrois),
                voxelsize : headerinfo.type.size,
                volumesize : dims[0]*dims[1]*dims[2],
                arraytype : headerinfo.type.type,
                headersize : headerinfo.headerlength,
                swap : headerinfo.swap,
            };
            
            if (data.swap) {
                return Promise.reject('Can not handle byte swapped data');
            }
            
            data['volumebytesize']=data.volumesize*data.voxelsize;
            data['temp']=new Uint8Array(data['volumebytesize']);
            
            
            try {
                await this.readAndProcessFile(inputname,input,data,matrix,roi);
            } catch(e) {
                return Promise.reject(e);
            }
        }
        this.outputs['output'].setFromNumericMatrix(matrix);
        return Promise.resolve('Done');
    }
}

module.exports = ComputeROILargeModule;
