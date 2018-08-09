"use strict";
const startserver = require('./server.js');
const program = require('commander');

program
    .option('-v, --verbose', 'Whether or not to display messages written by the server')
    .option('-p, --port <n>', 'Which port to start the server on')
    .parse(process.argv);



let portno=8081;
if (program.port)
    portno=parseInt(program.port)

startserver('localhost', portno, () => {
    //if (!program.verbose) { console.log('Server started in silent mode'); console.log = () => {};}
});
