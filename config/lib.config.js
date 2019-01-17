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

const path=require('path');
const mypath=path.normalize(path.resolve(__dirname,'..'));

let appinfo=require(path.resolve(__dirname,'../package.json'));
let webonlydependencies=appinfo.bioimagesuiteweb.webonly;




const obj = {
    node: {
	__filename: false,
	__dirname: false,
    },
    mode : 'development',
    resolve: {
	extensions: [ '.js'],
	modules : [ path.resolve(mypath,'node_modules'),
                    path.resolve(mypath,'lib/js'),
                    path.resolve(mypath,'js'),
                    path.resolve(mypath,'js/legacy'),
                    path.resolve(mypath,'js/core'),
                    path.resolve(mypath,'js/dataobjects'),
                    path.resolve(mypath,'js/node'),
                    path.resolve(mypath,'js/export'),
                    path.resolve(mypath,'js/modules'),
                    path.resolve(mypath,'build/wasm') ]
    },
    target : "node",
    output : {
        library: 'bioimagesuiteweblib',
        libraryTarget : 'umd'
    }
};


let dependencies=Object.keys(appinfo.dependencies);
let webdeps=Object.keys(webonlydependencies);

// Make sure this is external
dependencies.push("colors/safe");
// Exclude this
webdeps.push("@tensorflow/tfjs-node");


let externals = {};
for (let i=0;i<dependencies.length;i++) {
    let key=dependencies[i];
    if (webdeps.indexOf(key)<0)
        externals[key]=key;
}

obj.externals=externals;
//console.log('--------------------------- Running Webpack -------------------------');
//console.log("externals=",JSON.stringify(externals,null,2));

module.exports=obj;
