

echo "------------------------------------------"; echo "Creating a_smoothed.nii.gz" ; node bisweb.js smoothImage

blank lines in makefile

all : step1 step2 step3

step1 : a_smoothed.nii.gz b_smoothed c_smoothed

step2 : a_thre b_thre c_thr


TODO: 

add unique names for each job (other than just the name of the command)
    - step1 for example should be the job name

visualize pipeline on tree viewer? 

make job running command (e.g. node bisweb.js ... ) a parameter with reasonable defaults. 
    - this will let you run it on a server, in background, etc. 
    - make it blankable so that people can specify Unix scripts
    - right now job smoothImage results in command node bisweb.js smoothImage --> runnable smoothImage and if runnable is blank dont' add space --> "smoothImage" then it could be gulp build, cp , tar ,zip 


    output directory
    create log files   >& logfile.log 2>&1

output file name generation rule (current way is fine as a default, but there should be alternatives)
    - List of files, i.e. name files exactly as a list of specified filenames
    - Create another output file (Makefile.json?) which specifies the output names for each job

# The Pipeline Tool

The pipeline tool takes a JSON file specifying a set of files, rules, and jobs and creates a file that will allow a user to run the jobs automatically using make. The tool supports only a command line interface currently, but there are plans to extend it to feature a web interface as well.

## How it Works

The pipeline tool can be thought of as a sophisticated macro expander: given a set of input files, jobs, and relationships between inputs and outputs of jobs, it will expand these into a hierarchical series of commands (see sections below for examples of input and output files). The tool itself only creates the relationships. The behavior for running the jobs on the user's machine is provided by [make](https://en.wikipedia.org/wiki/Make_(software)), a build automation tool that has existed since the early days of Unix. 

The following sections will go into detail on how to format an input file, how to use the command line tools, and how to understand the output file. 

### The Input File

