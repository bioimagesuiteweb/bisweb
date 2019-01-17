'use strict';

if (global.bioimagesuiteweblib !== false) {
    global.bioimagesuiteweblib = true;
} else {
    global.bioimagesuiteweblib = false;
}

require('../../config/bisweb_pathconfig.js');
const expobj=require('bisweb_exportobject');

expobj.commander=require('commander');
expobj.tmp=require('tmp');
expobj.rimraf=require('rimraf');

expobj.commandline = require('commandline');
expobj.userPreferences = require('bisweb_userpreferences.js');
expobj.bisnodecmd=require("bis_commandlineutils"),
expobj.wsutil=require('bis_wsutil');
expobj.loadParse=expobj.commandline.loadParse;
expobj.loadUserPreferences=expobj.userPreferences.initialize;
expobj.BisWSWebSocketFileServer=require('bis_wswebsocketfileserver');
expobj.nodemodules=require('nodemoduleindex'),

module.exports=expobj;
