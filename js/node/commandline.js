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

"use strict";

const program = require('commander');
const modules = require('nodemoduleindex.js');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const baseutils = require('baseutils');
const genericio=require('bis_genericio');
const biswrap = require('libbiswasm_wrapper');
const boldon = "";
const boldoff = "";

//Image processing functions are expected to be templated as Promises.
let initialError = function (extra) {
    console.log(`${extra}\nUsage: bisweb modulename [ options ].\n`);
    console.log(` Type 'node bisweb [function name] --help' for more information`);
    let outstring = modules.getModuleNames().join("\n");

    console.log('\tThe list of available modules is :\n', outstring);
};

/**
 * Attaches the flags and parameters to an instance of commander and returns the instance. 
 * Should be called only from command line scripts.
 * @alias CommandLine.attachFlags
 * @param {Module} module -- the module to add 
 * @param {Commander} cmd commander.js instance
 * @return cmd with additional flags
 */

let attachFlags = function (module, cmd) {

    cmd = cmd || null;
    /* jshint ignore:start */
    let des = module.getDescription();
    let lst = [des.params, des.inputs, des.outputs];
    for (let i = 0; i <= 2; i++) {

        lst[i].forEach((param) => {
            let shortname = "";
            if (param.shortname !== undefined)
                shortname = `-${param.shortname} `;

            let optdesc = "";
            let bstr = '[';
            let estr = ']';

            let required = param.required;
            if (required === false)
                optdesc = "(optional) ";
            if (required === true) {
                bstr = '<';
                estr = '>';
            }

            if (param.type === "float")
                cmd = cmd.option(`${shortname}--${param.varname.toLowerCase()} ${bstr}n${estr}`, optdesc + param.description, parseFloat);
            else if (param.type === "int")
                cmd = cmd.option(`${shortname}--${param.varname.toLowerCase()} ${bstr}n${estr}`, optdesc + param.description, parseInt);
            else
                cmd = cmd.option(`${shortname}--${param.varname.toLowerCase()} ${bstr}s${estr}`, optdesc + param.description);
        });
    }
    /* jshint ignore:end */
};


/** Invoke a module with arguments
 * @param{Sting} toolname - the name of the tool
 * @param{array} args - the argument array to be parsed
 * @alias CommandLine.loadParse
 */
let loadParse = function (args, toolname,basedirectory='') {

    toolname= toolname || "";

    return new Promise((resolve, reject) => {
        if (args.length < 1) {
            initialError('Specify the tool to load ...');
            return 1;
        }

        let mod = modules.getModule(toolname);
        if (!mod) {
            if (toolname.length>2) 
                initialError(`\n---- The module ${toolname} does not exist`);
            else
                initialError(`\n---- No module specified`);
            return 1;
            
        }


        // cmd = a commander object
        //      
        program.version('1.0.0');
        attachFlags(mod, program);
        program
            .option('--paramfile [s]', 'Specifies that parameters should be read from a file as opposed to parsed from the command line.')
            .option('--silent', 'Run in silent mode (no output on the console)')
            .on('-h, --help', function () {
                console.log('This program is part of the commandline suite of tools from BioImage Suite Web. See https://github.com/bioimagesuiteweb/bisweb for more information.\n');
            });

        let ln = args.length;
        let outargs = [];
        for (let i = 0; i < ln; i++) {
            let t = parseFloat(args[i]);
            if (!isNaN(parseFloat(t, 10)) && t < 0.0)
                outargs.push(" " + args[i]);
            else
                outargs.push(args[i]);
        }
        program.parse(outargs);

        let objinputs=mod.getDescription().inputs;
        let max=3;
        if (objinputs.length<1)
            max=2;
        
        if (args.length < max ) {
            console.log("---- Not enough arguments passed to run this tool");
            program.help();
            reject("");
        }


        if (program.silent) console.log = function () { };


        //---------------------------------------------------------------------------------------------------------------
        //  Uninteractive Parser
        //---------------------------------------------------------------------------------------------------------------
        let loadedArguments = {};

        let readparam=Promise.resolve();
        
        if (program.paramfile) {
            console.log('++++ Reading Parameter file',basedirectory+program.paramfile);

            readparam= new Promise( (resolve,reject) => {
                
                genericio.read(basedirectory+program.paramfile).then( (obj) => {
                    let content=obj.data;
                    let parsedContent='';
                    try {
                        parsedContent = JSON.parse(content);
                    } catch (e) {
                        console.log("Error: 'load' could not parse JSON. \n", e);
                        reject(e);
                    }
                    //check if .json file is meant for this function
                    if (toolname.toLowerCase() === parsedContent.module.toLowerCase()) {
                        loadedArguments = parsedContent.params;
                        resolve();
                    } else {
                        let e = ('error: JSON tool name does not match the selected function');
                        console.log(e);
                        reject(e);
                    }
                });
            });
        }


        readparam.then( () => {
            // Parse From Command Line
            mod.loadInputs(program,basedirectory).then( () => {
                console.log('oooo\noooo Loaded all inputs.');
                let modArguments = mod.parseValuesAndAddDefaults(program, loadedArguments);
                console.log('oooo\noooo Parsed :',JSON.stringify(modArguments));
                if (mod.typeCheckParams(modArguments)) {
                    console.log('oooo\noooo Invoking module', mod.getDescription().name, '....');
                    mod.directInvokeAlgorithm(modArguments).then(() => {
                        console.log('oooo -------------------------------------------------------');
                        mod.storeCommentsInOutputs(args.join(" "),modArguments,baseutils.getSystemInfo(biswrap));
                        mod.saveOutputs(program).then((m) => {
                            if (m.length>0)
                                console.log('oooo\noooo Saved outputs.');
                            resolve( 'Done Saving');
                        }).catch((e) => {
                            reject('An error occured saving'+e);
                        });
                    }).catch((e) => {
                        reject('---- Failed to invoke algorithm'+e);
                    });
                } else {
                    reject('---- Type checking of Arguements failed');
                }
            });
        }).catch((e) => {
            console.log('error');
            reject('----- Bad param filename '+e);
        });
    });
};


