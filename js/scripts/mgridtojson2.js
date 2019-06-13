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

require('../../config/bisweb_pathconfig.js');
const program=require('commander');
const BisWebElectrodeMultiGrid=require('bisweb_electrodemultigrid');


// -----------------------------------------------------------------------------
var help = function() {
    console.log('\n');
};



program.version('1.0.0')
    .option('-g --grid <s>','filename of the input grid')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);



let egrid=new BisWebElectrodeMultiGrid();
egrid.load(program.grid).then( async (m) => {

    console.log(m);

    let output=program.grid+'.json';
    try {
        await egrid.save(output);
    } catch(e) {
        console.log('Failed to save in ',output);
        process.exit(1);
    }
    
    
    console.log('----------------------------');
    console.log('+++ Saved grid in ',output);
    console.log('----------------------------');
    process.exit(0);
}).catch( (e) => {
    console.log(e.stack);
    console.log(e);
    process.exit(1);
});

