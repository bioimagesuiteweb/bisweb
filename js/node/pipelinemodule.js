

const BaseModule = require('basemodule.js');
const bis_genericio = require('bis_genericio');
const BisWebTextObject = require('bisweb_textobject.js');
const path=bis_genericio.getpathmodule();
const fs=bis_genericio.getfsmodule();
const parser = require("jsonlint").parser;
const baseutils=require("baseutils");
// -------------------------------------------------------------------------

// To add a %%inputs%% to specifies all inputs one after the other on the command line
// options "--output %out3% #input#"
// biswebnode concatenateImages --output something.nii.gz MNI_2mm_orig.nii.gz MNI_2mm_resliced.nii.gz MNI_2mm_scaled.nii.gz
// biswebnode concatenateImages --output "something.nii.gz" "MNI_2mm_orig.nii.gz" "MNI_2mm_resliced.nii.gz" "MNI_2mm_scaled.nii.gz"

const longhelptext =`
{
    "command" : "biswebnode",
    "inputs": [
        {
            "name" : "input",
            "files" : [
                "MNI_2mm_orig.nii.gz",
                "MNI_2mm_resliced.nii.gz", 
                "MNI_2mm_scaled.nii.gz"
            ]
        }
    ],
    "jobs": [
        {
            "name": "Smooth",
            "subcommand": "smoothImage",
            "options": "--debug true --input %input% --output %out1%",
            "outputs" : [
                { "name" : "out1",
                  "depends": [  "%input%" ],
                  "suffix": "_smoothed.nii.gz"
                }
            ]
        },
        {
            "name": "Threshold",
            "subcommand": "thresholdImage",
            "options": "--input %out1% --output %out2%",
            "paramfile" : "t.param",
            "outputs" : [
                {
                    "name": "out2",
                    "depends": [ "%out1%" ],
                    "naming": "thresholded_%out1%.nii.gz"

                }
            ]
        },
        {
            "name": "Add",
            "subcommand": "combineImages",
            "options": "--input %input% --second %out2% --output %out3% --mode add --weight1 1.0 --weight2 1.0",
            "outputs" : [
                {
                    "name": "out3",
                    "depends": [ "%out2%" ,"%input%" ],
                    "naming": "%out2%__%input%__added.nii"
                }
            ]
        }
    ]
}`;


//const endASCII = 'z'.charCodeAt(0);

// -------------------------------------------------------------------------
let stripVariable = function (variable) {
    return variable.slice(1, variable.length - 1);
};



/**
 * Takes a series of actions and forms a sequence parseable by 'make'. 
 * 
 * @param {String} pipelineOptions - Data File Input as JSON dictionary
 * @return {String}  The Makefile for the set of jobs (null if failed);
 */
