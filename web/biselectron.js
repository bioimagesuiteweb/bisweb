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


// -------------------------------------------------------------------------------

const electron = require('electron');
require('electron-debug')({showDevTools: false,
                           enabled : true});

const path=require('path');
const fs=require('fs');
const app=electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const ipcMain = electron.ipcMain;
const shell=electron.shell;
const toolfile=require('./images/tools.json');

const state = {
    winlist : [null],
    screensize : {
        width : 100,
        height:100
    },
    console : null,
    consolehandler : null,
    indev : process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath),
    dimensions : {
        width : 1024,
        height : 1024,
    },
    toolname : "index",
};


let v=process.versions.node;
let s=v.split(".");
let major=parseInt(s[0]);
let minor=parseInt(s[1]);

if (major<8 || (major===8 && minor<9)) {
    console.log(`----\n---- You are using a version of node older than 8.9 (actual version=${v}). You need to update to electron v2.0.\n`);
    process.exit(1);
}

if (major===9) {
    console.log(`----\n---- You are using a version of node that is 9.x (actual version=${v})\n`);
    process.exit(1);
}


if (state.indev) {
    state.commandargs= process.argv.slice(3) || [];
    state.mainfilename=process.argv[2];
    console.log(getTime()+' Electron version='+process.versions.electron+' node='+process.versions.node);
} else {
    state.commandargs= process.argv.slice(2) || [];
    state.mainfilename=process.argv[1];
}



state.mainfilename=state.mainfilename || "";
// Check if filename ends in .html if not add it
if (state.mainfilename!=='') {


    let ext=state.mainfilename.split('.').pop();
    if (ext!=='html')  {
        state.toolname=state.mainfilename;
        state.mainfilename+='.html';
    }
}

// ----------------------------------------------------------------------------------------
var getHeightWidth= function(name) {

    let tools=toolfile.tools;
    
    const obj = {
        height : 900,
        width : 1024
    };

    const maxw=electron.screen.getPrimaryDisplay().workAreaSize.width;
    const maxh=electron.screen.getPrimaryDisplay().workAreaSize.height;
    const scale=   electron.screen.getPrimaryDisplay().scaleFactor || 1.0;
    
    let found=false,i=0;
    let keys=Object.keys(tools);
    
    while (i<keys.length && found===false) {
        let url=tools[keys[i]].url;
        if (url===name) {
            obj.height= tools[keys[i]].height || 900;
            obj.width= tools[keys[i]].width || 700;
            obj.height=Math.round(obj.height*scale);
            obj.width=Math.round(obj.width*scale);
            found=true;
        } else {
            i=i+1;
        }
    }

    if (!found && name.indexOf("test")>0) {
        obj.width=maxw;
        obj.height=maxh;
    } else if (!found && name.indexOf("index")>=0) {
        obj.width=Math.round(650*scale);
        obj.height=Math.round(600*scale);
    }

    
    if (obj['width']>maxw)
        obj['width']=maxw;
    else if (obj['width']<600)
        obj['width']=600;

    if (obj.height<600)
        obj.height=600;
    
    if (obj.height>maxh)
        obj.height=maxh;


    return obj;
};

var createWindow=function(index,fullURL) {

    fullURL = fullURL || state.toolname;
    let i0=fullURL.lastIndexOf("\\");

    if (i0<0)
        i0=fullURL.lastIndexOf("/");
    if (i0>=0)
        i0+=1;


    let i1=fullURL.lastIndexOf(".html");
    let name=state.toolname;
    if (i1>i0 && i1>0 && i0>0) {
        name=fullURL.substr(i0,i1-i0);
    } else if (i0>0 && i1<0) {
        name=fullURL.substr(i0,fullURL.length);
    } else if (i0<0 && i1>0) {
        name=fullURL.substr(0,i1);
    }
        
    state.dimensions=getHeightWidth(name);


    
    let i_width= state.dimensions.width;
    let i_height= state.dimensions.height;

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
        fullURL='file://' + path.resolve(__dirname , 'index.html');
        xval=undefined;
        yval=undefined;
    }  

    let opts= { width: i_width,
                height: i_height,
                maxwidth: state.screensize.width,
                maxheight: state.screensize.height
          };

    
    if (opts.height>state.screensize.height-10)
        opts.height=state.screensize.height-10;
    if (opts.width>state.screensize.width-10)
        opts.width=state.screensize.width-10;


    if (index!==0) {
        xval+=Math.round(Math.random()*10);
        yval+=Math.round(Math.random()*10);
        if (xval+opts.width>state.screensize.width)
            xval=undefined;
        if (yval+opts.height>state.screensize.height)
            yval=undefined;
    }

/*    let i=fullURL.indexOf('biswebtest');
    if (i>=0) {
        xval=0;
        yval=0;
        opts.width=state.screensize.width;
        opts.height=state.screensize.height;
    }*/
    
    

    
    var preload=  path.resolve(__dirname, 'bispreload.js');
    console.log(getTime()+' Creating new window '+fullURL + ', index='+index+' dims='+JSON.stringify(opts));
    //    console.log(getTime()+' Screen size = '+[state.screensize.width,state.screensize.height]+' size='+[opts.width,opts.height]);
    state.winlist[index]=new BrowserWindow({width: opts.width,
                                            height: opts.height,
                                            maxWidth: opts.maxwidth,
                                            maxHeight : opts.maxheight,
                                            show: true,
                                            x : xval,
                                            y : yval,
                                            webPreferences: {
                                                nodeIntegration: false,
                                                preload: preload,
                                                contextIsolation: false,
                                            },
                                            icon: __dirname+'/images/favicon.ico'});
    
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
        
        if (process.platform === 'darwin')  {
            if (!anyalive)
                macExit(true);
            return;
        }

        if (anyalive===false) {
            if (state.console) {
                state.console.hide();
            }
            state.console=null;
            process.exit(0);
        }
    });
    state.winlist[index].loadURL(fullURL);
    return index;
};

