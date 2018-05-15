"use strict";

require('../../config/bisweb_pathconfig.js');
const program = require('commander');
const pipeline = require('pipelineTool.js');

program
    .option('-f, --file [s]', 'Formatted task file to create a Makefile for.')
    .option('-o, --out [s]', 'Endpoint for Makefile (directory + filename).');

program.parse(process.argv);
if (!program.file) { console.log('Error: no file specified. Specify a file with -f or --file'); process.exit(1); }
let out = program.out ? program.out : __dirname + '/Makefile';

pipeline.makePipeline(program.file, out);



//read param file from disk 
/*if (program.file) {
    pipeline.makePipline(program.file);
}*/