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
const baseutils=require("baseutils");
const BaseModule = require('basemodule.js');
const BisWebTransformCollection = require('bisweb_transformationcollection');
/**
 * Calculates the displacement field resulting from applying a transformation to an input displacement field.
 */

class DisplacementFieldModule extends BaseModule {
    constructor() {
        super();
        this.name = 'displacementField';
    }

    createDescription() {
        let des= {
            "name": "Displacement Field",
            "description": "Calculates the displacement field for a given transformation for the volume specified by the given image.",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "outputs":  baseutils.getImageToImageOutputs("Output displacement field image"),
            "inputs":  baseutils.getImageToImageInputs("Image that defines the output size"),
            "buttonName": "Calculate",
            "shortname" : "dsp",
            "params": [
                baseutils.getDebugParam()
            ]
        };

        des.inputs.push({
            'type': 'transform',
            'name': 'Transformation 1',
            'description': 'Load the transformation to compute the displacement field for',
            'varname': 'xform',
            'required' : true,
            'shortname' : 'x'
        },{
            'type': 'transform',
            'name': 'Transformation 2',
            'description': 'The second transformation to combine with first',
            'varname': 'xform2',
            'required' : false,
            'shortname' : 'y'
        },{
            'type': 'transform',
            'name': 'Transformation 3',
            'description': 'The third transformation to combine with first and second',
            'varname': 'xform3',
            'required' : false,
            'shortname' : 'z'
        });
        
        return des;
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: displacementField', JSON.stringify(vals));
        
        return new Promise((resolve, reject) => {
            biswrap.initialize().then(() => {

                let image = this.inputs['input'] || null;
                let dimension = image.getDimensions();
                let spacing = image.getSpacing();

                let xform=this.inputs['xform'] || null;
                let xform2=this.inputs['xform2'] || null;
                let xform3=this.inputs['xform3'] || null;

                if (xform === null || image===null) {
                    reject('Either no image or no transformation specified');
                }
                
                if (xform2 || xform3) {
                    let coll=new BisWebTransformCollection();
                    coll.addTransformation(xform);
                    if (xform2)
                        coll.addTransformation(xform2);
                    if (xform3)
                        coll.addTransformation(xform3);
                    xform=coll;
                }
                

                this.outputs['output'] = biswrap.computeDisplacementFieldWASM(xform, {
                    "dimensions" : [ dimension[0], dimension[1], dimension[2] ],
                    "spacing" : [ spacing[0], spacing[1], spacing[2] ]
                }, super.parseBoolean(vals.debug));

                resolve(); 
            }).catch( (e) => {
                reject(e.stack);
            });
        });
    }

}

module.exports = DisplacementFieldModule;
