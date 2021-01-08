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

const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");
const BisWebImage = require('bisweb_image.js');
/**
 * Stacks images
 */
class StackImageModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'stackImages';
    }


    createDescription() {
        return {
            "name": "Stack Images",
            "description": "Stacks Multiple 3D Images along z-axis",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs" : [],
            "outputs": baseutils.getImageToImageOutputs("The stackd image"),
            "buttonName": "Execute",
            "shortname" : "stack",
            "params" : [
                baseutils.getDebugParam()
            ]
        };
    }

    getExtraArgument() {
        return {
            "name": "inputs",
            "description": "List of input images",
            "type": "extra",
            "default": [],
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: combineImages with vals', JSON.stringify(vals));

        let inputlist=vals.extraArgs;
        if (inputlist.length<2) {
            return Promise.reject('Need at least two input images');
        }
        
        
        return new Promise( (resolve,reject) => {
            
            let imagelist=[],promiselist=[];
            for (let i=0;i<inputlist.length;i++) {
                let img=new BisWebImage();
                imagelist.push(img);
                promiselist.push(img.load(inputlist[i]));
            }
            
            Promise.all(promiselist).then( (obj) => {
                console.log('++++ A total of ',obj.length,' images has been loaded.');
                
                let first = imagelist[0];
                let dim=first.getDimensions();
                let numframes=dim[3]*dim[4];
                let numslices=dim[2];
                
                for (let j=1;j<imagelist.length;j++) {
                    let second = imagelist[j];
                    let dim2=second.getDimensions();
                    let numframes2=dim2[3]*dim2[4];
                    numslices=numslices+dim2[2];


                    
                    if (!(dim[0]===dim2[0] && dim[1]===dim[1] && numframes===numframes2) ||
                        first.getOrientationName()!==second.getOrientationName()  ||
                        first.getImageType()!==second.getImageType()) {
                        reject(": Images have different sizes or types or orientations\n\t "+first.getDescription()+'\n\t '+second.getDescription());
                        return;
                    }
                }
                let output=new BisWebImage();
                output.cloneImage(first, { "dimensions" : [ dim[0],dim[1],numslices], "numframes" : numframes, "numcomponents" : 1 });
                let odata=output.getImageData();
                let lastpos=0;
                for (let i=0;i<imagelist.length;i++) {
                    let fdata=imagelist[i].getImageData();
                    odata.set(fdata,lastpos);
                    lastpos+=fdata.length;
                }
                this.outputs['output']=output;
                console.log('++++ Stackd image '+this.outputs['output'].getDescription());
                resolve("Stackd");
            }).catch( (e) => { reject(e); });
        });
    }
                                         
}

module.exports = StackImageModule;
