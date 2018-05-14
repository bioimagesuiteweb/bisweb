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
const bisweb_image = require('bisweb_image');
const webutil = require('bis_webutil');
const FastClick = require('fastclick');
const userPreferences = require('bisweb_userpreferences.js');
const $ = require('jquery');
const bisdbase = require('bisweb_dbase');
const genericio=require('bis_genericio');

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
 */
class ViewerApplicationElement extends HTMLElement {

    constructor() {
        super();
        this.syncmode = false;
        this.viewers=[];
        this.num_independent_viewers = 0;
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
        if (this.syncmode)
            this.num_independent_viewers = 1;


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
        let loadimage = function (fname, viewer = 0) {
            const img = new bisweb_image();
            return new Promise( (resolve,reject) => { 
                img.load(fname)
                    .then(function () {
                        webutil.createAlert('Image loaded from ' + img.getDescription());
                        self.VIEWERS[viewer].setimage(img);
                        resolve();
                    }).catch( (e) => { reject(e); });
            });
            //.catch((e) => { webutil.createAlert(e, true); });
        };
        // --------------------------------------------------------------------------------
        // Save Image
        // --------------------------------------------------------------------------------
        /** Save image from viewer to a file */
        let saveimage = function (fname, viewerno = 0) {

            let index = viewerno + 1;
            let img = self.VIEWERS[viewerno].getimage();
            let name = "image " + index;
            bisweb_apputil.saveImage(img, fname, name);
        };

        /** Save image from viewer to a file */
        let saveobjectmap = function (fname, viewerno = 0) {

            console.log('In Save Objectmap',viewerno);
            let index = viewerno + 1;
            let img = self.VIEWERS[viewerno].getobjectmap();
            let name = "objectmap " + index;
            bisweb_apputil.saveImage(img, fname, name);
        };

        /** Callback to load the overlay image -- this is called from bisweb_painttol (if it exists)
         * @param {bisweb_image} vol - the objectmap to load
         */
        let painttool_cb_objectmapread = function (vol, plainmode, alert) {
            if (alert !== false)
                webutil.createAlert('Objectmap loaded from ' + vol.getDescription());
            plainmode = plainmode || false;
            self.VIEWERS[paintviewerno].setobjectmap(vol, plainmode);
        };

        let loadobjectmap = function (fname, viewer, loadobj = null) {

            
            console.log('In Load Objectmap',fname,viewer);
            return new Promise( (resolve,reject) => {
                let img = new bisweb_image();
                img.load(fname)
                    .then(function () {
                        loadobj(img, viewer);
                        resolve();
                    }).catch((e) => {
                        webutil.createAlert(e, true);
                        reject();
                    });
            });
        };

        let exportobj=null;
        
        // -----------------------------------------------------------------------
        // Menus
        // -----------------------------------------------------------------------


        let fmenu = [0, 0], objmenu = [0, 0];
        let fmenuname = "Image", objmenuname = 'Overlay';




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
            
            webutil.createMenuItem(fmenu[viewerno], 'Load Image',
                                   function (f) {
                                       loadimage(f, viewerno);
                                   }, 'NII',
                                   { title: 'Load image', save: false });

            webutil.createMenuItem(fmenu[viewerno], 'Save Image',
                                   function (f) { saveimage(f, viewerno); },
                                   '',
                                   {
                                       title: 'Save Image',
                                       save: true, filters: "NII",
                                   });

            
            webutil.createMenuItem(fmenu[viewerno], ''); // separator
            if (!webutil.inElectronApp()) {
                bisweb_apputil.createCloudLoadMenuItems(fmenu[viewerno], 'Image', loadimage, viewerno);
            }
            bisweb_apputil.createMNIImageLoadMenuEntries(fmenu[viewerno], loadimage, viewerno);


            // ----------------------------------------------------------
            // Objectmap/Overlay Menu
            // ----------------------------------------------------------
            objmenu[viewerno] = webutil.createTopMenuBarMenu(objmenuname, menubar);

            let painttool = null, loaded_obj = null;

            if (painttoolid !== null && viewerno === paintviewerno) {
                painttool = document.querySelector(painttoolid);
                painttool.setobjectmapcallback(painttool_cb_objectmapread);
                painttool.createMenu(objmenu[viewerno]);

                loaded_obj = function (f) { painttool.setobjectmapimage(f); };

                const graphtool = document.createElement('bisweb-graphelement');
                webutil.createMenuItem(objmenu[viewerno], 'VOI Analysis',
                                       function () {
                                           graphtool.parsePaintedAreaAverageTimeSeries(self.VIEWERS[paintviewerno]);
                                       });

                exportobj=function(f) {
                    painttool.loadobjectmap(f);
                };
            } else {
                loaded_obj = function (vol,v) { self.VIEWERS[v].setobjectmap(vol, false); };
                webutil.createMenuItem(objmenu[viewerno], 'Load Overlay',
                                       function (f) {
                                           loadobjectmap(f, viewerno, loaded_obj);
                                       }, 'NII',
                                       { title: 'Load overlay', save: false });
                
                webutil.createMenuItem(objmenu[viewerno], 'Save Overlay',
                                   function (f) { saveobjectmap(f, viewerno); },
                                   '',
                                   {
                                       title: 'Save Overlay',
                                       save: true, filters: "NII",
                                   });

                webutil.createMenuItem(objmenu[viewerno], ''); // separator

                let my_load_obj = function (f, v) {
                    return loadobjectmap(f, v, loaded_obj);
                };

                if (!webutil.inElectronApp()) {
                    bisweb_apputil.createCloudLoadMenuItems(objmenu[viewerno], 'Overlay', my_load_obj, viewerno);
                }
                if (viewerno===0)
                    exportobj=my_load_obj;

                webutil.createMenuItem(objmenu[viewerno], 'Clear Overlay',
                                       function () {
                                           self.VIEWERS[viewerno].clearobjectmap();
                                       });
            }
            webutil.createMenuItem(objmenu[viewerno], ''); // separator
            bisweb_apputil.createBroadmannAtlasLoadMenuEntries(objmenu[viewerno], loadobjectmap, viewerno, loaded_obj);
        };

