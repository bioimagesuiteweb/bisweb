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

let v=process.versions.node;
let n=parseFloat(v);

if (n<4.2) {
    console.log(`----\n---- You are probably an ancient emscripten version of node (version ${v}). Open a new console and try again.\n----`);
    process.exit(1);
}

if (n<8.0) {
    console.log(`----\n---- You are using a version of node older than 8.0 (actual version=${v}). Open a new console and try again.\n----`);
    process.exit(1);
}

console.log(`....\n.... Using node.js version ${v} ( OK )\n`);
console.log('.... This program is part of the tools from BioImage Suite Web. See https://github.com/bioimagesuiteweb/bisweb for more information.\n....');

module.exports=n;
