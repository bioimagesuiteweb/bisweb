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

/* jshint node:true */

"use strict";

let getTime = function() {
    //    http://stackoverflow.com/questions/7357734/how-do-i-get-the-time-of-day-in-javascript-node-js

    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    return  "[" + hour + ":" + min + ":" + sec +"]";
};

const electron = require('electron');
require('electron-debug')({showDevTools: true,
			   enabled : true});

const path=require('path');
const fs=require('fs');
const app=electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const shell=electron.shell;


const state = {
    winlist : [null],
    screensize : {
	width : 100,
	height:100
    },
    console : null,
    consolehandler : null,
    indev : process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath)
};

state.mainfilename="biswebtest.html";

if (state.indev) {
    console.log(getTime()+' Electron version='+process.versions.electron+' node='+process.versions.node);
}

// ----------------------------------------------------------------------------------------

var createWindow=function(index,fullURL) {

    var hidden='shown';
    var opts= {width: 1024, height: 900};
    var xval=100;
    var yval=100;
   
    if (index==-2) {
	index=state.winlist.length;
    } else {
        if (index===-1) {
	    index=state.winlist.length;
	}
    }

    
    if (index===0) {
	opts= {width: 1024, height: 900};
	fullURL='file://' + path.resolve(__dirname , 'index.html');
	hidden='hidden';
	xval=undefined;
	yval=undefined;
    }  else {
	opts= { width: 1200,height:1100};
    }

    
    if (opts.height>state.screensize.height-100)
	opts.height=state.screensize.height-100;
    if (opts.width>state.screensize.width-100)
	opts.width=state.screensize.width-100;


    if (index!==0) {
	xval+=Math.round(Math.random()*50);
	yval+=Math.round(Math.random()*50);
	if (xval+opts.width>state.screensize.width)
	    xval=undefined;
	if (yval+opts.height>state.screensize.height)
	    yval=undefined;
    }

    var preload=  path.resolve(__dirname, 'bispreload.js');
    console.log(getTime()+' Creating new window '+fullURL + ', index='+index);
    console.log(getTime()+' Screen size = '+[state.screensize.width,state.screensize.height]+' size='+[opts.width,opts.height]);
    state.winlist[index]=new BrowserWindow({width: state.screensize.width,
					    height: opts.height,
					    show: true,
					    x : 0,
					    y : 0,
					    webPreferences: {
						nodeIntegration: false,
						preload: preload,
					    },
					    icon: __dirname+'/../web/images/favicon.ico'});
    
    state.winlist[index].setAutoHideMenuBar(true);
    state.winlist[index].setMenuBarVisibility(false);
    if (process.platform === 'darwin') 
	state.winlist[index].setMenu(null);

    state.winlist[index].once('ready-to-show', () => {
	state.winlist[index].show();
    });
    
    state.winlist[index].on('closed', function() {
        state.winlist[index] = null;
	
	var anyalive=false;
	state.winlist.forEach(function(e) {
	    if (e!==null)
		anyalive=true;
	});
	
	if (process.platform === 'darwin') 
	    return;

	if (anyalive===false) {
	    process.exit(0);
	}
    });
    state.winlist[index].loadURL(fullURL);
    return index;
};

var macExit=function() {

    let anyalive=false;
    state.winlist.forEach(function(e) {
	if (e!==null)
	    anyalive=true;
    });

    if (anyalive===false)
	process.exit();

    const dialog = electron.dialog;
    dialog.showMessageBox({
	title : "Are you sure?",
	type  : "question",
	buttons : [ "Cancel", "Quit" ],
	defaultId : 0,
	message : "This will close all open BioImage Suite Web Applications",
    }, (f) => { 
	if (f===1)
	    process.exit();
    });
};
    
var attachWindow=function(index) {

    state.winlist[index].webContents.on('new-window',function(event,url/*,frameName,disposition,options*/) {

	event.preventDefault();	
	var lm=url.split("/"), fname=lm[lm.length-1], domain=false;
	if (fname==="index.html") {
	    domain=true;
	    if (state.winlist[0]!==null) {
		state.winlist[0].show();
		return;
	    }
	}

        if (url.indexOf('http://')===0 ||
	    url.indexOf('https://')===0 
	   ) {
	    console.log(getTime()+' Electron opening ' + url + ' in browser.');
	    shell.openExternal(url);
	    return;
	}

	
	var index=state.winlist.length;
	if (domain===true)
	    index=0;
	
	createWindow(index,url);
	attachWindow(index);
    });
};


    
var attachWindow=function(index) {

    state.winlist[index].webContents.on('new-window',function(event,url/*,frameName,disposition,options*/) {

	event.preventDefault();	
	var lm=url.split("/"), fname=lm[lm.length-1], domain=false;
	if (fname==="index.html") {
	    domain=true;
	    if (state.winlist[0]!==null) {
		state.winlist[0].show();
		return;
	    }
	}

        if (url.indexOf('http://')===0 ||
	    url.indexOf('https://')===0 
	   ) {
	    console.log(getTime()+' Electron opening ' + url + ' in browser.');
	    shell.openExternal(url);
	    return;
	}

	
	var index=state.winlist.length;
	if (domain===true)
	    index=0;
	
	createWindow(index,url);
	attachWindow(index);
    });
};


var createNewWindow = function(url) {

    var index=createWindow(-2,url);
    attachWindow(index);
};


// -----------------------------------------------------------------------
// ----------------------------------- App Level Stuff -------------------
// -----------------------------------------------------------------------

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
	
});




// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {

    console.log(getTime()+' Testing starting file=',state.mainfilename);
    let fullURL=path.resolve(__dirname , state.mainfilename);
    if (!fs.existsSync(fullURL))
	fullURL=path.resolve(__dirname , '../'+state.mainfilename);
    if (!fs.existsSync(fullURL)) {
	console.log(getTime()+' The starting file=',state.mainfilename,' does not exist.');
	process.exit(0);
    }
    console.log(getTime()+' Electron ready ' + state.mainfilename + ' indev='+state.indev);
		    
    state.screensize.width=electron.screen.getPrimaryDisplay().workAreaSize.width;
    if (state.screensize.width<900)
        state.screensize.width=900;
        
    state.screensize.height=electron.screen.getPrimaryDisplay().workAreaSize.height;
    if (state.screensize.height<700)
        state.screensize.height=700;

    createNewWindow("file://"+fullURL);


    if (process.platform === 'darwin') {
        const Menu=electron.Menu;
	let menu2=Menu.buildFromTemplate([
	    {  label: 'Main',  
	       submenu : [
		   { 
		       label : 'Exit', 
		       click: () => { 
			   macExit();
		       }
		   }
	       ]
	    }
	]);
	app.dock.setMenu(menu2);
	Menu.setApplicationMenu(menu2);
    }


});

