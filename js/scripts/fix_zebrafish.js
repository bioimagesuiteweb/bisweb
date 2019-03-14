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
const BisWebImage=require('bisweb_image');
const nodemodules=require('nodemoduleindex');

var help = function() {
    console.log('\nThis program computes a hash code for a file (read as a binary array)');
};

program.version('1.0.0')
    .option('-i, --input <s>','filename of the file to clean image')
    .option('-m, --mode <i>','mode (0 = just convert, 1=normalize+smooth, 2=plus resample (default=2)')
    .option('-o, --output <s>','filename to fixed image')
    .on('--help',function() {
	help();
    })
    .parse(process.argv);


let inpfilename=program.input || null;
let outfilename =program.output || null;
let mode=program.mode;

if (mode===undefined)
    mode=2;
else
    mode=Number.parseInt(mode);

if (mode!==0 && mode!==1)
    mode=2;

console.log('Reading ',inpfilename,' mode=',mode,'\n --------------\n');


if (!inpfilename || !outfilename) {
    console.log('need to set at least input and output filenames');
    process.exit(1);
}


let img=new BisWebImage();
img.load(inpfilename).then( async () => {
    console.log(' = = = = = = = = = = = = = = = = = = = = = =');
    console.log('Image Loaded beginning processing mode=',mode);

    try {
        console.log(' = = = = = = = = = = = = = = = = = = = = = =');
        let mod0=nodemodules.getModule('reorientimage');
        await mod0.execute( {'input' : img },
                            { 'orient' : 'RAS' });
        let output=mod0.getOutputObject('output');
    
        if (mode>0) {
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            let mod1=nodemodules.getModule('slicebiascorrect');
            await mod1.execute( { 'input' : output },
                                { 'axis' : 'z' });
            
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            let mod2=nodemodules.getModule('smoothimage');
            await mod2.execute( {'input' : mod1.getOutputObject('output') },
                                { 'sigma' : 1.0 , 'inmm' : false });

            let tempimage=mod2.getOutputObject('output');
            
            if (mode>1) {
                console.log(' = = = = = = = = = = = = = = = = = = = = = =');
                let spa=tempimage.getSpacing();
                let mod25=nodemodules.getModule('resampleimage');
                await mod25.execute( {'input' : tempimage },
                                     { 'xsp' : spa[2],
                                       'ysp' : spa[2],
                                       'zsp' : spa[2] });
                tempimage=mod25.getOutputObject('output');
            } 
                
            
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            let mod3=nodemodules.getModule('normalizeimage');
            await mod3.execute( {'input' : mod2.getOutputObject('output') },
                                { });
            
            console.log(' = = = = = = = = = = = = = = = = = = = = = =');
            let mod4=nodemodules.getModule('shiftscaleimage');
            await mod4.execute( {'input' : mod3.getOutputObject('output') },
                                { 'shift' : 0,
                                  'scale' : 1.0,
                                  'outtype' : 'UChar'
                                });
            output=mod4.getOutputObject('output');
        }

        console.log(' = = = = = = = = = = = = = = = = = = = = = =');
        await output.save(outfilename);

        console.log('++++ Final output saved in ',outfilename);
        console.log('++++ ',output.getDescription());
        
    } catch(e) {
        console.log(e);
        process.exit(1);
    }
}).catch( (e) => {
    console.log(e.stack);
    console.log(e);
    process.exit(1);
});

