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

/*global window,document,setTimeout,HTMLElement */

"use strict";

const bisweb_apputil = require("bisweb_apputilities.js");
const BisWebImage = require('bisweb_image');
const webutil = require('bis_webutil');
const webcss = require('bisweb_css');
const webfileutil = require('bis_webfileutil');
const FastClick = require('fastclick');
const userPreferences = require('bisweb_userpreferences.js');
const $ = require('jquery');
const bisdbase = require('bisweb_dbase');
const genericio=require('bis_genericio');
const bootbox=require('bootbox');
const BisWebPanel = require('bisweb_panel.js');
const resliceImage = require('resliceImage');
const BisWebLinearTransformation = require('bisweb_lineartransformation.js');
const idb=require('idb-keyval');
const localforage=require('localforage');


const clipboard=localforage.createInstance({
    driver : localforage.INDEXEDDB,
    name : "BioImageSuiteWebClipboard",
    version : 1.0,
    storeName : "biswebclipboard",
    description : "BioImageSuite Web Clipboard",
});




/**
 * A Application Level Element that creates a Viewer Application using an underlying viewer element.
 *
 * @example
 *
 * <bisweb-viewerapplication
 *     bis-menubarid="#viewer_menubar"
 *     bis-painttoolid="#painttool"
 *     bis-consoleid="#bisconsole"
 *     bis-viewerid="#viewer"
 *     bis-viewerid2="#viewer">
 * </bisweb-viewerapplication>
 *
 * Attributes
 *     bis-menubarid : theid a <bisweb-topmenubar> element
 *     bis-painttoolid : the id of an optional  <bisweb-painttoolelement>
 *     bis-viewerid : the id of the underlying <bisweb-orthogonalviewer> or <bisweb-mosaicviewer> element
 *     bis-viewerid2 : the id of the second <bisweb-orthogonalviewer> element (must be for use as slave)
 *     bis-consoleid : the id of an optional <bisweb-console> element.
 *     bis-modulemanagerid : the id of an optional <bisweb-modulemanager> element that manages processing modules
 *     bis-imagepath : if set the path to the images (used for external applications0
 */
class ViewerApplicationElement extends HTMLElement {

    constructor() {
        super();
        this.extraManualHTML='';
        this.externalMode=false;
        this.syncmode = false;
        this.simpleFileMenus=false;
        this.VIEWERS=[];
        this.num_independent_viewers = 0;
        this.saveState=null;
        this.applicationURL=webutil.getWebPageURL();
        this.applicationName=webutil.getWebPageName();
        if (this.applicationName.lastIndexOf("2")===this.applicationName.length-1)
            this.applicationName=this.applicationName.substr(0,this.applicationName.length-1);
        console.log("+++++ App name=",this.applicationName,this.applicationURL);

        
        // For dual tab apps
        this.tab1name=null;
        this.tab2name=null;

        if (this.applicationName==="overlayviewer")
            this.extraManualHTML='overlayviewer.html';
        else if (this.applicationName==="editor")
            this.extraManualHTML='imageeditor.html';
        
        this.applicationInitializedPromiseList= [ ];

        
        
    }

    // ----------------------------------------------------------------------------
    /** return a viewer by index
     * @param{Number} index -- 0 or 1
     * @returns{Viewer}
     */
    getViewer(index) {
        if (index<0 || index>=this.VIEWERS.length)
            return this.VIEWERS[0];
        return this.VIEWERS[index];
    }
    
    //  ---------------------------------------------------------------------------
    /** returns the extension to use when saving/loading the application state
     * @param{Boolean} storeimages - if true storing images
     * @returns {String} - the extension without a preceeding "."
     */
    getApplicationStateFilenameExtension(storeimages=true) {
        if (storeimages)
            return 'biswebstate';
        return 'state';
    }
    
    /** returns the default filename to use when saving/loading the application state
     * @param{Boolean} storeimages - if true storing images
     * @returns {String} - the filename
     */
    getApplicationStateFilename(storeimages=false) {
        return this.applicationName+"."+this.getApplicationStateFilenameExtension(storeimages);
    }

    //  ---------------------------------------------------------------------------
    // In case of dual viewers
    /** Return the visible tab
     * @returns{Number} - either 1 or 2
     */
    getVisibleTab() {
        if (this.tab1name && this.tab2name) {
            let tab2link = this.getAttribute('bis-tab2');
            let widget=$(tab2link);
            let cls=widget.attr('class');
            if (cls.indexOf('active')>=0) 
                return 2;
        }
        return 1;
    }

    /** Set the visible tab in case of a dual viewer 
     * @param{Number} n - either 1 or 2
     */
    setVisibleTab(n) {

        if (this.tab1name && this.tab2name) {
            if (n===1)
                $(this.tab1name).tab('show');
            else
                $(this.tab2name).tab('show');
        }
    }
    

    //  ---------------------------------------------------------------------------
    // Find the viewers ('bis-viewerid' and 'bis-viewerid2') and store them in t
    // this.VIEWERS
    // Also set this.num_independent_viewers appropriately
    //  ---------------------------------------------------------------------------
    findViewers() {

        const viewerid = this.getAttribute('bis-viewerid');
        const viewerid2 = this.getAttribute('bis-viewerid2') || null;

        this.VIEWERS = [document.querySelector(viewerid)];
        this.VIEWERS[0].setName('viewer1');
        if (viewerid2 !== null) {
            this.VIEWERS.push(document.querySelector(viewerid2));
            this.VIEWERS[1].setName('viewer2');
        }

        this.num_independent_viewers = this.VIEWERS.length;
        if (this.syncmode) {
            this.num_independent_viewers = 1;
            webutil.setAlertTop(130);
        }


    }

