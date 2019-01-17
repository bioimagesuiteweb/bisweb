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



// -----------------------------------------------------------------------------------
// Parse Command line
let internal = 0,external=0;

let found=false,i=0,output='bislib.css';

while (i< process.argv.length) {
    //    console.log('Looking at ',process.argv[i]);
    if (process.argv[i]==='--output-filename') {
        output=process.argv[i+1];
        found=true;
        i=i+2;
    } else if (process.argv[i]==='--bisinternal') {
        internal=parseInt(process.argv[i+1]);
        i=i+2;
    } else if (process.argv[i]==='--bisexternal') {
        external=parseInt(process.argv[i+1]);
        i=i+2;
    } else {
        i=i+1;
    }
}


if (!found) {
    console.log('process.argv=',process.argv, ' len=',process.argv.length);
    process.exit(1);
}

output=output.trim().replace(/_full.js/g,'');

const appinfo=require(path.resolve(__dirname,'../package.json'));

// -----------------------------------------------------------------------------------
// Extra files for internal and external

let mypath=path.normalize(path.resolve(__dirname,'..'));
let extrapath=path.normalize(path.resolve(__dirname,'../../internal/js'));
let extrapath2=path.normalize(path.resolve(__dirname,'../../internal/node_modules'));
let extrafile = path.resolve(extrapath,'bisextra.js');

let externalpath=path.normalize(path.resolve(__dirname,'../../external/js'));
let externalpath2=path.normalize(path.resolve(__dirname,'../../external/node_modules'));
let externalfile= path.resolve(externalpath,'bisextra.js');


if (fs.existsSync(extrafile) && internal) {
    console.log(`${output}:++++ Using Extra Internal Files from ${extrapath}.`);
} else {
    extrapath=path.normalize(path.resolve(__dirname,'../js/nointernal'));
    extrapath2=null;
    internal=0;
    extrafile='(none)';
}


if (fs.existsSync(externalfile) && external>0) {
    console.log(`${output}:++++ Using Extra External Files from ${externalpath}.`);
} else {
    externalpath=null;
    externalpath2=null;
    external=0;
    externalfile='(none)';
}


let bisWebCustom=path.join(extrapath,"bisextra.js");
if (internal<2) {
    bisWebCustom="bis_dummy"; // dummy file
} else {
    console.log(`${output}:++++ Using custom extra require file=${bisWebCustom}`);
}

let bisWebExternalFile="";
if (!external) {
    bisWebExternalFile="bis_dummy"; // dummy file
    //    console.log(`${output}:++++ Not using custom extra require file from external, using ${bisWebExternalFile} as placeholder.`);
} else {
    bisWebExternalFile=path.join(externalpath,"bisextra.js");
    console.log(`${output}:++++ Using custom extra require file=${bisWebExternalFile}`);
}


// -----------------------------------------------------------------------------------
// Main process

console.log(`--------------------------- Running Webpack --> ${output} internal=${extrafile}, external=${externalfile} -------------------------`);




if (output === "bislib.js" || output ==="index.js") {
    module.exports = {
        resolve: {
            extensions: [ '.js'],
            modules : [ path.resolve(mypath,'node_modules'),
                        path.resolve(mypath,'lib/js'),
                        path.resolve(mypath,'js'),
                        path.resolve(mypath,'js/core'),
                        path.resolve(mypath,'js/dataobjects'),
                        path.resolve(mypath,'js/cloud'),
                        path.resolve(mypath,'js/webcomponents'),
                        path.resolve(mypath,'js/coreweb'),
                        path.resolve(mypath,'js/legacy'),
                        path.resolve(mypath,'js/modules'),
                        path.resolve(mypath,'js/export'),
                        path.resolve(mypath,'js/webtest'),
                        path.resolve(mypath,'build/wasm') ]
        },
        mode : 'development',
        target : "web",
        externals: appinfo.bioimagesuiteweb.webexternals,
        watchOptions: {
            aggregateTimeout: 300,
            poll: 1000
        },
        plugins : [
            new webpack.NormalModuleReplacementPlugin(/(.*)__BISWEB_CUSTOM(\.*)/, function(resource) {
                resource.request = resource.request.replace(/__BISWEB_CUSTOM/, `${bisWebCustom}`);
            }),
            new webpack.NormalModuleReplacementPlugin(/(.*)__BISWEB_EXTERNAL(\.*)/, function(resource) {
                resource.request = resource.request.replace(/__BISWEB_EXTERNAL/, `${bisWebExternalFile}`);
            }),
        ],
    };

    
    module.exports.resolve.modules.push(extrapath);
    console.log(`${output}:++++ Appending ${extrapath} to module path`);
    if (extrapath2) {
        if (fs.existsSync(extrapath2) ) {
            module.exports.resolve.modules.push(extrapath2);
            console.log(`${output}:++++ Appending extrapath2 to module path`);
        }
    }

    if (external) {
        module.exports.resolve.modules.push(externalpath);
        console.log(`${output}:++++ Appending ${externalpath} to module path`);
        if (externalpath2) {
            if (fs.existsSync(externalpath2) ) {
                module.exports.resolve.modules.push(externalpath2);
                console.log(`${output}:++++ Appending ${externalpath2} to module path`);
            }
        }
    }

    
} else {
    module.exports = {
        resolve: {
            extensions: [ '.js'],
            modules : [ path.resolve(mypath,'node_modules'),
                        path.resolve(mypath,'lib/js'),
                        path.resolve(mypath,'js'),
                        path.resolve(mypath,'js/core'),
                        path.resolve(mypath,'js/dataobjects'),
                        path.resolve(mypath,'js/legacy'),
                        path.resolve(mypath,'js/modules'),
                        path.resolve(mypath,'js/webworker'),
                        path.resolve(mypath,'build/wasm'),
                        path.resolve(mypath,'build/web')]
        },
        mode : 'development',
        target : "web",
        externals: appinfo.bioimagesuiteweb.workerexternals,
        watchOptions: {
            aggregateTimeout: 300,
            poll: 1000
        }, plugins : [ ]
    };
}




if (output === "bislib.js") {
    console.log(`${output} ++++ Adding library output info`);
    module.exports.output= {
        library: 'bioimagesuiteweb',
        libraryExport: 'default',
        libraryTarget : 'umd'
    };
}

console.log('++++ Webpack externals=',Object.keys(module.exports.externals).join(','));




