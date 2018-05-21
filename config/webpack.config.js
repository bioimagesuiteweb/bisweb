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

const webpack = require('webpack'); //to access built-in plugins
const path = require('path');
const fs=require('fs');


let orig_internal = (process.env.BISWEB_INTERNAL) || 0;
let output = (process.env.BISWEB_OUT) || "";
let internal = parseInt(orig_internal) || 0 ;
if (internal<0)
    internal=0;
else if (internal>2)
    internal=2;
let mypath=path.normalize(path.resolve(__dirname,'..'));
let extrapath=path.normalize(path.resolve(__dirname,'../../internal/js'));
let extrapath2=path.normalize(path.resolve(__dirname,'../../internal/node_modules'));
let extrafile = path.resolve(extrapath,'bisextra.js');

console.log(`--------------------------- Running Webpack --> ${output} -------------------------`);


if (fs.existsSync(extrafile) && internal) {
    console.log(`++++ Using Extra Internal Files from ${extrapath}.`);
} else {
    //    console.log('---- Directory ',extrapath,' does not exist.');
    extrapath=path.normalize(path.resolve(__dirname,'../js/nointernal'));
    exptrapath2=null;
    internal=0;
}


let bisWebCustom=path.join(extrapath,"bisextra.js");
if (internal<2) {
    bisWebCustom="bis_util";
    console.log(`++++ Not using custom extra require file.`);
} else {
    console.log(`++++ Using custom extra require file=${bisWebCustom}`);
}

if (output !== "webworkermain.js") {
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
                        path.resolve(mypath,'build/wasm') ]
        },
        mode : 'development',
        target : "web",
        externals: {
            // require("jquery") is external and available on the global var jQuery
	    "jquery": "jQuery",
        },
        watchOptions: {
	    aggregateTimeout: 300,
	    poll: 1000
        },
        plugins : [
	    new webpack.NormalModuleReplacementPlugin(/(.*)__BISWEB_CUSTOM(\.*)/, function(resource) {
                resource.request = resource.request.replace(/__BISWEB_CUSTOM/, `${bisWebCustom}`);
	    })
        ]
    };

    module.exports.resolve.modules.push(extrapath);
    console.log('++++ Appending',extrapath,' to module path');
    if (extrapath2) {
        if (fs.existsSync(extrapath2) ) {
            module.exports.resolve.modules.push(extrapath2);
            console.log('++++ Appending',extrapath2,' to module path');
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
                        path.resolve(mypath,'build/wasm'),
                        path.resolve(mypath,'build/web')]
        },
        mode : 'development',
        target : "web",
        watchOptions: {
	    aggregateTimeout: 300,
	    poll: 1000
        }
    };
}
    

      
