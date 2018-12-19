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

const webpack = require('webpack'); //to access built-in plugins
const path = require('path');
const fs=require('fs');

let mypath=path.normalize(path.resolve(__dirname,'..'));
let extrapath=path.normalize(path.resolve(__dirname,'../../internal/js'));
let extrafile = path.resolve(extrapath,'bisextra.js');

console.log('--------------------------- Running Webpack -------------------------');

if (fs.existsSync(extrafile)) {
    console.log('++++ Using Extra Internal Files from',extrapath);
} else {
    console.log('---- Directory ',extrapath,' does not exist');
    extrapath=path.normalize(path.resolve(__dirname,'../js/nointernal'));
    console.log('---- Using internal ',extrapath);
}


module.exports = {

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
    externals: {
        "assert" : "require('assert')",
    },
    plugins: [
        new webpack.BannerPlugin( {
            banner : '#!/usr/bin/env mocha\n',
            raw : true
        }),
    ]
};

module.exports.resolve.modules.push(extrapath);

