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
require('@electron/remote/main').initialize();
require('electron-debug')({showDevTools: false,
                           enabled : true});

const path=require('path');
const fs=require('fs');
const app=electron.app;  // Module to control application life.
const globalShortcut=electron.globalShortcut;

app.commandLine.appendSwitch('auto-detect', 'false');
app.commandLine.appendSwitch('no-proxy-server');

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

if (major>16) {
    console.log(`----\n---- You are using a version of node older than 12.0 (actual version=${v}). You need to update to electron v2.0.\n`);
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
state.queryargs='';
// Check if filename ends in .html if not add it
if (state.mainfilename!=='') {

    if (state.mainfilename.indexOf('?')>0) {
        let st=state.mainfilename.split('?');
        state.mainfilename=st[0];
        state.queryargs=st[1];
    }
        
    let ext=state.mainfilename.split('.').pop();
    if (ext!=='html')  {
        state.toolname=state.mainfilename;
        state.mainfilename+='.html';
    }
}

const biswebTerminate=function(code=0) {
    app.quit(code);
};

const macExitQuestion=function() {

    return new Promise( (resolve,reject) => setTimeout( async () => {
        const dialog = electron.dialog;
        
        const response=await dialog.showMessageBox({
            title : "Are you sure?",
            type  : "question",
            buttons : [ "Cancel", "Quit" ],
            defaultId : 0,
            message : "This will terminate BioImage Suite Web. Are you sure?",
        });
        
        if (response.response===1)
            resolve('exiting');
        else
            reject('quit event cancelled');
    }));
};                

// ----------------------------------------------------------------------------------------
const getHeightWidth= function(name) {

    let tools=toolfile.tools;
    
    const obj = {
        height : 1120,
        width : 1024
    };

    const maxw=electron.screen.getPrimaryDisplay().workAreaSize.width;
    const maxh=electron.screen.getPrimaryDisplay().workAreaSize.height;
    const scale=   electron.screen.getPrimaryDisplay().scaleFactor || 1.0;
    
    let found=false,i=0;
    let keys=Object.keys(tools);

    while (i<keys.length && found===false) {
        let url=tools[keys[i]].url;
        if (name.indexOf(url)===0) {
            obj.height= tools[keys[i]].height || 950;
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

const createWindow=function(index,fullURL) {

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

    let xval=100;
    let yval=100;
    
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

    if (state.queryargs!=='') {
        fullURL=fullURL+'?'+state.queryargs;
        state.queryargs='';
    }
    
    let preload=  path.resolve(__dirname, 'bispreload.js');
    console.log(getTime()+' Creating new window '+fullURL + ', index='+index+' dims='+JSON.stringify(opts));

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
                                                enableRemoteModule : true,
                                            },
                                            autoHideMenuBar : true,
                                            icon: __dirname+'/images/favicon.ico'});
    
    //state.winlist[index].setAutoHideMenuBar(true);
    state.winlist[index].setMenuBarVisibility(false);
    if (process.platform === 'darwin') 
        state.winlist[index].setMenu(null);

    state.winlist[index].once('ready-to-show', () => {
        state.winlist[index].show();
    });
    
    state.winlist[index].on('closed', function() {
        state.winlist[index] = null;
    });


    console.log('Loading URL',fullURL);
    state.winlist[index].loadURL(fullURL).then( () => {
        console.log('.... Loaded URL=',fullURL);
    }).catch( (e) => {
        console.log('.... Failed to load ',fullURL,', error=',e);
        setTimeout( () => {
            console.log('... Trying to load again',fullURL);
            state.winlist[index].loadURL(fullURL);
        },1000);
    });

    return index;
};


var createConsole=function() {

    let opts= {width: 800, height: 500};
    let fullURL='file://' + path.resolve(__dirname , 'console.html');

    let preload=  path.resolve(__dirname, 'bispreload.js');
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

var trapOpenNewWindowEvent=function(index) {

    console.log('Attaching',index);
    
    state.winlist[index].webContents.on('new-window',function(event,url/*,frameName,disposition,options*/) {

        console.log('webcontents url=',url);
        
        event.preventDefault(); 
        let lm=url.split("/"), fname=lm[lm.length-1], ismainwindow=false;
        if (fname==="index.html") {
            ismainwindow=true;
            if (state.winlist[0]!==null) {
                state.winlist[0].show();
                console.log('.... link was to index.html showing main window');
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

        
        let index=state.winlist.length;
        if (ismainwindow)
            index=0;

        console.log('....\n.... creating new window from webpage ... loading url=',index,url);
        createWindow(index,url);
        trapOpenNewWindowEvent(index);
        
    });
};


var createNewWindow = function(url) {

    console.log('....\n..... create new window',url);
    const index=createWindow(-2,url);
    trapOpenNewWindowEvent(index);
};

var createOrShowMainWindow = function(hide=false) {
    if (state.winlist[0]!==null) {
        state.winlist[0].show();
        return;
    }
    console.log('....\n..... create or show main window');
    createWindow(0);
    trapOpenNewWindowEvent(0);
    if (hide) {
        state.winlist[0].minimize();
    }
};



// -----------------------------------------------------------------------
// ----------------------------------- App Level Stuff -------------------
// -----------------------------------------------------------------------

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin')  {
        biswebTerminate();
        return;
    }

    if (process.platform === 'darwin')  {
        macExitQuestion().then( (m) => {
            console.log('.... exiting',m);
            biswebTerminate(0);
        }).catch( (e) => {
            console.log('.... not exiting',e);
            createOrShowMainWindow(true); 
        });
    }
});




// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async function() {

    let setup=toolfile;
    let keys=Object.keys(setup.tools);
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
    if (state.queryargs.length>0) {
        console.log(getTime()+' \t Query args= "'+state.queryargs+'"');
    }
    if (state.commandargs.length>0) {
        console.log(getTime()+' Command args='+state.commandargs);
    }

    
    state.screensize.width=electron.screen.getPrimaryDisplay().workAreaSize.width;
    if (state.screensize.width<900)
        state.screensize.width=900;
    
    state.screensize.height=electron.screen.getPrimaryDisplay().workAreaSize.height;
    if (state.screensize.height<700)
        state.screensize.height=700;

    let tools=setup.tools;
    const Menu=electron.Menu;
    let mitems=[];
    let i=0;
    
    if (process.platform === 'darwin') {
        for (i=0;i<keys.length;i++)  {
            let key=keys[i]; 
            let a='file://'+path.resolve(__dirname , tools[key].url+'.html'); // jshint ignore:line
            /* jshint ignore:start */
            (function outer(a){
                mitems.push({ label: tools[key].title, click: () =>{
                    createNewWindow(a);
                }});
            }(a));
            /* jshint ignore:end */
        }
        
        let menu=Menu.buildFromTemplate([
            {  label: "Application Selector", click: () => { createOrShowMainWindow(); }},
            {  label: 'Tools', submenu : mitems }
        ]);

        let menu2=Menu.buildFromTemplate([
            {  label: 'Main',  
               submenu : [
                   {  label: "Application Selector", click: () => { createOrShowMainWindow(); }},
                   {   type: 'separator'},
                   { 
                       label : 'Exit ⌘Q', click: () => {
                           macExitQuestion().then( () => {
                               biswebTerminate();
                           }).catch( (e) => {
                               console.log(e);
                           });
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

    if (process.platform === 'darwin')  {
        globalShortcut.register('CommandOrControl+Q', () => {
            macExitQuestion().then( () => {
                biswebTerminate(0);
            }).catch( (e) => {
                console.log('Anyalive'+e);
                createOrShowMainWindow(); 
            });
        });
    }

    setTimeout( () => {
        if (state.mainfilename === '') {
            createOrShowMainWindow();
        } else {
            createNewWindow("file://"+fullURL);
        }
    },100);


});

app.on('activate', () => {
    setTimeout( () => {
        createOrShowMainWindow();
    },500);
});


ipcMain.on('ping', function (event, arg) {
    console.log(getTime()+' (PING) '+arg);
});

ipcMain.on('showdevtools', function () {
    let win = BrowserWindow.getFocusedWindow();
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



