"use strict";

require('../../config/bisweb_pathconfig.js');

const program = require('commander');
const path=require('path');
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
    .option('--ipaddr <s>', 'USE WITH EXTREME CARE -- if used this allow remote access (maybe)')
    .option('--proxyport <n>', 'If enabled, creates a proxy server mirroring http://bisweb.yale.edu/local (use with care)')
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


let ipaddr =  program.ipaddr || 'localhost';
let readonlyflag = program.readonly ? program.readonly : false;
let insecure = program.insecure ? program.insecure : false;
let verbose = program.verbose ? program.verbose : false;

let config = program.config || null;
let createconfig = program.createconfig || null;
let tmpdir= program.tmpdir || null;
let proxyport = program.proxyport || 0;

let nolocalhost=false;

if (ipaddr!=='localhost') {
    nolocalhost=true;
    insecure=false;
}


if (proxyport>0) {
    const http = require('http');
    const httpProxy = require('http-proxy');
    const proxy = httpProxy.createProxyServer({});
    const target='http://bisweb.yale.edu/local';
    console.log('pppp Creating proxy http server on port proxyport');
    console.log(`pppp \t To access navigate to http://localhost:${proxyport}`);
    console.log(`pppp \t                 or    http://${os.hostname}:${proxyport}`);
    console.log('pppp ------------------------------------------------------');
    http.createServer(function(req, res) {
        if (req.url.indexOf('.html')>0)
            console.log('pppp \t Proxy request', req.url, ' redirecting to ' +target+req.url);
        proxy.web(req, res, { target: target });
    }).listen(proxyport);
}

let serveroptions= {
    "verbose" : verbose,
    "insecure" : insecure,
    "readonly" : readonlyflag,
    "nolocalhost" : nolocalhost,
    "config" : config,
    "createconfig" : createconfig,
    "tempDirectory" : tmpdir,
    "mydirectory" : path.resolve(path.normalize(__dirname))
};

//console.log('Server Options=',JSON.stringify(serveroptions,null,4));

let server=new BisWSWebSocketFileServer(serveroptions);


console.log('..................................................................................');
console.log('..... BioImage Suite Web date='+bisdate.date+' ('+bisdate.time+'), v='+bisdate.version+', os='+os.platform()+'.\n..... \t server=', server.constructor.name,'\n.....');
server.startServer(ipaddr, portno, false).catch( (e) => {
    console.log(e);
    process.exit(0);
});




