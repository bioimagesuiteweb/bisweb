require('../../config/bisweb_pathconfig.js');

const program = require('commander');
const BisWSWebSocketFileServer=require('bis_wswebsocketfileserver');
const os = require('os');
const wsutil = require('bis_wsutil');
const globalInitialServerPort=wsutil.initialPort;
const bisdate=require('bisdate.js');
// .........................................................................................................
// This is the main function
// .........................................................................................................
program
    .option('-p, --port <n>', 'Which port to start the server on')
    .option('--readonly', 'Whether or not the server should accept requests to write files')
    .option('--insecure', 'USE WITH EXTREME CARE -- if true no password')
    .option('--verbose', ' print extra statements')
    .option('--tmpdir <s>', ' specify temporary directory')
    .option('--config <s>', ' read config file')
    .option('--createconfig', ' print sample config file and exit')
    .parse(process.argv);



let portno=globalInitialServerPort;
if (program.port)
    portno=parseInt(program.port);

if (portno<wsutil.initialPort || portno>wsutil.finalPort)
    portno=wsutil.initialPort;


let ipaddr =  'localhost';
let readonlyflag = program.readonly ? program.readonly : false;
let insecure = program.insecure ? program.insecure : false;
let verbose = program.verbose ? program.verbose : false;

let config = program.config || null;
let createconfig = program.createconfig || null;
let tmpdir= program.tmpdir || null;



let nolocalhost=false;
if (ipaddr!=='localhost') {
    nolocalhost=true;
    insecure=false;
}


let server=new BisWSWebSocketFileServer(
    {
        "verbose" : verbose,
        "insecure" : insecure,
        "readonly" : readonlyflag,
        "nolocalhost" : nolocalhost,
        "config" : config,
        "createconfig" : createconfig,
        "tempDirectory" : tmpdir,
    }
);

console.log('..................................................................................');
console.log('..... BioImage Suite Web date='+bisdate.date+' ('+bisdate.time+'), v='+bisdate.version+', os='+os.platform()+'.\n..... \t server=', server.constructor.name,'\n.....');
server.startServer(ipaddr, portno, false).catch( (e) => {
    console.log(e);
    process.exit(0);
});




