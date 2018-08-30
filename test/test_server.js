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

/* jshint node:true */
/*global describe, it */
"use strict";


require('../config/bisweb_pathconfig.js');

const assert = require("assert");
const path=require('path');
const util=require('bis_util');
const genericio=require('bis_genericio');

let inpfilename = "testdata/MNI_2mm_resliced.nii.gz";
let testfilename = "testdata/newtests/goldsmooth2sigma.nii.gz";

let imgnames = [ inpfilename,testfilename ];
let fullnames = [ '',''];
for (let i=0;i<=1;i++)
    fullnames[i]=path.resolve(__dirname, imgnames[i]);


describe('Testing the server\n', function() {

    this.timeout(50000);
    
    it('run filename conversion',function() {

        let ok=true;
        for (let j=0;j<fullnames.length;j++) {
            let b=util.filenameWindowsToUnix(fullnames[j]);
            let c=util.filenameUnixToWindows(b);
            console.log('\tfrom '+fullnames[j]+'\n\t  to '+b+'\n\t    back to '+c+'\n');
            if (c.trim()!==fullnames[j].trim())
                ok=false;
        }

        
        assert.equal(ok,true);
    });

    it ('run find directory and basename',function() {

        let ok=true;
        
        for (let j=0;j<fullnames.length;j++) {
            let b=['','',''];
            let d=['','',''];
            b[0]=genericio.getBaseName(fullnames[j],true); // force internal
            b[1]=genericio.getBaseName(fullnames[j]); // force internal
            b[2]=path.basename(fullnames[j]).trim();

            d[0]=genericio.getDirectoryName(fullnames[j],true); // force internal
            d[1]=util.filenameWindowsToUnix(genericio.getDirectoryName(fullnames[j])); // force internal
            let tmp=path.dirname(fullnames[j]);
            d[2]=util.filenameWindowsToUnix(tmp).trim();
            
            console.log('\n Basenames=\n\t'+b.join('\n\t'));
            console.log('\n Directories=\n\t'+d.join('\n\t'),'\n\t native=',tmp);
            
            if (b[0]!==b[2] || b[1]!==b[2]) {
                console.log('Bad Basenames');
                ok=false;
            }

            if (d[0]!==d[2] || d[1]!==d[2]) {
                console.log('Bad Directorynames');
                ok=false;
            }
        }
        assert.equal(ok,true);

    });


    it ('join filenames',function() {
        let ok=true;
        for (let i=0;i<=1;i++) {

            let f=['','',''];

            f[0]=genericio.joinFilenames(__dirname,imgnames[i],true);
            f[1]=util.filenameWindowsToUnix(genericio.joinFilenames(__dirname,imgnames[i]));
            let tmp=path.resolve(__dirname, imgnames[i]);
            f[2]=util.filenameWindowsToUnix(tmp);
            
            console.log('\n Joined Filenames=('+__dirname+' and '+imgnames[i]+')\n\t'+f.join('\n\t'),'\n\t native=',tmp);
            
            if (f[0]!==f[2] || f[1]!==f[2]) {
                console.log('Bad combined names');
                ok=false;
            }
            assert.equal(ok,true);
        }
    });


    it ('normalize filenames',function() {

        console.log('\n');
        
        let ok=true;
        let fname=fullnames[0];
        let sep=path.sep;
        console.log('\tOriginal Fname=('+fname+')');
        let s=fname.trim().split(sep);

        console.log('\t\t Normalized by us=',genericio.getNormalizedFilename(fname,"",true));

        console.log('\tParts=',s.join('__'));
        
        let offset=4;
        let part1=s[0],part2=s[offset];
        if (sep==='/')
            part1=sep+part1;

        for (let i=1;i<offset;i++)
            part1=part1+sep+s[i];
        for (let i=offset+1;i<s.length;i++)
            part2=part2+sep+s[i]
        

        console.log('\t\tpart1=',part1);
        console.log('\t\tpart2=',part2);

        for (let j=1;j<=3;j++) {

            let newpart1=part1,newpart2=part2;
            for (let add=0;add<j;add++) {
                newpart1=newpart1+sep+'..';
                newpart2=s[offset-add-1]+sep+newpart2;
            }
            console.log('\n\tj=',j,' parts=  '+newpart1+'\n\t\t and '+newpart2);

            let f2=path.resolve(path.join(newpart1,newpart2));
            console.log('\t      reconnected native=',f2);
            if (f2!==fname) {
                console.log("failed to reconnect native");
                ok=false;
            }

            // actual test
            let p1=util.filenameWindowsToUnix(newpart1);
            let p2=util.filenameWindowsToUnix(newpart2);
            console.log('\t\tparts mapped to unix='+p1+'\n\t\t and '+p2+')');
            let c=genericio.joinFilenames(p1,p2,true);
            console.log('\n\t\tjoined=('+c+')');
            let d=genericio.getNormalizedFilename(c,"",true);
            console.log('\t\tnormalized=('+d+')');
            let e=d;
            if (path.sep=='\\')
                e=util.filenameUnixToWindows(e);
            if (e!==fname) {
                console.log('\t\Connected Bad',e);
                ok=false;
            } else {
                console.log('\t\tConnected Good ',e)
            }
            console.log('');

        }

        assert(ok,true);
    });
    
});

