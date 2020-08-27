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
const genericio=require('bis_genericio.js');
const BisWebTextObject=require('bisweb_textobject.js');
const tempfs = require('temp').track();
const tmpDirPath=tempfs.mkdirSync('test_image');

describe('Testing Text Object\n', function() {

    it('getText, serialize',function() {

        let a =new BisWebTextObject('hello');
        let b = a.getText();
        console.log('B=',b);
        console.log('ser=',a.serializeToJSON());
        assert.equal('hello',b);
    });

    it('load bistext',function(done) {

        let t =new BisWebTextObject();
        let filename=path.resolve(__dirname, 'testdata/test.bistext');
        t.load(filename).then( () => {
            console.log('Loaded ',t.getText(), ' from' ,filename);
            let b = t.getText();
            assert.equal('hello',b);
            done();
        });
    });

    it('load .txt',function(done) {

        let t =new BisWebTextObject();
        let filename=path.resolve(__dirname, 'testdata/test.txt');
        t.load(filename).then( () => {
            console.log('Loaded ',t.getText(), ' from' ,filename);
            let b = t.getText().trim();
            
            assert.equal('Help',b);
            done();
        });
    });

    it ('save/load',function(done) {

        const tmpFname=path.resolve(tmpDirPath,'a.bistext');
        const tmpFname2=path.resolve(tmpDirPath,'a.csv');
        const tmpFname3=path.resolve(tmpDirPath,'a.txt');

        console.log('Saving in ',tmpFname,tmpFname2);
        
        let sampletext="Yale 1701\nHelp";
        let jsontext ='{"bisformat":"BisText","filename":"","comments":[],"text":"Yale 1701\\nHelp"}';
        let comparejson=JSON.stringify(JSON.parse(jsontext),null,4);
        let obj =new BisWebTextObject();
        obj.setText(sampletext);
        Promise.all( [
            obj.save(tmpFname),
            obj.save(tmpFname2),
            obj.save(tmpFname3)
        ]).then( () => {
            Promise.all( [
                genericio.read(tmpFname),
                genericio.read(tmpFname2),
                genericio.read(tmpFname3)
            ]).then( (dat2) => {
                console.log('\nLoaded back:',JSON.stringify(dat2,null,2));
                let ok=false;
                if (dat2[0].data.trim()===comparejson.trim() ) {
                    console.log("Step 1 OK",tmpFname);
                    if (dat2[1].data.trim()===sampletext.trim() ) {
                        console.log("Step 2",tmpFname2);
                        if (dat2[2].data.trim()===sampletext.trim()) {
                            console.log("Step 3",tmpFname3);
                            ok=true;
                        } else {
                            console.log('Bad Step 3');
                        }
                    } else {
                        console.log('Bad Step 2');
                    }
                } else {
                    console.log('Bad Step 1\n1=\n',dat2[0].data.trim(),'\n2=\n',comparejson.trim());
                }
                assert(ok,true);
                done();
            });
        }).catch( (e) => {
            console.log(e);
            assert(false,true);
            done();
        });
    });
});

