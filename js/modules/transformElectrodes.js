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
const BisWebTransformCollection = require('bisweb_transformationcollection');
const BisWebElectrodeMultiGrid = require('bisweb_electrodemultigrid');


class TransformElectrodesModule extends BaseModule {
    constructor() {
        super();
        this.name = 'transformElectrodes';
    }

    createDescription() {

        return {
            "name": "Transform Electrode Grids",
            "description": "Transform electrode grids",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "shortname" : "map",
            "slicer" : true,
            "buttonName": "Transform",
            "inputs":   [
                {
                    'type': 'electrodemultigrid',
                    'name': 'Grid to Map',
                    'description': 'Input Electrode Grid',
                    'varname': 'input',
                    'shortname' : 'i',
                    'required' : true,
                },
                {
                    'name' : 'Reference Image',
                    'description' : 'Load the patient preop MRI image',
                    'type': 'image',
                    'varname' : 'reference',
                    'shortname' : 'r',
                    'required' : true,
                    'guiviewertype' : 'image',
                    'guiviewer'  : 'viewer1',
                },
                {
                    'type': 'transformation',
                    'name': 'Reslice Transform',
                    'description': 'Load the transformation used to map the electrodes',
                    'varname': 'xform',
                    'shortname' : 'x',
                    'required' : true,
                    'guiviewer' : 'current',
                },
                {
                    'type': 'transform',
                    'name': 'Transformation 2',
                    'description': 'The second transformation to combine with first',
                    'varname': 'xform2',
                    'required' : false,
                    'shortname' : 'y'
                },
                {
                    'type': 'transform',
                    'name': 'Transformation 3',
                    'description': 'The third transformation to combine with first and second',
                    'varname': 'xform3',
                    'required' : false,
                    'shortname' : 'z'
                }
            ],
            "outputs":[
                {
                    'type': 'electrodemultigrid',
                    'name': 'Output Grid',
                    'description': 'Save the mapped grid',
                    'varname': 'output',
                    'shortname' : 'o',
                    'required': false,
                    'extension' : '.mgrid',
                }
            ],
            params: [
                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: transformElectrodes with vals', JSON.stringify(vals));
        let xform = this.inputs['xform'] || null;
        let input = this.inputs['input'];
        let reference = this.inputs['reference'] || null ;

        if (xform === null || input===null) {
            return Promise.reject('Either no image or no transformation specified');
        }

        
        // Copy first
        this.outputs['output']=new BisWebElectrodeMultiGrid();
        this.outputs['output'].parseFromDictionary(input.serializeToDictionary());
        
        let xform2=this.inputs['xform2'] || null;
        let xform3=this.inputs['xform3'] || null;
        
        if (xform2 || xform3) {
            let coll=new BisWebTransformCollection();
            coll.addTransformation(xform);
            if (xform2)
                coll.addTransformation(xform2);
            if (xform3)
                coll.addTransformation(xform3);
            xform=coll;
        }

        let widthmm=0.0,heightmm=0.0;

        let orient=reference.getOrientationName();

        let flipx=false,flipy=false;
        
        if (orient==='RAS') {
            flipx=true
            flipy=true;
        } else if (orient==='LAS') {
            flipx=false;
            flipy=true;
        }
            
        let spa=reference.getSpacing();
        let dim=reference.getDimensions();
        widthmm=spa[0]*(dim[0]-1);
        heightmm=spa[1]*(dim[1]-1);
        console.log('Reference Orientation = ',orient,' flipping x=',flipx,'flipping y=',flipy);
        this.outputs['output'].transformElectrodes(xform,flipx,flipy,widthmm,heightmm);
        return Promise.resolve();
    }
}

module.exports = TransformElectrodesModule;
