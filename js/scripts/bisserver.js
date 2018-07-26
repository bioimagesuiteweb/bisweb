#!/usr/bin/env node

'use strict';

var http = require('http');
var express = require('express');
var program = require('commander');
var serverutil = require('./bis_serverutil');
var path = require('path');
var fs = require('fs');

program
    .option('-p, --port <port>', 'Port to run the file-browser. Default value is 8088')
    .parse(process.argv);
if (!program.port) program.port = 8088;

var app = express();
var dir = process.cwd();
var servername = "http://localhost:" + program.port;

// ------------------------------------------ passport ------------------------------------------

var passport = serverutil.createBasicPassport(app, function (user, password) {
    console.log('\nvalidatating new request ' + user + ':' + password);
    if (user === 'xenios') {
        return true;
    }
    return false;
});

// ------------------------------------------ app.use ------------------------------------------

app.use(function (request, response, next) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Methods", "GET,POST");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.use(function (request, response, next) {

    if (request.path === '/login' ||
        request.path === '/' ||
        request.path.indexOf('/_files') === 0 ||
        request.path.indexOf('/build') === 0) {
        //	console.log(' ... good path'+request.path+'(session=',request.session,'), processing as is');
        next();
        return;
    }

    //    console.log('\nNew request path=',request.path,' user=',request.user,'\n\n\n',request.session);
    request.user = request.user || null;

    if (request.user === null) {
        console.log(' ... no user ignoring');
        return;
    }
    //    console.log('processing ',request.path);
    next();
});

var server = http.createServer(app);

server.listen(program.port, 'localhost', function () {
    var fname = servername + "/_files?path=pathname";
    console.log('\n\n -------------------------------------------------------');
    console.log('Welcome to the BioImage Suite Web Helper Application.\n');
    console.log('This application allows the BioImage Suite web application to read files from your local filesystem\n\t that lie in the directory', dir, '\n\t or its children.');
    console.log('The files are only accessible from a browser running on your local machine (i.e. localhost only access)\n');
    console.log("To quickly test,  open the following link in your browser to ", servername);
    console.log("Requests of the form " + fname + "\n\t will return contents of directory **pathname** as a json formatted string\n\n\n");
});

// ------------------------------------------ response ------------------------------------------
// Repond to "/" with default main file

app.get('/', function (reg, response) {
    response.redirect('/build/index.html');
});

app.get('/login',
    passport.authenticate('basic'),
    function (req, res) {
        // Return username ...
        res.json(req.user);
    });



app.use(express.static(dir)); //app public directory




app.get('/_files',
    passport.authenticate('basic'),
    function (request, response) {
        var dojson = function (obj) {
            response.json(obj);
        };

        var dohtml = function (obj) {

            response.writeHead(200, { "Content-Type": "text/html" });
            response.write("<HTML><BODY>");
            response.write('<H2> Directory' + obj.basedir + '//' + obj.childdir + '</H2>');
            response.write("<TABLE>");

            var data = obj.data;
            var l = data.length;
            for (var pass = 0; pass <= 1; pass++) {

                for (var i = 0; i < l; i++) {

                    if ((data[i].IsDirectory && pass === 0) ||
                        (!data[i].IsDirectory && pass === 1)) {

                        var name = data[i].Name, size = '', link = '';
                        if (data[i].IsDirectory) {
                            name = "[ " + name + " ]";
                            link = "/_files?path=" + data[i].Path + "&mode=html";
                        } else {
                            size = data[i].size;
                            link = "/" + data[i].Path;
                        }
                        var a = "<TR><TD><a href=\"" + link + "\">" + name + "</a></TD><TD>" + size + "</TD></TR>";
                        response.write(a);
                    }
                }
                if (pass === 0)
                    response.write("<TR></TR>");
            }
            response.end("</TABLE></BODY>");
        };

        var currentDir = dir;
        var query = request.query.path || '';
        var mode = request.query.mode || 'json';

        if (query)
            currentDir = path.join(dir, query);
        //	    console.log("browsing ", currentDir,mode);
        if (!fs.statSync(currentDir).isDirectory()) {
            //		console.log('currentDir=',currentDir,' is not a directory');
            return;
        }

        if (mode === 'json')
            serverutil.getDirectoryInfo(currentDir, query, dojson);
        else
            serverutil.getDirectoryInfo(currentDir, query, dohtml);
    });




