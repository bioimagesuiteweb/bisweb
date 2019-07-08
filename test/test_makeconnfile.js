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
const assert = require('assert');
const MakeMatrixConnModule = require('makeConnectivityMatrixFile.js');
const bis_genericio = require('bis_genericio.js');
const path = require('path');
const colors = require('colors/safe');
const sep = path.sep;

let cleanRow = (line) => {
    return line.trim().replace(/\t/g,' ').replace(/ +/g,' ').replace(/ /g,',').replace(/\n/g,';').replace(/\r/g,'');
};

describe('Testing make connectivity .csv file (the thing that Dustin asked for)', () => {

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
            let contents = await connModule.execute({}, { 'indir': indir.join(sep), 'writeout': false });
            let correctContents = await bis_genericio.read(baseconnfile.join(sep));
            console.log('contents', contents, 'correct contents', correctContents);
            let cleanContents = cleanRow(JSON.stringify(contents)), cleanCorrectContents = cleanRow(correctContents.data);


            console.log('contents', cleanContents, '\n\n', 'correct contents', cleanCorrectContents);
            assert(cleanContents === cleanCorrectContents);
        } catch (e) {
            console.log(colors.red('An error occured while making a connectivity file', e));
            assert(false);
        }
    });
});