    // ---------------------------------------------------------------------------
    // Copy & Paste
    
    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {

        let obj = {};
        for (let i=0;i<this.VIEWERS.length;i++) {
            let name=`viewer${i+1}`;
            let getimg=storeImages;
            if (i>=this.num_independent_viewers) {
                getimg=false;
            }
            obj[name]=this.VIEWERS[i].getElementState(getimg);
        }

        obj.sidetools={};
        const atlastoolid=this.getAttribute('bis-atlastoolid') || null;
        const blobanalyzerid=this.getAttribute('bis-blobanalyzerid') || null;
        
        if (atlastoolid) {
            let atlascontrol=document.querySelector(atlastoolid);
            if (atlascontrol.isOpen())
                obj.sidetools.atlascontrol=true;
        }
        if (blobanalyzerid) {
            let blobcontrol=document.querySelector(blobanalyzerid);
            if (blobcontrol.isOpen())
                obj.sidetools.clustertool=true;
        }
        
        return obj;
    }
    
    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null,name="") {

        if (dt===null)
            return;

        let numviewers=this.VIEWERS.length;
        if (name==="overlayviewer" && this.applicationName!=="overlayviewer")
            numviewers=1;
        
        for (let i=0;i<numviewers;i++) {
            let name=`viewer${i+1}`;
            let elem=dt[name] || null;
            this.VIEWERS[i].setElementState(elem);
        }
        if (this.num_independent_viewers > 1) {
            this.VIEWERS[1].setDualViewerMode(this.VIEWERS[1].internal.viewerleft);
        }

        let sidetools=dt.sidetools || {};

        const atlastoolid=this.getAttribute('bis-atlastoolid') || null;
        const blobanalyzerid=this.getAttribute('bis-blobanalyzerid') || null;

        
        if (sidetools.atlascontrol && atlastoolid) {
            let atlascontrol=document.querySelector(atlastoolid);
            setTimeout(()=> {
                atlascontrol.show();
            },100);
        }
        
        if (sidetools.clustertool && blobanalyzerid) {
            let blobcontrol=document.querySelector(blobanalyzerid);
            setTimeout( ()=> {
                blobcontrol.show();
            },500);
        }
    }

    
    /** store State in this.saveState , unless filename is not null, in which case save */
    storeState(saveImages=false) {
        this.saveState=this.getElementState(saveImages);
        return;
    }

    /** restore State from this.internal.saveState unless obj is not null
     * @param {Object} obj - if set then restore from this else from this.saveState
     */
    restoreState(obj=null,name=null) {

        let inp=obj || this.saveState;
        name = name || this.applicationName;
        
        if (inp) {
            return this.setElementState(inp,name);
        }
    }

    /** copy Viewer State to clipboard 
     * @param{number}  index - the viewer index (0 or 1)
     */
    copyViewer(index=0) {
        let st=this.VIEWERS[index].getElementState(true);
        clipboard.setItem('viewer',st).then( () => {
            console.log('copied viewer',index,'to clipboard');
        }).catch( (e) => {
            console.log(e);
        });
    }

    /** paste Viewer State from clipboard 
     * @param{number}  index - the viewer index (0 or 1)
     */
    pasteViewer(index=0) {
        clipboard.getItem('viewer').then( (st) => {
            //console.log('Read state',Object.keys(st));
            this.VIEWERS[index].setElementState(st);
        }).catch( (e) => {
            console.log('paste error',e,e.stack);
        });
    }
    
    // ---------------------------------------------------------------------------
    // Reslice Code
    // ---------------------------------------------------------------------------
    resliceOverlay(modulemanager,index=0) {

        let img=this.VIEWERS[index].getimage();
        let ov =this.VIEWERS[index].getobjectmap();


        let dim=img.getDimensions();
        let spa=img.getSpacing();
        let dim2=ov.getDimensions();
        let spa2=ov.getSpacing();

        let linear=new BisWebLinearTransformation(0); 
        linear.setShifts(dim,spa,dim2,spa2);
        linear.setParameterVector([ 0,0,0,0,0,0],{ scale:true, rigidOnly:true });

        let mod=new resliceImage();
        mod.execute({
            input : ov,
            reference : img,
            xform : linear,
        }, {
            addgrid : false,
            interpolation : 3
        }).then(() => {
            let temp=mod.getOutputObject('output');
            this.VIEWERS[index].setobjectmap(temp, false);
        });
    }

    
    // ---------------------------------------------------------------------------
    // I/O Code
    // ---------------------------------------------------------------------------
    loadImage(fname, viewer = 0) {
        const self=this;

        
        const img = new BisWebImage();
        return new Promise( (resolve,reject) => {

            webutil.createAlert('Loading image from ' + genericio.getFixedLoadFileName(fname),'progress', 30, 0, { 'makeLoadSpinner' : true });
            setTimeout( () => {
                img.load(fname)
                    .then(function () {
                        webutil.createAlert('Image loaded from ' + img.getDescription());
                        self.VIEWERS[viewer].setimage(img);
                        resolve();
                    }).catch( (e) => { reject(e); });
            },10);
        });
    }

    loadOverlay(fname, viewer=0) {

        const self=this;
        return new Promise( (resolve,reject) => {
            let img = new BisWebImage();
            webutil.createAlert('Loading image from ' + genericio.getFixedLoadFileName(fname),'progress',30, 0, { 'makeLoadSpinner' : true });
            setTimeout( () => {
                img.load(fname)
                    .then(function () {
                        webutil.createAlert('Objectmap loaded from ' + img.getDescription());
                        self.VIEWERS[viewer].setobjectmap(img, false);
                        resolve();
                    }).catch((e) => {
                        webutil.createAlert(e, true);
                        console.log(e.stack);
                        reject(e);
                    });
            },10);
        });
    }

    
    // Save Image
    // --------------------------------------------------------------------------------
    /** Save image from viewer to a file */
    saveImage(fname=null, viewerno = 0) {
        let name="Image";
        if (this.num_independent_viewers >1) 
            name=`${name} ${viewerno + 1}`;
        let img = this.VIEWERS[viewerno].getimage();
        bisweb_apputil.saveImage(img, fname, name);
    }

    getSaveImageInitialFilename(viewerno = 0) {
        let img = this.VIEWERS[viewerno].getimage();
        if (img)
            return img.getFilename();
        return "none.nii.gz";
    }
    
    /** Save image from viewer to a file */
    saveOverlay(fname=null, viewerno = 0) {

        let name="Overlay";
        //let index="";
        if (this.num_independent_viewers >1)  {
            name=`${name} ${viewerno + 1}`;
            //index=`_${viewerno+1}`;
        }
        let img = this.VIEWERS[viewerno].getobjectmap();
        //        if (!fname)
        //  fname = "objectmap" + index +".nii.gz";
        bisweb_apputil.saveImage(img, fname, name);
    }

    getSaveOverlayInitialFilename(viewerno = 0) {

        let img = this.VIEWERS[viewerno].getobjectmap();
        if (img)
            return img.getFilename();
        return "none.nii.gz";
    }



    // ---------------------------------------------------------------------------
    // Advanced Transfer Tool
    // ---------------------------------------------------------------------------
    createAdvancedTransferTool(modulemanager,editmenu) {

        const self=this;
        let name='Advanced Transfer Tool';
        if (!modulemanager) {
            name='App State Manager';
        }

        let dual=false;
        if (this.num_independent_viewers >1) {
            dual=true;
        }
        
        let newdlg=new BisWebPanel(this.VIEWERS[0].getLayoutController(),
                                   {
                                       name : name,
                                       width :300,
                                       dual : dual,
                                   });

        var bbar=webutil.createbuttonbar({ parent: newdlg.getWidget(),
                                           css : { 'margin-top' : '10px' ,
                                                   'margin-left' : '4px' }
                                         });
        
        var bbar1=webutil.createbuttonbar({ parent: bbar,
                                            css : { 'margin-bottom' : '20px','width' : '100%'}
                                          });


        webutil.createbutton({ type : "default",
                               name : "Store State",
                               parent : bbar1,
                               css : { 'width' : '120px' },
                               callback : function() {
                                   self.storeState();
                               }
                             });
        
        webutil.createbutton({ type : "default",
                               name : "Retrieve State",
                               parent : bbar1,
                               css : { 'left': '140px',
                                       'width':'120px',
                                       'position':'absolute'
                                     },
                               callback : function() {
                                   self.restoreState();
                               }
                             });

        if (modulemanager) {
            if (this.num_independent_viewers >1) {

                var bbar0=webutil.createbuttonbar({ parent: bbar,
                                                    css : {
                                                        'margin-bottom' : '10px',
                                                        'width' : '100%',
                                                    }
                                                  });
                
                webutil.createbutton({ type : "success",
                                       name : "V1 &rarr; V2",
                                       parent : bbar0,
                                       css : { 'width' : '80px' },
                                       callback : function() {
                                           modulemanager.transferImages(0,1);
                                       }
                                     });
                
                webutil.createbutton({ type : "success",
                                       name : "V2 &rarr; V1",
                                       parent : bbar0,
                                       css : { 'position': 'absolute',
                                               'width' : '80px',
                                               'left': '90px'
                                             },
                                       callback : function() {
                                           modulemanager.transferImages(1,0);
                                       }
                                     });
                

                webutil.createbutton({ type : "success",
                                       name : "V1 &harr; V2",
                                       parent : bbar0,
                                       css : { 'position': 'absolute',
                                               'width' : '80px',
                                               'left': '180px'
                                             },
                                       callback : function() {
                                           modulemanager.swapImages();
                                       }
                                     });


                var bbar2=webutil.createbuttonbar({ parent: bbar,
                                                    css : { 'margin-bottom' : '10px',
                                                            'width' : '100%' }
                                                  });

                
                webutil.createbutton({ type : "info",
                                       name : "V2 Im &rarr; V1 Ov",
                                       parent : bbar2,
                                       css : { 'width' : '120px' },
                                       callback : function() {
                                           modulemanager.transferImageToOverlay(1,0);
                                       }
                                     });

                webutil.createbutton({ type : "info",
                                       name : "V1 Im &rarr; V2 Ov",
                                       parent : bbar2,
                                       css : { 'width' : '120px',
                                               'left'  : '140px',
                                               'position' : 'absolute',
                                             },
                                       callback : function() {
                                           modulemanager.transferImageToOverlay(0,1);
                                       }
                                     });

                var bbar3=webutil.createbuttonbar({ parent: bbar,
                                                    css : { 'margin-bottom' : '10px',
                                                            'width' : '100%' }
                                                  });

                
                webutil.createbutton({ type : "info",
                                       name : "V2 Ov &rarr; V1 Im",
                                       parent : bbar3,
                                       css : { 'width' : '120px' },
                                       callback : function() {
                                           modulemanager.transferOverlayToImage(1,0);
                                       }
                                     });

                webutil.createbutton({ type : "info",
                                       name : "V1 Ov &rarr; V2 Im",
                                       parent : bbar3,
                                       css : { 'width' : '120px',
                                               'left'  : '140px',
                                               'position' : 'absolute',
                                             },
                                       callback : function() {
                                           modulemanager.transferOverlayToImage(0,1);
                                       }
                                     });

            } else {
                webutil.createbutton({ type : "info",
                                       name : "Copy Image &rarr; Overlay",
                                       parent : bbar,
                                       css : { 'width' : '260px', 'margin-bottom': '10px' },
                                       callback : function() {
                                           modulemanager.transferImageToOverlay(0,0);
                                       }
                                     });

                webutil.createbutton({ type : "info",
                                       name : "Copy Overlay &rarr; Image",
                                       parent : bbar,
                                       css : { 'width' : '260px', 'margin-bottom': '10px' },
                                       callback : function() {
                                           modulemanager.transferOverlayToImage(0,0);
                                       }
                                     });
            }

            let bottom=webutil.createbuttonbar({ parent: bbar,
                                                 css : {'margin-top' : '20px',
                                                        'width' : '100%' }
                                               });
            webutil.createbutton({ type : "danger",
                                   name : "Undo Image",
                                   parent : bottom,
                                   css : { 'width' : '120px' },
                                   callback : function() {
                                       modulemanager.getAlgorithmController().undoImage(true);
                                   }
                                 });
            
            webutil.createbutton({ type : "warning",
                                   name : "Redo Image",
                                   parent : bottom,
                                   css : { 'width' : '120px', 'left': '140px', 'position' : 'absolute' },
                                   callback : function() {
                                       modulemanager.getAlgorithmController().undoImage(false);
                                   }
                                 });
        }
        webutil.createMenuItem(editmenu,'');
        webutil.createMenuItem(editmenu,name,function() {
            newdlg.show();
        });
    }
    
    // ---------------------------------------------------------------------------
    // Create the default File and Overlay Menus
    //  ---------------------------------------------------------------------------
    createFileAndOverlayMenus(menubar,painttoolid) {

        const self=this;
        let paintviewerno = self.VIEWERS.length - 1;

        
        // --------------------------------------------------------------------------
        // Callbacks for load image
        // -----------------------------------------------------------------------
        /** Callback to load the overlay image -- this is called from bisweb_painttol (if it exists)
         * @param {BisWebImage} vol - the objectmap to load
         */
        
        // -----------------------------------------------------------------------
        // Menus
        // -----------------------------------------------------------------------


        let fmenu = [0, 0], objmenu = [0, 0];
        let fmenuname = "File", objmenuname = 'Overlay';


        // Essentially bind self here
        let load_image=function(f,v) { return self.loadImage(f,v); };        
        let load_objectmap=function(f,v) { return self.loadOverlay(f,v); };

        //  ---------------------------------------------------------------------------
        // Internal Function to eliminate having a loop variable inside callbacks
        // JSHint calls this confusing semantics ... maybe it knows something
        //  ---------------------------------------------------------------------------
        let internal_create_menu=function(viewerno) {

            if (viewerno === 1) {
                fmenuname = 'Image2';
                objmenuname = 'Overlay2';
            }

            
            if (painttoolid !== null && viewerno === paintviewerno) {
                objmenuname = "Objectmap";
                if (viewerno === 1)
                    objmenuname = "Objectmap2";
            }
            
            // ----------------------------------------------------------
            // File Menu
            // ----------------------------------------------------------
            fmenu[viewerno] = webutil.createTopMenuBarMenu(fmenuname, menubar);

            if (!self.simpleFileMenus) {
                            
                webfileutil.createFileMenuItem(fmenu[viewerno], 'Load Image',
                                               function (f) {
                                                   self.loadImage(f, viewerno);
                                               },
                                               { title: 'Load image',
                                                 save: false,
                                                 suffix: 'NII'
                                               });
                
                webfileutil.createFileMenuItem(fmenu[viewerno], 'Save Image',
                                               function (f) {
                                                   self.saveImage(f, viewerno); },
                                               {
                                                   title: 'Save Image',
                                                   save: true,
                                                   filters: "NII",
                                                   suffix : "NII",
                                                   initialCallback : (() => {
                                                       return self.getSaveImageInitialFilename(viewerno);
                                                   })
                                               });
                webutil.createMenuItem(fmenu[viewerno], ''); // separator
                bisweb_apputil.createMNIImageLoadMenuEntries(fmenu[viewerno], load_image, viewerno);
            }


            // ----------------------------------------------------------
            // Objectmap/Overlay Menu
            // ----------------------------------------------------------
            if (!self.simpleFileMenus) {
                objmenu[viewerno] = webutil.createTopMenuBarMenu(objmenuname, menubar);
                
                let painttool = null;
                
                if (painttoolid !== null && viewerno === paintviewerno) {
                    painttool = document.querySelector(painttoolid);
                    
                    painttool.createMenu(objmenu[viewerno]);
                    
                    const graphtool = document.createElement('bisweb-graphelement');
                    webutil.createMenuItem(objmenu[viewerno], 'VOI Analysis',
                                           function () {
                                               graphtool.parsePaintedAreaAverageTimeSeries(self.VIEWERS[paintviewerno]);
                                           });
                    
                } else {
                    
                    webfileutil.createFileMenuItem(objmenu[viewerno], 'Load Overlay',
                                                   function (f) {
                                                       self.loadOverlay(f, viewerno);
                                                   }, 
                                                   { title: 'Load overlay', save: false, suffix: "NII" });
                    
                    webfileutil.createFileMenuItem(objmenu[viewerno], 'Save Overlay',
                                                   function (f) {
                                                       self.saveOverlay(f, viewerno);
                                                   },
                                                   {
                                                       title: 'Save Overlay',
                                                       save: true,
                                                       filters: "NII",
                                                       suffix : "NII",
                                                       initialCallback : () => {
                                                           return self.getSaveOverlayInitialFilename(viewerno);
                                                       }
                                                   });
                    webutil.createMenuItem(objmenu[viewerno], ''); // separator
                    
                    webutil.createMenuItem(objmenu[viewerno], 'Clear Overlay',
                                           function () {
                                               self.VIEWERS[viewerno].clearobjectmap();
                                           });
                    if (self.applicationName=="overlayviewer") {
                        webutil.createMenuItem(objmenu[viewerno], ''); // separator
                        webutil.createMenuItem(objmenu[viewerno], 'Reslice Overlay To Match Image',
                                               function () {
                                                   self.resliceOverlay(viewerno);
                                               });
                    }
                }
                
                webutil.createMenuItem(objmenu[viewerno], ''); // separator
                bisweb_apputil.createBroadmannAtlasLoadMenuEntries(objmenu[viewerno], load_objectmap, viewerno);
            }
        };

        // ---------------------------------------------------------------------
        // End of callback ... now the loop
        // ---------------------------------------------------------------------
        
        for (let viewerno = 0; viewerno < this.num_independent_viewers; viewerno++) {
            internal_create_menu(viewerno);
        }

        return fmenu[0];
    }

    // ---------------------------------------------------------------------
    // Electron default callbacks (load image from arguments) 
    // ---------------------------------------------------------------------
    
    parseElectronArguments() {

        const self=this;
        
        let load=function(fname,v,a) {

            let n=genericio.getFixedLoadFileName(fname);
            let ext=n.split(".").pop();
            if (ext===this.getApplicationStateFilenameExtension(true)) {
                self.loadApplicationState(fname);
                return 1;
            } else {
                self.loadImage(fname,v,a);
                return 0;
            }
        };

        if (webutil.inElectronApp()) {
            let title = $(document).find("title").text();
            setTimeout(function () {
                window.BISELECTRON.ipc.send('arguments', title);
            }, 120);
            
            window.BISELECTRON.ipc.on('arguments-reply', function (evt, args) {
                window.BISELECTRON.ipc.send('ping', 'Arguments received: ' + args);
                let a=-1;
                if (args.length > 0) {
                    a=load(args[0], 0, false);
                }
                if (args.length > 1 && this.num_independent_viewers > 1 && a===0) {
                    load(args[1], 1, false);
                }
            });
        }
    }


    // ---------------------------------------------
    // create the help menu
    // ---------------------------------------------

    addOrientationSelectToMenu(hmenu) {

        let orientSelect = function () {
            userPreferences.safeGetImageOrientationOnLoad().then( (orient) => {
                webutil.createRadioSelectModalPromise(`<H4>Select default orientation "on load"</H4><p>If RAS or LPS is elected then the images will be reoriented to Axial RAS or LPS on load.</p><HR>`,
                                                      "Close",
                                                      orient,
                                                      [{ value: "RAS", text: "Axial RAS (SPM)" },
                                                       { value: "LPS", text: "Axial LPS (DICOM, BioImage Suite legacy)" },
                                                       { value: "None", text: "Leave as is" }]).then((m) => {
                                                           userPreferences.setImageOrientationOnLoad(m);
                                                           userPreferences.storeUserPreferences();
                                                       }).catch((e) => { console.log('Error ', e); });
            });
        };

        webutil.createMenuItem(hmenu, "Set Image Orientation On Load", orientSelect);

    }
    
    createHelpMenu(menubar,extrahtml=null) {

        if (extrahtml===null)
            extrahtml=this.extraManualHTML;
        
        let hmenu = webutil.createTopMenuBarMenu("Help", menubar);

        let fn = (() => {
            this.welcomeMessage(true) ;
        });
        
        webutil.createMenuItem(hmenu,'About this application',fn);

        let link=`a href="https://bioimagesuiteweb.github.io/bisweb-manual/${extrahtml}" target="_blank" rel="noopener"`; 
        hmenu.append($(`<li><${link}>BioImage Suite Web Online Manual</a></li>`));
        webutil.createMenuItem(hmenu, 'Toggle Dark/Bright Mode', () => {   this.toggleColorMode();  });
        webutil.createMenuItem(hmenu, ''); // separator

        this.addOrientationSelectToMenu(hmenu);

        if (webutil.inElectronApp()) {
            webutil.createMenuItem(hmenu, ''); // separator
            webutil.createMenuItem(hmenu, 'Show JavaScript Console',
                                   function () {
                                       window.BISELECTRON.remote.getCurrentWindow().toggleDevTools();
                                   });
            userPreferences.safeGetItem('electonzoom').then( (v) => {
                let z=v || 1.0;
                if (z<0.8 || z>1.25)
                    z=1.0;
                window.BISELECTRON.electron.webFrame.setZoomFactor(z);
            });
        }

        webfileutil.createFileSourceSelector(hmenu);

        if (!webutil.inElectronApp()) { 
            userPreferences.safeGetItem("internal").then( (f) =>  {
                if (f) {
                    webutil.createMenuItem(hmenu, ''); // separator
                    webutil.createMenuItem(hmenu, 'Open AWS Selector', 
                                           () => {
                                               webfileutil.createAWSMenu();
                                           });
                }
            }).catch( () => { });
        }



        return hmenu;
    }

    // ---------------------------------------------------------------------------
    // Extra Menu -- use this to attach functionality in derived classes
    // ---------------------------------------------------------------------------
    createExtraMenu(/*menubar*/) {
        return;
    }
    // ---------------------------------------------------------------------------
    // create and attach drag and drop controller
    // ---------------------------------------------------------------------------

    attachDragAndDrop() {

        const self=this;
        
        let HandleFiles = function (files, e) {
            let count = 0;
            if (self.num_independent_viewers > 1) {
                if (self.VIEWERS[0].getInsideViewer(e.offsetX))
                    count = 0;
                else
                    count = 1;
            }
            
            let ext=files[0].name.split(".").pop();
            if (ext===self.getApplicationStateFilenameExtension(true)) {
                self.loadApplicationState(files[0]);
            } else {
                self.loadImage(files[0], count, false).then( () => {
                    if (files.length>1) {
                        self.loadOverlay(files[1],count,false);
                    }
                });
            }
        };
        webutil.createDragAndCropController(HandleFiles);
    }
    // ----------------------------------------------------------
    // Display Menu
    // ----------------------------------------------------------
    createDisplayMenu(menubar,editmenu) {

        const self=this;
        let gmenu = null;
        let extra='Show ';
        if (!editmenu) {
            gmenu=webutil.createTopMenuBarMenu("Display", menubar);
            extra='';
        }  else {
            gmenu=editmenu;
            webutil.createMenuItem(gmenu,'');
        }

        if (webutil.inElectronApp()) {
            webutil.createMenuItem(gmenu, 'Zoom 80%',
                                   function () {
                                       window.BISELECTRON.electron.webFrame.setZoomFactor(0.8);
                                       userPreferences.setItem('electronzoom',0.8,true);
                                   });
            webutil.createMenuItem(gmenu, 'Zoom 100%',
                                   function () {
                                       window.BISELECTRON.electron.webFrame.setZoomFactor(1.0);
                                       userPreferences.setItem('electronzoom',1.0,true);
                                   });
            webutil.createMenuItem(gmenu, 'Zoom 125%',
                                   function () {
                                       window.BISELECTRON.electron.webFrame.setZoomFactor(1.25);
                                       userPreferences.setItem('electronzoom',1.2,true); 
                                       
                                   });
            webutil.createMenuItem(gmenu,'');
        }

        if (this.num_independent_viewers > 1) {
            webutil.createMenuItem(gmenu, extra+'Both Viewers', function () { self.VIEWERS[1].setDualViewerMode(0.5); });
            webutil.createMenuItem(gmenu, extra+'Viewer 1 Only', function () { self.VIEWERS[1].setDualViewerMode(1.0); });
            webutil.createMenuItem(gmenu, extra+'Viewer 2 Only', function () { self.VIEWERS[1].setDualViewerMode(0.0); });
            webutil.createMenuItem(gmenu,'');
            self.VIEWERS[0].setViewerMode('left', 0.5);
            self.VIEWERS[1].setViewerMode('right', 0.5);
            webutil.createMenuItem(gmenu, 'Viewer 1 Info', function () { self.VIEWERS[0].viewerInformation(); });
            webutil.createMenuItem(gmenu, 'Viewer 2 Info', function () { self.VIEWERS[1].viewerInformation(); });
        } else {
            webutil.createMenuItem(gmenu, 'Viewer Info', function () { self.VIEWERS[0].viewerInformation(); });
        }
        

        
    }

    //  ---------------------------------------------------------------------------
    
    loadApplicationState(fobj) {

        const self=this;
        return new Promise((resolve, reject) => {
            genericio.read(fobj, false).then((contents) => {
                let obj = null;
                try {
                    obj=JSON.parse(contents.data);
                } catch(e) {
                    webutil.createAlert('Bad application state file '+contents.filename+' probably not a application state file ',true);
                    reject(e);
                    return;
                }

                if (!obj.app) {
                    webutil.createAlert('Bad application state file '+contents.filename+' probably not a application state file ',true);
                    reject('error');
                    return;
                }

                // Account for viewer and viewer2 being the same thing
                if (obj.app.lastIndexOf("2")===obj.app.length-1)
                    obj.app=obj.app.substr(0,obj.app.length-1);
                
                if (obj.app !== this.applicationName) {
                    clipboard.setItem('lastappstate',obj).then( () => {

                        webutil.createAlert(`<p>This state file was not created using this application(<EM>${this.applicationName}</EM>).</p><p> Click <a href="./${obj.app}.html?restorestate=${contents.filename}">here to close this application and open <B>${obj.app}</B></a> instead.`,true);
                        /*</p><p> <button class="btn btn-link btn-small" id="${id}">(Click this link to force load this)</button>`,true);
                          let id=webutil.getuniqueid();
                        $('#'+id).click( () => {
                            $('.alert-danger').remove();
                            self.restoreState(obj.params,obj.app);
                            webutil.createAlert('Application state loaded from ' + contents.filename);
                            resolve("Done");
                        });*/
                    }).catch( (e) => {
                        console.log(e);
                    });
                    resolve("Done");
                    return;
                }
                
                self.restoreState(obj.params,obj.app);
                webutil.createAlert('Application state loaded from ' + contents.filename);
                resolve("Done");
            }).catch((e) => {
                console.log(e.stack,e);
                webutil.createAlert(`${e}`,true);
                reject(e);
            });
        });
    }

    /** save parameters to a file
     */
    saveApplicationState(fobj,storeimages=true) {

        const self=this;
        
        this.storeState(storeimages);
        
        let output= JSON.stringify({
            "app" : self.applicationName,
            "params" : this.saveState,
        },null,4);

        fobj=genericio.getFixedSaveFileName(fobj,self.getApplicationStateFilename(storeimages));
        //        console.log('Fobj=',fobj);
        
        return new Promise(function (resolve, reject) {
            genericio.write(fobj, output).then((f) => {
                if (!genericio.isSaveDownload())
                    webutil.createAlert('Application State saved '+f);
            }).catch((e) => {
                webutil.createAlert('Failed to save Application State '+e);
                reject(e);
            });
        });
    }

    //  ---------------------------------------------------------------------------
    createEditMenu(menubar) {
        const self=this;
        let editmenu=webutil.createTopMenuBarMenu("Edit", menubar);

        if (this.num_independent_viewers > 1) {
            webutil.createMenuItem(editmenu, 'Copy Viewer 1', function () { self.copyViewer(0); });
            webutil.createMenuItem(editmenu, 'Paste Viewer 1', function () { self.pasteViewer(0); });
            webutil.createMenuItem(editmenu,'');
            webutil.createMenuItem(editmenu, 'Copy Viewer 2', function () { self.copyViewer(1); });
            webutil.createMenuItem(editmenu, 'Paste Viewer 2', function () { self.pasteViewer(1); });

        } else {
            webutil.createMenuItem(editmenu, 'Copy Viewer', function () { self.copyViewer(0); });
            webutil.createMenuItem(editmenu, 'Paste Viewer', function () { self.pasteViewer(0); });
        }


        return editmenu;
    }

    
    createApplicationMenu(bmenu) {

        const self=this;
        if (!self.simpleFileMenus) 
            webutil.createMenuItem(bmenu,'');
            
        webfileutil.createFileMenuItem(bmenu,'Load Application State',
                                       function(f) {
                                           self.loadApplicationState(f);
                                       },
                                       { title: 'Load Application State',
                                         save: false,
                                         suffix : self.getApplicationStateFilenameExtension(true),
                                         filters : [ { name: 'Application State File', extensions: [self.getApplicationStateFilenameExtension(true)]}],
                                       }
                                      );
        


        webfileutil.createFileMenuItem(bmenu, 'Save Application State',
                                       function (f) {
                                           self.saveApplicationState(f,true);
                                       },
                                       {
                                           title: 'Save Application State',
                                           save: true,
                                           filters : [ { name: 'Application State File', extensions: [self.getApplicationStateFilenameExtension(true)]}],
                                           suffix : self.getApplicationStateFilenameExtension(true),
                                           initialCallback : () => {
                                               return self.getApplicationStateFilename(true);
                                           }
                                       });


        if (this.savelightstate)
            webfileutil.createFileMenuItem(bmenu, 'Save Light Application State',
                                           function (f) {
                                               self.saveApplicationState(f,false);
                                           },
                                           {
                                               title: 'Save Application State',
                                               save: true,
                                               filters : [ { name: 'Application State File', extensions: [self.getApplicationStateFilenameExtension(false)]}],
                                               suffix : self.getApplicationStateFilenameExtension(false),
                                               initialCallback : () => {
                                                   return self.getApplicationStateFilename(false);
                                               }
                                           });


        
        // ----------------------------------------------------------
        // DICOM
        // ----------------------------------------------------------
        userPreferences.safeGetItem("internal").then( (f) =>  {
            if (f) {
                const dicomid = this.getAttribute('bis-dicomimportid') || null;
                if (dicomid) {
                    let dicommodule = document.querySelector(dicomid) || null;
                    webutil.createMenuItem(bmenu,'');
                    webutil.createMenuItem(bmenu, 'Import DICOM', () => {
                        dicommodule.show();
                    });
                }
            }
                                                              
            webutil.createMenuItem(bmenu,'');
            webutil.createMenuItem(bmenu, 'Restart Application',
                                   function () {
                                       bootbox.confirm("Are you sure? You will lose all unsaved data.",
                                                       function(e) {
                                                           if (e)
                                                               window.open(self.applicationURL,'_self');
                                                       }
                                                      );
                                   });
        });
        return bmenu;
    }

    //  ---------------------------------------------------------------------------
    
    parseQueryParameters(painttoolid) {

        let load=webutil.getQueryParameter('load') || '';
        let imagename=webutil.getQueryParameter('image') || '';
        let imagename2=webutil.getQueryParameter('image2') || '';
        let overlayname=webutil.getQueryParameter('overlay') || '';
        let overlayname2=webutil.getQueryParameter('overlay2') || '';
        
        if (load.length>0) {
            this.loadApplicationState(load);
        } else if (imagename.length>0) {
            this.loadImage(imagename,0).then( () => {
                if (overlayname.length>0) {
                    if (painttoolid===null)  {
                        this.loadOverlay(overlayname,0);
                    } else {
                        let painttool = document.querySelector(painttoolid);
                        painttool.loadobjectmap(overlayname);
                    }
                }
            });
            if (imagename2.length>0 && this.num_independent_viewers>1) {
                this.loadImage(imagename2,1).then( () => {
                    if (overlayname2.length>0) {
                        this.loadOverlay(overlayname2,1);
                    }
                });
            }
        }

        let restore=webutil.getQueryParameter('restorestate');
        if (restore) {
            clipboard.getItem('lastappstate').then( (st) => {
                try {
                    if (st.app) {
                        setTimeout( () => {
                            this.restoreState(st.params,st.app);
                            clipboard.setItem('lastappstate',"");
                            webutil.createAlert('Loaded application state from '+restore);
                        },100);
                    } else {
                        webutil.createAlert('Failed to load application state from '+restore,true);
                    }
                } catch(e) {
                    console.log('Bad Last app state',e);
                }
            }).catch( (e) => {
                webutil.createAlert('Failed to load application state '+e,true);
            });
        }
    }
                                
    fixColors() {
        // This is probably already taken care of
        // by a viewerlayoutelement but if not ...
        //console.log("Calling setAutoColorMode");
        webcss.setAutoColorMode();
    }

    /** Toggle color mode */
    toggleColorMode(save=true) {

        webcss.toggleColorMode().then( (m) => {
            for (let i=0;i<this.VIEWERS.length;i++) {
                this.VIEWERS[i].handleColorModeChange(m);
            }
            if (save)
                userPreferences.setItem('darkmode', m,true);
        }).catch( (m) => {
            console.log("Failed to switch colors, staying with",m);
        });
    }
    

    finalizeConnectedEvent() {
        //signal other modules waiting for top bar to render
        let mainViewerDoneEvent = new CustomEvent('mainViewerDone');
        document.dispatchEvent(mainViewerDoneEvent);
        
        let istest = this.getAttribute('bis-testingmode') || false;
        webutil.runAfterAllLoaded( () => {
            Promise.all(this.applicationInitializedPromiseList).then( () => {
                webfileutil.initializeFromUserPrefs();
                const painttoolid = this.getAttribute('bis-painttoolid') || null;
                this.parseQueryParameters(painttoolid);
                this.fixColors();
                document.body.style.zoom =  1.0;

                if (!istest) {
                    this.welcomeMessage(false);
                } else {
                    webutil.createAlert('In Test Mode',false);
                }

                userPreferences.safeGetItem('darkmode').then( (m) => {
                    let s=webcss.isDark();
                    if (m!==s) 
                        this.toggleColorMode(false);
                });
                
            }).catch( (e) => {
                console.log('Error ',e);
            });
        });
    }

    
    // ---------------------------------------------------------------------------
    welcomeMessage(force=false) {

        if (this.externalMode)
            return;
        
        let show=force;

        let p=[ 
            userPreferences.safeGetImageOrientationOnLoad(),
            userPreferences.safeGetItem('showwelcome'),
            webutil.aboutText(),
        ];

        if (!webutil.inElectronApp()) {
            p.push( idb.get('mode'));
        }

        Promise.all(p).then( (lst) => {
            let forceorient=lst[0];
            let firsttime=lst[1];
            let msg=lst[2];

            lst[3]=lst[3] || '';
            
            let offline=false;
            // TODO: Check that this works
            if (lst[3].indexOf('offline')>=0)
                offline=true;
            
            if (firsttime === undefined)
                firsttime=true;
            
            if (!force) {
                if (forceorient !== 'None' || firsttime===true)
                        show=true;
            }
            
            if (!show)
                return;
            
            let dlg=webutil.createmodal('Welcome to BioImage Suite Web');
            let body=dlg.body;
            
            let txt=msg;

            if (offline)
                txt+="<HR><p>This application is operating in Offline Mode.</p><HR>";
            
            //            console.log('In Electron=',webutil.inElectronApp());
            
            if (!webutil.inElectronApp() && firsttime===true) {
                txt+=`<HR><H3>Some things you should
                know ...</H3><H4>File Save</H4> <p>Because this application is
                running inside a web browser, saving a file is performed by
                mimicking downloading a file. You should change the options
                inside your browser to allow you to specify the location of
                any file saved.</p> <p><EM>Chrome</EM>: See the section titled
                <B>Change download locations on the <a target="_blank"
                rel="noopener"
                href="https://support.google.com/chrome/answer/95759?co=GENIE.Platform%3DDesktop&hl=en&oco=1">following
                link</a> for instructions as to how to change the default
                download location. In particular you should <B> check the box
                next to "Ask where to save each file before
                downloading."</B></p> <p>For other browsers simply search for
                the words "Browsername select download location" on
                Google.</p>`;
                }
                
            if (forceorient!== "None") {
                txt+=`<HR><H3>Forcing Image Orientation</H3><p>On load all images are currently <B> automatically reoriented to ${forceorient}</B> based on your user preferences. Select Help|Set Image Orientation On Load to change this.</p>`;
            }
            
            dlg.header.empty();
            dlg.header.append('<H3>Welcome to BioImage Suite Web</H3>');
            body.append($(txt));
            
            if (!force && forceorient==="None") {
                let confirmButton = webutil.createbutton({ 'name': 'Do not show this next time', 'type': 'success' });
                confirmButton.on('click', (e) => {
                    e.preventDefault();
                    dlg.dialog.modal('hide');
                    userPreferences.setItem('showwelcome',false,true);
                });
                dlg.footer.append(confirmButton);
            }
            
            dlg.dialog.modal('show');
        }).catch( (e) => {
            console.log(e.stack,e);
        });
    }


    /** Fix touch events and prevent multitouch zoom of the whole UI */
    
    fixMobileMouseHandling() {
        new FastClick(document.body);
        window.addEventListener("touchstart", 
                                (event) => {
                                    if(event.touches.length > 1) {
                                        //the event is multi-touch
                                        //you can then prevent the behavior
                                        event.preventDefault();
                                    }
                                },{ passive : false});
    }
    
    //  ---------------------------------------------------------------------------
    // Essentially the main function, called when element is attached to the page
    //  ---------------------------------------------------------------------------
    setExternalAndImagePath() {

        const imagepath = this.getAttribute('bis-imagepath') || null;
        if (imagepath)
            webutil.setWebPageImagePath(imagepath);
        
        let ext=this.getAttribute('bis-external');
        if (ext) {
            this.externalMode=true;
            let a='';
            if (imagepath)
                a='using image path=' + imagepath;
            console.log("BioImage Suite Web Application Element running in External Mode=",this.externalMode,a);
        }

        if (!this.externalMode) {
            let p=userPreferences.initialize(bisdbase);
            p.catch( (e) => {
                console.log('No dbase available',e);
            });
            this.applicationInitializedPromiseList.push(p); // this is an async call to initialize. Use safe get later to make sure
        }


    }
    
    connectedCallback() {

        // Check if we are in external mode and if we have an imagepath
        this.setExternalAndImagePath();
        
        // -----------------------------------------------------------------------
        // Find other items
        // -----------------------------------------------------------------------

        const self = this;
        const menubarid = this.getAttribute('bis-menubarid');
        const painttoolid = this.getAttribute('bis-painttoolid') || null;
        const landmarkcontrolid=this.getAttribute('bis-landmarkcontrolid') || null;
        const atlastoolid=this.getAttribute('bis-atlastoolid') || null;
        const blobanalyzerid=this.getAttribute('bis-blobanalyzerid') || null;
        const managerid = this.getAttribute('bis-modulemanagerid') || null;
        this.savelightstate = this.getAttribute('bis-extrastatesave') || null;

        this.findViewers();
        


        let menubar = document.querySelector(menubarid).getMenuBar();
        
        let modulemanager = null;
        if (managerid !== null)  {
            modulemanager = document.querySelector(managerid) || null;
        }

        // ----------------------------------------------------------
        // Application Menu
        // ----------------------------------------------------------
        
        
        // ----------------------------------------------------------
        // Create the File and Overlay Menus
        // ----------------------------------------------------------
        let fmenu=this.createFileAndOverlayMenus(menubar,painttoolid);

        this.createApplicationMenu(fmenu);

        let editmenu=null;

        if (!this.simpleFileMenus) {
            editmenu=this.createEditMenu(menubar);
            this.createAdvancedTransferTool(modulemanager,editmenu);
            
            
            
            if (this.num_independent_viewers >1)
                this.createDisplayMenu(menubar,null);

            if (modulemanager)
                modulemanager.initializeElements(menubar, self.VIEWERS);
            
            if (this.num_independent_viewers <2 ) {
                this.createDisplayMenu(menubar, editmenu);
            }
            
            if (painttoolid !== null || landmarkcontrolid !==null) {
                
                let toolmenu = webutil.createTopMenuBarMenu('Tools', menubar);
                let p=Promise.resolve();
                if (painttoolid) {
                    let painttool = document.querySelector(painttoolid);
                    p=painttool.addTools(toolmenu);
                }
                if (landmarkcontrolid) {
                    let landmarkcontrol=document.querySelector(landmarkcontrolid);
                    p.then( () => {
                        if (painttoolid)
                            webutil.createMenuItem(toolmenu,'');
                        
                        webutil.createMenuItem(toolmenu,'Landmark Editor',function() {
                            landmarkcontrol.show();
                        });
                    });
                }   
            }
        } else {
            editmenu=webutil.createTopMenuBarMenu("Edit", menubar);
            webutil.createMenuItem(editmenu, 'Viewer Info', function () { self.VIEWERS[0].viewerInformation(); });
        }
        
        if (atlastoolid || blobanalyzerid) {
            webutil.createMenuItem(editmenu,'');
            
            if (atlastoolid) {
                let atlascontrol=document.querySelector(atlastoolid);
                webutil.createMenuItem(editmenu,'Atlas Tool',() => {
                    atlascontrol.show();
                    this.setVisibleTab(1);
                });
            }
            if (blobanalyzerid) {
                let blobcontrol=document.querySelector(blobanalyzerid);
                webutil.createMenuItem(editmenu,'Cluster Info Tool',() => {
                    blobcontrol.show();
                    this.setVisibleTab(1);
                });
            }   
        }
        

        
        // ----------------------------------------------------------
        // Electron Arguments
        // ----------------------------------------------------------
        if (webutil.inElectronApp()) {
            this.parseElectronArguments();
        }

        // ----------------------------------------------------------
        // Optional extra tool menu
        // ----------------------------------------------------------
        this.createExtraMenu(menubar);
        
        // ----------------------------------------------------------
        // Drag and Drop
        // ----------------------------------------------------------
        this.attachDragAndDrop();

        
        // ----------------------------------------------------------
        // Help Menu
        // ----------------------------------------------------------
        if (!this.externalMode) {
            let hmenu=this.createHelpMenu(menubar);
            
            
            // ----------------------------------------------------------------
            // Add help sample data option
            // ----------------------------------------------------------------
            if (this.applicationName==='overlayviewer') {
                webutil.createMenuItem(hmenu, ''); // separator
                webutil.createMenuItem(hmenu, 'Load Sample Data',
                                       function () {
                                           let imagepath=webutil.getWebPageImagePath();
                                           let f=`${imagepath}/viewer.biswebstate`;
                                           self.loadApplicationState(f);
                                       });
            }
        }

        // ----------------------------------------------------------
        // Mouse Issues on mobile and final cleanup
        // ----------------------------------------------------------
        this.fixMobileMouseHandling();
                                    
        
        if (this.num_independent_viewers > 1)
            self.VIEWERS[1].setDualViewerMode(0.5);

        // Clean up at the end
        this.finalizeConnectedEvent();
    }
}

module.exports = ViewerApplicationElement;
webutil.defineElement('bisweb-viewerapplication', ViewerApplicationElement);
