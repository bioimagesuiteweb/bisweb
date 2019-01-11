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
const BisWebTextObject = require('bisweb_textobject.js');

class InfoModule extends BaseModule {
  constructor() {
    super();
    this.name = 'Info';
  }
    
    createDescription() {
        
        return {
            "name": "Info",
            "description": "This module outputs system info",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs": [
                {
                    'type' : 'text',
                    'name' : 'Results',
                    'description': 'log file',
                    'varname': 'logoutput',
                    'required': false,
                    'extension': '.bistext'
                },
            ],
            "buttonName": "Execute",
            "shortname" : "info",
            "params": [
                {
                    "name": "Detail",
                    "description": "detail level",
                    "priority": 1,
                    "advanced": true,
                    "gui": "slider",
                    "type": "int",
                    "varname": "detail",
                    "default": 1,
                    "low": 1,
                    "high": 5,
                },
                baseutils.getDebugParam()
            ]
        };
    }


    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: infomodule with vals', JSON.stringify(vals));
        
        let v=process.versions.node;
        let out= {
            "nodeversion" : v,
        };

        if (vals.detail>1) {
            let s=v.split(".");
            out.major=parseInt(s[0]);
            out.minor=parseInt(s[1]);
        }
        
        let msg=JSON.stringify(out,null,4);
        this.outputs['logoutput']=new BisWebTextObject(msg);
        console.log("Output = ",msg);
        return Promise.resolve(msg);
    }
}

module.exports = InfoModule;
