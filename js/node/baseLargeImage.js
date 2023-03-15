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
const BisWebImage = require('bisweb_image.js');
const util=require('bis_util');
const fs=require('fs');
const zlib=require('zlib');


/**
 * A set of utility functions to handle large image load and process
 * @namespace baseLargeImage
 */

/**
 * Code to load and stream large images
 */
const baseLargeImage = {
    
    processFrame : function(params,buffer) {

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
                params['processFrameCallback'](params,new params['arraytype'](params['temp'].buffer));
                params['frame']+=1;
                params['added']=0;
            }
                           
            available=available-length;
            if (available<1) {
                params['offset']=0;
                done=true;
            }
        }
    },


    readAndProcessFile : function(params) {

        let gzip=false;
        if (params.inputname.split('.').pop()==='gz') {
            gzip=true;
        }
    
        params['frame']=0;
        params['offset']=params['headersize'];
        params['added']=0;
        params['leftover']=0;

        let readstream = fs.createReadStream(params.inputname).on('error', (e) => {
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
                    this.processFrame(params,chunk);
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
                            this.processFrame(params,chunk);
                        } else {
                            done=true;
                        }
                    }
                });
            }
        });
    },


    /**
     * String inputname -- name of largeimage
     * Function callback -- function to call with new frames
     */
    readAndProcessLargeImage : async function(inputname,callback) {

        let input=new BisWebImage();
        console.log('input=',input.getDescription());
        let headerinfo=null;
        try {
            console.log('Trying to read',inputname);
            headerinfo=await input.loadHeaderOnly(inputname,true);
            console.log('Here');
        } catch(e) {
            return Promise.reject('Failed to read header of '+inputname);
        }

        let dims=input.getDimensions();
        
        let params= {
            numframes : numframes,
            voxelsize : headerinfo.type.size,
            volumesize : dims[0]*dims[1]*dims[2],
            dims : input.getDimensions(),
            spacing : input.getSpacing(),
            arraytype : headerinfo.type.type,
            headersize : headerinfo.headerlength,
            swap : headerinfo.swap,
            processFrameCallback : callback,
            inputname : inputname,
            input : input
        };
            
        if (params.swap) {
            return Promise.reject('Can not handle byte swapped data');
        }
            
        params['volumebytesize']=params.volumesize*params.voxelsize;
        params['temp']=new Uint8Array(params['volumebytesize']);
            
            
        try {
            await this.readAndProcessFile(params);
        } catch(e) {
            return Promise.reject(e);
        }
        
        return Promise.resolve('Done');
    }
}

module.exports = baseLargeImage;
