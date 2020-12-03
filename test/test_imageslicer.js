
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

/* jshint node:true */
/*global describe, it, before */
"use strict";

require('../config/bisweb_pathconfig.js');

const assert = require("assert");
const BisImageSlicer=require('bis_imageslicer');
const BisWebImage=require('bisweb_image');
const util=require('bis_util');
const path=require('path');
const numeric = require('numeric');

describe('Testing Image Slice Extraction (BisImageSlicerr from BisImageSlicerr.js) - a class that slices 3D images to create slices\n', function() {

    this.timeout(50000);
    let createarray=function(dat,colormode) {
        colormode = colormode || false;
        let newarr=null;
        let newlen=dat.length/4;
        let i=0,j=0;
        
        if (!colormode) {
            //      console.log('mapping len=',len,' to newlen=',newlen,[ dat[0], dat[1],dat[2],dat[3],'\t', dat[4], dat[5], dat[6],dat[7]]);

            newarr=util.zero(1,newlen);
            for (i=0;i<newlen;i++) {
                newarr[i]=dat[i*4];
            }
            return newarr;
        }

        newarr=util.zero(newlen,4);
        for (i=0;i<newlen;i++)
            for (j=0;j<=3;j++)
                newarr[i][j]=dat[i*4+j];
        return newarr;
    };

    describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n      +++++ check synthetic slicing\n',function() {    

        this.timeout(50000);
        // Create an image 0.47
        let dim = [ 4,3,2,2], slices=[ [ 0,3] ,[ 1,0],[0,1]];
        let index=0,i=0,j=0,k=0,l=0,id=0;
        this.timeout(5000);
        
        // First create image
        let buffer = new ArrayBuffer(dim[0]*dim[1]*dim[2]*dim[3]);
        let imagedata= new Uint8Array(buffer);
        let buffer2 = new ArrayBuffer(dim[0]*dim[1]*dim[2]*dim[3]);
        let imagedata2= new Uint8Array(buffer2);
        
        let out_index = [  0,0,0,0,0,0 ];
        let out_size  = [ dim[1]*dim[2], dim[0]*dim[2], dim[0]*dim[1]];
        let out_arr   = [ null,null  ,  null,null  ,  null,null ];
        
        for (let sl=0;sl<=5;sl++) {
            let sz=out_size[Math.floor(sl/2) ];
            //      console.log('creating temp output ',sl,' size=',sz);
            out_arr[sl]=util.zero(1,sz);
        }
        for (l=0;l<dim[3];l++) {
            for (k=0;k<dim[2];k++) {
                for(j=0;j<dim[1];j++) {
                    for (i=0;i<dim[0];i++) {
                        imagedata[index]=index;
                        imagedata2[index]=index*2;
                        if (k===slices[2][l]) {
                            id=l+4;
                            out_arr[id][out_index[id]]=index;
                            out_index[id]=out_index[id]+1;
                        }
                        if (j===slices[1][l]) {
                            id=2+l;
                            out_arr[id][out_index[id]]=index;
                            out_index[id]=out_index[id]+1;
                        }
                        if (i===slices[0][l]) {
                            id=l;
                            out_arr[id][out_index[id]]=index;
                            out_index[id]=out_index[id]+1;
                        }
                        ++index;
                    }
                }
            }
        }
        
        
        let test_image = {
            getImageData : function() {    return imagedata;},
            getDimensions : function(){   return dim;   },
        };

        let test_image2 = {
            getImageData : function() {    return imagedata2;},
            getDimensions : function(){   return dim;   },
        };


        let colormap1 = util.mapstepcolormapfactory(0,255,255);
        let colormap2 = util.mapstepcolormapfactory(0,510,255);
        
        let slicer_results = [  createarray(new BisImageSlicer(test_image2,{ plane: 0}).getslice(slices[0][0],0,colormap2)),
                                createarray(new BisImageSlicer(test_image, { plane: 0}).getslice(slices[0][1],1)),
                                createarray(new BisImageSlicer(test_image, { plane: 1}).getslice(slices[1][0],0,colormap1)),
                                createarray(new BisImageSlicer(test_image, { plane: 1}).getslice(slices[1][1],1)),
                                createarray(new BisImageSlicer(test_image2,{ plane: 2}).getslice(slices[2][0],0,colormap2)),
                                createarray(new BisImageSlicer(test_image, { plane: 2}).getslice(slices[2][1],1))];
        

        it('manual slices are correct ',function() {

            //console.log(printarray(imagedata,'wholeimage',false));
            let errors=util.zero(1,6);
            
            for (let j=0;j<=5;j++) {
                console.log('comparing, ',numeric.dim(out_arr[j]),' vs',numeric.dim(slicer_results[j]));
                errors[j]=numeric.norm2(numeric.sub(out_arr[j],slicer_results[j]));
                console.log('\n+++++ j=',j,' image slicer=',slicer_results[j]);
                console.log('+++++ manual=',out_arr[j]);
                console.log('+++++ error=',errors[j]);
            }
            assert.equal(0,numeric.norm2(errors));
        });

        let testcolor=function(plane,index,frame) {
            let grarray=createarray( new BisImageSlicer(test_image,{ plane: plane}).getslice(slices[plane][frame],0));
            let sliced=new BisImageSlicer(test_image,{ plane: plane, objectmap: true}).getslice(slices[plane][frame],0);
            let clarray=createarray( sliced,true);
            let cldim=numeric.dim(clarray);
            let newcol = util.zero(cldim[0],cldim[1]);
            for (let i=0;i<cldim[0];i++) {
                let v=util.getobjectmapcolor(grarray[i]);
                for (let j=0;j<=3;j++) {
                    newcol[i][j]=v[j];
                }
            }
            console.log('\n');
            for (i=0;i<cldim[0];i++) {
                console.log('----- color =', i,'\t val=',grarray[i],'\t slicer=',clarray[i],'\t\t manual=',newcol[i]);
            }
            
            return numeric.norm2(numeric.sub(clarray,newcol));
        };
        
        it('color test 2,1,0 here',function() {
            assert.equal(0,testcolor(2,1,0));
        });

        it('color test 1,0,1 here',function() {
            assert.equal(0,testcolor(1,0,1));
        });

    });

    describe('\n\n      +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n      ++++ check loading and slicing\n',
             function() {       // jshint ignore:line

                 this.timeout(50000);
                 
                 let images = [ new BisWebImage(),new BisWebImage(), new BisWebImage(),new BisWebImage(),new BisWebImage(), new BisWebImage(),new BisWebImage()];
                 
                 let imgnames = [ 'ras_avg152T1_LR_nifti.nii.gz',
                                  'ras152_slicek18.nii.gz',
                                  'ras152_slicej54.nii.gz',
                                  'ras152_slicei56.nii.gz' ];

                 
                 
                 let fullnames = [ '','','','',''];
                 let slicepairs = [ [1,2,18],[2,1,54], [ 3,0,56 ]];

                 
                 for (let i=0;i<=3;i++)
                     fullnames[i]=path.resolve(__dirname, 'testdata/'+imgnames[i]);
                 
                 before(function(done){
                     let p=[];
                     for (let i=0;i<=3;i++) {
                         p.push(images[i].load(fullnames[i]));
                     }
                     Promise.all(p).then( () => { done(); });
                 });
                 
                 let compimages=function(index,plane,slice,doslice) {

                     let colormap1 = util.mapstepcolormapfactory(0,255,255);
                     
                     let sl_00=createarray(new BisImageSlicer(images[0],{ plane: plane,objectmap: false}).getslice(slice,0,colormap1));
                     let sl_01;
                     console.log('\n\n-----------------------------------------------------------------------------------------------\n');
                     console.log('----- Slice compare index=',index,' slice=',slice,' plane=',plane, ' slicing second image=',doslice);
                     if (doslice) {
                         sl_01=createarray(new BisImageSlicer(images[index],{ plane: plane, objectmap : false}).getslice(0,0,colormap1));
                     } else {
                         sl_01=images[index].getImageData();
                     }
                     console.log('\n----- Image dimensions=',images[0].getDimensions(),',',images[index].getDimensions(),' indim=',images[index].getDimensions());
                     console.log('\n----- Matrix dimensions=',numeric.dim(sl_00),',',numeric.dim(sl_01));
                     let l=numeric.dim(sl_00);
                     for (let i=0;i<=3;i++) {
                         let index0=util.range(Math.floor(Math.random()*l),0,l-1);
                         console.log('+++++ index=',index0,'\t',sl_00[index0],sl_01[index0]);
                     }
                     let error0=numeric.norm2(numeric.sub(sl_00,sl_01));
                     console.log('----- error_norm=',error0);
                     return error0;
                 };
                 
                 it('check if slice '+slicepairs[0]+' is correct ',function() {
                     let error =compimages(slicepairs[0][0],slicepairs[0][1],slicepairs[0][2],false);
                     let error2=compimages(slicepairs[0][0],slicepairs[0][1],slicepairs[0][2],true);
                     if (error2>error)
                         error=error2;
                     assert.equal(0,error);
                 });
                 
                 it('check if slice '+slicepairs[1]+' is correct ',function() {
                     let error =compimages(slicepairs[1][0],slicepairs[1][1],slicepairs[1][2],false);
                     let error2=compimages(slicepairs[1][0],slicepairs[1][1],slicepairs[1][2],true);
                     if (error2>error)
                         error=error2;
                     assert.equal(0,error);
                     
                 });
                 it('check if slice '+slicepairs[2]+' is correct ',function() {
                     let error =compimages(slicepairs[2][0],slicepairs[2][1],slicepairs[2][2],false);
                     let error2=compimages(slicepairs[2][0],slicepairs[2][1],slicepairs[2][2],true);
                     if (error2>error)
                         error=error2;
                     assert.equal(0,error);
                 });




             });
    

});


