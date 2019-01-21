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

/* global window,setTimeout */
"use strict";

/**
 * @file A Broswer module. Contains {@link WebFileUtil}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const $=require('jquery');
const webutil=require('bis_webutil');
const bisweb_dropbox=require('bisweb_simpledropbox');
const bisweb_onedrive=require('bisweb_simpleonedrive');
const bisweb_googledrive=require('bisweb_drivemodule');
const amazonaws=require('bisweb_awsmodule.js');
let bisweb_awsmodule = null;// new amazonaws();


const genericio=require('bis_genericio');
const userPreferences = require('bisweb_userpreferences.js');
//const bisdbase = require('bisweb_dbase');
const keystore=require('bis_keystore');
const dkey=keystore.DropboxAppKey || "";
const gkey=keystore.GoogleDriveKey || "";
const mkey=keystore.OneDriveKey || "";


// Ensure that these get initialized
//userPreferences.initialize(bisdbase).catch( () => {
//    console.log('--- No preference database available');
//});


// ------------------------
// Global Flags
// ------------------------

const enableserver=true;

// This is an option
let enableaws=false;


// ------------------------
// Link File Server if not in Electron
let bisweb_fileserverclient=null;
if (!webutil.inElectronApp() && enableserver===true) {
    const BisWebFileServerClient=require('bisweb_fileserverclient');
    bisweb_fileserverclient=new BisWebFileServerClient();
}

// Initial mode
let fileMode='local';
let fileInputElements= [];
let iosFileDialog=null;



const webfileutils = {

    /**
     * Checks whether one of Google Drive, Dropbox, or OneDrive has usable keys in the current configuration.
     * These keys live in the 'internal' directory outside of the rest of the codebase. 
     */
    needModes : function() {
        if (dkey.length>0 || gkey.length>0 || mkey.length>0)
            return true;
        return false;
    },

    /**
     * Returns the current file mode of the application. May be one of Google Drive, Dropbox, OneDrive, Amazon AWS, Local Server, or standard File I/O (<input type='file'>)
     */
    getMode: function() {
        return fileMode;
    },
    
    /**
     * Creates a list containing the file sources that are available to the application. This is based on the keys that are present in 'internal', and whether or not the document supports a local fileserver. 
     */
    getModeList : function() {
        let s=[ 
            { value: "local", text: "Local File System" }
        ];

        //localserver requires its HTML element to be present in the document
        if (bisweb_fileserverclient)
            s.push({ value : "server", text: "BioImage Suite Web File Server Helper"});
        if (enableaws)
            s.push({ value : 'amazonaws', text: 'Amazon S3'});

        if (dkey.length>1)
            s.push({ value: "dropbox", text: "Dropbox (Load Only)" });
        if (gkey.length>1) 
            s.push({ value: "googledrive", text: "Google Drive (Load Only)" });
        //  if (mkey.length>1) 
        //     s.push({ value: "onedrive", text: "Microsoft OneDrive (Load Only)" });

        return s;
    },
    
    /**
     * Changes the file source of the application. 
     * @param {String} m - The source to change to. One of 'dropbox', 'googledrive', 'onedrive', 'amazonaws', 'server', or 'local'
     * @param {Boolean} save - If true -- save preferences on change
     */

    setMode : function(m='',save=true) {

        fileMode='local';
        
      // TODO: Check if fileserver and aws are enabled else disable
        switch(m)
        {
            case 'dropbox' : {
                if(dkey) 
                    fileMode = 'dropbox';
                break;
            } 
            case 'googledrive' : {
                if (gkey) 
                    fileMode = 'googledrive';
                break;
            }
            case 'onedrive' :  {
                if (mkey) 
                    fileMode = 'onedrive';
                break;
            }
            case 'amazonaws' : {
                if (enableaws) 
                    fileMode = 'amazonaws';
                break;
            }
            case 'server' : {
                if (enableserver)
                    fileMode = 'server';
                break;
            }
        }

        if (fileMode === 'server') {
            genericio.setFileServerObject(bisweb_fileserverclient);
        } else if (fileMode === 'amazonaws') {
            genericio.setFileServerObject(bisweb_awsmodule);
        } else {
            genericio.setFileServerObject(null);
        }

        if (save) {
            userPreferences.setItem('filesource',fileMode);
            userPreferences.storeUserPreferences();
        }
    },


    // ------------------------------------------------------------------------------------------
    /** can I do complex I/O
     * Either Electron or Browser with Server or S3
     * @alias WebFileUtil.candoComplexIO
     * @returns{Boolean} true or false
     */
    candoComplexIO: function() {
        
        if (genericio.getmode()!=='browser')
            return true;
        
        if (fileMode==='server' || fileMode==='amazonaws')
            return true;
        
        webutil.createAlert('You need to connect to a local fileserver on an S3 share before this operation.',true);
        return false;
    },


    // ------------------------------------------------------------------------------------------
    
    /** 
     * Electron file callback function -- invoked instead of webFileCallback if the application is running in Electron. 
     * @alias WebFileUtil.electronFileCallback
     * @param {Object} fileopts - the file options object 
     * @param {String} fileopts.title - if in file mode and file set the title of the file dialog
     * @param {Boolean} fileopts.save - if in file mode and file determine load or save
     * @param {String} fileopts.defaultpath - if in file mode and file use this as original filename
     * @param {String} fileopts.filter - if in file mode and file use this to filter file style
     * @param {String} fileopts.suffix - used to create filter if present (simplified version)
     * @param {Function} callback - callback to call when done
     */
    electronFileCallback: function (fileopts, callback) {
        fileopts = fileopts || {};
        fileopts.save = fileopts.save || false;
        fileopts.title = fileopts.title || 'Specify filename';
        fileopts.defaultpath = fileopts.defaultpath || '';

        let suffix = fileopts.suffix || '';
        if (suffix === "NII" || fileopts.filters === "NII")
            fileopts.filters = [
                { name: 'NIFTI Images', extensions: ['nii.gz', 'nii'] },
                { name: 'All Files', extensions: [ "*"]},
            ];
        if (suffix === "DIRECTORY")
            fileopts.filters = "DIRECTORY";


        
        
        if (fileopts.defaultpath==='') {
            try {
                if (fileopts.initialCallback)
                    fileopts.defaultpath=fileopts.initialCallback() || '';
            } catch(e) {
                console.log(e);
            }
        }
        
        
        fileopts.filters = fileopts.filters ||
            [{ name: 'All Files', extensions: ['*'] }];

        if (fileopts.filters === "NII")
            fileopts.filters = [
                { name: 'NIFTI Images', extensions: ['nii.gz', 'nii'] },
                { name: 'All Files', extensions: ['*'] },
            ];

        var cmd = window.BISELECTRON.dialog.showSaveDialog;
        if (!fileopts.save)
            cmd = window.BISELECTRON.dialog.showOpenDialog;

        if (fileopts.filters === "DIRECTORY") {
            cmd(null, {
                title: fileopts.title,
                defaultPath: fileopts.defaultpath,
                properties: ["openDirectory"],
            }, function (filename) {
                if (filename) {
                    return callback(filename + '');
                }
            });
        } else {
            cmd(null, {
                title: fileopts.title,
                defaultPath: fileopts.defaultpath,
                filters: fileopts.filters,
            }, function (filename) {
                if (filename) {
                    return callback(filename + '');
                }
            });
        }
    },

    /** 
     * Web file callback function. This function will be invoked by any buttons that load or save if the application has been launched from a browser. 
     * This function will call the load and save functions of whichever file source is specified (see setFileSource or another similar function). 
     * @alias WebFileUtil.webFileCallback
     * @param {Object} fileopts - the callback options object
     * @param {String} fileopts.title - if in file mode and web set the title of the file dialog
     * @param {Boolean} fileopts.save - if in file mode and web determine load or save
     * @param {String} fileopts.defaultpath - if in file mode and web use this as original filename
     * @param {String} fileopts.suffix - if in file mode and web use this to filter web style
     * @param {String} fileopts.force - force file selection mode (e.g. 'local');
     * @param {Function} callback - Callback to call when done. Typically this is provided by bis_genericio and will put the loaded image onto the viewer or perform any necessary actions after saving an image. 
     */
    webFileCallback: function (fileopts, callback) {

        fileopts.suffix=fileopts.suffix || null;
        fileopts.filters=fileopts.filters || null;
        fileopts.force=fileopts.force || null;

        let suffix = fileopts.suffix || '';
        let title = fileopts.title || '';
        let defaultpath=fileopts.defaultpath || '';

        if (fileopts.suffix===null && fileopts.filters!==null) {
            if (fileopts.filters==="DIRECTORY" || fileopts.filters==="NII" ) {
                suffix=fileopts.filters;
                fileopts.suffix=suffix;
            }
        }

        //        console.log('Suffix =',fileopts.suffix,suffix,fileopts.filters);
        
        if (suffix === "NII" || fileopts.filters === "NII") {
            suffix = '.nii.gz,.nii,.gz,.tiff';
            fileopts.filters=[{ name: 'NIFTI Images', extensions: ['nii.gz', 'nii'] }];
        } else if (suffix !== "DIRECTORY" && suffix!=='') {
            let s=suffix.split(",");
            for (let i=0;i<s.length;i++) {
                let a=s[i];
                if (a.indexOf(".")!==0)
                    s[i]="."+s[i];
            }
            suffix=s.join(",");
        }

        let fmode=fileMode;
        if (fileopts.force !== null)
            fmode=fileopts.force;

        let cbopts = { 'callback' : callback,
                       'title' : title,
                       'suffix' : suffix,
                       'mode' : 'load' ,
                       'filters' : fileopts.filters
                     };


        // -------------------- End Of Part I ---------------

        if (fileopts.suffix === "DIRECTORY") {
            cbopts.initialFilename= '';
            cbopts.mode='directory';
            cbopts.suffix='';

            if (fmode !== 'server' && fmode !== 'amazonaws') {
                webutil.createAlert('You need to connect to a local fileserver on an S3 share before this operation.',true);
                return false;
            }
        }

        // -------------------- End of Part IA -------------
        
        if (fileopts.save) {
            // We are now saving only server, aws or local
            
            if (fmode === 'server' || fmode === 'amazonaws') {

                let initialDir=null;
                let initialFilename=null;

                try {
                    if (fileopts) {
                        if (fileopts.initialCallback) {
                            let f=fileopts.initialCallback() || '';
                            if (f.length>0) {
                                let ind=f.lastIndexOf("/");
                                if (ind>0) {
                                    initialDir=f.substr(0,ind);
                                    initialFilename=f.substr(ind+1,f.length);
                                } else {
                                    initialFilename=f;
                                    initialDir=null;
                                }
                            }
                        }
                    }
                } catch(e) {
                    console.log(e); 
                }

                if (!initialFilename && defaultpath.length>0) {
                    initialDir=defaultpath;
                    initialFilename=null;
                }
                
                cbopts.initialFilename=initialFilename || '';
                cbopts.mode='save';
                if (fmode === 'server') 
                    bisweb_fileserverclient.requestFileList(initialDir, true, cbopts);
                else
                    bisweb_awsmodule.wrapInAuth('uploadfile', cbopts);
                return;
            }

            // Local file system save
            // The way this works is that you first create the save object
            // and then it invokes download object which saves the thing to a file
            // and never tells you whether it happened.
            callback();
            return;
        }
        
        // -------- Part II Load -----------
        
        if (fmode==='dropbox') { 
            fileopts.suffix=suffix;
            return bisweb_dropbox.pickReadFile(fileopts, callback);
        }
        
        if (fmode==='onedrive') { 
            fileopts.suffix=suffix;
            return bisweb_onedrive.pickReadFile(fileopts, callback);
        }
        
        
        if (fmode==="googledrive") {
            bisweb_googledrive.create().then( () => {
                bisweb_googledrive.pickReadFile("").then(
                    (obj) => {
                        callback(obj[0]);
                    }
                ).catch((e) => { console.log('Error in Google drive', e); });
            }).catch( (e) => { console.log(e);
                               webutil.createAlert("Failed to intitialize google drive connection", true);
                             });
            return;
        }

        if (fmode==="amazonaws") {
            bisweb_awsmodule.wrapInAuth('showfiles', cbopts);
            return;
        }

        if (fmode==="server") {
            bisweb_fileserverclient.requestFileList(null,true,cbopts);
            return;
        }


        let nid=webutil.getuniqueid();
        for (let i=0;i<fileInputElements.length;i++)
            fileInputElements[i].remove();

        
        
        if (!genericio.inIOS()) {
            let loadelement = $(`<input type="file" style="visibility: hidden;" id="${nid}" accept="${suffix}"/>`);
            fileInputElements.push(loadelement);

            loadelement[0].addEventListener('change', function (f) {
                callback(f.target.files[0]);
            });
            $('body').append(loadelement);
            loadelement[0].click();
        } else {
            if (!iosFileDialog) 
                iosFileDialog=webutil.createmodal('Select Input File');
            
            iosFileDialog.titlediv.empty();
            if (fileopts.title.length<1)
                fileopts.title='Select File';
            iosFileDialog.titlediv.append(`<H4>${fileopts.title}</H4>`);
            let loadelement = $(`<input type="file" id="${nid}" accept="${suffix}"/>`);
            fileInputElements.push(loadelement);
            loadelement[0].addEventListener('change', function (f) {
                iosFileDialog.dialog.modal('hide');
                setTimeout( () => {
                    callback(f.target.files[0]);
                },50);
                return false;
            });
            iosFileDialog.body.append(loadelement);
            iosFileDialog.dialog.modal('show');
            iosFileDialog.body[0].click();
        }
            
    },

    /** 
     * Use this to activate a file callback directly (in electron or for server/s3)
     * @alias WebFileUtil.genericFileCallback
     * @param {object} fileopts - the file dialog options object (in file style)
     * @param {string}  fileopts.title  - in file: dialog title
     * @param {boolean} fileopts.save -  in file determine load or save
     * @param {string}  fileopts.defaultpath -  use this as original filename
     * @param {string}  fileopts.filter - use this as filter (if in electron)
     * @param {string}  fileopts.suffix - List of file types to accept as a comma-separated string e.g. ".ljson,.land" (simplified version filter)
     * @param {string}  fileopts.force - If defined this load will force the load to use a given file source.
     * @param {Function} callback -- functiont to call when done

     */
    genericFileCallback : function(fileopts={},callback=null) {

        fileopts = fileopts || {};
        fileopts.save = fileopts.save || false;

        const that = this;

        if (webutil.inElectronApp()) {
            that.electronFileCallback(fileopts, callback);
        } else {
            setTimeout( () => {
                that.webFileCallback(fileopts, callback);
            },1);
        }
    },

    /** Create File Callback 
     * @alias WebFileUtil.attachFileCallback
     * @param {JQueryElement} button -- the element to attach the callback to
     * @param {object} fileopts - the file dialog options object (in file style)
     * @param {string}  fileopts.title  - in file: dialog title
     * @param {boolean} fileopts.save -  in file determine load or save
     * @param {BisImage} fileopts.saveImage - the file to save (Optional)
     * @param {string}  fileopts.defaultpath -  use this as original filename
     * @param {string}  fileopts.filter - use this as filter (if in electron)
     * @param {string}  fileopts.suffix - List of file types to accept as a comma-separated string e.g. ".ljson,.land" (simplified version filter)
     */
    attachFileCallback : function(button,callback,fileopts={}) {

        fileopts.save = fileopts.save || false;

        if (webutil.inElectronApp()) {
            
            button.click( (e) => {
                setTimeout( () => {
                    e.stopPropagation();
                    e.preventDefault();  
                    this.electronFileCallback(fileopts, callback);
                },1);
            });
        } else {
            button.click( (e) => {
                setTimeout( () => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.webFileCallback(fileopts, callback);
                },1);
            });
        }
    },



    /** 
     * Function that creates button using Jquery/Bootstrap (for styling) & a hidden
     * input type="file" element to load a file. Calls WebFileUtil.createbutton for most things
     * @alias WebFileUtil.createFileButton
     * @param {object} opts - the options object.
     * @param {string} opts.name - the name of the button.
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {object} opts.css - if specified set additional css styling info (Jquery .css command, object)
     * @param {string} opts.type - type of button (for bootstrap styling). One of "default", "primary", "success", "info", "warning", "danger", "link"
     * @param {function} opts.callback - if specified adds this is a callback ``on click''. The event (e) is passed as argument.
     * @param {string} opts.tooltip - string to use for tooltip
     * @param {string} opts.position - position of tooltip (one of top,bottom,left,right)
     * @returns {JQueryElement} 
     */
    createFileButton: function (opts, fileopts={}) {
        
        let finalcallback = opts.callback || null;
        if (finalcallback !== null && typeof finalcallback === "function") {
            opts.callback = finalcallback;
        } else {
            throw (new Error('create file button needs a non-null callback'));
        }
        
        opts.callback=null;
        let but= webutil.createbutton(opts);
        this.attachFileCallback(but,finalcallback,fileopts);
        return but;
    },


    /** 
     * Create drop down menu item (i.e. a single button) with the appropriate file callback.
     * @param {JQueryElement} parent - the parent to add this to
     * @param {String} name - the menu name (if '') adds separator
     * @param {Function} callback - the callback for item
     * @param {String} suffix - if not empty then this creates a hidden file menu that is
     * @param {Object} opts - the electron options object -- used if in electron
     * @param {String} opts.title - if in file mode and electron set the title of the file dialog
     * @param {Boolean} opts.save - if in file mode and electron determine load or save
     * @param {BisImage} opts.saveFile - file to save. 
     * @param {String} opts.defaultpath - if in file mode and electron use this as original filename
     * @param {String} opts.filter - if in file mode and electron use this to filter electron style
     * @param {String} css - styling info for link element
     * activated by pressing this menu
     * @alias WebFileUtil.createMenuItem
     * @returns {JQueryElement} - The element created by the function.
     */
    createFileMenuItem: function (parent, name="", callback=null, fileopts={},css='',classname='') {

        let style='';
        if (css.length>1)
            style=` style="${css}"`;

        let menuitem = $(`<li></li>`);
        let linkitem=$(`<a href="#" ${style}>${name}</a></li>`);
        if (classname.length>0)
            linkitem.addClass(classname);
        menuitem.append(linkitem);
        parent.append(menuitem);
        webutil.disableDrag(menuitem,true);
        this.attachFileCallback(menuitem,callback,fileopts);
        return menuitem;
    },
    // ------------------------------------------------------------------------

    /**
     * Creates a file menu item with standard BioImageSuite styling. 
     * See parameters for createFileMenuItem.
     */
    createDropdownFileItem : function (dropdown,name,callback,fileopts,classname='') {
        /*return this.createFileMenuItem(dropdown,name,callback,fileopts,
-                                       "background-color: #303030; color: #ffffff; font-size:13px; margin-bottom: 2px");*/

        classname= classname || 'biswebdropdownitem';
        return this.createFileMenuItem(dropdown,name,callback,fileopts,'',classname);
    },

    /**
     * Creates a modal with radio buttons to allow a user to change the file source for the application and a dropdown button in the navbar to open the modal.
     * @param {JQueryElement} bmenu - The navbar menu to attach the dropdown button to. 
     * @param {String} name - The name for the dropdown button. 
     * @param {Boolean} separator - Whether or not the dropdown should be followed by a separator line in the menu. True by default.
     */
    createFileSourceSelector : function(bmenu,name="Set File Source",separator=true) {

        const self=this;
        
        let fn=function() {
            userPreferences.safeGetItem('filesource').then( (initial) => {
                initial= initial || 'local';
                let extra="";
                if (enableserver) {
                   extra=`
                        <HR><p>You may download the bisweb fileserver using npm. Type <B>npm install biswebnode</B>. Once this is installed look into the <B>biswebnode/serverconfig</B> directory for instructions.
                        Use with care. This requires <a href="https://nodejs.org/en/download/" target="_blank" rel="noopener">node.js vs 10.x</a>
                        </p>`;
                }
                
                webutil.createRadioSelectModalPromise(`<H4>Select File Source</H4><HR>`,
                                                      "Close",
                                                      initial,
                                                      self.getModeList(),
                                                      extra).then( (m) => {
                                                         self.setMode(m);
                                                     }).catch(() => {
                                                         
                                                     });
            });
        };

        //TODO: debug dropbox, googledrive and one dirve to make sure they work
        

        if (!webutil.inElectronApp() && this.needModes()) {
            if (separator)
                webutil.createMenuItem(bmenu,'');
            webutil.createMenuItem(bmenu, name, fn);
        }
    },

    createAWSMenu : function() {
        if (enableaws) {
            if  (bisweb_awsmodule===null) {
                bisweb_awsmodule = new amazonaws();
            }
            bisweb_awsmodule.createAWSBucketMenu();
        }
    },

    initializeFromUserPrefs : function () {
        if (!webutil.inElectronApp() ) {
            
            Promise.all( [ userPreferences.safeGetItem('filesource'),
                           userPreferences.safeGetItem('enables3') ]).then( (lst) => {
                               let f=lst[0];
                               enableaws=lst[1] || false;
                               f= f || fileMode;
                               console.log('+++++ Initial File Source=',f, 's3enabeled=',enableaws);
                               if (enableaws && bisweb_awsmodule===null) {
                                   bisweb_awsmodule = new amazonaws();
                               }
                               this.setMode(f,false);
                           }).catch( () => {
                               this.setMode('local',false);
                           });
        } else {
            this.setMode('local',true);
        }
    }
};

module.exports=webfileutils;

                          