Input to the pipeline tool must be provided in the form of a [properly formatted ``.json`` file](https://en.wikipedia.org/wiki/JSON). The table below lists the parameters that this file can contain. 

Parameter | Optional? | Type | Description 
----|----|----|------
variables | No | Array of Objects | The list of the inputs and outputs that the pipeline will use.
jobs | No | Array of Objects | The list of jobs that make up the pipeline.
command | Yes | String | The command to prepend to each job in the absence of a job-specific command. This may be, for example, ``node bisweb.js``.
variables.<i></i>name | No | String | The name of the variable. This is what variables are referenced by symbolically (see the examples at the end of the section).
variables.<i></i>files | Yes | Array of filenames | Files to use for the variable. May either be a list of files or a single file — in the case of a single file the single file will be substituted for each command produced by the job, in the case of a list, each file will be in one command (see the note on one and multiple files at the end of this section).
variables.<i></i>extension | Yes | String | The file extension to append to each output produced for this variable.
variables.<i></i>depends | Yes | Array of Variables | The list of variables on which this variable depends in order to be created. This is what determines the order in which jobs will run and how jobs will be synchronized.
jobs.<i></i>name | No | String | The name of the job. ``make [jobs.name]`` will create all the outputs associated with the job.
jobs.<i></i>command | Yes | String | The command associated with the job, e.g. ``node bisweb.js``. The default job will be substituted in the case that this is not provided. 
jobs.<i></i>subcommand | Yes | String | The subcommand associated with the job, e.g. ``smoothImage``. Depending on the job's command a subcommand may not be necessary. 
jobs.<i></i>appendText | Yes* | String | The text to append to the filename of each output produced by the job. 
jobs.<i></i>rule | Yes† | One of append, etc. etc. | How the output filename is constructed. This does not function currently.
jobs.<i></i>options | Yes | String | The options that will be appended after the subcommand. These are generally bash-style flags, e.g. ``--input, --output, --filename``.



_* denotes an option that is not required in the finished pipeline tool, but is required for the current version_

_† denotes an option that will have an effect in the finished pipeline tool but does not in the current version_

#### A full input file

This is an example of what a full, functional input file might look like.

    {
        "variables": [
        {
            "name" : "input",
            "files" : [
                "MNI_2mm_orig.nii.gz",
                "MNI_2mm_resliced.nii.gz", 
                "MNI_2mm_scaled.nii.gz"
            ]
        },
        {
            "name" : "out1",
            "extension" : ".nii.gz",
            "depends": [
                "%input%"
            ]
        },
        {
            "name": "out2",
            "extension" : ".nii.gz", 
            "depends": [
                "%out1%"
            ]
        },
        {
            "name": "out3",
            "extension": ".grd",
            "depends": [
                "%out2%"
            ]
        }
        ],
        "jobs": [
            {
                "name": "Smooth",
                "subcommand": "smoothImage",
                "rule": "append",
                "appendText": "smoothed",
                "options": "--debug true --input %input% --output %out1%" 
            },
            {
                "name": "Threshold",
                "subcommand": "thresholdImage",
                "rule": "append",
                "appendText": "thresholded",
                "options": "--debug true --input %out1% --output %out2% --low 50 --high 100"
            },
            {
                "name": "Linear",
                "subcommand": "linearRegistration",
                "rule": "append",
                "appendText": "registered",
                "options": "--debug true --reference %input% --target %out2% --output %out3%"
            }
        ]
    }
#### One and multiple files

Consider the following input file: 

    "variables": [
	{
		"name" : "input",
		"files" : [
			"MNI_2mm_orig.nii.gz",
			"MNI_2mm_resliced.nii.gz", 
			"MNI_2mm_scaled.nii.gz"
		]
	},
	{
        "name" : "mask",
		"files": [
			"mask.nii.gz"
		]
	},
    {
        "name" : "out",
        "extension" : ".nii.gz",
        "depends" : [
            "%input%",
            "%mask%"
        ]
    }
    ],
    "jobs": [
		{
			"name": "Mask",
            "command": "node bisweb.js",
			"subcommand": "maskImage",
			"rule": "append",
			"appendText": "masked",
			"options": "--debug true --input %input% --mask %mask% --output %out%" 
		}
    ]

This will produce the following set of commands:

    node bisweb.js maskImage --debug true --input MNI_2mm_orig.nii.gz --mask mask.nii.gz --output a_masked.nii.gz

    node bisweb.js maskImage --debug true --input MNI_2mm_resliced.nii.gz --mask mask.nii.gz --output b_masked.nii.gz

    node bisweb.js maskImage --debug true --input MNI_2mm_scaled.nii.gz --mask mask.nii.gz --output c_masked.nii.gz    


### The Command Line Interface

The command line interface to the pipeline tool is fairly minimal as most of the options for how the pipeline is configured are contained in the input file. It takes the following options: 

Option | Description
----|---
-f, --file | The name of the input file. Note that this should be specified as the full path of the file from the current directory.
-o, --out | The full path for the output file. If none is specified then it will be created with the name 'Makefile' in the directory that invokes the command line tools. 

The command line tools may be invoked as follows (assuming that makePipeline.js is in the working directory)

    node makePipeline.js [options]

### Using make

A properly formatted input file will produce a [Makefile](https://en.wikipedia.org/wiki/Makefile). This can be intimidating to look at for an unfamiliar user, but it is actually fairly simple.

A standard operation (or 'rule' in formal parliance) in a Makefile takes the following form 

    [output] : [dependencies]
        [recipe]

For example, consider the following; 

    a_smoothed.o.nii.gz : MNI_2mm_orig.nii.gz
	    node bisweb.js smoothImage --debug true --input MNI_2mm_orig.nii.gz --output a_smoothed.o.nii.gz

This command will produce a file named a_smoothed.o.nii.gz, depends on the file MNI_2mm_orig.nii.gz to run, and invokes the recipe ``node bisweb.js smoothImage`` with an appropriate set of options to do so. 

The Makefile will contain about half rules of this form and half rules marked by the word ``.PHONY``. This indicates a rule that either does not specify a recipe or is not a make rule at all. Consider the following set of 'rules': 

    .PHONY: all
    all : a_smoothed.o.nii.gz b_smoothed.o.nii.gz c_smoothed.o.nii.gz a_thresholded.o.nii.gz b_thresholded.o.nii.gz c_thresholded.o.nii.gz a_registered.o.grd b_registered.o.grd c_registered.o.grd 

    .PHONY: clean
    clean:
        rm -f *.o.*

    .PHONY: smooth
    smooth : a_smoothed.o.nii.gz b_smoothed.o.nii.gz c_smoothed.o.nii.gz 

    .PHONY: threshold
    threshold : a_thresholded.o.nii.gz b_thresholded.o.nii.gz c_thresholded.o.nii.gz 

    .PHONY: linear
    linear : a_registered.o.grd b_registered.o.grd c_registered.o.grd 

These do the following respectively: 

Name | Function
-|-
all | Invokes the recipes for each of the files specified if they don't already exist. ``make all`` is a very standard operation in a Makefile and is expected to generate all the build files for a given project. 
clean | Removes all files of the form *.o.*, e.g. a_smoothed.o.nii.gz, b_registered.o.grd. This is not actually a make rule at all, but a bash command; however, it can still be invoked using a Makefile. 
smooth | Invokes the recipes for each of the files specified if they don't already exist. Similar to ``make all`` except in which files it generates. 
threshold | See above.
linear | See above.

#### A full Makefile

The following Makefile would be produced by [the input in the section above](#a-full-input-file).

    .PHONY: all
    all : a_smoothed.o.nii.gz b_smoothed.o.nii.gz c_smoothed.o.nii.gz a_thresholded.o.nii.gz b_thresholded.o.nii.gz c_thresholded.o.nii.gz a_registered.o.grd b_registered.o.grd c_registered.o.grd 

    .PHONY: clean
    clean:
        rm -rf *.o.*

    .PHONY: smooth
    smooth : a_smoothed.o.nii.gz b_smoothed.o.nii.gz c_smoothed.o.nii.gz 

    .PHONY: threshold
    threshold : a_thresholded.o.nii.gz b_thresholded.o.nii.gz c_thresholded.o.nii.gz 

    .PHONY: linear
    linear : a_registered.o.grd b_registered.o.grd c_registered.o.grd 

    a_smoothed.o.nii.gz : MNI_2mm_orig.nii.gz
        node bisweb.js smoothImage --debug true --input MNI_2mm_orig.nii.gz --output a_smoothed.o.nii.gz

    b_smoothed.o.nii.gz : MNI_2mm_resliced.nii.gz
        node bisweb.js smoothImage --debug true --input MNI_2mm_resliced.nii.gz --output b_smoothed.o.nii.gz

    c_smoothed.o.nii.gz : MNI_2mm_scaled.nii.gz
        node bisweb.js smoothImage --debug true --input MNI_2mm_scaled.nii.gz --output c_smoothed.o.nii.gz

    a_thresholded.o.nii.gz : a_smoothed.o.nii.gz
        node bisweb.js thresholdImage --debug true --input a_smoothed.o.nii.gz --output a_thresholded.o.nii.gz --low 50 --high 100

    b_thresholded.o.nii.gz : b_smoothed.o.nii.gz
        node bisweb.js thresholdImage --debug true --input b_smoothed.o.nii.gz --output b_thresholded.o.nii.gz --low 50 --high 100

    c_thresholded.o.nii.gz : c_smoothed.o.nii.gz
        node bisweb.js thresholdImage --debug true --input c_smoothed.o.nii.gz --output c_thresholded.o.nii.gz --low 50 --high 100

    a_registered.o.grd : a_thresholded.o.nii.gz
        node bisweb.js linearRegistration --debug true --reference MNI_2mm_orig.nii.gz --target a_thresholded.o.nii.gz --output a_registered.o.grd

    b_registered.o.grd : b_thresholded.o.nii.gz
        node bisweb.js linearRegistration --debug true --reference MNI_2mm_resliced.nii.gz --target b_thresholded.o.nii.gz --output b_registered.o.grd

    c_registered.o.grd : c_thresholded.o.nii.gz
        node bisweb.js linearRegistration --debug true --reference MNI_2mm_scaled.nii.gz --target c_thresholded.o.nii.gz --output c_registered.o.grd



