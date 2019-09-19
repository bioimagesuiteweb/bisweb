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
            }, {
                "name" : "Reformatted input directory",
                "description" : "Where to put reformatted input files",
                "priority"  : 4,
                "advanced" : false,
                "gui" : "text",
                "varname" : "reformatindir",
                "shortname" : "d",
                "required" : false,
                "default" : false
            }
        ],
        };

        return des;
    }

    directInvokeAlgorithm(vals) {
        const sep = path.sep;
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
            searchForFormattedFiles(indir).then( async (result) => {
                if (!result) {

                    //TODO: Write help document for this behavior
                    //if there's no formatted files try looking for the unformatted files (.txt files with a single csv)
                    searchForUnformattedFiles(indir).then( async (obj) => {
                        if (!obj.behaviorFiles) { console.log('Error: could not find connectivity behavior files in', indir, '. Please ensure that there is a .csv file containing the list of behaviors by subject.'); }
                        if (!obj.dataFiles) { console.log('Error: could not find connectivity data files in', indir, '. Please ensure that there are .txt files containing the data for each subject.'); }

                        let reformattedIndir = vals.reformattedindir ? vals.reformattedindir : indir + sep + 'reformattedData';
                        await bis_genericio.makeDirectory(reformattedIndir);

                        let promiseArray = [];
                        //parse the single behavior file into many files
                        for (let file of obj.behaviorFiles) {
                            let conndata = await bis_genericio.read(file);
                            let parsedData = conndata.data.split(/\n/);
                            parsedData = parsedData.filter( (row) => { return row !== ''; }); //strip out empty entries

                            //first row is descriptions so trim it out
                            parsedData.shift();
                            for (let row of parsedData) {
                                let splitChar = row.includes(',') ? ',' : '\t';
                                let splitRow = row.split(splitChar), subname = splitRow.shift();

                                let formattedBehaviorFilename = reformattedIndir + sep + subname + '_behaviors.csv';
                                let behaviorFilePromise = bis_genericio.write(formattedBehaviorFilename, splitRow.join(splitChar));
                                promiseArray.push(behaviorFilePromise);
                            }
                        }

                        //TODO: handle cases where there's more than one subject? data i've got so far only contains one-per
                        // -Zach
                        for (let file of obj.dataFiles) {
                            let filedata = await bis_genericio.read(file), readdata = filedata.data;
                            if (readdata.includes('\t')) { readdata.replace('\t', ','); }

                            //get subject name from filename (subject name should be the first thing in front of an underscore at the end of the path)
                            let subname = bis_genericio.getBaseName(file).split('_')[0];
                            let dataFilename = reformattedIndir + sep + subname + '_conn01.csv';
                            let dataFilePromise = bis_genericio.write(dataFilename, readdata);
                            promiseArray.push(dataFilePromise);
                        }

                        Promise.all(promiseArray).then( () => {
                            console.log('Done converting files, moving on to read'); 
                            searchForFormattedFiles(reformattedIndir).then( (result) => {
                                createConnectivityFile(result.behaviorFiles, result.connFiles, resolve, reject);
                            });
                        });

                    }).catch( (e) => { reject(e); });
                } else {
                    try {
                        createConnectivityFile(result.behaviorFiles, result.connFiles, resolve, reject);
                    } catch(e) {
                        reject(e);
                    }

                }
            }).catch((e) => {
                reject(e.stack);
            });

        });

        function createConnectivityFile(behaviorFiles, connFiles, resolve, reject) {
            let promiseArray = [];
            for (let file of behaviorFiles.concat(connFiles)) {
                let readPromise = bis_genericio.read(path.resolve(file)).then((contents) => {
                    addEntry(bis_genericio.getBaseName(file), contents.data);
                });

                promiseArray.push(readPromise);
            }

            Promise.all(promiseArray).then(() => {
                if (vals.writeout) {
                    bis_genericio.write(outdir, JSON.stringify(combinedFile, null, 2)).then( () => {
                        resolve({ 'file': combinedFile, 'filenames': behaviorFiles.concat(connFiles) });
                        return;
                    });
                } else {
                    resolve({ 'file': combinedFile, 'filenames': behaviorFiles.concat(connFiles) });
                }
            }).catch( (e) => {
                reject(e);
            });
        }

        /* Adds an entry to the combined connectivity file*/ 
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

        /* Searches for files formatted to the connectivity file structure that BioImage Suite expects*/
        function searchForFormattedFiles(indir) {
            return new Promise( (resolve, reject) => {
                let behaviorMatchString = indir + sep + '*+(_behavior)*';
                let connMatchString = indir + sep + '*+(conn)+([0-9])*';
                
                let behaviorPromise = bis_genericio.getMatchingFiles(behaviorMatchString);
                let connPromise = bis_genericio.getMatchingFiles(connMatchString);

                Promise.all([ behaviorPromise, connPromise ]).then( (obj) => {
                    let behaviorFiles = obj[0], connFiles = obj[1];
                    if (behaviorFiles.length === 0 && connFiles.length === 0) {
                        resolve(false);
                    } else {
                        resolve({ 'behaviorFiles' : behaviorFiles, 'connFiles' : connFiles });
                    }
                }).catch( (e) => { console.log('An error occured while searching for files', e); reject(e); });
            });
            
        }

        /* Searches for files that haven't yet been formatted to the connectivity file structure that BioImage Suite expects. */
        function searchForUnformattedFiles(indir) {
            return new Promise( (resolve, reject) => {
                let dataMatchstring = indir + sep + '*.txt';
                let csvMatchstring = indir + sep + '*+(.csv|.tsv)';

                let dataPromise = bis_genericio.getMatchingFiles(dataMatchstring);
                let csvPromise = bis_genericio.getMatchingFiles(csvMatchstring);

                Promise.all([ dataPromise, csvPromise ]).then( (obj) => {
                    let dataFiles = obj[0], connFiles = obj[1];

                    console.log('obj', obj);
                    if (dataFiles.length === 0 || connFiles.length === 0) {
                        reject('No unformatted files found in directory', indir);
                    } else {
                        resolve({ 'dataFiles' : dataFiles, 'behaviorFiles' : connFiles });
                    }
                }).catch( (e) => { console.log('An error occured while searching for files', e); reject(e); });
            });
        }
    }

}

module.exports = MakeConnMatrixFileModule;