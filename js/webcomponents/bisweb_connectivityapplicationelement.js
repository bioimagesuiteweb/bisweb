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

"use strict";

const BisWebImage = require('bisweb_image');
const webutil=require('bis_webutil');
const bootbox=require('bootbox');

const webfileutil = require('bis_webfileutil');
const ViewerApplicationElement = require('bisweb_mainviewerapplication');
const userPreferences = require('bisweb_userpreferences.js');
const ATLAS = {};
ATLAS['humanmni']=require('atlases/humanmni.json');
ATLAS['allenmri']=require('atlases/mouseallenmri.json');

/**
 * A Application Level Element that creates a Connectivity Application
 * 
 * @example
 *   <bisweb-connectivityapplication
 *      bis-menubarid="#viewer_menubar"
 *      bis-connectivitycontrolid="#conncontrol"
 *      bis-viewerid="#viewer">
 *   </bisweb-connectivityapplication>
 *
 * Attributes
 *     bis-menubarid : theid a <bisweb-topmenubar> element
 *     bis-connectivitycontrolid : the id of an optional  <bisweb-connectivitycontrolelement>
 *     bis-viewerid : the id of the underlying <bisweb-orthogonalviewer>  element
 */
class ConnectivityApplicationElement extends ViewerApplicationElement {

    constructor() {
        super();
        this.extraManualHTML='tools/conncontrol.html';
        this.savelightstate = false;
    }

