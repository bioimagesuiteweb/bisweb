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
const largeImageUtil=require('largeImageUtil');
/**
 * Concatenates images
 */
class ConcatenateImageModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'concatenateImages';
    }


    createDescription() {
        return {
            "name": "Concatenate Images",
            "description": "Concatenates Multiple Images to a single 4D Image",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs" : [],
            "outputs" : [],
            "buttonName": "Execute",
            "shortname" : "concat",
            "params" : [
                {
                    "name": "output",
                    "description": "This is the output concatenated series filename",
                    "priority": 0,
                    "advanced": false,
                    "varname": "output",
                    "shortname" : "o",
                    "type": 'string',
                    "default": '',
                },
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

    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: combineImages with vals', JSON.stringify(vals));

        let debug=super.parseBoolean(vals['debug']);
        
        let inputlist=vals.extraArgs;
        if (inputlist.length<2) {
            return Promise.reject('Need at least two input images');
        }

        this.outputname=vals['output'];
        if (this.outputname.length<2) {
            return Promise.reject('Need at least two input images');
        }
        
        let imagelist=[];
        for (let i=0;i<inputlist.length;i++) {
            let img=new BisWebImage();
            console.log('___ Reading', inputlist[i]);
            await img.loadHeaderOnly(inputlist[i],debug);
            imagelist.push(img);
            console.log('___ \t\t Read ',img.getDescription());
        }
        console.log('___ A total of ',imagelist.length,' images has been loaded.');
                
        this.numframes=0;
        let first = imagelist[0];
        let dim=first.getDimensions();
        this.numframes+=dim[3]*dim[4];
        this.imageframes= [ dim[3]*dim[4] ];
        this.frameoffsets=[ 0 ];

        for (let j=1;j<imagelist.length;j++) {
            let second = imagelist[j];
            let dim2=second.getDimensions();
            this.numframes+=dim2[3]*dim2[4];
            this.imageframes.push(dim2[3]*dim2[4]);
            this.frameoffsets.push(this.imageframes[j]+this.frameoffsets[j-1]);

            if (!first.hasSameSizeAndOrientation(second,0.01,true) ||
                first.getOrientationName()!==second.getOrientationName() || 
                first.getImageType()!==second.getImageType()) {
                return Promise.reject(": Images have different sizes or types or orientations\n\t "+first.getDescription()+'\n\t '+second.getDescription());
            }
        }

        console.log('___ Total num frames=',this.numframes, 'offsets=',this.frameoffsets,' frames=',this.imageframes);
        console.log('_____________________________');
        console.log('___                       ___');
        console.log('___  Concatenating Images ___');
        console.log('_____________________________');
        for (let i=0;i<imagelist.length;i++) {
            this.currentpiece=i;
            console.log('_____\n_____ parsing ',inputlist[i],' frameoffset=',this.frameoffsets[i]);
            let done=await largeImageUtil.readAndProcessLargeImage(inputlist[i],this,this.numframes,this.frameoffsets[i]);
        }
    }

    async processFrame(frame,frameImage) {

        let debug=false;
        if (frame %50===0)
            debug=true;
        
        if (debug)
            console.log('_____ Concatenating In Frame',frame+1);

        if (frame===0) {
            this.fileHandleObject={
                'fd' : null,
                'filename' : ''
            };
        }
        
        let done=await largeImageUtil.writeOutput(frame,this.numframes,this.outputname,frameImage,this.fileHandleObject,debug,this.frameoffsets[this.currentpiece]+this.imageframes[this.currentpiece]);
        return done;
    }
}


module.exports = ConcatenateImageModule;
