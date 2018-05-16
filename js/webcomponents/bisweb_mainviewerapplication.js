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
        this.VIEWERS=[];
        this.num_independent_viewers = 0;
        this.saveState=null;
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
    // I/O Code
    // ---------------------------------------------------------------------------
    loadImage(fname, viewer = 0) {
        const self=this;
        
        const img = new BisWebImage();
        return new Promise( (resolve,reject) => { 
            img.load(fname)
                .then(function () {
                    webutil.createAlert('Image loaded from ' + img.getDescription());
                    self.VIEWERS[viewer].setimage(img);
                    resolve();
                }).catch( (e) => { reject(e); });
        });
    }

    loadOverlay(fname, viewer=0) {

        const self=this;
        return new Promise( (resolve,reject) => {
            let img = new BisWebImage();
            img.load(fname)
                .then(function () {
                    self.VIEWERS[viewer].setobjectmap(img, false);
                    resolve();
                }).catch((e) => {
                    webutil.createAlert(e, true);
                    console.log(e.stack);
                    reject(e);
                });
        });
    }

    
    // Save Image
    // --------------------------------------------------------------------------------
    /** Save image from viewer to a file */
    saveImage(fname, viewerno = 0) {

        const self=this;
        let index = viewerno + 1;
        let img = self.VIEWERS[viewerno].getimage();
        let name = "image " + index;
        bisweb_apputil.saveImage(img, fname, name);
    }

    /** Save image from viewer to a file */
    saveOverlay(fname, viewerno = 0) {

        let self=this;
        console.log('In Save Objectmap',viewerno);
        let index = viewerno + 1;
        let img = self.VIEWERS[viewerno].getobjectmap();
        let name = "objectmap " + index;
        bisweb_apputil.saveImage(img, fname, name);
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
        let fmenuname = "Image", objmenuname = 'Overlay';


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
            
            webutil.createMenuItem(fmenu[viewerno], 'Load Image',
                                   function (f) {
                                       self.loadImage(f, viewerno);
                                   }, 'NII',
                                   { title: 'Load image', save: false });

            webutil.createMenuItem(fmenu[viewerno], 'Save Image',
                                   function (f) { self.saveImage(f, viewerno); },
                                   '',
                                   {
                                       title: 'Save Image',
                                       save: true, filters: "NII",
                                   });

            
            webutil.createMenuItem(fmenu[viewerno], ''); // separator



            if (!webutil.inElectronApp()) {
                bisweb_apputil.createCloudLoadMenuItems(fmenu[viewerno], 'Image', load_image, viewerno);
            }
            bisweb_apputil.createMNIImageLoadMenuEntries(fmenu[viewerno], load_image, viewerno);


            // ----------------------------------------------------------
            // Objectmap/Overlay Menu
            // ----------------------------------------------------------
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
                
                webutil.createMenuItem(objmenu[viewerno], 'Load Overlay',
                                       function (f) {
                                           self.loadOverlay(f, viewerno);
                                       }, 'NII',
                                       { title: 'Load overlay', save: false });
                
                webutil.createMenuItem(objmenu[viewerno], 'Save Overlay',
                                       function (f) { self.saveOverlay(f, viewerno); },
                                       '',
                                       {
                                           title: 'Save Overlay',
                                           save: true, filters: "NII",
                                       });

                webutil.createMenuItem(objmenu[viewerno], ''); // separator

                
                if (!webutil.inElectronApp()) {

                    bisweb_apputil.createCloudLoadMenuItems(objmenu[viewerno], 'Overlay',
                                                            load_objectmap,
                                                            viewerno);
                }

                webutil.createMenuItem(objmenu[viewerno], 'Clear Overlay',
                                       function () {
                                           self.VIEWERS[viewerno].clearobjectmap();
                                       });
            }
            webutil.createMenuItem(objmenu[viewerno], ''); // separator

            bisweb_apputil.createBroadmannAtlasLoadMenuEntries(objmenu[viewerno], load_objectmap, viewerno);
        };

        // ---------------------------------------------------------------------
        // End of callback ... now the loop
        // ---------------------------------------------------------------------
        
        for (let viewerno = 0; viewerno < this.num_independent_viewers; viewerno++) {
            internal_create_menu(viewerno);
        }

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
            self.loadImage(files[0], count, false);
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

    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {

        let obj = {};
        for (let i=0;i<this.VIEWERS.length;i++) {
            let name=`viewer${i+1}`;
            obj[name]=this.VIEWERS[i].getElementState(storeImages);
        }
        return obj;
    }
        
    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null) {

        if (dt===null)
            return;
        
        for (let i=0;i<this.VIEWERS.length;i++) {
            let name=`viewer${i+1}`;
            let elem=dt[name] || null;
            this.VIEWERS[i].setElementState(elem);
        }
        if (this.num_independent_viewers > 1) {
            this.VIEWERS[1].setDualViewerMode(this.VIEWERS[1].internal.viewerleft);
        }
    }

    
    /** store State in this.saveState , unless filename is not null, in which case save
     * @param {String} filename - if set then this goes to a file
     */
    storeState(filename=null) {
        if (filename===null) {
            this.saveState=this.getElementState(true);
            return;
        }
    }

    /** restore State from this.internal.saveState unless obj is not null
     * @param {Object} obj - if set then restore from this else from this.saveState
     */
    restoreState(obj=null) {

        let inp=obj || this.saveState;
        
        if (inp) {
            this.setElementState(inp);
        }
    }

    
    //  ---------------------------------------------------------------------------
    createBookmarkMenu(menubar) {
        const self=this;
        let bmenu=webutil.createTopMenuBarMenu("Bookmark", menubar);
        webutil.createMenuItem(bmenu, 'Store State', function() { self.storeState(); });
        webutil.createMenuItem(bmenu, 'Retrieve State',function() { self.restoreState(); });
    }

    //  ---------------------------------------------------------------------------
    
    parseQueryParameters() {

        // Here we check if there is any info we need on the query string
        let load=webutil.getQueryParameter('load') || '';
        if (load.length<2)
            return 0;
        const self=this;

        let load_viewer=function(vr,imagenames,overlaynames,baseurl) {

            if (imagenames[vr].length>0) {
                let imagename=baseurl+imagenames[vr];
                self.loadImage(imagename,vr).then( () => {
                    if (overlaynames[vr].length>0) {
                        let overlayname=baseurl+overlaynames[vr];
                        self.loadOverlay(overlayname,vr);
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
        this.createFileAndOverlayMenus(menubar,painttoolid);

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
        // Bookmark Menu
        // ----------------------------------------------------------
        
        this.createBookmarkMenu(menubar);

        

        
        // ----------------------------------------------------------
        // Electron Arguments
        // ----------------------------------------------------------
        if (webutil.inElectronApp() && modulemanager === null) {
            this.createElectronArgumentCallbacK(function(f,v) { self.loadimage(f,v);});
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
                        self.loadImage(`${imagepath}images/MNI_T1_2mm_stripped_ras.nii.gz`, 0);
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
                                       self.loadImage(`${imagepath}images/sampleanat.nii.gz`).then( () => { 
                                           self.loadOverlay(`${imagepath}images/samplefunc.nii.gz`);
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
            this.parseQueryParameters();
        });

    }
}


module.exports = ViewerApplicationElement;
webutil.defineElement('bisweb-viewerapplication', ViewerApplicationElement);
