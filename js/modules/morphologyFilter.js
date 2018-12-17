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

const biswrap = require('libbiswasm_wrapper');
const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");
const BisWebImage = require('bisweb_image.js');
/**
 * Computes morphologic filtering (erode,dilate,median) on an image
 */
class MorphologyFilterModule extends BaseModule {
    constructor() {
        super();
        this.name = 'morphologyFilter';
        this.mouseobserver=true;
        this.lastInputDimensions=[0,0,0];
    }


    createDescription() {
        return {
            "name": "Morphology Filtering",
            "description": "Performs Binary Morphology Filtering on an Image",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": baseutils.getImageToImageInputs("The binary mask to be filtered","viewer1","overlay"),
            "outputs": baseutils.getImageToImageOutputs("The output mask","viewer1","overlay"),
            "buttonName": "Execute",
            "shortname" : "mrph",
            "params": [
                {
                    "name": "Operation",
                    "description": "Operation to perform (one of erode,dilate,median,erodedilate,dilateerode)",
                    "priority": 1,
                    "advanced": false,
                    "gui": "dropdown",
                    "default" : "median",
                    "type" : "string",
                    "fields" : ["dilate","erode","median", "connect", "dilateerode", "erodedilate" ],
                    "restrictAnswer" : ["dilate","erode","median", "connect", "dilateerode", "erodedilate" ],
                    "varname": "mode",
                },
                {
                    "name": "Radius",
                    "description": "This filter radius in voxels",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "low" : 1,
                    "high" : 3,
                    "default" : 1,
                    "step" : 1,
                    "varname": "radius",
                },
                {
                    "name": "Do 3D",
                    "description": "If true (default) do 3d filtering, else 2d",
                    "priority": 3,
                    "advanced": true,
                    "gui": "check",
                    "type": "boolean",
                    "varname": "do3d",
                    "default" : true,
                },
                {
                    "name": "Seed I (vx)",
                    "description": "I - seed",
                    "priority": 10,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "seedi",
                    "default": 50,
                    "type": 'int',
                    "low": 0,
                    "high": 100,
                    "step" : 1,
                },
                {
                    "name": "Seed J (vx)",
                    "description": "J - seed",
                    "priority": 11,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "seedj",
                    "default": 50,
                    "type": 'int',
                    "low": 0,
                    "high": 100,
                    "step" : 1,
                },
                {
                    "name": "Seed K (vx)",
                    "description": "K - seed",
                    "priority": 12,
                    "advanced": true,
                    "gui": "slider",
                    "varname": "seedk",
                    "default": 50,
                    "type": 'int',
                    "low": 0,
                    "high": 100,
                    "step" : 1,
                },

                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: morphologyFilter with vals', JSON.stringify(vals));
        let input = this.inputs['input'];
        
        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {

                let mode=vals.mode;
                let md=[ mode ];
                if (mode==="dilateerode") 
                    md=[ "dilate", "erode" ];
                else if (mode=="erodedilate")
                    md=[ "erode", "dilate" ];

                let tmp=input;

                if (input.getImageType()!=="uchar") {
                    console.log('oooo thresholding and casting to uchar as input type is not uchar');
                    tmp=new BisWebImage();
                    tmp.cloneImage(input,{ type : 'uchar'});
                    let odata=tmp.getImageData();
                    let idata=input.getImageData();
                    for (let i=0;i<idata.length;i++) {
                        if (idata[i]>0)
                            odata[i]=1;
                        else
                            odata[i]=0;
                    }
                }
                
                for (let pass=0;pass<md.length;pass++) {

                    if (md[pass]!=="connect") {
                        this.outputs['output'] = biswrap.morphologyOperationWASM(tmp, {
                            "operation" : md[pass],
                            "radius" : parseInt(vals.radius),
                            "do3d" : this.parseBoolean(vals.do3d)
                        },this.parseBoolean(vals.debug));
                        tmp=this.outputs['output'];
                    } else {
                        this.outputs['output'] = biswrap.seedConnectivityWASM(tmp, {
                            "seedi" : parseInt(vals.seedi),
                            "seedj" : parseInt(vals.seedj),
                            "seedk" : parseInt(vals.seedk),
                            "oneconnected" : true,
                        },this.parseBoolean(vals.debug));
                    }
                }
                resolve();
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

    updateOnChangedInput(inputs,guiVars) {

        let newDes = this.getDescription();
        inputs = inputs || this.inputs;
        let img=inputs['input'] || null;
        if (img===null)
            return newDes;

        let dim = img.getDimensions();
        if (this.compareArrays(dim,this.lastInputDimensions,0,2)<1) {
            return;
        }
        this.lastInputDimensions=dim;


        let names = [ 'seedi','seedj', 'seedk' ];
        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            let index=names.indexOf(name);
            if (index>=0) {
                newDes.params[i].low = 0;
                newDes.params[i].high = dim[index]-1;
                newDes.params[i].default=Math.round( (dim[index]-1)/2);
            }
            if (guiVars)
                guiVars[name]=newDes.params[i].default;

        }
        this.recreateGUI=true;
        return newDes;
    }

    //TODO: In Paint Tool, range of seeds does not change on new image
    //TODO: Cross Hairs do not update automatically outside paint tool
    
    setViewerCoordinates(controllers,guivars,coords=null) {

        if (coords===null)
            return;

        if (!guivars) {
            return;
        }
        
        let newDes = this.getDescription();
        let names = [ 'seedi','seedj', 'seedk' ];
        for (let i = 0; i < newDes.params.length; i++) {
            let name = newDes.params[i].varname;
            let index=names.indexOf(name);
            if (index>=0) {
                try {
                    guivars[name]=coords[index];
                    this.updateSingleGUIElement(newDes.params[i],controllers[name],guivars,name);
                } catch(e) {
                    console.log(e.stack);
                }
            }
        }
    }
}

module.exports = MorphologyFilterModule;
