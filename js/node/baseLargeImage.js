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
const bisgenericio=require('bis_genericio.js');
const rimraf=require('rimraf');
const tmpPackage=require('tmp');

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
            let finished=params['processFrameCallbackObject'].processFrame(params['frame'],params['tmpImage']);
            console.log('Finished=',finished,params['frame']);
            params['frame']+=1;
            params['added']=0;
            if (finished) {
                return true;
            }
            
        }
        
        available=available-length;
        if (available<1) {
            params['offset']=0;
            done=true;
        }

    }

    return false;
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

    let finished=false;
    
    return new Promise( (resolve,reject) => {
        
        if (gzip) {
            const gunzip = zlib.createGunzip();
            readstream.pipe(gunzip).on('finish', () => {
                resolve('Done');
            });
            
            gunzip.on('data', (chunk) => {
                if (!finished) {
                    if (processFrame(params,chunk)) {
                        finished=true;
                        resolve('Done');
                        return;
                    }
                }
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
                    if (chunk && !finished) {
                        if (processFrame(params,chunk)) {
                            finished=true;
                            resolve('Done');
                            return;
                        }
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


const createInitialImageOutput =  (firstImage,dt=null,numframes=0,numcomponents=0) =>{


    let tempImage=new BisWebImage();
    tempImage.cloneImage(firstImage,
                         {
                             "numframes" : numframes,
                             "numcomponents" : numcomponents,
                             "onlyheader" : true,
                             "newniftytype" : dt
                         },true);

    return tempImage;
};

const saveInitialImageHeader =  (tempImage) => { 
    
    let headerdata=tempImage.getHeaderData(true);
    let tempfname=tmpPackage.tmpNameSync();

    console.log('Initial=',headerdata.length,tempfname);
    
    let fd=null;
    try {
        fd = fs.openSync(tempfname, 'w');
        let buf = bisgenericio.createBuffer(headerdata);
        fs.writeSync(fd, buf);
    } catch(e) {
        return [ null,e ];
    }

    return [ fd, tempfname ];
};

const writeSubsequentFrame =(filehandle,imageFrame,last=false) => {

    let rawdata=imageFrame.getRawData();
    try {
        let buf = bisgenericio.createBuffer(rawdata);
        fs.writeSync(filehandle,buf);
    } catch(e) {
        console.log(e);
        return 0;
    }

    console.log('Frame written',last,rawdata.length);
    
    if (last)
        fs.closeSync(filehandle);
    
    return rawdata.length;
};

const compressFile=  (infilename,outname,deleteold=true)  => {

    try {
        const inp = fs.createReadStream(infilename);
        
        // Creating writable stream
        const out = fs.createWriteStream(outname);
        
        // Calling createGzip method
        const gzip = zlib.createGzip();
        
        // Piping
        inp.pipe(gzip).pipe(out);
        console.log("Gzip created!");
        
        if (deleteold)
            rimraf.sync(infilename);
        return true;
    } catch(e) {
        console.log(e);
        return false;
    }
};
                                       

const writeOutput=(frame,numframes,outputname,imageToSave,fileHandle) => {

    console.log('--------- write',frame,'/',numframes);
    
    if (frame===0) {
        
        console.log('First Frame',outputname,imageToSave.getDescription());
        let tmp=createInitialImageOutput(imageToSave);
        let fh=saveInitialImageHeader(tmp);
        fileHandle['fd']=fh[0];
        fileHandle['filename']=fh[1];
        
    }
    
    let last=false;
    if (frame === numframes-1)
        last=true;

    console.log('Is last=',last, frame,'/',numframes);
    
    writeSubsequentFrame(fileHandle['fd'],imageToSave,last);

    if (last) {
        console.log('Calling Compress',fileHandle['filename'],outputname);
        compressFile(fileHandle['filename'],outputname,true);
    }

    console.log('Last=',last);

    return last;

};


module.exports = {
    readAndProcessLargeImage : readAndProcessLargeImage,
    createInitialImageOutput : createInitialImageOutput,
    saveInitialImageHeader : saveInitialImageHeader,
    writeSubsequentFrame : writeSubsequentFrame,
    compressFile : compressFile,
    writeOutput : writeOutput,
};
