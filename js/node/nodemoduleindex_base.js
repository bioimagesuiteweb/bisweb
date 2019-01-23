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

"use strict";

const universalmodules=require('moduleindex');


const moduleImports = {
    'infomodule': require('./infomodule.js'),
    'makechecksum' : require('./bis_hashmodule.js'),
    'regressiontests': require('./regressiontestmodule.js'),
};

let moduleNames=universalmodules.createModuleNames(moduleImports);

let getModule = function(toolname, searchParent = true) {
    
    let newmodulecommand=moduleImports[toolname.toLowerCase()];
    if (newmodulecommand===undefined) {
        if (searchParent) 
            return universalmodules.getModule(toolname);
        return null;
    }
    return new newmodulecommand();
};



let getModuleNames = function() {
    let a=Object.keys(moduleNames);
    let b=universalmodules.getModuleNames();
    return b.concat(a);
};

module.exports = {
    getModule :      getModule,
    getModuleNames : getModuleNames,
};