    //  ---------------------------------------------------------------------------

    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {

        let obj= super.getElementState(storeImages);
        // Add stuff
        obj['connectivity']=this.connectivitycontrol.getElementState();
        
        
        
        return obj;
    }
    
    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null,name=null) {

        name = name || this.applicationName;
        if (name!=="connviewer" && this.savelightstate === false) {
            bootbox.alert("Viewer State is not from a connectivity viewer (it is from"+name+")");
            return;
        }

        this.connectivitycontrol.disableMouseUpdates();
        super.setElementState(dt);
        return this.connectivitycontrol.setElementState(dt['connectivity']);
    }


    

    connectedCallback() {

        // Set external stuff first
        this.setExternalAndImagePath();

        // Now on to this one
        this.savelightstate = this.getAttribute('bis-extrastatesave') || null;
        
        var VIEWER = {
            inBrowser : true,
            viewer : 0,
            dialog : 0,
            dialogtext: 0,
            dialogtitle: 0,
        };
        
        
        // --------------------------------------------------------------------------------
        // Main Application
        // --------------------------------------------------------------------------------
        
        const menubarid=this.getAttribute('bis-menubarid');
        const viewerid=this.getAttribute('bis-viewerid');
        const controlid=this.getAttribute('bis-connectivitycontrolid');
        
        VIEWER.viewer=document.querySelector(viewerid);
        VIEWER.viewer.setMinLabelWidth(150);
        VIEWER.viewer.finalizeTools();

        var viewer=VIEWER.viewer;

        this.VIEWERS=[ viewer ];
        this.num_independent_viewers = 1;
        
        let control=document.querySelector(controlid);
        let menubar=document.querySelector(menubarid).getMenuBar();

        this.connectivitycontrol=control;
        
        var fmenu=webutil.createTopMenuBarMenu("File",menubar).attr('id','bisfilemenu');
        const self=this;
        
        
        webfileutil.createFileMenuItem(fmenu,'Load Positive Matrix',
                                       function(f) {  control.loadmatrix(0,f);},
                                       { title : 'Postive Connectivity Matrix',
                                         save : false,
                                         filters : [ { name: 'Text or CSV formatted matrix file', extensions: ['txt', 'csv']}],
                                         suffix : '.csv,.txt',
                                       });
        
        
        webfileutil.createFileMenuItem(fmenu,'Load Negative Matrix',
                                       function(f) {  control.loadmatrix(1,f);},
                                       { title : 'Negative Connectivity Matrix',
                                         save : false,
                                         filters : [ { name: 'Text or CSV formatted matrix file', extensions: ['txt', 'csv']}],
                                         suffix : '.csv,.txt',
                                       });
        
        webutil.createMenuItem(fmenu,''); // separator
        
        webutil.createMenuItem(fmenu,'Clear Matrices',function() { control.clearmatrices(); });

        this.createApplicationMenu(fmenu);


        
        
        // ------------------------------------ Edit Menu ----------------------------
        var editmenu=webutil.createTopMenuBarMenu("Edit",menubar);
        webutil.createMenuItem(editmenu,'Undo',function() {  control.undo(); });
        //        webutil.createMenuItem(editmenu,'Redo',function() {  control.redo(); });
        webutil.createMenuItem(editmenu,''); // separator
        webutil.createMenuItem(editmenu,'Reset Display Parameters',function(){ control.resetdefault();});
        webutil.createMenuItem(editmenu,''); // separator
        webutil.createMenuItem(editmenu, 'Store Application State', function() { self.storeState(); });
        webutil.createMenuItem(editmenu, 'Retrieve Application State',function() { self.restoreState(); });

        
        // ------------------------------------ View Menu ----------------------------
        var viewmenu=webutil.createTopMenuBarMenu("View",menubar);
        webutil.createMenuItem(viewmenu,'Info about Loaded Data',function() {  control.info(); });
        webutil.createMenuItem(viewmenu,'Show High Degree Nodes',function() {  control.viewInteresting(); });
        webutil.createMenuItem(viewmenu,''); // separator
        webutil.createMenuItem(viewmenu,'Show Matrices',function() {  control.showmatrices(); });
        webutil.createMenuItem(viewmenu,''); // separator
        webutil.createMenuItem(viewmenu,'Set 3D View To Front',function() {  viewer.set3dview(1,true); });
        webutil.createMenuItem(viewmenu,'Set 3D View To Back',function() {  viewer.set3dview(1,false); });
        webutil.createMenuItem(viewmenu,''); // separator
        webutil.createMenuItem(viewmenu,'Set 3D View To Top',function() { viewer.set3dview(2,false); });
        webutil.createMenuItem(viewmenu,'Set 3D View To Bottom',function() { viewer.set3dview(2,true); });
        webutil.createMenuItem(viewmenu,''); // separator
        webutil.createMenuItem(viewmenu,'Set 3D View To Left',function() { viewer.set3dview(0,true); });
        webutil.createMenuItem(viewmenu,'Set 3D View To Right',function() { viewer.set3dview(0,false); });
        

        // ------------------------------------ Parcellations Menu ----------------------------

        var imenu=webutil.createTopMenuBarMenu("Parcellations",menubar);

        
        let prom=null;

        if (!this.externalMode) {
            prom=userPreferences.safeGetItem('species');
        } else {
            prom=Promise.resolve('all');
        }
            

        prom.then( (species) => {        

            
            let sp=webutil.getQueryParameter('species') || '';
            if (sp==='mouse')
                species='mouse';
            else if (sp==='human')
                species='human';
            else if (sp==='all')
                species='all';

            let atnames=Object.keys(ATLAS);
            for (let sp=0;sp<atnames.length;sp++) {

                let spname=ATLAS[atnames[sp]]['species'];
                if (species==='all' || species===spname) {
                
                    let atlaslist=ATLAS[atnames[sp]]['parcellations'];

                    for (let i=0;i<atlaslist.length;i++) {
                        let element=atlaslist[i];
                        webutil.createMenuItem(imenu,'Use the '+element['name']+' Atlas',
                                               () => {
                                                   control.setParcellation(element);
                                               });
                    }
                }
                if (species==='all' && sp===0)
                    webutil.createMenuItem(imenu,''); // separator
            }

            for (let sp=0;sp<atnames.length;sp++) {
                let spname=ATLAS[atnames[sp]]['species'];
                
                if (species==='all' || species===spname) {
                    let lobedef=ATLAS[atnames[sp]]['groupdefinitions'];
                    if (lobedef.length>1) {
                        webutil.createMenuItem(imenu,''); // separator
                        for (let i=0;i<lobedef.length;i++) {
                            let elem=lobedef[i];
                            webutil.createMenuItem(imenu,'Group nodes using the '+elem['description'], () => {
                                control.setnodeGroupOption(elem['name']);
                            });
                        }
                    }
                }
            }
        });


        // ------------------------------------ Advanced Menu ----------------------------
        
        var advmenu=webutil.createTopMenuBarMenu("Advanced",menubar);
        
        webfileutil.createFileMenuItem(advmenu,'Import Parcellation Image',
                                       function(f) {
                                           let img=new BisWebImage();
                                           img.load(f,"RAS").then( () => {
                                               control.importparcellation(img);
                                           }).catch( (e) => {
                                               bootbox.alert("Error loading"+ (e || ''));
                                           });
                                       },
                                       { title : 'Load Parcellation image',
                                         suffix : 'NII',
                                         save : false
                                       });

        webfileutil.createFileMenuItem(advmenu, 'Export Parcellation Image',
                                       function (f) {
                                           self.saveOverlay(f,0);
                                       },
                                       {
                                           title: 'Save Parcellation Image',
                                           save: true,
                                           filters: "NII",
                                           suffix : "NII",
                                           initialCallback : () => {
                                               return self.getSaveOverlayInitialFilename(0);
                                           }
                                       });
        
        
        userPreferences.safeGetItem("internal").then( (f) => {

            if (f) {
                webutil.createMenuItem(advmenu,''); // separator
                webfileutil.createFileMenuItem(advmenu,'Load Node Definition File',
                                               function(e) {  control.loadparcellationfile(e);},
                                               { title : 'Node Definition File',
                                                 save : false,
                                                 filters : [ { name: 'JSON formatted Node definition file', extensions: ['parc']}],
                                                 suffix : '.parc',
                                               });
                webutil.createMenuItem(advmenu,'Save Node Definition File', () => {  control.saveParcellation();});
                
                
                
                
                webutil.createMenuItem(advmenu,'');
                webfileutil.createFileMenuItem(advmenu,'Import Node Positions Text File (in MNI coordinates)',
                                               function(f) {  control.importparcellationtext(f);},
                                               { title : 'Node definitions file',
                                                 save : false,
                                                 filters : [ { name: 'Text or CSV formatted file', extensions: ['txt', 'csv']}],
                                                 suffix : '.txt,.csv',
                                               });
                
                webutil.createMenuItem(advmenu,'Create Labels for Surface', () => {
                    control.createSurfaceLabels();
                });
            }
        });
    
        
        // ------------------------------------ Help Menu ----------------------------

        if (!this.externalMode) {
            let helpmenu=this.createHelpMenu(menubar);
            webutil.createMenuItem(helpmenu,''); // separator
            //helpmenu.append($("<li><a href=\"https://www.nitrc.org/frs/?group_id=51\" target=\"_blank\" rel=\"noopener\" \">Download Parcellation</a></li>"));
            //webutil.createMenuItem(helpmenu,''); // separator
            webutil.createMenuItem(helpmenu,'Load Sample Matrices',function() {
                const imagepath=webutil.getWebPageImagePath();
                control.loadsamplematrices([`${imagepath}/pos_mat.txt`,`${imagepath}/neg_mat.txt`]);
            });
        }
        
        // ------------------------------------ Initialize ---------------------------
        
        this.fixMobileMouseHandling();
        
        var HandleFiles = function(files) {
            var filename=files[0].name;
            var ext=filename.split('.').pop();
            console.log('filename='+filename+' extension='+ext);
            if (ext==="biswebstate" || ext=="connstate") {
                self.loadApplicationState(files[0]);
            } else if (ext==="parc" || ext==="json") {
                control.loadparcellationfile(files[0]);
            } else if (ext==="txt" || ext==="csv") {
                control.loadmatrix(-1,files[0]);
            }
        };
        webutil.createDragAndCropController(HandleFiles);
        this.applicationInitializedPromiseList.push(control.loaddefaultatlas(this.externalMode));
        this.finalizeConnectedEvent();

    }
}

module.exports=ConnectivityApplicationElement;
webutil.defineElement('bisweb-connectivityapplication', ConnectivityApplicationElement);



