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
const BisWebTextObject = require('bisweb_textobject.js');
const colors=require('colors/safe');
/**
 * prints image headers
 */
class HeaderModule extends BaseModule {
    constructor() {
        super();
        this.JSOnly=true;
        this.name = 'headerModule';
    }


    createDescription() {
        return {
            "name": "Image Header",
            "description": "Reads the Image Headers of Multiple .nii/.nii.gz images and optionally stores result in a json file",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs" : [],
            "outputs": [
                {
                    'type' : 'text',
                    'name' : 'Results',
                    'description': 'log file',
                    'varname': 'logoutput',
                    'shortname' : 'o',
                    'required': false,
                    'extension': '.bistext'
                },
            ],
            "buttonName": "Execute",
            "shortname" : "header",
            "params" : [
                {
                    "name": "Detail",
                    "description": "detail level",
                    "priority": 1,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "detail",
                    "default": 0,
                    "low": 0,
                    "high": 2,
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
        console.log(colors.green('oooo invoking: headerInfo with vals'+JSON.stringify(vals)));

        let detail=parseInt(vals.detail);
        let debug=super.parseBoolean(vals.debug);

        let inputlist=vals.extraArgs;
        if (inputlist.length<1) {
            return Promise.reject('Need at least one input image');
        }
        
        let output =[];
        
        for (let i=0;i<inputlist.length;i++) {
            console.log(colors.red(`--------------- Image ${i+1}/${inputlist.length} -----------------------------`));

            let img=new BisWebImage();
            try {
                await img.loadHeaderOnly(inputlist[i],debug);
            } catch(e) {
                return Promise.reject('Failed to read '+inputlist[i]);
            }
            
            console.log(colors.yellow('\n____ filename='+inputlist[i]+'\n\t'+img.getDescription()+'\n'));
            
            let d=img.getHeader().getDescription((detail>1));

            let obj={ };
            obj.filename=inputlist[i];
            obj.dimensions=img.getDimensions();
            obj.spacing=img.getSpacing();
            obj.description=img.getDescription();
            obj.details=d;
            output.push(obj);
                
            if (detail>0) {
                console.log(colors.cyan(d));
            }
            img=null;
        }
        let outtext=new BisWebTextObject(JSON.stringify(output));
        this.outputs['logoutput']=outtext;
        return Promise.resolve(output);
    }
                                         
}

module.exports = HeaderModule;
