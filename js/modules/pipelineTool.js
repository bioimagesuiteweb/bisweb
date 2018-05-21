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

const io = require('bis_genericio');

let endASCII = 'z'.charCodeAt(0);

/**
 * Takes a series of actions and forms a sequence parseable by 'make'. 
 * 
 * @param {String} filename - Name of file containing JSON that specifies the inputs, outputs, and jobs
 */
let makePipeline = function (filename) {
    io.read(filename).then((file) => {
        console.log('file', typeof (file));
        let parsedFile;
        try {
            parsedFile = JSON.parse(file.data);
        } catch (e) {
            console.log('Could not parse file', e);
            parsedFile = file;
            console.log('parsedFile', file);
        }


        //--------------------------------------------------------------------------------------------------------
        // Scan input file for proper formatting
        //--------------------------------------------------------------------------------------------------------
        
        //check to see if appendText for each job is unique
        let appendTexts = {};
        for (let job of parsedFile.jobs) {
            let appendText = job.appendText;

            if (!appendTexts[appendText]) { 
                appendTexts[appendText] = { 'text' : appendText, 'job' : job.command };
            } else {
                console.log('Error: appendTexts of jobs must be unique. Jobs', appendTexts[appendText].job, 'and', job.command, 'have same appendText.');
            }
        }

        let expandedVariables = {};

        for (let job of parsedFile.jobs) {
            let variablesReferencedByCurrentJob = []; //variables resolved in scope of current job are used to generate output names appropriate to the current job
            let inputsUsedByJob = [];
            let outputsGeneratedByJob = [];
            let variablesWithDependencies = [];

            //each job should output a list of commands with inputs, outputs, and dependencies
            let formattedJobOutputs = [];


            //construct array of variables from array of options
            let optionsArray = job.options.split(' ');
            for (let option of optionsArray) {

                //add a key to the expanded variable map for each variable specified in the job's options
                //variables are denoted as keys of variables specified in JSON surrounded by '%'. 
                if (option.charAt(0) === '%' && option.charAt(option.length - 1) === '%') {
                    let variableName = stripVariable(option);
                    variablesReferencedByCurrentJob.push(variableName);
                    if (!expandedVariables[variableName]) expandedVariables[variableName] = [];
                }
            }

            //expand variable names into arrays
            for (let variableName of variablesReferencedByCurrentJob) {

                //find appropriate entry in variables specified in JSON
                for (let j = 0; j <= parsedFile.variables.length; j++) {

                    //return an error if we reach the end without finding the variable
                    if (j === parsedFile.variables.length) {
                        console.log('Variable ' + variableName + ' is not contained in the file ' + filename);
                        return false;
                    }

                    if (parsedFile.variables[j].name === variableName) {
                        let variable = parsedFile.variables[j];
                        
                        //a variable with its files specified should be added to the dictionary of expanded variables
                        //the fact that its files are present already also indicates that it is an input 
                        if (parsedFile.variables[j].files && expandedVariables[variableName].length === 0) {
                            expandedVariables[variableName] = parsedFile.variables[j].files;
                            inputsUsedByJob.push({ 'name' : variableName, 'index' : j});
                        } 
                        
                        //expand list of dependencies, if necessary.
                        else if (parsedFile.variables[j].depends) {
                            variablesWithDependencies.push({ 'name': variableName, 'index': j });
                        }

                        j = parsedFile.variables.length + 1;
                    }
                }
            }

            //expand dependencies into lists of files if necessary and parse variables used by the job into input and output
            //note that an input is any variable that has its file list available to the job (this relies on jobs being specified in the order in which they run in the JSON file)
            let numOutputs;
            for (let variable of variablesWithDependencies) {

                //if names have already been generated then the output is produced by a node upstream, so don't overwrite the names
                if (expandedVariables[variable.name].length === 0) {
                    let dependencies = parsedFile.variables[variable.index].depends;
                    let fileExtension = parsedFile.variables[variable.index].extension;
                    for (let dependency of dependencies) {
                        dependency = stripVariable(dependency);

                        if (!expandedVariables[dependency]) {
                            console.log("Error: dependency", dependency, "cannot be resolved by job", job.command);
                            return false;
                        }

                        //a variable will either contain one reference or many. 
                        //if multiple are specified then exactly that many outputs will be produced -- it is expected that variables are specified in only one amount different than 1 
                        if (expandedVariables[dependency].length > 1) {
                            numOutputs = expandedVariables[dependency].length;
                        }

                    }

                    //generate output names
                    let outputFilenames = [], currentASCII = 'a';
                    for (let i = 0; i < numOutputs; i++) {
                        let outputFilename = currentASCII + '_' + job.appendText + '.nii.gz';
                        outputFilenames.push(outputFilename);
                        currentASCII = getNextASCIIChar(currentASCII);
                    }

                    expandedVariables[variable.name] = outputFilenames;
                    outputsGeneratedByJob.push(variable);
                } else {
                    inputsUsedByJob.push(variable);
                }
            }


            console.log('expandedVariables', expandedVariables);
            //replace entry in optionsArray with appropriate expanded variable
            for (let i = 0; i < optionsArray.length; i++) {
                let option = optionsArray[i];
            
                if (option.charAt(0) === '%' && option.charAt(option.length-1) === '%') {
                    let variable = stripVariable(option);
                    optionsArray[i] = expandedVariables[variable];
                }

            }

            //construct the inputs, outputs, and command in the way that make expects
            for (let i = 0; i < numOutputs; i++) {
                let commandArray = [], formattedJobOutput = { 'inputs' : [], 'outputs' : [], 'command' : undefined};
                for (let option of optionsArray) {
                    //add appropriate entry from expanded variable if necessary
                    let expandedOption = Array.isArray(option) ? ( option.length > 1 ?  option[i] : option[0]) : option;
                    commandArray.push(expandedOption);
                }

                inputsUsedByJob.forEach( (input) => {
                    input = expandedVariables[input.name].length > 1 ? expandedVariables[input.name][i] : expandedVariables[input.name][0];
                    formattedJobOutput.inputs.push(input);
                });

                outputsGeneratedByJob.forEach( (output) => {
                    output = expandedVariables[output.name].length > 1 ? expandedVariables[output.name][i] : expandedVariables[output.name][0];
                    formattedJobOutput.outputs.push(output);
                });

                formattedJobOutput.command = commandArray.join(' ');
                formattedJobOutputs.push(formattedJobOutput);
            }

            
            console.log('formatted commands', formattedJobOutputs);

        }


    }).catch((e) => { console.log('An error occured', e); });

};

