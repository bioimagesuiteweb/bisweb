"use strict";
const startserver = require('./server.js');
const program = require('commander');

program
    .option('-v, --verbose', 'Whether or not to display messages written by the server');

program.parse(process.argv);


startserver('localhost', 8081, () => {
    //if (!program.verbose) { console.log('Server started in silent mode'); console.log = () => {};}
});
