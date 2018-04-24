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

const os = require('os');

let path=require('path');
let v=process.versions.node;
let n=parseFloat(v);

if (n<4.2) {
    console.log(`----\n---- You are probably using the emscripten version of node (version ${v}). Open a new console and try again.\n----`);
    process.exit(1);
}

if (n<7.9) {
    console.log(`----\n---- You are using a version of node older than 7.9 (actual version=${v}). Open a new console and try again.\n----`);
    process.exit(1);
}

console.log(`....\n.... Using node.js version ${v} (OK)\n....`);

module.exports=n;

let d=path.dirname(__dirname);

// webgui below should go but needed for ancient parcellation class which should be split into compute and gui sometime

['build/wasm',
 'config/',
 'lib/js',
 'js/',
 'js/node',
 'js/legacy',
 'js/core',
 'js/dataobjects',
 'js/modules' ].forEach((p) => {
    module.paths.push(path.normalize(path.join(d,p)));
});



let a=[];
module.paths.forEach((p) => {
    a.push(p);
});

// See https://stackoverflow.com/questions/21358994/node-js-programmatically-setting-node-path
// Windows fix is mine!
if (os.platform()!=='win32')
    process.env.NODE_PATH=a.join(":");
else
    process.env.NODE_PATH=a.join(";");

require("module").Module._initPaths();


module.exports=a;