/*
let makeNetwork = function(obj) {
    let pipeline = [], lastPipelineNode;
    let currentOutputName = 'z';

    //create the node in the pipeline corresponding to the current module or collection of modules
    for (let mod of mods) {

        let pipelineNode = {
            'inputs' : [],
            'dependencies': [],
            'outputs': []
        };

        if (pipeline.length === 0) {

            //parse firstInputs and create the first node
            if (!(firstInputs instanceof Array)) {
                firstInputs = [firstInputs];
            }

            pipelineNode.inputs = firstInputs;

        } else {

            pipelineNode.dependencies = lastPipelineNode.outputs;
            pipelineNode.inputs = lastPipelineNode.outputs;
        }

        //parse each module specified in mod and feed their outputs as dependencies for the next module
        if (!(mod instanceof Array)) mod = [mod];
        for (let m of mod) {
            let parsedModule = modules.getModule(m)
            let desc = parsedModule.createDescription();
            for (let output of desc.outputs) {
                currentOutputName = getNextASCIIChar(currentOutputName);
                let outname = currentOutputName + getFileExtension(output.type);
                pipelineNode.outputs.push(outname);
            }
        }

        lastPipelineNode = pipelineNode;
        pipeline.push(pipelineNode);
    }

    return pipeline;
}
*/
let stripVariable = function (variable) {
    return variable.slice(1, variable.length - 1);
};

let getNextASCIIChar = function (a) {
    let ASCIICode = a.charCodeAt(a.length - 1);
    if (ASCIICode === endASCII) return 'a'.concat(a);

    return String.fromCharCode(ASCIICode + 1);
};

let getFileExtension = function (type) {
    switch (type) {
        case 'image': return '.nii.gz';
        case 'matrix': return '.matr';
        case 'transform':
        case 'transformation': return '.grd';
    }
};


module.exports = {
    makePipeline: makePipeline
};
