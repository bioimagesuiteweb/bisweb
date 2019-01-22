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
const commandutils=require('bis_commandlineutils');
const genericio=require('bis_genericio');
const fs=genericio.getfsmodule();
const path=genericio.getpathmodule();

class RegressionTestModule extends BaseModule {
    constructor() {
        super();
        this.name = 'RegressionTest';
    }
    
    createDescription() {
        
        return {
            "name": "RegressionTest",
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
                    "name": "First Test",
                    "description": "The first test to run (0)",
                    "priority": 1,
                    "advanced": false,
                    "type": "int",
                    "varname": "first",
                    "default": 0,
                    "low": 0,
                    "high": 1000,
                },
                {
                    "name": "Last Test",
                    "description": "The last test to run (-1 = all)",
                    "priority": 2,
                    "advanced": false,
                    "type": "int",
                    "varname": "last",
                    "default": -1,
                    "low": -1,
                    "high": 1000,
                },
                {
                    "name": "Test Name",
                    "description": "If specified only run tests with this name",
                    "priority": 3,
                    "advanced": false,
                    "varname": 'testname',
                    "type": 'string',
                    "default" : '',
                },
                {
                    "name": "Run",
                    "description": "if true then run the tests if not just list them",
                    "priority": 4,
                    "advanced": false,
                    "gui": "check",
                    "varname": "run",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Test List",
                    "description": "Location of the test list files (module_tests.json). If not speicied get from github",
                    "priority": 4,
                    "advanced": true,
                    "varname": 'testlist',
                    "type": 'string',
                    "default" : '',
                },
                {
                    "name": "Test Directory",
                    "description": "Location of the test directory (contains test_module.js)). If not speicified then try to autodetect",
                    "priority": 5,
                    "advanced": true,
                    "varname": 'testdir',
                    "type": 'string',
                    "default" : '',
                },
                baseutils.getDebugParam()
            ]
        };
    }


    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: testmodule with vals', JSON.stringify(vals));

        let dirname=__dirname;
        if (vals.testdir.length>0)
            dirname=vals.testdir;
        let cmd=path.join(dirname,'../test/test_module.js');
        let script2=path.join(dirname,'../../test/test_module.js');

        if (!fs.existsSync(cmd)) {
            cmd=script2;
            if (!fs.existsSync(cmd)) {
                return Promise.reject('test_module.js not found');
            }
        }  
              
        
        let command='mocha '+cmd;
        command=command+` --first ${vals.first} --last ${vals.last}`;
        if (vals.testname.length>0)
            command=command+` --testname ${vals.testname}`;
        if (vals.testlist.length>0)
            command+=' --input '+vals.testlist;
        if (!vals.run)
            command+=' --list';

        return new Promise( (resolve,reject) => {
            commandutils.executeCommandAndLog(command).then( (m) => {

                if (!vals.run) 
                    console.log('\n\n____ To actually run tests, re-run this command with the extra flag "--run 1"\n____\n');
                else
                    console.log('\n');
                this.outputs['logoutput']=new BisWebTextObject(m);
                resolve(m);
            }).catch( (e) => {
                console.log("Error=",e);
                this.outputs['logoutput']=new BisWebTextObject(e);
                reject(e);
            });
        });
    }
}

module.exports = RegressionTestModule;