let makePipeline = function(pipelineOptions,odir='',debug=false) {

    if (odir.length<1) {
        console.log('Error: no output directory specified');
        return null;
    }
    
    let defaultCommand = pipelineOptions.command || "";
    
    //--------------------------------------------------------------------------------------------------------
    // Scan input file for proper formatting
    //--------------------------------------------------------------------------------------------------------
    
    //check to see if appendText and name for each job are unique
    // Store jobs in appendTexts
    let names = {};
    for (let job of pipelineOptions.jobs) {
        let name = job.name;// subcommand = job.subcommand || '';
        
        if (!names[name]) {
            names[name] = name;
        } else {
            console.log('Error: names of jobs must be unique. Jobs', job.name, ' is duplicated');
            return null;
        }
    }

    // Rest of code expects .variables so move
    pipelineOptions.variables=pipelineOptions.inputs;
    
    // -------------- replace variable file lists with filenames ---------------
    // ------
    
    console.log('__\n__ Checking for external files in variables');
    for (let variable of pipelineOptions.variables) {
        if (variable.filename) {
            let dat=null;
            try {
                dat=fs.readFileSync(variable.filename, 'utf-8');
            } catch(e) {
                console.log('Failed to read filename '+variable.filename);
                return null;
            }
            
            // Is this a text file
            if (path.extname(variable.filename)==='.txt' ||
                path.extname(variable.filename)==='.TXT' ) {
                    // Text file
                    let lst= dat.split('\n');
                    let fnames=[];
                    for (let i=0;i<lst.length;i++) {
                        let f=lst[i].trim();
                        if (f.length>3) {
                            fnames.push(f);
                        }
                    }
                variable.files=fnames;
                console.log('____ Read ',fnames.length,'filenames from file', variable.filename, ' for variable', variable.name);
            } else {
                // JSON File
                try {
                    let flist=JSON.parse(dat);
                    let fnames=flist.filenames || [];
                    let comment = flist.name || 'no name provided';
                    console.log('____ Read ',fnames.length,'filenames from file', variable.filename, ' for variable', variable.name);
                    console.log('____ Comment = ',comment);
                    variable.files=fnames;
                } catch(e) {
                    try {
                        parser.parse(dat);
                    } catch(f) {
                        console.log('Failed to parse', variable.filename,'error=',f,e);
                    }
                    return null;
                }
            }
        }
    }

    console.log('__');

    // Add more variables from jobs
    // ----------------------------

    let variableNaming={};
    let variableSuffix={};
    
    for (let job of pipelineOptions.jobs) {
        for (let output of job.outputs) {
            pipelineOptions.variables.push({ 'name' : output.name, 'depends': output.depends});
            variableSuffix[output.name]=output.suffix || '';
            if (output.naming === undefined) {
                if (output.suffix === undefined) {
                    console.log(`Must specify either 'naming' or 'suffix' for variable ${output}`);
                    return null;
                }
                variableNaming[output.name]=output.depends.join('__');
            } else {
                variableNaming[output.name]=output.naming;
            }

        }
    }
    //console.log('variables=',JSON.stringify(pipelineOptions.variables,null,2));
    //console.log('Naming=',JSON.stringify(variableNaming,null,2));
    
    let expandedVariables = {};
    
    //inputs, outputs, and formatted commands for EACH command produced by EACH job
    let allJobOutputs = [];
    
    //the commands associated with EACH job in object form { 'job' : [job name], 'outputs' : [output files produced by job]}
    let jobsWithOutputs = [];
    console.log('__ Parsing jobs');
    for (let job of pipelineOptions.jobs) {
        
        //the entry in jobsWithOutputs for this job
        let jobWithOutputs = {
            'name' : job.name,
            'outputs' : [],
            'variableKeyedOutputs' : {},
            'outputsGenerated' : []
        };
        
        let variablesReferencedByCurrentJob = []; //variables resolved in scope of current job are used to generate output names appropriate to the current job
        let inputsUsedByJob = [];
        
        //a variable is generated by a job if the symbolic reference to that variable first appears in that job, e.g. if you have a variable 'out1', if it is first referenced by a job 'job1' then out1 is considered a variable generated by job1
        let variablesGeneratedByJob = [];
        let variablesWithDependencies = [];
        let optionsArray = [];
        
        //construct array of variables from array of options (if applicable)
        if (job.options) {
            optionsArray = job.options.split(' ');
            for (let option of optionsArray) {
                //add a key to the expanded variable map for each variable specified in the job's options
                //variables are denoted as keys of variables specified in JSON surrounded by '%' or '#'. 
                if (( option.charAt(0) === '%' && option.charAt(option.length - 1) === '%') || option.charAt(0) === '#' && option.charAt(option.length - 1) === '#') {
                    let variableName = stripVariable(option);
                    variablesReferencedByCurrentJob.push(variableName);
                    if (!expandedVariables[variableName]) expandedVariables[variableName] = [];
                }
            }
        }

        if (debug)
            console.log('____________________\n__ J O B   N A M E =',job.name,'\n__\n__   All Variables=',variablesReferencedByCurrentJob,'\n__');
        
        //expand variable names into arrays

        for (let variableName of variablesReferencedByCurrentJob) {

            //console.log('.... Looking for variableName=',variableName,' referenced by current job',job.name);
            //find appropriate entry in variables specified in JSON
            for (let j = 0; j <= pipelineOptions.variables.length; j++) {
                
                //return an error if we reach the end without finding the variable
                if (j === pipelineOptions.variables.length) {
                    console.log('Variable ' + variableName + ' is not contained in the file ');
                    return null;
                }
                
                if (pipelineOptions.variables[j].name === variableName) {

                    
                    //a variable with its files specified should be added to the dictionary of expanded variables
                    //the fact that its files are present already also indicates that it is an input 
                    if (pipelineOptions.variables[j].files) { 
                        expandedVariables[variableName] = pipelineOptions.variables[j].files;
                        inputsUsedByJob.push({ 'name' : variableName, 'index' : j});
                    } else if (pipelineOptions.variables[j].depends) {
                        //expand list of dependencies, if necessary.
                        variablesWithDependencies.push({ 'name': variableName, 'index': j });
                    } else {
                        console.log('____ Not Adding variableName as depenency',variableName);
                        //console.log("Files=",pipelineOptions.variables[j].files);
                        console.log("Expanded=",expandedVariables[variableName]);
                    }
                    j+= pipelineOptions.variables.length + 1;
                }
            }
        }
        
        //expand dependencies into lists of files if necessary and parse variables used by the job into input and output
        //note that an input is any variable that has its file list available to the job (this relies on jobs being specified in the order in which they run in the JSON file)
        
        //determine the number of commands to produce for the job based on the variables, e.g. if a variable contains five names five commands should be produced
        //note that a variable that does not contain one name will contain exactly the same number of names as any other variable that does not specify one name, e.g. %output1% will always have the same number of names as %output2%
        let numOutputs = 1, listMatches = {};
        for (let key of variablesReferencedByCurrentJob) {
            //options with the list designator (#{name}#) should be counted as one input, so we should ignore them here
            let listMatchString = new RegExp('#(' + key + ')#', 'g');
            let listMatch = listMatchString.exec(job.options);
            if (listMatch) { 
                listMatches[key] = listMatch; 
            } else if (expandedVariables[key].length > numOutputs) {
                numOutputs = expandedVariables[key].length;
            }
        }
        

        
        //variables with lower indices precede variables with higher indexes in the job hierarchy, and may therefore be variables that determine how the higher-indexed jobs are generated.
        //by this logic, we want to make sure we process the lower indexed jobs first (sort in ascending order by index) to ensure that higher-indexed jobs have the relevant information on how they are generated
        variablesWithDependencies.sort( (a,b) => { return a.index - b.index; });
        console.log('__\t variables with dependencies for job', job.name, variablesWithDependencies);
        for (let variable of variablesWithDependencies) {
            //console.log('\n\n-----------------------------\n');
            //if names have already been generated then the output is produced by a node upstream, so don't overwrite the names
            if (expandedVariables[variable.name].length === 0) {
                let dependencies = pipelineOptions.variables[variable.index].depends;
                let tn= variableNaming[variable.name]+variableSuffix[variable.name];
                if (debug)
                    console.log('__   Output variable: '+variable.name+'\n__\t Dependencies='+dependencies+'\n__\t Naming: '+tn);
                for (let dependency of dependencies) {
                    dependency = stripVariable(dependency);
                    //console.log('Processing dependency=',dependency);
                    if (!expandedVariables[dependency]) {
                        console.log("Error: dependency", dependency, "cannot be resolved by job", job);
                        return null;
                    }
                }

                let outputFilenames = [];
                for (let i = 0; i < numOutputs; i++) {
                    
                    let outname= variableNaming[variable.name]+variableSuffix[variable.name];
                    
                    outname=outname.trim().replace(/ /g,'-');
                    //console.log('inputs used by job', inputsUsedByJob);
                    inputsUsedByJob.forEach( (input) => {

                        if (listMatches[input.name]) {
                            //mark entry as a list
                            input.isList = true;
                            let filename = expandedVariables[input.name][0];
                            let splitString = filename.split('/');
                            let basename = splitString[splitString.length - 1];
                            let matchString = new RegExp('%' + input.name + '%');
                            
                            //need to trim off outname's .nii.gz to avoid having two
                            basename = outname.replace(matchString, basename);
                            splitString[splitString.length - 1] = basename;
                            outname = splitString.join('/');
                            //console.log('outname', outname, basename);
                        } else {
                            let marker=`%${input.name}%`;
                            let ind=outname.indexOf(marker);
                            if (ind>=0) {
                                //  console.log('Found ',ind);
                                let fn=(expandedVariables[input.name].length > 1 ? expandedVariables[input.name][i] : expandedVariables[input.name][0]);
                                let lst=fn.split('.');
                                if (lst[lst.length-1]==='gz')
                                    lst.pop();
                                lst.pop();
                                let fname=lst.join('.');
                                fname=fname.trim().replace(/__/g,'_');
                                let l=marker.length;
                                let o=outname;
                                fname=path.basename(fname);
                                outname=o.substr(0,ind)+fname+o.substr(ind+l,o.length);
                            }
                        } 
                    });

                    let outputFilename = path.join(odir, path.basename(outname));
                    outputFilenames.push(outputFilename);

                    if (debug)
                        console.log('__ \t created name for '+(i+1)+' --> '+outputFilename);
                }

                expandedVariables[variable.name] = outputFilenames;
                variablesGeneratedByJob.push(variable);
            } else {
                inputsUsedByJob.push(variable);
            }
        }
        
        //replace entry in optionsArray with appropriate expanded variable
        for (let i = 0; i < optionsArray.length; i++) {
            let option = optionsArray[i];
            
            //console.log('expanded variables', option, expandedVariables[stripVariable(option)]);
            if (option.charAt(0) === '#' && option.charAt(option.length-1) === '#') {
                let variable = stripVariable(option);
                optionsArray[i] = expandedVariables[variable].join(' ');
            } else if (option.charAt(0) === '%' && option.charAt(option.length-1) === '%' ) {
                let variable = stripVariable(option);
                optionsArray[i] = expandedVariables[variable];
            }
            
        }


        //construct the inputs, outputs, and command in the way that 'make' expects
        for (let i = 0; i < numOutputs; i++) {

            let commandArray = [], formattedJobOutput = { 'inputs' : [], 'outputs' : [], 'command' : undefined };
            for (let option of optionsArray) {
                //add appropriate entry from expanded variable if necessary
                let expandedOption = Array.isArray(option) ? ( option.length > 1 ?  option[i] : option[0]) : option;
                commandArray.push(expandedOption);
            }
            
            inputsUsedByJob.forEach( (input) => {
                //console.log('input', input);
                //if list is included then combine all the inputs
                if (input.isList) {
                    input = expandedVariables[input.name];
                } else {
                    input = expandedVariables[input.name].length > 1 ? expandedVariables[input.name][i] : expandedVariables[input.name][0];
                }
                formattedJobOutput.inputs.push(input);
            });
            
            variablesGeneratedByJob.forEach( (output) => {
                let varname = output.name;
                output = expandedVariables[output.name].length > 1 ? expandedVariables[output.name][i] : expandedVariables[output.name][0];
                formattedJobOutput.outputs.push(output);
                jobWithOutputs.outputs.push(output);
                let keyedOutput = jobWithOutputs.variableKeyedOutputs;
                if (!keyedOutput[varname]) {
                    keyedOutput[varname] = [output];
                    jobWithOutputs.outputsGenerated.push(varname);
                } else {
                    keyedOutput[varname].push(output);
                }
            });
            
            //command can either be the default command, the command specified for the set of jobs, or the command specified for an individual job.
            //the command for an individual job takes highest precedence, then the command for the set, then the default.
            let command = job.command ? job.command : defaultCommand;
            let subcommand = job.subcommand ? job.subcommand : '';
            let paramfile = job.paramfile || '';
            if (paramfile.length>0) {
                formattedJobOutput.inputs.push(paramfile);
                paramfile=' --paramfile '+paramfile;
             
            }
            
            //console.log('command', command, subcommand, commandArray);
            formattedJobOutput.command = command + ' ' + subcommand + ' ' + commandArray.join(' ')+paramfile;
            allJobOutputs.push(formattedJobOutput);
        }
        
        jobsWithOutputs.push(jobWithOutputs);
    }


    let joblist=[];
    console.log('__\n____________________\n__ C r e a t i n g   M a k e f i l e\n__');

    let makefile = '#-----------------------------------------------\n#\n';
    makefile+="# All Jobs\n#\nall : ";
    for (let job of jobsWithOutputs) {
        makefile = makefile + job.name + ' ';
        joblist.push(job.name);
    }
    makefile+="\n\n";

    console.log('__ Added: make all');
    
    let resultsfile = { 'Outputs': [] };
    

    let outjson={};
    //add 'make [job]' for each job
    for (let job of jobsWithOutputs) {
        //        console.log('job', job);
        let name = job.name;
        outjson[name]=[];
        makefile +='#-----------------------------------------------\n#\n';
        makefile += '# execute job '+name+'\n#\n';
        makefile +=  name + ' : ';

        console.log('__ Added: make '+name);
        
        let res= { 'name' : name , 'filenames' : [] };

        
        for (let output of job.outputs) {
            makefile += output + ' ';
            res.filenames.push(output);
            outjson[name].push(output);
        }
        makefile += '\n\n';
        resultsfile['Outputs'].push(res);
    }

    makefile +='#-----------------------------------------------\n#\n';
    makefile +='# Create individual output files\n#\n';
    //make the rest of the commands with job names set to the name of outputs
    let onames='';
    //let tempnames='';
    if (debug)
        console.log('__ Adding output file commands');
    for (let o of allJobOutputs) {

        for (let i=0;i<o.outputs.length;i++) {
            let output=o.outputs[i];
            if (i===0) {
                let outlog=output+'__results.txt';
                makefile += output + ' : ' + o.inputs.join(' ') + '\n\t' + o.command + ' > '+outlog +' 2>&1 \n\n';
                onames=onames+' '+output+' '+outlog;
                if (debug)
                    console.log('__ \t Added command for '+output+'\n__\t\t dep=',o.inputs.join(' '));
            } else {
                makefile += output + ' : ' + o.outputs[0] + '\n\n';
                if (debug)
                    console.log('__ \t Added dummy command for '+output+'\n\t\t dep='+o.outputs[0]);
            }
        }

    }

    //add 'make clean'
    console.log('__ Added: make clean');
    makefile += '#----------------------------------- \n# clean all outputs\n#\n';
    makefile = makefile + 'clean:\n\t rimraf '+onames+'\n\n';

    let log=JSON.stringify(resultsfile,null,4).split("\n");

    makefile+='\n#----------------------------------- \n# log output files\n#\n';
    makefile+= "log : \n\t @echo ''; echo ''; echo ''; ";
    for (let i=0;i<log.length;i++) {
        makefile+=`echo '${log[i]}'; `;
    }
    makefile+="echo ' '\n";
    console.log('__ Added: make log');

    makefile+='\n#----------------------------------- \n# log output files (windows)\n#\n';
    makefile+= "logwin : \n\t @echo -- &";
    for (let i=0;i<log.length;i++) {
        makefile+=`echo ${log[i]}& `;
    }
    makefile+="\n";
    console.log('__ Added: make logwin');


    makefile+='\n#----------------------------------- \n# list of jobs \n#\n';
    makefile+= "list : \n\t @echo "+joblist.join(" ")+"\n";
    console.log('__ Added: make list');
    console.log('__');
    return [ makefile, outjson ] ;
};


