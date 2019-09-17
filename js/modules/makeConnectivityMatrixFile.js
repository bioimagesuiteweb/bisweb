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

const BaseModule = require('basemodule.js');
const bis_genericio = require('bis_genericio.js');
const path = bis_genericio.getpathmodule();
const sep = path.sep;

/**
 * Combines a set of parameter files and connectivity matrices in a given directory into a single file
 */
class MakeConnMatrixFileModule extends BaseModule {
    constructor() {
        super();
        this.name = 'makeConnMatrixFile';
        this.useworker=false;
    }

    createDescription() {
        let des={
            "name": "Make Connectivity Matrix File",
            "description": "Reads a set of parameter files and connectivity matrices from a given directory, then combines them into a single file.",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs" : [],
            "outputs" : [],
            "buttonName": "Run",
            "shortname" : "mcmf",
            "params": [{
                "name": "Input directory",
                "description": "Directory containing all the relevant files",
                "priority": 1,
                "advanced": false,
                "gui": "text",
                "varname": "indir",
                "shortname" : "i",
                "type": "string",
                "required": true
            },{
                "name": "Output filename",
                "description" : "Name of the output matrix connectivity params file",
                "priority": 2,
                "advanced": false,
                "gui": "text",
                "varname": "outdir",
                "shortname": "o",
                "required": false,
                "default" : ""
            }, {
                "name": "Make output file",
                "description" : "Whether or not to write the output file to disk. True by default",
                "priority": 3,
                "advanced": true,
                "gui": "check",
                "varname": "writeout",
                "shortname": "w",
                "required": false,
                "default" : true
            }, {
                "name" : "Reformat input",
                "description" : "Whether or not to rename files to the format that BioImage Suite uses",
                "priority"  : 4,
                "advanced" : false,
                "gui" : "check",
                "varname" : "reformat",
                "shortname" : "r",
                "required" : false,
                "default" : false
            }],
        };

        return des;
    }

    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: Make Connectivity Matrix File', JSON.stringify(vals),'\noooo'); 
        let indir = vals.indir, outdir;
        let combinedFile = {};

        //Remove leading slash if on Windows (otherwise it will resolve two root directories)
        if (sep === '\\') {
            if (indir.substring(0,1) === '/' || indir.substring(0,1) === '\\') {
                indir = indir.substring(1, indir.length);
            }
        }

        //make default output filename if none is specified
        if (!vals.outdir) {
            let splitindir = path.resolve(indir).split(sep);
            splitindir.push('connmatrixfile.json');
            outdir = splitindir.join(sep);
        } else {
            outdir = vals.outdir;
        }

       

        return new Promise( (resolve, reject) => {
            indir = path.resolve(indir);
            searchForFormattedFiles.then( async (result) => {

                if (!result) {

                    //if there's no formatted files try looking for the unformatted files (.txt files with a single csv)
                    searchForUnformattedFiles(indir).then( (obj) => {
                        //TODO: do something with these files... 
                    }).catch( (e) => { reject(e); });
                } else {
                    try {
                        let behaviorFiles = result.behaviorFiles, connFiles = result.connFiles;
    
                        let arr = [];
                        arr[1];
    
                        for (let file of behaviorFiles.concat(connFiles)) {
                            let contents = await bis_genericio.read(path.resolve(file));
                            addEntry(bis_genericio.getBaseName(file), contents.data);
                        }
    
                        if (vals.writeout) {
                            await bis_genericio.write(outdir, JSON.stringify(combinedFile, null, 2));
                        }
                        resolve({ 'file' : combinedFile, 'filenames' : behaviorFiles.concat(connFiles) });
                    } catch(e) {
                        reject(e);
                    }
                }
               
            }).catch((e) => {
                reject(e.stack);
            });

        });

        function addEntry(filename, contents) {
            let splitName = filename.split('_');
            let subjectNumberRegex = /sub\d*(\d)/;
            let regexMatch = subjectNumberRegex.exec(splitName[0]);
            let escapedSubjectName = 'sub' + regexMatch[1];

            if (!combinedFile[escapedSubjectName]) {
                combinedFile[escapedSubjectName] = {};
            }

            combinedFile[escapedSubjectName][filename] = contents;
        }

        function searchForFormattedFiles(indir) {
            return new Promise( (resolve, reject) => {
                let behaviorMatchString = indir + sep + '*+(_behavior)*';
                let connMatchString = indir + sep + '*+(conn)+([0-9])*';
                
                let behaviorPromise = bis_genericio.getMatchingFiles(behaviorMatchString);
                let connPromise = bis_genericio.getMatchingFiles(connMatchString);

                return Promise.all([ behaviorPromise, connPromise ]).then( (obj) => {
                    let behaviorFiles = obj[0], connFiles = obj[1];
                    if (behaviorFiles.length === 0 && connFiles.length === 0) {
                        resolve(false);
                    } else {
                        resolve({ 'behaviorFiles' : behaviorFiles, 'connFiles' : connFiles });
                    }
                }).catch( (e) => { console.log('An error occured while searching for files', e); reject(e); });
            });
            
        }

        function searchForUnformattedFiles(indir) {
            return new Promise( (resolve, reject) => {
                let dataMatchstring = indir + sep + '(.*?)_.*.txt';
                let csvMatchstring = indir + sep + '.*.csv';

                let dataPromise = bis_genericio.getMatchingFiles(dataMatchstring);
                let csvPromise = bis_genericio.getMatchingFiles(csvMatchstring);

                return new Promise.all([ dataPromise, csvPromise ]).then( (obj) => {
                    let dataFiles = obj[0], connFiles = obj[1];
                    if (dataFiles.length === 0 || connFiles.length === 0) {
                        reject('No unformatted files found in directory', indir);
                    } else {
                        resolve({ 'dataFiles' : dataFiles, 'connFiles' : connFiles });
                    }
                }).catch( (e) => { console.log('An error occured while searching for files', e); reject(e); });
            });
        }
    }

}

module.exports = MakeConnMatrixFileModule;