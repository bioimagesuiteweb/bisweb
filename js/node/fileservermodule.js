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

'use strict';

const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");
const BisWSWebSocketFileServer=require('bis_wswebsocketfileserver');
const os = require('os');
const wsutil = require('bis_wsutil');
const globalInitialServerPort=wsutil.initialPort;
const bisdate=require('bisdate.js');
const path=require('path');
const http = require('http');
const httpProxy = require('http-proxy');


class FileServerModule extends BaseModule {
  constructor() {
    super();
    this.name = 'FileServer';
  }
    
    createDescription() {
        
        return {
            "name": "FileServer",
            "description": "This module runs the BioImageSuite Web WebSocker Based FileServer",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs": [
                {
                    'type' : 'text',
                    'name' : 'Results',
                    'description': 'log file',
                    'varname': 'logoutput',
                    'required': false,
                    'extension': '.bistext'
                }
            ],
            "buttonName": "Execute",
            "shortname" : "info",
            "params": [
                {
                    "name": "Port",
                    "description": "Port number",
                    "priority": 1,
                    "advanced": false,
                    "type": "int",
                    "varname": "portno",
                    "default": globalInitialServerPort,
                    "low": globalInitialServerPort,
                    "high": wsutil.finalPort
                },
                {
                    "name": "Readonly ",
                    "description": "Whether or not the server should accept requests to write files",
                    "priority": 2,
                    "advanced": false,
                    "gui": "check",
                    "varname": "readonly",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Insecure ",
                    "description": "Whether or not the server requires a password (use with extreme care)",
                    "priority": 3,
                    "advanced": true,
                    "gui": "check",
                    "varname": "insecure",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Proxy Port",
                    "description": "If enabled, creates a proxy server mirroring http://bisweb.yale.edu/local (use with care) Use -1 to disable",
                    "priority": 50,
                    "advanced": true,
                    "type": "int",
                    "varname": "proxyport",
                    "default":0,
                    "low":  0,
                    "high": 32767,
                },
                {
                    "name": "Create Configuration ",
                    "description": "print sample config file and exit",
                    "priority": 51,
                    "advanced": true,
                    "gui": "check",
                    "varname": "createconfig",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Temp Directory",
                    "description": "Location of the Temp Directory",
                    "priority": 40,
                    "advanced": true,
                    "varname": 'tmpdir',
                    "type": 'string',
                    "default" : '',
                },
                {
                    "name": "IP Address",
                    "description": "USE WITH EXTREME CARE -- if used this allow remote access (maybe)",
                    "priority": 55,
                    "advanced": true,
                    "varname": 'ipaddr',
                    "type": 'string',
                    "default" : 'localhost',
                },
                {
                    "name": "Configuration File",
                    "description": "Location of the Configuration File",
                    "priority": 10,
                    "advanced": false,
                    "varname": 'config',
                    "type": 'string',
                    "default" : '',
                },
                baseutils.getDebugParam()
            ]
        };
    }


    directInvokeAlgorithm(vals) {

        console.log('oooo invoking: bisfileserver with vals', JSON.stringify(vals));

        let portno=vals.port;

        let ipaddr =  vals.ipaddr || 'localhost';
        let readonlyflag = vals.readonly;
        let insecure = vals.insecure;
        let verbose = vals.debug;

        let config = vals.config;
        if (config.length<1)
            config=null;
        let createconfig = vals.createconfig;
        let tmpdir= vals.tmpdir;
        if (tmpdir.length<1)
            tmpdir=null;
        let proxyport = vals.proxyport;

        let nolocalhost=false;

        if (ipaddr!=='localhost') {
            nolocalhost=true;
            insecure=false;
        }
        
        
        if (proxyport>0) {
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

        let server=new BisWSWebSocketFileServer(serveroptions);


        return new Promise( (resolve,reject) => {

            let callback=function(status) {
                if (status)
                    resolve();
                else
                    reject();
            };
            
            console.log('..................................................................................');
            console.log('..... BioImage Suite Web date='+bisdate.date+' ('+bisdate.time+'), v='+bisdate.version+', os='+os.platform()+'.\n..... \t server=', server.constructor.name,'\n.....');
            server.startServer(ipaddr, portno, false,callback).catch( (e) => {
                console.log(e);
                reject(e);
            });
        });
    }
    
}

module.exports = FileServerModule;