/*let getFileExtension = function (type) {
    switch (type) {
        case 'image': return '.nii.gz';
        case 'matrix': return '.matr';
        case 'transform':
        case 'transformation': return '.grd';
    }
};*/



// -----------------------------------------------------------------------------------------------------

class PipelineModule extends BaseModule {
    constructor() {
        super();
        this.name = 'MakePipeline';
    }

    createDescription() {

        return {
            "name": "Create Pipeline file",
            "description": "This module creates a makefile from a pipeline json file. Use --sample true to get an example pipeline file",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs": [
                {
                    'type': 'text',
                    'shortname' : 'o',
                    'name': 'Results',
                    'description': 'output makefile',
                    'varname': 'output',
                    'required': true,
                    'extension': '.txt'
                },
                {
                    'type': 'text',
                    'shortname' : 'l',
                    'name': 'Results',
                    'description': 'output log file',
                    'varname': 'outlog',
                    'required': false,
                    'extension': '.json'
                },
            ],
            "buttonName": "Execute",
            "shortname": "info",
            "params": [
                {
                    "name": "input",
                    "shortname" : "i",
                    "description": "Name of the input filename",
                    "advanced": false,
                    "type": "string",
                    "varname": "input",
                    "default": ""
                },
                {
                    "name": "odir",
                    "shortname" : "d",
                    "description": "Output directory",
                    "advanced": false,
                    "type": "string",
                    "varname": "odir",
                    "default": ""
                },
                {
                    "name": "sample",
                    "description": "Produce sample file",
                    "advanced": false,
                    "type": "boolean",
                    "varname": "sample",
                    "default": false,
                },
                {
                    "name": "unixstyle",
                    "description": "Uses unix separators",
                    "advanced": true,
                    "type": "boolean",
                    "varname": "unixstyle",
                    "default": false,
                },
                baseutils.getDebugParam()
            ]
        };
    }

    directInvokeAlgorithm(vals) {

        
        return new Promise((resolve, reject) => {

            let inp=vals.input || '';
            
            if (vals.sample || inp.length<1 ) {
                console.log('____ No input file specified, here is a sample input file');
                console.log(longhelptext);
                console.log('\n\n');
                reject('');
                return;
            }

            vals.odir=vals.odir || '';
            if (vals.odir.length<1) {
                console.log('____ No output directory specified, specify this using the --odir flag');
                reject('');
                return;
                
            }

            let p=Promise.resolve('Not creating');
            if (vals.odir!=='none') {
                vals.odir = path.resolve(path.normalize(vals.odir));
                p=bis_genericio.makeDirectory(vals.odir);
            }
            p.then( (m) => {
                if (vals.odir==='none') {
                    console.log('---- Not creating dummy directory none');
                } else {
                    let d=path.resolve(path.normalize(vals.odir));
                    if (m)
                        console.log('++++ Created output directory',d);
                    else
                        console.log('++++ Output directory',d,'already exists, use with care.');
                }
                
                bis_genericio.read(vals.input).then( (obj) => {
                    let dat=null;
                    try { 
                        dat=JSON.parse(obj.data);
                    } catch(e) {
                        try {
                            parser.parse(obj.data);
                        } catch (f) {
                            reject(f);
                        }
                        reject(e);
                        return;
                    }
                    let out_arr=makePipeline(dat,vals.odir,vals.debug);

                    let out=out_arr[0];
                    //console.log(out_arr[1]);
                    
                    if (vals.unixstyle) {
                        out=out.replace(/\\\\/g,'/');
                        out=out.replace(/\\/g,'/');
                    }
                    if (out!==null) {
                        this.outputs['output']=new BisWebTextObject(out);
                        this.outputs['output'].forceTextSave(); // No JSON!
                        this.outputs['outlog']=new BisWebTextObject(out_arr[1]);
                        resolve();
                    } else {
                        reject('Something went wrong');
                    }
                }).catch( (e) => {
                    console.log('Error',e,e.stack);
                    reject(e);
                });
            }).catch( (e) => { 
                console.log('Error',e,e.stack);
                reject(e);
            });
        });
    }

}

module.exports = PipelineModule;
