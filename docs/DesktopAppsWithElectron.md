This document contains [developer documentation](README.md) for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). 

---
[ELECTRON]: http://electron.atom.io/


# Developing with Electron 

[Electron][ELECTRON] was originally developed as a basis for GitHub's Atom
editor and went by the name "Atom Shell". It was then refactored into a
full-blown standalone platform for HTML/CSS/JS-based Desktop
Applications. The [Electron webpage][ELECTRON] is an excellent source of
documentation for further reference. This document will focus on how the multi-platform modules work with Electron as well as command line Node.js and browser-based setups.

All the code in this section can be found under
`examples/electronmodule`, which is a slightly modified version of
`examples/universalmodule`.

_Note: As far as modules are concerned Electron is essentially
an expanded browser. Most of the code is used like in the browser but the Electron code uses a "preload-injection" mechanism to add a finite number of Node modules that do not work in the browser._

---

## The Main Process

The code to start Electron must be invoked with a path to a directory containing a JSON-formatted configuration file called `package.json`. This takes the form:

    {
        "name" : "Application Name",
        "version" : "1.0",
        "main" : "biselectron.js"
    }

The bisweb version of this file may be found in [web/package.json](../web/package.json).

The `"main"` field stores a pointer to the Javascript file that will be
run when the executable starts. This is the base or core process. This process then starts a renderer process by creating a `RenderWindow` object. This second process, and 
potentially a third and fourth and fifth, etc. if more BrowserWindows are
created, is effectively a packaged web browser. Consider now a simplified version of [the main electron file](../web/biselectron.js).

First require some core modules:

     "use strict";
     const electron = require('electron');
     const path=require('path');
     const app=electron.app;  // Module to control application life.
     const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

Next store a reference to the main window of the application, `mainWindow`. Once it is created, the app will not terminate
until `mainWindow` goes out of scope. That typically happens when the app is closed.

     let mainWindow = null;

This function creates the main window using `index.html`:

     var createWindow = function() {

         let hidden = 'shown';
         let opts = { width: 600, height: 400 };
         let fullURL='file://' + path.resolve(__dirname , 'index.html');

This is key here — the script `bispreload.js` is run _before_ the html file is loaded
and can include Node-style requires even if the rest of the window
has no node integration (note the `nodeIntegration:false` line in the block below). See the [section on the renderer process](#The-Renderer-Process) for more details.

         let preload =  path.resolve(__dirname, 'bispreload.js');

Next create the main window:

         mainWindow = new BrowserWindow({
                    width: opts.width,
                    height: opts.height,
                    show: true,
                    webPreferences: {
                        nodeIntegration: false,
                        preload: preload,
                    },
                    });

Register callbacks using ES6-style arrow functions

         mainWindow.once('ready-to-show', () => { mainWindow.show(); });
         mainWindow.on('closed', () => { mainWindow = null; });

Load the URL to start

         mainWindow.loadURL(fullURL);
     };

These callbacks are copied directly from Electron examples:

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
         createWindow();
     });

