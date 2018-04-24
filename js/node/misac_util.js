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

// -----------------------------------------------------------------
// Header and requirements for node.js
'use strict';

// -----------------------------------------------------------------
// Create command line
// -----------------------------------------------------------------


const bisgenericio=require('bis_genericio');
const path=bisgenericio.getpathmodule();
const BisWebImage=require('bisweb_image');
const linearRegistration=require('linearRegistration');
const motionCorrection=require('motionCorrection');


const misacUtil = {

    loadJob : function(f) {
        
        return new Promise( (resolve,reject) => {
            
            bisgenericio.readJSON(f,"ParavisionJob").then( (obj) => {
                let out=obj.data.job;
                resolve(out);
            }).catch( (e) => {
                console.log(e.stack);
                reject(e);
            });
        });
    },

    getItemsWithTag : function(lst,tag) {
        
        let outlist=[];
        for (let i=0;i<lst.length;i++) {
            if (lst[i].tag===tag) {
                outlist.push(lst[i]);
            }
        }
        return outlist;
    },
                                                 
    loadList : function(lst) {


        let p=[];
        let imagelist=[];
        for (let i=0;i<lst.length;i++) {

            console.log('Looking at path',lst[i].filename,this.globaldir);
            
            let fname='';
            if (path.isAbsolute(lst[i].filename)) 
                fname=lst.filename;
            else
                fname=path.resolve(path.join(this.globaldir,lst[i].filename));
            
            let img=new BisWebImage();
            imagelist.push(img);
            p.push(img.load(fname));
            
        }
        
        return new Promise( (resolve,reject) => { 
            Promise.all(p).then( () => {
                resolve(imagelist);
            }).catch( (e) => {
                console.log(e.stack);
                reject(e);
            });
        });
    },

    fuseImages : function(imagelist) {

        let refimg=imagelist[0];
        let p=[];
        let reglist=[];
        
        console.log('Image list length=',imagelist.length);
        
        for (let i=1;i<imagelist.length;i++) {
            
            let reg=new linearRegistration();
            reglist.push(reg);
            console.log('Registering\n\t',imagelist[0].getFilename(),' and \n\t ',imagelist[i].getFilename(),'\n\n');
            p.push( reg.execute( { 'reference' : imagelist[0],
                                   'target' : imagelist[i] },
                                 { 'mode' : 'Rigid',
                                   'debug' : false,
                                   'doreslice' : true,
                                 }));
        }

        return new Promise( (resolve,reject) => {
            
            Promise.all(p).then( () => {
                
                let outputimage=new BisWebImage();
                outputimage.cloneImage(refimg);
                
                let outdata=outputimage.getImageData();
                let idatalist=[ refimg.getImageData() ];
                
                for (let i=0;i<reglist.length;i++) {
                    
                let res=reglist[i].getOutputObject('resliced');
                    console.log('++++ Result=',res.getDescription());
                    idatalist.push(res.getImageData());
                }
                
                for (let v=0;v<outdata.length;v++) {
                    let sum=0.0;
                    for (let i=0;i<idatalist.length;i++) {
                        sum=sum+idatalist[i][v];
                    }
                    outdata[v]=sum/idatalist.length;
                }
                resolve(outputimage);
            }).catch( (e) => {
                console.log(e.stack);
                reject(e);
            });
        });
    },


    averageImages : function(origlist,name) {

        let lst=this.getItemsWithTag(origlist,name);

        return new Promise(
            (resolve,reject) => {
                
                this.loadList(lst).then( (imagelist) => {
                    this.fuseImages(imagelist).then( (output) => {
                        console.log('\n++++ Output image=',output.getDescription());
                        resolve(output);
                    });
                }).catch( (e) => {
                    console.log(e.stack);
                    reject(e);
                });
            });
    },       


    registerAverageImages : function(image1,image2)  {

        return new Promise( (resolve,reject) => {
            
            let reg=new linearRegistration();
            console.log('Registering Average Images\n\t',image1.getDescription(),' and \n\t ',image2.getDescription(),'\n\n');
            reg.execute( { 'reference' : image1,
                           'target' : image2 },
                         { 'mode' : 'Rigid',
                           'debug' : false,
                           'doreslice' : false,
                         }).then( () => {
                             
                             let transform=reg.getOutputObject('output');
                             resolve(transform);
                         }).catch( (e) => {
                             console.log(e.stack);
                             reject(e);
                         });
        });
    },

    motionCorrectImages : function(origlist,globaldir=null) {

        if (globaldir)
            this.globaldir=globaldir;
        
        let lst=this.getItemsWithTag(origlist,'EPI');
        lst=[ lst[0] ];
        console.log(`++++ List(EPI)=`,JSON.stringify(lst));
        
        return new Promise(
            (resolve,reject) => {
                
                
                this.loadList(lst).then( (imagelist) => {
                    
                    /* jshint ignore:start */
                    let count=0;
                    let mydone=function() {
                        count=count+1;
                        if (count===imagelist.length)
                            resolve();
                    };
                    /* jshint ignore:end */
                    
                    let motlist=[];
                    let p=[];
                    for (let i=0;i<imagelist.length;i++) {
                        
                        let mot=new motionCorrection();
                        motlist.push(mot);
                        console.log('Motion Correcting\n\t',imagelist[i].getFilename(),' to \n\t ',imagelist[0].getFilename(),'\n\n');
                        p.push( mot.execute( { 'reference' : imagelist[0],
                                               'target' : imagelist[i] },
                                             { 'mode' : 'Rigid',
                                               'debug' : false,
                                               'levels' : 1,
                                               'steps' : 1,
                                               'resolution' : 2.0,
                                               'iterations' : 1,
                                               'doreslice' : true,
                                             }));
                    }
                    
                    
                    Promise.all(p).then( () => {

                        console.log('++++ Now saving');
                        for (let i=0;i<imagelist.length;i++) {
                            
                            let output=motlist[i].getOutputObject('resliced');
                            console.log('\n++++ Output image=',output.getDescription());
                            /* jshint ignore:start */
                            let fname=path.parse(imagelist[0].getFilename()).name;
                            let outname=this.outfilename+'_'+fname+'_mot.nii.gz';
                            output.save(outname).then ( (n) => {
                                console.log('+++++ \t saved corrected in '+n);
                                mydone();
                            });
                            /* jshint ignore:end */
                        }
                    });
                }).catch( (e) => {
                console.log(e.stack);
                    reject(e);
                });
            });
    },      


    createAverageAnatomical(obj,outfilename) {


        this.globaldir=path.dirname(outfilename);
        
        const self=this;
        let names=[ '3DAnatomical','2DAnatomical' ];
        
        return new Promise( (resolve,reject) => {
            
            Promise.all([ 
                self.averageImages(obj,names[0]),
                self.averageImages(obj,names[1])
            ]).then( (imglist) => {
                
                let outname=["","","" ];
                
                for (let i=0;i<imglist.length;i++) {
                    let nm=names[i].toLowerCase();
                    outname[i]=outfilename+`_average_${nm}.nii.gz`;
                }
                
                self.registerAverageImages(imglist[0],imglist[1]).then( (xform) => {
                    let objlist = [ imglist[0],imglist[1], xform ];
                    outname[2]=outfilename+`_3danat_2danat.matr`;
                    
                    resolve({
                        objlist : objlist,
                        outnamelist : outname,
                        names : [ 'Average3D', 'Average2D', 'Map3Dto2D' ]
                    });
                }).catch( (e) => { reject(e); });
            }).catch( (e) => { reject(e); });
        });
    },
    
    setGlobalPaths(inpfilename,outfilename) {

        this.globaldir=path.dirname(path.resolve(inpfilename));
        this.outfilename=outfilename;
    },

    mainFunction : function (inpfilename,outfilename,opmode='anatomical') {


        this.setGlobalPaths(inpfilename,outfilename);
        if (opmode!=='motion')
            opmode='anatomical';

        const self=this;
        
        console.log("++++ Ready to begin:", inpfilename,self.globaldir,self.outfilename,opmode);
        
        return new Promise( (resolve , reject) => {
            
            self.loadJob(inpfilename).then( (obj) => {
                
                if (opmode==='anatomical') {
                    let names=[ '3DAnatomical','2DAnatomical' ];
                    
                    Promise.all([ 
                        self.averageImages(obj,names[0]),
                        self.averageImages(obj,names[1])
                    ]).then( (imglist) => {

                        let outname=["","","" ];
                        
                        for (let i=0;i<imglist.length;i++) {
                            let nm=names[i].toLowerCase();
                            outname[i]=this.outfilename+`_average_${nm}.nii.gz`;
                        }
                        
                        self.registerAverageImages(imglist[0],imglist[1]).then( (xform) => {
                            let objlist = [ imglist[0],imglist[1], xform ];
                            outname[2]=this.outfilename+`_3danat_2danat.matr`;

                            resolve({
                                objlist : objlist,
                                outnamelist : outname,
                                names : [ 'Average3D', 'Average2D', 'Map3Dto2D' ]
                            });
                        });
                    });
                } else if (opmode==='motion') {
                    self.motionCorrectImages(obj).then( () => {
                        resolve('Done '+opmode);
                    }).catch( (e) => {
                        console.log(e.stack);
                        reject(e);
                    });
                }
            }).catch( (e) => {
                console.log(e.stack);
                console.log(e);
                reject(e);
            });
        });
    }
};


module.exports=misacUtil;
