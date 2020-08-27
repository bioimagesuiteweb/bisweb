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
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');
const assert = require("assert");
const genericio=require('bis_genericio');
const BisWebImage=require('bisweb_image');
const BisWebMatrix=require('bisweb_matrix');
const BisWebLinearTransformation=require('bisweb_lineartransformation');
const path=require('path');
const numeric=require('numeric');
const libbiswasm=require('libbiswasm_wrapper');

numeric.precision=3;


const transform_points=function(source_pts , matrix) {

    console.log('__ Points=',source_pts.getDescription(),'\n\t 4x4 matrix=',matrix.getDescription());
    
    let mat=matrix.getMatrix();
    let arr=source_pts.getDataArray();
    let np=arr.length/3;

    let dim=source_pts.getDimensions();
    let output=new BisWebMatrix();
    output.zero(dim[0],dim[1]);
    let out=output.getDataArray();

    let sumr=[ 0,0,0];
    let sumt=[0,0,0];
    
    for (let i=0;i<np;i++) {
        let pt= [ arr[i*3], arr[i*3+1], arr[i*3+2],1 ];
        for (let row=0;row<=2;row++) {
            for (let col=0;col<=3;col++) {
                out[i*3+row] += mat[row][col] * pt[col];
            }
        }

        if (i == 1200 === 0 ) {
            console.log('Input  Point ',i,'=', pt[0], pt[1],pt[2]);
            console.log('Output Point ',i,'=', out[3*i], out[3*i+1],out[3*i+2]);
        }

        for (let ia=0;ia<=2;ia++) {
            sumr[ia]+=pt[ia];
            sumt[ia]+=out[3*i+ia];
        }
    }

    for (let ia=0;ia<=2;ia++) {
        sumr[ia]=sumr[ia]/np;
        sumt[ia]=sumt[ia]/np;
    }

    console.log('Centroids=',sumr,sumt);
    return output;
    
};


const print_matrices=function(matrices,threshold,names=['','' ]) {

    for (let i=0;i<matrices.length;i++) {
        console.log('_________________________ Matrix= ',names[i]);
        let output='';
        for (let row=0;row<=3;row++) {
            output=output+'[ ';
            for (let col=0;col<=3;col++) {
                
                let v=matrices[i][row][col];
                v=0.001*Math.round(v*1000.0);
                if (Math.abs(v)<threshold)
                    v=0.0;
                output=`${output} ${v} `;
            }
            output=output+']\n';
        }
        console.log(output);
    }

};

describe('Testing landmark transformation creation\n', function() {

    this.timeout(50000);    
    let image = new BisWebImage();
    let imagename=path.resolve(__dirname, 'testdata/avg152T1_LR_nifti.nii.gz');
    let surfacename=path.resolve(__dirname, 'testdata/pointlocator/brain.json');
    let source_pts=new BisWebMatrix();
    
    before( async function() {

        await libbiswasm.initialize();
        await image.load(imagename);
        let obj=await genericio.read(surfacename);
        let points=JSON.parse(obj.data)['points'];
        let nt=points.length;
        let np=Math.round(nt/3);
        console.log('Number of points=',np,np*3,nt, np*3-nt);

        source_pts.zero(np,3);
        let arr=source_pts.getDataArray();
        for (let i=0;i<nt;i++)
            arr[i]=points[i];
        
        return Promise.resolve('done');
    });

    

    it('wasm test Landmark Transform 1',function() {
        
        const pvectors=[ new Float32Array([10.0,0,0,
                                          0,0,20,
                                          1.0,1.0,1.0,
                                          0.0,0.0,0.0]) ,
                        new Float32Array([10.0,0,0,
                                          0,0,20,
                                          1.1,1.1,1.1,
                                          0.0,0.0,0.0]) ,
                        new Float32Array([10.0,0,0,
                                          0,0,20,
                                          1.0,1.1,1.0,
                                          0.0,0.0,0.2]) ];
        
        
        const dim = image.getDimensions(),spa=image.getSpacing();
        console.log('Images = ',dim,spa);

        let maxd=[0,0,0];
        
        for (let mode=0;mode<=2;mode++) {

            let md=mode;
            if (md==2)
                md=3;
            
            console.log('__________________________________________________________');
            console.log('____ Beginning mode=',md);
        
            const tr_js=new BisWebLinearTransformation(3);
            tr_js.setShifts(dim,spa,dim,spa);
            let opts = { rigidOnly : true };
            if (mode >0 ) {
                opts = { rigidOnly : false };
            }
            tr_js.setParameterVector(pvectors[mode],opts);
            console.log('___ pass ',md);
            print_matrices([ tr_js.getMatrix() ],1e-4, [ `original_${md}` ]);
            
            const targ_pts=transform_points(source_pts,tr_js);
            let output_js=libbiswasm.computeLandmarkTransformWASM(source_pts,targ_pts,{ 'mode' : mode },1);


            maxd[mode]=0.0;
            for (let i=0;i<=3;i++) {
                for (let j=0;j<=3;j++) {
                    let v=Math.abs(output_js.getMatrix()[i][j]-tr_js.getMatrix()[i][j]);
                    if (maxd[mode]<v)
                        maxd[mode]=v;
                }
            }
            
            const matrices= [  tr_js.getMatrix(), output_js.getMatrix() ];
            print_matrices(matrices,1e-4, [ 'original','estimated' ]);
            console.log('___ Maximum difference = ',maxd[mode]);
        }

        console.log('Maxd=',maxd);
        let maxv=0.0;
        for (let i=0;i<maxd.length;i++) {
            if (maxv < maxd[i])
                maxv=maxd[i];
        }

        console.log('Max=',maxv);
        
        
        assert.equal(true,(maxv<0.001));
        
    });
 

});
