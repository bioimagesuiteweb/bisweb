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

    directInvokeAlgorithm(vals) {
        console.log('oooo invoking: combineImages with vals', JSON.stringify(vals));

        let detail=parseInt(vals.detail);
        
        return new Promise( (resolve,reject) => {

            let inputlist=vals.extraArgs;
            if (inputlist.length<1) {
                return Promise.reject('Need at least two input images');
            }


            let imagelist=[],promiselist=[];
            for (let i=0;i<inputlist.length;i++) {
                let img=new BisWebImage();
                imagelist.push(img);
                promiselist.push(img.loadPartOfNII(inputlist[i],false,-1,0));
            }
            
            Promise.all(promiselist).then( (obj) => {
                console.log('++++ A total of ',obj.length,' images have been loaded.');
                let msg='';
                for (let i=0;i<imagelist.length;i++) {
	            let a=`--------------- Image ${i+1}/${imagelist.length} -----------------------------`;
                    console.log(a);
                    msg+=a+'\n';
	            a='\n____ filename='+inputlist[i]+', '+imagelist[i].getDescription()+'\n';
                    console.log(a);
                    msg+=a+'\n';
                    if (detail>0) {
	                let a=imagelist[i].getHeader().getDescription((detail>1));
                        msg+=a+'\n';
                        console.log(a);
                    }
                }
                this.outputs['logoutput']=new BisWebTextObject(msg);
                resolve(msg);
            }).catch( (e) => {
                reject(e);
            });
        });
    }
                                         
}

module.exports = HeaderModule;
