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
const BisWebSurface = require('bisweb_surface');


class TransformSurfaceModule extends BaseModule {
    constructor() {
        super();
        this.name = 'transformSurface';
    }

    createDescription() {

        return {
            "name": "Transform Surface",
            "description": "Transform surface",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "shortname" : "map",
            "slicer" : true,
            "buttonName": "Transform",
            "inputs":   [
                {
                    'type': 'surface',
                    'name': 'Surface  Map',
                    'description': 'Input Surface',
                    'varname': 'input',
                    'shortname' : 'i',
                    'required' : true,
                },
                {
                    'type': 'transformation',
                    'name': 'Mapping Transform',
                    'description': 'Load the transformation used to map the surface',
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
                    'type': 'surface',
                    'name': 'Output Surface',
                    'description': 'Save the mapped surface',
                    'varname': 'output',
                    'shortname' : 'o',
                    'required': false,
                    'extension' : '.vtk',
                }
            ],
            params: [
                baseutils.getDebugParam(),
            ]
        };
    }

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: transformSurface with vals', JSON.stringify(vals));
        let xform = this.inputs['xform'] || null;
        let input = this.inputs['input'];
        
        if (xform === null || input===null) {
            return Promise.reject('Either no surface or no transformation specified');
        }

        
        // Copy first
        this.outputs['output']=new BisWebSurface();
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

        let pts=this.outputs['output'].getPoints().getDataArray();
        console.log('Length=',pts.length);
        let l=pts.length;
        for (let i=0;i<l;i+=3) {
            let p=[ pts[i], pts[i+1], pts[i+2] ];
            let q=[0,0,0];
            xform.transformPoint(p,q);

            if (i===0)
                console.log('Point ',i,p,q);
            
            for (let j=0;j<=2;j++)
                pts[i+j]=q[j];
        }
        return Promise.resolve();
    }
}

module.exports = TransformSurfaceModule;
