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
const processFrame = async (params,buffer) => {

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
            let finished=await params['processFrameCallbackObject'].processFrame(params['frame'],params['tmpImage']);
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



const readAndProcessFile = async (params) => {

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
    let processing=false;
    
    return new Promise( (resolve,reject) => {
        
        if (gzip) {
            const gunzip = zlib.createGunzip();
            readstream.pipe(gunzip).on('finish', () => {
                if (!processing) {
                    resolve('Done');
                }
            });
            
            gunzip.on('data', async (chunk) => {
                if (!finished) {
                    processing=true;
                    let ok=await processFrame(params,chunk);
                    processing=false;
                    if (ok) {
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
            
            readstream.on('readable', async () => {
                let done=false;
                while (!done) {
                    let chunk = readstream.read();
                    if (chunk && !finished) {
                        let ok=await processFrame(params,chunk);
                        if (ok) {
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

const saveInitialImageHeader =  (tempImage,numframes=1) => { 

    let hd=tempImage.getHeader();
    let headerdata=tempImage.getHeaderData(true,numframes);
    console.log(headerdata);
    let tempfname=tmpPackage.tmpNameSync();
    let numbytes=0;
    let fd=null;
    try {
        fd = fs.openSync(tempfname, 'w');
        let buf = bisgenericio.createBuffer(headerdata.data);
        let l=fs.writeSync(fd, buf);
    } catch(e) {
        return [ null,e ];
    }

    return [ fd, tempfname, numbytes ];
};

const writeSubsequentFrame =(filehandle,imageFrame,last=false,debug=false) => {

    let rawdata=imageFrame.getRawData();
    try {
        let buf = bisgenericio.createBuffer(rawdata);
        let l=fs.writeSync(filehandle['fd'],buf)
        filehandle['numbytes']+=l;
        if (debug)
            console.log('_____ writing ',l,'bytes');
    } catch(e) {
        console.log(e);
        return 0;
    }

    return rawdata.length;
};

const compressFile= (infilename,outname,deleteold=true)  => {

    let success=false;
    let index=outname.lastIndexOf('.gz');
    if (index<2) {
        return new Promise( (resolve,reject) => {
            try {
                console.log('_____ executing copy '+infilename+' '+outname);
                fs.copyFileSync(infilename,outname);
                success=true;
            } catch(e) {
                console.log(e);
            }
            if (deleteold)
                rimraf.sync(infilename);
            if (success)
                resolve(true);
            else
                reject(false);
        })
    }

    console.log('_____ executing gzip '+infilename+' '+outname);
    return new Promise( (resolve,reject) => {
        try {
            fs.createReadStream(infilename)
                .pipe(zlib.createGzip())
                .pipe(fs.createWriteStream(outname))
                .on('finish', () => {
                    rimraf.sync(infilename);
                    resolve(true);
                })
                .on('error', () => {
                    reject(false);
                });
        } catch(e) {
            console.log('Error=',e);
            reject(false);
        }
    });
};
                                       

const writeOutput=async (frame,numframes,outputname,imageToSave,fileHandle,debug=false) => {

    if (frame===0) {
        console.log('_____ writing header to',outputname,imageToSave.getDescription());
        let tmp=createInitialImageOutput(imageToSave);
        let fh=saveInitialImageHeader(tmp,numframes);
        fileHandle['fd']=fh[0];
        fileHandle['filename']=fh[1];
        fileHandle['numbytes']=fh[2];
    }
    
    let last=false;
    if (frame === numframes-1)
        last=true;
    debug=true;

    if (debug || last)
        console.log('_____ writing frame (last=',last,')', frame,'/',numframes);


    
    await writeSubsequentFrame(fileHandle,imageToSave,last, false);

    
    
    if (last) {
        fs.closeSync(fileHandle['fd']);
        console.log('_____ File ',fileHandle['filename'],'closed numbytes=',fileHandle['numbytes']);
        return await compressFile(fileHandle['filename'],outputname,true);
    } 
                        
    return Promise.resolve(last);

};


module.exports = {
    readAndProcessLargeImage : readAndProcessLargeImage,
    createInitialImageOutput : createInitialImageOutput,
    saveInitialImageHeader : saveInitialImageHeader,
    writeSubsequentFrame : writeSubsequentFrame,
    compressFile : compressFile,
    writeOutput : writeOutput,
};
