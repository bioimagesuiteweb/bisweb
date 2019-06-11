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
            "name": "Header Images",
            "description": "Headers Multiple Images to a single 4D Image",
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
        
        let msg='';
        for (let i=0;i<inputlist.length;i++) {
            let a=`--------------- Image ${i+1}/${inputlist.length} -----------------------------`;
            console.log(colors.red(a));
            msg+=a+'\n';

            let img=new BisWebImage();
            try {
                await img.loadHeaderOnly(inputlist[i],debug);
            } catch(e) {
                return Promise.reject('Failed to read '+inputlist[i]);
            }
            
            a='\n____ filename='+inputlist[i]+'\n\t'+img.getDescription()+'\n';
            console.log(colors.yellow(a));
            msg+=a+'\n';
            if (detail>0) {
                let a=img.getHeader().getDescription((detail>1));
                msg+=a+'\n';
                console.log(colors.cyan(a));
            }
            img=null;
        }
        this.outputs['logoutput']=new BisWebTextObject(msg);
        return Promise.resolve(msg);
    }
                                         
}

module.exports = HeaderModule;
