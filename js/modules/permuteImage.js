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
const BaseModule = require('basemodule');
const BisWebImage = require('bisweb_image');
/**
 * Extracts a single slice along a major plane (Sagittal, Coronal, Axial) from a time series image that potentially 
 * contains many components. 
 */
class permuteImageModule extends BaseModule {
    constructor() {
        super();
        this.name = 'permuteImage';
    }

    createDescription() {
        return {
            "name": "Extract Slice",
            "description": "This element will permute an image by swapping and flipping axes.",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs(),
            "outputs": baseutils.getImageToImageOutputs(),
            "buttonName": "Permute",
            "shortname" : "prm",
            "slicer" : true,
            params : [
                {
                    "name": "New I",
                    "description": "New I-Axis -- set i-axis to be the old axis specified (mI=-I)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "varname": 'newi',
                    "type": 'string',
                    "default" : "I",
                    "fields" : [ "I","mI","J","mJ","K","mK" ],
                    "restrictAnswer" : [ "I","mI","J","mJ","K","mK" ]
                },
                {
                    "name": "New J",
                    "description": "New J-Axis -- set j-axis to be the old axis specified (mI=-I)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "varname": 'newj',
                    "type": 'string',
                    "default" : "J",
                    "fields" : [ "I","mI","J","mJ","K","mK" ],
                    "restrictAnswer" : [ "I","mI","J","mJ","K","mK" ]
                },
                {
                    "name": "New K",
                    "description": "New K-Axis -- set k-axis to be the old axis specified (mI=-I)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "varname": 'newk',
                    "type": 'string',
                    "default" : "K",
                    "fields" : [ "I","mI","J","mJ","K","mK","T","mT" ],
                    "restrictAnswer" : [ "I","mI","J","mJ","K","mK","T","mT" ]
                },
                {
                    "name": "New T",
                    "description": "New T-Axis -- set t-axis to be the old axis specified (mK=-K)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "varname": 'newt',
                    "type": 'string',
                    "default" : "T",
                    "fields" : [ "T","mT","K","mK" ],
                    "restrictAnswer" : [ "T","mT","K","mK" ]
                },
                baseutils.getDebugParam()
            ],

        };
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: permuteImage with vals', JSON.stringify(vals));

        let input = this.inputs['input'] || null;

        if (input===null)
            return Promise.reject('No Input Image');
        const dim=input.getDimensions();
        const spa=input.getSpacing();
        dim[3]=(dim[3]|| 1)*(dim[4] || 1);
        const flipdim = [ dim[0]-1,dim[1]-1,dim[2]-1, dim[3]-1 ];
        let newdim = [0,0,0,0,0];
        let newspa = [1.0,1.0,1.0,1.0,1.0];
        const values= [ vals['newi'],vals['newj'], vals['newk'],vals['newt'] ];
        const letters = [ 'I','J','K','T' ];
        const axis    = [ -1,-1,-1,-1 ];
        const flip    = [ 0,0,0,0 ];

        
        for (let index=0;index<=3;index++) {

            let ia=0,found=false;
            while (found===false && ia<letters.length) {
                if (values[index].indexOf(letters[ia])>=0) {
                    found=true;
                    newdim[index]=dim[ia];
                    newspa[index]=spa[ia];

                    flipdim[ia]=dim[ia]-1;
                    axis[ia]=index;

                    if (values[index].indexOf('m')>=0)
                        flip[ia]=1;
                    else
                        flip[ia]=0;
                }
                ia=ia+1;
            }
            if (found===false)
                return Promise.reject('Bad settings '+values.join(','));
        }

        for (let index=0;index<=3;index++) {
            if (axis[index]===-1) {
                return Promise.reject('Bad settings '+values.join(','));
            }
        }

        console.log('.... Beginning permute all valid');
        console.log('.... values=',values.join('  '));
        console.log('.... axis=',axis.join(','));
        console.log('.... flip=',flip.join(','));
        console.log('.... dimensions=',dim.join(','),'--->',newdim.join(','));
        console.log('.... spacing=',spa.join(','),'--->',newspa.join(','));
                   
        
        let ia= [ 0,0,0 ],ib=[ 0,0,0 ];
        const incr = [ 1,dim[0],dim[0]*dim[1],dim[0]*dim[1]*dim[2] ];

        let outimage=new BisWebImage();
        outimage.cloneImage(input, {
            'dimensions' : [ newdim[0],newdim[1],newdim[2] ],
            'spacing' : newspa,
            'numframes' : newdim[3],
        });

        let outarray=outimage.getImageData();
        let inarray =input.getImageData();
        
        // Axis == output axes
        // newi --> k
        // newj --> i
        // newk --> j
       
        
        let outindex=0;
        for (ib[3]=0;ib[3]<newdim[3];ib[3]++) {
            for (ib[2]=0;ib[2]<newdim[2];ib[2]++) {
                for (ib[1]=0;ib[1]<newdim[1];ib[1]++) {
                    for (ib[0]=0;ib[0]<newdim[0];ib[0]++) {
                        let index=0;

                        for (let oldc=0;oldc<=3;oldc++) {
                            if (flip[oldc])
                                ia[oldc]=flipdim[oldc]-ib[axis[oldc]];
                            else
                                ia[oldc]=ib[axis[oldc]];
                            index+=ia[oldc]*incr[oldc];
                        }
                        //if (outindex % 1500000 ===0) 
                        //console.log('ib=',ib,' <---',ia,index,outindex);
                        
                        outarray[outindex]=inarray[index];
                        ++outindex;
                    }
                }
            }
        }

        this.outputs['output']=outimage;
        return Promise.resolve('Done');
    }



}

module.exports = permuteImageModule;
