'use strict';

if (global.bioimagesuiteweblib !== false) {
    global.bioimagesuiteweblib = true;
} else {
    global.bioimagesuiteweblib = false;
}

require('../../config/bisweb_pathconfig.js');
const expobj=require('bisweb_exportobject');

expobj.commandline = require('commandline');
expobj.userPreferences = require('bisweb_userpreferences.js');
expobj.commander=require('commander');
expobj.tmp=require('tmp');
expobj.rimraf=require('rimraf');

module.exports=expobj;
