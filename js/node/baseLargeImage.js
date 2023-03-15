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
const fs=require('fs');
const zlib=require('zlib');


/**
 * A set of utility functions to handle large image load and process
 * @namespace baseLargeImage
 */

/**
 * Code to load and stream large images
 */
const processFrame = (params,buffer) => {

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
            params['processFrameCallbackObject'].processFrame(params['frame'],params['tmpImage']);
            params['frame']+=1;
            params['added']=0;
        }
        
        available=available-length;
        if (available<1) {
            params['offset']=0;
            done=true;
        }
    }
};



const readAndProcessFile = (params) => {

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
                processFrame(params,chunk);
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
                        processFrame(params,chunk);
                    } else {
                        done=true;
                    }
                }
            });
        }
    });
};


/**
 * String inputname -- name of largeimage
 * Function callbackObject -- function to call with new frames
 */
const readAndProcessLargeImage = async (inputname,callbackObject) => {

    let input=new BisWebImage();
    let headerinfo=null;
    try {
        headerinfo=await input.loadHeaderOnly(inputname,true);
    } catch(e) {
        return Promise.reject('Failed to read header of '+inputname);
    }

    let dims=input.getDimensions();
    
    let params= {
        numframes : dims[3]*dims[4],
        voxelsize : headerinfo.type.size,
        volumesize : dims[0]*dims[1]*dims[2],
        headersize : headerinfo.headerlength,
        swap : headerinfo.swap,
        processFrameCallbackObject : callbackObject,
        inputname : inputname,
        input : input
    };

    
    if (params.swap) {
        return Promise.reject('Can not handle byte swapped data');
    }
    
    params['volumebytesize']=params.volumesize*params.voxelsize;
    params['temp']=new Uint8Array(params['volumebytesize']);
    params['tmpImage']=new BisWebImage();
    params['tmpImage'].cloneImage(params['input'],
                                  {
                                      "numframes" : 1,
                                      "numcomponents" : 1,
                                      "buffer" : params['temp'].buffer
                                  }, true);
    

    
    try {
        await readAndProcessFile(params);
    } catch(e) {
        return Promise.reject(e);
    }
    
    return Promise.resolve('Done');
};

module.exports = {
    readAndProcessLargeImage : readAndProcessLargeImage
};
