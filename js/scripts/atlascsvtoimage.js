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

'use strict';

require('../../config/bisweb_pathconfig.js');
const fs=require('fs');
const path=require('path');
const program=require('commander');
const BisWebImage=require('bisweb_image');

const defaultCsv=path.resolve(__dirname,'E2_BAM_rescue_partial_atlas.csv');

function parseCsvLine(line) {
    let values=[];
    let current='';
    let inQuotes=false;

    for (let i=0;i<line.length;i++) {
        const c=line[i];
        if (c==='"') {
            if (inQuotes && line[i+1]==='"') {
                current+='"';
                i++;
            } else {
                inQuotes=!inQuotes;
            }
        } else if (c===',' && !inQuotes) {
            values.push(current);
            current='';
        } else {
            current+=c;
        }
    }
    values.push(current);
    return values;
}

function readCsv(csvfilename) {
    const text=fs.readFileSync(csvfilename,'utf8').replace(/^\uFEFF/,'');
    const lines=text.split(/\r?\n/).filter((line) => line.trim().length>0);
    if (lines.length<2)
        throw new Error('CSV file must contain a header and at least one data row');

    const header=parseCsvLine(lines[0]).map((x) => x.trim());
    const rows=[];
    for (let i=1;i<lines.length;i++)
        rows.push(parseCsvLine(lines[i]));

    return { header, rows };
}

function readLookupTable(csv,columnname) {
    const header=csv.header;
    const rows=csv.rows;
    const columnindex=header.indexOf(columnname);
    if (columnindex<0)
        throw new Error(`Column "${columnname}" not found. Available columns: ${header.join(', ')}`);

    const lookup=[];
    for (let i=0;i<rows.length;i++) {
        const row=rows[i];
        const atlasvalue=parseFloat(row[0]);
        const mappedvalue=parseFloat(row[columnindex]);
        if (Number.isFinite(atlasvalue) && Number.isFinite(mappedvalue))
            lookup.push([ atlasvalue, mappedvalue ]);
    }
    return lookup;
}

function sanitizeColumnName(columnname) {
    return columnname.replace(/[^A-Za-z0-9_.-]+/g,'_');
}

function getDefaultOutputName(csvfilename,columnname) {
    const basename=path.basename(csvfilename,path.extname(csvfilename));
    return `${basename}_${sanitizeColumnName(columnname)}.nii.gz`;
}

function createMappedImage(src,lookup) {
    const dest=new BisWebImage();
    dest.cloneImage(src,{ type : 'float' });

    const idat=src.getImageData();
    const odat=dest.getImageData();
    odat.fill(0.0);

    for (let i=0;i<idat.length;i++) {
        const inputvalue=idat[i];
        for (let j=0;j<lookup.length;j++) {
            if (Math.abs(inputvalue-lookup[j][0])<0.01) {
                odat[i]=lookup[j][1];
                break;
            }
        }
    }
    return dest;
}

function help() {
    console.log('\nExample:');
    console.log('  atlascsvtoimage.js -i atlas.nii.gz -c drug.beta -o drug_beta.nii.gz');
    console.log('  atlascsvtoimage.js -i atlas.nii.gz');
    console.log('\nThe first CSV column is treated as the atlas label column; the selected column supplies output values.');
    console.log('If -c is omitted or blank, all numeric columns after atlas.number and features are written.');
}

program.version('1.0.0')
    .option('-i, --input <s>','filename of the input atlas image')
    .option('-c, --column <s>','CSV column to map into the output image')
    .option('-o, --output <s>','filename of the output image')
    .option('--csv <s>','CSV filename',defaultCsv)
    .on('--help',function() {
        help();
    })
    .parse(process.argv);

const inpfilename=program.input || null;
const columnname=(program.column || '').trim();
const csvfilename=program.csv;
const outfilename=program.output || null;

if (!inpfilename) {
    program.help();
}

const img=new BisWebImage();

img.load(inpfilename).then(() => {
    console.log(' = = = = = = = = = = = = = = = = = = = = = =');
    console.log('Image loaded from=',img.getDescription());
    console.log('CSV file=',csvfilename);

    const csv=readCsv(csvfilename);
    const columns=columnname.length>0 ? [ columnname ] : csv.header.slice(2);
    if (columnname.length===0 && outfilename)
        console.log('Output filename ignored for multi-column mode; using CSV-derived names');

    let promise=Promise.resolve();
    for (let i=0;i<columns.length;i++) {
        const col=columns[i];
        promise=promise.then(() => {
            console.log('CSV column=',col);
            const lookup=readLookupTable(csv,col);
            if (lookup.length<1) {
                console.log('Skipping',col,'because it has no numeric values');
                return Promise.resolve();
            }
            console.log('Loaded',lookup.length,'atlas mappings');
            const dest=createMappedImage(img,lookup);
            const outfile=(columnname.length>0 && outfilename) ? outfilename : getDefaultOutputName(csvfilename,col);
            return dest.save(outfile).then(() => {
                console.log('Output saved in',outfile);
            });
        });
    }

    promise.then(() => {
        process.exit(0);
    }).catch((e) => {
        console.log(e);
        process.exit(1);
    });
}).catch((e) => {
    console.log(e.stack);
    console.log(e);
    process.exit(1);
});
