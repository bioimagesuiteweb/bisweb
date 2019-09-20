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

const BisWebImage = require('bisweb_image.js');

const fs=require('fs');
const zlib=require('zlib');


const imageutils = {    

    processFrame : function (params,buffer,debug) {

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
                
                if (params['swap']) {
                    let sizeoftype=params['voxelsize'];
                    let half=sizeoftype/2;
                    let rawsize=params['temp'].length;
                    for (let i=0;i<rawsize;i++) {
                        let offset=i*sizeoftype;
                        for (let j=0;j<half;j++) {
                            let j1=j+offset;
                            const tmp1=params['temp'][j1];
                            const j2=offset+sizeoftype-(j+1);
                            params['temp'][j1]=params['temp'][j2];
                            params['temp'][j2]=tmp1;
                        }
                    }
                }
                let arr=new params['arraytype'](params['temp'].buffer);
                let img=new BisWebImage();
                img.cloneImage(params['image'],{
                    numframes : 1
                },true);
                let imgdata=img.getImageData();
                for (let i=0;i<imgdata.length;i++) {
                    imgdata[i]=arr[i];
                }
                let f=params['imagearray'].length;
                params['imagearray'].push(img);

                let s=`${f}`;
                while (s.length<params['numdigits'])
                    s='0'+s;

                img.setFilename(params['basename']+'_fr'+s+'.nii.gz');
                
                if (f% (Math.floor(params['numframes']/8)) === 0 || debug) {
                    console.log('++++ Added frame ',f, 'Length=',arr.length,imgdata.length,'desc=',img.getDescription());
                }
                img=null;
                arr=null;
                params['added']=0;
            }
            
            available=available-length;
            if (available<1) {
                params['offset']=0;
                done=true;
            }
        }
    },

    
    readAndProcessFile : function (filename,params,debug) {

        let gzip=false;
        if (filename.split('.').pop()==='gz') {
            gzip=true;
        }
    
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
                    if (debug)
                        console.log('____ stream reading gzip finished');
                    resolve('Done');
                });
                
                gunzip.on('data', (chunk) => {
                    this.processFrame(params,chunk,debug);
                });
                gunzip.on('error', () => {
                    reject('Done');
                });
            } else {
                
                readstream.on('end', () => {
                    if (debug)
                        console.log('____ stream reading finished');
                    
                    resolve('Done');
                });
                
                readstream.on('readable', () => {
                    let done=false;
                    while (!done) {
                        let chunk = readstream.read();
                        if (chunk) {
                            this.processFrame(params,chunk,debug);
                        } else {
                            done=true;
                        }
                    }
                });
            }
        });
    },

    async readImageAsArray(inputname,debug=false) {

        console.log('____ Reading ',inputname);
        let input=new BisWebImage();
        let headerinfo=null;
        try {
            headerinfo=await input.loadHeaderOnly(inputname,debug);
        } catch(e) {
            console.log(e.stack);
            return Promise.reject('Failed to read '+inputname);
        }

        
        let basename=inputname;
        if (basename.lastIndexOf(".nii.gz")===inputname.length-7)
            basename=basename.substr(0,inputname.length-7);
        else if (basename.lastIndexOf(".nii")===inputname.length-3)
            basename=basename.substr(0,inputname.length-3);

        let dims=input.getDimensions();
        let numframes = dims[3];

        let numdigits=Math.ceil(Math.log(numframes)/Math.log(10));
        if (numdigits<3)
            numdigits=3;
        if (debug)
            console.log('___ beginning dims',dims,numframes,'Numzeros=',numdigits);

        
        let params= {
            numframes : numframes,
            voxelsize : headerinfo.type.size,
            volumesize : dims[0]*dims[1]*dims[2],
            arraytype : headerinfo.type.type,
            headersize : headerinfo.headerlength,
            swap : headerinfo.swap,
            headerBuffer : headerinfo.headerBuffer,
            imagearray : [],
            basename : basename,
            numdigits : numdigits,
        };

        if (debug)
            console.log('Params=',params);
        
        params['volumebytesize']=params.volumesize*params.voxelsize;
        params['temp']=new Uint8Array(params['volumebytesize']);
        params['image']=input;
        

        
        try {
            await this.readAndProcessFile(inputname,params,debug);
        } catch(e) {
            return Promise.reject(e);
        }

        let imgarr=params.imagearray;
        params={};
        
        return Promise.resolve(imgarr);
    }
};

module.exports = imageutils;