The rest of the code is boilerplate adapted from Electron examples for the most part. The only notable change is in the `webPreferences` options in creation of the `BrowserWindow` (see line on `webPreferences` in [BrowserWindow API](https://github.com/electron/electron/blob/master/docs/api/browser-window.md)):

    webPreferences: {
          nodeIntegration: false,
          preload: preload,
    },

These settings mean the following:

* `nodeIntegration : false` disables the `require` statement for all JavaScript code loaded in the `BrowserWindow`.  This will enforce maximum compatibility with the native web codebase by disabling Node-only keywords.

* `preload : preload` specifies a JavaScript file to be loaded _before_ the HTML file. This will allow the use of some Node.js specific code in a structured way. 
 

To run this code in development mode, first navigate to the root directory of the source tree. Then ensure a valid build using:

    gulp build

Then start the electron process in BioImage Suite Web using

    electron web

This will open the file ``web/package.json`` and use this to load the
initial script, `biselectron.js`. This will then instantiate a `BrowserWindow` and load the familiar ``web/index.html`` (or `viewer.html` if this was specified). This is set by the
combination of the following two statements:

       let fullURL = 'file://' + path.resolve(__dirname , 'index.html');
       mainWindow.loadURL(fullURL);

The first resolves index.html using a ``file://`` style URI in global scopeand the second loads the URL.

The Electron scripts can also open a `BrowserWindow` at a different HTML. For example, to open a browser window and load `viewer.html`, type: 

    electron main viewer

---

## The Renderer Process

The renderer process is effectively a localized web
browser that loads an HTML file and all associated JS/CSS files. The one
difference is the preload script, which loads before the HTML and accesses Node-specific code. Consider [web/bispreload.js](../web/bispreload.js), the preload file for BioImage Suite's Electron bindings:

    /* global  window,Buffer,__dirname */
    "use strict";

    const electron = require('electron');
    const remote = electron.remote;

    window.BISELECTRON = {
        // ----------------------------------------------------
        // Add modules here
        // ----------------------------------------------------
        version : '1.0',
        bispath : __dirname,
        fs : require('fs'),
        zlib : require('zlib'),
        path : require('path'),
        os : require('os'),
        glob : require('glob'),
        ipc : electron.ipcRenderer,
        dialog : remote.require('electron').dialog,
        remote : remote,
        Buffer : Buffer,
    };

This defines a global object, `BISELECTRON`, and attaches it to the browser's `window`. This object is used to store references to resolved Node.js dependencies that the native code may reference later. This include the core File System modules (``fs``, ``path`` and
``zlib``) and the ``dialog`` sub-package which can be used to create 
File -> Open and File -> Save dialogs. Note that this functionality is encapsulated in `window.BISELECTRON`. This construct is heavily used in [bis_genericio.js](../js/core/bis_genericio.js) — see also the description in [BisWebJS.md](BisWebJS.md#A-quick-note-on-Electron)

The attentive reader may note that the dialog package is a reference to an object contained in `remote`, the base process. The Electron documentation contains more details of why this is so, but this distinction is unimportant for the purposes of the preload.

---

## Electron File Dialogs

### Introduction

Unlike a Web Application, Electron can initiate file dialogs programmatically. Here is an example of the File -> Open dialog,

            window.BISELECTRON.dialog.showOpenDialog( null, {
                title: 'Select file to save image in',
                defaultPath : 'initial.jpg',
                filters : [ 
                    { name: 'JPEG Files', extensions: [ "jpeg","jpg","JPG" ] },
                    { name: 'All Files', extensions: [ "*" ] }
              ],
            }, function(filename) {
                if(filename) {
                    ... do something
                }
            });

 and the same for File -> Save.

            window.BISELECTRON.dialog.showSaveDialog( null, {
                title: 'Select file to save image in',
                defaultPath : 'initial.jpg',
                filters : [ 
                    { name: 'JPEG Files', extensions: [ "jpeg","jpg","JPG" ] },
                    { name: 'All Files', extensions: [ "*"]}
              ],
            }, function(filename) {
                if(filename) {
                    ... do something
                }
            });
        } 

### Specifying Filename Filters:

The filters in the Electron file dialogs are defined as arrays of dictionaries. Each dictionary has two elements:

* `name` — the name of the filter as a string
* `extension` — an array of strings specifying the extensions __without the preceeding period ('.')__

### Electron File Selection and the Module `bis_webutil`

BioImage Suite Web has a module [js/coreweb/bis_webutil](../js/coreweb/bis_webutil.js) which contains code to abstract common GUI operations. Consider in particular `electronFileCallback`, which can be used to show the dialogs above.

The function takes two inputs:

* `electronopts` — a parameters object
* `callback` — the function to call with the selected filename as the argument

Here is the actual code:


        /** electron file callback function
        * @alias WebUtil.electronfilecallbackoptions
        * @param {Object} electronopts - the electron options object - used if in electron
        * @param {String} electronopts.title - if in file mode and electron set the title of the file dialog
        * @param {Boolean} electronopts.save - if in file mode and electron determine load or save
        * @param {String} electronopts.defaultpath - if in file mode and electron use this as original filename
        * @param {String} electronopts.filter - if in file mode and electron use this to filter electron style
        * @param {Function} callback - callback to call when done
        */
        electronFileCallback: function (electronopts, callback) {

Parse the options and assign default values:

            electronopts = electronopts || {};
            electronopts.save = electronopts.save || false;
            electronopts.title = electronopts.title || 'Specify filename';
            electronopts.defaultpath = electronopts.defaultpath || '';
            electronopts.filters = electronopts.filters ||
                [{ name: 'All Files', extensions: ['*'] }];

The filters has a shortcut hardcoded for loading images — '`NII`' will produce two filters that specify either NIFTI Images or any file.

            if (electronopts.filters === "NII")
                electronopts.filters = [
                    { name: 'NIFTI Images', extensions: [ 'nii.gz', 'nii' ] },
                    { name: 'All Files', extensions: [ '*' ] },
                ];

Select which electron dialog to invoke (load or save)

            let cmd = window.BISELECTRON.dialog.showSaveDialog;
            if (!electronopts.save)
                cmd = window.BISELECTRON.dialog.showOpenDialog;

If the filter is the word "DIRECTORY" use the special call to `electron.showOpenDialog` below,

            if (electronopts.filters === "DIRECTORY") {
                cmd(null, {
                    title: electronopts.title,
                    defaultPath: electronopts.defaultpath,
                    properties: ["openDirectory"],
                }, function (filename) {
                    if (filename) {
                        return callback(filename + '');
                    }
                });
            } else {

else try to get a filename:

                cmd(null, {
                    title: electronopts.title,
                    defaultPath: electronopts.defaultpath,
                    filters: electronopts.filters,
                }, function (filename) {
                    if (filename) {
                        return callback(filename + '');
                    }
                });
            }
        };

Here are a couple of examples of this function being invoked. The following selects a directory and calls `clb(directoryname)`, when done.

        webutil.electronFileCallback({
            filters : "DIRECTORY",
            title : "Select Directory to store output files",
            },
        clb);


This is a call to save a transformation file:

            webutil.electronFileCallback({
                filename : initial_filename,
                title    : 'Select filename to save the transformation to',
                filters  :  [
                                { name: 'Transformation Files', extensions: [ "bisxform","matr","grd" ] },
                                { name: 'All Files', extensions: [ "*" ] }
                          ],
                save : true,
            },function(f) { 
                saveItem(f);  // this is a random function
            });

To load a transformation, change `save:true` to `save:false`.

The module `bis_webutil` has some other interesting functions such as:

* `createfilebutton`
* `createMenuItem`

These call `electronFileCallback` to handle file selection operations.
