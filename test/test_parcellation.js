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
/*global describe, it,before */
"use strict";

require('../config/bisweb_pathconfig.js');
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');
const assert = require("assert");
const fs = require("fs");
const BisParcellation=require('bis_parcellation');
const numeric=require('numeric');
const BisWebMatrix=require('bisweb_matrix');
const BisWebImage=require('bisweb_image');
const path=require('path');

describe('Testing parcellation (bis_parcellation.js) class that describes parcellations\n', function(){

    this.timeout(50000);
    let pname =  path.resolve(__dirname, '../web/images/xilin_150.txt' );
    let pnamejson =  path.resolve(__dirname , '../web/images/shen.json' );

    let brodjson =  path.resolve(__dirname,'../test/testdata/brod.json' );
    let alljson =  path.resolve(__dirname,'../test/testdata/AAL.json' );
    let nodejson =  path.resolve(__dirname,'../test/testdata/nodes.json' );

    let parcnames = [ pnamejson,brodjson,alljson ];
    
    let imagenames = [ path.resolve(__dirname,"../web/images/gray_highres_groupncut150_right5_left1_emily_reord_new.nii.gz"),
                       path.resolve(__dirname,"../web/images/yale_broadmann_ras.nii.gz"),
                       path.resolve(__dirname,"../web/images/AAL_1mm_ras.nii.gz"),
                       path.resolve(__dirname,"../web/images/Reorder_Atlas.nii.gz") ];
    let lobenames = [ path.resolve(__dirname,'../test/testdata/shen_lobes.csv' ),
                      path.resolve(__dirname,'../test/testdata/brod_lobes.csv' ),
                      path.resolve(__dirname,'../test/testdata/AAL_lobes.csv' )];
    let images = [ new BisWebImage(),new BisWebImage(),new BisWebImage() ,new BisWebImage()];

    let nodename =  path.resolve(__dirname , '../test/testdata/nodes.txt' );
    


    describe('\n\n+++++ Parcellation Test Load .json vs load .text',function() {

        let diff1=[1000,1000];
        before(function(done) {
            let plines = fs.readFileSync(pname,'utf-8');
            let parc=new BisParcellation();
            parc.loadrois(plines,pname,console.log);
            let mat1=parc.creatematrix();

            let text=parc.serialize();
            let parc0=new BisParcellation();
            parc0.loadrois(text,'internal.json',console.log);
            let mat0=parc0.creatematrix();

            console.log(mat1[0],mat0[0]);
            
            let plines2 = fs.readFileSync(pnamejson,'utf-8');
            let parc2=new BisParcellation();
            parc2.loadrois(plines2,pnamejson,console.log);
            let mat2=parc2.creatematrix();

            console.log(mat1[0]);
            console.log(mat2[0]);
            console.log(mat0[0]);
            diff1[0]=numeric.norminf(numeric.sub(mat1,mat2));
            diff1[1]=numeric.norminf(numeric.sub(mat1,mat0));
            done();
        });

        
        it ('(should pass) difference',function() {
            console.log('+++ Matrix comparison error='+diff1);
            assert.equal(true,(diff1[0]<0.1 && diff1[1]<0.1));
        });

        it ('(checking line pair stuff',function() {


        });
    });

    describe('\n\n++++++ Parcellation creation from image/textfile vs original' , function() {    // jshint ignore:lineb
        before(function(done){
            let p=[];
            for (let i=0;i<images.length;i++) {
                p.push(images[i].load(imagenames[i]));
            }
            Promise.all(p).then( () => { done(); });
        });
        
        it('(shold pass) loaded images ',function() {
            let dim=[ images[0].getDimensions(), images[1].getDimensions(), images[2].getDimensions(),images[3].getDimensions() ];
            let truedim = [ [ 181,217,181,1 ],[ 181,217,181,1 ],[ 181,217,181,1 ],[ 181,217,181,5 ]];
            let diff2=numeric.norminf(numeric.sub(dim,truedim));
            console.log('\t\t Compared dimensions loaded='+dim+' vs true=' + truedim+' diff='+diff2);
            assert.equal(true,(diff2<1));
        });

        it ('(should pass) compare both shen at al and brodmann json file to original',function(done) {


            let materror = [ 1000.0,1000.0,1000.0];
            let lobeerror = [ 1000.0,1000.0,1000.0];

            
            let computeerror=function(j,lobe1matrix,fname)  {
                console.log('\n\n+++++Comparing created parcellation pass ='+(j+1)+' /3');
                console.log('+++++ \t Matrix Read from',fname);
                let plines = fs.readFileSync(parcnames[j],'utf-8');
                let parc=new BisParcellation();
                parc.loadrois(plines,parcnames[j],console.log);
                let mat1=parc.creatematrix();
                
                let outtext=new BisParcellation().createParcellationFromImage(images[j],images[3],'internal created from '+imagenames[j]);
                let parc2=new BisParcellation();
                parc2.loadrois(outtext,'internal_file.json',console.log);
                let mat2=parc2.creatematrix();
                console.log('Dimensions=',numeric.dim(mat1),numeric.dim(mat2));

                materror[j]=numeric.norminf(numeric.sub(mat1,mat2));
                let nd1=numeric.dim(mat1);
                let nd2=numeric.dim(mat2);
                if (nd1[1]!==nd2[1]) {
                    for (let i=0;i<nd1[0];i++)
                        console.log("____",mat2[i]);
                }

                
                console.log('\nMateerror=',materror[j]);
                for (let i=0;i<mat2.length;i++) {
                    let err=numeric.norminf(numeric.sub(mat1[i],mat2[i]));
                    if (err>0.06)
                        console.log('\t\t\t Non identical row '+i+' diff='+err+' (  '+mat1[i] + ' vs '+ mat2[i]+')');
                }
                
                let lobe2matrix=parc2.lobeStats;
                console.log('lobe1='+lobe1matrix,'dim=',numeric.dim(lobe1matrix));
                console.log('lobe2='+lobe2matrix,'dim=',numeric.dim(lobe2matrix));

                lobeerror[j]=numeric.norminf(numeric.sub(lobe1matrix,lobe2matrix));
                console.log('LobeError=',lobeerror[j]);
            };

            let j=-1;
            
            let donext=function() {

                if (j===2) {
                    let total=numeric.norminf(materror)+numeric.norminf(lobeerror);
                    console.log('\t\t compared difference in create v loaded='+materror+' for lobes='+lobeerror);
                    assert.equal(true,(total<0.5));
                    done();
                } else {
                    j=j+1;
                    console.log('\n-----------------------\n','Working on j=',j,lobenames[j]);
                    BisWebMatrix.loadNumericMatrix(lobenames[j]).then( (obj)=> {
                        computeerror(j,obj.data,lobenames[j]);
                        donext();
                    }).catch( (e) => { console.log(e);});
                }
            };

            donext();

        });
        
        it ('(should pass) regression of creating from node definitions',function() {

            let materror =   0.0;
            let plines = fs.readFileSync(nodejson,'utf-8');
            let parc=new BisParcellation();
            parc.loadrois(plines,nodejson,console.log);
            let mat1=parc.creatematrix();
            
            let newtext = fs.readFileSync(nodename,'utf-8');
            console.log('\n\n\n Image DImensions='+images[3].getDimensions());
            let outtext=new BisParcellation().createParcellationFromText(newtext,nodename,images[3],'internal created from '+nodename);
            
            let parc2=new BisParcellation();
            parc2.loadrois(outtext,'internal_file.json',console.log);
            let mat2=parc2.creatematrix();

            materror=0.0;

            for (let ia=0;ia<mat1.length;ia++) {

                let diff=0;
                for (let ja=0;ja<=2;ja++) 
                    diff+=Math.abs(mat1[ia][ja]-mat2[ia][ja]);
                let e_pos=Math.abs(mat1[ia][3]-mat2[ia][3]);
                
                if (e_pos>0.01) {
                    console.log('\t\t\t Non identical row '+ia+' diff='+e_pos+' (  '+mat1[ia] + ' vs '+ mat2[ia]+') ('+diff+')');
                    materror+=1;
                }
            }
            console.log('\t\t compared difference in import from node defs v loaded='+materror);
            assert.equal(true,(materror===0));
        });
        
        it ('(should pass) compare shen at al to one create from node definitions',function() {
            
            let materror =   0.0;
            let plines = fs.readFileSync(pnamejson,'utf-8');
            let parc=new BisParcellation();
            parc.loadrois(plines,pnamejson,console.log);
            let mat1=parc.creatematrix();
            
            let newtext = fs.readFileSync(nodename,'utf-8');
            console.log('\n\n\n Image DImensions='+images[3].getDimensions());
            let outtext=new BisParcellation().createParcellationFromText(newtext,nodename,images[3],'internal created from '+nodename);
            
            let parc2=new BisParcellation();
            parc2.loadrois(outtext,'internal_file.json',console.log);
            let mat2=parc2.creatematrix();

            materror=0.0;

            for (let ia=0;ia<mat1.length;ia++) {

                let diff=0;
                for (let ja=0;ja<=2;ja++) 
                    diff+=Math.abs(mat1[ia][ja]-mat2[ia][ja]);
                let e_pos=Math.abs(mat1[ia][3]-mat2[ia][3]);

                if (e_pos>0.01) {
                    console.log('\t\t\t Non identical row '+ia+' diff='+e_pos+' (  '+mat1[ia] + ' vs '+ mat2[ia]+') ('+diff+')');
                    materror+=1;
                }
            }
            console.log('\t\t compared difference in import from node defs v loaded='+materror+' different rows as expected (as we do not have the full roi just the centroid!)');
            assert.equal(true,(materror===22));
        });
    });

    
});