/** Process the result of a test
 * @param{Sting} toolname - the name of the tool
 * @param{String} resultFile - the filename of the output file
 * @param{String} test_target - the filename of the gold standard file
 * @param{String} test_type - the type of object we re testing (image,matrix,transform)
 * @param{Number} test_threshold - the threshold below which the test passes 
 * @param{String} test_comparison - one of "ssd" , "maxabs" or "cc" metric to compare objects with
 * @param{Function} cleanupAndExit - a function to call on exit (default =process.exit)
 * @alias CommandLine.processTestResult
 */
let processTestResult = function (toolname, resultFile, test_target, test_type, test_threshold, test_comparison, cleanupAndExit = process.exit) {

    let threshold = test_threshold || 0.01;
    let comparison = test_comparison || "maxabs";
    if (test_type === 'image') {
        if (comparison !== "maxabs" && comparison!=="ssd") {
            comparison = "cc";
        }
    }

    if (test_type === 'matrix' || test_type === "matrixtransform" || test_type === "gridtransform") {
        if (comparison !== "maxabs") {
            comparison = "ssd";
        }
    }

    console.log('====\n============================================================\n');
    console.log(`==== C o m p a r i n g  ${test_type}  u s i n g  ${comparison} and  t h r e s h o l d=${threshold}.\n====`);

    if (test_type === "matrixtransform" || test_type==="gridtransform") {
        test_type="transform";
    }


    Promise.all([
        BisWebDataObjectCollection.loadObject(resultFile,test_type),
        BisWebDataObjectCollection.loadObject(test_target,test_type)]
               ).then( (objs) => {

                   let good="<";
                   let bad=">";
                   let result=objs[0].compareWithOther(objs[1],comparison,threshold);
                   
                   if (result.metric==="cc") {
                       bad=good;
                       good=">";
                   }
                   

                   if (result.testresult) {
                       console.log(`++++\n${boldon}++++  Module ${toolname} test pass.`);
                       console.log(`${boldon}++++    deviation (${result.metric}) from expected: ${result.value} ${good} ${threshold} ${boldoff}`);
                       cleanupAndExit(0);
                   } else {
                       console.log(`-----\n${boldon}---- Module ${toolname} test failed. Module produced output significantly different from expected.`);
                       console.log(`${boldon}----    deviation (${result.metric}) from expected: ${result.value} ${bad} ${threshold} ${boldoff}`);
                       cleanupAndExit(1);
                   }
               }).catch((e) => {
                   console.log('an error occurred', e);
                   cleanupAndExit(1);
               });
};


module.exports = {
    loadParse: loadParse,
    processTestResult: processTestResult
};