        // ---------------------------------------------------------------------
        // End of callback ... now the loop
        // ---------------------------------------------------------------------
        
        for (let viewerno = 0; viewerno < this.num_independent_viewers; viewerno++) {
            internal_create_menu(viewerno);
        }

        return {
            loadimage : loadimage,
            loadobjectmap : exportobj,
        };
    }

    // ---------------------------------------------------------------------
    // Electron default callbacks (load image from arguments) 
    // ---------------------------------------------------------------------
    
    createElectronArgumentCallbacK(loadimage) {
        
        
        if (webutil.inElectronApp()) {
            let title = $(document).find("title").text();
            setTimeout(function () {
                window.BISELECTRON.ipc.send('arguments', title);
            }, 120);
            
            window.BISELECTRON.ipc.on('arguments-reply', function (evt, args) {
                window.BISELECTRON.ipc.send('ping', 'Arguments received: ' + args);
                if (args.length > 0) {
                    loadimage(args[0], 0, false);
                }
                if (args.length > 1 && this.num_independent_viewers > 1) {
                    loadimage(args[1], 1, false);
                }
            });
        }
    }


    // ---------------------------------------------
    // create the help menu
    // ---------------------------------------------

    addOrientationSelectToMenu(hmenu,userPreferencesLoaded) {

        let orientSelect = function () {
            userPreferencesLoaded.then(() => {
                webutil.createRadioSelectModalPromise(`<H4>Select default orientation "on load"</H4><p>If RAS or LPS is elected then the images will be reoriented to Axial RAS or LPS on load.</p><HR>`,
                                                      "Close",
                                                      userPreferences.getImageOrientationOnLoad(),
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
    
    createHelpMenu(menubar,userPreferencesLoaded) {
        let hmenu = webutil.createTopMenuBarMenu("Help", menubar);

        webutil.createMenuItem(hmenu,'About this application',function() {  webutil.aboutDialog(); });
        
        /*        let helpdialog = document.createElement('bisweb-helpvideoelement');
        webutil.createMenuItem(hmenu, 'About Video',
                               function () {
                                   helpdialog.displayVideo();
                               });
        webutil.createMenuItem(hmenu, ''); // separator*/

        
        this.addOrientationSelectToMenu(hmenu,userPreferencesLoaded);

        const consoleid = this.getAttribute('bis-consoleid') || null;
        if (consoleid !== null) {
            webutil.createMenuItem(hmenu, ''); // separator
            let console = document.querySelector(consoleid);
            console.addtomenu(hmenu);

            if (webutil.inElectronApp()) {
                webutil.createMenuItem(hmenu, ''); // separator
                webutil.createMenuItem(hmenu, 'Show JavaScript Console',
                                       function () {
                                           window.BISELECTRON.remote.getCurrentWindow().toggleDevTools();
                                       });
            }
        }
        return hmenu;
    }

    // ---------------------------------------------------------------------------
    // Extra Menu -- use this to attach functionality in derived classes
    // ---------------------------------------------------------------------------
    createExtraMenu(menubar) {
        menubar=0;
        return;
    }
    // ---------------------------------------------------------------------------
    // create and attach drag and drop controller
    // ---------------------------------------------------------------------------

    attachDragAndDrop(loadimage) {

        const self=this;
        
        let HandleFiles = function (files, e) {
            let count = 0;
            if (self.num_independent_viewers > 1) {
                if (self.VIEWERS[0].getInsideViewer(e.offsetX))
                    count = 0;
                else
                    count = 1;
            }
            loadimage(files[0], count, false);
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
        
        if (this.num_independent_viewers > 1) {
            webutil.createMenuItem(gmenu, extra+'Both Viewers 50/50', function () { self.VIEWERS[1].setDualViewerMode(0.5); });
            webutil.createMenuItem(gmenu, extra+'Big Viewer 1 ', function () { self.VIEWERS[1].setDualViewerMode(0.75); });
            webutil.createMenuItem(gmenu, extra+'Big Viewer 2 ', function () { self.VIEWERS[1].setDualViewerMode(0.25); });
            webutil.createMenuItem(gmenu, extra+'Only Viewer 1', function () { self.VIEWERS[1].setDualViewerMode(1.0); });
            webutil.createMenuItem(gmenu, extra+'Only Viewer 2', function () { self.VIEWERS[1].setDualViewerMode(0.0); });
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
    
    parseQueryParameters(loadimage,loadobjectmap) {

        // Here we check if there is any info we need on the query string
        let load=webutil.getQueryParameter('load') || '';
        if (load.length<2)
            return 0;

        let load_viewer=function(vr,imagenames,overlaynames,baseurl) {

            if (imagenames[vr].length>0) {
                let imagename=baseurl+imagenames[vr];
                loadimage(imagename,vr).then( () => {
                    if (overlaynames[vr].length>0 && loadobjectmap!==null) {
                        let overlayname=baseurl+overlaynames[vr];
                        loadobjectmap(overlayname,vr);
                    }
                }).catch( (e) => {
                    console.log(e, e.stack);
                    webutil.createAlert('Failed to read image from '+imagename, true);
                });
            } else {
                console.log('imagename is empty');
            }
        };
        
        genericio.read(load).then( (obj) => {
            try {
                obj.data=JSON.parse(obj.data);
            } catch(e) {
                webutil.createAlert('Bad load file '+obj.filename);
                return;
            }

            let index=obj.filename.lastIndexOf("/");
            if (index<0)
                return;

            let imagenames = [];
            let overlaynames=[];
            

            imagenames[0]=obj.data['image'] || "";
            overlaynames[0]=obj.data['overlay'] || "";
            imagenames[1]=obj.data['image2'] || "";
            overlaynames[1]=obj.data['overlay2'] || "";

            let baseurl=obj.filename.substr(0,index+1);
            
            for (let viewer=0;viewer<this.num_independent_viewers;viewer++) 
                load_viewer(viewer,imagenames,overlaynames,baseurl);
            
        }).catch( (e) => {
            console.log(e);
            webutil.createAlert('Failed to read load file '+load, true);
        });
    }
    
    //  ---------------------------------------------------------------------------
    // Essentially the main function, called when element is attached to the page
    //  ---------------------------------------------------------------------------
    connectedCallback() {

        // -----------------------------------------------------------------------
        // Find other items
        // -----------------------------------------------------------------------

        const self = this;
        const menubarid = this.getAttribute('bis-menubarid');
        const painttoolid = this.getAttribute('bis-painttoolid') || null;
        const managerid = this.getAttribute('bis-modulemanagerid') || null;

        this.findViewers();
        
        let userPreferencesLoaded = userPreferences.webLoadUserPreferences(bisdbase);
        userPreferencesLoaded.then(() => {
            userPreferences.storeUserPreferences();
        });


        let menubar = document.querySelector(menubarid).getMenuBar();
        
        let modulemanager = null;
        if (managerid !== null) 
            modulemanager = document.querySelector(managerid) || null;

        
        // ----------------------------------------------------------
        // Create the File and Overlay Menus
        // ----------------------------------------------------------
        const loadfuncts=this.createFileAndOverlayMenus(menubar,painttoolid);
        const loadimage=loadfuncts.loadimage;
        const loadobjectmap=loadfuncts.loadobjectmap;

        // ----------------------------------------------------------
        // Module Manager
        // ----------------------------------------------------------
        let editmenu=null;
        if (modulemanager)
            editmenu=modulemanager.initializeElements(menubar, self.VIEWERS);

        // ----------------------------------------------------------
        // Display Menu
        // ----------------------------------------------------------
        this.createDisplayMenu(menubar,editmenu);

        
        // ----------------------------------------------------------
        // Electron Arguments
        // ----------------------------------------------------------
        if (webutil.inElectronApp() && modulemanager === null) {
            this.createElectronArgumentCallbacK(loadimage);
        }

        // ----------------------------------------------------------
        // Optional extra tool menu
        // ----------------------------------------------------------
        this.createExtraMenu(menubar);
        
        // ----------------------------------------------------------
        // Drag and Drop
        // ----------------------------------------------------------
        this.attachDragAndDrop(loadimage);

        // ----------------------------------------------------------
        // Console
        // ----------------------------------------------------------
        let hmenu=this.createHelpMenu(menubar,userPreferencesLoaded);


        // ----------------------------------------------------------------
        // If we have Module Manager  load an image to make everybody happy
        // ----------------------------------------------------------------
        const mode = this.getAttribute('bis-mode');

        if (mode!=='overlay') {
            if (modulemanager) {
                userPreferencesLoaded.then(() => {

                    let load=webutil.getQueryParameter('load') || '';
                    if (load.length<1) {
                        let imagepath="";
                        if (typeof window.BIS !=='undefined') {
                            imagepath=window.BIS.imagepath;
                        }
                        loadimage(`${imagepath}images/MNI_T1_2mm_stripped_ras.nii.gz`, 0);
                    }
                });
            }
        } else {
            webutil.createMenuItem(hmenu, ''); // separator
            webutil.createMenuItem(hmenu, 'Load Sample Data',
                                   function () {
                                       let imagepath="";
                                       if (typeof window.BIS !=='undefined') {
                                           imagepath=window.BIS.imagepath;
                                       }
                                       loadimage(`${imagepath}images/sampleanat.nii.gz`).then( () => { 
                                           loadobjectmap(`${imagepath}images/samplefunc.nii.gz`);
                                       });
                                   });
        }


        // ----------------------------------------------------------
        // Mouse Issues on mobile and final cleanup
        // ----------------------------------------------------------
        new FastClick(document.body);
        
        if (this.num_independent_viewers > 1)
            self.VIEWERS[1].setDualViewerMode(0.5);

        //signal other modules waiting for top bar to render
        let mainViewerDoneEvent = new CustomEvent('mainViewerDone');
        document.dispatchEvent(mainViewerDoneEvent);

        webutil.runAfterAllLoaded( () => {
            this.parseQueryParameters(loadimage,loadobjectmap);
        });

    }
}


module.exports = ViewerApplicationElement;
webutil.defineElement('bisweb-viewerapplication', ViewerApplicationElement);
