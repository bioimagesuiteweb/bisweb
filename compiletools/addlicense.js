#!/usr/bin/env node

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

// -----------------------------------------------------------------
// Header and requirements for node.js
'use strict';

// -----------------------------------------------------------------
// Create command line
// -----------------------------------------------------------------
const fs=require('fs');

let createLicense=function(delimiter='#',before="",after="") {

    const LICENSE=`LICENSE

_This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._

BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");

- you may not use this software except in compliance with the License.
- You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

__Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.__

ENDLICENSE`;
    
    const LINES=LICENSE.split("\n");
    let max=LINES.length-1;
    let out="";
    if (before.length>0)
        out=before+" ";
    for (let i=0;i<=max;i++) {
        out+=delimiter+" "+LINES[i];
        if (i<max)
            out+="\n";
    }
    if (after.length>0)
        out+=after+"\n";
    else
        out+="\n";
    return out;
};

let license = {
    "python" : createLicense("#"),
    "js" : createLicense("","/*"," */"),
    "c"  : createLicense("","/*"," */"),
    "matlab" :  createLicense("%"),
    "script":  createLicense("#"),
    "html"  : createLicense("","<!---"," -->"),
};

let suffixmap = {

    "c" : "c",
    "cpp" : "c",
    "h"   : "c",
    "txx" : "c",
    "js"  : "js",
    "py"  : "python",
    "m"   : "matlab",
    "sh"  : "script",
    "txt" : "script",
    "cmake" : "script",
    "md" : "html",
    "html" : "html",
};

let keys=Object.keys(suffixmap);
let fnames=process.argv;

for (let i=2;i<fnames.length;i++) {

    let fname=fnames[i];
    let ext = fname.split('.').pop();

    let out=null;
    let comment="Added license to";
    if ( keys.indexOf(ext)>=0) {
        let text = fs.readFileSync(fname,'utf-8');
        const lines=text.split("\n");
        let index=lines[0].indexOf("LICENSE");
        if (index>=0) {

            //            console.log('The first line of ',fname,' contains LICENSE');
            let found=false;
            let n=1;
            while (n<30 && found===false) {
                let index=lines[n].indexOf("ENDLICENSE");
                if (index>=0)
                    found=true;
                n=n+1; // forward in both cases
            }

            if (found===false) {
                console.log(`File ${fname} already contains a different license ... ignoring`);
                out=null;
            } else {
                //  console.log('Found endlicense in line',n, lines[n]);
                out=license[suffixmap[ext]]+"\n";
                for (let k=n+1;k<lines.length;k++)
                    out+=lines[k]+"\n";
                comment="Replaced license in ";
            }
        } else {
            out=license[suffixmap[ext]]+"\n"+text;
        }

        if (out!==null) {
            let fname2=fname;
            fs.writeFileSync(fname2,out);
            console.log(`++++ ${comment} ${fname} (ext=${ext}, type=${suffixmap[ext]}) --> ${fname2}`);
        }
    }  else {
        console.log(`---- Ignoring File ${fname}, ext=${ext}, type=unknown`);
    }
}
process.exit(0);