var macExit=function(ask=false) {

    let anyalive=false;
    state.winlist.forEach(function(e) {
        if (e!==null)
            anyalive=true;
    });

    if (anyalive===false && ask===false)
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

var createConsole=function() {

    var opts= {width: 800, height: 500};
    var fullURL='file://' + path.resolve(__dirname , 'console.html');

    var preload=  path.resolve(__dirname, 'bispreload.js');
    state.console=new BrowserWindow({width: opts.width,
                                     height: opts.height,
                                     webPreferences: {
                                         nodeIntegration: false,
                                         preload: preload,
                                     },
                                     icon: __dirname+'/images/favicon.ico'});
    
    state.console.setAutoHideMenuBar(true);
    state.console.setMenuBarVisibility(false);
    if (process.platform === 'darwin') 
        state.console.setMenu(null);
    
    state.console.loadURL(fullURL);
    state.console.minimize();
    state.console.hide();
    
    state.console.on('close',  function (e) {
        e.preventDefault();
        e.returnValue=false;
        state.console.hide();
        return false;
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
            //      console.log(getTime()+' Electron opening ' + url + ' in browser.');
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

var createOrShowMainWindow = function() {
    if (state.winlist[0]!==null) {
        state.winlist[0].show();
        return;
    }
    createWindow(0);
    attachWindow(0);
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

    var setup=toolfile;
    var keys=Object.keys(setup.tools);
    let fullURL='';
    if (state.mainfilename.length>1) {
        console.log(getTime()+' Testing starting file=',state.mainfilename);
        fullURL=path.resolve(__dirname , state.mainfilename);
        if (!fs.existsSync(fullURL))
            fullURL=path.resolve(__dirname , '../'+state.mainfilename);
        if (!fs.existsSync(fullURL)) {
            console.log(getTime()+' The starting file=',state.mainfilename,' does not exist.');
            state.mainfilename='';
        }
    }
    console.log(getTime()+' Electron ready ' + state.mainfilename + ' indev='+state.indev);
    if (state.commandargs.length>0) {
        console.log(getTime()+' Command args='+state.commandargs);
    }

    
    state.screensize.width=electron.screen.getPrimaryDisplay().workAreaSize.width;
    if (state.screensize.width<900)
        state.screensize.width=900;
    
    state.screensize.height=electron.screen.getPrimaryDisplay().workAreaSize.height;
    if (state.screensize.height<700)
        state.screensize.height=700;

    if (state.mainfilename === '') {
        createOrShowMainWindow();
    } else {
        createNewWindow("file://"+fullURL);
    }

    var tools=setup.tools;
    const Menu=electron.Menu;
    var mitems=[];
    var i=0;
    
    if (process.platform === 'darwin') {
        for (i=0;i<keys.length;i++)  {
            var key=keys[i]; 
            var a='file://'+path.resolve(__dirname , tools[key].url+'.html'); // jshint ignore:line
            /* jshint ignore:start */
            (function outer(a){
                mitems.push({ label: tools[key].title, click: () =>{
                    createNewWindow(a);
                }});
            }(a));
            /* jshint ignore:end */
        }
        
        var menu=Menu.buildFromTemplate([
            {  label: "Application Selector", click: () => { createOrShowMainWindow(); }},
            {  label: 'Tools', submenu : mitems }
        ]);

        var menu2=Menu.buildFromTemplate([
            {  label: 'Main',  
               submenu : [
                   {  label: "Application Selector", click: () => { createOrShowMainWindow(); }},
                   {   type: 'separator'},
                   { 
                       label : 'Exit', 
                       click: () => { 
                           macExit();
                       }
                   }
               ]
            },
            {  label: 'Tools', 
               submenu : mitems 
            }
        ]);
        app.dock.setMenu(menu);
        Menu.setApplicationMenu(menu2);
    }
});

app.on('activate', () => { createOrShowMainWindow();});


ipcMain.on('ping', function (event, arg) {
    console.log(getTime()+' (PING) '+arg);
});

ipcMain.on('showdevtools', function () {
    var win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.webContents.openDevTools();
    }
});

ipcMain.on('showconsole',function() {
    if (state.console===null)
        createConsole();
    state.console.show();
});

ipcMain.on('bisconsoleinit',function(event) {
    state.consolehandler=event.sender;
});

ipcMain.on('bisconsole', function (event,arg) {
    if (state.consolehandler===null)
        console.log(arg);
    else
        state.consolehandler.send('add-text',arg);
});

ipcMain.on('clearconsole', function (event,arg) {
    if (state.consolehandler)
        state.consolehandler.send('clear-text',arg);
});

ipcMain.on('arguments', function (event,arg) {
    if (state.winlist.length>2 || state.commandargs.length<1) {
        return;
    }
    console.log(getTime()+ ' Sending arguments to ' +arg);
    event.sender.send('arguments-reply',state.commandargs);

});



