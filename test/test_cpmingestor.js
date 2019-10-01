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
/*global describe, it, before */
"use strict";

require('../config/bisweb_pathconfig.js');
const assert = require('assert');
const MakeMatrixConnModule = require('makeConnectivityMatrixFile.js');
const bis_genericio = require('bis_genericio.js');
const path = require('path');
const colors = require('colors/safe');
const sep = path.sep;


let cleanRow = (line) => {
    return line.trim().replace(/\t/g,' ').replace(/ +/g,' ').replace(/ /g,'').replace(/\n/g,'').replace(/\r/g,'');
};

let compareFiles = (obj1, obj2) => {
    console.log(colors.green('+++ COMPARING +++\n', obj1, '\n', obj2, '\n'));
    if ( !(typeof obj1 === 'object') && !(typeof obj2 === 'object') ) {
        return cleanRow(obj1) === cleanRow(obj2);
    } else {

        //ensure that objects contain the same keys
        let obj1Keys = Object.keys(obj1).sort(), obj2Keys = Object.keys(obj2).sort();
        for (let i = 0; i < obj1Keys.length; i++) { 
            if (obj1Keys[i] !== obj2Keys[i]) { return false; }
        }

        let compArray = [];
        for (let key of Object.keys(obj1)) {
            compArray.push(compareFiles(obj1[key], obj2[key]));
        }

        return !compArray.includes(false);
    }

    /*function compareKeys(obj1, obj2) {

        //check if objects have same keys
        let keys1 = Object.keys(obj1).sort(), keys2 = Object.keys(obj2).sort();
        for(let i = 0; i < keys1.length; i++) {
            if (keys2[i] !== keys1[i]) { return false; }
        }

        //check if values are the same
        for (let key of Object.keys(obj1)) {
            if (!obj2.hasOwnProperty(key)) { return false; }
            if (cleanRow(obj1[key] !== cleanRow(obj2[key]))) { return false; }
        }
    }*/
};

describe('Testing CPM ingestor', () => {

    it('makes a connectivity file', async () => {
        try {
            let connModule = new MakeMatrixConnModule();
            let indir = ['.', 'testdata', 'sample_csvs'];
            await connModule.execute({}, { 'indir': indir.join(sep), 'writeout': false });
        } catch(e) {
            console.log(colors.red('An error occured while making a connectivity file', e));
            assert(false);
        }
        
    });

    it('makes the correct connectivity file', async () => {
        let connModule = new MakeMatrixConnModule();
        try {
            let indir = ['.', 'testdata', 'sample_csvs'], baseconnfile = ['.', 'testdata', 'sample_csvs', 'sample_connmatrixfile.json'];
            let obj = await connModule.execute({}, { 'indir': indir.join(sep), 'writeout': false });
            let correctContents = await bis_genericio.read(baseconnfile.join(sep));
            let contents = obj.file, parsedCorrectContents;
            try {
                parsedCorrectContents = JSON.parse(correctContents.data);
            } catch(e) { 
                console.log(colors.red('An error occured while parsing baseline contents', e));
            }

            console.log('contents', contents);
            assert(compareFiles(contents, parsedCorrectContents));
        } catch (e) {
            console.log(colors.red('An error occured while making a connectivity file', e));
            assert(false);
        }
    });
});

