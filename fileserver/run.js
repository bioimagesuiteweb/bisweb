"use strict";
const server = require('./server.js');
const program = require('commander');

program
    .option('-v, --verbose', 'Whether or not to display messages written by the server');

program.parse(process.argv);


server.startServer('localhost', 8081, () => {
    //if (!program.verbose) { console.log('Server started in silent mode'); console.log = () => {};}
});